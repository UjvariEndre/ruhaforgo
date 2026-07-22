"use client";

import { useActionState, useEffect, useRef } from "react";
import { adjustPoints, type AdjustPointsState } from "./actions";

const fieldClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export default function AdjustPointsForm({
  profileId,
}: {
  profileId: string;
}) {
  const [state, formAction, pending] = useActionState<
    AdjustPointsState,
    FormData
  >(adjustPoints, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Sikeres rögzítés után ürítjük az összeg/megjegyzés mezőt; az egyenleg és az
  // előzmények a szerver revalidálásából frissülnek helyben.
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <section className="mb-10 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Pont jóváírása / levonása</h2>

      {state.error && (
        <p className="mb-3 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mb-3 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
          {state.message}
        </p>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="profile_id" value={profileId} />
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
          disabled={pending}
          className="self-start rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
        >
          {pending ? "Rögzítés…" : "Rögzítés"}
        </button>
      </form>
    </section>
  );
}
