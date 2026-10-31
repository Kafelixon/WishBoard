// Postgres is the default backend. vite.config.ts aliases this module to
// firestoreHandlers when VITE_BACKEND=firestore, so a Postgres build never bundles the Firestore SDK.
export * from "@/lib/pgHandlers";
