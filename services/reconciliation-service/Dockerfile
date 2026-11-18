# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/reconciliation-service/package*.json ./services/reconciliation-service/

RUN npm install -w @cksfinbot/reconciliation-service --omit=dev

COPY services/reconciliation-service/ ./services/reconciliation-service/

WORKDIR /app/services/reconciliation-service

EXPOSE 8006

ENV NODE_ENV=production
ENV PORT=8006

CMD ["node", "src/index.js"]

