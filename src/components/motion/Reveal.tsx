"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds to wait after the element scrolls into view, for staggering. */
  delay?: number;
  as?: "div" | "section" | "li" | "ul";
};

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-shown", "");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={clsx("reveal", className)}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
