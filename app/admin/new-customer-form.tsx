"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCustomer, type CreateCustomerState } from "./actions";

const fieldClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export default function NewCustomerForm() {
  const [state, formAction, pending] = useActionState<
    CreateCustomerState,
    FormData
  >(createCustomer, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Sikeres felvétel után ürítsük a mezőket, hogy jöhessen a következő vásárló.
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <section className="mb-8 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-medium">Új vásárló létrehozása</h2>
      <p className="mb-4 text-xs text-muted">
        Az e-mail az elsődleges: aki megadja, kap egy jelszó-beállító linket, és
        maga is nézheti a pontjait. Telefonszám is elég – akkor a pontjait csak
        te látod.
      </p>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input
          name="full_name"
          type="text"
          required
          placeholder="Név"
          className={fieldClass}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            className={`flex-1 ${fieldClass}`}
          />
          <input
            name="phone"
            type="tel"
            placeholder="Telefonszám"
            className={`flex-1 ${fieldClass}`}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
        >
          {pending ? "Létrehozás…" : "Létrehozás"}
        </button>
      </form>

      {state.error && (
        <p className="mt-3 rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-3 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
          {state.message}
        </p>
      )}
    </section>
  );
}
