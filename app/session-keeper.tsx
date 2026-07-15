"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// A böngésző-oldali Supabase kliens automatikusan frissíti a hozzáférési
// tokent és karbantartja a session-sütiket. Erre azért van szükség, mert a
// Next.js 16 `proxy.ts` (Node.js middleware) jelenleg nem fut a Cloudflare
// Workers-en (OpenNext), így a szerver-oldali session-frissítés nem elérhető.
export default function SessionKeeper() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
