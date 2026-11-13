/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSyntheticReconciliationDataset } from "./syntheticGenerator.js";

describe("Synthetic Data Generator for ITC Reconciliation", () => {
  it("injects mathematically verified categories and verifies conservation of records", () => {
    const dataset = generateSyntheticReconciliationDataset({
      matchCount: 5,
      missingIn2bCount: 2,
      missingInBooksCount: 2,
      taxMismatchCount: 1,
    });

    assert.equal(dataset.purchaseRegister.length, 5 + 2 + 1); // 8 items in books
    assert.equal(dataset.gstr2bRecords.length, 5 + 2 + 1); // 8 items in 2B

    const matches = dataset.expectedOutcomes.filter((o) => o.expectedCategory === "MATCHED");
    const missing2B = dataset.expectedOutcomes.filter((o) => o.expectedCategory === "MISSING_IN_GSTR2B");
    const missingBooks = dataset.expectedOutcomes.filter((o) => o.expectedCategory === "MISSING_IN_BOOKS");
    const taxMismatch = dataset.expectedOutcomes.filter((o) => o.expectedCategory === "TAX_MISMATCH");

    assert.equal(matches.length, 5);
    assert.equal(missing2B.length, 2);
    assert.equal(missingBooks.length, 2);
    assert.equal(taxMismatch.length, 1);

    // Verify ITC at risk values are non-zero for missing in 2B and tax mismatch
    missing2B.forEach((m) => {
      assert.ok(m.itcAtRiskPaise > 0, "ITC at risk must be > 0 for Missing in GSTR-2B");
    });

    taxMismatch.forEach((m) => {
      assert.ok(m.itcAtRiskPaise > 0, "ITC at risk differential must be > 0 for tax rate mismatch");
    });
  });
});

