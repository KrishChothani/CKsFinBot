/** @format */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { correlationIdMiddleware } from "@cksfinbot/shared-middleware";
import { createLogger } from "@cksfinbot/shared-logger";

dotenv.config();

const logger = createLogger("api-gateway");
const app = express();
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 8000;

// Upstream Target Services (Configurable via Environment)
const UPSTREAMS = {
  legacyMonolith: process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  identityService: process.env.IDENTITY_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  documentService: process.env.DOCUMENT_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  ledgerService: process.env.LEDGER_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  reconService: process.env.RECON_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  taxService: process.env.TAX_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  marketplaceService: process.env.MARKETPLACE_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  closeReadinessService: process.env.CLOSE_READINESS_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
  exportService: process.env.EXPORT_SERVICE_URL || process.env.LEGACY_MONOLITH_URL || "http://localhost:2590",
};

// Global Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(correlationIdMiddleware);

// Request Logging
app.use((req, res, next) => {
  logger.info(`--> [${req.method}] ${req.url}`, {
    correlationId: req.correlationId,
    firmId: req.headers["x-firm-id"],
    clientId: req.headers["x-client-id"],
  });
  next();
});

// Centralized Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "api-gateway",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    routesMapped: Object.keys(UPSTREAMS).length,
  });
});

/**
 * Helper to construct proxy middleware with distributed correlation and tenant propagation.
 */
function createServiceProxy(targetUrl, domainName) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Propagate distributed correlation ID
        if (req.correlationId) {
          proxyReq.setHeader("x-correlation-id", req.correlationId);
        }
        // Propagate tenant context
        if (req.headers["x-firm-id"]) {
          proxyReq.setHeader("x-firm-id", req.headers["x-firm-id"]);
        }
        if (req.headers["x-client-id"]) {
          proxyReq.setHeader("x-client-id", req.headers["x-client-id"]);
        }
      },
      error: (err, req, res) => {
        logger.error(`Proxy failure on ${domainName} (${targetUrl}): ${err.message}`, {
          correlationId: req.correlationId,
        });
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            statusCode: 502,
            message: `Gateway Error: Upstream service '${domainName}' is unreachable.`,
            error: { code: "UPSTREAM_UNAVAILABLE", upstream: targetUrl },
          });
        }
      },
    },
  });
}

// ─── DOMAIN PROXY ROUTES (STRANGLER FIG MAPPING) ─────────────────────────────
// 1. Identity & Tenant Domain
app.use("/api/v1/users", createServiceProxy(UPSTREAMS.identityService, "identity-service"));
app.use("/api/v1/firms", createServiceProxy(UPSTREAMS.identityService, "identity-service"));
app.use("/api/v1/clients", createServiceProxy(UPSTREAMS.identityService, "identity-service"));

// 2. Document Ingestion & Storage Vault Domain
app.use("/api/v1/documents", createServiceProxy(UPSTREAMS.documentService, "document-service"));
app.use("/api/v1/s3", createServiceProxy(UPSTREAMS.documentService, "document-service"));
app.use("/api/v1/public/portal", createServiceProxy(UPSTREAMS.documentService, "document-service"));
app.use("/api/v1/document-requests", createServiceProxy(UPSTREAMS.documentService, "document-service"));

// 3. Double-Entry Ledger & Voucher Domain
app.use("/api/v1/reviews", createServiceProxy(UPSTREAMS.ledgerService, "ledger-service"));
app.use("/api/v1/vouchers", createServiceProxy(UPSTREAMS.ledgerService, "ledger-service"));
app.use("/api/v1/approvals", createServiceProxy(UPSTREAMS.ledgerService, "ledger-service"));

// 4. GSTR-2B Reconciliation & IMS Domain
app.use("/api/v1/gst-reconciliation", createServiceProxy(UPSTREAMS.reconService, "reconciliation-service"));
app.use("/api/v1/gsp", createServiceProxy(UPSTREAMS.reconService, "reconciliation-service"));

// 5. Statutory Tax Advisory Domain
app.use("/api/v1/tax-advisory", createServiceProxy(UPSTREAMS.taxService, "tax-advisory-service"));
app.use("/api/v1/compliance", createServiceProxy(UPSTREAMS.taxService, "tax-advisory-service"));

// 6. Marketplace Settlement Domain
app.use("/api/v1/marketplace-settlements", createServiceProxy(UPSTREAMS.marketplaceService, "marketplace-service"));

// 7. Month-End Close Readiness Domain
app.use("/api/v1/close-readiness", createServiceProxy(UPSTREAMS.closeReadinessService, "close-readiness-service"));
app.use("/api/v1/client-summaries", createServiceProxy(UPSTREAMS.closeReadinessService, "close-readiness-service"));
app.use("/api/v1/whatsapp", createServiceProxy(UPSTREAMS.closeReadinessService, "close-readiness-service"));

// 8. ERP & Tally Export Domain
app.use("/api/v1/exports", createServiceProxy(UPSTREAMS.exportService, "export-service"));

// 9. Legacy Fallback (All other routes)
app.use("/api/v1", createServiceProxy(UPSTREAMS.legacyMonolith, "legacy-monolith"));

// Root 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `API Gateway: No route mapped for [${req.method}] ${req.originalUrl}`,
    error: { code: "ROUTE_NOT_FOUND" },
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(`🚀 API Gateway active and listening on http://localhost:${PORT}`);
  });
}

export { app };

