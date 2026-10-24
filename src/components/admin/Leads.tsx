"use client";

import { Loader2, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { deleteLead, saveLead, type LeadInput } from "@/app/admin/actions";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/admin/Dialog";
import { whatsappHref } from "@/lib/contact";
import { formatDate } from "@/lib/format";
import { normalizeIndianPhone, waNumber } from "@/lib/phone";
import { LEAD_SOURCES, LEAD_STATUSES, type Lead, type LeadSource, type LeadStatus } from "@/lib/types";

export type CarOption = { id: number; label: string };

export const leadStatusLabel: Record<LeadStatus, string> = {
  new: "New",
  "follow-up": "Follow up",
  "visit-booked": "Visit booked",
  "in-deal": "In deal",
  bought: "Bought",
  lost: "Lost",
};

const leadStatusStyle: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  "follow-up": "bg-amber-100 text-amber-900",
  "visit-booked": "bg-indigo-100 text-indigo-800",
  "in-deal": "bg-amber-100 text-amber-900",
  bought: "bg-emerald-100 text-emerald-800",
  lost: "bg-zinc-200 text-zinc-700",
};

const sourceLabel: Record<LeadSource, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  "walk-in": "Walk-in",
  referral: "Referral",
  other: "Other",
};

function toInput(lead?: Lead, carId?: number): LeadInput {
  return {
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    car_id: lead?.car_id ?? carId ?? null,
    source: lead?.source ?? "call",
    status: lead?.status ?? "new",
    follow_up_on: lead?.follow_up_on ?? "",
    notes: lead?.notes ?? "",
  };
}

export function LeadForm({
  cars,
  lead,
  carId,
  onDone,
}: {
  cars: CarOption[];
  lead?: Lead;
  carId?: number;
  onDone?: () => void;
}) {
  const [values, setValues] = useState<LeadInput>(() => toInput(lead, carId));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phone = String(values.phone ?? "").trim();
    startTransition(async () => {
      const result = await saveLead(lead?.id ?? null, {
        ...values,
        // Store Indian mobiles in one format so they can be dialled and searched; keep anything else as typed.
        phone: phone ? (normalizeIndianPhone(phone) ?? phone) : "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!lead) setValues(toInput(undefined, carId));
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <input className={clsx(field, "sm:col-span-2")} placeholder="Name" value={values.name ?? ""} onChange={(e) => set("name", e.target.value)} />
      <input className={clsx(field, "sm:col-span-2")} placeholder="Phone" type="tel" value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
      <Select
        className="sm:col-span-2"
        label="Source"
        value={values.source}
        onChange={(v) => set("source", v as LeadSource)}
        options={LEAD_SOURCES.map((s) => ({ value: s, label: `Came by ${sourceLabel[s].toLowerCase()}` }))}
      />
      {carId === undefined && (
        <Select
          className="sm:col-span-3"
          label="Car"
          value={values.car_id == null ? "" : String(values.car_id)}
          onChange={(v) => set("car_id", v ? Number(v) : null)}
          options={[{ value: "", label: "No particular car" }, ...cars.map((c) => ({ value: String(c.id), label: c.label }))]}
        />
      )}
      <Select
        className={carId === undefined ? "sm:col-span-1" : "sm:col-span-2"}
        label="Status"
        value={values.status}
        onChange={(v) => set("status", v as LeadStatus)}
        // "In deal" is set from the car's Deal panel, so the car and buyer stay in step.
        options={LEAD_STATUSES.filter((s) => s !== "in-deal" || values.status === "in-deal").map((s) => ({ value: s, label: leadStatusLabel[s] }))}
      />
      <label className={clsx("flex items-center gap-2 text-sm", carId === undefined ? "sm:col-span-2" : "sm:col-span-4")}>
        <span className="shrink-0 text-muted">Follow up on</span>
        <input className={field} type="date" value={values.follow_up_on ?? ""} onChange={(e) => set("follow_up_on", e.target.value)} />
      </label>
      <input className={clsx(field, "sm:col-span-6")} placeholder="Notes — budget, what they want, when they can visit" value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      <div className="flex items-center gap-3 sm:col-span-6">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : !lead && <Plus className="size-4" />}
          {lead ? "Save" : "Add lead"}
        </button>
        {lead && onDone && (
          <button type="button" onClick={onDone} className="text-sm text-muted hover:text-foreground">
            Cancel
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}

export function LeadList({ leads, cars, today, showCar = true }: { leads: Lead[]; cars: CarOption[]; today: string; showCar?: boolean }) {
  if (!leads.length) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No leads here.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} cars={cars} today={today} showCar={showCar} />
      ))}
    </ul>
  );
}

function LeadRow({ lead, cars, today, showCar }: { lead: Lead; cars: CarOption[]; today: string; showCar: boolean }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const open = lead.status === "new" || lead.status === "follow-up" || lead.status === "visit-booked" || lead.status === "in-deal";
  const due = open && lead.follow_up_on != null && lead.follow_up_on <= today;

  if (editing) {
    return (
      <li className="bg-zinc-50 p-4">
        <LeadForm cars={cars} lead={lead} carId={showCar ? undefined : (lead.car_id ?? undefined)} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={clsx("flex flex-wrap items-start gap-3 p-4", pending && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {lead.name || "No name"}
          {lead.phone && <span className="ml-2 font-mono text-sm font-normal text-muted">{lead.phone}</span>}
        </p>
        <p className="text-xs text-muted">
          {sourceLabel[lead.source]} · {formatDate(lead.created_at)}
          {showCar && lead.car && lead.car_id && (
            <>
              {" · "}
              <Link href={`/admin/cars/${lead.car_id}`} className="text-accent hover:underline">
                {lead.car.code} {lead.car.year} {lead.car.brand.name} {lead.car.model.name}
              </Link>
            </>
          )}
        </p>
        {lead.notes && <p className="mt-1 text-sm">{lead.notes}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Lead status"
            value={lead.status}
            disabled={pending || lead.status === "in-deal"}
            title={lead.status === "in-deal" ? "Managed from the car's Deal & buyers panel" : undefined}
            onChange={(e) =>
              startTransition(async () => {
                await saveLead(lead.id, { ...toInput(lead), status: e.target.value as LeadStatus });
              })
            }
            className={clsx("h-7 rounded px-2 text-xs font-semibold", leadStatusStyle[lead.status])}
          >
            {LEAD_STATUSES.filter((s) => s !== "in-deal" || lead.status === "in-deal").map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel[s]}
              </option>
            ))}
          </select>
          {lead.follow_up_on && open && (
            <span className={clsx("text-xs", due ? "font-semibold text-red-600" : "text-muted")}>
              {due ? "Follow up due" : "Follow up"} {formatDate(lead.follow_up_on)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {lead.phone && (
          <>
            <a href={`tel:${lead.phone}`} aria-label="Call" className="rounded-md p-2 hover:bg-zinc-100">
              <Phone className="size-4" />
            </a>
            <a href={whatsappHref(`Hi ${lead.name ?? ""}`.trim(), waNumber(lead.phone))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-md p-2 text-whatsapp hover:bg-zinc-100">
              <MessageCircle className="size-4" />
            </a>
          </>
        )}
        <button type="button" aria-label="Edit lead" onClick={() => setEditing(true)} className="rounded-md p-2 hover:bg-zinc-100">
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Delete lead"
          onClick={async () => {
            if (await confirm({ title: "Delete this lead?", body: `${lead.name || lead.phone || "This lead"} is removed for good.`, confirmLabel: "Delete", danger: true }))
              startTransition(() => deleteLead(lead.id));
          }}
          className="rounded-md p-2 text-red-600 hover:bg-zinc-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

const field = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm";
