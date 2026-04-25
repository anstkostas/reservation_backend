import jwt from "jsonwebtoken";
import type ms from "ms";
import { AUTH_CONFIG } from "../../config/env.js";

/**
 * Creates a signed JWT the same way authService does — lets integration tests call
 * protected routes without a full login round-trip in beforeEach/beforeAll.
 * requireAuth accepts it because it uses the same JWT_SECRET as the running app.
 *
 * @param id - User ID to embed in the token payload
 * @param role - Role to embed in the token payload
 * @returns Signed JWT string
 */
export function makeJwt(id: string, role: "customer" | "owner"): string {
  return jwt.sign({ id, role }, AUTH_CONFIG.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue,
  });
}

/**
 * Creates an already-expired JWT — used to test the TokenExpiredError path in
 * requireAuth. Embedding exp as a past timestamp is reliable; expiresIn: '1ms'
 * would create a flaky timing dependency.
 *
 * @param id - User ID to embed in the token payload
 * @param role - Role to embed in the token payload
 * @returns Signed JWT string that is already expired
 */
export function makeExpiredJwt(id: string, role: "customer" | "owner"): string {
  return jwt.sign(
    { id, role, exp: Math.floor(Date.now() / 1000) - 10 },
    AUTH_CONFIG.JWT_SECRET
  );
}
