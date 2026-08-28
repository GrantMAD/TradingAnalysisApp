import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client.
 * Must only be used in Server Components, Server Actions, and Route Handlers.
 * NEVER import this in Client Components.
 *
 * PROJECT RULE 2: SUPABASE_SECRET_KEY is only used here when elevated
 * privileges are required. For read operations, the publishable key suffices.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Session refresh is handled by middleware instead.
          }
        },
      },
    }
  );
}

/**
 * Elevated server client using the service-role key.
 * ONLY for operations that must bypass RLS (e.g., admin triggers, migrations).
 * PROJECT RULE 2: This key must NEVER reach the client.
 */
export async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
