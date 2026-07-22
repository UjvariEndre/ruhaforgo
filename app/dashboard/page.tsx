import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("user_id", user.id)
    .single();

  // Fiók profil nélkül nem fordulhat elő normál működés közben, de ha a
  // profilhoz kötés valamiért elmaradt, itt ne UUID-hibával szálljon el.
  if (!profile) {
    redirect(
      `/login?error=${encodeURIComponent("Ehhez a fiókhoz nem tartozik vásárló. Szólj Tündinek.")}`,
    );
  }

  // Az adminnak a dashboard (saját egyenleg) értelmetlen – ő a kezelőfelületet
  // használja. Minden belépési út ide fut be, ezért itt egy helyen tereljük el.
  if (profile.role === "admin") redirect("/admin");

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
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="RuhaForgó"
            width={44}
            height={44}
            className="h-11 w-11 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-lg font-semibold">
              Szia, {profile.full_name}!
            </h1>
          </div>
        </div>
        <form action={signOut}>
          <button className="text-sm text-muted hover:text-foreground">
            Kilépés
          </button>
        </form>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-brand-green p-6 text-center text-white shadow-sm">
        <p className="text-sm text-white/70">Egyenleged</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{balance}</p>
        <p className="text-sm text-white/70">pont</p>
      </section>

      <h2 className="mb-3 text-sm font-medium text-muted">Előzmények</h2>
      {transactions && transactions.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-4">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm">{t.reason ?? "—"}</p>
                <p className="text-xs text-muted">
                  {new Date(t.created_at).toLocaleString("hu-HU")}
                </p>
              </div>
              <span
                className={`font-medium tabular-nums ${
                  t.delta >= 0 ? "text-brand-green" : "text-brand-terracotta"
                }`}
              >
                {t.delta >= 0 ? `+${t.delta}` : t.delta}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Még nincs pontmozgásod.</p>
      )}
    </main>
  );
}
