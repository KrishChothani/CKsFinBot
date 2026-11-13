/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getComplianceCalendar,
  seedCalendar,
  fileTask,
  createCustomComplianceTask,
} from "../Controllers/compliance.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/calendar", getComplianceCalendar);
router.post("/seed", seedCalendar);
router.post("/file/:taskId", fileTask);
router.post("/custom-task", createCustomComplianceTask);

export default router;

