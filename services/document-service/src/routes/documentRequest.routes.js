/** @format */

import { Router } from "express";
import {
  createRequest,
  listRequests,
  cancelRequest,
} from "../controllers/documentRequest.controller.js";
import {
  jwtAuthMiddleware,
  tenantContextMiddleware,
} from "@cksfinbot/shared-middleware";

const router = Router();

router.use(jwtAuthMiddleware());
router.use(tenantContextMiddleware({ requireClient: false }));

router.post("/", createRequest);
router.get("/", listRequests);
router.post("/cancel/:requestId", cancelRequest);

export default router;

