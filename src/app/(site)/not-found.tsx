import Link from "next/link";
import { ArrowRight, CarFront } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <CarFront className="rise mx-auto size-16 text-accent" aria-hidden />
      <h1 className="rise mt-6 font-display text-4xl font-bold" style={{ "--delay": "80ms" } as React.CSSProperties}>
        This car has driven off
      </h1>
      <p className="rise mt-3 text-lg text-muted" style={{ "--delay": "160ms" } as React.CSSProperties}>
        It may have been sold or taken down.
      </p>
      <Link
        href="/cars"
        className="rise group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 font-semibold text-white transition hover:bg-accent"
        style={{ "--delay": "240ms" } as React.CSSProperties}
      >
        See cars on sale <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
      </Link>
    </div>
  );
}
