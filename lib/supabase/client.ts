// lib/supabase/client.ts
// Browser-side Supabase client (safe to use in Client Components)
// Only uses the public anon key — never the service role key.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
