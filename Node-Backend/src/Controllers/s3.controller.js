/** @format */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { storageManager } from "../Services/Storage/StorageManager.js";

/**
 * Generate presigned URL for S3 upload
 * If AWS S3 is not available (e.g. running on Cloudinary fallback),
 * informs the client to route upload via direct multipart endpoint.
 */
const generatePresignedUrl = AsyncHandler(async (req, res) => {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    throw new ApiError(400, "fileName and fileType are required");
  }

  // Check if AWS S3 is configured
  if (!storageManager.s3Provider.isAvailable()) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          directUploadRequired: true,
          provider: storageManager.getActiveProvider().name,
        },
        "AWS S3 not configured. Using direct upload via Cloudinary/StorageManager."
      )
    );
  }

  // Initialize S3 client on demand
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const timestamp = Date.now();
  const fileKey = `documents/${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
    ACL: "public-read",
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${fileKey}`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          uploadUrl,
          fileUrl,
          fileKey,
          directUploadRequired: false,
        },
        "Presigned URL generated successfully"
      )
    );
  } catch (err) {
    console.warn("[s3.controller] Failed to generate presigned S3 URL:", err.message);
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          directUploadRequired: true,
          provider: "cloudinary",
        },
        "Falling back to direct multipart upload."
      )
    );
  }
});

export { generatePresignedUrl };
