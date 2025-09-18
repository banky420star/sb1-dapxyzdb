# Secrets Setup Guide

## Required Environment Variables

### 1. Bybit API Credentials
- **BYBIT_API_KEY**: Your Bybit API key
- **BYBIT_API_SECRET**: Your Bybit API secret
- **BYBIT_SECRET**: Your Bybit secret key

To obtain these:
1. Log in to your Bybit account
2. Go to API Management
3. Create a new API key with trading permissions
4. Copy the credentials to your .env file

### 2. Alpha Vantage API Key
- **ALPHAVANTAGE_API_KEY**: Your Alpha Vantage API key

Get your free key at: https://www.alphavantage.co/support/#api-key

### 3. Database Password
- **POSTGRES_PASSWORD**: A strong password for your PostgreSQL database
- Generated automatically if not set

### 4. JWT Secret
- **JWT_SECRET**: Secret key for JWT token signing
- Generated automatically with high entropy

## Security Best Practices

1. **Never commit .env file to version control**
2. **Use different credentials for development and production**
3. **Rotate secrets regularly**
4. **Use secret management services in production (AWS Secrets Manager, HashiCorp Vault, etc.)**
5. **Enable 2FA on all API accounts**
6. **Restrict API permissions to minimum required**

## Validation

Run the validation script to ensure all secrets are properly configured:
```bash
npm run validate-env
```

## Troubleshooting

If you see errors about missing environment variables:
1. Check that .env file exists
2. Ensure all required variables are set
3. Restart your services after updating .env
