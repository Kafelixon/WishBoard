/** Applies db/schema.sql (idempotent) over the direct connection. */
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
await pool.query(readFileSync("db/schema.sql", "utf8"));
const { rows } = await pool.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by 1",
);
console.log(rows.map((r) => String(r.table_name)).join(", "));
await pool.end();
