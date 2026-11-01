import { Pool } from "pg";
import { createRemoteJWKSet } from "jose";
import { attachDatabasePool } from "@vercel/functions";
import { createVerifier, FIREBASE_JWKS_URL, firebaseProjectId, type Caller } from "./_lib/auth.js";
import { poolDb } from "./_lib/db.js";
import { handleOp, HttpError, type Body } from "./_lib/ops.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);
const db = poolDb(pool);
const verify = createVerifier(firebaseProjectId(), createRemoteJWKSet(new URL(FIREBASE_JWKS_URL)));

let coldInstance = true;

/** Server-Timing entries (ms) so slow requests can be split into token check, query and cold start. */
const serverTiming = (timings: Record<string, number>) =>
  Object.entries(timings)
    .map(([name, ms]) => `${name};dur=${ms.toFixed(1)}`)
    .join(", ");

const json = (status: number, body: unknown, timings: Record<string, number> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "server-timing": serverTiming(timings),
    },
  });

export async function POST(request: Request): Promise<Response> {
  const start = performance.now();
  const timings: Record<string, number> = { cold: coldInstance ? 1 : 0 };
  coldInstance = false;
  try {
    let caller: Caller | null = null;
    const header = request.headers.get("authorization");
    if (header) {
      try {
        caller = await verify(header.replace(/^Bearer\s+/i, ""));
      } catch {
        throw new HttpError(401, "Invalid or expired session.");
      } finally {
        timings.auth = performance.now() - start;
      }
    }
    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body) throw new HttpError(400, "Invalid JSON body.");
    const opStart = performance.now();
    const data = await handleOp(db, caller, body);
    timings.op = performance.now() - opStart;
    timings.total = performance.now() - start;
    return json(200, { data }, timings);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message }, timings);
    console.error("wishlists api failed", error);
    return json(500, { error: "Something went wrong." });
  }
}
