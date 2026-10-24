export function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="shimmer aspect-[4/3]" />
      <div className="space-y-3 p-5">
        <div className="shimmer h-5 w-2/3 rounded" />
        <div className="shimmer h-4 w-1/3 rounded" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="shimmer h-3 rounded" />
          <div className="shimmer h-3 rounded" />
          <div className="shimmer h-3 rounded" />
          <div className="shimmer h-3 rounded" />
        </div>
        <div className="shimmer mt-4 h-7 w-24 rounded" />
      </div>
    </div>
  );
}
