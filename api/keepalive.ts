import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);

/** Daily Vercel cron: wakes the database so it never sits suspended for long. */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await pool.query("select 1");
    return Response.json({ ok: true });
  } catch (error) {
    console.error("keepalive failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
