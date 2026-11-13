/** @format */

import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  importGstr2b,
  getGstReconciliation,
  createVoucherFrom2b,
  downloadGstMismatchExcel,
  recordImsAction,
} from "../Controllers/gstRecon.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.post("/import", upload.single("file"), importGstr2b);
router.get("/report", getGstReconciliation);
router.post("/ims-action", recordImsAction);
router.post("/create-voucher/:gstr2bId", createVoucherFrom2b);
router.get("/export-excel", downloadGstMismatchExcel);

export default router;

