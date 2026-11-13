/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  getProfitAndLoss,
  getBalanceSheetReport,
  getAgeing,
  getConsolidatedOverview,
} from "../Controllers/financialReports.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/pnl", getProfitAndLoss);
router.get("/balance-sheet", getBalanceSheetReport);
router.get("/ageing", getAgeing);
router.get("/consolidated", getConsolidatedOverview);

export default router;

