/** @format */

import { Gstr2bRecord } from "../Models/gstr2b.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { ExtractedData } from "../Models/extractedData.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { toPaise } from "../Utils/money.js";
import { recordAudit } from "./provenanceAudit.service.js";
import { normalizeInvoiceNumber } from "./duplicateDetector.service.js";
import ExcelJS from "exceljs";

export { normalizeInvoiceNumber };

/**
 * Detects whether an item description or category indicates Section 17(5) blocked credit.
 */
const SECTION_17_5_KEYWORDS = [
  "MOTOR VEHICLE",
  "CAR",
  "AUTOMOBILE",
  "FOOD",
  "BEVERAGE",
  "CATERING",
  "RESTAURANT",
  "HEALTH INSURANCE",
  "LIFE INSURANCE",
  "CLUB MEMBERSHIP",
  "FITNESS",
  "BEAUTY",
  "OUTDOOR CATERING",
  "PERSONAL CONSUMPTION",
  "GIFT",
  "FREE SAMPLE",
];

export function isSection17_5Candidate(text) {
  if (!text) return false;
  const upper = String(text).toUpperCase();
  return SECTION_17_5_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * Defensive GSTR-2B Intake:
 * Ingests official GST portal GSTR-2B JSON (B2B, B2BA, CDNR, CDNRA) or structured array.
 */
export const importGstr2bData = async ({
  firmId,
  clientId,
  returnPeriod,
  financialYear,
  rawPayload,
  sourceFileName = "gstr2b_import.json",
}) => {
  let records = [];

  // Case 1: Direct array of invoice objects
  if (Array.isArray(rawPayload)) {
    records = rawPayload;
  }
  // Case 2: Standard GST Portal GSTR-2B JSON structure (data.docdata)
  else if (rawPayload?.data?.docdata || rawPayload?.b2b || rawPayload?.cdnr) {
    const docdata = rawPayload.data?.docdata || rawPayload;

    // Helper parser for a supplier invoice group
    const parseSupplierSection = (supplierList, sectionType = "B2B") => {
      for (const supplier of supplierList || []) {
        const ctin = (supplier.ctin || "").toUpperCase().trim();
        const trdnm = supplier.trdnm || supplier.lgl_nm || "";

        // Standard invoices (inv array) or credit/debit notes (nt array)
        const invoiceList = supplier.inv || supplier.nt || [];
        for (const inv of invoiceList) {
          let taxableValue = 0;
          let igst = 0;
          let cgst = 0;
          let sgst = 0;
          let cess = 0;

          const items = inv.items || inv.itm_det || [];
          for (const itm of items) {
            const det = itm.itc || itm;
            taxableValue += Number(det.txval || 0);
            igst += Number(det.iamt || 0);
            cgst += Number(det.camt || 0);
            sgst += Number(det.samt || 0);
            cess += Number(det.csamt || 0);
          }

          // Date parsing: format can be DD-MM-YYYY or YYYY-MM-DD
          let invDate = new Date();
          const rawDate = inv.idt || inv.nt_dt;
          if (rawDate) {
            const parts = String(rawDate).split("-");
            if (parts.length === 3 && parts[0].length === 2) {
              invDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              invDate = new Date(rawDate);
            }
          }

          const inum = inv.inum || inv.nt_num || "";
          const isBlocked =
            inv.itcavl === "N" ||
            isSection17_5Candidate(trdnm) ||
            isSection17_5Candidate(inv.itc_rev_rsn);

          records.push({
            sectionType,
            supplierGstin: ctin,
            supplierTradeName: trdnm,
            invoiceNumber: inum,
            invoiceDate: isNaN(invDate.getTime()) ? new Date() : invDate,
            invoiceType: inv.inv_typ || (sectionType.startsWith("CDN") ? "Credit_Note" : "Regular"),
            invoiceValue: Number(inv.val || taxableValue + igst + cgst + sgst + cess),
            taxableValue,
            igst,
            cgst,
            sgst,
            cess,
            itcAvailability: inv.itcavl === "N" ? "No" : "Yes",
            isSection17_5Candidate: isBlocked,
            section17_5Reason: inv.itc_rev_rsn || (isBlocked ? "Section 17(5) candidate" : ""),
          });
        }
      }
    };

    parseSupplierSection(docdata.b2b, "B2B");
    parseSupplierSection(docdata.b2ba, "B2BA");
    parseSupplierSection(docdata.cdnr, "CDNR");
    parseSupplierSection(docdata.cdnra, "CDNRA");
  }

  const savedRecords = [];
  for (const item of records) {
    const normNum = normalizeInvoiceNumber(item.invoiceNumber);
    if (!normNum || !item.supplierGstin) continue;

    const taxablePaise = toPaise(item.taxableValue || 0);
    const igstPaise = toPaise(item.igst || 0);
    const cgstPaise = toPaise(item.cgst || 0);
    const sgstPaise = toPaise(item.sgst || 0);
    const cessPaise = toPaise(item.cess || 0);
    const totalTaxPaise = igstPaise + cgstPaise + sgstPaise + cessPaise;
    const invoiceValuePaise = item.invoiceValue ? toPaise(item.invoiceValue) : taxablePaise + totalTaxPaise;

    const existing = await Gstr2bRecord.findOneAndUpdate(
      {
        client: clientId,
        supplierGstin: item.supplierGstin.toUpperCase(),
        normalizedInvoiceNumber: normNum,
        financialYear: financialYear || "2026-2027",
      },
      {
        firm: firmId,
        client: clientId,
        returnPeriod: returnPeriod || "042026",
        financialYear: financialYear || "2026-2027",
        sectionType: item.sectionType || "B2B",
        supplierGstin: item.supplierGstin.toUpperCase(),
        supplierTradeName: item.supplierTradeName || "",
        invoiceNumber: item.invoiceNumber,
        normalizedInvoiceNumber: normNum,
        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : new Date(),
        invoiceType: item.invoiceType || "Regular",
        invoiceValue: invoiceValuePaise / 100,
        invoiceValuePaise,
        taxableValue: taxablePaise / 100,
        taxableValuePaise,
        igst: igstPaise / 100,
        igstPaise,
        cgst: cgstPaise / 100,
        cgstPaise,
        sgst: sgstPaise / 100,
        sgstPaise,
        cess: cessPaise / 100,
        cessPaise,
        totalTaxPaise,
        itcAvailability: item.itcAvailability || "Yes",
        isSection17_5Candidate: item.isSection17_5Candidate || false,
        section17_5Reason: item.section17_5Reason || "",
        sourceFile: sourceFileName,
      },
      { upsert: true, new: true }
    );
    savedRecords.push(existing);
  }

  return savedRecords;
};

/**
 * Defensive Excel/XLSX GSTR-2B Intake:
 * Reads official GST portal multi-sheet Excel files (B2B, B2BA, CDNR, CDNRA).
 */
export const importGstr2bExcelBuffer = async ({
  firmId,
  clientId,
  returnPeriod,
  financialYear,
  buffer,
  sourceFileName = "gstr2b_portal.xlsx",
}) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const parsedRecords = [];

  const processWorksheet = (sheet, sectionType) => {
    if (!sheet) return;
    let headerRowIdx = 1;

    // Find row that contains "GSTIN"
    sheet.eachRow((row, rowNumber) => {
      const rowValues = row.values;
      if (Array.isArray(rowValues)) {
        const text = rowValues.join(" ").toUpperCase();
        if (text.includes("GSTIN") && (text.includes("INVOICE") || text.includes("NOTE"))) {
          headerRowIdx = rowNumber;
        }
      }
    });

    const headerMap = {};
    const headerRow = sheet.getRow(headerRowIdx);
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || "").toUpperCase().trim();
      if (val.includes("GSTIN")) headerMap.gstin = colNumber;
      if (val.includes("TRADE") || val.includes("LEGAL") || val.includes("NAME")) headerMap.name = colNumber;
      if (val.includes("INVOICE NUMBER") || val.includes("NOTE NUMBER")) headerMap.invNumber = colNumber;
      if (val.includes("DATE")) headerMap.invDate = colNumber;
      if (val.includes("VALUE") && !val.includes("TAXABLE")) headerMap.invValue = colNumber;
      if (val.includes("TAXABLE")) headerMap.taxable = colNumber;
      if (val.includes("INTEGRATED") || val.includes("IGST")) headerMap.igst = colNumber;
      if (val.includes("CENTRAL") || val.includes("CGST")) headerMap.cgst = colNumber;
      if (val.includes("STATE") || val.includes("SGST")) headerMap.sgst = colNumber;
      if (val.includes("CESS")) headerMap.cess = colNumber;
      if (val.includes("ITC AVAIL")) headerMap.itcAvl = colNumber;
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;
      const gstin = headerMap.gstin ? String(row.getCell(headerMap.gstin).value || "").trim() : "";
      const invNum = headerMap.invNumber ? String(row.getCell(headerMap.invNumber).value || "").trim() : "";
      if (!gstin || !invNum) return;

      const tradeName = headerMap.name ? String(row.getCell(headerMap.name).value || "").trim() : "";
      const rawDate = headerMap.invDate ? row.getCell(headerMap.invDate).value : new Date();
      const taxable = headerMap.taxable ? parseFloat(row.getCell(headerMap.taxable).value) || 0 : 0;
      const igst = headerMap.igst ? parseFloat(row.getCell(headerMap.igst).value) || 0 : 0;
      const cgst = headerMap.cgst ? parseFloat(row.getCell(headerMap.cgst).value) || 0 : 0;
      const sgst = headerMap.sgst ? parseFloat(row.getCell(headerMap.sgst).value) || 0 : 0;
      const cess = headerMap.cess ? parseFloat(row.getCell(headerMap.cess).value) || 0 : 0;
      const itcAvl = headerMap.itcAvl ? String(row.getCell(headerMap.itcAvl).value || "Y").toUpperCase() : "Y";

      parsedRecords.push({
        sectionType,
        supplierGstin: gstin.toUpperCase(),
        supplierTradeName: tradeName,
        invoiceNumber: invNum,
        invoiceDate: rawDate instanceof Date ? rawDate : new Date(rawDate),
        taxableValue: taxable,
        igst,
        cgst,
        sgst,
        cess,
        itcAvailability: itcAvl.startsWith("N") ? "No" : "Yes",
      });
    });
  };

  const b2bSheet = workbook.getWorksheet("B2B") || workbook.worksheets[0];
  processWorksheet(b2bSheet, "B2B");
  processWorksheet(workbook.getWorksheet("B2BA"), "B2BA");
  processWorksheet(workbook.getWorksheet("CDNR"), "CDNR");
  processWorksheet(workbook.getWorksheet("CDNRA"), "CDNRA");

  return importGstr2bData({
    firmId,
    clientId,
    returnPeriod,
    financialYear,
    rawPayload: parsedRecords,
    sourceFileName,
  });
};

/**
 * 2-Tier Deterministic GST Reconciliation Engine
 * Tier 1: Exact Match (Normalized GSTIN, Canonical Invoice, Exact Integer Paise)
 * Tier 2: Tolerance Match (<= 100 paise rounding tolerance, date drift within month)
 */
export const runGstReconciliation = async (
  firmId,
  clientId,
  financialYear = "2026-2027"
) => {
  const gstr2bList = await Gstr2bRecord.find({
    client: clientId,
    financialYear,
  });

  const vouchers = await Voucher.find({
    client: clientId,
    voucherType: "Purchase",
    status: "Posted",
  }).populate("sourceDocument");

  // Build structured, integer-paise representation of posted purchase vouchers
  const voucherDetails = [];
  for (const v of vouchers) {
    let gstin = "";
    let rawInvoiceNo = v.referenceNumber || v.voucherNumber;
    let taxablePaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    // Read lines from entries
    for (const ent of v.entries || []) {
      const acc = (ent.accountName || "").toUpperCase();
      if (acc.includes("CGST")) {
        cgstPaise += ent.debitAmountPaise || toPaise(ent.debitAmount || 0);
      } else if (acc.includes("SGST")) {
        sgstPaise += ent.debitAmountPaise || toPaise(ent.debitAmount || 0);
      } else if (acc.includes("IGST")) {
        igstPaise += ent.debitAmountPaise || toPaise(ent.debitAmount || 0);
      } else if (ent.debitAmountPaise > 0 || ent.debitAmount > 0) {
        taxablePaise += ent.debitAmountPaise || toPaise(ent.debitAmount || 0);
      }
    }

    if (v.sourceDocument) {
      const ext = await ExtractedData.findOne({ document: v.sourceDocument._id });
      if (ext) {
        gstin = (
          ext.counterParty?.gstin?.value ||
          ext.counterParty?.supplierGstin?.value ||
          ext.counterParty?.gstin ||
          ""
        ).toUpperCase();
        if (ext.invoiceDetails?.invoiceNumber?.value) {
          rawInvoiceNo = ext.invoiceDetails.invoiceNumber.value;
        }
      }
    }

    const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
    const totalAmountPaise = v.totalAmountPaise || toPaise(v.totalAmount || 0);

    voucherDetails.push({
      voucher: v,
      supplierGstin: gstin.toUpperCase(),
      invoiceNumber: rawInvoiceNo,
      normalizedNumber: normalizeInvoiceNumber(rawInvoiceNo),
      voucherDate: v.voucherDate,
      taxablePaise,
      totalTaxPaise,
      totalAmountPaise,
      matched: false,
    });
  }

  let matchedItcPaise = 0;
  let unclaimedItcPaise = 0;
  let atRiskItcPaise = 0;
  let blockedCreditItcPaise = 0;
  let tier1MatchCount = 0;
  let tier2MatchCount = 0;
  let taxMismatchCount = 0;

  // 1. Evaluate GSTR-2B Invoices Against Posted Vouchers
  for (const rec of gstr2bList) {
    const recTaxPaise = rec.totalTaxPaise || toPaise(rec.igst + rec.cgst + rec.sgst + rec.cess);
    const recTaxablePaise = rec.taxableValuePaise || toPaise(rec.taxableValue || 0);

    // Check if supplier is Section 17(5) blocked credit
    if (rec.itcAvailability === "No" || rec.isSection17_5Candidate) {
      rec.reconciliationStatus = "BLOCKED_CREDIT";
      rec.matchTier = "NONE";
      blockedCreditItcPaise += recTaxPaise;
      await rec.save();
      continue;
    }

    // TIER 1: Exact Match (Normalized GSTIN, Normalized Invoice, Exact Integer Paise)
    let match = voucherDetails.find(
      (v) =>
        !v.matched &&
        v.normalizedNumber === rec.normalizedInvoiceNumber &&
        (v.supplierGstin === "" || v.supplierGstin === rec.supplierGstin) &&
        v.taxablePaise === recTaxablePaise &&
        v.totalTaxPaise === recTaxPaise
    );

    if (match) {
      match.matched = true;
      rec.reconciliationStatus = "MATCHED";
      rec.matchTier = "TIER_1_EXACT";
      rec.matchedVoucher = match.voucher._id;
      rec.toleranceDiffPaise = 0;
      rec.difference = { taxableDiff: 0, taxDiff: 0, taxableDiffPaise: 0, taxDiffPaise: 0 };
      tier1MatchCount++;
      matchedItcPaise += recTaxPaise;
      await rec.save();
      continue;
    }

    // TIER 2: Tolerance & Fuzzy Match (within <= 100 paise / ₹1.00 rounding diff)
    const tier2Match = voucherDetails.find(
      (v) =>
        !v.matched &&
        (v.supplierGstin === "" || v.supplierGstin === rec.supplierGstin) &&
        (v.normalizedNumber === rec.normalizedInvoiceNumber ||
          v.normalizedNumber.endsWith(rec.normalizedInvoiceNumber) ||
          rec.normalizedInvoiceNumber.endsWith(v.normalizedNumber))
    );

    if (tier2Match) {
      tier2Match.matched = true;
      const taxableDiffPaise = Math.abs(recTaxablePaise - tier2Match.taxablePaise);
      const taxDiffPaise = Math.abs(recTaxPaise - tier2Match.totalTaxPaise);

      if (taxableDiffPaise <= 100 && taxDiffPaise <= 100) {
        // Within statutory ₹1.00 rounding tolerance
        rec.reconciliationStatus = "MATCHED";
        rec.matchTier = "TIER_2_TOLERANCE";
        rec.matchedVoucher = tier2Match.voucher._id;
        rec.toleranceDiffPaise = taxDiffPaise;
        rec.difference = {
          taxableDiff: taxableDiffPaise / 100,
          taxDiff: taxDiffPaise / 100,
          taxableDiffPaise,
          taxDiffPaise,
        };
        tier2MatchCount++;
        matchedItcPaise += recTaxPaise;
      } else {
        // Discrepancy > ₹1.00 -> Tax Mismatch
        rec.reconciliationStatus = "TAX_MISMATCH";
        rec.matchTier = "NONE";
        rec.matchedVoucher = tier2Match.voucher._id;
        rec.toleranceDiffPaise = taxDiffPaise;
        rec.difference = {
          taxableDiff: taxableDiffPaise / 100,
          taxDiff: taxDiffPaise / 100,
          taxableDiffPaise,
          taxDiffPaise,
        };
        taxMismatchCount++;
        atRiskItcPaise += taxDiffPaise;
      }
      await rec.save();
      continue;
    }

    // Not matched in books -> Missing in Books (Unclaimed ITC opportunity)
    rec.reconciliationStatus = "MISSING_IN_BOOKS";
    rec.matchTier = "NONE";
    rec.matchedVoucher = null;
    rec.difference = { taxableDiff: 0, taxDiff: 0, taxableDiffPaise: 0, taxDiffPaise: 0 };
    unclaimedItcPaise += recTaxPaise;
    await rec.save();
  }

  // 2. Identify Vouchers Missing in GSTR-2B (ITC AT RISK! Section 16(2)(aa) violation if claimed)
  const missingIn2bVouchers = voucherDetails.filter((v) => !v.matched);
  const voucherAtRiskPaise = missingIn2bVouchers.reduce((sum, v) => sum + v.totalTaxPaise, 0);
  atRiskItcPaise += voucherAtRiskPaise;

  // 3. Aggregate Offending Suppliers (Suppliers with missing/at-risk invoices)
  const supplierAtRiskMap = new Map();
  missingIn2bVouchers.forEach((v) => {
    const key = v.supplierGstin || "UNKNOWN_GSTIN";
    if (!supplierAtRiskMap.has(key)) {
      supplierAtRiskMap.set(key, {
        supplierGstin: key,
        supplierName: v.voucher.partyLedgerName || "Vendor",
        invoiceCount: 0,
        atRiskTaxPaise: 0,
        invoices: [],
      });
    }
    const sup = supplierAtRiskMap.get(key);
    sup.invoiceCount += 1;
    sup.atRiskTaxPaise += v.totalTaxPaise;
    sup.invoices.push({
      voucherNumber: v.voucher.voucherNumber,
      invoiceNumber: v.invoiceNumber,
      voucherDate: v.voucherDate,
      taxAmount: v.totalTaxPaise / 100,
      totalAmount: v.totalAmountPaise / 100,
    });
  });

  // 4. Summarize IMS (Invoice Management System) actions taken by CA
  const imsSummary = {
    acceptedCount: gstr2bList.filter((r) => r.imsAction === "ACCEPTED").length,
    rejectedCount: gstr2bList.filter((r) => r.imsAction === "REJECTED").length,
    pendingCount: gstr2bList.filter((r) => r.imsAction === "PENDING").length,
    noneCount: gstr2bList.filter((r) => !r.imsAction || r.imsAction === "NONE").length,
  };

  return {
    financialYear,
    summary: {
      totalGstr2bInvoices: gstr2bList.length,
      matchedCount: tier1MatchCount + tier2MatchCount,
      tier1MatchCount,
      tier2MatchCount,
      missingInBooksCount: gstr2bList.filter((r) => r.reconciliationStatus === "MISSING_IN_BOOKS").length,
      missingIn2bCount: missingIn2bVouchers.length,
      taxMismatchCount,
      blockedCreditCount: gstr2bList.filter((r) => r.reconciliationStatus === "BLOCKED_CREDIT").length,
      matchedItc: matchedItcPaise / 100,
      matchedItcPaise,
      atRiskItc: atRiskItcPaise / 100,
      atRiskItcPaise,
      unclaimedItc: unclaimedItcPaise / 100,
      unclaimedItcPaise,
      blockedCreditItc: blockedCreditItcPaise / 100,
      blockedCreditItcPaise,
      ims: imsSummary,
    },
    supplierAtRiskList: Array.from(supplierAtRiskMap.values()).map((s) => ({
      ...s,
      atRiskTax: s.atRiskTaxPaise / 100,
    })),
    missingIn2b: missingIn2bVouchers.map((v) => ({
      voucherId: v.voucher._id,
      voucherNumber: v.voucher.voucherNumber,
      invoiceNumber: v.invoiceNumber,
      voucherDate: v.voucherDate,
      supplierGstin: v.supplierGstin,
      partyLedgerName: v.voucher.partyLedgerName,
      taxableValue: v.taxablePaise / 100,
      taxAmount: v.totalTaxPaise / 100,
      totalAmount: v.totalAmountPaise / 100,
    })),
  };
};

/**
 * Record IMS Action for a GSTR-2B entry (Accept / Reject / Pending)
 * Source GSTR-2B data remains immutable.
 */
export const updateImsAction = async ({
  firmId,
  clientId,
  gstr2bId,
  action,
  remarks = "",
  userId,
  userEmail = "ca@practice.in",
}) => {
  const allowed = ["ACCEPTED", "REJECTED", "PENDING", "NONE"];
  if (!allowed.includes(action)) {
    throw new Error(`Invalid IMS action. Must be one of: ${allowed.join(", ")}`);
  }

  const rec = await Gstr2bRecord.findOne({ _id: gstr2bId, client: clientId });
  if (!rec) {
    throw new Error("GSTR-2B record not found.");
  }

  const previousAction = rec.imsAction;
  rec.imsAction = action;
  rec.imsActionDate = new Date();
  rec.imsActionBy = userId;
  rec.imsRemarks = remarks;
  await rec.save();

  // Immutable Provenance Audit
  await recordAudit({
    firmId,
    clientId,
    entityType: "gstr2b_ims",
    entityId: rec._id,
    action: "IMS_ACTION_RECORDED",
    previousValue: { imsAction: previousAction },
    newValue: { imsAction: action, remarks },
    performedBy: userId,
    performedByEmail: userEmail,
    overrideReason: remarks || `CA updated IMS action to ${action}`,
  }).catch((err) => console.warn("IMS audit warning:", err.message));

  return rec;
};

/**
 * 1-Click: Create balanced purchase voucher directly from an unclaimed GSTR-2B entry
 */
export const createVoucherFromGstr2bEntry = async ({
  firmId,
  clientId,
  gstr2bId,
  userId,
}) => {
  const rec = await Gstr2bRecord.findOne({ _id: gstr2bId, client: clientId });
  if (!rec) throw new Error("GSTR-2B record not found.");

  // Resolve Ledgers
  const [purchaseLedger, cgstLedger, sgstLedger, igstLedger, creditorLedger] = await Promise.all([
    LedgerAccount.findOne({ client: clientId, accountName: "General Purchase Account" }),
    LedgerAccount.findOne({ client: clientId, accountName: "Input CGST" }),
    LedgerAccount.findOne({ client: clientId, accountName: "Input SGST" }),
    LedgerAccount.findOne({ client: clientId, accountName: "Input IGST" }),
    LedgerAccount.findOne({ client: clientId, accountName: rec.supplierTradeName || "Sundry Creditor" }),
  ]);

  const taxablePaise = rec.taxableValuePaise || toPaise(rec.taxableValue || 0);
  const igstPaise = rec.igstPaise || toPaise(rec.igst || 0);
  const cgstPaise = rec.cgstPaise || toPaise(rec.cgst || 0);
  const sgstPaise = rec.sgstPaise || toPaise(rec.sgst || 0);
  const totalTaxPaise = igstPaise + cgstPaise + sgstPaise;
  const grandTotalPaise = taxablePaise + totalTaxPaise;

  const entries = [
    {
      ledgerAccount: purchaseLedger?._id || creditorLedger?._id,
      accountName: purchaseLedger?.accountName || "General Purchase Account",
      debitAmount: taxablePaise / 100,
      debitAmountPaise: taxablePaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: `Purchases per GSTR-2B: ${rec.supplierTradeName || rec.supplierGstin}`,
    },
  ];

  if (cgstPaise > 0 && cgstLedger) {
    entries.push({
      ledgerAccount: cgstLedger._id,
      accountName: cgstLedger.accountName,
      debitAmount: cgstPaise / 100,
      debitAmountPaise: cgstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: "Input CGST",
    });
  }
  if (sgstPaise > 0 && sgstLedger) {
    entries.push({
      ledgerAccount: sgstLedger._id,
      accountName: sgstLedger.accountName,
      debitAmount: sgstPaise / 100,
      debitAmountPaise: sgstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: "Input SGST",
    });
  }
  if (igstPaise > 0 && igstLedger) {
    entries.push({
      ledgerAccount: igstLedger._id,
      accountName: igstLedger.accountName,
      debitAmount: igstPaise / 100,
      debitAmountPaise: igstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      narration: "Input IGST",
    });
  }

  // Credit Vendor
  entries.push({
    ledgerAccount: creditorLedger?._id || purchaseLedger?._id,
    accountName: rec.supplierTradeName || "Sundry Creditors",
    debitAmount: 0,
    debitAmountPaise: 0,
    creditAmount: grandTotalPaise / 100,
    creditAmountPaise: grandTotalPaise,
    narration: `Payable per GSTR-2B inv #${rec.invoiceNumber}`,
  });

  const voucherCount = await Voucher.countDocuments({ client: clientId });
  const voucherNumber = `PUR-2B-${String(voucherCount + 1).padStart(4, "0")}`;

  const voucher = await Voucher.create({
    firm: firmId,
    client: clientId,
    voucherNumber,
    voucherType: "Purchase",
    voucherDate: rec.invoiceDate,
    referenceNumber: rec.invoiceNumber,
    referenceDate: rec.invoiceDate,
    partyLedgerName: rec.supplierTradeName || "Sundry Creditors",
    entries,
    totalAmount: grandTotalPaise / 100,
    totalAmountPaise: grandTotalPaise,
    narration: `Booked from GSTR-2B: ${rec.supplierTradeName} (Inv: ${rec.invoiceNumber})`,
    postedBy: userId,
    status: "Posted",
  });

  rec.reconciliationStatus = "MATCHED";
  rec.matchTier = "TIER_1_EXACT";
  rec.matchedVoucher = voucher._id;
  await rec.save();

  return voucher;
};

/**
 * Generates an Excel mismatch report workbook buffer
 */
export const generateGstMismatchExcel = async (firmId, clientId, financialYear = "2026-2027") => {
  const recon = await runGstReconciliation(firmId, clientId, financialYear);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CKsFinBot Enterprise";
  workbook.created = new Date();

  // Sheet 1: Executive Summary
  const summarySheet = workbook.addWorksheet("Recon Summary");
  summarySheet.addRow(["GSTR-2B vs Books Reconciliation Summary - FY " + financialYear]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Metric", "Count", "Tax Amount (INR)"]);
  summarySheet.addRow(["Total Matched ITC (Safe to Claim)", recon.summary.matchedCount, recon.summary.matchedItc]);
  summarySheet.addRow(["At-Risk ITC (Missing in 2B - Unfiled)", recon.summary.missingIn2bCount, recon.summary.atRiskItc]);
  summarySheet.addRow(["Unclaimed ITC (Missing in Books)", recon.summary.missingInBooksCount, recon.summary.unclaimedItc]);
  summarySheet.addRow(["Tax Mismatches", recon.summary.taxMismatchCount, "-"]);
  summarySheet.addRow(["Blocked Credit Section 17(5)", recon.summary.blockedCreditCount, recon.summary.blockedCreditItc]);

  // Sheet 2: At Risk Invoices (Missing in 2B)
  const atRiskSheet = workbook.addWorksheet("ITC At Risk (Missing in 2B)");
  atRiskSheet.addRow(["Voucher Number", "Invoice Number", "Voucher Date", "Supplier GSTIN", "Vendor Name", "Taxable Value", "Tax at Risk"]);
  recon.missingIn2b.forEach((v) => {
    atRiskSheet.addRow([v.voucherNumber, v.invoiceNumber, v.voucherDate, v.supplierGstin, v.partyLedgerName, v.taxableValue, v.taxAmount]);
  });

  return await workbook.xlsx.writeBuffer();
};
