import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role kulccsal futó kliens. MEGKERÜLI az RLS-t, ezért soha nem
// kerülhet böngészőbe: csak Server Action-ből hívd, és kizárólag olyan
// auth-műveletekre, amikre a session-kliens nem képes (meghívó, link
// generálás). Minden adat-hozzáférés maradjon a session-kliensen
// (lib/supabase/server.ts), hogy az RLS is védjen.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Hiányzik a SUPABASE_SERVICE_ROLE_KEY környezeti változó.",
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
