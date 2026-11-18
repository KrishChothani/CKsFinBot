/** @format */

import { test, describe } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import {
  correlationIdMiddleware,
  tenantContextMiddleware,
  jwtAuthMiddleware,
} from "./index.js";

describe("Shared Middleware Invariant Tests", () => {
  test("correlationIdMiddleware sets x-correlation-id if absent", () => {
    const req = { headers: {} };
    const resHeaders = {};
    const res = {
      setHeader: (k, v) => {
        resHeaders[k] = v;
      },
    };
    let calledNext = false;

    correlationIdMiddleware(req, res, () => {
      calledNext = true;
    });

    assert.strictEqual(calledNext, true);
    assert.ok(req.correlationId);
    assert.strictEqual(resHeaders["x-correlation-id"], req.correlationId);
  });

  test("tenantContextMiddleware rejects missing firmId", () => {
    const req = { headers: {}, query: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => {
        statusSent = code;
        return {
          json: (data) => {
            jsonSent = data;
          },
        };
      },
    };

    tenantContextMiddleware()(req, res, () => {});

    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.error.code, "MISSING_FIRM_CONTEXT");
  });

  test("tenantContextMiddleware attaches firmId and clientId when valid", () => {
    const req = {
      headers: { "x-firm-id": "firm_abc", "x-client-id": "client_xyz" },
      query: {},
    };
    let calledNext = false;

    tenantContextMiddleware()(req, {}, () => {
      calledNext = true;
    });

    assert.strictEqual(calledNext, true);
    assert.strictEqual(req.firmId, "firm_abc");
    assert.strictEqual(req.clientId, "client_xyz");
  });

  test("jwtAuthMiddleware verifies valid JWT tokens", () => {
    const secret = "test_secret_for_jwt_auth_1234567";
    const token = jwt.sign({ _id: "user_123", email: "test@cksfinbot.com" }, secret, {
      expiresIn: "1h",
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    let calledNext = false;

    jwtAuthMiddleware(secret)(req, {}, () => {
      calledNext = true;
    });

    assert.strictEqual(calledNext, true);
    assert.strictEqual(req.user._id, "user_123");
    assert.strictEqual(req.user.email, "test@cksfinbot.com");
  });
});

