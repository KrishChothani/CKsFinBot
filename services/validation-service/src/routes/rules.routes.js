/** @format */

import { Router } from "express";
import { evaluateRules, listRules } from "../controllers/rules.controller.js";

const router = Router();

router.get("/", listRules);
router.post("/evaluate", evaluateRules);

export default router;

