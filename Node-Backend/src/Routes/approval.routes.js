/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getApprovalQueue,
  approveVoucher,
  rejectVoucher,
} from "../Controllers/approval.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/queue", getApprovalQueue);
router.post("/approve/:voucherId", approveVoucher);
router.post("/reject/:voucherId", rejectVoucher);

export default router;

