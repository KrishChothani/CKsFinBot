/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { reconRelay } from "./services/reconRelay.service.js";
import reconRoutes from "./routes/gstRecon.routes.js";

dotenv.config();

const logger = createLogger("reconciliation-service");
const app = express();
const PORT = process.env.RECON_SERVICE_PORT || process.env.PORT || 8006;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(correlationIdMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "reconciliation-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: reconRelay.eventBus.isConnected,
    eventBusMode: reconRelay.eventBus.mode,
  });
});

app.use("/api/v1/gst-reconciliation", reconRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[reconciliation-service] Error on ${req.method} ${req.url}: ${message}`, {
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
  await reconRelay.init();
  await reconRelay.startConsumer();

  return app.listen(PORT, () => {
    logger.info(`🔍 GSTR-2B Reconciliation & IMS Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };

