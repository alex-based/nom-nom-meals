import { getPool } from "@/lib/db";

const DATA_KEY = "household";

export async function getData(): Promise<unknown> {
  const pool = await getPool();
  const result = await pool.query<{ value: unknown }>(
    "SELECT value FROM app_data WHERE key = $1",
    [DATA_KEY],
  );
  return result.rows[0]?.value ?? null;
}

export async function setData(data: unknown): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO app_data (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
    [DATA_KEY, JSON.stringify(data)],
  );
}
