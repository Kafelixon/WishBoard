# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable MD024 -->

## [Unreleased]

### Added

- Polish localization alongside English (react-i18next): browser language detection, a language switcher in Settings (and the header for signed-out visitors) saved in localStorage, `<html lang>` kept in sync, Polish plural forms, locale-aware price and date formatting, translated auth errors (#69).
- ESLint rule rejecting hardcoded UI text in JSX, and Polish-locale Playwright smoke tests (#69).
- Gift reservations: signed-in visitors can reserve an item so nobody else buys it, and other signed-in visitors see it as reserved. The owner and signed-out visitors never see reservations; the server leaves them out of the response. Needs the new `item_reservations` table from `db/schema.sql`; not available in the Firestore-only build (#70).

## [1.1.0] - 2026-10-31

### Added

- Postgres (Neon) backend behind a single `/api/wishlists` Vercel function; Firebase Auth is kept. Now the default; set `VITE_BACKEND=firestore` for a Firestore-only build. Includes a Firestore-to-Postgres migration script and integration tests (#60, #63).
- Product details from an item's link: name, image, price and currency are filled in automatically (#66).
- Per-item currency, defaulting to PLN, with a currency picker in the item form (#66).
- Icon colour option in the wishlist edit dialog (#65).
- Followers can rename a followed wishlist (#64).
- Data export on the Settings page (#68).
- Share button on wishlist pages, "Wishlist not found" and 404 pages, per-route page titles (#59).
- Playwright smoke tests and a CI workflow (lint, typecheck, build, e2e) (#67).

### Changed

- Full redesign: warm paper and sage theme, new app shell, wishlist grid and product cards (#62).
- Item add, edit and delete are atomic operations instead of read-modify-write on the whole list (#59).
- Faster first load: on-demand dialogs and account menu, smaller item photos, the page's data request starts at load, and the Firestore SDK is left out of the Postgres build (#63).
- Redux replaced by a small external user store; the persisted format is unchanged so existing sign-ins carry over (#63).
- Item form: optional price, image and link with URL validation; specific sign-in error messages; log out also signs out of Firebase (#59).
- Dependencies updated, unused ones removed (#61); stricter ESLint rules (#56).
- Firebase Hosting workflows removed; deployment is on Vercel (#67).

### Fixed

- Nested button in the wishlist card, wrong "Delete Item" label on the wishlist dialog, missing empty-wishlist message (#59).
- Account deletion and email change handle re-authentication failures instead of throwing (#59).
- Wishlists created without an `items` field no longer crash when shared (#59).

## [1.0.0] - 2024-05-31

### Added

- Initial release with core features.
- Github Actions for CI/CD.
