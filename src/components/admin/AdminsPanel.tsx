"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import clsx from "clsx";
import { inviteAdmin, removeAdmin, resetAdminMfa } from "@/app/admin/actions";
import { useConfirm } from "@/components/admin/Dialog";
import type { AdminAccount } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";

/** Who can manage the website, and the buttons to add or take away access. */
export function AdminsPanel({ admins, meId }: { admins: AdminAccount[]; meId: string }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      setMessage({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : (r.error ?? "Something went wrong") });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-10 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Admins</h2>
        <p className="mt-0.5 text-sm text-muted">People who can sign in here. Everyone needs a password and two-step login.</p>
      </div>
      {message && (
        <p className={clsx("rounded-lg p-3 text-sm", message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{message.text}</p>
      )}

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-semibold">
                {a.email ?? "Unknown"} {a.id === meId && <span className="font-normal text-muted">(you)</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span>Added {formatDate(a.addedAt)}</span>
                <span>· {a.lastSignIn ? `last signed in ${formatDate(a.lastSignIn)}` : "hasn't signed in yet"}</span>
                {a.hasMfa ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="size-3.5" aria-hidden /> two-step login on
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <ShieldAlert className="size-3.5" aria-hidden /> two-step login not set up
                  </span>
                )}
              </p>
            </div>
            {a.id !== meId && (
              <div className="flex gap-1.5">
                {a.hasMfa && (
                  <button
                    type="button"
                    disabled={pending}
                    title="For someone who lost their phone: they set it up again at their next sign-in"
                    onClick={async () =>
                      (await confirm({ title: "Reset two-step login?", body: `${a.email} will set up their authenticator app again at their next sign-in.`, confirmLabel: "Reset" })) &&
                      run(() => resetAdminMfa(a.id))
                    }
                    className="h-8 rounded-md border border-line px-2.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Reset two-step
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () =>
                    (await confirm({ title: "Remove this admin?", body: `${a.email} loses access straight away.`, confirmLabel: "Remove admin", danger: true })) &&
                    run(() => removeAdmin(a.id))
                  }
                  className="h-8 rounded-md border border-red-200 px-2.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => inviteAdmin(email), () => setEmail(""));
        }}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4"
      >
        <label className="min-w-0 flex-1">
          <span className="text-sm font-medium">Invite someone</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="their@email.com"
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" aria-hidden />} Send invite
        </button>
        <p className="w-full text-xs text-muted">They get an email link to choose a password, then set up two-step login on their phone.</p>
      </form>
    </section>
  );
}
