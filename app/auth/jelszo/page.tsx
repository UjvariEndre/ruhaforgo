import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPassword } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Ide csak érvényes meghívó / visszaállító linkkel lehet bejutni: azt a
  // session-t az /auth/confirm hozta létre.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent("Ehhez érvényes link kell. Kérj újat az „Elfelejtetted a jelszavad?” gombbal.")}`,
    );
  }

  const inputClass =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-green";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.jpg"
            alt="RuhaForgó"
            width={160}
            height={160}
            priority
            className="h-32 w-32 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="mt-3 text-center text-sm font-medium">
            Jelszó beállítása
          </h1>
          <p className="mt-1 text-center text-xs text-muted">{user.email}</p>
        </div>

        {sp.error && (
          <p className="mb-4 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
            {sp.error}
          </p>
        )}

        <form action={setPassword} className="flex flex-col gap-3">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Új jelszó"
            className={inputClass}
          />
          <input
            name="password_confirm"
            type="password"
            required
            minLength={6}
            placeholder="Új jelszó még egyszer"
            className={inputClass}
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-brand-green py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
          >
            Mentés és belépés
          </button>
        </form>
      </div>
    </main>
  );
}
