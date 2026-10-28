import { Pool } from "pg";
import { createRemoteJWKSet } from "jose";
import { attachDatabasePool } from "@vercel/functions";
import { createVerifier, FIREBASE_JWKS_URL, type Caller } from "./_lib/auth";
import { poolDb } from "./_lib/db";
import { handleOp, HttpError, type Body } from "./_lib/ops";

const projectId =
  process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_APP_FIREBASE_PROJECT_ID ?? "";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);
const db = poolDb(pool);
const verify = createVerifier(projectId, createRemoteJWKSet(new URL(FIREBASE_JWKS_URL)));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export async function POST(request: Request): Promise<Response> {
  try {
    let caller: Caller | null = null;
    const header = request.headers.get("authorization");
    if (header) {
      try {
        caller = await verify(header.replace(/^Bearer\s+/i, ""));
      } catch {
        throw new HttpError(401, "Invalid or expired session.");
      }
    }
    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body) throw new HttpError(400, "Invalid JSON body.");
    return json(200, { data: await handleOp(db, caller, body) });
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    console.error("wishlists api failed", error);
    return json(500, { error: "Something went wrong." });
  }
}
