/** @format */

import { v2 as cloudinary } from "cloudinary";
import { StorageProvider } from "./StorageProvider.js";

export class CloudinaryStorageProvider extends StorageProvider {
  constructor() {
    super("cloudinary");

    if (this.isAvailable()) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  isAvailable() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME.trim() !== "" &&
      process.env.CLOUDINARY_API_KEY.trim() !== "" &&
      process.env.CLOUDINARY_API_SECRET.trim() !== ""
    );
  }

  async upload(file) {
    if (!this.isAvailable()) {
      throw new Error("Cloudinary is not configured with valid credentials.");
    }

    const timestamp = Date.now();
    const cleanName = (file.originalname || "document").replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const publicId = `cksfinbot_docs/${timestamp}_${cleanName}`;

    const uploadOptions = {
      resource_type: "raw",
      public_id: publicId,
      use_filename: true,
      unique_filename: true,
      access_mode: "public",
    };

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);

    return {
      url: result.secure_url,
      key: result.public_id,
      provider: "cloudinary",
    };
  }

  async delete(publicId) {
    if (!this.isAvailable() || !publicId) return false;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      return true;
    } catch (err) {
      console.warn(`[CloudinaryStorageProvider] Failed to delete public_id ${publicId}:`, err.message);
      return false;
    }
  }
}

