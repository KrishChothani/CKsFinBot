/** @format */

import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  importMarketplaceSettlement,
  listMarketplaceSettlements,
  postVoucherForSettlement,
  reconcileSettlement,
  getCandidateBankCredits,
} from "../Controllers/marketplaceSettlement.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.post("/import", upload.single("file"), importMarketplaceSettlement);
router.get("/list", listMarketplaceSettlements);
router.post("/:settlementId/voucher", postVoucherForSettlement);
router.post("/:settlementId/reconcile", reconcileSettlement);
router.get("/candidate-bank-credits", getCandidateBankCredits);

export default router;

