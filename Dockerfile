FROM node:20-slim AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

# Copy frontend source and build
COPY frontend ./
RUN npm run build

# Production image
FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend source code
COPY backend ./

# Copy frontend build
RUN mkdir -p ./public
COPY --from=builder /app/frontend/dist ./public

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "server.js"]
