FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json ./
COPY packages/ packages/
COPY apps/api-gateway/ apps/api-gateway/

# Install dependencies
RUN npm ci --workspace=@cksfinbot/api-gateway --include-workspace-root

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV GATEWAY_PORT=8000

COPY --from=builder /app /app

WORKDIR /app/apps/api-gateway

EXPOSE 8000

CMD ["node", "src/index.js"]

