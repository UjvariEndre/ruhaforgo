import { createBrowserClient } from "@supabase/ssr";

// Böngészőben (Client Component-ekben) használt Supabase kliens.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
