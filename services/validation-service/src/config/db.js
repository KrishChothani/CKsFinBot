/** @format */

import pkg from "pg";
const { Pool } = pkg;
import { createLogger } from "@cksfinbot/shared-logger";

const logger = createLogger("validation-service:db");

const pool = new Pool({
  connectionString:
    process.env.VALIDATION_DB_URL ||
    process.env.POSTGRES_URL ||
    "postgresql://postgres:postgres@localhost:5432/cksfinbot",
  connectionTimeoutMillis: 3000,
});

pool.on("error", (err) => {
  logger.warn(`PostgreSQL background connection error: ${err.message}`);
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    logger.info("Connected to PostgreSQL validation database successfully.");
    return true;
  } catch (err) {
    logger.warn(`PostgreSQL unavailable (${err.message}). Rules registry running with in-memory statutory definitions.`);
    return false;
  }
}

export { pool };

