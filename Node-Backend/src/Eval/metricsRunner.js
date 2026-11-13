/** @format */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CASES_DIR = path.join(__dirname, "golden", "cases");

/**
 * Loads all golden ground-truth cases.
 */
export function loadGoldenCases() {
  if (!fs.existsSync(CASES_DIR)) {
    return [];
  }
  const files = fs.readdirSync(CASES_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(CASES_DIR, f), "utf-8");
    return JSON.parse(raw);
  });
}

/**
 * Evaluates predictions against golden ground truth.
 *
 * @param {Array} casesWithPredictions - Array of { groundTruth, prediction, validationStatus, autoApproved }
 */
export function evaluatePredictions(casesWithPredictions) {
  const trackedFields = [
    "invoiceNumber",
    "invoiceDate",
    "supplierGstin",
    "taxableAmountPaise",
    "totalTaxPaise",
    "grandTotalPaise",
  ];

  const fieldStats = {};
  trackedFields.forEach((f) => {
    fieldStats[f] = { total: 0, correct: 0 };
  });

  let totalDocs = casesWithPredictions.length;
  let fullyCorrectDocs = 0;
  let abstainedDocs = 0; // Flagged for human review
  let falseAcceptedDocs = 0; // Contained errors, but auto-approval was green

  casesWithPredictions.forEach(({ groundTruth, prediction, validationStatus, autoApproved }) => {
    let docAllCorrect = true;

    trackedFields.forEach((field) => {
      const expected = groundTruth[field];
      const actual = prediction ? prediction[field] : undefined;
      fieldStats[field].total += 1;

      const isMatch =
        expected !== undefined &&
        actual !== undefined &&
        String(expected).trim().toLowerCase() === String(actual).trim().toLowerCase();

      if (isMatch) {
        fieldStats[field].correct += 1;
      } else {
        docAllCorrect = false;
      }
    });

    if (docAllCorrect) {
      fullyCorrectDocs += 1;
    }

    // Check review vs auto-approval
    if (validationStatus === "NEEDS_REVIEW" || !autoApproved) {
      abstainedDocs += 1;
    }

    // Critical Fintech Metric: False-Accept Rate
    // If doc was NOT fully correct, but system auto-approved or validation reported pass
    if (!docAllCorrect && autoApproved) {
      falseAcceptedDocs += 1;
    }
  });

  const fieldAccuracy = {};
  let totalFieldChecks = 0;
  let totalFieldCorrect = 0;

  trackedFields.forEach((f) => {
    const s = fieldStats[f];
    const acc = s.total > 0 ? s.correct / s.total : 0;
    fieldAccuracy[f] = Math.round(acc * 1000) / 1000;
    totalFieldChecks += s.total;
    totalFieldCorrect += s.correct;
  });

  const overallFieldAccuracy =
    totalFieldChecks > 0 ? Math.round((totalFieldCorrect / totalFieldChecks) * 1000) / 1000 : 0;
  const documentFullyCorrectRate =
    totalDocs > 0 ? Math.round((fullyCorrectDocs / totalDocs) * 1000) / 1000 : 0;
  const abstentionRate =
    totalDocs > 0 ? Math.round((abstainedDocs / totalDocs) * 1000) / 1000 : 0;
  const falseAcceptRate =
    totalDocs > 0 ? Math.round((falseAcceptedDocs / totalDocs) * 1000) / 1000 : 0;

  return {
    totalEvaluatedDocuments: totalDocs,
    overallFieldAccuracy,
    documentFullyCorrectRate,
    abstentionRate,
    falseAcceptRate,
    fieldLevelBreakdown: fieldAccuracy,
  };
}

export default {
  loadGoldenCases,
  evaluatePredictions,
};

