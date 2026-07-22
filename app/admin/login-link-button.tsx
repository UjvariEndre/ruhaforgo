"use client";

import { useActionState, useState } from "react";
import { createLoginLink, type LoginLinkState } from "./actions";

export default function LoginLinkButton({
  profileId,
}: {
  profileId: string;
}) {
  const [state, formAction, pending] = useActionState<LoginLinkState, FormData>(
    createLoginLink,
    {},
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <input type="hidden" name="profile_id" value={profileId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-brand-green hover:text-brand-green disabled:opacity-50"
        >
          {pending ? "Készül…" : "Belépő link"}
        </button>
      </form>

      {state.error && (
        <p className="text-xs text-brand-terracotta">{state.error}</p>
      )}

      {state.link && (
        <div className="flex w-full max-w-md flex-col gap-1 rounded-md border border-border bg-background p-2">
          <p className="text-xs text-muted">
            Küldd át {state.forName} részére – a link egyszer használható, és
            érvényteleníti a korábbiakat:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={state.link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded border border-border bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded bg-brand-green px-2 py-1 text-xs font-medium text-white hover:bg-brand-green-dark"
            >
              {copied ? "Másolva" : "Másol"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
