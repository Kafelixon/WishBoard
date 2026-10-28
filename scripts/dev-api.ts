/** Local stand-in for Vercel: serves api/wishlists on :3001 (Vite proxies /api to it). */
import { createServer } from "node:http";
import { POST } from "../api/wishlists.js";

createServer((req, res) => {
  void (async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
    }
    const response = await POST(
      new Request("http://localhost/api/wishlists", {
        method: "POST",
        headers,
        body: Buffer.concat(chunks),
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  })();
}).listen(3001, () => {
  console.log("dev api on http://localhost:3001");
});
