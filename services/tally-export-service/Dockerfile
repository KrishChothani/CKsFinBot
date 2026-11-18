# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/tally-export-service/package*.json ./services/tally-export-service/

RUN npm install -w @cksfinbot/tally-export-service --omit=dev

COPY services/tally-export-service/ ./services/tally-export-service/

WORKDIR /app/services/tally-export-service

EXPOSE 8010

ENV NODE_ENV=production
ENV PORT=8010

CMD ["node", "src/index.js"]

