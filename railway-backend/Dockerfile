FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache wget curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Set environment variables
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8000/health || exit 1

# Run the application
CMD ["npm", "start"] 