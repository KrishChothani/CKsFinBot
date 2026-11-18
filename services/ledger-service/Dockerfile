# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/ledger-service/package*.json ./services/ledger-service/

RUN npm install -w @cksfinbot/ledger-service --omit=dev

COPY services/ledger-service/ ./services/ledger-service/

WORKDIR /app/services/ledger-service

EXPOSE 8005

ENV NODE_ENV=production
ENV PORT=8005

CMD ["node", "src/index.js"]

