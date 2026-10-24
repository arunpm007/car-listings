import { Clock } from "lucide-react";
import clsx from "clsx";

/** Whether a buyer can see the car straight away, or a viewing has to be set up with its owner. */
export function WhereTag({ withUs, className }: { withUs: boolean; className?: string }) {
  return withUs ? (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700", className)}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Ready to see
    </span>
  ) : (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium text-muted", className)}>
      <Clock className="size-3.5" aria-hidden /> Viewing by appointment
    </span>
  );
}
