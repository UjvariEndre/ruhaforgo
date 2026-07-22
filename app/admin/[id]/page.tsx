import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdjustPointsForm from "../adjust-points-form";

type Params = Promise<{ id: string }>;

export default async function CustomerDetailsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Csak admin nézheti mások előzményét.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", id)
    .single();

  // Ismeretlen / törölt profil → vissza a listához.
  if (!profile) redirect("/admin");

  const { data: balanceRow } = await supabase
    .from("user_point_balances")
    .select("balance")
    .eq("profile_id", profile.id)
    .single();

  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("id, delta, reason, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const balance = balanceRow?.balance ?? 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {profile.full_name}
          </h1>
          {profile.email && (
            <p className="truncate text-sm text-muted">{profile.email}</p>
          )}
          {profile.phone && (
            <p className="text-sm text-muted">{profile.phone}</p>
          )}
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-muted hover:text-foreground"
        >
          ← Vissza
        </Link>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-brand-green p-6 text-center text-white shadow-sm">
        <p className="text-sm text-white/70">Egyenleg</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{balance}</p>
        <p className="text-sm text-white/70">pont</p>
      </section>

      {/* Pont jóváírása / levonása – a vásárló már a linkből adódik */}
      <AdjustPointsForm profileId={profile.id} />

      <h2 className="mb-3 text-sm font-medium text-muted">
        Előzmények ({transactions?.length ?? 0})
      </h2>
      {transactions && transactions.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-4">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">{t.reason ?? "—"}</p>
                <p className="text-xs text-muted">
                  {new Date(t.created_at).toLocaleString("hu-HU")}
                </p>
              </div>
              <span
                className={`shrink-0 font-medium tabular-nums ${
                  t.delta >= 0 ? "text-brand-green" : "text-brand-terracotta"
                }`}
              >
                {t.delta >= 0 ? `+${t.delta}` : t.delta}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Ennek a vásárlónak még nincs pontmozgása.</p>
      )}
    </main>
  );
}
