/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  syncPortalGstr2b,
  setGstCredentials,
} from "../Controllers/gsp.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.post("/sync-2b", syncPortalGstr2b);
router.post("/credentials", setGstCredentials);

export default router;

