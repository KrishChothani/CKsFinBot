/** @format */

import { Router } from "express";
import { importSettlement } from "../controllers/marketplaceSettlement.controller.js";

const router = Router();

router.post("/import", importSettlement);

export default router;

