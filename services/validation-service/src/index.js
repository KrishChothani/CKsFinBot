/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { testConnection } from "./config/db.js";
import { validationRelay } from "./services/validationRelay.service.js";
import rulesRoutes from "./routes/rules.routes.js";

dotenv.config();

const logger = createLogger("validation-service");
const app = express();
const PORT = process.env.VALIDATION_SERVICE_PORT || process.env.PORT || 8004;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(correlationIdMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "validation-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: validationRelay.eventBus.isConnected,
    eventBusMode: validationRelay.eventBus.mode,
  });
});

app.use("/api/v1/rules", rulesRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[validation-service] Error on ${req.method} ${req.url}: ${message}`, {
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
  await testConnection();
  await validationRelay.init();
  await validationRelay.startConsumer();

  return app.listen(PORT, () => {
    logger.info(`⚖️ Deterministic Validation & Statutory Rules Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };

