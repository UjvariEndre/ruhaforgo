import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Secret kulccsal futó kliens. MEGKERÜLI az RLS-t, ezért soha nem
// kerülhet böngészőbe: csak Server Action-ből hívd, és kizárólag olyan
// auth-műveletekre, amikre a session-kliens nem képes (meghívó, link
// generálás). Minden adat-hozzáférés maradjon a session-kliensen
// (lib/supabase/server.ts), hogy az RLS is védjen.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Hiányzik a SUPABASE_SECRET_KEY környezeti változó.",
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
