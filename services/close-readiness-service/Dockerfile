FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json ./
COPY packages/ packages/
COPY services/close-readiness-service/ services/close-readiness-service/

# Install dependencies
RUN npm ci --workspace=@cksfinbot/close-readiness-service --include-workspace-root

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8009

COPY --from=builder /app /app

WORKDIR /app/services/close-readiness-service

EXPOSE 8009

CMD ["node", "src/index.js"]

