/** @format */

import { Router } from "express";
import {
  getVouchers,
  postVoucher,
  approveVoucher,
} from "../controllers/voucher.controller.js";
import {
  jwtAuthMiddleware,
  tenantContextMiddleware,
} from "@cksfinbot/shared-middleware";

const router = Router();

router.get("/", getVouchers);
router.post("/", postVoucher);
router.post("/:voucherId/approve", approveVoucher);

export default router;

