/**
 * The dark band at the top of inner pages, matching the home hero. It slides up under the
 * see-through header, so the page reads as one piece from the very top.
 */
export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative -mt-14 overflow-hidden bg-night pt-14 md:-mt-16 md:pt-16 text-white">
      <div className="pointer-events-none absolute -left-32 -top-24 size-[28rem] rounded-full bg-accent/20 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-9 pt-8 sm:pb-14 sm:pt-14">
        <p className="rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
          <span className="size-1.5 rounded-full bg-accent" />
          {eyebrow}
        </p>
        <h1 className="rise mt-3 font-display text-[2.1rem] font-bold leading-[1.05] sm:mt-4 sm:text-6xl" style={{ "--delay": "60ms" } as React.CSSProperties}>
          {title}
        </h1>
        {children && (
          <div className="rise mt-3 max-w-2xl text-base text-white/65 sm:mt-4 sm:text-lg" style={{ "--delay": "120ms" } as React.CSSProperties}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
