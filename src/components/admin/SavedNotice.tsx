"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, Pencil, Upload, X } from "lucide-react";
import { setCarStatus } from "@/app/admin/actions";

type Props = {
  carId: number;
  title: string;
  code: string;
  live: boolean;
  added: boolean;
  editHref: string;
  publicHref: string;
};

/**
 * The note shown after saving a car. Saving never publishes, so a hidden car gets its own
 * Publish button here. Clears itself (and the URL) after a few seconds.
 */
export function SavedNotice({ carId, title, code, live: initiallyLive, added, editHref, publicHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(true);
  const [live, setLive] = useState(initiallyLive);
  const [justPublished, setJustPublished] = useState(false);
  const [pending, startTransition] = useTransition();

  // Restart the countdown after publishing, so there's time to tap "View on website".
  useEffect(() => {
    if (pending) return;
    const t = setTimeout(() => setOpen(false), justPublished ? 8000 : 10000);
    return () => clearTimeout(t);
  }, [justPublished, pending]);

  // Drop ?saved= from the address once it's gone, so a reload doesn't show it again.
  useEffect(() => {
    if (open) return;
    const next = new URLSearchParams(params);
    next.delete("saved");
    next.delete("added");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [open, params, pathname, router]);

  if (!open) return null;

  function publish() {
    startTransition(async () => {
      await setCarStatus(carId, "listed");
      setLive(true);
      setJustPublished(true);
    });
  }

  return (
    <div role="status" className="toast-in fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl bg-foreground p-4 text-white shadow-2xl sm:bottom-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {justPublished ? `${title} published` : `${title} ${added ? "added" : "saved"}`}
          </p>
          <p className="mt-0.5 text-sm text-white/70">
            <span className="font-mono">{code}</span> · {live ? "Live on the website" : "Not on the website yet"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {live ? (
              <Link href={publicHref} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-foreground">
                View on website <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={publish}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-white disabled:opacity-70"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Upload className="size-3.5" aria-hidden />}
                Publish to website
              </button>
            )}
            <Link href={editHref} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
              <Pencil className="size-3.5" aria-hidden /> Edit again
            </Link>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Dismiss" className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
