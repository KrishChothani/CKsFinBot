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
    return true; // Local disk fallback is always available
  }

  async upload(file) {
    const timestamp = Date.now();
    const cleanFileName = `${timestamp}-${(file.originalname || "document").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const destinationPath = path.join(this.uploadDir, cleanFileName);

    if (file.path && fs.existsSync(file.path)) {
      await fs.promises.copyFile(file.path, destinationPath);
    } else if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8002}`;
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

