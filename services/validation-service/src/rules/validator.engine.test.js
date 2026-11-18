/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDeterministicValidation } from "./validator.engine.js";
import { validateGstin, calculateGstinChecksum } from "../Utils/gstin.js";

describe("Deterministic Validation Engine — Pure Rule Invariants", () => {
  it("validates GSTIN checksum via ISO/IEC 7064 MOD 36-2 algorithm", () => {
    // Known valid test vectors matching exact MOD 36-2 checksums
    const v1 = validateGstin("24AAACA1234A1ZQ");
    assert.equal(v1.isValid, true);
    assert.equal(v1.isChecksumValid, true);
    assert.equal(v1.stateCode, "24");
    assert.equal(v1.stateName, "Gujarat");

    const v2 = validateGstin("27AABCZ5678B1Z4");
    assert.equal(v2.isValid, true);
    assert.equal(v2.isChecksumValid, true);
    assert.equal(v2.stateCode, "27");
    assert.equal(v2.stateName, "Maharashtra");

    // Checksum mismatch check ('Q' tampered with '5')
    const tampered = validateGstin("24AAACA1234A1Z5");
    assert.equal(tampered.isChecksumValid, false);
    assert.match(tampered.reason, /checksum mismatch/i);

    // Invalid length
    const shortGstin = validateGstin("24AAACA1234A1");
    assert.equal(shortGstin.isValid, false);
  });

  it("evaluates intra-state vs inter-state tax split correctly", () => {
    // Intra-state (Gujarat to Gujarat): Equal CGST + SGST required
    const intraInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1Z5" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
      },
      lineItems: [
        {
          taxableAmountPaise: 10000000,
          cgstPaise: 900000,
          sgstPaise: 900000,
          igstPaise: 0,
        },
      ],
      financialSummary: {
        subTotalPaise: 10000000,
        totalCgstPaise: 900000,
        totalSgstPaise: 900000,
        totalIgstPaise: 0,
        grandTotalPaise: 11800000,
      },
    };

    const results = runDeterministicValidation(intraInvoice, { clientStateCode: "24" });
    const posRule = results.find((r) => r.rule_id === "RULE-GST-PLACE-OF-SUPPLY-002");
    assert.equal(posRule.status, "pass");

    // Inter-state violation: Gujarat supplier to Maharashtra client, but CGST/SGST charged instead of IGST
    const invalidInterInvoice = {
      ...intraInvoice,
      invoiceDetails: { placeOfSupply: { normalizedValue: "27-Maharashtra" } },
    };

    const interResults = runDeterministicValidation(invalidInterInvoice, { clientStateCode: "27" });
    const interPosRule = interResults.find((r) => r.rule_id === "RULE-GST-PLACE-OF-SUPPLY-002");
    assert.equal(interPosRule.status, "fail");
    assert.match(interPosRule.reason, /Tax split violation/i);
  });

  it("detects arithmetic mismatches in integer paise", () => {
    const invalidMathInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1Z5" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
      },
      lineItems: [
        { taxableAmountPaise: 5000000, cgstPaise: 450000, sgstPaise: 450000 },
        { taxableAmountPaise: 5000000, cgstPaise: 450000, sgstPaise: 450000 },
      ], // Line items sum to 1,00,00,000 paise (₹1,00,000)
      financialSummary: {
        subTotalPaise: 8000000, // Extracted subtotal is ₹80,000 (mismatch of 20,000 paise)
        totalCgstPaise: 900000,
        totalSgstPaise: 900000,
        grandTotalPaise: 9800000,
      },
    };

    const results = runDeterministicValidation(invalidMathInvoice, { clientStateCode: "24" });
    const mathRule = results.find((r) => r.rule_id === "RULE-GST-ARITHMETIC-003");
    assert.equal(mathRule.status, "fail");
    assert.match(mathRule.reason, /Arithmetic mismatch/i);
  });

  it("flags Section 17(5) blocked credit candidate items for human review only", () => {
    const cateringInvoice = {
      counterParty: { supplierGstin: { normalizedValue: "24AAACA1234A1Z5" } },
      invoiceDetails: {
        placeOfSupply: { normalizedValue: "24-Gujarat" },
        invoiceDate: { normalizedValue: "2026-10-15" },
      },
      lineItems: [
        {
          description: { rawText: "Annual Corporate Dinner Catering Services" },
          taxableAmountPaise: 5000000,
          cgstPaise: 125000,
          sgstPaise: 125000,
        },
      ],
      financialSummary: {
        subTotalPaise: 5000000,
        totalCgstPaise: 125000,
        totalSgstPaise: 125000,
        grandTotalPaise: 5250000,
      },
    };

    const results = runDeterministicValidation(cateringInvoice, { clientStateCode: "24" });
    const blockedRule = results.find((r) => r.rule_id === "RULE-GST-BLOCKED-ITC-005");
    assert.equal(blockedRule.status, "warning");
    assert.match(blockedRule.reason, /Section 17\(5\)/i);
  });
});
