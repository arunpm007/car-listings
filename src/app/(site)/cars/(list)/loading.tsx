import { CarCardSkeleton } from "@/components/CarCardSkeleton";

export default function Loading() {
  return (
    <>
      <section className="-mt-14 bg-night pt-14 md:-mt-16 md:pt-16">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-14">
          <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-14 w-96 max-w-full animate-pulse rounded-xl bg-white/10" />
          <div className="mt-4 h-5 w-80 max-w-full animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-20 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
