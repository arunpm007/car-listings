"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled, or not allowed here; fall back to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      className={clsx("inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-medium text-muted transition hover:text-foreground", className)}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? "Link copied" : "Share this car"}
    </button>
  );
}
