"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Az admin műveletek nyitánya. Az adat-hozzáférés végig a session-kliensen
// megy, hogy az RLS is védjen: ez az ellenőrzés a jó hibaüzenetért van, nem
// helyette.
async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  return { supabase, adminProfileId: me.id };
}

async function siteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// Pont jóváírása / levonása
// ---------------------------------------------------------------------------
export async function adjustPoints(formData: FormData) {
  const { supabase, adminProfileId } = await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  const type = String(formData.get("type") ?? "credit"); // credit | debit
  const reason = String(formData.get("reason") ?? "").trim();

  const fail = (msg: string) =>
    redirect(`/admin?error=${encodeURIComponent(msg)}`);

  if (!profileId) fail("Nincs kiválasztva vásárló.");
  if (!Number.isInteger(amount) || amount <= 0)
    fail("Az összegnek pozitív egész számnak kell lennie.");

  const delta = type === "debit" ? -amount : amount;

  // Levonásnál ne mehessen mínuszba az egyenleg.
  if (delta < 0) {
    const { data: balanceRow } = await supabase
      .from("user_point_balances")
      .select("balance")
      .eq("profile_id", profileId)
      .single();
    const balance = balanceRow?.balance ?? 0;
    if (balance + delta < 0)
      fail(`Nincs elég pont (egyenleg: ${balance}, levonás: ${amount}).`);
  }

  const { error } = await supabase.from("point_transactions").insert({
    profile_id: profileId,
    delta,
    reason: reason || null,
    created_by: adminProfileId,
  });

  if (error) fail(error.message);

  revalidatePath("/admin");
  redirect("/admin?message=ok");
}

// ---------------------------------------------------------------------------
// Új vásárló létrehozása
// ---------------------------------------------------------------------------
export type CreateCustomerState = {
  error?: string;
  message?: string;
};

export async function createCustomer(
  _prevState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const { supabase } = await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { error: "A név kötelező." };
  if (!email && !phone)
    return { error: "E-mail vagy telefonszám közül legalább az egyik kell." };

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ full_name: fullName, email: email || null, phone: phone || null })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { error: `Ezzel az e-mail címmel már van vásárló: ${email}` };
    return { error: error.message };
  }

  revalidatePath("/admin");

  if (!email) {
    return {
      message: `${fullName} felvéve. E-mail nélkül nem tud belépni – a pontjait te vezeted.`,
    };
  }

  // A meghívó e-mail csak egyéni SMTP-vel megy ki valódi címekre. Ha elszáll,
  // a vásárló akkor is létrejött: a „Belépő link” gombbal kézzel pótolható.
  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${await siteOrigin()}/auth/confirm?next=/auth/jelszo`,
    });

  if (inviteError) {
    return {
      message: `${fullName} felvéve, de a meghívó e-mail nem ment ki (${inviteError.message}). Küldd át neki a „Belépő link” gombbal.`,
    };
  }

  await supabase
    .from("profiles")
    .update({ user_id: invited.user.id })
    .eq("id", profile.id);

  revalidatePath("/admin");
  return {
    message: `${fullName} felvéve, a meghívó e-mail elment ide: ${email}`,
  };
}

// ---------------------------------------------------------------------------
// Belépő link generálása (meghívó pótlása / kézi jelszó-visszaállítás)
// ---------------------------------------------------------------------------
export type LoginLinkState = {
  error?: string;
  link?: string;
  forName?: string;
};

export async function createLoginLink(
  _prevState: LoginLinkState,
  formData: FormData,
): Promise<LoginLinkState> {
  const { supabase } = await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, user_id")
    .eq("id", profileId)
    .single();

  if (error || !profile) return { error: "Nincs ilyen vásárló." };
  if (!profile.email)
    return { error: `${profile.full_name} e-mail cím nélkül nem tud belépni.` };

  const admin = createAdminClient();

  // Egyik ág sem küld e-mailt, csak visszaadja a linket. Az `invite` egyben
  // létre is hozza az auth-fiókot, a `recovery` a meglévőhöz ad új jelszó-
  // beállító linket.
  let result = profile.user_id
    ? null
    : await admin.auth.admin.generateLink({
        type: "invite",
        email: profile.email,
      });

  // A fiók akkor is létezhet, ha a profilhoz kötés korábban elmaradt (pl. a
  // meghívó e-mail küldés közben szállt el) – ilyenkor a recovery a jó ág.
  if (!result || result.error) {
    result = await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
    });
  }

  if (result.error) return { error: result.error.message };

  const { properties, user } = result.data;

  if (user && profile.user_id !== user.id) {
    await supabase
      .from("profiles")
      .update({ user_id: user.id })
      .eq("id", profile.id);
    revalidatePath("/admin");
  }

  const link = new URL("/auth/confirm", await siteOrigin());
  link.searchParams.set("token_hash", properties.hashed_token);
  link.searchParams.set("type", properties.verification_type);
  link.searchParams.set("next", "/auth/jelszo");

  return { link: link.toString(), forName: profile.full_name };
}
