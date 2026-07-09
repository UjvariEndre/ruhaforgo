"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function adjustPoints(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = String(formData.get("user_id") ?? "");
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  const type = String(formData.get("type") ?? "credit"); // credit | debit
  const reason = String(formData.get("reason") ?? "").trim();

  const fail = (msg: string) =>
    redirect(`/admin?error=${encodeURIComponent(msg)}`);

  if (!userId) fail("Nincs kiválasztva felhasználó.");
  if (!Number.isInteger(amount) || amount <= 0)
    fail("Az összegnek pozitív egész számnak kell lennie.");

  const delta = type === "debit" ? -amount : amount;

  // Levonásnál ne mehessen mínuszba az egyenleg.
  if (delta < 0) {
    const { data: balanceRow } = await supabase
      .from("user_point_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    const balance = balanceRow?.balance ?? 0;
    if (balance + delta < 0)
      fail(`Nincs elég pont (egyenleg: ${balance}, levonás: ${amount}).`);
  }

  const { error } = await supabase.from("point_transactions").insert({
    user_id: userId,
    delta,
    reason: reason || null,
    created_by: user.id,
  });

  if (error) fail(error.message);

  revalidatePath("/admin");
  redirect("/admin?message=ok");
}
