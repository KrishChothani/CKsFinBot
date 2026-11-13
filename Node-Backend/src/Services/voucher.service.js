/** @format */

import { Voucher } from "../Models/voucher.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { Document } from "../Models/document.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { toPaise } from "../Utils/money.js";
import { runDeterministicValidation } from "../Rules/validator.engine.js";
import { recordAudit } from "./provenanceAudit.service.js";
import { query as pgQuery, withTransaction as pgWithTransaction, checkPostgresConnection } from "../PostgreSQL/db.js";
import { ApiError } from "../Utils/ApiError.js";

/**
 * Calculates Section 43B(h) statutory due date under the MSMED Act, 2006.
 * Micro & Small suppliers have a statutory limit:
 * - 15 days if no written agreement exists
 * - Max 45 days if written agreement exists
 */
export function calculateMsmeDueDate(invoiceDateInput, vendorLedger) {
  const invoiceDate = invoiceDateInput ? new Date(invoiceDateInput) : new Date();
  const category = vendorLedger?.msmeCategory || "None";
  const isMicroOrSmall = category === "Micro" || category === "Small";

  if (!isMicroOrSmall) {
    const defaultDays = vendorLedger?.creditPeriodDays || 30;
    return {
      isMsme: false,
      category,
      udyamNumber: vendorLedger?.msmeUdyamNumber || "",
      statutoryDueDate: null,
      creditPeriodDays: defaultDays,
      isOverdue: false,
    };
  }

  // Statutory cap of 45 days under Section 15 of MSMED Act
  const agreedDays = vendorLedger?.creditPeriodDays;
  const effectiveDays = agreedDays && agreedDays > 0 ? Math.min(agreedDays, 45) : 15;

  const statutoryDueDate = new Date(invoiceDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
  const isOverdue = new Date() > statutoryDueDate;

  return {
    isMsme: true,
    category,
    udyamNumber: vendorLedger?.msmeUdyamNumber || "",
    statutoryDueDate,
    creditPeriodDays: effectiveDays,
    isOverdue,
  };
}

/**
 * Ensures system chart of accounts ledgers exist for a client.
 */
export async function ensureDefaultLedgers(firmId, clientId) {
  const defaults = [
    { accountName: "General Purchase Account", accountGroup: "Purchase_Accounts" },
    { accountName: "Input CGST", accountGroup: "Duties_and_Taxes" },
    { accountName: "Input SGST", accountGroup: "Duties_and_Taxes" },
    { accountName: "Input IGST", accountGroup: "Duties_and_Taxes" },
    { accountName: "Round Off Account", accountGroup: "Indirect_Expenses" },
  ];

  const ledgers = {};
  for (const def of defaults) {
    let ledger = await LedgerAccount.findOne({ client: clientId, accountName: def.accountName });
    if (!ledger) {
      ledger = await LedgerAccount.create({
        firm: firmId,
        client: clientId,
        accountName: def.accountName,
        accountGroup: def.accountGroup,
        isSystemDefault: true,
      });
    }
    ledgers[def.accountName] = ledger;
  }
  return ledgers;
}

/**
 * Builds and posts a double-entry purchase voucher with integer paise precision,
 * strict mathematical balance assertion, MSME Section 43B(h) due date tracking,
 * and immutable provenance audit.
 */
export async function postPurchaseVoucher({
  firmId,
  clientId,
  documentId,
  extractedData,
  userId,
  userEmail = "ca-reviewer@practice.in",
  clientStateCode = "24",
}) {
  const document = await Document.findOne({ _id: documentId, firm: firmId }).populate("client");
  if (!document) {
    throw new ApiError(404, "Source document not found.");
  }

  const invoiceDetails = extractedData.invoiceDetails || {};
  const counterParty = extractedData.counterParty || {};
  const summary = extractedData.financialSummary || {};

  // 1. Strict Integer Paise Conversion
  const subTotalPaise = summary.subTotalPaise || toPaise(summary.subTotal || 0);
  const cgstPaise = summary.totalCgstPaise || toPaise(summary.totalCgst || 0);
  const sgstPaise = summary.totalSgstPaise || toPaise(summary.totalSgst || 0);
  const igstPaise = summary.totalIgstPaise || toPaise(summary.totalIgst || 0);
  const roundOffPaise = summary.roundOffPaise || toPaise(summary.roundOff || 0);
  const grandTotalPaise = summary.grandTotalPaise || toPaise(summary.grandTotal || 0);

  // Math Invariant Verification
  const calculatedGrandTotalPaise = subTotalPaise + cgstPaise + sgstPaise + igstPaise + roundOffPaise;
  if (calculatedGrandTotalPaise !== grandTotalPaise) {
    throw new ApiError(
      422,
      `Double-entry calculation mismatch: SubTotal (${subTotalPaise}) + Taxes (${cgstPaise + sgstPaise + igstPaise}) + RoundOff (${roundOffPaise}) = ${calculatedGrandTotalPaise} paise, but GrandTotal is ${grandTotalPaise} paise.`
    );
  }

  // 2. Resolve or Create Counterparty Ledger
  const counterPartyName =
    (typeof counterParty.name === "object" ? counterParty.name?.value : counterParty.name)?.trim() ||
    "Sundry Creditor";
  const gstinVal =
    (typeof counterParty.gstin === "object"
      ? counterParty.gstin?.value
      : counterParty.gstin || counterParty.supplierGstin?.value || counterParty.supplierGstin) || "";

  let counterPartyLedger = await LedgerAccount.findOne({
    client: clientId,
    accountName: counterPartyName,
  });

  if (!counterPartyLedger) {
    counterPartyLedger = await LedgerAccount.create({
      firm: firmId,
      client: clientId,
      accountName: counterPartyName,
      accountGroup: "Sundry_Creditors",
      gstin: gstinVal,
    });
  }

  // 3. Compute Section 43B(h) MSME Due Date
  const invoiceDateVal =
    typeof invoiceDetails.invoiceDate === "object"
      ? invoiceDetails.invoiceDate?.value
      : invoiceDetails.invoiceDate;
  const invoiceDate = invoiceDateVal ? new Date(invoiceDateVal) : new Date();
  const msmeDetails = calculateMsmeDueDate(invoiceDate, counterPartyLedger);

  // 4. Resolve System Ledgers
  const defaultLedgers = await ensureDefaultLedgers(firmId, clientId);
  const purchaseLedger = defaultLedgers["General Purchase Account"];
  const cgstLedger = defaultLedgers["Input CGST"];
  const sgstLedger = defaultLedgers["Input SGST"];
  const igstLedger = defaultLedgers["Input IGST"];
  const roundOffLedger = defaultLedgers["Round Off Account"];

  // 5. Build Balanced Double-Entry Lines
  const entries = [];
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  // Debit: Purchase Expense
  if (subTotalPaise > 0) {
    entries.push({
      ledgerAccount: purchaseLedger._id,
      accountName: purchaseLedger.accountName,
      debitAmount: subTotalPaise / 100,
      debitAmountPaise: subTotalPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      sourcePageNumber: 1,
      isLocatedInSource: true,
      narration: `Taxable value for inv #${invoiceDetails.invoiceNumber?.value || invoiceDetails.invoiceNumber || "N/A"}`,
    });
    totalDebitPaise += subTotalPaise;
  }

  // Debit: CGST
  if (cgstPaise > 0) {
    entries.push({
      ledgerAccount: cgstLedger._id,
      accountName: cgstLedger.accountName,
      debitAmount: cgstPaise / 100,
      debitAmountPaise: cgstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      sourcePageNumber: 1,
      isLocatedInSource: true,
      narration: "Input CGST",
    });
    totalDebitPaise += cgstPaise;
  }

  // Debit: SGST
  if (sgstPaise > 0) {
    entries.push({
      ledgerAccount: sgstLedger._id,
      accountName: sgstLedger.accountName,
      debitAmount: sgstPaise / 100,
      debitAmountPaise: sgstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      sourcePageNumber: 1,
      isLocatedInSource: true,
      narration: "Input SGST",
    });
    totalDebitPaise += sgstPaise;
  }

  // Debit: IGST
  if (igstPaise > 0) {
    entries.push({
      ledgerAccount: igstLedger._id,
      accountName: igstLedger.accountName,
      debitAmount: igstPaise / 100,
      debitAmountPaise: igstPaise,
      creditAmount: 0,
      creditAmountPaise: 0,
      sourcePageNumber: 1,
      isLocatedInSource: true,
      narration: "Input IGST",
    });
    totalDebitPaise += igstPaise;
  }

  // Round Off adjustment
  if (roundOffPaise !== 0) {
    if (roundOffPaise > 0) {
      entries.push({
        ledgerAccount: roundOffLedger._id,
        accountName: roundOffLedger.accountName,
        debitAmount: roundOffPaise / 100,
        debitAmountPaise: roundOffPaise,
        creditAmount: 0,
        creditAmountPaise: 0,
        sourcePageNumber: 1,
        isLocatedInSource: true,
        narration: "Round-off adjustment (Debit)",
      });
      totalDebitPaise += roundOffPaise;
    } else {
      const absPaise = Math.abs(roundOffPaise);
      entries.push({
        ledgerAccount: roundOffLedger._id,
        accountName: roundOffLedger.accountName,
        debitAmount: 0,
        debitAmountPaise: 0,
        creditAmount: absPaise / 100,
        creditAmountPaise: absPaise,
        sourcePageNumber: 1,
        isLocatedInSource: true,
        narration: "Round-off adjustment (Credit)",
      });
      totalCreditPaise += absPaise;
    }
  }

  // Credit: Counterparty (Sundry Creditor)
  entries.push({
    ledgerAccount: counterPartyLedger._id,
    accountName: counterPartyLedger.accountName,
    debitAmount: 0,
    debitAmountPaise: 0,
    creditAmount: grandTotalPaise / 100,
    creditAmountPaise: grandTotalPaise,
    sourcePageNumber: summary.grandTotalEvidence?.page || 1,
    sourceBoundingBox: summary.grandTotalEvidence?.boundingBox || null,
    isLocatedInSource: summary.grandTotalEvidence?.isLocated !== false,
    narration: `Payable for invoice #${invoiceDetails.invoiceNumber?.value || invoiceDetails.invoiceNumber || "N/A"}`,
  });
  totalCreditPaise += grandTotalPaise;

  // 6. NON-NEGOTIABLE DOUBLE-ENTRY BALANCE ASSERTION
  if (totalDebitPaise !== totalCreditPaise) {
    throw new ApiError(
      422,
      `Double-Entry Balance Invariant Violated: Total Debits (${totalDebitPaise} paise) must equal Total Credits (${totalCreditPaise} paise). Difference: ${totalDebitPaise - totalCreditPaise} paise.`
    );
  }

  // 7. Sequential Voucher Numbering
  const voucherCount = await Voucher.countDocuments({ client: clientId });
  const voucherNumber = `PUR-${String(voucherCount + 1).padStart(4, "0")}`;

  const invNum =
    typeof invoiceDetails.invoiceNumber === "object"
      ? invoiceDetails.invoiceNumber?.value
      : invoiceDetails.invoiceNumber || "";

  // 8. Run Statutory Rules for Ledger Attribution
  const ruleEvaluations = runDeterministicValidation(extractedData, {
    clientStateCode,
    clientFinancialYear: "2026-27",
  });
  const rulesApplied = ruleEvaluations.map((r) => ({
    rule_id: r.rule_id,
    version: r.version,
    status: r.status,
  }));

  // 9. Persist Balanced Voucher
  const voucher = await Voucher.create({
    firm: firmId,
    client: clientId,
    voucherNumber,
    voucherType: "Purchase",
    voucherDate: invoiceDate,
    sourceDocument: document._id,
    referenceNumber: invNum,
    referenceDate: invoiceDate,
    partyLedgerName: counterPartyName,
    msmeDetails,
    entries,
    totalAmount: grandTotalPaise / 100,
    totalAmountPaise: grandTotalPaise,
    rulesApplied,
    narration: `Purchase from ${counterPartyName} (Inv: ${invNum || "N/A"})${
      msmeDetails.isMsme ? ` [MSME ${msmeDetails.category} - Due: ${msmeDetails.statutoryDueDate?.toISOString().split("T")[0]}]` : ""
    }`,
    postedBy: userId,
    status: "Posted",
  });

  // 10. Update Document & Vendor Balance
  document.status = "Voucher_Created";
  document.voucherId = voucher._id;
  await document.save();

  await LedgerAccount.findByIdAndUpdate(counterPartyLedger._id, {
    $inc: { currentBalance: grandTotalPaise / 100 },
  });

  // 11. Immutable Provenance Audit
  await recordAudit({
    firmId,
    clientId,
    entityType: "voucher",
    entityId: voucher._id,
    action: "POSTED_TO_TALLY",
    sourceDocumentId: document._id,
    rulesApplied,
    performedBy: userId,
    performedByEmail: userEmail,
  }).catch((err) => console.warn("Voucher provenance audit logging warning:", err.message));

  // 12. PostgreSQL Dual-Write Sync (Hybrid Mode)
  try {
    const isPgAvailable = await checkPostgresConnection();
    if (isPgAvailable) {
      await pgWithTransaction(
        async (client) => {
          // Insert header
          await client.query(
            `INSERT INTO vouchers (id, firm_id, client_id, voucher_number, voucher_type, voucher_date, total_amount_paise, narration, is_posted, posted_at, posted_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), $9)
             ON CONFLICT (client_id, voucher_number) DO NOTHING`,
            [
              voucher._id.toString(),
              firmId.toString(),
              clientId.toString(),
              voucherNumber,
              "Purchase",
              invoiceDate,
              grandTotalPaise,
              voucher.narration,
              userId?.toString() || "system",
            ]
          );

          // Insert lines
          for (let i = 0; i < entries.length; i++) {
            const ent = entries[i];
            const isDebit = ent.debitAmountPaise > 0;
            const amtPaise = isDebit ? ent.debitAmountPaise : ent.creditAmountPaise;
            await client.query(
              `INSERT INTO voucher_lines (voucher_id, account_id, account_name, entry_type, amount_paise, source_page_number, is_located_in_source, line_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                voucher._id.toString(),
                ent.ledgerAccount.toString(),
                ent.accountName,
                isDebit ? "DEBIT" : "CREDIT",
                amtPaise,
                ent.sourcePageNumber || 1,
                ent.isLocatedInSource !== false,
                i + 1,
              ]
            );
          }
        },
        { firmId, clientId }
      );
    }
  } catch (pgErr) {
    console.warn("PostgreSQL sync bypassed (operating in hybrid primary Mongo mode):", pgErr.message);
  }

  // 13. Audit Log
  await AuditLog.create({
    firm: firmId,
    client: clientId,
    user: userId,
    action: "VOUCHER_POSTED",
    entityType: "Voucher",
    entityId: voucher._id,
    diff: {
      voucherNumber,
      totalAmountPaise: grandTotalPaise,
      msmeCategory: msmeDetails.category,
      statutoryDueDate: msmeDetails.statutoryDueDate,
    },
  }).catch((err) => console.warn("AuditLog warning:", err.message));

  return voucher;
}

