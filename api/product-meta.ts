import { Pool } from "pg";
import { createRemoteJWKSet } from "jose";
import { attachDatabasePool } from "@vercel/functions";
import { createVerifier, FIREBASE_JWKS_URL } from "./_lib/auth.js";
import { poolDb } from "./_lib/db.js";
import { HttpError } from "./_lib/ops.js";
import { fetchPage, parseProductMeta } from "./_lib/productMeta.js";
import { takeRateLimit } from "./_lib/rateLimit.js";

const projectId =
  process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_APP_FIREBASE_PROJECT_ID ?? "";
const verify = createVerifier(projectId, createRemoteJWKSet(new URL(FIREBASE_JWKS_URL)));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);
const db = poolDb(pool);

/** Lookups per user per window: plenty for filling in a wishlist, too few to use us as a crawler. */
const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW_SECONDS = 600;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Reads a product page's image, name and price. Signed-in users only, since it makes outbound requests. */
export async function POST(request: Request): Promise<Response> {
  try {
    const header = request.headers.get("authorization");
    if (!header) throw new HttpError(401, "Sign in to fetch product details.");
    const caller = await verify(header.replace(/^Bearer\s+/i, "")).catch(() => {
      throw new HttpError(401, "Invalid or expired session.");
    });
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    if (typeof body?.url !== "string") throw new HttpError(400, "Missing link.");
    await takeRateLimit(db, `product-meta:${caller.uid}`, LOOKUP_LIMIT, LOOKUP_WINDOW_SECONDS);
    const { html, url } = await fetchPage(body.url.trim());
    return json(200, { data: parseProductMeta(html, url) });
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    console.error("product-meta failed", error);
    return json(500, { error: "Something went wrong." });
  }
}
