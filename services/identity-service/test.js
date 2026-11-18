/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const { identityService } = await import("./src/services/identity.service.js");
const { identityRelay } = await import("./src/services/identityRelay.service.js");
const {
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");

describe("Identity & Tenant Management Service", () => {
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
    await identityRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await identityRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "identity-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("generates and verifies JWT access tokens with embedded role and tenant claims", () => {
    const mockUser = {
      _id: "user-101",
      email: "ca.rajesh@sharmapartners.in",
      userName: "rajesh_ca",
      fullName: "CA Rajesh Sharma",
      firm: "firm-505",
      role: "CA",
      assignedClients: ["client-901", "client-902"],
    };

    const tokens = identityService.generateTokens(mockUser);
    assert.ok(tokens.accessToken, "Access token must be generated");
    assert.ok(tokens.refreshToken, "Refresh token must be generated");

    const decoded = identityService.verifyAccessToken(tokens.accessToken);
    assert.strictEqual(decoded._id, "user-101");
    assert.strictEqual(decoded.email, "ca.rajesh@sharmapartners.in");
    assert.strictEqual(decoded.role, "CA");
    assert.strictEqual(decoded.firm, "firm-505");
    assert.deepStrictEqual(decoded.assignedClients, ["client-901", "client-902"]);

    // Corrupted token must throw
    assert.throws(() => {
      identityService.verifyAccessToken(`${tokens.accessToken}invalid`);
    });
  });

  test("enforces bcrypt password hashing and verification", async () => {
    const rawPassword = "StrongSecurePassword@2026!";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    assert.notStrictEqual(rawPassword, hashedPassword);
    assert.ok(hashedPassword.startsWith("$2"), "Must be a valid bcrypt hash");

    const isMatch = await bcrypt.compare(rawPassword, hashedPassword);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await bcrypt.compare("WrongPassword123", hashedPassword);
    assert.strictEqual(isWrongMatch, false);
  });

  test("enforces strict multi-tenant boundary checks across firms and assigned clients", () => {
    const caUser = {
      _id: "user-ca-1",
      firm: "firm-alpha",
      role: "CA",
    };

    // 1. Same firm: Allowed
    const sameFirmCheck = identityService.validateTenantAccess(caUser, "firm-alpha");
    assert.strictEqual(sameFirmCheck.allowed, true);

    // 2. Cross-firm attempt: Denied
    const crossFirmCheck = identityService.validateTenantAccess(caUser, "firm-beta");
    assert.strictEqual(crossFirmCheck.allowed, false);
    assert.match(crossFirmCheck.reason, /Cross-tenant access rejected/);

    // 3. Missing firm ID: Denied
    const noFirmCheck = identityService.validateTenantAccess(caUser, null);
    assert.strictEqual(noFirmCheck.allowed, false);
    assert.match(noFirmCheck.reason, /Firm ID is required/);

    // 4. Client_User restricted to assigned client workspaces
    const clientUser = {
      _id: "user-sme-1",
      firm: "firm-alpha",
      role: "Client_User",
      assignedClients: ["client-approved-1", "client-approved-2"],
    };

    const allowedClient = identityService.validateTenantAccess(clientUser, "firm-alpha", "client-approved-1");
    assert.strictEqual(allowedClient.allowed, true);

    const disallowedClient = identityService.validateTenantAccess(clientUser, "firm-alpha", "client-unauthorized-99");
    assert.strictEqual(disallowedClient.allowed, false);
    assert.match(disallowedClient.reason, /not assigned to client workspace/);
  });

  test("relays identity events: publishes UserCreatedEvent and TenantCreatedEvent", async () => {
    let capturedUserCreated = null;
    let capturedFirmTenant = null;
    let capturedClientTenant = null;

    identityRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.USER_CREATED],
      (envelope) => {
        capturedUserCreated = envelope;
      }
    );
    identityRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.TENANT_CREATED],
      (envelope) => {
        if (envelope.payload.tenantType === "FIRM") {
          capturedFirmTenant = envelope;
        } else if (envelope.payload.tenantType === "CLIENT") {
          capturedClientTenant = envelope;
        }
      }
    );

    // 1. Publish Firm Tenant
    await identityRelay.publishTenantCreated({
      tenantType: "FIRM",
      tenantId: "firm-777",
      name: "Mehta & Associates CA",
      slug: "mehta-associates-ca",
    });

    // 2. Publish Client Tenant
    await identityRelay.publishTenantCreated({
      tenantType: "CLIENT",
      tenantId: "client-888",
      name: "Surat Diamond Traders Pvt Ltd",
      slug: "surat-diamond-traders",
      parentFirmId: "firm-777",
    });

    // 3. Publish User Created
    await identityRelay.publishUserCreated({
      userId: "user-333",
      email: "partner@mehtaca.in",
      userName: "kmehta",
      fullName: "CA Kalpesh Mehta",
      firmId: "firm-777",
      role: "Firm_Admin",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(capturedFirmTenant, "TenantCreatedEvent for firm must be emitted");
    assert.strictEqual(capturedFirmTenant.payload.tenantType, "FIRM");
    assert.strictEqual(capturedFirmTenant.payload.name, "Mehta & Associates CA");

    assert.ok(capturedClientTenant, "TenantCreatedEvent for client must be emitted");
    assert.strictEqual(capturedClientTenant.payload.tenantType, "CLIENT");
    assert.strictEqual(capturedClientTenant.payload.parentFirmId, "firm-777");

    assert.ok(capturedUserCreated, "UserCreatedEvent must be emitted");
    assert.strictEqual(capturedUserCreated.payload.email, "partner@mehtaca.in");
    assert.strictEqual(capturedUserCreated.payload.role, "Firm_Admin");
    assert.strictEqual(capturedUserCreated.tenant.firmId, "firm-777");
  });
});

