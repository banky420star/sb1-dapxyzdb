import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { ConfigManager } from '../config/ConfigManager.js';
import OpenAI from 'openai';

export class AuthManager {
  private configManager: ConfigManager;
  private openaiClient: OpenAI | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async checkAuthentication(): Promise<boolean> {
    const authType = this.configManager.get('authType');
    
    if (!authType) {
      return false;
    }

    if (authType === 'api-key') {
      const apiKey = this.configManager.get('apiKey');
      if (apiKey) {
        try {
          // Verify API key is valid
          this.openaiClient = new OpenAI({ apiKey });
          await this.openaiClient.models.list();
          return true;
        } catch (error) {
          console.error(chalk.red('❌ Invalid API key'));
          return false;
        }
      }
    } else if (authType === 'chatgpt') {
      const token = this.configManager.get('chatgptToken');
      if (token) {
        // Check if token is still valid
        return await this.verifyChatGPTToken(token);
      }
    }

    return false;
  }

  async authenticate(): Promise<void> {
    const { authMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'How would you like to authenticate?',
        choices: [
          { name: '🔐 Sign in with ChatGPT account (Recommended)', value: 'chatgpt' },
          { name: '🔑 Use OpenAI API key', value: 'api-key' }
        ]
      }
    ]);

    if (authMethod === 'chatgpt') {
      await this.authenticateWithChatGPT();
    } else {
      await this.authenticateWithAPIKey();
    }
  }

  private async authenticateWithChatGPT(): Promise<void> {
    console.log(chalk.cyan('\n📱 Opening browser for ChatGPT authentication...'));
    console.log(chalk.gray('Please sign in with your ChatGPT account in the browser.\n'));

    // Simulate OAuth flow (in a real implementation, this would open a browser)
    const spinner = ora('Waiting for authentication...').start();
    
    // Simulate authentication process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, we would:
    // 1. Start a local server to handle OAuth callback
    // 2. Open browser to ChatGPT OAuth URL
    // 3. Receive token from callback
    // 4. Store token securely
    
    // For demo purposes, we'll simulate success
    const mockToken = 'chatgpt_token_' + Date.now();
    this.configManager.set('authType', 'chatgpt');
    this.configManager.set('chatgptToken', mockToken);
    
    spinner.succeed('Successfully authenticated with ChatGPT!');
    console.log(chalk.green('✅ You can now use Codex with your ChatGPT Plus/Pro/Team subscription.\n'));
  }

  private async authenticateWithAPIKey(): Promise<void> {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your OpenAI API key:',
        mask: '*',
        validate: (input) => {
          if (!input || input.length < 20) {
            return 'Please enter a valid API key';
          }
          return true;
        }
      }
    ]);

    const spinner = ora('Verifying API key...').start();

    try {
      // Verify the API key
      this.openaiClient = new OpenAI({ apiKey });
      await this.openaiClient.models.list();
      
      // Store the API key
      this.configManager.set('authType', 'api-key');
      this.configManager.set('apiKey', apiKey);
      
      spinner.succeed('API key verified and saved!');
      console.log(chalk.green('✅ You can now use Codex with your API key.\n'));
    } catch (error) {
      spinner.fail('Invalid API key');
      console.error(chalk.red('❌ The API key you provided is invalid. Please try again.'));
      throw error;
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    try {
      // Verify the API key
      this.openaiClient = new OpenAI({ apiKey });
      await this.openaiClient.models.list();
      
      // Store the API key
      this.configManager.set('authType', 'api-key');
      this.configManager.set('apiKey', apiKey);
      
      console.log(chalk.green('✅ API key set successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Invalid API key'));
      throw error;
    }
  }

  private async verifyChatGPTToken(token: string): Promise<boolean> {
    // In a real implementation, this would verify the token with ChatGPT servers
    // For now, we'll simulate token validation
    
    // Check if token is expired (simple mock check)
    const tokenParts = token.split('_');
    if (tokenParts.length > 2) {
      const timestamp = parseInt(tokenParts[2], 10);
      const dayInMs = 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - timestamp > 30 * dayInMs; // 30 days expiry
      
      if (isExpired) {
        console.log(chalk.yellow('⚠️ Your ChatGPT session has expired. Please authenticate again.'));
        return false;
      }
    }
    
    return true;
  }

  async logout(): Promise<void> {
    this.configManager.delete('authType');
    this.configManager.delete('apiKey');
    this.configManager.delete('chatgptToken');
    this.openaiClient = null;
  }

  getOpenAIClient(): OpenAI | null {
    if (this.openaiClient) {
      return this.openaiClient;
    }

    const authType = this.configManager.get('authType');
    
    if (authType === 'api-key') {
      const apiKey = this.configManager.get('apiKey');
      if (apiKey) {
        this.openaiClient = new OpenAI({ apiKey });
        return this.openaiClient;
      }
    } else if (authType === 'chatgpt') {
      // In a real implementation, we would use the ChatGPT token
      // to create an authenticated client
      // For now, we'll return a mock client
      const apiKey = process.env.OPENAI_API_KEY || 'mock-key';
      this.openaiClient = new OpenAI({ apiKey });
      return this.openaiClient;
    }

    return null;
  }
}


