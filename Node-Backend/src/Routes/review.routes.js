/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { requireRole } from "../Middlewares/rbac.middleware.js";
import {
  getReviewQueue,
  getDocumentReviewDetail,
  updateExtractedFields,
  approveAndGenerateVoucher,
  rejectDocument,
} from "../Controllers/review.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenant);

router.route("/queue").get(getReviewQueue);
router.route("/:documentId").get(getDocumentReviewDetail);
router
  .route("/:documentId/update")
  .put(requireRole(["Firm_Admin", "CA", "Accountant"]), updateExtractedFields);
router
  .route("/:documentId/approve")
  .post(requireRole(["Firm_Admin", "CA", "Accountant"]), approveAndGenerateVoucher);
router
  .route("/:documentId/reject")
  .post(requireRole(["Firm_Admin", "CA", "Accountant"]), rejectDocument);

export default router;

