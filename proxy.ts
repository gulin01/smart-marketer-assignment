import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse edge guard (Next 16 `proxy` convention, formerly `middleware`).
 *
 * Two jobs:
 *  1. Gate `/admin/*` and `/api/*`. It only checks that a session cookie is
 *     *present* — the cryptographic check happens in `requireSession()` inside
 *     each route, because iron-session's unseal needs the Node runtime.
 *     Defence in depth, not the only line of defence.
 *  2. Mint the `visitor_id` cookie for public form pages. A server component
 *     cannot set cookies, so it has to happen here (ADR 0004).
 */
const SESSION_COOKIE = "leadmagnet_session";
export const VISITOR_COOKIE = "visitor_id";

const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/public"];

const VISITOR_COOKIE_OPTIONS = {
  httpOnly: false, // the injected form script reads nothing from it, but analytics debugging is easier
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- public form pages: ensure a stable visitor id ----------------------
  if (pathname.startsWith("/f/")) {
    if (request.cookies.has(VISITOR_COOKIE)) return NextResponse.next();

    const visitorId = crypto.randomUUID();
    // Make it visible to the page being rendered *this* request, not just the next one.
    request.cookies.set(VISITOR_COOKIE, visitorId);
    const response = NextResponse.next({ request });
    response.cookies.set(VISITOR_COOKIE, visitorId, VISITOR_COOKIE_OPTIONS);
    return response;
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/login", "/f/:path*"],
};
