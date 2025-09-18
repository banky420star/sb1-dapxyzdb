import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../config/ConfigManager.js';

export class CommandExecutor {
  private configManager: ConfigManager;
  private workingDirectory: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.workingDirectory = configManager.getWorkingDirectory();
  }

  async execute(command: string, options: any = {}): Promise<string> {
    const cwd = options.cwd || this.workingDirectory;
    const timeout = options.timeout || 30000; // 30 seconds default
    const silent = options.silent || false;

    if (!silent) {
      console.log(chalk.gray(`$ ${command}`));
    }

    try {
      // Parse command and arguments
      const [cmd, ...args] = this.parseCommand(command);
      
      // Execute command
      const result = await execa(cmd, args, {
        cwd,
        timeout,
        shell: true,
        preferLocal: true,
        localDir: cwd,
        env: {
          ...process.env,
          FORCE_COLOR: '1'
        }
      });

      // Add to history
      this.configManager.addToHistory(command);

      if (!silent) {
        if (result.stdout) {
          console.log(result.stdout);
        }
        if (result.stderr) {
          console.error(chalk.yellow(result.stderr));
        }
      }

      return result.stdout;
    } catch (error: any) {
      if (error.timedOut) {
        throw new Error(`Command timed out after ${timeout}ms: ${command}`);
      }
      
      if (error.exitCode !== undefined) {
        const errorMsg = error.stderr || error.message;
        throw new Error(`Command failed with exit code ${error.exitCode}: ${errorMsg}`);
      }
      
      throw error;
    }
  }

  async executeWithProgress(command: string, message?: string): Promise<string> {
    const spinner = ora(message || `Executing: ${command}`).start();
    
    try {
      const result = await this.execute(command, { silent: true });
      spinner.succeed();
      return result;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  async executeInteractive(command: string, options: any = {}): Promise<void> {
    const cwd = options.cwd || this.workingDirectory;
    
    console.log(chalk.gray(`$ ${command}`));
    
    try {
      // For interactive commands, we need to inherit stdio
      await execa(command, {
        cwd,
        shell: true,
        stdio: 'inherit',
        preferLocal: true,
        localDir: cwd
      });
      
      // Add to history
      this.configManager.addToHistory(command);
    } catch (error: any) {
      if (error.exitCode !== undefined) {
        throw new Error(`Command failed with exit code ${error.exitCode}`);
      }
      throw error;
    }
  }

  async executeBackground(command: string, options: any = {}): Promise<any> {
    const cwd = options.cwd || this.workingDirectory;
    
    console.log(chalk.gray(`$ ${command} &`));
    
    // Start the process but don't wait for it
    const subprocess = execa(command, {
      cwd,
      shell: true,
      detached: true,
      preferLocal: true,
      localDir: cwd
    });
    
    // Add to history
    this.configManager.addToHistory(`${command} &`);
    
    return {
      pid: subprocess.pid,
      kill: () => subprocess.kill(),
      command
    };
  }

  async executePipe(commands: string[], options: any = {}): Promise<string> {
    const cwd = options.cwd || this.workingDirectory;
    
    console.log(chalk.gray(`$ ${commands.join(' | ')}`));
    
    try {
      let result = '';
      let input = undefined;
      
      for (const command of commands) {
        const [cmd, ...args] = this.parseCommand(command);
        
        const output = await execa(cmd, args, {
          cwd,
          shell: true,
          input,
          preferLocal: true,
          localDir: cwd
        });
        
        result = output.stdout;
        input = result;
      }
      
      // Add to history
      this.configManager.addToHistory(commands.join(' | '));
      
      return result;
    } catch (error: any) {
      throw new Error(`Pipe command failed: ${error.message}`);
    }
  }

  private parseCommand(command: string): string[] {
    // Simple command parsing - in production, use a proper shell parser
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return parts.map(part => part.replace(/^"(.*)"$/, '$1'));
  }

  async checkCommandExists(command: string): Promise<boolean> {
    try {
      await execa('which', [command]);
      return true;
    } catch {
      return false;
    }
  }

  async getCommandOutput(command: string): Promise<string> {
    try {
      const result = await this.execute(command, { silent: true });
      return result.trim();
    } catch {
      return '';
    }
  }

  async runScript(scriptName: string, args: string[] = []): Promise<string> {
    // Check if it's an npm script
    const packageJsonPath = `${this.workingDirectory}/package.json`;
    
    try {
      const { readFileSync } = await import('fs');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts && packageJson.scripts[scriptName]) {
        const command = `npm run ${scriptName} ${args.join(' ')}`.trim();
        return await this.execute(command);
      }
    } catch {
      // Not an npm project or script not found
    }
    
    // Try to run as a regular script
    const command = `${scriptName} ${args.join(' ')}`.trim();
    return await this.execute(command);
  }
}


