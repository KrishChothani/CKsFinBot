/** @format */

import { exportRelay } from "../services/exportRelay.service.js";

export const exportTallyXml = async (req, res) => {
  const firmId = req.firmId || req.headers["x-firm-id"] || "firm-default";
  const clientId = req.clientId || req.headers["x-client-id"] || "client-default";
  const { companyName, vouchers } = req.body;

  try {
    const result = await exportRelay.exportVouchers({
      firmId,
      clientId,
      companyName,
      vouchers,
    });

    res.set("Content-Type", "application/xml");
    res.set("Content-Disposition", `attachment; filename="tally_export_${Date.now()}.xml"`);
    return res.status(200).send(result.xmlString);
  } catch (err) {
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message: err.message,
    });
  }
};

