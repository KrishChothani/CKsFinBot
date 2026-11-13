/** @format */

import { Router } from "express";
import {
  uploadDocuments,
  listDocuments,
  uploadDocumentsViaS3,
  updateDocumentExtractionWebhook,
  updateDocumentStatusWebhook,
} from "../Controllers/document.controller.js";
import { verifyJWT } from "../Middlewares/auth.middleware.js";
import { resolveTenant } from "../Middlewares/tenant.middleware.js";
import { upload } from "../Middlewares/multer.middleware.js";

const router = Router();

// Document Inbox query
router.get("/", verifyJWT, resolveTenant, listDocuments);

// Document upload endpoints
router.post(
  "/upload",
  verifyJWT,
  resolveTenant,
  upload.array("documents", 15),
  uploadDocuments
);

// Presigned S3 direct uploads
router.post("/upload-s3", verifyJWT, resolveTenant, uploadDocumentsViaS3);

// Webhooks from Python AI service
router.post("/:documentId/extraction/webhook", updateDocumentExtractionWebhook);
router.patch("/:documentId/status/webhook", updateDocumentStatusWebhook);

export default router;
