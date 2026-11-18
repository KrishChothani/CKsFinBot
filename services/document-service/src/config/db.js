/** @format */

import mongoose from "mongoose";
import { createLogger } from "@cksfinbot/shared-logger";

const logger = createLogger("document-service:db");

export async function connectDB() {
  const uri =
    process.env.DOCUMENT_DB_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/cksfinbot_documents";

  try {
    const connectionInstance = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected successfully: ${connectionInstance.connection.host}/${connectionInstance.connection.name}`);
    return connectionInstance;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // In production or test environments where local Mongo is not running yet,
    // do not abruptly crash test suites; log warning.
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

