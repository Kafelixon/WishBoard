import { initializeFirestore, type Firestore } from "firebase/firestore";
import { firebase } from "@/firebaseSetup";

let instance: Firestore | undefined;

/**
 * Created on first use so builds that use the Postgres backend can drop the Firestore SDK.
 * Long polling avoids the streaming transport that browsers drop after sleep, VPN or network
 * changes ("Fetch API cannot load ... due to access control checks"), at a small speed cost.
 */
export const getFirestoreDb = () =>
  (instance ??= initializeFirestore(firebase, { experimentalForceLongPolling: true }));
