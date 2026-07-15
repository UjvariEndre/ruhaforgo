import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "../actions";

type SearchParams = Promise<{ message?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

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
            Elfelejtett jelszó
          </h1>
        </div>

        {sp.message === "sent" ? (
          <p className="rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            Ha ehhez a címhez tartozik fiók, elküldtük rá a jelszó-beállító
            linket. Nézd meg a leveleidet – ha nem érkezik meg pár percen belül,
            szólj Tündinek, és küld egy linket kézzel.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Add meg az e-mail címed, és küldünk egy linket, amivel új jelszót
              állíthatsz be.
            </p>
            <form
              action={requestPasswordReset}
              className="flex flex-col gap-3"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="E-mail"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-green"
              />
              <button
                type="submit"
                className="mt-1 rounded-md bg-brand-green py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark"
              >
                Link kérése
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            ← Vissza a belépéshez
          </Link>
        </div>
      </div>
    </main>
  );
}
