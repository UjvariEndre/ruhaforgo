import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adjustPoints } from "./actions";
import LoginLinkButton from "./login-link-button";
import NewCustomerForm from "./new-customer-form";

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
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, user_id")
    .order("full_name", { ascending: true });

  const { data: balances } = await supabase
    .from("user_point_balances")
    .select("profile_id, balance");

  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.profile_id, b.balance]),
  );

  const fieldClass =
    "rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-green";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="RuhaForgó"
            width={44}
            height={44}
            className="h-11 w-11 rounded-lg object-cover"
          />
          <h1 className="text-lg font-semibold">RuhaForgó pontok kezelése</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Vissza
        </Link>
      </header>

      <NewCustomerForm />

      {sp.error && (
        <p className="mb-4 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
          {sp.error}
        </p>
      )}
      {sp.message === "ok" && (
        <p className="mb-4 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
          Pontmozgás rögzítve.
        </p>
      )}

      {/* Pont rögzítése */}
      <section className="mb-10 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Pont jóváírása / levonása</h2>
        <form action={adjustPoints} className="flex flex-col gap-3">
          <select
            name="profile_id"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Válassz vásárlót…
            </option>
            {(profiles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} — {balanceMap.get(p.id) ?? 0} pont
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <select name="type" defaultValue="credit" className={fieldClass}>
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
              className={`w-28 ${fieldClass}`}
            />
            <input
              name="reason"
              type="text"
              placeholder="Megjegyzés (pl. Levi's dzseki, vásárlás)"
              className={`flex-1 ${fieldClass}`}
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
          >
            Rögzítés
          </button>
        </form>
      </section>

      {/* Vásárlólista */}
      <h2 className="mb-3 text-sm font-medium text-muted">
        Vásárlók ({profiles?.length ?? 0})
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-4">
        {(profiles ?? []).map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm">
                {p.full_name}
                {p.role === "admin" && (
                  <span className="ml-2 rounded bg-brand-ochre/20 px-1.5 py-0.5 text-xs text-brand-brown">
                    admin
                  </span>
                )}
                {!p.email && (
                  <span className="ml-2 rounded bg-border/60 px-1.5 py-0.5 text-xs text-muted">
                    csak telefonos
                  </span>
                )}
              </p>
              {p.email && <p className="truncate text-xs text-muted">{p.email}</p>}
              {p.phone && <p className="text-xs text-muted">{p.phone}</p>}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="font-medium tabular-nums">
                {balanceMap.get(p.id) ?? 0} pont
              </span>
              {p.email && <LoginLinkButton profileId={p.id} />}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
