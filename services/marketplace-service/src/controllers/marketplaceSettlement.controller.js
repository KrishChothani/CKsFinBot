/** @format */

import { marketplaceRelay } from "../services/marketplaceRelay.service.js";
import { parseSettlementCsvRows } from "../services/marketplaceSettlement.service.js";

export const importSettlement = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"] || "firm-default";
  const clientId = req.clientId || req.headers["x-client-id"] || "client-default";
  const { marketplace = "AMAZON", rawCsv, rawData, settlementId } = req.body;

  let records = rawData || [];
  if (rawCsv && typeof rawCsv === "string") {
    records = parseSettlementCsvRows(rawCsv);
  }

  if (!records || records.length === 0) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "No settlement transaction rows provided.",
    });
  }

  try {
    const result = await marketplaceRelay.processSettlementImport({
      firmId,
      clientId,
      marketplace,
      rawData: records,
      settlementId,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        summary: result.report.summary,
        voucher: result.voucher,
      },
      message: `${marketplace} settlement processed with balanced double-entry voucher.`,
    });
  } catch (err) {
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message: err.message,
    });
  }
};

