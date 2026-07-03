import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname.startsWith("/meal-register")) {
    return NextResponse.next();
  }

  const session = verifySessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth/login|logout|meal-register|_next/static|_next/image|favicon.ico).*)",
  ],
};
