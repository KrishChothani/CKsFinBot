# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

# Copy root workspace package.json and packages
COPY package*.json ./
COPY packages/ ./packages/
COPY services/document-service/package*.json ./services/document-service/

# Install dependencies
RUN npm install -w @cksfinbot/document-service --omit=dev

# Copy service source code
COPY services/document-service/ ./services/document-service/

WORKDIR /app/services/document-service

EXPOSE 8002

ENV NODE_ENV=production
ENV PORT=8002

CMD ["node", "src/index.js"]

