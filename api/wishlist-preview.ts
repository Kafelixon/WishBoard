import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { poolDb } from "./_lib/db.js";
import { loadPreview, previewLanguage, renderPreview, type WishlistPreview } from "./_lib/preview.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);
const db = poolDb(pool);

/**
 * Link previews for /wishlist/:id. vercel.json rewrites only link-preview crawlers here
 * (WhatsApp, Messenger, Slack, ...); people still get the static app.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const lang = previewLanguage(request.headers.get("accept-language"));
  let preview: WishlistPreview | null = null;
  let status = 200;
  if (id && id.length <= 200) {
    try {
      preview = await loadPreview(db, id);
      if (!preview) status = 404;
    } catch (error) {
      // Still answer with the site's own tags rather than an error page.
      console.error("wishlist preview failed", error);
    }
  }
  const pageUrl = `${url.origin}/wishlist/${encodeURIComponent(id)}`;
  return new Response(renderPreview(preview, pageUrl, lang), {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      vary: "accept-language",
    },
  });
}
