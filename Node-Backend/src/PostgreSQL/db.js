/** @format */

let pool = null;
let isPostgresAvailable = null;

const connectionString =
  process.env.POSTGRES_URI ||
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/cksfinbot";

async function getPool() {
  if (pool) return pool;
  try {
    const pg = await import("pg");
    const Pool = pg.default?.Pool || pg.Pool;
    if (!Pool) return null;
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    return pool;
  } catch (err) {
    return null;
  }
}

export async function checkPostgresConnection() {
  if (isPostgresAvailable !== null) return isPostgresAvailable;
  try {
    const p = await getPool();
    if (!p) {
      isPostgresAvailable = false;
      return false;
    }
    const client = await p.connect();
    client.release();
    isPostgresAvailable = true;
    console.log("PostgreSQL Connected for Ledger Integrity.");
    return true;
  } catch (err) {
    isPostgresAvailable = false;
    return false;
  }
}

/**
 * Executes a scoped query with tenant session variables for RLS.
 */
export async function query(text, params = [], tenantContext = {}) {
  const p = await getPool();
  if (!p) {
    throw new Error("PostgreSQL pool is unavailable in this environment.");
  }
  const client = await p.connect();
  try {
    if (tenantContext.firmId && tenantContext.clientId) {
      await client.query("SELECT set_config('app.current_firm_id', $1, true)", [
        String(tenantContext.firmId),
      ]);
      await client.query("SELECT set_config('app.current_client_id', $1, true)", [
        String(tenantContext.clientId),
      ]);
    }
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Runs operations within an atomic database transaction.
 */
export async function withTransaction(callback, tenantContext = {}) {
  const p = await getPool();
  if (!p) {
    throw new Error("PostgreSQL pool is unavailable in this environment.");
  }
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    if (tenantContext.firmId && tenantContext.clientId) {
      await client.query("SELECT set_config('app.current_firm_id', $1, true)", [
        String(tenantContext.firmId),
      ]);
      await client.query("SELECT set_config('app.current_client_id', $1, true)", [
        String(tenantContext.clientId),
      ]);
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export default {
  query,
  withTransaction,
  checkPostgresConnection,
};
