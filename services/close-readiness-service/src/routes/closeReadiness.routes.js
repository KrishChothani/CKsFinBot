/** @format */

import { Router } from "express";
import {
  getScore,
  getChasingCopy,
  getClientSummary,
  dispatchReminder,
} from "../controllers/closeReadiness.controller.js";

const router = Router();

router.get("/score", getScore);
router.post("/score", getScore);

router.get("/chasing-templates", getChasingCopy);
router.post("/chasing-templates", getChasingCopy);
router.get("/chasing-bundles", getChasingCopy); // API compatibility

router.get("/summary", getClientSummary);
router.post("/summary", getClientSummary);
router.get("/latest", getClientSummary); // API compatibility

router.post("/dispatch-reminder", dispatchReminder);

export default router;

