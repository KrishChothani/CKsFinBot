/** @format */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Rule } from "../Models/rule.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, "..", "Rules", "registry.json");

/**
 * Loads and seeds rules from registry.json into MongoDB.
 */
export async function seedRulesRegistry() {
  const fileContent = fs.readFileSync(REGISTRY_PATH, "utf-8");
  const rules = JSON.parse(fileContent);

  const seeded = [];
  for (const r of rules) {
    const existing = await Rule.findOne({ rule_id: r.rule_id });
    if (!existing) {
      const created = await Rule.create(r);
      seeded.push(created);
    } else {
      // Update metadata while keeping any verified status if already reviewed
      existing.title = r.title;
      existing.description = r.description;
      existing.jurisdiction = r.jurisdiction;
      existing.source_url = r.source_url;
      existing.test_vectors = r.test_vectors;
      await existing.save();
      seeded.push(existing);
    }
  }
  return seeded;
}

/**
 * Returns all rules. If DB is empty, seeds from registry.json automatically.
 */
export async function getAllRules(filter = {}) {
  let count = await Rule.countDocuments();
  if (count === 0) {
    await seedRulesRegistry();
  }
  return Rule.find(filter).sort({ rule_id: 1 });
}

/**
 * Verifies a rule with CA attribution.
 */
export async function verifyRule(ruleId, reviewerName) {
  const rule = await Rule.findOne({ rule_id: ruleId });
  if (!rule) {
    throw new Error(`Rule ${ruleId} not found in registry.`);
  }

  rule.status = "verified";
  rule.reviewer_name = reviewerName || "Verified CA";
  rule.reviewed_on = new Date();
  rule.changelog.push({
    version: rule.version,
    date: new Date().toISOString().split("T")[0],
    author: reviewerName || "Verified CA",
    changeReason: "Formal verification by Chartered Accountant against official statutory source.",
  });

  return rule.save();
}

export default {
  seedRulesRegistry,
  getAllRules,
  verifyRule,
};

