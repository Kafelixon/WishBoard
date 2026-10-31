# WishBoard

WishBoard is a web application designed to help users effortlessly create, manage, and share their wishlists. With a focus on simplicity and privacy, WishBoard makes it easy to keep track of your desired items and share them with friends and family.

## Features

- **Effortless Wishlist Creation**: Add items to your wishlist with text, photos, links, and an average price. Crafting your dream list has never been easier.
- **Privacy on Your Terms**: Mark items as private to keep them between you and WishBoard, or share them with the world.
- **Hassle-Free Sharing**: Share your wishlist with anyone via a simple link. No account required for viewers.
- **Stay Connected**: Follow your friends and loved ones' wishlists to stay updated on their wishes.

## Tech Stack

- **React 19 with TypeScript**, built with Vite
- **Tailwind CSS v4 and shadcn/Radix**
- **Firebase Authentication** for sign-in (email/password and Google)
- **Postgres on Neon** for wishlist data, served through Vercel functions in `api/`
- **Firestore** as an optional, Firestore-only backend (`VITE_BACKEND=firestore`)
- **Vercel** for hosting and the `/api` functions

## Installation

The project uses [pnpm](https://pnpm.io/) (the version is pinned in `package.json`).

1. Clone the repository:
   ```bash
   git clone https://github.com/Kafelixon/WishBoard.git
   cd WishBoard
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   - `VITE_APP_FIREBASE_*`: Firebase web config (see `src/firebaseSetup.ts`).
   - `DATABASE_URL`: Neon connection string, server only (for example via `neon env pull` into `.env.local`). Not needed with `VITE_BACKEND=firestore`.

4. Start the API and the dev server (in separate terminals):
   ```bash
   pnpm dev:api
   pnpm dev
   ```
   Vite proxies `/api` to the function on port 3001. With `VITE_BACKEND=firestore`, only `pnpm dev` is needed.

5. Open `http://localhost:5173` in your browser.

## Scripts

| Command          | Description                                   |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Vite dev server                               |
| `pnpm dev:api`   | Serve the `/api` function on port 3001        |
| `pnpm build`     | Type-check and build to `dist/`               |
| `pnpm lint`      | ESLint (warnings fail)                        |
| `pnpm test`      | API integration tests against the Neon DB     |
| `pnpm test:e2e`  | Playwright smoke tests                        |

## Contributing

We welcome contributions to improve WishBoard! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Create a pull request to the main repository.

## License

WishBoard is released under the MIT License. See `LICENSE` for more information.

## Contact

For questions or support, please contact piotrszkafel@gmail.com

---

Thank you for using WishBoard!