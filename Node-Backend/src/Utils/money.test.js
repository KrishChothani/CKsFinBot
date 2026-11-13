/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toPaise,
  toRupees,
  addPaise,
  subtractPaise,
  multiplyPaise,
  splitGstTax,
  formatPaiseToINR,
  RoundingMode,
} from "./money.js";

describe("Money Utility — Deterministic Integer Paise Engine", () => {
  it("converts rupee values to integer paise without float drift", () => {
    assert.equal(toPaise(100), 10000);
    assert.equal(toPaise(0.01), 1);
    assert.equal(toPaise("1,250.50"), 125050);
    assert.equal(toPaise("₹ 48,20,450.75"), 482045075);
    assert.equal(toPaise("-15.25"), -1525);
    assert.equal(toPaise(0), 0);
    assert.equal(toPaise(""), 0);
    assert.equal(toPaise(null), 0);
  });

  it("converts paise back to standard 2-decimal rupee string", () => {
    assert.equal(toRupees(125050), "1250.50");
    assert.equal(toRupees(1), "0.01");
    assert.equal(toRupees(0), "0.00");
    assert.equal(toRupees(-1525), "-15.25");
  });

  it("performs integer addition and subtraction without floating-point artifacts", () => {
    // Classic 0.1 + 0.2 != 0.3 float problem solved:
    const p1 = toPaise("0.10"); // 10 paise
    const p2 = toPaise("0.20"); // 20 paise
    const sum = addPaise(p1, p2);
    assert.equal(sum, 30);
    assert.equal(toRupees(sum), "0.30");

    const diff = subtractPaise(sum, p1);
    assert.equal(diff, 20);
  });

  it("calculates percentage in basis points with explicit rounding rules", () => {
    // 18% GST (1800 bps) on ₹1,000 (100000 paise) -> ₹180.00 (18000 paise)
    assert.equal(multiplyPaise(100000, 1800), 18000);

    // 18% GST on ₹123.45 (12345 paise) = 2222.1 paise -> 2222 paise (HALF_UP)
    assert.equal(multiplyPaise(12345, 1800, RoundingMode.HALF_UP), 2222);

    // 18% GST on ₹123.75 (12375 paise) = 2227.5 paise -> 2228 paise (HALF_UP)
    assert.equal(multiplyPaise(12375, 1800, RoundingMode.HALF_UP), 2228);

    // HALF_EVEN (Banker's rounding) on .5: rounds to nearest even
    // 2227.5 -> 2228 (even)
    assert.equal(multiplyPaise(12375, 1800, RoundingMode.HALF_EVEN), 2228);
  });

  it("guarantees conservation of paise during GST tax split (zero lost paise)", () => {
    // Test 1,000 odd and even paise values to verify conservation invariant:
    for (let paise = 1; paise <= 1000; paise++) {
      // Intra-state (CGST + SGST)
      const intra = splitGstTax(paise, 1800, false);
      assert.equal(
        intra.cgstPaise + intra.sgstPaise,
        intra.totalTaxPaise,
        `Conservation failed for paise=${paise} in intra-state`
      );
      assert.equal(intra.igstPaise, 0);

      // Inter-state (IGST)
      const inter = splitGstTax(paise, 1800, true);
      assert.equal(inter.cgstPaise, 0);
      assert.equal(inter.sgstPaise, 0);
      assert.equal(inter.igstPaise, inter.totalTaxPaise);
    }
  });

  it("formats integer paise into Indian numbering system representation", () => {
    assert.equal(formatPaiseToINR(125050), "₹1,250.50");
    assert.equal(formatPaiseToINR(10000000), "₹1,00,000.00"); // 1 Lakh
    assert.equal(formatPaiseToINR(1000000000), "₹1,00,00,000.00"); // 1 Crore
    assert.equal(formatPaiseToINR(482045075), "₹48,20,450.75");
    assert.equal(formatPaiseToINR(-482045075), "-₹48,20,450.75");
    assert.equal(formatPaiseToINR(0), "₹0.00");
  });
});

