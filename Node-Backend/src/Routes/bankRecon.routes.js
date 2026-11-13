/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenantContext } from "../Middlewares/tenant.middleware.js";
import {
  listBankTransactions,
  triggerAutoReconciliation,
  confirmTransactionMatch,
  unreconcileTransaction,
  getBrsSummary,
} from "../Controllers/bankRecon.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenantContext);

router.get("/transactions", listBankTransactions);
router.post("/auto-reconcile", triggerAutoReconciliation);
router.post("/confirm-match", confirmTransactionMatch);
router.post("/unreconcile/:transactionId", unreconcileTransaction);
router.get("/brs-summary", getBrsSummary);

export default router;

