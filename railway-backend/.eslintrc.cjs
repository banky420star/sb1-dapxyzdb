module.exports = {
  env: { 
    node: true, 
    es2023: true 
  },
  extends: ['eslint:recommended'],
  parserOptions: { 
    ecmaVersion: 'latest', 
    sourceType: 'module' 
  },
  rules: {
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_', 
      varsIgnorePattern: '^_' 
    }],
    'no-undef': 'error',
    'no-console': 'off', // Allow console for logging
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error'
  }
}; 