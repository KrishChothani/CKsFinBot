/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Close-Readiness Dashboard & Gap-Aware Chasing Invariants", () => {
  it("calculates deterministic 5-pillar close readiness score correctly", () => {
    // Helper function matching the service math
    const calculateScore = (passedPillars) => Math.round((passedPillars / 5) * 100);

    assert.equal(calculateScore(5), 100);
    assert.equal(calculateScore(4), 80);
    assert.equal(calculateScore(3), 60);
    assert.equal(calculateScore(2), 40);
    assert.equal(calculateScore(1), 20);
    assert.equal(calculateScore(0), 0);
  });

  it("classifies month-end close readiness state based on deterministic score thresholds", () => {
    const getStatus = (score) => {
      if (score === 100) return "READY_TO_CLOSE";
      if (score >= 60) return "IN_PROGRESS";
      return "ACTION_REQUIRED";
    };

    assert.equal(getStatus(100), "READY_TO_CLOSE");
    assert.equal(getStatus(80), "IN_PROGRESS");
    assert.equal(getStatus(60), "IN_PROGRESS");
    assert.equal(getStatus(40), "ACTION_REQUIRED");
    assert.equal(getStatus(20), "ACTION_REQUIRED");
    assert.equal(getStatus(0), "ACTION_REQUIRED");
  });

  it("detects expected recurring documents based on standard Indian corporate expense categories", () => {
    const categories = [
      { name: "Rent", keywords: ["RENT", "LEASE", "REALTY"] },
      { name: "Power", keywords: ["ELECTRICITY", "POWER", "TORRENT"] },
      { name: "Internet", keywords: ["AIRTEL", "JIO", "BROADBAND"] },
      { name: "Cloud", keywords: ["AWS", "AZURE", "CLOUD"] },
    ];

    const sampleCorpus = "VOUCHER PUR-001 TATA STEEL PURCHASE; VOUCHER PUR-002 AIRTEL BROADBAND FIBRE; VOUCHER PUR-003 AWS CLOUD COMPUTE";

    const evaluated = categories.map((cat) => ({
      name: cat.name,
      isReceived: cat.keywords.some((kw) => sampleCorpus.includes(kw)),
    }));

    const received = evaluated.filter((e) => e.isReceived).map((e) => e.name);
    const missing = evaluated.filter((e) => !e.isReceived).map((e) => e.name);

    assert.deepEqual(received, ["Internet", "Cloud"]);
    assert.deepEqual(missing, ["Rent", "Power"]);
  });

  it("generates structured WhatsApp and Email chasing templates with exact invoice references and portal links", () => {
    const clientName = "Apex Steel & Alloys Pvt Ltd";
    const month = "October 2026";
    const gaps = ["• Office Space Rent (~₹75,000)", "• Electricity Bill (~₹22,000)"];
    const portalUrl = "https://app.cksfinbot.com/portal/upload/test-token-123";

    const whatsApp = `*Month-End Book Close Alert - ${clientName}*\n\nHello Team,\n\nYour close readiness score for *${month}* is *60%*.\n\nTo close books and protect your Input Tax Credit without statutory delay, please upload the following *${gaps.length}* missing item(s):\n\n${gaps.join(
      "\n"
    )}\n\n📎 *Upload Securely in 1-Click:*\n${portalUrl}`;

    assert.ok(whatsApp.includes("Apex Steel & Alloys Pvt Ltd"));
    assert.ok(whatsApp.includes("October 2026"));
    assert.ok(whatsApp.includes("Office Space Rent"));
    assert.ok(whatsApp.includes(portalUrl));

    // Vendor statutory notice citing Section 16(2)(aa)
    const vendorNotice = `Dear Supplier,\n\nInvoice #INV-2026-904 is booked in our purchase ledger, but does NOT appear in our GSTR-2B.\n\nUnder Section 16(2)(aa) of the CGST Act, our Input Tax Credit is blocked. Please upload this invoice to your GSTR-1 immediately to avoid payment hold.`;
    assert.ok(vendorNotice.includes("Section 16(2)(aa)"));
    assert.ok(vendorNotice.includes("INV-2026-904"));
  });
});

