/** @format */

const REDACT_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "secret",
  "jwtsecret",
  "apikey",
  "awssecretaccesskey",
]);

/**
 * Deeply sanitizes sensitive credentials before logging.
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeObject(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export class Logger {
  constructor(serviceName = "service") {
    this.serviceName = serviceName;
  }

  formatLog(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      correlationId: meta.correlationId || null,
      tenant: meta.tenant || (meta.firmId ? { firmId: meta.firmId, clientId: meta.clientId } : null),
      ...sanitizeObject(meta),
    };

    return JSON.stringify(logEntry);
  }

  info(message, meta) {
    console.log(this.formatLog("info", message, meta));
  }

  warn(message, meta) {
    console.warn(this.formatLog("warn", message, meta));
  }

  error(message, meta) {
    console.error(this.formatLog("error", message, meta));
  }

  debug(message, meta) {
    if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
      console.debug(this.formatLog("debug", message, meta));
    }
  }
}

export function createLogger(serviceName) {
  return new Logger(serviceName);
}

export default {
  Logger,
  createLogger,
};

