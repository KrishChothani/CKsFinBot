/** @format */

import { getActiveTaxRules, evaluateVoucherTaxRisks } from "../services/taxAdvisory.service.js";
import { generateComplianceCalendar } from "../services/compliance.service.js";

export const getRules = (req, res) => {
  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: getActiveTaxRules(),
    message: "Statutory tax rules loaded.",
  });
};

export const evaluateVoucher = (req, res) => {
  const { voucher } = req.body;
  if (!voucher) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Voucher object is required.",
    });
  }

  const results = evaluateVoucherTaxRisks(voucher);
  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: results,
    message: "Voucher tax compliance evaluated.",
  });
};

export const getComplianceCalendar = (req, res) => {
  const { financialYear = "2026-2027" } = req.query;
  const calendar = generateComplianceCalendar(financialYear);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: calendar,
    message: `Compliance calendar generated for ${financialYear}.`,
  });
};

