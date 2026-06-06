import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client. Uses the secret (or legacy service_role) key,
// which bypasses RLS. Only ever imported from server routes / server code —
// the `server-only` import makes a client-side import a build error.

let cached: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server env. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
