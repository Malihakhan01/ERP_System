// lib/supabase/server.ts
// Server-side Supabase client (Server Components, Server Actions, API Routes)
// This file MUST never be imported in client components.
// The service role key is only accessible here, server-side.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from Server Component — cookies cannot be set.
            // This is safe to ignore if using middleware to refresh sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service-role key.
 * Only use for privileged server-side operations (e.g. bypassing RLS).
 * NEVER export this to client components.
 */
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
