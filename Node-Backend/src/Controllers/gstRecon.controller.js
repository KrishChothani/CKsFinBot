/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Gstr2bRecord } from "../Models/gstr2b.model.js";
import {
  importGstr2bData,
  importGstr2bExcelBuffer,
  runGstReconciliation,
  createVoucherFromGstr2bEntry,
  generateGstMismatchExcel,
  updateImsAction,
} from "../Services/gstRecon.service.js";

// Upload/Import GSTR-2B data (Supports JSON and Excel .xlsx from GST Portal)
export const importGstr2b = AsyncHandler(async (req, res) => {
  const { returnPeriod, financialYear = "2026-2027", data, sourceFileName } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  let savedRecords = [];
  const fileName = sourceFileName || req.file?.originalname || "gstr2b_portal.json";

  // Check if uploaded file is Excel
  if (req.file && (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))) {
    savedRecords = await importGstr2bExcelBuffer({
      firmId: req.firmId,
      clientId,
      returnPeriod: returnPeriod || "042026",
      financialYear,
      buffer: req.file.buffer,
      sourceFileName: fileName,
    });
  } else {
    // JSON Payload parsing
    let payload = data;
    if (!payload && req.file) {
      try {
        const fileContent = req.file.buffer ? req.file.buffer.toString("utf-8") : "";
        payload = JSON.parse(fileContent);
      } catch (err) {
        throw new ApiError(400, "Invalid JSON in uploaded GSTR-2B file.");
      }
    } else if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        throw new ApiError(400, "Malformed JSON string in data parameter.");
      }
    }

    if (!payload) {
      throw new ApiError(400, "GSTR-2B JSON or Excel file payload is required.");
    }

    savedRecords = await importGstr2bData({
      firmId: req.firmId,
      clientId,
      returnPeriod: returnPeriod || "042026",
      financialYear,
      rawPayload: payload,
      sourceFileName: fileName,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { count: savedRecords.length, records: savedRecords },
      `Successfully ingested ${savedRecords.length} GSTR-2B invoice record(s).`
    )
  );
});

// Run and fetch GSTR-2B vs Books reconciliation report with 2-tier matching & ITC at risk
export const getGstReconciliation = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  const result = await runGstReconciliation(
    req.firmId,
    clientId,
    financialYear
  );

  const gstr2bRecords = await Gstr2bRecord.find({
    client: clientId,
    financialYear,
  }).sort({ invoiceDate: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        records: gstr2bRecords,
      },
      "2-Tier GST reconciliation generated successfully."
    )
  );
});

// Record an IMS (Invoice Management System) action (ACCEPTED, REJECTED, PENDING)
export const recordImsAction = AsyncHandler(async (req, res) => {
  const { gstr2bId, action, remarks } = req.body;
  const clientId = req.body.clientId || req.clientId;

  if (!gstr2bId || !action) {
    throw new ApiError(400, "Both gstr2bId and action ('ACCEPTED' | 'REJECTED' | 'PENDING') are required.");
  }

  const updatedRecord = await updateImsAction({
    firmId: req.firmId,
    clientId,
    gstr2bId,
    action,
    remarks,
    userId: req.user._id,
    userEmail: req.user.email,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedRecord, `IMS status updated to ${action}.`)
  );
});

// 1-Click: Create voucher from GSTR-2B entry
export const createVoucherFrom2b = AsyncHandler(async (req, res) => {
  const { gstr2bId } = req.params;
  const clientId = req.body.clientId || req.clientId;

  if (!gstr2bId) {
    throw new ApiError(400, "GSTR-2B Record ID is required.");
  }

  const voucher = await createVoucherFromGstr2bEntry({
    firmId: req.firmId,
    clientId,
    gstr2bId,
    userId: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      voucher,
      `Voucher #${voucher.voucherNumber} created and posted successfully from GSTR-2B.`
    )
  );
});

// Download reconciliation mismatch report in Excel
export const downloadGstMismatchExcel = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const financialYear = req.query.financialYear || "2026-2027";

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  const excelBuffer = await generateGstMismatchExcel(
    req.firmId,
    clientId,
    financialYear
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=GSTR2B_Reconciliation_${financialYear}.xlsx`
  );

  return res.send(Buffer.from(excelBuffer));
});
