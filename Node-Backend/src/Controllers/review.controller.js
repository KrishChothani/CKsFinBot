/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Document } from "../Models/document.model.js";
import { ExtractedData } from "../Models/extractedData.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { runDeterministicValidation } from "../Rules/validator.engine.js";
import { toPaise } from "../Utils/money.js";
import { recordAudit } from "../Services/provenanceAudit.service.js";
import { postPurchaseVoucher } from "../Services/voucher.service.js";

// List documents waiting in the review queue
export const getReviewQueue = AsyncHandler(async (req, res) => {
  const { status, documentType, page = 1, limit = 20 } = req.query;

  let query = { firm: req.firmId };
  if (req.clientId) {
    query.client = req.clientId;
  }

  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ["Needs_Review", "Queued", "Processing", "Approved"] };
  }

  if (documentType) {
    query.documentType = documentType;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [documents, totalCount] = await Promise.all([
    Document.find(query)
      .populate("client", "businessName gstin")
      .populate("extractedDataId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Document.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        documents,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          pages: Math.ceil(totalCount / parseInt(limit, 10)),
        },
      },
      "Review queue retrieved successfully."
    )
  );
});

// Get side-by-side review detail for a document
export const getDocumentReviewDetail = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findOne({ _id: documentId, firm: req.firmId })
    .populate("client")
    .populate("extractedDataId")
    .populate("voucherId");

  if (!document) {
    throw new ApiError(404, "Document not found in this firm.");
  }

  let extractedData = document.extractedDataId;
  if (!extractedData) {
    extractedData = await ExtractedData.findOne({ document: documentId });
  }

  // Also fetch existing client chart of accounts so reviewer can select ledgers
  const clientLedgers = await LedgerAccount.find({ client: document.client._id })
    .sort({ accountGroup: 1, accountName: 1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        document,
        extractedData,
        clientLedgers,
      },
      "Document review details loaded."
    )
  );
});

// Update an extracted field during human review
export const updateExtractedFields = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { invoiceDetails, counterParty, lineItems, financialSummary } = req.body;

  const document = await Document.findOne({ _id: documentId, firm: req.firmId });
  if (!document) {
    throw new ApiError(404, "Document not found.");
  }

  let extracted = await ExtractedData.findOne({ document: documentId });
  if (!extracted) {
    throw new ApiError(404, "Extracted data not found for document.");
  }

  const previousSnapshot = {
    invoiceDetails: extracted.invoiceDetails,
    counterParty: extracted.counterParty,
    financialSummary: extracted.financialSummary,
  };

  if (invoiceDetails) {
    extracted.invoiceDetails = { ...extracted.invoiceDetails, ...invoiceDetails };
  }
  if (counterParty) {
    extracted.counterParty = { ...extracted.counterParty, ...counterParty };
  }
  if (lineItems) {
    extracted.lineItems = lineItems;
  }
  if (financialSummary) {
    extracted.financialSummary = { ...extracted.financialSummary, ...financialSummary };
  }

  // Run deterministic rule validation
  const validationContext = {
    clientStateCode: document.client?.settings?.stateCode || "24",
    clientFinancialYear: "2026-27",
  };
  const ruleEvaluations = runDeterministicValidation(extracted, validationContext);
  extracted.ruleEvaluations = ruleEvaluations;

  // Mark confidence as 1.0 since it was verified/corrected by human
  extracted.extractionConfidence = 1.0;
  extracted.userCorrections.push({
    field: "bulk_review_edit",
    originalValue: previousSnapshot,
    correctedValue: { invoiceDetails, counterParty, financialSummary },
    correctedBy: req.user._id,
    correctedAt: new Date(),
  });

  await extracted.save();

  // Immutable Provenance Audit Record
  await recordAudit({
    firmId: req.firmId,
    clientId: document.client,
    entityType: "extracted_field",
    entityId: extracted._id,
    action: "OVERRIDDEN",
    sourceDocumentId: document._id,
    previousValue: previousSnapshot,
    newValue: { invoiceDetails, counterParty, financialSummary },
    performedBy: req.user._id,
    performedByEmail: req.user.email,
    overrideReason: req.body.overrideReason || "Human review verification and field adjustment",
  }).catch((err) => console.warn("Provenance audit logging error:", err.message));

  await AuditLog.create({
    firm: req.firmId,
    client: document.client,
    user: req.user._id,
    action: "REVIEW_FIELD_MODIFIED",
    entityType: "ExtractedData",
    entityId: extracted._id,
    diff: { before: previousSnapshot, after: { invoiceDetails, counterParty, financialSummary } },
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, extracted, "Document extraction updated successfully.")
  );
});

// Approve document and atomically generate double-entry voucher
export const approveAndGenerateVoucher = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findOne({ _id: documentId, firm: req.firmId }).populate("client");
  if (!document) {
    throw new ApiError(404, "Document not found.");
  }

  const extracted = await ExtractedData.findOne({ document: documentId });
  if (!extracted) {
    throw new ApiError(400, "Cannot generate voucher: No extracted data found.");
  }

  const clientId = document.client._id;
  const counterParty = extracted.counterParty || {};
  const invoiceDetails = extracted.invoiceDetails || {};

  // 1. NON-NEGOTIABLE POSTING GATE: Check for unlocated fields
  const unlocatedFields = [];
  const checkFieldLocated = (fieldObj, fieldName) => {
    if (fieldObj && fieldObj.isLocated === false && !fieldObj.isOverridden) {
      unlocatedFields.push(fieldName);
    }
  };
  checkFieldLocated(invoiceDetails.invoiceNumber, "Invoice Number");
  checkFieldLocated(invoiceDetails.invoiceDate, "Invoice Date");
  checkFieldLocated(counterParty.supplierGstin || counterParty.gstin, "Supplier GSTIN");

  if (unlocatedFields.length > 0) {
    throw new ApiError(
      422,
      `Cannot approve voucher: The following critical field(s) could not be located in document text layer and require explicit human confirmation/override: ${unlocatedFields.join(
        ", "
      )}.`
    );
  }

  // 2. Delegate to hardened double-entry voucher service
  const clientStateCode = document.client?.settings?.stateCode || "24";
  const voucher = await postPurchaseVoucher({
    firmId: req.firmId,
    clientId,
    documentId: document._id,
    extractedData: extracted,
    userId: req.user._id,
    userEmail: req.user.email,
    clientStateCode,
  });

  const updatedDoc = await Document.findById(documentId);

  return res.status(201).json(
    new ApiResponse(
      201,
      { voucher, document: updatedDoc },
      `Document approved and double-entry Voucher ${voucher.voucherNumber} posted successfully!`
    )
  );
});

// Reject document in review queue
export const rejectDocument = AsyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { reason } = req.body;

  const document = await Document.findOne({ _id: documentId, firm: req.firmId });
  if (!document) {
    throw new ApiError(404, "Document not found.");
  }

  document.status = "Failed";
  document.errorMessage = reason || "Rejected during reviewer verification.";
  await document.save();

  await AuditLog.create({
    firm: req.firmId,
    client: document.client,
    user: req.user._id,
    action: "DOCUMENT_REJECTED",
    entityType: "Document",
    entityId: document._id,
    diff: { reason },
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, document, "Document rejected.")
  );
});

