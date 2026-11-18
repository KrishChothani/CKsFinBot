/** @format */

import { test, describe } from "node:test";
import assert from "node:assert";
import { createLogger } from "./index.js";

describe("Shared Logger Tests", () => {
  test("formats structured JSON log entry", () => {
    const logger = createLogger("test-service");
    const jsonStr = logger.formatLog("info", "User logged in", {
      correlationId: "trace-123",
      firmId: "firm-999",
      userId: "u-1",
    });

    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.level, "INFO");
    assert.strictEqual(parsed.service, "test-service");
    assert.strictEqual(parsed.message, "User logged in");
    assert.strictEqual(parsed.correlationId, "trace-123");
    assert.strictEqual(parsed.tenant.firmId, "firm-999");
  });

  test("automatically redacts sensitive credentials like password and token", () => {
    const logger = createLogger("auth-service");
    const jsonStr = logger.formatLog("info", "Processing auth", {
      password: "super_secret_password",
      accessToken: "eyJhbGciOi...",
      safeField: "safe_value",
    });

    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.password, "[REDACTED]");
    assert.strictEqual(parsed.accessToken, "[REDACTED]");
    assert.strictEqual(parsed.safeField, "safe_value");
  });
});

