/** @format */

import { S3StorageProvider } from "./S3StorageProvider.js";
import { CloudinaryStorageProvider } from "./CloudinaryStorageProvider.js";
import { LocalStorageProvider } from "./LocalStorageProvider.js";

/**
 * StorageManager (Strategy Pattern Context + Multi-Cloud Provider Factory)
 *
 * Prioritized fallback:
 *   1. AWS S3 (Production standard)
 *   2. Cloudinary (Cloud fallback)
 *   3. Local Disk (Development / Container storage fallback)
 */
class StorageManager {
  constructor() {
    this.s3Provider = new S3StorageProvider();
    this.cloudinaryProvider = new CloudinaryStorageProvider();
    this.localProvider = new LocalStorageProvider();
  }

  getActiveProvider() {
    if (this.s3Provider.isAvailable()) {
      return this.s3Provider;
    }
    if (this.cloudinaryProvider.isAvailable()) {
      return this.cloudinaryProvider;
    }
    return this.localProvider;
  }

  async upload(file) {
    const primary = this.getActiveProvider();

    try {
      return await primary.upload(file);
    } catch (primaryError) {
      console.warn(
        `[StorageManager] Primary provider (${primary.name}) failed: ${primaryError.message}. Initiating fallback...`
      );

      if (primary === this.s3Provider && this.cloudinaryProvider.isAvailable()) {
        try {
          return await this.cloudinaryProvider.upload(file);
        } catch (cloudErr) {
          console.warn(`[StorageManager] Cloudinary fallback failed: ${cloudErr.message}`);
        }
      }

      return await this.localProvider.upload(file);
    }
  }

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

