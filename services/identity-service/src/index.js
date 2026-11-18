/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";
import { connectDB } from "./config/db.js";
import { identityRelay } from "./services/identityRelay.service.js";

import userRoutes from "./routes/user.routes.js";
import firmRoutes from "./routes/firm.routes.js";
import clientRoutes from "./routes/client.routes.js";

dotenv.config();

const logger = createLogger("identity-service");
const app = express();
const PORT = process.env.IDENTITY_SERVICE_PORT || process.env.PORT || 8001;

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
    service: "identity-service",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    eventBusConnected: identityRelay.eventBus.isConnected,
    eventBusMode: identityRelay.eventBus.mode,
  });
});

// Domain Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/firms", firmRoutes);
app.use("/api/v1/clients", clientRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`[identity-service] Error on ${req.method} ${req.url}: ${message}`, {
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
  await connectDB();
  await identityRelay.init();

  return app.listen(PORT, () => {
    logger.info(`🔑 Identity & Tenant Management Service listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error(`Fatal startup failure: ${err.message}`);
  });
}

export { app };

