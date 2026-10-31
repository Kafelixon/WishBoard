import { jwtVerify, type JWTVerifyGetKey } from "jose";

export interface Caller {
  uid: string;
  name: string | null;
  /** Firebase's `email_verified` claim (Google accounts arrive verified). */
  emailVerified: boolean;
}

export type TokenVerifier = (token: string) => Promise<Caller>;

export const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

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
      emailVerified: payload.email_verified === true,
    };
  };
