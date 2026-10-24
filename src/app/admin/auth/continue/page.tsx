import { ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/admin/AuthCard";
import { confirmEmailLink } from "../../public-actions";

/**
 * Where invite and reset emails land. The one-time link is only used when the person taps
 * Continue: mail scanners (Outlook and others) open links on their own, and would use it up.
 */
export default async function ContinuePage({ searchParams }: PageProps<"/admin/auth/continue">) {
  const sp = await searchParams;
  const type = sp.type === "invite" ? "invite" : "recovery";
  return (
    <AuthCard title={type === "invite" ? "Welcome" : "Reset your password"}>
      <p className="text-sm text-muted">
        {type === "invite" ? "Tap continue to set your password and finish setting up your admin login." : "Tap continue to choose a new password."}
      </p>
      <form action={confirmEmailLink} className="space-y-4">
        <input type="hidden" name="token_hash" value={typeof sp.token_hash === "string" ? sp.token_hash : ""} />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white">
          Continue <ArrowRight className="size-4" aria-hidden />
        </button>
      </form>
    </AuthCard>
  );
}
