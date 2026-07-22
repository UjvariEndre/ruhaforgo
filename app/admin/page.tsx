import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import CustomerActions from "./customer-actions";
import LoginLinkButton from "./login-link-button";
import NewCustomerForm from "./new-customer-form";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  q?: string;
  page?: string;
}>;

const PAGE_SIZE = 20;

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
    .select("full_name, role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  // Keresés + lapozás. A `q`-t megtisztítjuk azoktól a karakterektől, amik a
  // PostgREST `or()` szűrőt vagy az ilike mintát elrontanák.
  const rawQ = (sp.q ?? "").trim();
  const q = rawQ.replace(/[,()%*\\]/g, "");
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Aktív vásárlók (admin és törölt nélkül), szerver-oldali szűréssel + lapozással.
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, user_id", { count: "exact" })
    .neq("role", "admin")
    .is("deleted_at", null)
    .order("full_name", { ascending: true })
    .range(from, to);
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }
  const { data: customers, count } = await query;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Törölt vásárlók nem jelennek meg – a puha törlés visszaállítása kézzel,
  // Supabase-ből történik.

  // Egyenleg csak a most megjelenített profilokhoz.
  const shownIds = (customers ?? []).map((p) => p.id);
  const { data: balances } = shownIds.length
    ? await supabase
        .from("user_point_balances")
        .select("profile_id, balance")
        .in("profile_id", shownIds)
    : { data: [] };
  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.profile_id, b.balance]),
  );

  const fieldClass =
    "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (rawQ) params.set("q", rawQ);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

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
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted">
            Bejelentkezve: {me.full_name}
          </span>
          <form action={signOut}>
            <button className="text-sm text-muted hover:text-foreground">
              Kilépés
            </button>
          </form>
        </div>
      </header>

      <NewCustomerForm />

      {sp.error && (
        <p className="mb-4 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
          {sp.error}
        </p>
      )}
      {sp.message === "deleted" && (
        <p className="mb-4 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
          Vásárló törölve.
        </p>
      )}

      {/* Kereső */}
      <form
        action="/admin"
        method="get"
        className="mb-4 flex flex-col gap-2 sm:flex-row"
      >
        <input
          name="q"
          type="search"
          defaultValue={rawQ}
          placeholder="Keresés név, e-mail vagy telefonszám alapján…"
          className={`flex-1 ${fieldClass}`}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
          >
            Keresés
          </button>
          {rawQ && (
            <Link
              href="/admin"
              className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Törlés
            </Link>
          )}
        </div>
      </form>

      {/* Vásárlólista */}
      <h2 className="mb-3 text-sm font-medium text-muted">
        {rawQ ? `Találatok (${total})` : `Vásárlók (${total})`}
      </h2>
      {customers && customers.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-4">
          {customers.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/admin/${p.id}`}
                    className="font-medium text-brand-green hover:text-brand-green-dark hover:underline"
                  >
                    {p.full_name}
                  </Link>
                  {!p.email && (
                    <span className="ml-2 rounded bg-border/60 px-1.5 py-0.5 text-xs text-muted">
                      csak telefonos
                    </span>
                  )}
                </p>
                {p.email && (
                  <p className="truncate text-xs text-muted">{p.email}</p>
                )}
                {p.phone && <p className="text-xs text-muted">{p.phone}</p>}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="font-medium tabular-nums">
                  {balanceMap.get(p.id) ?? 0} pont
                </span>
                {p.email && <LoginLinkButton profileId={p.id} />}
              </div>

              <CustomerActions
                customer={{
                  id: p.id,
                  full_name: p.full_name,
                  email: p.email,
                  phone: p.phone,
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {rawQ ? "Nincs találat." : "Még nincs vásárló."}
        </p>
      )}

      {/* Lapozás */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-muted hover:border-brand-green hover:text-brand-green"
            >
              ← Előző
            </Link>
          ) : (
            <span className="rounded-md border border-border px-3 py-1.5 text-border">
              ← Előző
            </span>
          )}
          <span className="text-muted">
            {page} / {totalPages} oldal
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-muted hover:border-brand-green hover:text-brand-green"
            >
              Következő →
            </Link>
          ) : (
            <span className="rounded-md border border-border px-3 py-1.5 text-border">
              Következő →
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
