/** @format */

import { Router } from "express";
import {
  uploadDocuments,
  listDocuments,
  uploadDocumentsViaS3,
  updateDocumentExtractionWebhook,
  updateDocumentStatusWebhook,
} from "../controllers/document.controller.js";
import {
  jwtAuthMiddleware,
  tenantContextMiddleware,
} from "@cksfinbot/shared-middleware";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Protected document inbox query
router.get(
  "/",
  jwtAuthMiddleware(),
  tenantContextMiddleware({ requireClient: false }),
  listDocuments
);

// Protected bulk upload
router.post(
  "/upload",
  jwtAuthMiddleware(),
  tenantContextMiddleware({ requireClient: false }),
  upload.array("documents", 15),
  uploadDocuments
);

// Protected presigned S3 register
router.post(
  "/upload-s3",
  jwtAuthMiddleware(),
  tenantContextMiddleware({ requireClient: false }),
  uploadDocumentsViaS3
);

// Webhook endpoints
router.post("/:documentId/extraction/webhook", updateDocumentExtractionWebhook);
router.patch("/:documentId/status/webhook", updateDocumentStatusWebhook);

export default router;

