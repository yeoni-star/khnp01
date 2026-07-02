import crypto from "node:crypto";
import { env } from "./env";

export function checkPassword(password: string): boolean {
  const expected = Buffer.from(env.APP_PASSWORD);
  const actual = Buffer.from(password);
  if (expected.length !== actual.length) {
    crypto.timingSafeEqual(expected, expected);
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}
