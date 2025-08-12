FROM node:18-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose API port
EXPOSE 8000

# Start the backend API
CMD ["node", "server/index.js"]