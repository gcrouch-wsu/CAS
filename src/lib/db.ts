import { Pool } from "pg";
import type { PoolConfig } from "pg";

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

const DEFAULT_POOL_OPTIONS = {
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
} satisfies Pick<PoolConfig, "max" | "idleTimeoutMillis" | "connectionTimeoutMillis">;

export function getPool(): Pool {
  if (!globalForDb.pool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set.");
    }
    globalForDb.pool = new Pool({
      connectionString,
      ...DEFAULT_POOL_OPTIONS,
    });
  }
  return globalForDb.pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}
