/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { requireRole } from "../Middlewares/rbac.middleware.js";
import {
  exportTallyXml,
  previewTallyXml,
  exportExcelRegister,
  exportZohoBooksCsv,
} from "../Controllers/export.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenant);

router
  .route("/tally")
  .get(requireRole(["Firm_Admin", "CA", "Accountant"]), exportTallyXml);

router
  .route("/tally/preview")
  .get(requireRole(["Firm_Admin", "CA", "Accountant"]), previewTallyXml);

router
  .route("/excel")
  .get(requireRole(["Firm_Admin", "CA", "Accountant"]), exportExcelRegister);

router
  .route("/zoho")
  .get(requireRole(["Firm_Admin", "CA", "Accountant"]), exportZohoBooksCsv);

export default router;

