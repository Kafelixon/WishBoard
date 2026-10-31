# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pinned in `package.json`; the README's `npm` instructions are outdated).

```bash
pnpm install
pnpm dev        # Vite dev server on http://localhost:5173
pnpm build      # tsc && vite build -> dist/
pnpm lint       # eslint . --max-warnings 0 (warnings fail the build)
pnpm preview
```

There is no test runner configured. `pnpm build` (type-check) and `pnpm lint` are the verification steps; CI runs ESLint (`.github/workflows/eslint.yml`); deployment is Vercel.

ESLint uses `typescript-eslint` **strictTypeChecked** + stylistic, `@eslint-react` strict, react-hooks and jsx-a11y strict, with `reportUnusedDisableDirectives: "error"`. Unused vars must be prefixed with `_`.

## Environment

Firebase config is read from `VITE_APP_FIREBASE_*` env vars (`src/firebaseSetup.ts`), and must be set in the Vercel project. `.env` also contains Supabase/Turso entries that nothing in `src/` uses.

## Architecture

Client-only React 19 + TypeScript SPA (Vite, Tailwind v4, shadcn/Radix). No backend of its own: the browser talks directly to Firebase Auth and Firestore. Deployed on Vercel, whose SPA fallback rewrites live in `vercel.json`; Vercel Analytics/SpeedInsights are mounted in `App.tsx`.

- `@/` alias -> `src/` (set in both `vite.config.ts` and `tsconfig.json`).
- **Routing** (`src/App.tsx`): `/`, `/login`, `/wishlists`, `/wishlist/:wishlistId`, `/settings`, under `BrowserRouter` (`main.tsx`).
- **State**: the signed-in `User | null` lives in a tiny external store (`lib/userStore.ts`, read with `useSyncExternalStore`) persisted to localStorage under the legacy `persist:root` key (shape kept so existing sign-ins carry over and `pgHandlers` can read it before React renders). There is no Redux. All wishlist data is *not* in that store; components fetch through the handlers and keep it in local state. Read the user with the hooks in `lib/common.ts` (`useUser`, `useUserId`, `useUserName`); sign in/out with `login`/`logout` from `lib/userStore.ts`.
- **Auth** (`lib/authHandlers.ts`): email/password and Google popup sign-in; on success they dispatch `login` and navigate to the `from` route.
- **Data layer** (`lib/wishlistHandlers.ts`): the only place that touches Firestore. Collections:
  - `wishlists` – doc fields `wishlistName`, `ownerId`, `author`, `iconName`, `updateTimestamp`, and an embedded `items: WishlistItem[]` array (items are not a subcollection; item add/edit/delete run in a Firestore transaction via `withOwnedWishlist` and return the new item list).
  - `user_follows/{userId}` – `{ follows: string[] }` of wishlist IDs.
  - Note the Firestore field names differ from the TS types in `lib/types.ts` (`wishlistName` vs `name`, `iconName` vs `icon`, `ownerId` vs `author`/owner); mapping happens in the handlers.
  - Ownership is checked client-side inside those transactions. `fetchWishlistView` (one read for the whole wishlist page) returns only items with `public: true` unless the caller is the owner, so item privacy is also a client-side filter — Firestore security rules are the real enforcement and are not in this repo.
- **Components** live in `src/components/ui/`, mixing generic shadcn primitives (`button`, `dialog`, `form`, …; config in `components.json`) with app-level screens/dialogs (`WishlistPage`, `UserWishlistsOverview`, `ItemDialog`, `WishlistEditDialog`, …). Forms use react-hook-form with zod/yup resolvers. Wishlist icons are a fixed set in `lib/wishlistIcons.ts` (`WishlistIconName`).

## Postgres backend (Neon, default)

`lib/wishlistHandlers.ts` re-exports `lib/backend.ts`, which is `pgHandlers.ts` by default; with `VITE_BACKEND=firestore`, `vite.config.ts` aliases `@/lib/backend` to `firestoreHandlers.ts`, so a build bundles only one backend (the Firestore SDK is ~390 kB). `pgHandlers.ts` calls one RPC endpoint, `api/wishlists.ts` (Vercel function, `{op, ...}` JSON body). Auth stays Firebase: the function verifies the ID token (`api/_lib/auth.ts`) and takes the user from it. Logic lives in `api/_lib/ops.ts`; schema in `db/schema.sql`; `api/keepalive.ts` is a daily cron.

- `DATABASE_URL` (server only, never `VITE_`-prefixed) comes from `neon env pull` into `.env.local`; local dev uses the Neon `test` branch.
- `npm test` runs integration tests against that DB (`node --test` via tsx). `npm run dev:api` serves the function on :3001 and Vite proxies `/api` to it.
- `scripts/migrate-firestore.ts` copies Firestore into Postgres (needs a service-account key; `--dry-run` first).
- Postgres is the default, so any deployment needs the `/api` function (Vercel) and `DATABASE_URL`. Set `VITE_BACKEND=firestore` for a Firestore-only build (still deployed on Vercel).

## Known rough edges

- Several handlers still `console.error` instead of surfacing failures to the UI (see `ISSUES.md` for the full list of open problems).
- `/wishlists` and `/settings` sit behind `RequireAuth`; `/wishlist/:id` is public. Unknown routes render `NotFound`.
- `design_files/` holds design assets, not source.
