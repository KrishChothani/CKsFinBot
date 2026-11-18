/** @format */

import mongoose from "mongoose";
import { createLogger } from "@cksfinbot/shared-logger";

const logger = createLogger("identity-service:db");

export async function connectDB() {
  const uri =
    process.env.IDENTITY_DB_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/cksfinbot_identity";

  try {
    const connectionInstance = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected successfully: ${connectionInstance.connection.host}/${connectionInstance.connection.name}`);
    return connectionInstance;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

