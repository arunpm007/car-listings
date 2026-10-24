"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthCard } from "@/components/admin/AuthCard";
import { requestPasswordReset } from "../public-actions";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await requestPasswordReset(String(new FormData(e.currentTarget).get("email")));
    setPending(false);
    setSent(true);
  }

  return (
    <AuthCard title="Forgot password">
      {sent ? (
        <div className="space-y-3 text-sm">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-900">
            <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            If that email belongs to an admin, a reset link is on its way. Check your inbox (and spam).
          </p>
          <Link href="/admin/login" className="font-semibold text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted">Enter your admin email and we&apos;ll send a link to choose a new password.</p>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input name="email" type="email" autoComplete="username" required className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
          </label>
          <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />} Send reset link
          </button>
          <Link href="/admin/login" className="block text-center text-sm text-muted hover:text-foreground">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
