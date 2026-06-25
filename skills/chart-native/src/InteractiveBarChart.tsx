// Browser-only wrapper around <BarChart> — identical pattern to
// InteractiveLineChart (ResizeObserver re-layout + rAF intro reveal + respects
// prefers-reduced-motion). The duplication with InteractiveLineChart is the
// signal that this wrapper belongs in a shared core/ — to be extracted once two
// real consumers (line + bar) exist. The wall-clock lives ONLY here, never in
// BarChart / bar-geometry / the video.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BarChart, type BarConfig } from "./BarChart";
import { clamp01 } from "./chart-geometry";
import type { AnimateOn } from "./InteractiveLineChart";

export interface InteractiveBarChartProps {
  config: BarConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function InteractiveBarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 420,
  minWidth = 280,
}: InteractiveBarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const reduced = animateOn === "none" || prefersReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const started = useRef(false);
  const raf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(minWidth, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minWidth]);

  function runReveal() {
    if (started.current || reduced) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp01((now - start) / durationMs);
      setProgress(t); // linear master; BarChart eases each phase
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    if (animateOn === "load") {
      runReveal();
    } else if (animateOn === "scroll") {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            runReveal();
            io.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(el);
      return () => io.disconnect();
    }
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateOn, reduced]);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      {width != null && (
        <BarChart
          config={config}
          progress={progress}
          width={width}
          height={height}
          interactive
          responsive
        />
      )}
    </div>
  );
}
