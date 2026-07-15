"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(formData: FormData) {
  const supabase = await createClient();

  // A session-t a meghívó / visszaállító link hozta létre (lásd
  // app/auth/confirm/route.ts) – enélkül nincs kinek jelszót állítani.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");

  const fail = (msg: string) =>
    redirect(`/auth/jelszo?error=${encodeURIComponent(msg)}`);

  if (password.length < 6) fail("A jelszó legyen legalább 6 karakter.");
  if (password !== confirm) fail("A két jelszó nem egyezik.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
