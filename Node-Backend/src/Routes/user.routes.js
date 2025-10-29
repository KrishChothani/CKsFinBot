/** @format */

import { Router } from "express";
import {
  getCurrentUser,
  getUserProfile,
  healthCheck,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetPassword,
  sendResetPasswordEmail,
  updateaccountDetails,
  verifyEmail,
} from "../Controllers/user.controller.js";
import { verifyJWT } from "../Middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

//secured routes

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
// router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateaccountDetails);
router.route("/verify-email").get(verifyEmail);
router.route("/healthcheck").get(verifyJWT, healthCheck);
router.route("/resend-email-verication").post(resendEmailVerification);
router.route("/send-reset-password-link").post(sendResetPasswordEmail);
router.route("/reset-password").post(resetPassword);
router.route(`/profile/:userId`).get(getUserProfile);

export default router;
