import { jwtVerify, type JWTVerifyGetKey } from "jose";

export interface Caller {
  uid: string;
  name: string | null;
}

export type TokenVerifier = (token: string) => Promise<Caller>;

export const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/**
 * The Firebase project ID tokens must be issued for. Throws when it isn't set,
 * so a misconfigured deployment fails at startup with this message instead of
 * rejecting every sign-in as "Invalid or expired session".
 */
export const firebaseProjectId = (env: NodeJS.ProcessEnv = process.env): string => {
  // An empty value counts as unset, so it falls through to the next one.
  const projectId = [env.FIREBASE_PROJECT_ID, env.VITE_APP_FIREBASE_PROJECT_ID].find((id) => !!id);
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID (or VITE_APP_FIREBASE_PROJECT_ID) is not set, so no Firebase ID token can be verified.",
    );
  }
  return projectId;
};

/** Verifies Firebase Auth ID tokens (RS256, issued for `projectId`). */
export const createVerifier =
  (projectId: string, keys: JWTVerifyGetKey): TokenVerifier =>
  async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new Error("Token has no subject");
    }
    return {
      uid: payload.sub,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  };
