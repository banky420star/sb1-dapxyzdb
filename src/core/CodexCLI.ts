import blessed from 'blessed';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { AuthManager } from '../auth/AuthManager.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { FileManager } from './FileManager.js';
import { CommandExecutor } from './CommandExecutor.js';
import { ImageProcessor } from './ImageProcessor.js';
import { ModelManager } from './ModelManager.js';
import { ApprovalManager } from './ApprovalManager.js';
import { 
  CodexOptions, 
  Message, 
  CodexSession,
  ModelType,
  ReasoningLevel,
  ApprovalMode 
} from '../types/index.js';
import { randomUUID } from 'crypto';

// Configure marked for terminal rendering
marked.setOptions({
  renderer: new TerminalRenderer()
});

export class CodexCLI {
  private authManager: AuthManager;
  private configManager: ConfigManager;
  private fileManager: FileManager;
  private commandExecutor: CommandExecutor;
  private imageProcessor: ImageProcessor;
  private modelManager: ModelManager;
  private approvalManager: ApprovalManager;
  private session: CodexSession;
  private screen: blessed.Widgets.Screen | null = null;
  private chatBox: blessed.Widgets.BoxElement | null = null;
  private inputBox: blessed.Widgets.TextareaElement | null = null;
  private statusBar: blessed.Widgets.BoxElement | null = null;
  private execMode: boolean;

  constructor(options: CodexOptions) {
    this.authManager = options.authManager;
    this.configManager = options.configManager;
    this.execMode = options.execMode || false;
    
    // Initialize managers
    this.fileManager = new FileManager(this.configManager);
    this.commandExecutor = new CommandExecutor(this.configManager);
    this.imageProcessor = new ImageProcessor();
    this.modelManager = new ModelManager(this.authManager, this.configManager);
    this.approvalManager = new ApprovalManager(options.approvalMode);
    
    // Initialize session
    this.session = {
      id: randomUUID(),
      messages: [],
      model: options.model,
      reasoningLevel: this.configManager.getReasoningLevel(),
      approvalMode: options.approvalMode,
      startTime: new Date()
    };
  }

  async runInteractive(): Promise<void> {
    this.initializeUI();
    this.setupEventHandlers();
    this.displayWelcomeMessage();
    
    // Start the interactive loop
    this.screen?.render();
  }

  async runWithPrompt(prompt: string, imagePaths: string[] = []): Promise<void> {
    try {
      // Process images if provided
      const images = await this.processImages(imagePaths);
      
      // Add user message to session
      this.session.messages.push({
        role: 'user',
        content: prompt,
        images
      });
      
      if (!this.execMode) {
        this.displayMessage('user', prompt, images);
      }
      
      // Get AI response
      await this.processUserInput(prompt, images);
      
      if (this.execMode) {
        // In exec mode, exit after processing
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      if (this.execMode) {
        process.exit(1);
      }
    }
  }

  private initializeUI(): void {
    // Create the main screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Codex CLI',
      fullUnicode: true
    });

    // Create chat display box
    this.chatBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '80%',
      content: '',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      label: ' Codex Chat '
    });

    // Create input box
    this.inputBox = blessed.textarea({
      bottom: 2,
      left: 0,
      width: '100%',
      height: '18%',
      inputOnFocus: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      },
      label: ' Your Input (Ctrl+Enter to send, /help for commands) '
    });

    // Create status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.getStatusBarContent(),
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white'
      }
    });

    // Add widgets to screen
    this.screen.append(this.chatBox);
    this.screen.append(this.inputBox);
    this.screen.append(this.statusBar);

    // Focus on input box
    this.inputBox.focus();
  }

  private setupEventHandlers(): void {
    if (!this.screen || !this.inputBox) return;

    // Handle input submission
    this.inputBox.key(['C-enter'], async () => {
      const input = this.inputBox?.getValue().trim();
      if (input) {
        this.inputBox?.clearValue();
        this.screen?.render();
        await this.handleUserInput(input);
      }
    });

    // Handle quit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    // Handle screen resize
    this.screen.on('resize', () => {
      this.screen?.render();
    });
  }

  private displayWelcomeMessage(): void {
    const welcome = chalk.cyan.bold(`
╔════════════════════════════════════════════╗
║           Welcome to Codex CLI!            ║
║                                            ║
║  AI-powered coding assistant at your       ║
║  fingertips.                               ║
║                                            ║
║  Commands:                                 ║
║  • /model - Change model & reasoning       ║
║  • /approvals - Change approval mode       ║
║  • /clear - Clear chat history             ║
║  • /help - Show all commands               ║
║  • /exit - Exit Codex                      ║
╚════════════════════════════════════════════╝
`);
    
    this.chatBox?.setContent(welcome);
    this.screen?.render();
  }

  private async handleUserInput(input: string): Promise<void> {
    // Check for commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Process regular input
    await this.processUserInput(input);
  }

  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case '/model':
        await this.handleModelCommand();
        break;
      case '/approvals':
        await this.handleApprovalsCommand();
        break;
      case '/clear':
        this.clearChat();
        break;
      case '/help':
        this.showHelp();
        break;
      case '/exit':
        process.exit(0);
        break;
      default:
        this.displayMessage('system', `Unknown command: ${cmd}. Type /help for available commands.`);
    }
  }

  private async handleModelCommand(): Promise<void> {
    // Temporarily exit blessed UI for inquirer
    this.screen?.destroy();
    
    const { model, reasoning } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Select model:',
        choices: [
          { name: 'GPT-5 (Default)', value: 'gpt-5' },
          { name: 'GPT-5 Codex (Optimized for coding)', value: 'gpt-5-codex' },
          { name: 'O4 Mini (Fast & efficient)', value: 'o4-mini' }
        ],
        default: this.session.model
      },
      {
        type: 'list',
        name: 'reasoning',
        message: 'Select reasoning level:',
        choices: [
          { name: 'Low (Fast)', value: 'low' },
          { name: 'Medium (Balanced)', value: 'medium' },
          { name: 'High (Complex tasks)', value: 'high' }
        ],
        default: this.session.reasoningLevel
      }
    ]);
    
    // Update session and config
    this.session.model = model;
    this.session.reasoningLevel = reasoning;
    this.configManager.setModel(model);
    this.configManager.setReasoningLevel(reasoning);
    
    // Reinitialize UI
    this.initializeUI();
    this.setupEventHandlers();
    this.displayMessage('system', `Model changed to ${model} with ${reasoning} reasoning.`);
  }

  private async handleApprovalsCommand(): Promise<void> {
    // Temporarily exit blessed UI for inquirer
    this.screen?.destroy();
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select approval mode:',
        choices: [
          { 
            name: 'Auto (Default) - Automatic within working directory', 
            value: 'auto' 
          },
          { 
            name: 'Read Only - Chat only, no file/command operations', 
            value: 'read-only' 
          },
          { 
            name: 'Full Access - No approvals required (use with caution)', 
            value: 'full' 
          }
        ],
        default: this.session.approvalMode
      }
    ]);
    
    // Update session and approval manager
    this.session.approvalMode = mode;
    this.approvalManager.setMode(mode);
    this.configManager.setApprovalMode(mode);
    
    // Reinitialize UI
    this.initializeUI();
    this.setupEventHandlers();
    this.displayMessage('system', `Approval mode changed to: ${mode}`);
  }

  private clearChat(): void {
    this.session.messages = [];
    this.chatBox?.setContent('');
    this.displayMessage('system', 'Chat cleared.');
  }

  private showHelp(): void {
    const help = `
${chalk.cyan.bold('Available Commands:')}

${chalk.yellow('/model')} - Change model and reasoning level
${chalk.yellow('/approvals')} - Change approval mode
${chalk.yellow('/clear')} - Clear chat history
${chalk.yellow('/help')} - Show this help message
${chalk.yellow('/exit')} - Exit Codex

${chalk.cyan.bold('Tips:')}
• Press Ctrl+Enter to send your message
• You can paste images directly (coming soon)
• Use arrow keys to scroll through chat history
`;
    
    this.displayMessage('system', help);
  }

  private async processUserInput(input: string, images: string[] = []): Promise<void> {
    // Add message to session
    const userMessage: Message = {
      role: 'user',
      content: input,
      images
    };
    
    if (!this.session.messages.find(m => m === userMessage)) {
      this.session.messages.push(userMessage);
    }
    
    // Display thinking indicator
    const spinner = this.execMode ? 
      ora('Thinking...').start() : 
      null;
    
    if (!this.execMode) {
      this.displayMessage('system', '🤔 Thinking...');
    }
    
    try {
      // Get AI response
      const response = await this.modelManager.getCompletion(
        this.session.messages,
        this.session.model,
        this.session.reasoningLevel
      );
      
      if (spinner) spinner.stop();
      
      // Process and display response
      await this.processAIResponse(response);
      
    } catch (error) {
      if (spinner) spinner.fail('Error getting response');
      this.displayMessage('system', `Error: ${error}`);
    }
  }

  private async processAIResponse(response: string): Promise<void> {
    // Add to session
    this.session.messages.push({
      role: 'assistant',
      content: response
    });
    
    // Parse response for operations
    const operations = this.parseOperations(response);
    
    // Execute operations with approval
    for (const op of operations) {
      if (op.type === 'file') {
        await this.handleFileOperation(op);
      } else if (op.type === 'command') {
        await this.handleCommandOperation(op);
      }
    }
    
    // Display response
    this.displayMessage('assistant', response);
  }

  private parseOperations(response: string): any[] {
    // Parse response for file operations and commands
    // This is a simplified version - in reality, we'd use more sophisticated parsing
    const operations: any[] = [];
    
    // Check for file operations
    const fileOpRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
    let match;
    while ((match = fileOpRegex.exec(response)) !== null) {
      operations.push({
        type: 'file',
        path: match[1],
        content: match[2]
      });
    }
    
    // Check for commands
    const cmdRegex = /```(?:bash|shell|sh)\n([\s\S]*?)```/g;
    while ((match = cmdRegex.exec(response)) !== null) {
      operations.push({
        type: 'command',
        command: match[1]
      });
    }
    
    return operations;
  }

  private async handleFileOperation(op: any): Promise<void> {
    const approved = await this.approvalManager.requestApproval('file', op);
    
    if (approved) {
      await this.fileManager.writeFile(op.path, op.content);
      this.displayMessage('system', `✅ File written: ${op.path}`);
    } else {
      this.displayMessage('system', `❌ File operation denied: ${op.path}`);
    }
  }

  private async handleCommandOperation(op: any): Promise<void> {
    const approved = await this.approvalManager.requestApproval('command', op);
    
    if (approved) {
      const result = await this.commandExecutor.execute(op.command);
      this.displayMessage('system', `✅ Command executed: ${op.command}\n${result}`);
    } else {
      this.displayMessage('system', `❌ Command execution denied: ${op.command}`);
    }
  }

  private async processImages(imagePaths: string[]): Promise<string[]> {
    const processedImages: string[] = [];
    
    for (const path of imagePaths) {
      try {
        const base64 = await this.imageProcessor.processImage(path);
        processedImages.push(base64);
      } catch (error) {
        console.error(chalk.red(`Failed to process image ${path}:`), error);
      }
    }
    
    return processedImages;
  }

  private displayMessage(role: 'user' | 'assistant' | 'system', content: string, images?: string[]): void {
    if (this.execMode) {
      // In exec mode, just print to console
      if (role === 'assistant') {
        console.log(marked(content));
      }
      return;
    }
    
    const currentContent = this.chatBox?.getContent() || '';
    let newContent = currentContent;
    
    if (role === 'user') {
      newContent += `\n${chalk.green.bold('You:')} ${content}`;
      if (images && images.length > 0) {
        newContent += chalk.gray(` [${images.length} image(s) attached]`);
      }
    } else if (role === 'assistant') {
      newContent += `\n${chalk.blue.bold('Codex:')} ${marked(content)}`;
    } else {
      newContent += `\n${chalk.yellow(content)}`;
    }
    
    this.chatBox?.setContent(newContent);
    this.chatBox?.setScrollPerc(100);
    this.screen?.render();
  }

  private getStatusBarContent(): string {
    return ` Model: ${this.session.model} | Reasoning: ${this.session.reasoningLevel} | Mode: ${this.session.approvalMode} `;
  }
}


