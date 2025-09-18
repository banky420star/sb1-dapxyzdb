import inquirer from 'inquirer';
import chalk from 'chalk';
import { ApprovalMode } from '../types/index.js';
import { isAbsolute, relative } from 'path';

export class ApprovalManager {
  private mode: ApprovalMode;
  private workingDirectory: string;

  constructor(mode: ApprovalMode) {
    this.mode = mode;
    this.workingDirectory = process.cwd();
  }

  setMode(mode: ApprovalMode): void {
    this.mode = mode;
  }

  getMode(): ApprovalMode {
    return this.mode;
  }

  async requestApproval(operationType: string, operation: any): Promise<boolean> {
    // Read-only mode blocks all operations
    if (this.mode === 'read-only') {
      console.log(chalk.yellow(`⚠️ Read-only mode: ${operationType} operations are not allowed`));
      return false;
    }

    // Full access mode approves everything
    if (this.mode === 'full') {
      return true;
    }

    // Auto mode - check if operation requires approval
    if (this.mode === 'auto') {
      const requiresApproval = this.checkIfApprovalRequired(operationType, operation);
      
      if (!requiresApproval) {
        return true;
      }

      // Request user approval
      return await this.promptForApproval(operationType, operation);
    }

    return false;
  }

  private checkIfApprovalRequired(operationType: string, operation: any): boolean {
    if (operationType === 'file') {
      // Check if file operation is outside working directory
      const filePath = operation.path;
      if (isAbsolute(filePath)) {
        if (!filePath.startsWith(this.workingDirectory)) {
          return true; // Requires approval - outside working directory
        }
      }
      
      // Check for sensitive files
      const sensitivePatterns = [
        /\.env/,
        /\.git\//,
        /node_modules\//,
        /\.ssh\//,
        /\.aws\//,
        /\.config\//,
        /package-lock\.json/,
        /yarn\.lock/
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(filePath)) {
          return true; // Requires approval - sensitive file
        }
      }
      
      return false; // No approval needed
    }

    if (operationType === 'command') {
      // Check for dangerous commands
      const dangerousCommands = [
        'rm', 'del', 'format', 'fdisk',
        'sudo', 'su', 'chmod', 'chown',
        'curl', 'wget', 'ssh', 'scp',
        'git push', 'git reset --hard',
        'npm publish', 'yarn publish'
      ];
      
      const command = operation.command || operation;
      for (const dangerous of dangerousCommands) {
        if (command.includes(dangerous)) {
          return true; // Requires approval - dangerous command
        }
      }
      
      // Check for network access
      const networkCommands = [
        'curl', 'wget', 'fetch', 'axios',
        'ping', 'traceroute', 'nslookup',
        'ssh', 'scp', 'rsync', 'ftp'
      ];
      
      for (const netCmd of networkCommands) {
        if (command.includes(netCmd)) {
          return true; // Requires approval - network access
        }
      }
      
      return false; // No approval needed
    }

    // Default to requiring approval for unknown operations
    return true;
  }

  private async promptForApproval(operationType: string, operation: any): Promise<boolean> {
    console.log('\n' + chalk.yellow('⚠️ Approval Required'));
    
    if (operationType === 'file') {
      console.log(chalk.cyan(`File operation: ${operation.type || 'write'}`));
      console.log(chalk.cyan(`Path: ${operation.path}`));
      if (operation.content) {
        const preview = operation.content.substring(0, 200);
        console.log(chalk.gray(`Preview: ${preview}${operation.content.length > 200 ? '...' : ''}`));
      }
    } else if (operationType === 'command') {
      console.log(chalk.cyan(`Command: ${operation.command || operation}`));
      if (operation.cwd) {
        console.log(chalk.cyan(`Directory: ${operation.cwd}`));
      }
    }

    const { approved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: `Do you want to allow this ${operationType} operation?`,
        default: false
      }
    ]);

    return approved;
  }

  async batchApproval(operations: any[]): Promise<boolean[]> {
    if (this.mode === 'read-only') {
      return operations.map(() => false);
    }

    if (this.mode === 'full') {
      return operations.map(() => true);
    }

    // For auto mode, check each operation
    const results: boolean[] = [];
    
    // Group operations that require approval
    const needsApproval: number[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (this.checkIfApprovalRequired(op.type, op)) {
        needsApproval.push(i);
      } else {
        results[i] = true;
      }
    }

    if (needsApproval.length === 0) {
      return operations.map(() => true);
    }

    // Show all operations that need approval
    console.log('\n' + chalk.yellow(`⚠️ ${needsApproval.length} operations require approval:`));
    
    for (const idx of needsApproval) {
      const op = operations[idx];
      console.log(chalk.cyan(`${idx + 1}. ${op.type}: ${op.path || op.command}`));
    }

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'How would you like to proceed?',
        choices: [
          { name: 'Approve all', value: 'all' },
          { name: 'Deny all', value: 'none' },
          { name: 'Review individually', value: 'individual' }
        ]
      }
    ]);

    if (choice === 'all') {
      for (const idx of needsApproval) {
        results[idx] = true;
      }
    } else if (choice === 'none') {
      for (const idx of needsApproval) {
        results[idx] = false;
      }
    } else {
      // Review individually
      for (const idx of needsApproval) {
        const op = operations[idx];
        results[idx] = await this.promptForApproval(op.type, op);
      }
    }

    return results;
  }

  getApprovalStats(): any {
    // Return statistics about approvals in current session
    return {
      mode: this.mode,
      description: this.getModeDescription()
    };
  }

  private getModeDescription(): string {
    const descriptions = {
      'auto': 'Automatic approval for safe operations within working directory',
      'read-only': 'No file or command operations allowed, chat only',
      'full': 'All operations approved automatically (use with caution)'
    };
    
    return descriptions[this.mode];
  }
}


