/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import { getFirmAnalytics } from "../Controllers/firmAnalytics.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/metrics", getFirmAnalytics);

export default router;

