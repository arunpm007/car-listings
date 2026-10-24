"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/admin/AuthCard";
import { createClient } from "@/lib/supabase/client";

type Mode =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "setup"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

/**
 * Two-step login. First time: scan a QR code into an authenticator app and confirm a code.
 * After that: type the app's current 6-digit code after the password.
 */
export default function MfaPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setMode({ kind: "error", message: error.message });
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setMode({ kind: "verify", factorId: verified.id });

      // Clear out a half-finished setup from an earlier visit, then start a fresh one.
      for (const f of data.all.filter((f) => f.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const enrolled = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
      if (enrolled.error) return setMode({ kind: "error", message: enrolled.error.message });
      setMode({ kind: "setup", factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret });
    })();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "verify" && mode.kind !== "setup") return;
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mode.factorId, code: code.replace(/\s/g, "") });
    if (error) {
      setError("That code didn't work. Check the app and try the current code.");
      setPending(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <AuthCard title={mode.kind === "setup" ? "Set up two-step login" : "Two-step login"}>
      {mode.kind === "loading" && <Loader2 className="mx-auto size-6 animate-spin text-muted" />}
      {mode.kind === "error" && <p className="text-sm text-red-600">{mode.message}</p>}

      {mode.kind === "setup" && (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            Open an authenticator app (Google Authenticator, Microsoft Authenticator or similar), tap <strong>Add</strong>, and scan this code.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from Supabase */}
          <img src={mode.qr} alt="QR code for your authenticator app" className="mx-auto size-48 rounded-lg border border-line bg-white p-2" />
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">Can&apos;t scan? Type this key instead</summary>
            <p className="mt-1 break-all font-mono text-foreground">{mode.secret}</p>
          </details>
        </div>
      )}

      {(mode.kind === "setup" || mode.kind === "verify") && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">{mode.kind === "setup" ? "Code shown in the app" : "Code from your authenticator app"}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              autoFocus
              placeholder="123 456"
              className="mt-1 h-12 w-full rounded-lg border border-line px-3 text-center font-mono text-xl tracking-[0.3em]"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" aria-hidden />} {mode.kind === "setup" ? "Turn on two-step login" : "Continue"}
          </button>
          {mode.kind === "verify" && (
            <p className="text-xs text-muted">Lost your phone? Ask another admin to reset your two-step login in Settings → Admins.</p>
          )}
        </form>
      )}

      <button type="button" onClick={signOut} className="w-full text-center text-sm text-muted hover:text-foreground">
        Sign out
      </button>
    </AuthCard>
  );
}
