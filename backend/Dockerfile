# Hardened Dockerfile (After Hardening: Minimal Base, Non-root User, Reduced Attack Surface)
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Set working directory
WORKDIR /app

# Copy dependency definitions and install production packages only
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy application source code
COPY --chown=node:node . .

# Switch to non-root user for security (Requirement 2c)
USER node

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
