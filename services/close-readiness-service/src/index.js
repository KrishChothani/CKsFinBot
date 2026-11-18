/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { closeRelay } from "./services/closeRelay.service.js";
import closeRoutes from "./routes/closeReadiness.routes.js";

dotenv.config();

const logger = createLogger("close-readiness-service");
const app = express();
const PORT = process.env.CLOSE_READINESS_SERVICE_PORT || process.env.PORT || 8009;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(correlationIdMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "close-readiness-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: closeRelay.eventBus.isConnected,
    eventBusMode: closeRelay.eventBus.mode,
  });
});

app.use("/api/v1/close-readiness", closeRoutes);
app.use("/api/v1/client-summaries", closeRoutes);
app.use("/api/v1/whatsapp", closeRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[close-readiness-service] Error on ${req.method} ${req.url}: ${message}`, {
    statusCode,
    stack: err.stack,
    correlationId: req.correlationId,
  });
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    correlationId: req.correlationId,
  });
});

export async function startServer() {
  await closeRelay.init();

  return app.listen(PORT, () => {
    logger.info(`📊 Month-End Close Readiness & Chasing Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };

