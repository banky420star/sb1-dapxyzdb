#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CodexCLI } from './core/CodexCLI.js';
import { AuthManager } from './auth/AuthManager.js';
import { ConfigManager } from './config/ConfigManager.js';
import { ModelType, ApprovalMode } from './types/index.js';

// Load environment variables
config();

// Get package.json for version info
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
);

// Check for updates
const notifier = updateNotifier({ pkg: packageJson });
notifier.notify();

const program = new Command();

program
  .name('codex')
  .description('Codex CLI - AI-powered coding assistant')
  .version(packageJson.version);

// Main command - interactive mode
program
  .argument('[prompt]', 'Initial prompt to run Codex with')
  .option('-m, --model <model>', 'Model to use (gpt-5, gpt-5-codex, o4-mini)', 'gpt-5')
  .option('-i, --image <paths>', 'Comma-separated image paths to attach')
  .option('--api-key <key>', 'OpenAI API key')
  .option('--approval <mode>', 'Approval mode (auto, read-only, full)', 'auto')
  .action(async (prompt, options) => {
    try {
      console.log(chalk.cyan.bold('🤖 Starting Codex CLI...'));
      
      // Initialize managers
      const configManager = new ConfigManager();
      const authManager = new AuthManager(configManager);
      
      // Handle authentication
      if (options.apiKey) {
        await authManager.setApiKey(options.apiKey);
      } else {
        const isAuthenticated = await authManager.checkAuthentication();
        if (!isAuthenticated) {
          console.log(chalk.yellow('🔐 Authentication required'));
          await authManager.authenticate();
        }
      }
      
      // Parse image paths if provided
      let imagePaths: string[] = [];
      if (options.image) {
        imagePaths = options.image.split(',').map((p: string) => p.trim());
      }
      
      // Initialize Codex CLI
      const codex = new CodexCLI({
        model: options.model as ModelType,
        approvalMode: options.approval as ApprovalMode,
        authManager,
        configManager
      });
      
      // Run Codex
      if (prompt) {
        await codex.runWithPrompt(prompt, imagePaths);
      } else {
        await codex.runInteractive();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

// Exec command - non-interactive mode
program
  .command('exec <prompt>')
  .description('Run Codex non-interactively with a prompt')
  .option('-m, --model <model>', 'Model to use', 'gpt-5')
  .option('-i, --image <paths>', 'Comma-separated image paths')
  .option('--approval <mode>', 'Approval mode', 'auto')
  .action(async (prompt, options) => {
    try {
      console.log(chalk.cyan('🚀 Running Codex in exec mode...'));
      
      const configManager = new ConfigManager();
      const authManager = new AuthManager(configManager);
      
      // Check authentication
      const isAuthenticated = await authManager.checkAuthentication();
      if (!isAuthenticated) {
        console.error(chalk.red('❌ Not authenticated. Please run "codex" first to authenticate.'));
        process.exit(1);
      }
      
      // Parse images
      let imagePaths: string[] = [];
      if (options.image) {
        imagePaths = options.image.split(',').map((p: string) => p.trim());
      }
      
      // Run in exec mode
      const codex = new CodexCLI({
        model: options.model as ModelType,
        approvalMode: options.approval as ApprovalMode,
        authManager,
        configManager,
        execMode: true
      });
      
      await codex.runWithPrompt(prompt, imagePaths);
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage Codex configuration')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset configuration to defaults')
  .action(async (options) => {
    const configManager = new ConfigManager();
    
    if (options.show) {
      const config = configManager.getAll();
      console.log(chalk.cyan('📋 Current Configuration:'));
      console.log(JSON.stringify(config, null, 2));
    } else if (options.reset) {
      configManager.reset();
      console.log(chalk.green('✅ Configuration reset to defaults'));
    } else {
      console.log(chalk.yellow('Use --show to view config or --reset to reset'));
    }
  });

// Auth command
program
  .command('auth')
  .description('Manage authentication')
  .option('--logout', 'Log out of current session')
  .option('--status', 'Check authentication status')
  .action(async (options) => {
    const configManager = new ConfigManager();
    const authManager = new AuthManager(configManager);
    
    if (options.logout) {
      await authManager.logout();
      console.log(chalk.green('✅ Logged out successfully'));
    } else if (options.status) {
      const isAuthenticated = await authManager.checkAuthentication();
      if (isAuthenticated) {
        const authType = configManager.get('authType');
        console.log(chalk.green(`✅ Authenticated via ${authType}`));
      } else {
        console.log(chalk.yellow('⚠️ Not authenticated'));
      }
    } else {
      console.log(chalk.yellow('Use --logout to log out or --status to check status'));
    }
  });

program.parse(process.argv);

