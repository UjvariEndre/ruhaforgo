"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone } },
  });

  if (error) {
    redirect(
      `/login?mode=register&error=${encodeURIComponent(error.message)}`,
    );
  }

  // Ha a projektben be van kapcsolva az e-mail megerősítés, nincs azonnali
  // session – ilyenkor a felhasználónak meg kell erősítenie az e-mailjét.
  if (!data.session) {
    redirect("/login?message=confirm");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
