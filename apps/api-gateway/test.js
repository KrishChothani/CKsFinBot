/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";

process.env.NODE_ENV = "test";
const { app } = await import("./src/index.js");

describe("API Gateway Integration Tests", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("GET /health returns healthy status and active route maps", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "api-gateway");
    assert.ok(body.routesMapped > 0);
  });

  test("injects x-correlation-id in response headers if not provided", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const correlationId = res.headers.get("x-correlation-id");
    assert.ok(correlationId);
    assert.strictEqual(typeof correlationId, "string");
  });

  test("preserves existing x-correlation-id when passed by client", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { "x-correlation-id": "custom-trace-uuid-1234" },
    });
    const correlationId = res.headers.get("x-correlation-id");
    assert.strictEqual(correlationId, "custom-trace-uuid-1234");
  });

  test("unmapped non-api paths return 404 with standard envelope", async () => {
    const res = await fetch(`${baseUrl}/random-unmapped-path`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "ROUTE_NOT_FOUND");
  });
});

