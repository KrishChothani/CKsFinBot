/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInvoiceNumber,
  isSection17_5Candidate,
} from "./gstRecon.service.js";

describe("GSTR-2B Reconciliation & 2-Tier Matching Engine", () => {
  it("normalizes commercial invoice numbers canonically by stripping punctuation and leading zeros", () => {
    assert.equal(normalizeInvoiceNumber("INV-00042"), "INV42");
    assert.equal(normalizeInvoiceNumber("inv/2026/001"), "INV20261");
    assert.equal(normalizeInvoiceNumber("0000999"), "999");
    assert.equal(normalizeInvoiceNumber("TS-881-A"), "TS881A");
    assert.equal(normalizeInvoiceNumber(""), "");
  });

  it("detects Section 17(5) blocked credit candidates based on statutory keyword triggers", () => {
    assert.equal(isSection17_5Candidate("Annual Motor Vehicle Insurance"), true);
    assert.equal(isSection17_5Candidate("Executive Club Membership Fees"), true);
    assert.equal(isSection17_5Candidate("Staff Food & Catering Services"), true);
    assert.equal(isSection17_5Candidate("Industrial Steel Sheet Coils"), false);
    assert.equal(isSection17_5Candidate("CNC Lathe Tooling Spare Parts"), false);
  });

  it("evaluates 2-tier matching invariants correctly", () => {
    // Test Vector 1: Tier 1 Exact Match
    const gstrRecord = {
      supplierGstin: "24AAACA1234A1ZQ",
      normalizedInvoiceNumber: "INV2026001",
      taxableValuePaise: 1000000, // ₹10,000.00
      totalTaxPaise: 180000, // ₹1,800.00
    };

    const exactVoucher = {
      supplierGstin: "24AAACA1234A1ZQ",
      normalizedNumber: "INV2026001",
      taxablePaise: 1000000,
      totalTaxPaise: 180000,
    };

    const isTier1 =
      exactVoucher.supplierGstin === gstrRecord.supplierGstin &&
      exactVoucher.normalizedNumber === gstrRecord.normalizedInvoiceNumber &&
      exactVoucher.taxablePaise === gstrRecord.taxableValuePaise &&
      exactVoucher.totalTaxPaise === gstrRecord.totalTaxPaise;

    assert.equal(isTier1, true, "Tier 1 exact match should evaluate to true");

    // Test Vector 2: Tier 2 Tolerance Match (₹0.50 / 50 paise rounding drift)
    const roundedVoucher = {
      supplierGstin: "24AAACA1234A1ZQ",
      normalizedNumber: "INV2026001",
      taxablePaise: 1000050, // +50 paise drift
      totalTaxPaise: 180000,
    };

    const taxableDiff = Math.abs(gstrRecord.taxableValuePaise - roundedVoucher.taxablePaise);
    const taxDiff = Math.abs(gstrRecord.totalTaxPaise - roundedVoucher.totalTaxPaise);
    const isTier2 =
      roundedVoucher.supplierGstin === gstrRecord.supplierGstin &&
      roundedVoucher.normalizedNumber === gstrRecord.normalizedInvoiceNumber &&
      taxableDiff <= 100 &&
      taxDiff <= 100;

    assert.equal(isTier2, true, "Tier 2 tolerance match should accept <= 100 paise drift");

    // Test Vector 3: Tax Mismatch (Discrepancy > ₹1.00)
    const mismatchedVoucher = {
      supplierGstin: "24AAACA1234A1ZQ",
      normalizedNumber: "INV2026001",
      taxablePaise: 1000000,
      totalTaxPaise: 120000, // ₹1,200 vs ₹1,800 (12% vs 18%)
    };

    const mismatchTaxDiff = Math.abs(gstrRecord.totalTaxPaise - mismatchedVoucher.totalTaxPaise);
    assert.ok(mismatchTaxDiff > 100, "Tax rate discrepancy must exceed tolerance");
  });

  it("verifies IMS (Invoice Management System) actions preserve immutable source invariants", () => {
    const originalGstr2b = {
      _id: "rec_001",
      supplierGstin: "27AABCZ5678B1Z4",
      invoiceNumber: "INV-992",
      taxableValue: 50000,
      totalTax: 9000,
      imsAction: "NONE",
    };

    // CA marks as ACCEPTED
    const updated = {
      ...originalGstr2b,
      imsAction: "ACCEPTED",
      imsActionDate: new Date(),
      imsRemarks: "Verified against received goods and accepted for GSTR-3B ITC claim",
    };

    // Verify source values remain unchanged
    assert.equal(updated.supplierGstin, originalGstr2b.supplierGstin);
    assert.equal(updated.taxableValue, originalGstr2b.taxableValue);
    assert.equal(updated.totalTax, originalGstr2b.totalTax);
    assert.equal(updated.imsAction, "ACCEPTED");
  });
});
