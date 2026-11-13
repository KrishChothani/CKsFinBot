/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getCloseReadinessReport,
  getChasingBundles,
} from "../Controllers/closeReadiness.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/score", getCloseReadinessReport);
router.get("/chasing-bundles", getChasingBundles);

export default router;

