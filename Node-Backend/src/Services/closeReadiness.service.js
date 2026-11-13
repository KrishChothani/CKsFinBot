/** @format */

import { Document } from "../Models/document.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import { Gstr2bRecord } from "../Models/gstr2b.model.js";
import { Client } from "../Models/client.model.js";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import { createDocumentRequest } from "./documentRequest.service.js";
import { runGstReconciliation } from "./gstRecon.service.js";
import { formatINR } from "../Utils/money.js";

/**
 * Standard recurring vendor expectations for small-to-midsize Indian businesses
 */
const STANDARD_RECURRING_CATEGORIES = [
  {
    category: "Office_Rent",
    label: "Office Space Rent",
    keywords: ["RENT", "LEASE", "REALTY", "COMMERCIAL TOWER", "ESTATE"],
    typicalAmount: 75000,
    expectedDayOfMonth: 5,
  },
  {
    category: "Electricity_Bill",
    label: "Electricity / Power Supply",
    keywords: ["ELECTRICITY", "POWER", "DISCOM", "TORRENT", "ADANI", "BESCOM", "MSEDCL"],
    typicalAmount: 22000,
    expectedDayOfMonth: 10,
  },
  {
    category: "Telecom_Broadband",
    label: "Internet & Telecom Lines",
    keywords: ["AIRTEL", "JIO", "VODAFONE", "BROADBAND", "TELECOM", "TATA TELE"],
    typicalAmount: 4500,
    expectedDayOfMonth: 12,
  },
  {
    category: "Cloud_Hosting_SaaS",
    label: "Cloud Hosting & Subscriptions",
    keywords: ["AWS", "AMAZON WEB", "GOOGLE CLOUD", "MICROSOFT", "AZURE", "ZOHO"],
    typicalAmount: 18500,
    expectedDayOfMonth: 15,
  },
];

/**
 * Detects missing expected recurring monthly documents for a client workspace.
 */
export async function detectExpectedRecurringDocuments({
  clientId,
  month = new Date().getMonth() + 1, // 1-12
  year = new Date().getFullYear(),
}) {
  const targetDateStart = new Date(year, month - 1, 1);
  const targetDateEnd = new Date(year, month, 0, 23, 59, 59);

  // 1. Fetch all vouchers and documents posted in target month
  const [monthVouchers, monthDocs] = await Promise.all([
    Voucher.find({
      client: clientId,
      voucherDate: { $gte: targetDateStart, $lte: targetDateEnd },
      status: "Posted",
    }).lean(),
    Document.find({
      client: clientId,
      createdAt: { $gte: targetDateStart, $lte: targetDateEnd },
    }).lean(),
  ]);

  const existingTextCorpus = [
    ...monthVouchers.map((v) => `${v.partyLedgerName} ${v.narration}`.toUpperCase()),
    ...monthDocs.map((d) => `${d.fileName} ${d.documentType}`.toUpperCase()),
  ].join(" ");

  // 2. Check each standard recurring category
  const recurringExpectations = STANDARD_RECURRING_CATEGORIES.map((cat) => {
    const isMatched = cat.keywords.some((kw) => existingTextCorpus.includes(kw));

    // Look for matching voucher
    const matchedVoucher = monthVouchers.find((v) =>
      cat.keywords.some(
        (kw) =>
          (v.partyLedgerName || "").toUpperCase().includes(kw) ||
          (v.narration || "").toUpperCase().includes(kw)
      )
    );

    return {
      category: cat.category,
      label: cat.label,
      expectedDayOfMonth: cat.expectedDayOfMonth,
      expectedAmount: cat.typicalAmount,
      status: isMatched ? "RECEIVED" : "MISSING",
      matchedVoucher: matchedVoucher
        ? {
            voucherNumber: matchedVoucher.voucherNumber,
            date: matchedVoucher.voucherDate,
            amount: matchedVoucher.totalAmount,
          }
        : null,
    };
  });

  return recurringExpectations;
}

/**
 * Evaluates the 5 Deterministic Pillars of Month-End Close Readiness.
 * Returns checklist, score (0-100%), and blocking items.
 */
export async function computeCloseReadiness({
  firmId,
  clientId,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  financialYear = "2026-2027",
}) {
  const client = await Client.findOne({ _id: clientId, firm: firmId }).lean();
  if (!client) throw new Error("Client workspace not found.");

  // Target period timestamps
  const targetDateStart = new Date(year, month - 1, 1);
  const targetDateEnd = new Date(year, month, 0, 23, 59, 59);

  // Evaluate all 5 pillars in parallel
  const [
    unreviewedDocsCount,
    unreconciledBankTxCount,
    pendingWorkflowVouchersCount,
    recurringExpectations,
    gstReconResult,
  ] = await Promise.all([
    // Pillar 1: Document Review Queue
    Document.countDocuments({
      client: clientId,
      status: { $in: ["Needs_Review", "Queued", "Processing"] },
    }),

    // Pillar 2: Bank Statement Reconciliation
    BankTransaction.countDocuments({
      client: clientId,
      reconciliationStatus: { $ne: "Reconciled" },
    }),

    // Pillar 3: Workflow Drafts / Pending Senior CA sign-offs
    Voucher.countDocuments({
      client: clientId,
      $or: [
        { status: "Draft" },
        { "approvalWorkflow.stage": { $in: ["Pending_Senior_CA", "Pending_Partner"] } },
      ],
    }),

    // Pillar 4: Expected Recurring Documents
    detectExpectedRecurringDocuments({ clientId, month, year }),

    // Pillar 5: GSTR-2B Reconciliation & Section 16(2)(aa) at-risk ITC
    runGstReconciliation(firmId, clientId, financialYear).catch(() => ({
      summary: { missingIn2bCount: 0, atRiskItc: 0, taxMismatchCount: 0 },
      missingIn2b: [],
    })),
  ]);

  const missingRecurring = recurringExpectations.filter((r) => r.status === "MISSING");
  const missingRecurringCount = missingRecurring.length;
  const atRiskItcCount = gstReconResult?.summary?.missingIn2bCount || 0;
  const atRiskItcAmount = gstReconResult?.summary?.atRiskItc || 0;

  // Build the 5 Pillar Checklist
  const pillars = [
    {
      id: "inbox_pipeline",
      title: "Document Inbox & Verification Queue",
      description: "All uploaded vendor invoices and receipts must be reviewed and verified by a CA.",
      status: unreviewedDocsCount === 0 ? "PASS" : "FAIL",
      count: unreviewedDocsCount,
      target: "0 pending documents",
      blocker:
        unreviewedDocsCount > 0
          ? `${unreviewedDocsCount} document(s) waiting in review queue`
          : null,
      href: "/app/review",
    },
    {
      id: "bank_brs",
      title: "Bank Statement Reconciliation (BRS)",
      description: "All bank statement lines must be matched to corresponding accounting vouchers.",
      status: unreconciledBankTxCount === 0 ? "PASS" : "FAIL",
      count: unreconciledBankTxCount,
      target: "0 uncleared transactions",
      blocker:
        unreconciledBankTxCount > 0
          ? `${unreconciledBankTxCount} bank statement transaction(s) uncleared`
          : null,
      href: "/app/reconciliation",
    },
    {
      id: "gstr2b_itc",
      title: "Statutory GSTR-2B Matching (§ 16(2)(aa))",
      description: "ITC must not be claimed on invoices unfiled by suppliers in their GSTR-1.",
      status: atRiskItcCount === 0 ? "PASS" : "FAIL",
      count: atRiskItcCount,
      target: "0 at-risk invoices",
      blocker:
        atRiskItcCount > 0
          ? `${atRiskItcCount} invoice(s) missing in 2B (₹${atRiskItcAmount.toFixed(2)} ITC at risk)`
          : null,
      href: "/app/reconciliation",
    },
    {
      id: "recurring_documents",
      title: "Expected Monthly Recurring Documents",
      description: "Standard monthly bills (Rent, Electricity, Telecom, Cloud) must be accounted for.",
      status: missingRecurringCount === 0 ? "PASS" : "FAIL",
      count: missingRecurringCount,
      target: "All 4 recurring bills received",
      blocker:
        missingRecurringCount > 0
          ? `${missingRecurringCount} recurring bill(s) missing: ${missingRecurring
              .map((m) => m.label)
              .join(", ")}`
          : null,
      href: "/app/requests",
    },
    {
      id: "workflow_vouchers",
      title: "Draft & Approval Workflow Vouchers",
      description: "All vouchers must be balanced and have required Senior CA / Partner sign-offs.",
      status: pendingWorkflowVouchersCount === 0 ? "PASS" : "FAIL",
      count: pendingWorkflowVouchersCount,
      target: "0 pending sign-offs",
      blocker:
        pendingWorkflowVouchersCount > 0
          ? `${pendingWorkflowVouchersCount} voucher(s) awaiting CA review or partner approval`
          : null,
      href: "/app/vouchers",
    },
  ];

  // Calculate Deterministic Score (0% to 100%)
  const passedPillarsCount = pillars.filter((p) => p.status === "PASS").length;
  const score = Math.round((passedPillarsCount / 5) * 100);

  let readinessStatus = "ACTION_REQUIRED";
  if (score === 100) {
    readinessStatus = "READY_TO_CLOSE";
  } else if (score >= 60) {
    readinessStatus = "IN_PROGRESS";
  }

  const blockers = pillars.filter((p) => p.status === "FAIL").map((p) => p.blocker);

  return {
    client: {
      id: client._id,
      businessName: client.businessName,
      gstin: client.gstin,
    },
    period: {
      month,
      year,
      financialYear,
      monthName: new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long" }),
    },
    readiness: {
      score,
      status: readinessStatus, // READY_TO_CLOSE | IN_PROGRESS | ACTION_REQUIRED
      passedPillarsCount,
      totalPillars: 5,
      isCloseReady: score === 100,
    },
    pillars,
    blockers,
    recurringExpectations,
  };
}

/**
 * Generates Gap-Aware Automated Chasing Bundles for Clients and Offending Vendors.
 * Creates document requests with 1-click client upload tokens.
 */
export async function generateGapAwareChasingBundles({
  firmId,
  clientId,
  userId,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  financialYear = "2026-2027",
  baseUrl = "https://app.cksfinbot.com",
}) {
  const readiness = await computeCloseReadiness({
    firmId,
    clientId,
    month,
    year,
    financialYear,
  });

  const monthName = readiness.period.monthName;
  const clientName = readiness.client.businessName;

  // 1. Compile Missing Client Items
  const missingRecurring = readiness.recurringExpectations.filter((r) => r.status === "MISSING");
  const unreviewedCount = readiness.pillars.find((p) => p.id === "inbox_pipeline")?.count || 0;
  const unreconciledBankCount = readiness.pillars.find((p) => p.id === "bank_brs")?.count || 0;

  const clientGaps = [];
  if (missingRecurring.length > 0) {
    missingRecurring.forEach((m) => {
      clientGaps.push(`• ${m.label} (~₹${m.expectedAmount})`);
    });
  }
  if (unreconciledBankCount > 0) {
    clientGaps.push(`• Bank Statement for ${monthName} ${year} (to clear ${unreconciledBankCount} open entries)`);
  }

  // 2. Create Secure Document Request for Client Upload
  let clientUploadToken = "portal-token";
  if (clientGaps.length > 0) {
    const docReq = await createDocumentRequest({
      firmId,
      clientId,
      userId,
      title: `Missing Documents for ${monthName} ${year} Book Close`,
      description: `Please upload the following required bills to finalize accounts: ${clientGaps.join(
        ", "
      )}`,
      documentCategory: "Expense_Bill",
      period: `${monthName} ${year}`,
      urgency: "High",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    });
    clientUploadToken = docReq.token;
  }

  const uploadUrl = `${baseUrl}/portal/upload/${clientUploadToken}`;

  // 3. Format Client WhatsApp Message Template
  const clientWhatsAppMessage = `*Month-End Book Close Alert - ${clientName}*\n\nHello Team,\n\nYour close readiness score for *${monthName} ${year}* is *${readiness.readiness.score}%* (${readiness.readiness.status.replace(
    /_/g,
    " "
  )}).\n\nTo close books and protect your Input Tax Credit without statutory delay, please upload the following *${clientGaps.length}* missing item(s):\n\n${clientGaps.join(
    "\n"
  )}\n\n📎 *Upload Securely in 1-Click:*\n${uploadUrl}\n\n_Automated reminder from CKsFinBot Practice Engine_`;

  // 4. Format Client Email Template
  const clientEmailSubject = `Action Required: Month-End Book Close & Missing Bills (${monthName} ${year}) - ${clientName}`;
  const clientEmailBody = `
Dear ${clientName} Accounts Team,

We are preparing the books of accounts for ${monthName} ${year}. Your current close-readiness score is ${readiness.readiness.score}%.

The following items are missing and required before we can finalize your financial reports and GSTR-3B return:

${clientGaps.join("\n")}

Please upload these documents using our secure direct upload portal link:
${uploadUrl}

Thank you,
Your CA Practice Team
`;

  // 5. Compile Offending Vendors from GSTR-2B Mismatch
  const gstRecon = await runGstReconciliation(firmId, clientId, financialYear).catch(() => ({
    supplierAtRiskList: [],
    missingIn2b: [],
  }));

  const vendorNotices = (gstRecon.supplierAtRiskList || []).map((sup) => {
    const invList = sup.invoices.map((inv) => `#${inv.invoiceNumber} (₹${inv.taxAmount} tax)`).join(", ");
    const noticeText = `Dear ${sup.supplierName},\n\nThe following invoice(s) issued to ${clientName} are booked in our purchase ledger, but do NOT appear in our GSTR-2B:\n${invList}\n\nUnder Section 16(2)(aa) of the CGST Act, our Input Tax Credit of ₹${sup.atRiskTax.toFixed(
      2
    )} is blocked. Please upload these invoices to your GSTR-1 immediately to avoid payment hold.\n\nAccounts Dept,\n${clientName}`;

    return {
      supplierGstin: sup.supplierGstin,
      supplierName: sup.supplierName,
      atRiskTax: sup.atRiskTax,
      invoiceCount: sup.invoiceCount,
      noticeText,
    };
  });

  return {
    clientChasing: {
      gapCount: clientGaps.length,
      gaps: clientGaps,
      uploadUrl,
      whatsAppMessage: clientWhatsAppMessage,
      emailSubject: clientEmailSubject,
      emailBody: clientEmailBody,
    },
    vendorChasing: {
      offendingSupplierCount: vendorNotices.length,
      vendors: vendorNotices,
    },
  };
}

