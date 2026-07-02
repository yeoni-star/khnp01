import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import { type RestaurantCode, isRestaurantCode } from "./restaurants";

export const SESSION_COOKIE_NAME = "drapp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

type SessionPayload = {
  restaurant: RestaurantCode;
  iat: number;
};

function sign(data: string): string {
  return crypto.createHmac("sha256", env.APP_SECRET).update(data).digest("base64url");
}

export function createSessionCookieValue(restaurant: RestaurantCode): string {
  const payload: SessionPayload = { restaurant, iat: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionCookieValue(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const [payloadB64, signature] = value.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const actual = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length || !crypto.timingSafeEqual(actual, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (!isRestaurantCode(payload.restaurant)) return null;
    if (Date.now() - payload.iat > SESSION_MAX_AGE_SECONDS * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Server Components / Server Actions / Route Handlers에서 사용 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionCookieValue(store.get(SESSION_COOKIE_NAME)?.value);
}

/**
 * Server Action 내부에서 반드시 호출할 것 — proxy.ts는 Server Function 호출 경로를
 * 항상 보호하지 않으므로, 각 액션에서 별도로 세션을 검증해야 함.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
