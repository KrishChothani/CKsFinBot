FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json ./
COPY packages/ packages/
COPY services/identity-service/ services/identity-service/

# Install dependencies
RUN npm ci --workspace=@cksfinbot/identity-service --include-workspace-root

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8001

COPY --from=builder /app /app

WORKDIR /app/services/identity-service

EXPOSE 8001

CMD ["node", "src/index.js"]

