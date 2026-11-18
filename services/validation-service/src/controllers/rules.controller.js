/** @format */

import { runDeterministicValidation } from "../rules/validator.engine.js";
import rulesRegistry from "../rules/registry.json" with { type: "json" };

export const evaluateRules = async (req, res) => {
  const { invoiceData, context } = req.body;

  if (!invoiceData) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Missing required 'invoiceData' payload.",
    });
  }

  const results = runDeterministicValidation(invoiceData, context || {});

  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: {
      results,
      summary: {
        totalRules: results.length,
        passed: results.filter((r) => r.status === "pass").length,
        failed: results.filter((r) => r.status === "fail").length,
        warnings: results.filter((r) => r.status === "warning").length,
        notChecked: results.filter((r) => r.status === "not-checked").length,
      },
    },
    message: "Statutory rules evaluated deterministically.",
  });
};

export const listRules = async (req, res) => {
  return res.status(200).json({
    success: true,
    statusCode: 200,
    data: rulesRegistry,
    message: "Active statutory rules loaded successfully.",
  });
};

