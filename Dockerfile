# AI Trading System - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    sqlite \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data logs models

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Expose ports
EXPOSE 8000 3000 5555 5556

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trader -u 1001 -G nodejs

# Change ownership
RUN chown -R trader:nodejs /app
USER trader

# Start the application
CMD ["npm", "run", "server"]