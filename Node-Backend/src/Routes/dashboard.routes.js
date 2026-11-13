/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import {
  getClientDashboard,
  getFirmOverview,
} from "../Controllers/dashboard.controller.js";

const router = Router();

router.use(verifyJWT);
router.use(resolveTenant);

router.route("/client").get(getClientDashboard);
router.route("/firm").get(getFirmOverview);

export default router;

