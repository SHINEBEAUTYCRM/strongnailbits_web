"use client";

import { useEffect, useRef } from "react";
import { trackCollectionView } from "@/lib/analytics/tracker";

interface Props {
  code: string;
  title: string;
  children: React.ReactNode;
}

export function TrackSection({ code, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!ref.current || tracked.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackCollectionView(code, title);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [code, title]);

  return <div ref={ref}>{children}</div>;
}
