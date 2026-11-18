/** @format */

import { Router } from "express";
import { exportTallyXml } from "../controllers/export.controller.js";

const router = Router();

router.post("/tally", exportTallyXml);

export default router;

