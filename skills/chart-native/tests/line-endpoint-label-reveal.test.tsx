import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LineChart, type ChartConfig } from "../src/LineChart";

// line.md invariant: the end-point label reveals WITH the line and sits AT the
// line's current tip — not gated on the master `progress` (p) and pinned to the
// final data point (`lastPoint`).
//
// Bug 1 (scrolly): ScrollyChart drives the embedded LineChart with `revealTo`
// only, leaving `progress` at its default (1). Gating the label on `p` therefore
// showed it from the very first scroll frame, regardless of how much line was
// actually drawn.
// Bug 2 (video): the label faded in at `p > 0.92` but was positioned at the fixed
// `lastPoint`, while the line's own draw-head (`lineProgress`, eased over the
// [0.30, 0.95] window) had not necessarily reached it yet — the dot/label sat
// ahead of where the line visually stopped.
//
// The fix ties both the opacity AND the (x,y) position to `lineProgress` via
// `revealHead`, so the label is inseparable from the line's own tip at every
// frame — including the pre-existing draw-head marker (r=4.5, fill=COLORS.head)
// that already tracked `head` correctly. We compare the end-label's dot (r=4,
// the series colour) against that marker rather than reimplementing the layout
// math, so the test rides the SAME geometry the component computed internally.
const config: ChartConfig = {
  title: "Employment rate has climbed steadily since 2019",
  source: { name: "BLS 2025", url: "https://example.org/x" },
  unit: "percent",
  directLabel: "Employment rate",
  xField: "year",
  yField: "value",
  xType: "linear",
  points: [
    { year: 2019, value: 60 },
    { year: 2020, value: 58 },
    { year: 2021, value: 62 },
    { year: 2022, value: 66 },
    { year: 2023, value: 70 },
    { year: 2024, value: 74 },
  ],
};

/** The end-of-line label's dot: r="4", filled the series colour (not the white head-marker). */
function endLabelDot(
  markup: string,
): { cx: number; cy: number; opacity: number } | null {
  const m =
    /<g opacity="([^"]+)"[^>]*><circle cx="([^"]+)" cy="([^"]+)" r="4" fill="[^"]+"><\/circle>/.exec(
      markup,
    );
  if (!m) return null;
  return { opacity: Number(m[1]), cx: Number(m[2]), cy: Number(m[3]) };
}

/** The mid-reveal draw-head marker: r="4.5" — already correctly tracks `revealHead`. */
function drawHeadMarker(markup: string): { cx: number; cy: number } | null {
  const m = /<circle cx="([^"]+)" cy="([^"]+)" r="4\.5"/.exec(markup);
  if (!m) return null;
  return { cx: Number(m[1]), cy: Number(m[2]) };
}

/** The last (x,y) pair drawn by the "series-line" path — its true endpoint. */
function pathEndpoint(markup: string): { x: number; y: number } | null {
  const m = /class="series-line" d="([^"]+)"/.exec(markup);
  if (!m) return null;
  const coords = m[1].match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g);
  if (!coords || coords.length === 0) return null;
  const [x, y] = coords[coords.length - 1].split(",").map(Number);
  return { x, y };
}

describe("LineChart — the end-point label reveals WITH the line, at its current tip", () => {
  it("VIDEO mid-reveal: the label dot sits exactly at the line's current draw-head, not the final point", () => {
    // p = 0.625 -> lineProgress (eased over [0.30, 0.95]) = 0.5: well inside the
    // reveal, so both the draw-head marker and the (fading) end label are in the DOM.
    const markup = renderToStaticMarkup(
      <LineChart config={config} progress={0.625} responsive={false} />,
    );
    const head = drawHeadMarker(markup);
    const dot = endLabelDot(markup);
    expect(head).not.toBeNull();
    expect(dot).not.toBeNull();
    expect(dot!.cx).toBeCloseTo(head!.cx, 6);
    expect(dot!.cy).toBeCloseTo(head!.cy, 6);
  });

  it("SCROLLY (embedded, revealTo early): the end-point label is HIDDEN, matching how little line is drawn", () => {
    // ScrollyChart never passes `progress` — it stays at its default (1) — and
    // drives the reveal purely through `revealTo`. Early in the scroll (revealTo
    // near the first point) the label must not be visible yet.
    const markup = renderToStaticMarkup(
      <LineChart
        config={config}
        width={840}
        height={480}
        responsive
        embedded
        revealTo={0.2}
      />,
    );
    const dot = endLabelDot(markup);
    expect(dot).not.toBeNull();
    expect(dot!.opacity).toBe(0);
  });

  it("SCROLLY (embedded, revealTo full): the end-point label is VISIBLE at the last point", () => {
    const markup = renderToStaticMarkup(
      <LineChart
        config={config}
        width={840}
        height={480}
        responsive
        embedded
        revealTo={config.points.length - 1}
      />,
    );
    const dot = endLabelDot(markup);
    expect(dot).not.toBeNull();
    // clamp01((lp - 0.92) / 0.08) at lp=1 is 0.9999999999999994 (float noise from
    // the 1 - 0.92 subtraction) — visually opaque; tolerate that, don't demand
    // bit-exact 1.
    expect(dot!.opacity).toBeCloseTo(1, 6);
  });

  it("STATIC / final video frame (progress=1): unchanged — label at the last point, fully visible", () => {
    const markup = renderToStaticMarkup(
      <LineChart config={config} progress={1} responsive={false} />,
    );
    const dot = endLabelDot(markup);
    const end = pathEndpoint(markup);
    expect(dot).not.toBeNull();
    expect(end).not.toBeNull();
    expect(dot!.opacity).toBeCloseTo(1, 6);
    // at lp=1, head === lastPoint, so the label dot must coincide with the drawn
    // line's true endpoint (the invariant that keeps the static render unchanged).
    expect(dot!.cx).toBeCloseTo(end!.x, 6);
    expect(dot!.cy).toBeCloseTo(end!.y, 6);
  });
});
