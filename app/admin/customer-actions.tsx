"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteCustomer,
  updateCustomer,
  type UpdateCustomerState,
} from "./actions";

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

const fieldClass =
  "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export default function CustomerActions({ customer }: { customer: Customer }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Kattintás a menün kívül → bezárás.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    setConfirmingDelete(false);
  }

  return (
    <>
      <div ref={wrapRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Műveletek"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <GearIcon />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
            {!confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    closeMenu();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background"
                >
                  <PencilIcon />
                  Szerkesztés
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-terracotta hover:bg-brand-terracotta/10"
                >
                  <TrashIcon />
                  Törlés
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <p className="mb-2 text-xs text-muted">
                  Biztosan törlöd? Később visszaállítható.
                </p>
                <div className="flex items-center gap-2">
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={customer.id} />
                    <button
                      type="submit"
                      className="rounded bg-brand-terracotta px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Törlés
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
                  >
                    Mégse
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <EditDialog customer={customer} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function EditDialog({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateCustomerState,
    FormData
  >(updateCustomer, {});

  // Sikeres mentés után zárjuk be – a lista a revalidálással frissül.
  useEffect(() => {
    if (state.message) onClose();
  }, [state.message, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-medium">Vásárló szerkesztése</h2>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={customer.id} />
          <input
            name="full_name"
            type="text"
            required
            defaultValue={customer.full_name}
            placeholder="Név"
            className={fieldClass}
          />
          <input
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            placeholder="E-mail"
            className={fieldClass}
          />
          <input
            name="phone"
            type="tel"
            defaultValue={customer.phone ?? ""}
            placeholder="Telefonszám"
            className={fieldClass}
          />

          {state.error && (
            <p className="rounded-md bg-brand-terracotta/10 px-3 py-2 text-sm text-brand-terracotta">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
            >
              {pending ? "Mentés…" : "Mentés"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Ikonok (inline SVG, külső függőség nélkül) ---------------------------

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
