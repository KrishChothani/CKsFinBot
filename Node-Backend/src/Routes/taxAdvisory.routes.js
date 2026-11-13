/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getTaxAdvisorySummary,
  getMsmeTracker,
  getTaxRules,
} from "../Controllers/taxAdvisory.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/summary", getTaxAdvisorySummary);
router.get("/msme-tracker", getMsmeTracker);
router.get("/rules", getTaxRules);

export default router;

