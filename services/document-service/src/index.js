/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { connectDB } from "./config/db.js";
import { outboxRelay } from "./services/outboxRelay.service.js";

// Routes
import documentRoutes from "./routes/document.routes.js";
import s3Routes from "./routes/s3.routes.js";
import publicPortalRoutes from "./routes/publicPortal.routes.js";
import documentRequestRoutes from "./routes/documentRequest.routes.js";

dotenv.config();

const logger = createLogger("document-service");
const app = express();
const PORT = process.env.DOCUMENT_SERVICE_PORT || process.env.PORT || 8002;

// Global Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(correlationIdMiddleware);

// Static uploads serving for local dev
const uploadsDir = path.resolve(process.cwd(), "Public", "Uploads");
app.use("/uploads", express.static(uploadsDir));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "document-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: outboxRelay.eventBus.isConnected,
    eventBusMode: outboxRelay.eventBus.mode,
  });
});

// Domain Routes
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/s3", s3Routes);
app.use("/api/v1/public/portal", publicPortalRoutes);
app.use("/api/v1/document-requests", documentRequestRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[document-service] ${req.method} ${req.url} error: ${message}`, {
    statusCode,
    stack: err.stack,
    correlationId: req.correlationId,
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    correlationId: req.correlationId,
  });
});

// Initialization
export async function startServer() {
  await connectDB();
  await outboxRelay.init();
  outboxRelay.startOutboxPoller();

  return app.listen(PORT, () => {
    logger.info(`📦 Document Ingestion & Storage Vault Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };
