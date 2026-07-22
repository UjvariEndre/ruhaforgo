import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// A meghívó / jelszó-visszaállító e-mailben lévő link ide érkezik: ellenőrzi a
// tokent, beállítja a session-t, majd továbbenged (alapesetben a jelszó-
// beállító oldalra).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Csak saját hosztra irányítunk: a `next` a linkből jön, tehát támadó is
  // megadhatja. Feloldjuk, origint hasonlítunk, és utána MAGÁT a feloldott
  // URL-t használjuk – ha stringet adnánk vissza és azt oldanánk fel újra, a
  // `/..//evil.com` kicsúszna: az ellenőrzés még localhost-ot lát, a belőle
  // képzett `//evil.com` viszont már idegen hosztra oldódna fel.
  const requestUrl = new URL(request.url);
  const resolvedNext = new URL(
    searchParams.get("next") ?? "/auth/jelszo",
    requestUrl,
  );
  const next =
    resolvedNext.origin === requestUrl.origin
      ? resolvedNext
      : new URL("/auth/jelszo", requestUrl);

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(next);
    }
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("A link lejárt vagy érvénytelen. Kérj újat, vagy szólj Tündének.")}`,
      request.url,
    ),
  );
}
