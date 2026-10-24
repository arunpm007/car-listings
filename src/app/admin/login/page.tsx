"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSite } from "@/components/SiteProvider";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const site = useSite();
  const router = useRouter();
  const linkError = useSearchParams().get("error") === "link";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <p className="text-sm text-muted">{site.name}</p>
          <h1 className="text-xl font-bold">Admin sign in</h1>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" autoComplete="username" required className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
        </label>
        {linkError && !error && <p className="text-sm text-red-600">That link has expired or was already used. Ask for a new one below.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Sign in
        </button>
        <Link href="/admin/forgot" className="block text-center text-sm text-muted hover:text-foreground">
          Forgot password?
        </Link>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
