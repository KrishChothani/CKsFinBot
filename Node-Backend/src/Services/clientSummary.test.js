/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSummaryDigitalHash,
  formulateCompletenessBanner,
} from "./clientSummary.service.js";

describe("Deterministic Client Summary & Practice Branding Invariants", () => {
  it("generates deterministic, repeatable SHA-256 digital hash of metrics", () => {
    const metrics = {
      totalRevenuePaise: 125000000, // ₹12,50,000.00
      totalDirectExpensesPaise: 82000000, // ₹8,20,000.00
      totalOperatingExpensesPaise: 15000000, // ₹1,50,000.00
      grossProfitPaise: 43000000,
      netOperatingPositionPaise: 28000000,
      outputGstPaise: 22500000,
      eligibleItcPaise: 14760000,
      ineligibleItcPaise: 500000,
      itcAtRiskPaise: 240000,
      netGstPayablePaise: 7740000,
      closingBankBalancePaise: 45000000,
      unreconciledBankAmountPaise: 0,
    };

    const hash1 = computeSummaryDigitalHash(metrics, "2024-10", "27AABCU9603R1ZX");
    const hash2 = computeSummaryDigitalHash(metrics, "2024-10", "27AABCU9603R1ZX");

    assert.equal(typeof hash1, "string");
    assert.equal(hash1.length, 64); // SHA-256 hex length
    assert.equal(hash1, hash2, "Digital hash must be 100% deterministic and reproducible");

    // Altering a single paise must change the hash completely
    const alteredMetrics = { ...metrics, totalRevenuePaise: 125000001 };
    const alteredHash = computeSummaryDigitalHash(alteredMetrics, "2024-10", "27AABCU9603R1ZX");
    assert.notEqual(hash1, alteredHash, "Tampering with a single paise must alter digital signature");
  });

  it("enforces mandatory PROVISIONAL banner if close-readiness is < 100%", () => {
    const incompleteReport = {
      score: 65,
      status: "ACTION_REQUIRED",
      pillars: [
        {
          id: "PILLAR_INBOX",
          title: "Document Inbox & Extraction Review",
          status: "FAIL",
          details: "3 document(s) pending human review",
          count: 3,
        },
        {
          id: "PILLAR_GSTR2B",
          title: "GSTR-2B Matching & ITC Safety",
          status: "FAIL",
          details: "2 invoice(s) missing in GSTR-2B",
          count: 2,
        },
        {
          id: "PILLAR_BANK",
          title: "Bank Statement Reconciliation (BRS)",
          status: "PASS",
          details: "All bank transactions matched",
          count: 0,
        },
      ],
    };

    const bannerInfo = formulateCompletenessBanner(incompleteReport);

    assert.equal(bannerInfo.isComplete, false);
    assert.equal(bannerInfo.closeReadinessScore, 65);
    assert.equal(bannerInfo.openGaps.length, 2);
    assert.match(
      bannerInfo.bannerMessage,
      /PROVISIONAL & UNVERIFIED SUMMARY/,
      "Banner must strictly emphasize PROVISIONAL status"
    );
    assert.match(
      bannerInfo.bannerMessage,
      /must not be relied upon for final tax filing/,
      "Banner must warn against relying on incomplete books"
    );
  });

  it("produces clean RECONCILIATION COMPLETE banner only when 100% score with 0 open gaps", () => {
    const perfectReport = {
      score: 100,
      status: "READY_TO_CLOSE",
      pillars: [
        { id: "P1", title: "Inbox", status: "PASS", details: "All cleared", count: 0 },
        { id: "P2", title: "Bank BRS", status: "PASS", details: "Reconciled", count: 0 },
        { id: "P3", title: "GSTR-2B", status: "PASS", details: "Matched", count: 0 },
        { id: "P4", title: "Recurring", status: "PASS", details: "All received", count: 0 },
        { id: "P5", title: "Workflow", status: "PASS", details: "Approved", count: 0 },
      ],
    };

    const bannerInfo = formulateCompletenessBanner(perfectReport);

    assert.equal(bannerInfo.isComplete, true);
    assert.equal(bannerInfo.closeReadinessScore, 100);
    assert.equal(bannerInfo.openGaps.length, 0);
    assert.match(bannerInfo.bannerMessage, /RECONCILIATION COMPLETE/);
  });

  it("canonical digital hash is invariant to metric property insertion order", () => {
    const metricsA = {
      totalRevenuePaise: 5000000,
      totalDirectExpensesPaise: 3000000,
      grossProfitPaise: 2000000,
      outputGstPaise: 900000,
      eligibleItcPaise: 540000,
    };

    // Construct metricsB with inverse key ordering
    const metricsB = {
      eligibleItcPaise: 540000,
      outputGstPaise: 900000,
      grossProfitPaise: 2000000,
      totalDirectExpensesPaise: 3000000,
      totalRevenuePaise: 5000000,
    };

    const hashA = computeSummaryDigitalHash(metricsA, "Q3-2024", "27AABCU9603R1ZX");
    const hashB = computeSummaryDigitalHash(metricsB, "Q3-2024", "27AABCU9603R1ZX");

    assert.equal(hashA, hashB, "Hash must be immune to JSON object property ordering");
  });
});
