/** @format */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { StorageProvider } from "./StorageProvider.js";

export class S3StorageProvider extends StorageProvider {
  constructor() {
    super("aws_s3");
    this.client = null;
    this.bucket = process.env.AWS_S3_BUCKET_NAME;
    this.region = process.env.AWS_REGION || "ap-south-1";

    if (this.isAvailable()) {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  isAvailable() {
    return Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME &&
      process.env.AWS_ACCESS_KEY_ID.trim() !== "" &&
      process.env.AWS_SECRET_ACCESS_KEY.trim() !== "" &&
      process.env.AWS_S3_BUCKET_NAME.trim() !== ""
    );
  }

  async upload(file) {
    if (!this.client) {
      throw new Error("AWS S3 client is not configured.");
    }

    const timestamp = Date.now();
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `documents/${timestamp}-${cleanFileName}`;
    const fileStream = fs.createReadStream(file.path);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: fileStream,
      ContentType: file.mimetype,
      ACL: "public-read",
    });

    await this.client.send(command);

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
    return {
      url: fileUrl,
      key: fileKey,
      provider: "aws_s3",
    };
  }

  async delete(key) {
    if (!this.client || !key) return false;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      console.warn(`[S3StorageProvider] Failed to delete key ${key}:`, err.message);
      return false;
    }
  }
}

