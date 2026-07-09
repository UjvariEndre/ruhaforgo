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

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold">ruhaforgó</h1>
        <p className="mb-6 text-center text-sm text-black/50 dark:text-white/50">
          Turkáló pontrendszer – Nyúl
        </p>

        <div className="mb-6 flex rounded-lg border border-black/10 p-1 text-sm dark:border-white/15">
          <Link
            href="/login"
            className={`flex-1 rounded-md py-1.5 text-center ${
              !isRegister ? "bg-foreground text-background" : ""
            }`}
          >
            Bejelentkezés
          </Link>
          <Link
            href="/login?mode=register"
            className={`flex-1 rounded-md py-1.5 text-center ${
              isRegister ? "bg-foreground text-background" : ""
            }`}
          >
            Regisztráció
          </Link>
        </div>

        {sp.error && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {sp.error}
          </p>
        )}
        {sp.message === "confirm" && (
          <p className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
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
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
              />
              <input
                name="phone"
                type="tel"
                placeholder="Telefonszám (opcionális)"
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
              />
            </>
          )}
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Jelszó"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-foreground py-2 text-sm font-medium text-background hover:opacity-90"
          >
            {isRegister ? "Fiók létrehozása" : "Belépés"}
          </button>
        </form>
      </div>
    </main>
  );
}
