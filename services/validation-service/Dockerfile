# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/validation-service/package*.json ./services/validation-service/

RUN npm install -w @cksfinbot/validation-service --omit=dev

COPY services/validation-service/ ./services/validation-service/

WORKDIR /app/services/validation-service

EXPOSE 8004

ENV NODE_ENV=production
ENV PORT=8004

CMD ["node", "src/index.js"]

