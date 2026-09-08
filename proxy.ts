// proxy.ts  (Next.js 16 replaces middleware.ts with proxy.ts)
// Auth proxy stub — in Phase 1 this passes all requests through.
// In Phase 2, enable the Supabase session refresh and route protection.

import { NextResponse } from "next/server";
// import { createServerClient } from "@supabase/ssr";  // Uncomment in Phase 2

export async function proxy() {
  // ----------------------------------------------------------------
  // PHASE 2: Uncomment and complete the following block to enforce
  // authentication on the (dashboard) route group.
  //
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   { cookies: { ... } }
  // );
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }
  // ----------------------------------------------------------------

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
