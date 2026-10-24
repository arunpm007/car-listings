"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/admin/AuthCard";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 12;

function SetPasswordForm() {
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [supabase] = useState(createClient);
  // Accounts that already have two-step login must also give a code before the password changes.
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        const factors = await supabase.auth.mfa.listFactors();
        setFactorId(factors.data?.totp.find((f) => f.status === "verified")?.id ?? null);
      }
    })();
  }, [supabase]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < MIN_LENGTH || !/[a-z]/i.test(password) || !/\d/.test(password)) {
      setError(`Use at least ${MIN_LENGTH} characters, with letters and numbers.`);
      return;
    }
    if (password !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    if (factorId) {
      const code = String(form.get("code") ?? "").replace(/\s/g, "");
      const verified = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verified.error) {
        setError("That authenticator code didn't work. Try the current code.");
        setPending(false);
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    // Next: two-step login (the admin area sends them there if it isn't set up yet).
    router.replace("/admin");
    router.refresh();
  }

  return (
    <AuthCard title={welcome ? "Welcome — choose your password" : "Choose a new password"}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">At least {MIN_LENGTH} characters, with letters and numbers. Don&apos;t reuse a password from another site.</p>
        <label className="block">
          <span className="text-sm font-medium">New password</span>
          <input name="password" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Type it again</span>
          <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
        </label>
        {factorId && (
          <label className="block">
            <span className="text-sm font-medium">Code from your authenticator app</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              placeholder="123 456"
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-center font-mono text-lg tracking-[0.3em]"
            />
            <span className="mt-1 block text-xs text-muted">Your account has two-step login, so it&apos;s needed to change the password. Lost the phone? Ask another admin to reset it.</span>
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />} Save password
        </button>
      </form>
    </AuthCard>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
