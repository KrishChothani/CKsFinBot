/** @format */

import { S3StorageProvider } from "./S3StorageProvider.js";
import { CloudinaryStorageProvider } from "./CloudinaryStorageProvider.js";
import { LocalStorageProvider } from "./LocalStorageProvider.js";

/**
 * StorageManager (Strategy Pattern Context + Provider Factory)
 *
 * Automatically manages storage strategies with prioritized fallback:
 *   1. AWS S3 (if valid AWS credentials are configured in .env)
 *   2. Cloudinary (primary cloud alternative for Render / zero-AWS deployments)
 *   3. Local Disk (development fallback)
 *
 * Also implements automatic failover: if S3 encounters a runtime authorization /
 * connection error, it seamlessly attempts upload via Cloudinary.
 */
class StorageManager {
  constructor() {
    this.s3Provider = new S3StorageProvider();
    this.cloudinaryProvider = new CloudinaryStorageProvider();
    this.localProvider = new LocalStorageProvider();
  }

  /**
   * Determine the primary active provider based on environment configuration.
   * @returns {StorageProvider}
   */
  getActiveProvider() {
    if (this.s3Provider.isAvailable()) {
      return this.s3Provider;
    }
    if (this.cloudinaryProvider.isAvailable()) {
      return this.cloudinaryProvider;
    }
    return this.localProvider;
  }

  /**
   * Upload a file using the active strategy with automatic fallback.
   * @param {Object} file - Multer file object ({ path, originalname, mimetype, size })
   * @returns {Promise<{ url: string, key: string, provider: string }>}
   */
  async upload(file) {
    const primary = this.getActiveProvider();

    try {
      console.log(`[StorageManager] Attempting upload via primary provider: ${primary.name}`);
      return await primary.upload(file);
    } catch (primaryError) {
      console.warn(
        `[StorageManager] Primary provider (${primary.name}) failed: ${primaryError.message}. Initiating fallback...`
      );

      // Failover chain
      if (primary === this.s3Provider && this.cloudinaryProvider.isAvailable()) {
        try {
          console.log(`[StorageManager] Fallback: Uploading via Cloudinary...`);
          return await this.cloudinaryProvider.upload(file);
        } catch (cloudErr) {
          console.warn(`[StorageManager] Cloudinary fallback failed: ${cloudErr.message}`);
        }
      }

      // Final fallback: Local disk
      console.log(`[StorageManager] Final fallback: Uploading via Local Disk...`);
      return await this.localProvider.upload(file);
    }
  }

  /**
   * Delete a file by key or URL
   * @param {string} key
   * @param {string} providerName
   */
  async delete(key, providerName) {
    if (providerName === "aws_s3" && this.s3Provider.isAvailable()) {
      return await this.s3Provider.delete(key);
    }
    if (providerName === "cloudinary" && this.cloudinaryProvider.isAvailable()) {
      return await this.cloudinaryProvider.delete(key);
    }
    return await this.localProvider.delete(key);
  }
}

export const storageManager = new StorageManager();
export { S3StorageProvider, CloudinaryStorageProvider, LocalStorageProvider };

