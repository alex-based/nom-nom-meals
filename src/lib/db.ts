import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// Ensure the app_data table exists. Uses a single promise so concurrent
// requests at startup don't race each other to create the table.
let initPromise: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!initPromise) {
    initPromise = pool
      .query(
        `CREATE TABLE IF NOT EXISTS app_data (
          key        text        PRIMARY KEY,
          value      jsonb       NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`,
      )
      .then(() => undefined);
  }
  return initPromise;
}

export async function getPool(): Promise<Pool> {
  await ensureTable();
  return pool;
}
