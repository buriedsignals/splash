import { specToNativeConfig } from "./spec-to-config";
import type { NativeSpec } from "./spec-to-config";
import { computeChartLayout } from "./chart-geometry";
import type { Dims } from "./chart-geometry";

// Fixed canvas dims that match LineChart's defaults (width=840, height=480) and the
// minimum right-padding (Math.max(140, labelGutter) where 140 is the floor). Using
// these fixed values keeps deriveChartStory a pure function without needing a rendered
// component — the pixel positions produced are proportionally identical to what the
// chart renders at these defaults, so cumLength fractions are correct.
const CHART_DIMS: Dims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 140, bottom: 52, left: 56 },
};

export interface ChartBeat {
  kind: "title" | "establish" | "reveal" | "takeaway";
  progress?: number; // line: 0..1 reveal to this point
  highlightIndex?: number; // bar (Slice B)
  labelKey?: string; // scatter (Slice B)
  callout: { name: string; value: string; text: string } | null;
  copy: string;
  rank?: number;
  rankRole?: "leader" | "tail";
}

// Notable points on a line: ALWAYS the first and last, plus the interior points with the
// biggest step-to-step move (the peaks/drops that carry the story). Deterministic; up to 4
// points total so a short scrolly reads. Returns ascending unique indices.
export function lineNotableIndices(ys: number[]): number[] {
  const n = ys.length;
  if (n <= 2) return ys.map((_, i) => i);
  const interior = ys
    .slice(1, -1)
    .map((y, i) => ({ i: i + 1, jump: Math.abs(y - ys[i]) }))
    .sort((a, b) => b.jump - a.jump || a.i - b.i)
    .slice(0, 2)
    .map((c) => c.i);
  return [...new Set([0, ...interior, n - 1])].sort((a, b) => a - b);
}

// Clamp a scroll step index to a valid beat (out-of-range → first/last).
export function mapStepToBeat(beats: ChartBeat[], step: number): ChartBeat {
  const i = Math.max(0, Math.min(beats.length - 1, step));
  return beats[i];
}

// Build the ordered chart-scrolly beats from a NativeSpec. Slice A: LINE only.
export function deriveChartStory(
  spec: NativeSpec,
  insight?: string,
): ChartBeat[] {
  if (spec.nativeType !== "line")
    throw new Error(
      `chart-scrolly (Slice A) supports only line; got "${spec.nativeType}"`,
    );
  const { config } = specToNativeConfig(spec);
  const xField = config.xField as string;
  const yField = config.yField as string;
  const points = config.points as Record<string, string | number>[];
  const ys = points.map((p) => Number(p[yField]));
  const idx = lineNotableIndices(ys);
  const n = points.length;
  const fmt = (v: number) =>
    `${Math.round(v * 100) / 100}${spec.unit ? " " + spec.unit : ""}`;

  // Compute pixel layout using the same dims LineChart uses by default, then derive
  // progress from cumulative path length so the draw-head lands exactly on the
  // captioned point (x-fraction fails on steep segments — the path is longer than Δx).
  const layout = computeChartLayout(
    {
      xField,
      yField,
      xType: (config.xType as "time" | "linear") ?? "linear",
      points,
    },
    CHART_DIMS,
  );
  const cum = layout.cumLength;
  const total = layout.totalLength || 1;

  const beats: ChartBeat[] = [];
  beats.push({ kind: "title", callout: null, copy: spec.title });
  beats.push({ kind: "establish", callout: null, copy: "" });
  for (const i of idx) {
    const name = String(points[i][xField]);
    const value = fmt(ys[i]);
    const text = `${name} — ${value}`;
    beats.push({
      kind: "reveal",
      progress: cum[i] / total,
      callout: { name, value, text },
      copy: text,
    });
  }
  beats.push({
    kind: "takeaway",
    callout: null,
    copy: insight && insight !== spec.title ? insight : "",
  });
  return beats;
}
