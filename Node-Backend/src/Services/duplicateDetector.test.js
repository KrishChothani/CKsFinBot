/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateFileHash,
  normalizeInvoiceNumber,
} from "./duplicateDetector.service.js";

describe("Duplicate Detector — Idempotency & Normalization", () => {
  it("computes reproducible SHA-256 file hashes", () => {
    const buf1 = Buffer.from("Apex Steel Sample Invoice PDF Stream");
    const buf2 = Buffer.from("Apex Steel Sample Invoice PDF Stream");
    const buf3 = Buffer.from("Different Invoice Stream");

    const hash1 = calculateFileHash(buf1);
    const hash2 = calculateFileHash(buf2);
    const hash3 = calculateFileHash(buf3);

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
    assert.equal(hash1.length, 64);
  });

  it("normalizes Indian commercial invoice numbers to identical canonical strings", () => {
    // Leading zeroes, slashes, hyphens, spaces must collapse identically
    const canonical = normalizeInvoiceNumber("INV/2026-27/0042");
    assert.equal(canonical, "INV20262742");

    assert.equal(normalizeInvoiceNumber("inv-2026-27-42"), "INV20262742");
    assert.equal(normalizeInvoiceNumber("INV 2026 27 0042"), "INV20262742");
    assert.equal(normalizeInvoiceNumber("INV.2026.27.042"), "INV20262742");

    // Realistic vendor numbering variations
    assert.equal(normalizeInvoiceNumber("BFM/26/0412"), "BFM26412");
    assert.equal(normalizeInvoiceNumber("BFM-26-412"), "BFM26412");
    assert.equal(normalizeInvoiceNumber("TI/24-25/0009"), "TI24259");
    assert.equal(normalizeInvoiceNumber("EXP/OCT/001"), "EXPOCT1");
  });

  it("handles empty or malformed invoice numbers gracefully", () => {
    assert.equal(normalizeInvoiceNumber(""), "");
    assert.equal(normalizeInvoiceNumber(null), "");
    assert.equal(normalizeInvoiceNumber(undefined), "");
  });
});

