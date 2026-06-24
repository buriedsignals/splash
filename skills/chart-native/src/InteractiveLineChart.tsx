// Browser-only wrapper around the pure <LineChart>. It owns the two things the
// deterministic core must NEVER own: the container's measured width (responsive
// re-layout via ResizeObserver) and a wall-clock (the intro reveal via rAF).
//
// LineChart, chart-geometry and the Remotion video stay clock-free and
// frame-deterministic — this file is the ONLY place a real clock lives, and it
// is never imported by the video build. The reveal uses the SAME easing curve
// as the video (easeInOutCubic) so the motion feels identical across formats.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LineChart, type ChartConfig } from "./LineChart";
import { clamp01 } from "./chart-geometry";

/** When the intro reveal plays. A per-format knob (the journalist picks). */
export type AnimateOn = "load" | "scroll" | "none";

export interface InteractiveLineChartProps {
  config: ChartConfig;
  /** "scroll" (default): reveal when it enters the viewport, once.
   *  "load": reveal on mount. "none": no reveal (renders complete). */
  animateOn?: AnimateOn;
  /** reveal duration in ms (ignored when animateOn === "none"). */
  durationMs?: number;
  /** chart height in px (width fills the container, re-laid-out responsively). */
  height?: number;
  /** never lay out below this width (keeps inner plot area positive). */
  minWidth?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function InteractiveLineChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveLineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  // start the reveal at 0 unless motion is disabled (then jump to the full chart)
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
      // LINEAR master time; each phase (axes/line/label) eases itself in LineChart.
      const t = clamp01((now - start) / durationMs);
      setProgress(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  // trigger: on mount ("load") or on first viewport entry ("scroll")
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
        <LineChart
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
