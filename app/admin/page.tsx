import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adjustPoints } from "./actions";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Csak admin léphet be.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .order("full_name", { ascending: true });

  const { data: balances } = await supabase
    .from("user_point_balances")
    .select("user_id, balance");

  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.user_id, b.balance]),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Admin – pontkezelés</h1>
        <Link
          href="/dashboard"
          className="text-sm text-black/50 hover:text-foreground dark:text-white/50"
        >
          ← Vissza
        </Link>
      </header>

      {sp.error && (
        <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {sp.error}
        </p>
      )}
      {sp.message === "ok" && (
        <p className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Pontmozgás rögzítve.
        </p>
      )}

      {/* Pont rögzítése */}
      <section className="mb-10 rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="mb-4 text-sm font-medium">Pont jóváírása / levonása</h2>
        <form action={adjustPoints} className="flex flex-col gap-3">
          <select
            name="user_id"
            required
            defaultValue=""
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
          >
            <option value="" disabled>
              Válassz ügyfelet…
            </option>
            {(profiles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? "(névtelen)"} — {balanceMap.get(p.id) ?? 0} pont
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <select
              name="type"
              defaultValue="credit"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
            >
              <option value="credit">Jóváírás (+)</option>
              <option value="debit">Levonás (−)</option>
            </select>
            <input
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Pont"
              className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
            />
            <input
              name="reason"
              type="text"
              placeholder="Megjegyzés (pl. Levi's dzseki, vásárlás)"
              className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Rögzítés
          </button>
        </form>
      </section>

      {/* Ügyféllista */}
      <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
        Ügyfelek ({profiles?.length ?? 0})
      </h2>
      <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
        {(profiles ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">
                {p.full_name ?? "(névtelen)"}
                {p.role === "admin" && (
                  <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/15">
                    admin
                  </span>
                )}
              </p>
              {p.phone && (
                <p className="text-xs text-black/40 dark:text-white/40">
                  {p.phone}
                </p>
              )}
            </div>
            <span className="font-medium tabular-nums">
              {balanceMap.get(p.id) ?? 0} pont
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
