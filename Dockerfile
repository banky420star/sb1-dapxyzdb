# AI Trading System - Production Dockerfile (multi-stage)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (needed for native modules like sqlite3)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++

# Copy package files and install dependencies deterministically
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Prepare necessary directories
RUN mkdir -p data logs models

# --- Runtime image ---
FROM node:20-alpine AS runtime

# Set working directory
WORKDIR /app

# Runtime-only packages
RUN apk add --no-cache \
    sqlite \
    curl \
    bash

# Environment
ENV NODE_ENV=production
ENV PORT=8000

# Copy built app and node_modules from builder
COPY --from=builder /app /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Expose ports (Railway will set PORT env)
EXPOSE 8000 3000 5555 5556

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trader -u 1001 -G nodejs

# Change ownership and drop privileges
RUN chown -R trader:nodejs /app
USER trader

# Start the application
CMD ["node", "server/index.js"]