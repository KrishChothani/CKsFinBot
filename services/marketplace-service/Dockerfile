# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/marketplace-service/package*.json ./services/marketplace-service/

RUN npm install -w @cksfinbot/marketplace-service --omit=dev

COPY services/marketplace-service/ ./services/marketplace-service/

WORKDIR /app/services/marketplace-service

EXPOSE 8008

ENV NODE_ENV=production
ENV PORT=8008

CMD ["node", "src/index.js"]

