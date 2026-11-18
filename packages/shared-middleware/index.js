/** @format */

import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Middleware that extracts or generates a distributed correlation ID.
 * Propagates the ID via request context and response headers.
 */
export function correlationIdMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

/**
 * Middleware that enforces strict multi-tenant context boundary.
 * Never allows queries without firmId context.
 *
 * @param {Object} [options]
 * @param {boolean} [options.requireClient=false] - Whether clientId header is strictly required
 */
export function tenantContextMiddleware(options = { requireClient: false }) {
  return (req, res, next) => {
    const firmId = req.headers["x-firm-id"] || req.query.firmId;
    const clientId = req.headers["x-client-id"] || req.query.clientId;

    if (!firmId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Tenant context violation: Missing required 'x-firm-id' header.",
        error: { code: "MISSING_FIRM_CONTEXT" },
      });
    }

    if (options.requireClient && !clientId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Tenant context violation: Missing required 'x-client-id' header for client-scoped resource.",
        error: { code: "MISSING_CLIENT_CONTEXT" },
      });
    }

    req.firmId = String(firmId);
    req.clientId = clientId ? String(clientId) : null;
    next();
  };
}

/**
 * JWT Authentication Middleware for microservices behind or inside the API Gateway.
 */
export function jwtAuthMiddleware(secretKey = null) {
  const secret = secretKey || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "fallback_dev_secret_32_chars_min";

  return (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized: Missing Bearer authentication token.",
        error: { code: "UNAUTHORIZED_NO_TOKEN" },
      });
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: `Unauthorized: Invalid or expired token (${err.message}).`,
        error: { code: "INVALID_TOKEN", details: err.message },
      });
    }
  };
}

export default {
  correlationIdMiddleware,
  tenantContextMiddleware,
  jwtAuthMiddleware,
};

