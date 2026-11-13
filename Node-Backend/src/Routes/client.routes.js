/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { requireRole } from "../Middlewares/rbac.middleware.js";
import {
  createClient,
  listClients,
  getClientById,
  updateClient,
  listClientLedgers,
  createClientLedger,
} from "../Controllers/client.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenant);

router
  .route("/")
  .get(listClients)
  .post(requireRole(["Firm_Admin", "CA"]), createClient);

router
  .route("/:clientId")
  .get(getClientById)
  .put(requireRole(["Firm_Admin", "CA"]), updateClient);

router
  .route("/:clientId/ledgers")
  .get(listClientLedgers)
  .post(requireRole(["Firm_Admin", "CA", "Accountant"]), createClientLedger);

export default router;

