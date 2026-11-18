/** @format */

export const STANDARD_RECURRING_CATEGORIES = [
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
 * Calculates 5-Pillar Month-End Close Readiness Score (0% to 100%).
 */
export function calculate5PillarScore({
  unreviewedDocsCount = 0,
  unreconciledBankTxCount = 0,
  atRiskItcCount = 0,
  missingRecurringCount = 0,
  pendingVouchersCount = 0,
}) {
  const pillars = [
    {
      id: "inbox_pipeline",
      title: "Document Verification Queue",
      status: unreviewedDocsCount === 0 ? "PASS" : "FAIL",
      count: unreviewedDocsCount,
      blocker: unreviewedDocsCount > 0 ? `${unreviewedDocsCount} documents unverified` : null,
    },
    {
      id: "bank_brs",
      title: "Bank Statement Reconciliation (BRS)",
      status: unreconciledBankTxCount === 0 ? "PASS" : "FAIL",
      count: unreconciledBankTxCount,
      blocker: unreconciledBankTxCount > 0 ? `${unreconciledBankTxCount} bank transactions uncleared` : null,
    },
    {
      id: "gstr2b_itc",
      title: "Statutory GSTR-2B Matching (§ 16(2)(aa))",
      status: atRiskItcCount === 0 ? "PASS" : "FAIL",
      count: atRiskItcCount,
      blocker: atRiskItcCount > 0 ? `${atRiskItcCount} invoices missing in 2B` : null,
    },
    {
      id: "recurring_documents",
      title: "Expected Monthly Recurring Bills",
      status: missingRecurringCount === 0 ? "PASS" : "FAIL",
      count: missingRecurringCount,
      blocker: missingRecurringCount > 0 ? `${missingRecurringCount} recurring bills missing` : null,
    },
    {
      id: "workflow_vouchers",
      title: "General Ledger Vouchers & Sign-offs",
      status: pendingVouchersCount === 0 ? "PASS" : "FAIL",
      count: pendingVouchersCount,
      blocker: pendingVouchersCount > 0 ? `${pendingVouchersCount} vouchers pending approval` : null,
    },
  ];

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
    score,
    passedPillarsCount,
    totalPillars: 5,
    readinessStatus,
    pillars,
    blockers,
  };
}

/**
 * Generates structured chasing copy for WhatsApp and Email.
 */
export function generateChasingTemplates({
  clientName = "Client",
  missingItems = [],
  portalUrl = "https://app.cksfinbot.in/portal/upload",
}) {
  const missingBullets = missingItems.map((item, idx) => `${idx + 1}. ${item}`).join("\n");

  const whatsappMessage = `*Month-End Accounting Reminder for ${clientName}*\n\nDear Client,\nWe are closing the monthly books and noticed the following missing documents:\n${missingBullets}\n\nPlease upload them directly to your secure portal link:\n🔗 ${portalUrl}\n\nThank you,\nYour Chartered Accounting Team`;

  const emailSubject = `Action Required: Missing Accounting Documents for ${clientName}`;
  const emailBody = `Dear ${clientName} Team,\n\nIn order to finalize your monthly statutory returns and bank reconciliation, please provide the following documents:\n\n${missingBullets}\n\nUpload securely via the portal:\n${portalUrl}\n\nRegards,\nAudit & Tax Advisory Team`;

  return {
    whatsappMessage,
    emailSubject,
    emailBody,
  };
}

export default {
  STANDARD_RECURRING_CATEGORIES,
  calculate5PillarScore,
  generateChasingTemplates,
};

