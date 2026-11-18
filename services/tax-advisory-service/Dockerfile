# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/tax-advisory-service/package*.json ./services/tax-advisory-service/

RUN npm install -w @cksfinbot/tax-advisory-service --omit=dev

COPY services/tax-advisory-service/ ./services/tax-advisory-service/

WORKDIR /app/services/tax-advisory-service

EXPOSE 8007

ENV NODE_ENV=production
ENV PORT=8007

CMD ["node", "src/index.js"]

