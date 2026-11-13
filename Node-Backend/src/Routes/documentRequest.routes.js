/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  createRequest,
  listRequests,
  cancelRequest,
} from "../Controllers/documentRequest.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.post("/", createRequest);
router.get("/", listRequests);
router.post("/cancel/:requestId", cancelRequest);

export default router;

