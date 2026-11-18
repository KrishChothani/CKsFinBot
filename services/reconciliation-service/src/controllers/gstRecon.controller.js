/** @format */

import { reconRelay } from "../services/reconRelay.service.js";

export const executeReconciliation = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"];
  const clientId = req.clientId || req.headers["x-client-id"];

  try {
    const result = await reconRelay.runReconciliation({
      firmId,
      clientId,
      gstr2bList: req.body.gstr2bRecords || [],
      booksList: req.body.booksRecords || [],
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: result.reconResults,
      message: "GSTR-2B reconciliation completed successfully.",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: err.message,
    });
  }
};

export const takeIMSAction = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"];
  const clientId = req.clientId || req.headers["x-client-id"];
  const { invoiceNumber, action, remarks } = req.body;

  if (!invoiceNumber || !action) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "invoiceNumber and action are required.",
    });
  }

  try {
    const event = await reconRelay.recordIMSAction({
      firmId,
      clientId,
      invoiceNumber,
      action,
      remarks,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: event.payload,
      message: `IMS action '${action}' recorded.`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: err.message,
    });
  }
};

