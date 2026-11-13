/** @format */

import { splitGstTax, toPaise } from "../Utils/money.js";

/**
 * Synthetic Data Generator for Evaluation Harness & Unit Testing.
 * Generates paired Purchase Registers and GSTR-2B datasets with mathematically injected,
 * ground-truth verified mismatches:
 * 1. MATCHED: Clean exact match.
 * 2. MISSING_IN_GSTR2B: Document in purchase register, but supplier did not file GSTR-1. (ITC at risk).
 * 3. MISSING_IN_BOOKS: Appears in GSTR-2B, but recipient forgot to enter in books.
 * 4. TAX_MISMATCH: Same invoice number, but tax rate or amount differs between supplier and books.
 */
export function generateSyntheticReconciliationDataset({
  matchCount = 10,
  missingIn2bCount = 3,
  missingInBooksCount = 2,
  taxMismatchCount = 2,
  clientGstin = "24AAACA1234A1Z5",
  clientStateCode = "24",
} = {}) {
  const purchaseRegister = [];
  const gstr2bRecords = [];
  const expectedOutcomes = [];

  let invIndex = 1001;

  // 1. Clean Matches
  for (let i = 0; i < matchCount; i++) {
    const invNo = `INV-2026-${invIndex++}`;
    const supplierGstin = "24BBBCA9876K1Z9";
    const date = "2026-10-15";
    const taxablePaise = 10000000 + i * 500000; // ₹1,00,000 +
    const tax = splitGstTax(taxablePaise, 1800, false);
    const grandTotalPaise = taxablePaise + tax.totalTaxPaise;

    const prItem = {
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: 0,
      totalTaxPaise: tax.totalTaxPaise,
      grandTotalPaise,
    };

    const gstrItem = {
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: 0,
      totalTaxPaise: tax.totalTaxPaise,
      grandTotalPaise,
      itcAvailability: "Y",
    };

    purchaseRegister.push(prItem);
    gstr2bRecords.push(gstrItem);
    expectedOutcomes.push({
      invoiceNumber: invNo,
      supplierGstin,
      expectedCategory: "MATCHED",
      itcAtRiskPaise: 0,
    });
  }

  // 2. Missing in GSTR-2B (ITC At Risk!)
  for (let i = 0; i < missingIn2bCount; i++) {
    const invNo = `INV-2026-MISSING2B-${invIndex++}`;
    const supplierGstin = "27AABCZ5678B1Z2";
    const date = "2026-10-18";
    const taxablePaise = 5000000 + i * 250000;
    const tax = splitGstTax(taxablePaise, 1800, true); // Inter-state IGST
    const grandTotalPaise = taxablePaise + tax.totalTaxPaise;

    const prItem = {
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: tax.igstPaise,
      totalTaxPaise: tax.totalTaxPaise,
      grandTotalPaise,
    };

    purchaseRegister.push(prItem);
    // Notice: NOT added to gstr2bRecords!
    expectedOutcomes.push({
      invoiceNumber: invNo,
      supplierGstin,
      expectedCategory: "MISSING_IN_GSTR2B",
      itcAtRiskPaise: tax.totalTaxPaise, // Full tax is at risk
    });
  }

  // 3. Missing in Books (In GSTR-2B, but recipient hasn't booked)
  for (let i = 0; i < missingInBooksCount; i++) {
    const invNo = `INV-2026-MISSINGBOOKS-${invIndex++}`;
    const supplierGstin = "29AABCN9012C1Z8";
    const date = "2026-10-20";
    const taxablePaise = 7500000;
    const tax = splitGstTax(taxablePaise, 1800, true);
    const grandTotalPaise = taxablePaise + tax.totalTaxPaise;

    const gstrItem = {
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: tax.igstPaise,
      totalTaxPaise: tax.totalTaxPaise,
      grandTotalPaise,
      itcAvailability: "Y",
    };

    gstr2bRecords.push(gstrItem);
    // Notice: NOT in purchaseRegister!
    expectedOutcomes.push({
      invoiceNumber: invNo,
      supplierGstin,
      expectedCategory: "MISSING_IN_BOOKS",
      itcAtRiskPaise: 0,
    });
  }

  // 4. Tax Rate Mismatch (Books booked at 18%, but supplier filed at 12%)
  for (let i = 0; i < taxMismatchCount; i++) {
    const invNo = `INV-2026-TAXMISS-${invIndex++}`;
    const supplierGstin = "24AAACT4412M1ZG";
    const date = "2026-10-22";
    const taxablePaise = 10000000; // ₹1,00,000

    // Books recorded 18%
    const booksTax = splitGstTax(taxablePaise, 1800, false);
    // Supplier filed 12%
    const gstrTax = splitGstTax(taxablePaise, 1200, false);

    purchaseRegister.push({
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: booksTax.cgstPaise,
      sgstPaise: booksTax.sgstPaise,
      igstPaise: 0,
      totalTaxPaise: booksTax.totalTaxPaise,
      grandTotalPaise: taxablePaise + booksTax.totalTaxPaise,
    });

    gstr2bRecords.push({
      invoiceNumber: invNo,
      supplierGstin,
      invoiceDate: date,
      taxableAmountPaise: taxablePaise,
      cgstPaise: gstrTax.cgstPaise,
      sgstPaise: gstrTax.sgstPaise,
      igstPaise: 0,
      totalTaxPaise: gstrTax.totalTaxPaise,
      grandTotalPaise: taxablePaise + gstrTax.totalTaxPaise,
      itcAvailability: "Y",
    });

    expectedOutcomes.push({
      invoiceNumber: invNo,
      supplierGstin,
      expectedCategory: "TAX_MISMATCH",
      itcAtRiskPaise: booksTax.totalTaxPaise - gstrTax.totalTaxPaise, // Differential tax at risk
    });
  }

  return {
    purchaseRegister,
    gstr2bRecords,
    expectedOutcomes,
  };
}

export default {
  generateSyntheticReconciliationDataset,
};

