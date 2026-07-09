import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: a middleware neve mostantól "proxy". Minden kérésnél frissíti
// a Supabase session-t és védi a /dashboard, /admin útvonalakat.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Minden útvonal, kivéve a statikus fájlokat és a képeket.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
