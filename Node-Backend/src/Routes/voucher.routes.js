/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { requireRole } from "../Middlewares/rbac.middleware.js";
import {
  listVouchers,
  getVoucherById,
  voidVoucher,
} from "../Controllers/voucher.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenant);

router.route("/").get(listVouchers);
router.route("/:voucherId").get(getVoucherById);
router
  .route("/:voucherId/void")
  .post(requireRole(["Firm_Admin", "CA"]), voidVoucher);

export default router;

