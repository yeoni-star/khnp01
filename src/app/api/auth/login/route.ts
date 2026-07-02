import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkPassword } from "@/lib/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionCookieValue,
} from "@/lib/session";

const DEFAULT_RESTAURANT = "A";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    return NextResponse.json(
      { ok: false, message: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(DEFAULT_RESTAURANT), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
