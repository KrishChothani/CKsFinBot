/** @format */

import { Router } from "express";
import { generatePresignedUrl } from "../controllers/s3.controller.js";
import { jwtAuthMiddleware } from "@cksfinbot/shared-middleware";

const router = Router();

router.post("/generate-presigned-url", jwtAuthMiddleware(), generatePresignedUrl);

export default router;

