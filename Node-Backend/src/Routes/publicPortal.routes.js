/** @format */

import { Router } from "express";
import { upload } from "../Middlewares/multer.middleware.js";
import {
  getPublicPortalDetails,
  uploadViaPublicPortal,
} from "../Controllers/publicPortal.controller.js";

const router = Router();

router.get("/:token", getPublicPortalDetails);
router.post("/:token/upload", upload.single("file"), uploadViaPublicPortal);

export default router;

