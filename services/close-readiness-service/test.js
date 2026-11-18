/** @format */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.EVENT_BUS_MODE = "memory";

const { app } = await import("./src/index.js");
const {
  calculate5PillarScore,
  generateChasingTemplates,
} = await import("./src/services/closeReadiness.service.js");
const {
  computeSummaryDigitalHash,
  generateDeterministicDigitalHash,
  formulateCompletenessBanner,
} = await import("./src/services/clientSummary.service.js");
const { closeRelay } = await import("./src/services/closeRelay.service.js");
const {
  EVENT_TYPES,
  ROUTING_KEYS,
} = await import("@cksfinbot/event-contracts");

describe("Month-End Close Readiness & Chasing Service", () => {
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
    await closeRelay.init();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeRelay.close();
  });

  test("GET /health returns healthy status and service version", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "HEALTHY");
    assert.strictEqual(body.service, "close-readiness-service");
    assert.strictEqual(body.version, "2.0.0");
  });

  test("calculates deterministic 5-pillar close readiness score (0%, 60%, 100%)", () => {
    // 1. All clean: 100% Ready to Close
    const perfectScore = calculate5PillarScore({
      unreviewedDocsCount: 0,
      unreconciledBankTxCount: 0,
      atRiskItcCount: 0,
      missingRecurringCount: 0,
      pendingVouchersCount: 0,
    });
    assert.strictEqual(perfectScore.score, 100);
    assert.strictEqual(perfectScore.readinessStatus, "READY_TO_CLOSE");
    assert.strictEqual(perfectScore.blockers.length, 0);

    // 2. 2 blockers: 60% In Progress
    const partialScore = calculate5PillarScore({
      unreviewedDocsCount: 4,
      unreconciledBankTxCount: 0,
      atRiskItcCount: 2,
      missingRecurringCount: 0,
      pendingVouchersCount: 0,
    });
    assert.strictEqual(partialScore.score, 60);
    assert.strictEqual(partialScore.readinessStatus, "IN_PROGRESS");
    assert.strictEqual(partialScore.blockers.length, 2);

    // 3. All failed: 0% Action Required
    const zeroScore = calculate5PillarScore({
      unreviewedDocsCount: 1,
      unreconciledBankTxCount: 1,
      atRiskItcCount: 1,
      missingRecurringCount: 1,
      pendingVouchersCount: 1,
    });
    assert.strictEqual(zeroScore.score, 0);
    assert.strictEqual(zeroScore.readinessStatus, "ACTION_REQUIRED");
    assert.strictEqual(zeroScore.blockers.length, 5);
  });

  test("enforces mandatory PROVISIONAL banner when close-readiness is < 100%", () => {
    const incompleteReport = {
      score: 80,
      pillars: [
        { id: "P1", title: "Inbox", status: "PASS", count: 0 },
        { id: "P2", title: "Bank BRS", status: "PASS", count: 0 },
        { id: "P3", title: "GSTR-2B", status: "PASS", count: 0 },
        { id: "P4", title: "Recurring", status: "FAIL", blocker: "Rent missing", count: 1 },
        { id: "P5", title: "Workflow", status: "PASS", count: 0 },
      ],
    };

    const bannerInfo = formulateCompletenessBanner(incompleteReport);
    assert.strictEqual(bannerInfo.isComplete, false);
    assert.strictEqual(bannerInfo.closeReadinessScore, 80);
    assert.strictEqual(bannerInfo.openGaps.length, 1);
    assert.match(bannerInfo.bannerMessage, /PROVISIONAL & UNVERIFIED SUMMARY/);
    assert.match(bannerInfo.bannerMessage, /Books are NOT closed/);
  });

  test("produces clean RECONCILIATION COMPLETE banner only when 100% score with 0 open gaps", () => {
    const perfectReport = {
      score: 100,
      pillars: [
        { id: "P1", title: "Inbox", status: "PASS", count: 0 },
        { id: "P2", title: "Bank BRS", status: "PASS", count: 0 },
        { id: "P3", title: "GSTR-2B", status: "PASS", count: 0 },
        { id: "P4", title: "Recurring", status: "PASS", count: 0 },
        { id: "P5", title: "Workflow", status: "PASS", count: 0 },
      ],
    };

    const bannerInfo = formulateCompletenessBanner(perfectReport);
    assert.strictEqual(bannerInfo.isComplete, true);
    assert.strictEqual(bannerInfo.closeReadinessScore, 100);
    assert.strictEqual(bannerInfo.openGaps.length, 0);
    assert.match(bannerInfo.bannerMessage, /RECONCILIATION COMPLETE/);
  });

  test("generates deterministic SHA-256 digital hash invariant to object key ordering", () => {
    const metricsA = {
      totalRevenuePaise: 50000000,
      grossProfitPaise: 20000000,
      totalDirectExpensesPaise: 30000000,
    };
    const metricsB = {
      totalDirectExpensesPaise: 30000000,
      totalRevenuePaise: 50000000,
      grossProfitPaise: 20000000,
    };

    const hashA = computeSummaryDigitalHash(metricsA, "2026-10", "27AABCU9603R1ZX");
    const hashB = computeSummaryDigitalHash(metricsB, "2026-10", "27AABCU9603R1ZX");

    assert.strictEqual(hashA.length, 64);
    assert.strictEqual(hashA, hashB, "Hash must be identical regardless of key order");

    // 1 paise mutation must change hash completely
    const mutated = { ...metricsA, totalRevenuePaise: 50000001 };
    const hashMutated = computeSummaryDigitalHash(mutated, "2026-10", "27AABCU9603R1ZX");
    assert.notStrictEqual(hashA, hashMutated, "1 paise mutation must alter digital hash");
  });

  test("generates WhatsApp and Email chasing templates with secure portal link", () => {
    const templates = generateChasingTemplates({
      clientName: "Acme Industrial Supplies",
      missingItems: ["Office Space Rent Invoice", "Electricity Bill - BESCOM"],
      portalUrl: "https://portal.cksfinbot.in/upload?token=xyz",
    });

    assert.ok(templates.whatsappMessage.includes("Acme Industrial Supplies"));
    assert.ok(templates.whatsappMessage.includes("Office Space Rent Invoice"));
    assert.ok(templates.whatsappMessage.includes("https://portal.cksfinbot.in/upload?token=xyz"));

    assert.ok(templates.emailSubject.includes("Acme Industrial Supplies"));
    assert.ok(templates.emailBody.includes("BESCOM"));
  });

  test("relays events: publishes CloseReadinessUpdatedEvent and MissingDocumentDetectedEvent", async () => {
    let capturedUpdated = null;
    let capturedMissing = null;

    closeRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.CLOSE_READINESS_UPDATED],
      (envelope) => {
        capturedUpdated = envelope;
      }
    );
    closeRelay.eventBus.memoryEmitter.on(
      ROUTING_KEYS[EVENT_TYPES.MISSING_DOCUMENT_DETECTED],
      (envelope) => {
        capturedMissing = envelope;
      }
    );

    const report = calculate5PillarScore({
      unreviewedDocsCount: 2,
      unreconciledBankTxCount: 0,
      atRiskItcCount: 0,
      missingRecurringCount: 1,
      pendingVouchersCount: 0,
    });

    await closeRelay.publishCloseReadinessUpdated({
      firmId: "firm-cr-101",
      clientId: "client-cr-202",
      readinessReport: report,
    });

    await closeRelay.publishMissingDocumentDetected({
      firmId: "firm-cr-101",
      clientId: "client-cr-202",
      missingItem: {
        category: "Office_Rent",
        label: "Office Space Rent",
        expectedAmount: 75000,
        expectedDayOfMonth: 5,
      },
      reason: "Rent voucher missing for October 2026",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(capturedUpdated, "CloseReadinessUpdatedEvent must be emitted");
    assert.strictEqual(capturedUpdated.payload.score, 60);
    assert.strictEqual(capturedUpdated.tenant.firmId, "firm-cr-101");

    assert.ok(capturedMissing, "MissingDocumentDetectedEvent must be emitted");
    assert.strictEqual(capturedMissing.payload.category, "Office_Rent");
    assert.strictEqual(capturedMissing.payload.expectedAmount, 75000);
  });
});
