"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Car as CarIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Photo = { full: string; thumb: string; credit: string | null };

export function Gallery({ photos, alt, transitionName }: { photos: Photo[]; alt: string; transitionName: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(photos.length - 1, i));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    },
    [photos.length],
  );

  if (!photos.length) {
    return (
      <ViewTransition name={transitionName} share="morph" default="none">
        <div className="-mx-4 flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-[#e8e4da] text-foreground/35 sm:mx-0 sm:rounded-[2rem]">
          <CarIcon className="size-20" aria-hidden />
          <span className="text-sm font-medium text-foreground/55">Photos coming soon</span>
        </div>
      </ViewTransition>
    );
  }

  return (
    <div>
      <ViewTransition name={transitionName} share="morph" default="none">
        <div className="group relative -mx-4 overflow-hidden bg-night sm:mx-0 sm:rounded-[2rem]">
          <div
            ref={track}
            onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto"
          >
            {photos.map((p, i) => (
              <button key={p.full} type="button" onClick={() => setViewer(i)} className="size-full shrink-0 snap-center cursor-zoom-in" aria-label={`Open photo ${i + 1} full screen`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photos are resized on upload */}
                <img src={i === 0 ? p.thumb : p.full} srcSet={`${p.thumb} 560w, ${p.full} 1600w`} sizes="(min-width: 768px) 60vw, 100vw" alt={`${alt}, photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setViewer(index)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100 focus:opacity-100"
          >
            <Expand className="size-3.5" aria-hidden /> Full screen
          </button>

          {photos.length > 1 && (
            <>
              <NavButton side="left" onClick={() => go(index - 1)} hidden={index === 0} />
              <NavButton side="right" onClick={() => go(index + 1)} hidden={index === photos.length - 1} />
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((p, i) => (
                  <button
                    key={p.full}
                    type="button"
                    aria-label={`Show photo ${i + 1}`}
                    onClick={() => go(i)}
                    className={clsx("h-1.5 rounded-full bg-white transition-all duration-300", i === index ? "w-6" : "w-1.5 opacity-50")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </ViewTransition>

      {photos.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button
              key={p.thumb}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={clsx(
                "h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-background transition",
                i === index ? "ring-accent" : "opacity-60 ring-transparent hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {photos[index]?.credit && <p className="mt-2 text-[11px] text-muted">Photo: {photos[index].credit}</p>}

      {viewer !== null && <Viewer photos={photos} alt={alt} start={viewer} onClose={(i) => (setViewer(null), go(i))} />}
    </div>
  );
}

function NavButton({ side, onClick, hidden }: { side: "left" | "right"; onClick: () => void; hidden: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={clsx(
        "absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg transition hover:scale-110 sm:block",
        side === "left" ? "left-3" : "right-3",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

/** Full-screen photo viewer: swipe, arrow keys, Escape to close. */
function Viewer({ photos, alt, start, onClose }: { photos: Photo[]; alt: string; start: number; onClose: (index: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      el.scrollTo({ left: Math.max(0, Math.min(photos.length - 1, i)) * el.clientWidth, behavior: "smooth" });
    },
    [photos.length],
  );

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${alt} photos`} className="pop-in fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={() => onClose(index)} aria-label="Close" className="rounded-full p-2 transition hover:bg-white/10">
          <X className="size-6" />
        </button>
      </div>
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((p, i) => (
          <div key={p.full} className="flex size-full shrink-0 snap-center items-center justify-center px-2 sm:px-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.full} alt={`${alt}, photo ${i + 1}`} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
        ))}
      </div>
      <p className="min-h-10 px-4 py-3 text-center text-xs text-white/50">{photos[index]?.credit ? `Photo: ${photos[index].credit}` : ""}</p>
      {index > 0 && (
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 transition hover:bg-white/20 sm:block">
          <ChevronLeft className="size-6" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 transition hover:bg-white/20 sm:block">
          <ChevronRight className="size-6" />
        </button>
      )}
    </div>,
    document.body,
  );
}
