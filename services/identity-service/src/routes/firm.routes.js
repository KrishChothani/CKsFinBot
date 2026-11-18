/** @format */

import { Router } from "express";
import { createFirm, getFirm, updateFirmBranding } from "../controllers/firm.controller.js";

const router = Router();

router.post("/", createFirm);
router.get("/:id", getFirm);
router.patch("/:id/branding", updateFirmBranding);

export default router;

