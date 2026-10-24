"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { removeCar, setCarStatus } from "@/app/admin/actions";
import { Dialog, useConfirm } from "@/components/admin/Dialog";
import { REMOVED_REASONS, REMOVED_REASON_LABEL, type CarStatus, type RemovedReason } from "@/lib/types";

// The one-tap moves the mediator makes. Saving a car never changes its status; these buttons do.
// Deals go through the car's "Deal & buyers" panel, so the buyer and token get recorded.
type Action =
  | { status: CarStatus; label: string; tone: string; hint: string; confirm?: { title: string; body: string; confirmLabel: string } }
  | { deal: true; label: string; tone: string; hint: string }
  | { remove: true; label: string; tone: string; hint: string };

const REMOVE: Action = {
  remove: true,
  label: "Remove",
  tone: "border border-line text-red-700",
  hint: "Not sold through us: the owner sold it elsewhere or isn't selling. Kept in Removed, off the website.",
};

const NEXT: Partial<Record<CarStatus, Action[]>> = {
  submitted: [{ status: "listed", label: "Publish", tone: "bg-emerald-600 text-white", hint: "Show it on the website as on sale" }],
  verified: [{ status: "listed", label: "Publish", tone: "bg-emerald-600 text-white", hint: "Show it on the website as on sale" }, REMOVE],
  listed: [
    { deal: true, label: "Start deal", tone: "bg-reserved text-white", hint: "A buyer agreed: record who, and the token. Shows as In deal on the website." },
    {
      status: "sold",
      label: "Sold",
      tone: "bg-sold text-white",
      hint: "Sold through us: moves it to Recently sold",
      confirm: { title: "Sold through us?", body: "The car moves to Recently sold on the website. If the owner sold it elsewhere, use Remove instead.", confirmLabel: "Mark sold" },
    },
    { status: "verified", label: "Unpublish", tone: "border border-line", hint: "Hide it for now; it goes back to Ready to publish" },
    REMOVE,
  ],
  reserved: [{ deal: true, label: "Open deal", tone: "bg-reserved text-white", hint: "See the buyer, the waiting line, and close or pass on the deal" }, REMOVE],
  sold: [{ status: "archived", label: "Hide from Sold", tone: "border border-line", hint: "Take it off Recently sold; it's kept in Removed" }],
  archived: [{ status: "listed", label: "Publish again", tone: "border border-line", hint: "Show it on the website as on sale" }],
};

export function StatusActions({ id, status, title }: { id: number; status: CarStatus; title: string }) {
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);
  const confirm = useConfirm();

  return (
    <div className="flex flex-wrap gap-1.5">
      {NEXT[status]?.map((action) =>
        "deal" in action ? (
          <Link
            key={action.label}
            href={`/admin/cars/${id}#deal`}
            title={action.hint}
            className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold ${action.tone}`}
          >
            {action.label}
          </Link>
        ) : (
          <button
            key={action.label}
            type="button"
            title={action.hint}
            disabled={pending}
            onClick={async () => {
              if ("remove" in action) return setRemoving(true);
              if (action.confirm && !(await confirm(action.confirm))) return;
              startTransition(() => setCarStatus(id, action.status));
            }}
            className={`h-8 rounded-md px-3 text-xs font-semibold disabled:opacity-50 ${action.tone}`}
          >
            {action.label}
          </button>
        ),
      )}
      {removing && <RemoveDialog id={id} title={title} inDeal={status === "reserved"} onClose={() => setRemoving(false)} />}
    </div>
  );
}

/** Asks why the car is coming off the site, then keeps it under Removed with that reason. */
function RemoveDialog({ id, title, inDeal, onClose }: { id: number; title: string; inDeal: boolean; onClose: () => void }) {
  const [reason, setReason] = useState<RemovedReason>("sold_elsewhere");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await removeCar(id, { reason, note });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog title="Take this car off the website" onClose={onClose}>
      <form onSubmit={submit} className="mt-1 space-y-4 text-sm">
        <p className="text-muted">
          {title}. It stays in <strong className="text-foreground">Removed</strong> with its photos, owner details and buyers, so you can look it up or put it back on sale later.
        </p>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-medium">Why?</legend>
          {REMOVED_REASONS.map((r) => (
            <label key={r} className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5", reason === r ? "border-foreground bg-black/[0.03]" : "border-line")}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-foreground" />
              {REMOVED_REASON_LABEL[r]}
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="font-medium">Note</span> <span className="text-muted">(optional, only you see it)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={reason === "sold_elsewhere" ? "e.g. Sold to a neighbour for ₹4 lakh" : ""}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
          />
        </label>
        {inDeal && <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">The buyer in the deal is moved to lost in Leads, with this reason.</p>}
        <p className="text-xs text-muted">Sold through you? Close it with Sold instead, so it shows under Recently sold.</p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-line px-4 font-semibold hover:bg-black/5 sm:h-10">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 font-semibold text-white disabled:opacity-60 sm:h-10">
            {pending && <Loader2 className="size-4 animate-spin" />} Take off website
          </button>
        </div>
      </form>
    </Dialog>
  );
}
