/** @format */

import { Router } from "express";
import { executeReconciliation, takeIMSAction } from "../controllers/gstRecon.controller.js";

const router = Router();

router.post("/run", executeReconciliation);
router.post("/ims-action", takeIMSAction);

export default router;

