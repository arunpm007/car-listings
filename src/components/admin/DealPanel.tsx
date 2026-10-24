"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Handshake, Loader2, MessageCircle, Phone, Trash2, UserPlus, Users, X } from "lucide-react";
import clsx from "clsx";
import { endDeal, removeFromQueue, saveLead, startDeal } from "@/app/admin/actions";
import { AmountInput } from "@/components/ui/AmountInput";
import { useConfirm } from "@/components/admin/Dialog";
import { telHref, whatsappHref } from "@/lib/contact";
import { formatDate, formatPrice } from "@/lib/format";
import { waNumber } from "@/lib/phone";
import type { CarStatus, Lead } from "@/lib/types";

type Props = {
  carId: number;
  carTitle: string;
  status: CarStatus;
  deal: { lead: Lead | null; token: number | null; startedAt: string | null } | null;
  /** Open leads on this car other than the deal buyer, oldest first: the line. */
  waiting: Lead[];
  /** Buyers who bought or dropped out. */
  past: Lead[];
};

/** Who the car is in deal with, who's waiting next, and the buttons to move between them. */
export function DealPanel({ carId, carTitle, status, deal, waiting, past }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inDeal = status === "reserved";
  const canDeal = status === "listed" || status === "reserved";

  function run(action: () => Promise<{ ok: boolean; error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) setError(result.error ?? "Something went wrong");
      else router.refresh();
    });
  }

  return (
    <section id="deal" className="scroll-mt-28 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold">Deal &amp; buyers</h2>
        <p className="text-sm text-muted">
          {waiting.length} {waiting.length === 1 ? "buyer" : "buyers"} waiting
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {inDeal && deal?.lead ? (
        <CurrentDeal key={deal.lead.id} carId={carId} carTitle={carTitle} deal={{ lead: deal.lead, token: deal.token, startedAt: deal.startedAt }} waiting={waiting} pending={pending} run={run} />
      ) : canDeal ? (
        <StartDeal carId={carId} inDealWithoutBuyer={inDeal} waiting={waiting} pending={pending} run={run} />
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          {status === "sold"
            ? "This car is sold. People still in the line below may want a similar car."
            : status === "archived"
              ? "This car is off the website. People still in the line below may want a similar car."
              : "Publish the car first; then you can start a deal with a buyer."}
        </p>
      )}

      <WaitingList carId={carId} carTitle={carTitle} waiting={waiting} canStart={status === "listed"} pending={pending} run={run} />

      {past.length > 0 && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Past buyers ({past.length})</summary>
          <ul className="divide-y divide-line border-t border-line">
            {past.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{l.name || "No name"}</span>
                {l.phone && <span className="font-mono text-muted">{l.phone}</span>}
                <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", l.status === "bought" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700")}>
                  {l.status === "bought" ? "Bought" : "Dropped out"}
                </span>
                {l.notes && <span className="w-full whitespace-pre-line text-xs text-muted">{l.notes}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

type Run = (action: () => Promise<{ ok: boolean; error?: string } | void>) => void;

function CurrentDeal({
  carId,
  carTitle,
  deal,
  waiting,
  pending,
  run,
}: {
  carId: number;
  carTitle: string;
  deal: { lead: Lead; token: number | null; startedAt: string | null };
  waiting: Lead[];
  pending: boolean;
  run: Run;
}) {
  const confirm = useConfirm();
  const [ending, setEnding] = useState(false);
  const [next, setNext] = useState<string>(waiting[0] ? String(waiting[0].id) : "");
  const { lead } = deal;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-800">
        <Handshake className="size-4" aria-hidden /> In deal with
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{lead.name || "Buyer (no name)"}</p>
      <p className="mt-1 text-sm text-muted">
        {[lead.phone, deal.token ? `Token ${formatPrice(deal.token)}` : "No token recorded", deal.startedAt ? `since ${formatDate(deal.startedAt)}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {lead.notes && <p className="mt-2 whitespace-pre-line text-sm">{lead.notes}</p>}
      {lead.phone && <ContactRow phone={lead.phone} name={lead.name} carTitle={carTitle} />}

      {!ending ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={async () =>
              (await confirm({ title: `Sold to ${lead.name || "this buyer"}?`, body: "The car moves to Recently sold on the website.", confirmLabel: "Mark sold" })) &&
              run(() => endDeal(carId, "sold"))
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" aria-hidden />} Deal done — mark Sold
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEnding(true)}
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold disabled:opacity-60"
          >
            Deal fell through
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold">What happens to the car now?</p>
          <div className="mt-3 space-y-2 text-sm">
            {waiting.map((l, i) => (
              <label key={l.id} className="flex cursor-pointer items-start gap-2">
                <input type="radio" name="next" checked={next === String(l.id)} onChange={() => setNext(String(l.id))} className="mt-0.5 accent-[var(--accent)]" />
                <span>
                  Start a deal with <strong>#{i + 1} {l.name || l.phone || "buyer"}</strong>
                  {i === 0 && <span className="text-muted"> (next in line)</span>}
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" name="next" checked={next === ""} onChange={() => setNext("")} className="mt-0.5 accent-[var(--accent)]" />
              <span>Put it back on sale</span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => endDeal(carId, "fell-through", next ? Number(next) : null))}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Confirm
            </button>
            <button type="button" onClick={() => setEnding(false)} className="h-10 rounded-lg px-3 text-sm font-semibold text-muted">
              Cancel
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">{lead.name || "This buyer"} is kept under Past buyers as dropped out.</p>
        </div>
      )}
    </div>
  );
}

function StartDeal({ carId, inDealWithoutBuyer, waiting, pending, run }: { carId: number; inDealWithoutBuyer: boolean; waiting: Lead[]; pending: boolean; run: Run }) {
  const [open, setOpen] = useState(inDealWithoutBuyer);
  const [buyer, setBuyer] = useState<string>(waiting[0] ? String(waiting[0].id) : "new");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 text-sm font-semibold text-amber-900 hover:bg-amber-50"
      >
        <Handshake className="size-4" aria-hidden /> A buyer agreed? Start a deal
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          startDeal(carId, {
            leadId: buyer === "new" ? null : Number(buyer),
            name,
            phone,
            token: token ? Number(token) : null,
            notes,
          }),
        );
      }}
      className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Handshake className="size-4" aria-hidden /> {inDealWithoutBuyer ? "Who is this car in deal with?" : "Start a deal"}
      </p>
      <div className="mt-3 space-y-2 text-sm">
        {waiting.map((l, i) => (
          <label key={l.id} className="flex cursor-pointer items-start gap-2">
            <input type="radio" name="buyer" checked={buyer === String(l.id)} onChange={() => setBuyer(String(l.id))} className="mt-0.5 accent-[var(--accent)]" />
            <span>
              <strong>
                #{i + 1} {l.name || "No name"}
              </strong>{" "}
              <span className="text-muted">{l.phone}</span>
            </span>
          </label>
        ))}
        <label className="flex cursor-pointer items-start gap-2">
          <input type="radio" name="buyer" checked={buyer === "new"} onChange={() => setBuyer("new")} className="mt-0.5 accent-[var(--accent)]" />
          <span>Someone new</span>
        </label>
      </div>
      {buyer === "new" && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Buyer's name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="text-sm font-medium">Token received</span>
          <div className="mt-1">
            <AmountInput kind="price" label="Token received" defaultUnit="thousand" value={token} onChange={setToken} />
          </div>
        </div>
        <div>
          <span className="text-sm font-medium">Notes</span>
          <input className={clsx(field, "mt-1")} placeholder="e.g. Pays balance on Saturday" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />} {inDealWithoutBuyer ? "Save buyer" : "Start deal"}
        </button>
        {!inDealWithoutBuyer && (
          <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg px-3 text-sm font-semibold text-muted">
            Cancel
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">The car shows as &ldquo;In deal&rdquo; on the website, so other buyers know it&apos;s taken.</p>
    </form>
  );
}

function WaitingList({ carId, carTitle, waiting, canStart, pending, run }: { carId: number; carTitle: string; waiting: Lead[]; canStart: boolean; pending: boolean; run: Run }) {
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" aria-hidden /> Waiting buyers
        </p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            <UserPlus className="size-4" aria-hidden /> Add
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const result = await saveLead(null, { name, phone, car_id: carId, source: "call", status: "new", follow_up_on: "", notes });
              if (result.ok) {
                setAdding(false);
                setName("");
                setPhone("");
                setNotes("");
              }
              return result;
            });
          }}
          className="grid grid-cols-1 gap-2 border-b border-line bg-background/60 p-4 sm:grid-cols-3"
        >
          <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={field} placeholder="Notes (budget, when they can come)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white disabled:opacity-60">
              {pending && <Loader2 className="size-4 animate-spin" />} Add to the line
            </button>
            <button type="button" onClick={() => setAdding(false)} className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-muted">
              <X className="size-4" aria-hidden /> Cancel
            </button>
          </div>
        </form>
      )}

      {waiting.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">Nobody waiting yet. Add people who call about this car so you can go to them next.</p>
      ) : (
        <ol className="divide-y divide-line">
          {waiting.map((l, i) => (
            <li key={l.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground font-display text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {l.name || "No name"}
                  {l.phone && <span className="ml-2 font-mono text-sm font-normal text-muted">{l.phone}</span>}
                </p>
                <p className="text-xs text-muted">Called {formatDate(l.created_at)}</p>
                {l.notes && <p className="mt-1 whitespace-pre-line text-sm">{l.notes}</p>}
                {l.phone && <ContactRow phone={l.phone} name={l.name} carTitle={carTitle} compact />}
              </div>
              <div className="flex items-center gap-1">
                {canStart && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => startDeal(carId, { leadId: l.id, name: "", phone: "", token: null, notes: "" }))}
                    className="h-8 rounded-md bg-amber-500 px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Start deal
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${l.name || "buyer"} from the line`}
                  onClick={async () =>
                    (await confirm({ title: `Remove ${l.name || "this buyer"} from the line?`, body: "They stay in Leads, marked as lost.", confirmLabel: "Remove" })) &&
                    run(() => removeFromQueue(l.id))
                  }
                  className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ContactRow({ phone, name, carTitle, compact = false }: { phone: string; name: string | null; carTitle: string; compact?: boolean }) {
  return (
    <div className={clsx("flex flex-wrap gap-2", compact ? "mt-2" : "mt-3")}>
      <a href={telHref(phone)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-white">
        <Phone className="size-3.5" aria-hidden /> Call
      </a>
      <a
        href={whatsappHref(`Hi${name ? ` ${name}` : ""}, this is about the ${carTitle}.`, waNumber(phone))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-whatsapp px-3 text-xs font-semibold text-white"
      >
        <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
      </a>
    </div>
  );
}

const field = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm";
