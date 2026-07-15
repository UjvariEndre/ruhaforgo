import Image from "next/image";
import Link from "next/link";
import { login, signup } from "./actions";

type SearchParams = Promise<{
  mode?: string;
  error?: string;
  message?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const isRegister = sp.mode === "register";

  const inputClass =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-green";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
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

        <div className="mb-6 flex rounded-lg border border-border bg-surface p-1 text-sm">
          <Link
            href="/login"
            className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
              !isRegister
                ? "bg-brand-green font-medium text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Bejelentkezés
          </Link>
          <Link
            href="/login?mode=register"
            className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
              isRegister
                ? "bg-brand-green font-medium text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Regisztráció
          </Link>
        </div>

        {sp.error && (
          <p className="mb-4 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
            {sp.error}
          </p>
        )}
        {sp.message === "confirm" && (
          <p className="mb-4 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            Elküldtük a megerősítő e-mailt. Kattints a benne lévő linkre, majd
            jelentkezz be.
          </p>
        )}

        <form
          action={isRegister ? signup : login}
          className="flex flex-col gap-3"
        >
          {isRegister && (
            <>
              <input
                name="full_name"
                type="text"
                required
                placeholder="Teljes név"
                className={inputClass}
              />
              <input
                name="phone"
                type="tel"
                placeholder="Telefonszám (opcionális)"
                className={inputClass}
              />
            </>
          )}
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
            minLength={6}
            placeholder="Jelszó"
            className={inputClass}
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-brand-green py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
          >
            {isRegister ? "Fiók létrehozása" : "Belépés"}
          </button>
        </form>
      </div>
    </main>
  );
}
