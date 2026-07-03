import { specToNativeConfig, UnsupportedNativeType } from "./spec-to-config";
import type { NativeSpec } from "./spec-to-config";

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

  const xs = points.map((p) => Number(p[xField]));
  const xNumeric = xs.every((v) => Number.isFinite(v));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;

  const beats: ChartBeat[] = [];
  beats.push({ kind: "title", callout: null, copy: spec.title });
  beats.push({ kind: "establish", callout: null, copy: "" });
  for (const i of idx) {
    const name = String(points[i][xField]);
    const value = fmt(ys[i]);
    const text = `${name} — ${value}`;
    beats.push({
      kind: "reveal",
      progress: xNumeric ? (xs[i] - xMin) / xSpan : n > 1 ? i / (n - 1) : 1,
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
