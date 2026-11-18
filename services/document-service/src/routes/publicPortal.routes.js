/** @format */

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  getPublicPortalDetails,
  uploadViaPublicPortal,
} from "../controllers/publicPortal.controller.js";

const router = Router();

// Public portal routes (No JWT required, secured by 32-character single-use / time-limited tokens)
router.get("/:token", getPublicPortalDetails);
router.post("/:token/upload", upload.single("file"), uploadViaPublicPortal);

export default router;

