import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Szerver oldalon (Server Component-ek, Server Action-ök, Route Handler-ek)
// használt Supabase kliens. A `cookies()` a Next.js 16-ban async.
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
              cookieStore.set(name, value, options),
            );
          } catch {
            // A Server Component-ből hívott setAll eldobható: a proxy frissíti
            // a sütiket. Lásd lib/supabase/proxy.ts.
          }
        },
      },
    },
  );
}
