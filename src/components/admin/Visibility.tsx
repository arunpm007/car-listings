import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import { isPublicStatus, type CarStatus } from "@/lib/types";

/** Says in plain words whether buyers can see the car. */
export function Visibility({ status, className }: { status: CarStatus; className?: string }) {
  const live = isPublicStatus(status);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        live ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
        className,
      )}
    >
      {live ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
      {live ? "Live on website" : "Hidden from website"}
    </span>
  );
}
