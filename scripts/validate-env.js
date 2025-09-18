#!/usr/bin/env node

/**
 * Environment Variables Validator
 * Ensures all required environment variables are set and valid
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Required environment variables
const REQUIRED_VARS = {
  // Database
  'POSTGRES_DB': { type: 'string', sensitive: false },
  'POSTGRES_USER': { type: 'string', sensitive: false },
  'POSTGRES_PASSWORD': { type: 'string', sensitive: true, minLength: 12 },
  'DATABASE_URL': { type: 'url', sensitive: true },
  
  // Redis
  'REDIS_URL': { type: 'url', sensitive: false },
  
  // Bybit API
  'BYBIT_API_KEY': { type: 'string', sensitive: true, pattern: /^[A-Za-z0-9]{10,}$/ },
  'BYBIT_API_SECRET': { type: 'string', sensitive: true, minLength: 20 },
  
  // JWT
  'JWT_SECRET': { type: 'string', sensitive: true, minLength: 32 },
  
  // Trading Configuration
  'TRADING_MODE': { type: 'enum', values: ['live', 'paper', 'backtest'], sensitive: false },
  'CONFIDENCE_THRESHOLD': { type: 'number', min: 0, max: 1, sensitive: false },
  'MAX_DRAWDOWN_PCT': { type: 'number', min: 0, max: 1, sensitive: false },
  'PER_SYMBOL_USD_CAP': { type: 'number', min: 0, sensitive: false }
};

// Optional but recommended variables
const OPTIONAL_VARS = {
  'ALPHAVANTAGE_API_KEY': { type: 'string', sensitive: true },
  'GRAFANA_PASSWORD': { type: 'string', sensitive: true, minLength: 8 },
  'MLFLOW_TRACKING_URI': { type: 'url', sensitive: false },
  'NODE_ENV': { type: 'enum', values: ['development', 'production', 'test'], sensitive: false }
};

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.secrets = [];
  }

  log(message, type = 'info') {
    const prefix = {
      error: `${colors.red}❌ ERROR:${colors.reset}`,
      warning: `${colors.yellow}⚠️  WARNING:${colors.reset}`,
      success: `${colors.green}✅ SUCCESS:${colors.reset}`,
      info: `${colors.blue}ℹ️  INFO:${colors.reset}`
    };
    console.log(`${prefix[type]} ${message}`);
  }

  validateVariable(name, config, value) {
    if (!value) {
      return { valid: false, error: `Missing required variable: ${name}` };
    }

    switch (config.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: `${name} must be a string` };
        }
        if (config.minLength && value.length < config.minLength) {
          return { valid: false, error: `${name} must be at least ${config.minLength} characters long` };
        }
        if (config.pattern && !config.pattern.test(value)) {
          return { valid: false, error: `${name} has invalid format` };
        }
        break;

      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return { valid: false, error: `${name} must be a number` };
        }
        if (config.min !== undefined && num < config.min) {
          return { valid: false, error: `${name} must be >= ${config.min}` };
        }
        if (config.max !== undefined && num > config.max) {
          return { valid: false, error: `${name} must be <= ${config.max}` };
        }
        break;

      case 'enum':
        if (!config.values.includes(value)) {
          return { valid: false, error: `${name} must be one of: ${config.values.join(', ')}` };
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return { valid: false, error: `${name} must be a valid URL` };
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          return { valid: false, error: `${name} must be a boolean (true/false)` };
        }
        break;
    }

    return { valid: true };
  }

  checkForHardcodedSecrets() {
    const projectRoot = path.resolve(__dirname, '..');
    const filesToCheck = [
      'server/data/bybit-trading-v5.js',
      'docker-compose.local.yml',
      'railway-backend/config.js',
      'server/config/index.js'
    ];

    this.log('Checking for hardcoded secrets in source files...', 'info');

    filesToCheck.forEach(file => {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for common secret patterns
        const patterns = [
          /apiKey:\s*['"][A-Za-z0-9]{10,}['"]/gi,
          /secret:\s*['"][A-Za-z0-9]{20,}['"]/gi,
          /password:\s*['"][^'"]{8,}['"]/gi,
          /token:\s*['"][A-Za-z0-9\-_]{20,}['"]/gi,
          /key:\s*['"][A-Za-z0-9]{10,}['"]/gi
        ];

        patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            this.secrets.push({
              file,
              matches: matches.map(m => m.substring(0, 30) + '...')
            });
          }
        });
      }
    });
  }

  generateSecureValue(type, length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  validate() {
    this.log('Starting environment validation...', 'info');
    
    // Load .env file if it exists
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      this.log('.env file loaded', 'success');
    } else {
      this.log('.env file not found. Please create one from env.template', 'error');
      this.errors.push('Missing .env file');
    }

    // Validate required variables
    Object.entries(REQUIRED_VARS).forEach(([name, config]) => {
      const value = process.env[name];
      const result = this.validateVariable(name, config, value);
      
      if (!result.valid) {
        this.errors.push(result.error);
        this.log(result.error, 'error');
      } else if (config.sensitive) {
        this.log(`${name}: ✓ (value hidden)`, 'success');
      } else {
        this.log(`${name}: ${value}`, 'success');
      }
    });

    // Check optional variables
    Object.entries(OPTIONAL_VARS).forEach(([name, config]) => {
      const value = process.env[name];
      if (!value) {
        this.warnings.push(`Optional variable ${name} is not set`);
        this.log(`Optional variable ${name} is not set`, 'warning');
      }
    });

    // Check for hardcoded secrets
    this.checkForHardcodedSecrets();

    // Generate report
    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(50));

    if (this.secrets.length > 0) {
      this.log(`Found ${this.secrets.length} files with potential hardcoded secrets:`, 'error');
      this.secrets.forEach(({ file, matches }) => {
        console.log(`  - ${file}: ${matches.length} potential secrets found`);
      });
    }

    if (this.errors.length === 0 && this.secrets.length === 0) {
      this.log('All environment variables are properly configured!', 'success');
      this.log('No hardcoded secrets detected in source files.', 'success');
      
      // Suggest secure values for missing optional vars
      if (this.warnings.length > 0) {
        console.log('\nSuggested secure values for optional variables:');
        Object.entries(OPTIONAL_VARS).forEach(([name, config]) => {
          if (!process.env[name] && config.sensitive) {
            console.log(`${name}=${this.generateSecureValue(config.type)}`);
          }
        });
      }
      
      return 0;
    } else {
      this.log(`\nValidation failed with ${this.errors.length} errors`, 'error');
      if (this.secrets.length > 0) {
        console.log('\nAction required:');
        console.log('1. Remove hardcoded secrets from source files');
        console.log('2. Add them to .env file instead');
        console.log('3. Run: npm run scrub-secrets');
      }
      return 1;
    }
  }
}

// Run validator
const validator = new EnvValidator();
process.exit(validator.validate());
