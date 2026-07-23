"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatHuPhone, phoneKey } from "@/lib/phone";
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

// Ugyanaz a telefonszám ne tartozhasson két aktív vásárlóhoz. Az összehasonlítás
// a kanonikus E.164 kulcson megy, így a 06 / +36 / 0036 / szóköz / kötőjel
// változatok mind ugyanoda mutatnak. Törölt vásárló száma újra kiadható.
// A garanciát a `profiles_phone_unique_idx` adja – ez itt a szép hibaüzenetért.
async function findPhoneOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  phone: string,
  exceptProfileId?: string,
) {
  const key = phoneKey(phone);
  if (!key) return null;

  let query = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone_e164", key)
    .is("deleted_at", null)
    .limit(1);
  if (exceptProfileId) query = query.neq("id", exceptProfileId);

  const { data } = await query;
  return data?.[0] ?? null;
}

// A 23505 (unique violation) az e-mail és a telefon indexéről is jöhet – az
// index nevéből derül ki, melyikről. A `findPhoneOwner` normál esetben előbb
// elkapja a telefont, ez a hálója két egyszerre futó mentés esetére.
function duplicateMessage(
  error: { code?: string; message?: string },
  email: string,
  phone: string,
) {
  if (error.code !== "23505") return null;
  if (error.message?.includes("profiles_phone_unique_idx"))
    return `Ezzel a telefonszámmal már van vásárló: ${phone}`;
  return `Ezzel az e-mail címmel már van vásárló: ${email}`;
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
export type AdjustPointsState = {
  error?: string;
  message?: string;
};

export async function adjustPoints(
  _prevState: AdjustPointsState,
  formData: FormData,
): Promise<AdjustPointsState> {
  const { supabase, adminProfileId } = await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  const type = String(formData.get("type") ?? "credit"); // credit | debit
  const reason = String(formData.get("reason") ?? "").trim();

  if (!profileId) return { error: "Nincs kiválasztva vásárló." };
  if (!Number.isInteger(amount) || amount <= 0)
    return { error: "Az összegnek pozitív egész számnak kell lennie." };

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
      return {
        error: `Nincs elég pont (egyenleg: ${balance}, levonás: ${amount}).`,
      };
  }

  const { error } = await supabase.from("point_transactions").insert({
    profile_id: profileId,
    delta,
    reason: reason || null,
    created_by: adminProfileId,
  });

  if (error) return { error: error.message };

  // A details oldal (egyenleg + előzmények) helyben frissül, redirect nélkül.
  revalidatePath(`/admin/${profileId}`);
  return {
    message: delta < 0 ? `${amount} pont levonva.` : `${amount} pont jóváírva.`,
  };
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
  // Egységes +36-os alakban tároljuk, bárhogy is írták be.
  const phone = formatHuPhone(String(formData.get("phone") ?? ""));

  if (!fullName) return { error: "A név kötelező." };
  if (!email && !phone)
    return { error: "E-mail vagy telefonszám közül legalább az egyik kell." };

  if (phone) {
    const owner = await findPhoneOwner(supabase, phone);
    if (owner)
      return { error: `Ezzel a telefonszámmal már van vásárló: ${owner.full_name}` };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ full_name: fullName, email: email || null, phone: phone || null })
    .select("id")
    .single();

  if (error) {
    const duplicate = duplicateMessage(error, email, phone);
    return { error: duplicate ?? error.message };
  }

  revalidatePath("/admin");

  if (!email) {
    return {
      message: `${fullName} felvéve. E-mail nélkül nem tud belépni – a pontjait te vezeted.`,
    };
  }

  // FIGYELEM: ez akkor is sikerrel tér vissza, ha a levél sosem érkezik meg.
  // Egyéni SMTP nélkül a Supabase beépített küldője a team-en kívüli címekre
  // csendben elnyeli a levelet – hibát nem kapunk, tehát ígérni sem szabad,
  // hogy megjött. Ezért utal a visszajelzés a „Belépő link” gombra.
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
    message: `${fullName} felvéve, a meghívó e-mail kiküldve ide: ${email}. Ha pár percen belül nem érkezik meg, küldd át neki a „Belépő link” gombbal.`,
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

// ---------------------------------------------------------------------------
// Vásárló szerkesztése
// ---------------------------------------------------------------------------
export type UpdateCustomerState = {
  error?: string;
  message?: string;
};

export async function updateCustomer(
  _prevState: UpdateCustomerState,
  formData: FormData,
): Promise<UpdateCustomerState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  // Egységes +36-os alakban tároljuk, bárhogy is írták be.
  const phone = formatHuPhone(String(formData.get("phone") ?? ""));

  if (!id) return { error: "Hiányzó azonosító." };
  if (!fullName) return { error: "A név kötelező." };
  if (!email && !phone)
    return { error: "E-mail vagy telefonszám közül legalább az egyik kell." };

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("id, user_id, email")
    .eq("id", id)
    .single();
  if (readError || !current) return { error: "Nincs ilyen vásárló." };

  if (phone) {
    const owner = await findPhoneOwner(supabase, phone, id);
    if (owner)
      return { error: `Ezzel a telefonszámmal már van vásárló: ${owner.full_name}` };
  }

  // Az e-mail nélkül felvett vásárlónak nincs auth-fiókja. Amikor most kap
  // először címet, ugyanaz jár neki, mint ha e-maillel vettük volna fel:
  // meghívó levél + a fiók hozzákötése a profilhoz.
  const needsInvite = !current.user_id && !!email;

  const emailChanged = (current.email ?? "") !== email;

  // Fiókkal rendelkező vásárlónál az e-mail a belépéshez kell – nem törölhető.
  if (current.user_id && !email)
    return {
      error: "Ennek a vásárlónak van fiókja – az e-mail cím nem törölhető.",
    };

  // Ha van fiók és változott az e-mail, az auth-oldalt is szinkronizálni kell,
  // különben a belépés és a „Belépő link” a régi címmel maradna. Az
  // `email_confirm` azonnal érvényesíti, megerősítő levél nélkül.
  if (current.user_id && emailChanged) {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(
      current.user_id,
      { email, email_confirm: true },
    );
    if (authError)
      return {
        error: `Az e-mail módosítása a fiókon nem sikerült: ${authError.message}`,
      };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, email: email || null, phone: phone || null })
    .eq("id", id);

  if (error) {
    const duplicate = duplicateMessage(error, email, phone);
    return { error: duplicate ?? error.message };
  }

  revalidatePath("/admin");

  if (!needsInvite) return { message: "Mentve." };

  // Ugyanaz a fenntartás, mint a felvételnél: a sikeres válasz nem jelenti,
  // hogy a levél meg is érkezett – ezért utal a visszajelzés a „Belépő link”
  // gombra.
  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${await siteOrigin()}/auth/confirm?next=/auth/jelszo`,
    });

  if (inviteError) {
    return {
      message: `Mentve, de a meghívó e-mail nem ment ki (${inviteError.message}). Küldd át neki a „Belépő link” gombbal.`,
    };
  }

  await supabase
    .from("profiles")
    .update({ user_id: invited.user.id })
    .eq("id", id);

  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  return {
    message: `Mentve, a meghívó e-mail kiküldve ide: ${email}. Ha pár percen belül nem érkezik meg, küldd át neki a „Belépő link” gombbal.`,
  };
}

// ---------------------------------------------------------------------------
// Vásárló törlése (puha törlés – visszaállítható)
// ---------------------------------------------------------------------------
// Nem töröljük a sort: csak a `deleted_at`-et állítjuk be. Így a véletlenül
// törölt vásárló (és a teljes pontelőzménye) visszahozható, az auth-fiókja is
// érintetlen marad. Az aktív listákból a `deleted_at is null` szűrő rejti el.
export async function deleteCustomer(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect(`/admin?error=${encodeURIComponent("Hiányzó azonosító.")}`);

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin?message=deleted");
}
