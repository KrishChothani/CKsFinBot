/** @format */

import { Voucher } from "../Models/voucher.model.js";
import { Client } from "../Models/client.model.js";
import { AuditLog } from "../Models/auditLog.model.js";

/**
 * Determine required approval level based on voucher amount and client policy
 */
export const evaluateApprovalRequirement = async (clientId, totalAmount, hasFlags = false) => {
  const client = await Client.findById(clientId);
  const threshold = client?.approvalPolicy?.requiresPartnerApprovalAbove || 50000;

  if (totalAmount > threshold || hasFlags) {
    return {
      requiresApproval: true,
      stage: totalAmount > 100000 ? "Pending_Partner" : "Pending_Senior_CA",
      currentReviewerRole: totalAmount > 100000 ? "Firm_Admin" : "CA",
    };
  }

  return {
    requiresApproval: false,
    stage: "Approved",
    currentReviewerRole: "None",
  };
};

/**
 * Approve a voucher at current workflow stage
 */
export const approveVoucherWorkflow = async ({
  firmId,
  voucherId,
  userId,
  userRole,
  remarks = "Approved for general ledger posting",
}) => {
  const voucher = await Voucher.findOne({ _id: voucherId, firm: firmId });
  if (!voucher) throw new Error("Voucher not found.");

  const currentStage = voucher.approvalWorkflow?.stage || "Approved";

  // Check authorization
  if (currentStage === "Pending_Partner" && !["Firm_Admin", "CA"].includes(userRole)) {
    throw new Error("Only a CA Partner or Firm Admin can approve this high-value voucher.");
  }

  let nextStage = "Approved";
  let nextRole = "None";

  // If approved by Senior CA but amount > ₹1,00,000, escalate to Partner
  if (currentStage === "Pending_Senior_CA" && voucher.totalAmount > 100000 && userRole !== "Firm_Admin") {
    nextStage = "Pending_Partner";
    nextRole = "Firm_Admin";
  }

  voucher.approvalWorkflow = voucher.approvalWorkflow || {};
  voucher.approvalWorkflow.stage = nextStage;
  voucher.approvalWorkflow.currentReviewerRole = nextRole;
  voucher.approvalWorkflow.history = voucher.approvalWorkflow.history || [];
  voucher.approvalWorkflow.history.push({
    action: "Approved",
    by: userId,
    role: userRole,
    date: new Date(),
    remarks,
  });

  if (nextStage === "Approved") {
    voucher.status = "Posted";
  }

  await voucher.save();

  await AuditLog.create({
    firm: firmId,
    client: voucher.client,
    performedBy: userId,
    action: "VOUCHER_POST",
    entityType: "Voucher",
    entityId: voucher._id,
    metadata: {
      details: `Voucher #${voucher.voucherNumber} approved by ${userRole} (${remarks}). Final Stage: ${nextStage}`,
    },
  });

  return voucher;
};

/**
 * Reject a voucher with review comments
 */
export const rejectVoucherWorkflow = async ({
  firmId,
  voucherId,
  userId,
  userRole,
  remarks = "Rejected by reviewer",
}) => {
  const voucher = await Voucher.findOne({ _id: voucherId, firm: firmId });
  if (!voucher) throw new Error("Voucher not found.");

  voucher.approvalWorkflow = voucher.approvalWorkflow || {};
  voucher.approvalWorkflow.stage = "Rejected";
  voucher.approvalWorkflow.currentReviewerRole = "Accountant";
  voucher.approvalWorkflow.history = voucher.approvalWorkflow.history || [];
  voucher.approvalWorkflow.history.push({
    action: "Rejected",
    by: userId,
    role: userRole,
    date: new Date(),
    remarks,
  });

  voucher.status = "Draft"; // Unposts from live ledger
  await voucher.save();

  await AuditLog.create({
    firm: firmId,
    client: voucher.client,
    performedBy: userId,
    action: "REVIEW_REJECT",
    entityType: "Voucher",
    entityId: voucher._id,
    metadata: {
      details: `Voucher #${voucher.voucherNumber} rejected by ${userRole}: ${remarks}`,
    },
  });

  return voucher;
};

/**
 * Fetch vouchers currently in approval queue
 */
export const listPendingApprovals = async (firmId, clientId = null) => {
  const query = {
    firm: firmId,
    "approvalWorkflow.stage": { $in: ["Pending_Senior_CA", "Pending_Partner"] },
  };

  if (clientId) {
    query.client = clientId;
  }

  const vouchers = await Voucher.find(query)
    .populate("client", "businessName gstin")
    .populate("postedBy", "fullName email role")
    .sort({ createdAt: -1 });

  return vouchers;
};

