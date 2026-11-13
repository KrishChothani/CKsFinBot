/** @format */

import { Router } from "express";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import {
  getRules,
  seedRules,
  updateRuleVerification,
} from "../Controllers/rules.controller.js";

const router = Router();

// Can view rules publicly or authenticated
router.route("/").get(getRules);
router.route("/seed").post(verifyJWT, seedRules);
router.route("/:ruleId/verify").patch(verifyJWT, updateRuleVerification);

export default router;

