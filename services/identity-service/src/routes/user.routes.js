/** @format */

import { Router } from "express";
import { register, login, refresh, getCurrentUser } from "../controllers/user.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refresh);
router.get("/current-user", getCurrentUser);
router.get("/me", getCurrentUser);

export default router;

