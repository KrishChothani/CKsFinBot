/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { taxRelay } from "./services/taxRelay.service.js";
import taxRoutes from "./routes/taxAdvisory.routes.js";

dotenv.config();

const logger = createLogger("tax-advisory-service");
const app = express();
const PORT = process.env.TAX_SERVICE_PORT || process.env.PORT || 8007;

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
    service: "tax-advisory-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: taxRelay.eventBus.isConnected,
    eventBusMode: taxRelay.eventBus.mode,
  });
});

app.use("/api/v1/tax-advisory", taxRoutes);
app.use("/api/v1/compliance", taxRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[tax-advisory-service] Error on ${req.method} ${req.url}: ${message}`, {
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
  await taxRelay.init();
  await taxRelay.startConsumer();

  return app.listen(PORT, () => {
    logger.info(`⚖️ Statutory Tax Advisory & MSME Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };

