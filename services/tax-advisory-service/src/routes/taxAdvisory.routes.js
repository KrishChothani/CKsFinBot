/** @format */

import { Router } from "express";
import {
  getRules,
  evaluateVoucher,
  getComplianceCalendar,
} from "../controllers/taxAdvisory.controller.js";

const router = Router();

router.get("/rules", getRules);
router.post("/evaluate", evaluateVoucher);
router.get("/compliance-calendar", getComplianceCalendar);

export default router;

