# Build Stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
# This generates dist/ (client) and dist/server.cjs (server)
RUN npm run build

# Production Stage
FROM node:20-slim AS production

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy only the necessary files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
