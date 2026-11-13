/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { requireRole } from "../Middlewares/rbac.middleware.js";
import {
  getCurrentFirm,
  updateFirm,
  listTeamMembers,
  addTeamMember,
} from "../Controllers/firm.controller.js";
import {
  getPracticeBranding,
  updatePracticeBranding,
} from "../Controllers/clientSummary.controller.js";

const router = Router();

// Apply auth & tenant resolution to all firm routes
router.use(verifyJWT);
router.use(resolveTenant);

router.route("/current").get(getCurrentFirm);
router.route("/current").put(requireRole(["Firm_Admin"]), updateFirm);
router.route("/team").get(listTeamMembers);
router.route("/team").post(requireRole(["Firm_Admin"]), addTeamMember);

// Practice White-Label Branding routes
router.route("/branding").get(getPracticeBranding);
router.route("/branding").put(requireRole(["Firm_Admin", "CA"]), updatePracticeBranding);

export default router;

