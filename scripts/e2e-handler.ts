export {};
// Calls the real api/wishlists POST handler with a real Firebase ID token.
// node --env-file=.env --env-file=.env.local --import tsx scripts/e2e-handler.ts
const key = process.env.VITE_APP_FIREBASE_API_KEY ?? "";
const signIn = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
  { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "test@test.com", password: "test123", returnSecureToken: true }) },
);
const { idToken } = (await signIn.json()) as { idToken: string };
const { POST } = await import("../api/wishlists");

const call = async (op: Record<string, unknown>, token: string | null = idToken) => {
  const res = await POST(new Request("http://x/api/wishlists", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(op),
  }));
  return { status: res.status, body: (await res.json()) as { data?: unknown; error?: string } };
};

const created = await call({ op: "createWishlist", name: "e2e", author: "E2E", icon: "gift" });
// The op answers with the owner's wishlists, newest first.
const id = (created.body.data as { id: string }[])[0]?.id ?? "";
console.log("create", created.status);
console.log("add", (await call({ op: "addItem", wishlistId: id, item: { name: "Thing", price: 9.99, public: true } })).status);
console.log("anon view", JSON.stringify((await call({ op: "view", wishlistId: id }, null)).body));
console.log("bad token", (await call({ op: "listMine" }, "garbage")).status);
console.log("no token write", (await call({ op: "listMine" }, null)).status);
console.log("delete", (await call({ op: "deleteWishlist", id })).status);
process.exit(0);
