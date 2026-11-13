/** @format */

import fs from "fs";
import path from "path";
import { StorageProvider } from "./StorageProvider.js";

export class LocalStorageProvider extends StorageProvider {
  constructor() {
    super("local_disk");
    this.uploadDir = path.resolve(process.cwd(), "Public", "Uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  isAvailable() {
    return true; // Local disk is always available
  }

  async upload(file) {
    const timestamp = Date.now();
    const cleanFileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const destinationPath = path.join(this.uploadDir, cleanFileName);

    // Copy from temporary path to permanent uploads directory
    await fs.promises.copyFile(file.path, destinationPath);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
    const fileUrl = `${baseUrl}/uploads/${cleanFileName}`;

    return {
      url: fileUrl,
      key: cleanFileName,
      localPath: destinationPath,
      provider: "local_disk",
    };
  }

  async delete(key) {
    if (!key) return false;
    try {
      const filePath = path.join(this.uploadDir, path.basename(key));
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorageProvider] Failed to delete file ${key}:`, err.message);
      return false;
    }
  }
}

