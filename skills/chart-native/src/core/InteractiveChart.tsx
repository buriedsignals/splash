// core/InteractiveChart — the ONE browser-only wrapper for any responsive,
// self-animating chart embed. It owns the two things the deterministic core
// must never own: the container's measured width (ResizeObserver re-layout) and
// a wall-clock (the intro reveal via rAF). It is type-agnostic: the caller
// passes a `render(width, progress)` that draws the actual chart.
//
// This is the format layer (interactive ⟂), shared by line, bar and every
// future type — extracted once two real consumers (line + bar) proved it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp01 } from "./math";

/** When the intro reveal plays. A per-format knob (the journalist picks). */
export type AnimateOn = "load" | "scroll" | "none";

export interface InteractiveChartProps {
  /** draw the chart for the measured width and the current reveal progress */
  render: (width: number, progress: number) => React.ReactNode;
  animateOn?: AnimateOn;
  durationMs?: number;
  minWidth?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function InteractiveChart({
  render,
  animateOn = "scroll",
  durationMs = 2000,
  minWidth = 280,
}: InteractiveChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const reduced = animateOn === "none" || prefersReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const started = useRef(false);
  const raf = useRef<number | null>(null);

  // measure synchronously before paint so there is no width flash / reflow jump
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
      // LINEAR master time; each chart phase eases itself.
      const t = clamp01((now - start) / durationMs);
      setProgress(t);
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
      {width != null && render(width, progress)}
    </div>
  );
}
