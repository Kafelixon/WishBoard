import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { poolDb } from "../_lib/db.js";
import { HttpError } from "../_lib/ops.js";
import { takeRateLimit } from "../_lib/rateLimit.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = poolDb(pool);
const key = `test:${randomUUID()}`;

after(async () => {
  await pool.query("delete from rate_limits where key = $1", [key]);
  await pool.end();
});

const tooMany = (e: unknown) => e instanceof HttpError && e.status === 429;

test("allows requests up to the limit, then rejects with 429", async () => {
  await takeRateLimit(db, key, 2, 60);
  await takeRateLimit(db, key, 2, 60);
  await assert.rejects(takeRateLimit(db, key, 2, 60), tooMany);
});

test("counts concurrent requests without letting extras through", async () => {
  await pool.query("delete from rate_limits where key = $1", [key]);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => takeRateLimit(db, key, 3, 60)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
});

test("starts a new window once the old one has passed", async () => {
  await pool.query("update rate_limits set window_start = now() - interval '61 seconds' where key = $1", [key]);
  await takeRateLimit(db, key, 3, 60);
  const { rows } = await pool.query<{ hits: number }>("select hits from rate_limits where key = $1", [key]);
  assert.equal(rows[0]?.hits, 1);
});
