/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Firm } from "../Models/firm.model.js";
import { Client } from "../Models/client.model.js";
import { ClientSummary } from "../Models/clientSummary.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import {
  generateClientSummaryReport,
  signOffClientSummary,
  revokeClientSummarySignOff,
} from "../Services/clientSummary.service.js";

/**
 * Get latest deterministic summary for active client with practice branding
 */
export const getLatestClientSummary = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2024-2025";
  const periodIdentifier = req.query.periodIdentifier || "Current";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const [firm, client] = await Promise.all([
    Firm.findById(req.firmId).lean(),
    Client.findOne({ _id: clientId, firm: req.firmId }).lean(),
  ]);

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  let summary = await ClientSummary.findOne({
    firm: req.firmId,
    client: clientId,
    financialYear,
    periodIdentifier,
  }).populate("signOff.signedBy", "fullName email role");

  // If no summary has been generated yet, deterministically generate one on the fly
  if (!summary) {
    summary = await generateClientSummaryReport({
      firmId: req.firmId,
      clientId,
      financialYear,
      periodIdentifier,
      performedByUserId: req.user?._id,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        summary,
        firmBranding: firm?.branding || {},
        clientDetails: {
          businessName: client.businessName,
          tradeName: client.tradeName,
          gstin: client.gstin,
          panNumber: client.panNumber,
          legalStructure: client.legalStructure,
          address: client.address,
        },
      },
      "Client deterministic summary retrieved."
    )
  );
});

/**
 * Regenerate / Refresh deterministic summary from live database
 */
export const refreshClientSummary = AsyncHandler(async (req, res) => {
  const clientId = req.body.clientId || req.clientId;
  const financialYear = req.body.financialYear || "2024-2025";
  const period = req.body.period || "Monthly";
  const periodIdentifier = req.body.periodIdentifier || "Current";

  if (!clientId) {
    throw new ApiError(400, "Client ID is required.");
  }

  const [firm, client, summary] = await Promise.all([
    Firm.findById(req.firmId).lean(),
    Client.findOne({ _id: clientId, firm: req.firmId }).lean(),
    generateClientSummaryReport({
      firmId: req.firmId,
      clientId,
      financialYear,
      period,
      periodIdentifier,
      performedByUserId: req.user?._id,
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        summary,
        firmBranding: firm?.branding || {},
        clientDetails: {
          businessName: client?.businessName,
          tradeName: client?.tradeName,
          gstin: client?.gstin,
          panNumber: client?.panNumber,
          legalStructure: client?.legalStructure,
          address: client?.address,
        },
      },
      "Deterministic summary recomputed from database."
    )
  );
});

/**
 * CA Partner Statutory Sign-Off with ICAI credentials & SHA-256 digital hash
 */
export const signOffSummary = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { partnerName, membershipNumber, remarks, forceWithQualifiedDisclaimer } = req.body;

  // Authorization gate: must be CA or Firm_Admin
  const allowedRoles = ["CA", "Firm_Admin"];
  if (!allowedRoles.includes(req.user?.role)) {
    throw new ApiError(
      403,
      "Unauthorized: Only Chartered Accountants or Firm Administrators can sign off statutory client summaries."
    );
  }

  const summary = await signOffClientSummary({
    summaryId: id,
    firmId: req.firmId,
    userId: req.user._id,
    partnerName,
    membershipNumber,
    remarks,
    forceWithQualifiedDisclaimer: Boolean(forceWithQualifiedDisclaimer),
  });

  await AuditLog.create({
    firm: req.firmId,
    user: req.user._id,
    action: "CLIENT_SUMMARY_SIGNED_OFF",
    entityType: "ClientSummary",
    entityId: summary._id,
    diff: {
      partnerName,
      membershipNumber,
      digitalHash: summary.signOff?.digitalHash,
    },
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, summary, "Client summary successfully signed off by Chartered Accountant.")
  );
});

/**
 * Revoke sign-off
 */
export const revokeSummary = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const allowedRoles = ["CA", "Firm_Admin"];
  if (!allowedRoles.includes(req.user?.role)) {
    throw new ApiError(403, "Unauthorized to revoke CA sign-off.");
  }

  const summary = await revokeClientSummarySignOff({
    summaryId: id,
    firmId: req.firmId,
    userId: req.user._id,
    reason,
  });

  await AuditLog.create({
    firm: req.firmId,
    user: req.user._id,
    action: "CLIENT_SUMMARY_SIGN_OFF_REVOKED",
    entityType: "ClientSummary",
    entityId: summary._id,
    diff: { reason },
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, summary, "Sign-off revoked. Summary status returned to Draft.")
  );
});

/**
 * Get Firm Practice Branding
 */
export const getPracticeBranding = AsyncHandler(async (req, res) => {
  const firm = await Firm.findById(req.firmId).lean();
  if (!firm) {
    throw new ApiError(404, "Firm not found.");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        firmName: firm.name,
        address: firm.address,
        branding: firm.branding || {},
      },
      "Firm branding retrieved successfully."
    )
  );
});

/**
 * Update Firm Practice Branding (FRN, Partner, Logo, Letterhead)
 */
export const updatePracticeBranding = AsyncHandler(async (req, res) => {
  const {
    logoUrl,
    icaiRegistrationNumber,
    partnerName,
    membershipNumber,
    letterheadHeader,
    letterheadFooter,
    primaryColor,
    accentColor,
    contactEmail,
    contactPhone,
    website,
    officeAddress,
  } = req.body;

  const firm = await Firm.findById(req.firmId);
  if (!firm) {
    throw new ApiError(404, "Firm not found.");
  }

  if (!firm.branding) {
    firm.branding = {};
  }

  if (logoUrl !== undefined) firm.branding.logoUrl = logoUrl;
  if (icaiRegistrationNumber !== undefined)
    firm.branding.icaiRegistrationNumber = icaiRegistrationNumber;
  if (partnerName !== undefined) firm.branding.partnerName = partnerName;
  if (membershipNumber !== undefined)
    firm.branding.membershipNumber = membershipNumber;
  if (letterheadHeader !== undefined)
    firm.branding.letterheadHeader = letterheadHeader;
  if (letterheadFooter !== undefined)
    firm.branding.letterheadFooter = letterheadFooter;
  if (primaryColor !== undefined) firm.branding.primaryColor = primaryColor;
  if (accentColor !== undefined) firm.branding.accentColor = accentColor;
  if (contactEmail !== undefined) firm.branding.contactEmail = contactEmail;
  if (contactPhone !== undefined) firm.branding.contactPhone = contactPhone;
  if (website !== undefined) firm.branding.website = website;

  if (officeAddress) {
    firm.address = { ...firm.address, ...officeAddress };
  }

  await firm.save();

  await AuditLog.create({
    firm: req.firmId,
    user: req.user._id,
    action: "PRACTICE_BRANDING_UPDATED",
    entityType: "Firm",
    entityId: firm._id,
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, firm.branding, "Practice branding updated successfully.")
  );
});

