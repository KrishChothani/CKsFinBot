/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getLatestClientSummary,
  refreshClientSummary,
  signOffSummary,
  revokeSummary,
} from "../Controllers/clientSummary.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/latest", getLatestClientSummary);
router.post("/refresh", refreshClientSummary);
router.post("/:id/sign-off", signOffSummary);
router.post("/:id/revoke", revokeSummary);

export default router;

