# WishBoard issues

Found by running the app locally (Vite dev server against the configured Firebase project, signed in as the test account) and reading the code. `tsc --noEmit` and `eslint . --max-warnings 0` pass cleanly.

Not tested: Google sign-in, registration, password reset, email change, account deletion, follow/unfollow, creating or editing a wishlist, and a production build run in a browser. Account deletion and registration would have changed real data. Firestore security rules aren't in the repo, so their effect on any of these items is unknown.

## Status: step 1 (stabilize on Firestore) done

Fixed in code and checked in the browser against the test account (three items added back-to-back, edit, delete, reload, followed tab, missing wishlist, unknown route, signed-out redirect). `tsc` and ESLint pass.

- Item add, edit and delete now run as Firestore transactions (`withOwnedWishlist` in `src/lib/wishlistHandlers.ts`): one read and one commit instead of three or four calls, and concurrent writers are retried instead of overwriting each other. The write returns the new item list, so the extra full re-fetch is gone.
- Saves are queued one after another in `WishlistTable.tsx`, and the form is no longer reset when a save finishes, so typing a second item while the first saves is safe.
- The wishlist page does one document read (`fetchWishlistView`) plus the follow check, in parallel. It loaded in about 400 ms here.
- New wishlists are created with `items: []`, and reads tolerate a missing `items` field. Items are sorted on a copy.
- `createWishlist` now throws on failure; wishlist create/update/delete show an error toast instead of a false "created" message, and list loading no longer hangs on errors. Empty "followed" and "your wishlists" lists now show their empty message.
- Follow and unfollow are single writes (`arrayUnion` / `arrayRemove`); followed wishlists load in parallel; the author rename runs in parallel.
- Bad wishlist IDs show a real "Wishlist not found" page with a way back, and load errors show "Could not load wishlist". Unknown routes show a 404. `/wishlists` and `/settings` redirect signed-out visitors to `/login` and return to the page after sign-in.
- The persisted user is cleared when Firebase reports no session (`AuthSync` in `App.tsx`).
- Firestore uses `experimentalAutoDetectLongPolling`; the `console.log` in `useUser` is gone.

Still open from step 1: check the Firestore region in the Firebase console (not checked), Firestore security rules are not in the repo, and there are no automated tests. The items below describe the state before these fixes unless listed above.

## Status: step 2 (quick usability fixes) done

Done on the `stabilize-firestore` branch after the step 1 commit, checked in the browser (sign-in validation and error message, share, item form validation, minimal item, delete, log out, landing page). `tsc` and ESLint pass. Not committed yet.

- **Share:** a Share button on every wishlist page copies the link and says anyone with it sees the public items.
- **Item form:** price, image and link are optional; image and link must be real web addresses (`qwe`, `not a url` and `javascript:` values are rejected, addresses without a scheme get `https://`); the edit dialog has its own description and a "Save changes" button; error text is announced to screen readers.
- **Item rows:** private items show a lock and "Private, only you can see this"; images fall back to a gift icon (no more `via.placeholder.com`, no broken-image boxes) and use the item name as alt text; the "Link" anchor is only shown when there is a link and reads "View product", with the item name in its accessible label; items without a price say "Price not set" and sort last; prices no longer wrap mid-number.
- **Sign-in:** the form checks email, password and username before calling Firebase; known Firebase errors show specific messages (wrong credentials, email in use, weak password, too many attempts, offline); closing the Google popup is no longer an error.
- **Log out** now also signs out of Firebase (before, only the stored user was cleared) and returns to the landing page.
- **Page titles** per route (wishlist name on wishlist pages), a meta description, "WishLinker" replaced by "WishBoard", the LinkedIn address styled as a link, wishlist titles shown exactly as typed, and accessible labels on the account menu and the edit buttons.

Correction to the list below: the dialog close button already had a "Close" label for screen readers.

Not done in step 2: confirmation before deleting items or wishlists (needs a proper dialog, better done in the redesign), currency choice, item rows opening the link from the image/name, and the remaining items in this file.

Severity: **High** = data loss, security, or broken flow. **Medium** = wrong or confusing behaviour. **Low** = polish.

## Stability

### High
- **Item edits are read-modify-write on an array.** `updateWishlistItem` and `deleteWishlistItem` (`src/lib/wishlistHandlers.ts`) read the whole `items` array, change it, and write it back. Two tabs or devices editing the same wishlist can silently overwrite each other. A transaction, or storing items as a subcollection, would fix it.
- **Account deletion leaves data behind.** `deleteUser` only removes the auth user (`SettingsPage.tsx`). The user's wishlists and their `user_follows` doc stay in Firestore, and other users' follow lists still point at them. `deleteWishlist` has the same dangling-reference problem for followers.
- **Cancelling the password prompt throws an unhandled error.** `promptForCredentials()` is called outside the `try` in `removeAccount`, so cancelling `prompt()` throws an uncaught `Invalid email or password`.

- **Saving one item can wipe the form of the next one.** In `WishlistTable.tsx`, `handleAddOrUpdateItem`'s `.finally` calls `setCurrentItem(PLACEHOLDER_ITEM)` and `setIsSubmitting(false)` when the previous write finishes. The dialog closes immediately, so if you open "Add Item" again and start typing before the first write returns, the late `finally` clears what you typed. `isSubmitting` is one shared flag for all saves. This is the most likely cause of "adding or editing several items breaks something" (reported, not reproduced here).
- **Out-of-order refreshes.** Every save triggers a full re-fetch of the list with no cancellation or sequence check, so two quick saves can finish in the wrong order and show an older list.
- **A brand-new empty wishlist can crash when shared.** `createWishlist` doesn't write an `items` field. `fetchItemsFromWishlist` then runs `items.filter(...)` on `undefined` for any non-owner viewer, which throws and leaves the skeleton on screen forever. Found by reading the code, not reproduced.
- **State array mutated during render.** `CardsList` calls `items.sort(...)` on the state array in place on every render.

### Medium
- **Failed saves can look like successes.** `createWishlist` catches errors and only `console.error`s them, so the caller can't tell the write failed. Other handlers should be checked for the same pattern.
- **Unhandled promise rejections on a bad wishlist ID.** Opening `/wishlist/<nonexistent>` while signed in logs `Uncaught (in promise) Error: Wishlist is invalid.` from `isOwnerOfWishlist` (twice). The page still shows "Wishlist not found", but the `.then()` chains in `WishlistPage.tsx` have no `.catch`.
- **Routes aren't protected.** Signed out, `/wishlists` and `/settings` render their full UI (tabs, "Add new", all the settings forms) instead of redirecting to `/login`. The settings actions then fail with no clear explanation.
- **No 404 route.** `/nope` renders only the top bar and an empty page.
- **Persisted user can go stale.** The user is saved to localStorage by redux-persist and never checked against `onAuthStateChanged`. If the Firebase session expires or is revoked, the UI still looks signed in.
- **Delete is not guarded.** Deleting a wishlist item has no confirmation, and the list lags 1–2 seconds behind the success toast.
- **Related Firestore reads aren't batched or cached.** See Performance.

## Usability

### High
- **No way to share a wishlist.** The landing page promises "Hassle-Free Sharing", but the wishlist page has no Share or Copy-link button; people have to copy the address bar. (Second review.)
- **Sign-in errors are always generic.** `handleLoginError` (`SignInForm.tsx`) ignores the specific error and shows "An error occurred while logging in", even though `authHandlers.ts` builds the better message "Invalid email or password". There's a `// TODO: Handle error messages` there. Registration failures have the same problem.
- **No client-side validation on the sign-in form.** Submitting it empty sends a request to Firebase (visible 400 `auth/invalid-email` in the console) and only then shows the generic error.

### Medium
- **Price is mandatory and must be positive.** Adding an item with the default `0` fails with "Price must be positive". The README describes price as optional, and a gift you can't price can't be added.
- **Link and image URLs aren't validated.** Both inputs are `type="text"`. `http://` is prepended to anything, so `qwe`, `12` and `javascript:alert(1)` are saved. The `http://` prefix means the `javascript:` value is not an XSS vector, but the data is junk.
- **Empty link still shows a "Link" anchor.** Items saved without a link render a `Link` with an empty `href`. Clicking it opens the current page in a new tab.
- **Broken images show alt text.** An unreachable image URL renders a bordered box with the "Product" alt text and no fallback.
- **Own wishlist briefly shows a "Follow" button.** While the page loads, the owner of a wishlist sees a Follow button until ownership resolves. The loading skeleton is also vertically centred on the page rather than at the top.
- **Wishlist titles are re-capitalized on display.** A wishlist named `qpweo` is shown as "Qpweo" on its page but `qpweo` in the list.
- **Hard-coded currency.** Prices are always shown as `zł`, with no way to choose a currency.
- **Delete-account asks for the password via `window.prompt`.** The password is visible as plain text while typing, and the flow looks unlike the rest of the app.
- **Edit item dialog reuses the "Add" description.** It says "Add a new item to your wishlist. Click add when you're done." while editing, and the button says "Save change" (singular).
- **Grey rows are private items, with no explanation.** `WishlistTable.tsx` gives items with `public === false` a grey background (`bg-gray-200`); it's the only visual cue. The second review read this as "disabled or reserved". It's not alternating shading. Add a lock icon and a "Private" label.
- **Items are silently sorted by price, cheapest first.** There is no way to change the order and nothing says it's sorted.
- **Item rows aren't clickable.** Only the small text "Link" opens the product; the image and name don't, and every row's link is just labelled "Link". Link text should include the product name.
- **Password-reset email is sent on a single click** from Settings, with no confirmation or result explanation beyond a toast. (Delete-account does ask via `window.confirm`.)
- **Followed list row shows no owner for one wishlist** ("Stitchmas"). Likely an empty `author` in that Firestore document; not confirmed.
- **Landing-page LinkedIn address is not styled as a link.** It is an `<a>` in `LandingPage.tsx` but has no link styling, so it reads as plain text.
- **Bad wishlist IDs show a skeleton and a Follow button for several seconds** before the bare "Wishlist not found", which has no link back. Signed out, the page can stay blank. (Merged with the unhandled-rejection item above.)
- **Invalid image URLs aren't caught.** `not a url` was saved as `http://not a url/`.
- **Mobile price wrapping.** At 375px wide, long prices wrap mid-number (`1231` / `23 zł`).

### Low
- **Landing page uses the wrong product name.** Copy says "WishLinker" in two places (`LandingPage.tsx`) instead of WishBoard.
- **Item with no image uses an external placeholder.** `https://via.placeholder.com/150` is a third-party service (`WishlistTable.tsx`). It appeared blocked or unresolvable in one console check (`ERR_NAME_NOT_RESOLVED`).
- **Page title never changes.** Every route has the title "WishBoard", and there is no description meta tag.
- **README install steps say `npm`.** The project is pinned to pnpm (`packageManager` in `package.json`).

### Accessibility
- **Icon-only buttons have no accessible name.** The avatar/menu button, the edit (pencil) buttons on items and wishlists, and the dialog close button have no text or `aria-label`; screen readers announce them as unlabeled buttons. Add `aria-label`s or visually hidden text.
- **Images use a generic alt.** Every item image has `alt="Product"` instead of the item name.

## Performance

### Medium
- **Single 883 kB JavaScript bundle (278 kB gzipped).** `vite build` warns about it. There is no route-level code splitting, so the landing page downloads Firebase, Radix, form libraries and every page up front. Lazy-loading routes and the Firebase SDK would cut the initial load a lot.
- **Duplicate Firestore reads on the wishlist page.** Loading one wishlist reads the same document several times: `wishlistExists`, `isOwnerOfWishlist`, `fetchWishlistById`, and `fetchItemsFromWishlist` each call `getDoc` separately (`WishlistPage.tsx` effects → `wishlistHandlers.ts`). A single `getDoc` feeding all of these would cut reads and speed up first render. These are billed reads.
- **Unused dependencies.** Both `zod` and `yup` are installed, and `redux` alongside `@reduxjs/toolkit`. `.env` also contains Supabase and Turso entries that nothing in `src/` reads.

### Low
- **Images lack `loading="lazy"` and dimensions.** Item images load eagerly and have no width/height, so long wishlists cause layout shift.
- **`useUser()` logs on every render.** `console.log("userState", ...)` in `src/lib/common.ts` fires for every component that uses the hook. In development it was logged repeatedly on first load.
- **`updateExistingWishlistsAuthor` writes sequentially.** Renaming a user updates each wishlist one at a time with `await` in a loop; a `writeBatch` would be one round trip.
- **Slow first load of the wishlist list.** The list stays on skeleton rows for about 3 seconds on the dev server (not measured against production).

## Security notes
- Item privacy (`public` flag) and ownership are enforced only in client code (`fetchItemsFromWishlist` filters, `isOwnerOfWishlist` checks). Anyone can query Firestore directly with the public web config unless security rules block it. The rules are not in this repo; they should be reviewed, and ideally versioned (`firestore.rules`).
- `.env` is gitignored and not tracked (checked). It holds Supabase and Turso secrets that the app doesn't use; worth removing or rotating.

## Database: why Firestore feels slow and flaky

What the code does today, per user action:

| Action | Round trips to Firestore |
| --- | --- |
| Open a wishlist | about 4 reads of the same document (`wishlistExists`, `isOwnerOfWishlist`, `fetchWishlistById`, `fetchItemsFromWishlist`), plus `isFollowingWishlist` |
| Add an item | `isOwnerOfWishlist` read, then `updateDoc`, then a full re-fetch |
| Edit or delete an item | `isOwnerOfWishlist` read, `getDoc`, `updateDoc`, then a full re-fetch |
| Followed tab | one read per followed wishlist, awaited one after another in a loop (`fetchWishlistsByIds`) |

Causes, most likely first:
1. **Too many sequential round trips.** At 100–200 ms per call (more if the database is in a distant region), a 3–4 step save is already a noticeable pause, and the followed tab grows linearly with the number of follows.
2. **Firestore region.** Not checked. If the database was created in a US location and most users are in Poland or Europe, every call pays an extra transatlantic round trip. Look at the location in the Firebase console; it cannot be changed later.
3. **Items stored as an array inside one document.** Concurrent writes overwrite each other (see Stability), and every edit rewrites the whole array.
4. **Firestore's streaming transport.** The web SDK sometimes falls back to long polling behind proxies, VPNs or ad blockers, which looks like random slowness. `initializeFirestore(app, { experimentalAutoDetectLongPolling: true })` helps.
5. **No offline cache or real-time listeners.** Every view re-fetches from the server instead of reading from a local cache.

These explain "sometimes slow" and "adding several items breaks something" (the form-reset and race items under Stability) without the database being the fundamental problem. The dataset is tiny, so Firestore is not near any limit.

### Should you move to SQL?

Short answer: it's reasonable, but fix the data-access code first. A migration will not fix the slow round trips or the form-reset bug by itself.

Where SQL genuinely helps:
- Items become rows, so adding, editing or deleting one item is a single statement and can't overwrite another (fixes the lost-update problem).
- One query can return a wishlist with its owner, items and follow state, replacing 4–5 reads.
- Private items can be hidden by the database (Postgres row-level security) instead of by client code.
- Followed wishlists become one join instead of a loop of reads.

Free options that are publicly reachable from Vercel (check current limits before committing; they change often):

| Option | Fit | Watch out for |
| --- | --- | --- |
| **Supabase (Postgres)** | Best fit. Browser can talk to it directly with row-level security, includes auth, free tier is generous for this size. Your `.env` already has `VITE_SUPABASE_*` entries. | Free projects pause after about a week without activity (keep-alive ping needed). Choose the Frankfurt (EU) region. |
| **Neon (Postgres)** | Good Postgres, scales to zero. | Needs your own API layer (Vercel functions); cold start after idle adds latency. |
| **Turso (SQLite/libSQL)** | Very generous free tier, fast reads. Your `.env` has `TURSO_*` entries. | Needs a server-side API (the token must not reach the browser). |
| Cloudflare D1 | Free SQLite. | Only reachable through Workers, so a bigger rewrite. |

If you migrate, Supabase is the simplest path. Keep Firebase Auth for the first step (the app only needs a verified user id) or move to Supabase Auth later; moving both at once adds risk. Because `src/lib/wishlistHandlers.ts` and `authHandlers.ts` are the only files that touch Firebase, the swap is contained, and that is also the right place to add tests first.

## Plan (suggested order)

1. **Stabilize on the current database (small, 1–2 days).**
   - Fix the form-reset race, per-save `isSubmitting`, stale-refresh guard, `items: []` on create, in-place sort.
   - Collapse the wishlist page to one `getDoc`; read the followed lists in parallel (`Promise.all`) or with `where(documentId(), "in", ids)`.
   - Add try/catch with visible error states, `.catch` on every effect promise, route guards and a 404 page.
   - Check the Firestore region and enable `experimentalAutoDetectLongPolling`; measure again.
2. **Quick usability wins.** Share/copy-link button, URL validation for link and image, optional price, fix dialog copy, private-item badge, clickable item rows with descriptive link text, accessible labels, fix "WishLinker", page titles per route, replace `via.placeholder.com` with a local fallback.
3. **Decide on SQL.** If step 1 isn't enough, or you want database-enforced privacy, migrate data to Supabase Postgres behind the existing handler functions (tables: `wishlists`, `items`, `follows`). Export Firestore, import, run both in parallel for a short time, then switch.
4. **Redesign.** Warm "paper and nature" look with a serif main font, built on design tokens in `index.css` (colors, type scale, radii) so shadcn components inherit it. Do this after steps 1–2 so the new look isn't built on broken flows, and ideally in parallel with step 3 only if they touch different files.
5. **Housekeeping.** Remove unused dependencies (`yup` or `zod`, `redux`) and unused env entries, lazy-load routes to cut the 883 kB bundle, add a test setup (Vitest plus handler tests) so the migration can be verified.
