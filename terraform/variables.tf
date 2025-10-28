# Terraform Variables for Oracle Cloud Infrastructure

variable "tenancy_ocid" {
  description = "The OCID of the tenancy"
  type        = string
}

variable "user_ocid" {
  description = "The OCID of the user"
  type        = string
}

variable "fingerprint" {
  description = "The fingerprint of the API key"
  type        = string
}

variable "private_key_path" {
  description = "The path to the private key file"
  type        = string
}

variable "region" {
  description = "The region to deploy resources"
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  description = "The OCID of the compartment"
  type        = string
}

variable "ssh_public_key" {
  description = "The public SSH key for instance access"
  type        = string
}

variable "db_password" {
  description = "The password for the database"
  type        = string
  sensitive   = true
}

variable "bybit_api_key" {
  description = "Bybit API key for trading"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bybit_api_secret" {
  description = "Bybit API secret for trading"
  type        = string
  sensitive   = true
  default     = ""
}

variable "alpha_vantage_api_key" {
  description = "Alpha Vantage API key for market data"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Encryption key for sensitive data"
  type        = string
  sensitive   = true
}

variable "trading_mode" {
  description = "Trading mode (paper or live)"
  type        = string
  default     = "paper"
}

variable "confidence_threshold" {
  description = "Minimum confidence threshold for trading"
  type        = number
  default     = 0.60
}

variable "max_drawdown_pct" {
  description = "Maximum drawdown percentage"
  type        = number
  default     = 0.15
}

variable "per_symbol_usd_cap" {
  description = "Maximum USD per symbol"
  type        = number
  default     = 10000
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-trading"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "AI Trading System"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}