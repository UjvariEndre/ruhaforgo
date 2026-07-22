import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";

type SearchParams = Promise<{
  error?: string;
  message?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const inputClass =
    "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

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
          <p className="mt-3 text-center text-sm text-muted">
            Pontok kezelése – Nyúl
          </p>
        </div>

        {sp.error && (
          <p className="mb-4 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
            {sp.error}
          </p>
        )}
        {sp.message === "password-set" && (
          <p className="mb-4 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            A jelszavad elmentve. Jelentkezz be vele.
          </p>
        )}

        <form action={login} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className={inputClass}
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Jelszó"
            className={inputClass}
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-brand-green py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
          >
            Belépés
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <Link
            href="/login/elfelejtett"
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Elfelejtetted a jelszavad?
          </Link>
          <p className="text-xs text-muted">
            Még nincs fiókod? A pontgyűjtő fiókot a boltban hozzuk létre neked –
            szólj Tündének, és küldünk egy jelszó-beállító linket.
          </p>
        </div>
      </div>
    </main>
  );
}
