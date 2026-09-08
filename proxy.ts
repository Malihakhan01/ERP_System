// proxy.ts (Next.js 16 Request Proxy & Route Guard)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static files, Next.js internal chunks, and images to bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Check for active session cookie
  const sessionCookie = request.cookies.get("factoryos_session")?.value;
  const userCookie = request.cookies.get("factoryos_user")?.value;
  const hasSession = Boolean(sessionCookie || userCookie);

  // 3. Login page access
  if (pathname === "/login") {
    // If already authenticated, redirect straight to dashboard
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. API routes (non-auth): allow or pass through (they handle their own verification)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 5. Root page redirect
  if (pathname === "/") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 6. Protected dashboard routes
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
