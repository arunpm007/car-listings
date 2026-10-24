import clsx from "clsx";
import type { CarStatus } from "@/lib/types";

const styles: Record<CarStatus, string> = {
  submitted: "bg-sky-100 text-sky-800",
  verified: "bg-indigo-100 text-indigo-800",
  listed: "bg-emerald-100 text-emerald-800",
  reserved: "bg-reserved text-white",
  sold: "bg-sold text-white",
  archived: "bg-zinc-200 text-zinc-700",
};

const labels: Record<CarStatus, string> = {
  submitted: "Not checked",
  verified: "Ready to publish",
  listed: "On sale",
  reserved: "In deal",
  sold: "Sold",
  archived: "Removed",
};

export function StatusBadge({ status, className }: { status: CarStatus; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", styles[status], className)}>
      {labels[status]}
    </span>
  );
}
