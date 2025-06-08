# Build Angular app
FROM node:18 as angular-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Build Node.js server
FROM node:18 as server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build

# Production image
FROM node:18-slim
WORKDIR /app

# Copy built Angular files
COPY --from=angular-builder /app/dist/flappy-bird-web/browser ./dist/flappy-bird-web/browser

# Copy built server files and dependencies
COPY --from=server-builder /app/dist ./server/dist
COPY --from=server-builder /app/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"] 