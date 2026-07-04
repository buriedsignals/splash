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
  dataIndex?: number; // line reveal: the data-point index (host resolves the exact
  // path fraction at its OWN responsive width, so the head lands on the point at any size)
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

// The ranked positions to reveal for a MAGNITUDE chart (bar): the top-3 (leaders) plus
// the tail (the minimum) — a distribution two beats can't carry. Returns, in DISPLAY
// order (desc by value, the order the bar chart sorts into), each revealed row's sorted
// index + 1-based rank + role. The sort MUST match computeBarLayout (bar-geometry.ts):
// value-only, DESC, STABLE — so `sortedIndex` indexes the same bar the chart displays.
// A label tie-break here would silently desync the accent from the caption on tied values.
export function barRankedReveals(
  rows: { label: string; value: number }[],
): { sortedIndex: number; rank: number; role: "leader" | "tail" }[] {
  const desc = [...rows]
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => b.value - a.value);
  const out: { sortedIndex: number; rank: number; role: "leader" | "tail" }[] =
    desc.slice(0, Math.min(3, desc.length)).map((_, k) => ({
      sortedIndex: k,
      rank: k + 1,
      role: "leader" as const,
    }));
  if (desc.length > out.length)
    out.push({ sortedIndex: desc.length - 1, rank: desc.length, role: "tail" });
  return out;
}

// The notable points to walk on a SCATTER: the outliers that carry a correlation story —
// the extreme x (often the headline outlier), the extreme y, and the opposite y — deduped,
// in a stable order. Up to 3 points so a short scrolly reads.
export function scatterNotableIndices(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  if (n <= 3) return xs.map((_, i) => i);
  const argmax = (a: number[]) =>
    a.reduce((best, v, i) => (v > a[best] ? i : best), 0);
  const argmin = (a: number[]) =>
    a.reduce((best, v, i) => (v < a[best] ? i : best), 0);
  return [...new Set([argmax(xs), argmax(ys), argmin(ys)])];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// Build the ordered chart-scrolly beats from a NativeSpec, ADAPTING to the chart type:
//   line    → a progressive DRAW (reveal beats carry a data index; the host scrubs the
//             line on with scroll so the head lands on each captioned point).
//   bar     → a ranked HIGHLIGHT walk (each reveal highlights one bar — leader … tail —
//             carrying its post-sort highlightIndex; the host dims the rest per step).
//   scatter → an outlier HIGHLIGHT walk (each reveal labels one story point by labelKey).
// Every kind emits: title → establish (whole chart) → reveals → takeaway.
export function deriveChartStory(
  spec: NativeSpec,
  insight?: string,
): ChartBeat[] {
  const { type, config } = specToNativeConfig(spec);
  const fmt = (v: number) =>
    `${Math.round(v * 100) / 100}${spec.unit ? " " + spec.unit : ""}`;
  const beats: ChartBeat[] = [
    { kind: "title", callout: null, copy: spec.title },
    { kind: "establish", callout: null, copy: "" },
  ];

  if (type === "line") {
    const xField = config.xField as string;
    const yField = config.yField as string;
    const points = config.points as Record<string, string | number>[];
    const ys = points.map((p) => Number(p[yField]));
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
    for (const i of lineNotableIndices(ys)) {
      const name = String(points[i][xField]);
      const value = fmt(ys[i]);
      beats.push({
        kind: "reveal",
        progress: cum[i] / total, // CHART_DIMS fallback; the host prefers dataIndex
        dataIndex: i, // resolved to a path fraction at render width by the host
        callout: { name, value, text: `${name} — ${value}` },
        copy: `${name} — ${value}`,
      });
    }
  } else if (type === "bar") {
    const catField = config.catField as string;
    const valField = config.valField as string;
    const rows = config.rows as Record<string, string | number>[];
    const labelled = rows.map((r) => ({
      label: String(r[catField]),
      value: Number(r[valField]),
    }));
    // Same value-only stable sort as computeBarLayout — this IS the chart's display
    // order, so `sortedIndex` (== highlightIndex) fetches the row the accented bar shows.
    const displayOrder = [...labelled].sort((a, b) => b.value - a.value);
    for (const r of barRankedReveals(labelled)) {
      const row = displayOrder[r.sortedIndex];
      const value = fmt(row.value);
      const copy =
        r.role === "tail"
          ? `The lowest — ${row.label}, ${value}`
          : r.rank === 1
            ? `${row.label} leads — ${value}`
            : `${row.label} — ${value}, ${ordinal(r.rank)}`;
      beats.push({
        kind: "reveal",
        highlightIndex: r.sortedIndex,
        rank: r.rank,
        rankRole: r.role,
        callout: { name: row.label, value, text: `${row.label} — ${value}` },
        copy,
      });
    }
  } else if (type === "scatter") {
    const xField = config.xField as string;
    const yField = config.yField as string;
    const labelField = (config.labelField as string) ?? xField;
    const rows = config.rows as Record<string, string | number>[];
    const xs = rows.map((r) => Number(r[xField]));
    const ys = rows.map((r) => Number(r[yField]));
    for (const i of scatterNotableIndices(xs, ys)) {
      const name = String(rows[i][labelField]);
      const text = `${name} — ${fmt(xs[i])}, ${fmt(ys[i])}`;
      beats.push({
        kind: "reveal",
        labelKey: name,
        callout: { name, value: fmt(ys[i]), text },
        copy: text,
      });
    }
  } else {
    throw new Error(
      `chart-scrolly supports line, bar, scatter; got "${spec.nativeType}"`,
    );
  }

  beats.push({
    kind: "takeaway",
    callout: null,
    copy: insight && insight !== spec.title ? insight : "",
  });
  return beats;
}
