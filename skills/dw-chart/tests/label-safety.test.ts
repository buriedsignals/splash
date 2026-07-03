import { describe, it, expect } from "bun:test";
import {
  specToMetadata,
  seriesPolyline,
  clearVerticalSide,
} from "../src/spec-to-metadata";
import {
  findLabelViolations,
  segmentIntersectsRect,
  rectHitsSeries,
  resolveOnLineDy,
  resolveAnchorPlacement,
  anchorOnSeries,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  type TextRect,
  type Point,
} from "../src/label-safety";
import type { ChartSpec } from "../src/chart-spec";

// ── Single-series line/area: no line-end direct label (the clip source) ──────
describe("label safety — single-series direct labelling", () => {
  const single: ChartSpec = {
    type: "d3-lines",
    title: "US median home prices have cooled",
    data: "period,median_home_price_usd\n2014,275200\n2026,403200",
    seriesLabels: { median_home_price_usd: "Median home price" },
    altInsight: "prices rose then eased",
  };

  it("turns direct labelling OFF for a single-series line chart", () => {
    const p = specToMetadata(single);
    expect(p.metadata.visualize["labeling"]).toBe("off");
  });

  it("turns direct labelling OFF for a single-series area chart", () => {
    const p = specToMetadata({ ...single, type: "d3-area" });
    expect(p.metadata.visualize["labeling"]).toBe("off");
  });

  it("keeps direct labelling ON for a multi-series line chart", () => {
    const p = specToMetadata({
      type: "multiple-lines",
      title: "Two series",
      data: "year,A,B\n2020,1,2\n2021,3,4",
      altInsight: "x",
    } as ChartSpec);
    expect(p.metadata.visualize["labeling"]).toBe("right");
  });

  it("does not set labeling for a non-line chart (bar)", () => {
    const p = specToMetadata({
      type: "d3-bars",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
    } as ChartSpec);
    expect(p.metadata.visualize["labeling"]).toBeUndefined();
  });
});

// ── Annotations clamped inward, deterministically ────────────────────────────
describe("label safety — annotation placement", () => {
  it("anchors a right-edge annotation inward (right-align + negative dx)", () => {
    // 2026 is the last x → xFrac 1.0; y at the bottom → near bottom edge.
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2018,7299\n2026,7170",
      altInsight: "x",
      annotations: [{ text: "Sawe — first sub-2:00", x: "2026", y: 7170 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("r"); // right-anchored → extends left, inward
    expect(ann.dx).toBeLessThan(0); // pulled inward from the right edge
    expect(ann.connectorLine.enabled).toBe(true);
  });

  it("anchors a left-edge annotation inward (left-align + positive dx)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,10\n2018,50\n2026,90",
      altInsight: "x",
      annotations: [{ text: "start", x: "2003", y: 10 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("l");
    expect(ann.dx).toBeGreaterThan(0);
  });

  it("overrides a manual near-edge align that would clip (case 3 regression)", () => {
    // Spec asks for tr/dx:-8 — computed inward placement must still win/augment.
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2026,7170",
      altInsight: "x",
      annotations: [
        { text: "Sawe", x: "2026", y: 7170, align: "tr", dx: -8, dy: -6 },
      ],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("r");
    expect(ann.dx).toBeLessThan(-8); // inward pull ADDED to the spec nudge
  });

  it("re-anchors a peak annotation off the line, dropping the on-line authored nudge", () => {
    // 2022 is a local peak (up then down). Placement clears the descending arms by
    // choosing the vertical side + horizontal anchor deterministically; the authored
    // dx/dy that would sit on the line is dropped, and a connector is drawn.
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "p,v\n2014,275200\n2020,322600\n2022,442600\n2026,403200",
      altInsight: "x",
      annotations: [{ text: "Peak", x: "2022", y: 442600, dx: -6, dy: 6 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[0]).toBe("b"); // pushed below the near-top peak
    expect(ann.dy).toBeGreaterThan(6); // displaced well clear of the line
    expect(ann.connectorLine.enabled).toBe(true);
  });

  it("offsets a second annotation on the same point so they cannot overlap", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2026,7170",
      altInsight: "x",
      annotations: [
        { text: "one", x: "2026", y: 7170 },
        { text: "two", x: "2026", y: 7170 },
      ],
    } as ChartSpec);
    const [a, b] = p.metadata.visualize["text-annotations"] as any[];
    expect(b.dy).not.toBe(a.dy); // stacked apart
  });
});

// ── Guardrail geometry: pure clip/overlap detection ──────────────────────────
describe("label safety — findLabelViolations (guardrail core)", () => {
  const box = { x: 0, y: 0, w: 600, h: 400 };

  it("passes when all text rects are inside and disjoint", () => {
    const rects: TextRect[] = [
      { text: "2024", x: 10, y: 380, w: 40, h: 14 },
      { text: "$400K", x: 5, y: 100, w: 50, h: 14 },
      { text: "Peak", x: 200, y: 50, w: 60, h: 16 },
    ];
    expect(findLabelViolations(box, rects)).toHaveLength(0);
  });

  it("fails when a label extends beyond the right edge (clipped)", () => {
    const rects: TextRect[] = [
      { text: "Median home price", x: 560, y: 100, w: 80, h: 40 },
    ];
    const v = findLabelViolations(box, rects);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]).toContain("clipped");
  });

  it("fails when two text rects intersect (overlap)", () => {
    const rects: TextRect[] = [
      { text: "Record time", x: 500, y: 380, w: 70, h: 14 },
      { text: "2026", x: 520, y: 384, w: 40, h: 14 },
    ];
    const v = findLabelViolations(box, rects);
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((s) => s.includes("overlap"))).toBe(true);
  });

  it("tolerates sub-pixel touching (antialiasing slack)", () => {
    const rects: TextRect[] = [
      { text: "a", x: 100, y: 100, w: 20, h: 14 },
      { text: "b", x: 121, y: 100, w: 20, h: 14 }, // 1px gap
    ];
    expect(findLabelViolations(box, rects)).toHaveLength(0);
  });
});

// ── Text-vs-DATA guardrail: annotations must not sit on the plotted line ──────
describe("label safety — segmentIntersectsRect (slab clip)", () => {
  const r: TextRect = { text: "x", x: 100, y: 100, w: 50, h: 20 };

  it("detects a segment passing through the rect", () => {
    expect(segmentIntersectsRect({ x: 80, y: 90 }, { x: 170, y: 130 }, r)).toBe(
      true,
    );
  });
  it("detects a segment with an endpoint inside the rect", () => {
    expect(
      segmentIntersectsRect({ x: 120, y: 110 }, { x: 300, y: 300 }, r),
    ).toBe(true);
  });
  it("rejects a segment that misses the rect entirely", () => {
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 50, y: 50 }, r)).toBe(
      false,
    );
  });
  it("rejects a horizontal segment running above the rect", () => {
    expect(segmentIntersectsRect({ x: 0, y: 50 }, { x: 400, y: 50 }, r)).toBe(
      false,
    );
  });
});

describe("label safety — rectHitsSeries (text-vs-line)", () => {
  // A descending polyline like case 3's marathon record.
  const line: Point[] = [
    { x: 50, y: 60 },
    { x: 200, y: 200 },
    { x: 350, y: 340 },
  ];
  it("flags a label rect the line crosses", () => {
    const onLine: TextRect = { text: "Sawe", x: 180, y: 180, w: 90, h: 20 };
    expect(rectHitsSeries(onLine, line)).toBe(true);
  });
  it("passes a label rect in clear whitespace above the line", () => {
    const clear: TextRect = { text: "Sawe", x: 200, y: 80, w: 90, h: 20 };
    expect(rectHitsSeries(clear, line)).toBe(false);
  });
});

describe("label safety — findLabelViolations text-vs-line integration", () => {
  const boxL = { x: 0, y: 0, w: 600, h: 400 };
  const line: Point[] = [
    { x: 50, y: 60 },
    { x: 550, y: 360 },
  ];
  it("FAILS (on-line) when an annotation rect lies on the series", () => {
    // line y at x=300 is 60 + 250*0.6 = 210; this rect (y 200..220) straddles it.
    const rects: TextRect[] = [
      { text: "onit", x: 270, y: 200, w: 60, h: 20, kind: "annotation" },
    ];
    const v = findLabelViolations(boxL, rects, [line]);
    expect(v.some((s) => s.includes("on-line"))).toBe(true);
  });
  it("does NOT flag furniture (axis ticks) that sit near the line", () => {
    const rects: TextRect[] = [
      { text: "2018", x: 270, y: 200, w: 40, h: 20, kind: "furniture" },
    ];
    const v = findLabelViolations(boxL, rects, [line]);
    expect(v.some((s) => s.includes("on-line"))).toBe(false);
  });
  it("passes an annotation placed in whitespace off the line", () => {
    const rects: TextRect[] = [
      { text: "clear", x: 300, y: 40, w: 60, h: 18, kind: "annotation" },
    ];
    expect(findLabelViolations(boxL, rects, [line])).toHaveLength(0);
  });
});

// ── Render-time correction: shift an on-line rect into the clear side ─────────
describe("label safety — resolveOnLineDy (measure-and-nudge)", () => {
  const content = { x: 0, y: 0, w: 600, h: 400 };
  const line: Point[] = [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
  ]; // horizontal line at y=100 across x 100..400

  it("returns 0 for a rect already clear of the line", () => {
    const clear: TextRect = { text: "x", x: 150, y: 200, w: 80, h: 16 };
    expect(resolveOnLineDy(clear, [line], content)).toBe(0);
  });

  it("shifts an on-line rect UP so its bottom clears the line", () => {
    // rect top (60) sits just above the line; moving up is the smaller, clear shift.
    const onLine: TextRect = { text: "x", x: 150, y: 60, w: 80, h: 44 };
    const dy = resolveOnLineDy(onLine, [line], content);
    expect(dy).toBeLessThan(0); // moved up
    // after the shift the rect bottom clears the line (y=100) with the gap.
    expect(onLine.y + dy + onLine.h).toBeLessThanOrEqual(100 - 5);
  });

  it("shifts DOWN when the up side would leave the content box", () => {
    // line near the very top; moving up would push the rect above the content box,
    // so the correction must go down instead.
    const nearTop: TextRect = { text: "x", x: 150, y: 4, w: 80, h: 16 };
    const topLine: Point[] = [
      { x: 100, y: 12 },
      { x: 400, y: 12 },
    ];
    const dy = resolveOnLineDy(nearTop, [topLine], content);
    expect(dy).toBeGreaterThan(0); // up would clip → move down instead
    expect(nearTop.y + dy).toBeGreaterThanOrEqual(12); // top now below the line
  });
});

// ── Placement: annotations land on the clear vertical side of the line ────────
describe("label safety — clearVerticalSide (off-line placement)", () => {
  // Marathon-style monotonic descent: last point is the lowest (bottom-right).
  const csv =
    "year,v\n2003,7495\n2007,7466\n2008,7439\n2013,7403\n2018,7299\n2022,7269\n2026,7170";
  const dom = { labels: [], yMin: 7170, yMax: 7495 } as any;

  it("places the end-of-descent annotation ABOVE, into the empty upper triangle", () => {
    const poly = seriesPolyline(csv, dom);
    // anchor = last point: xFrac 1, yFrac 1 (bottom edge). Below is the x-axis /
    // plot edge (no room, would clip); the empty whitespace is ABOVE the tail,
    // where the descending line has already dropped away. Right-anchored so the
    // label extends left into that triangle.
    const side = clearVerticalSide(poly, 1, 1, 0.28, "r");
    expect(side.v).toBe("t");
    expect(side.dySign).toBe(-1);
  });

  it("places a peak annotation BELOW when the peak sits against the top edge", () => {
    // A single up-then-down peak whose apex is at the top of the plot (yFrac 0):
    // above would clip, so the label must drop below the apex.
    const peakCsv = "x,v\nA,10\nB,90\nC,10";
    const peakDom = { labels: [], yMin: 10, yMax: 90 } as any;
    const poly = seriesPolyline(peakCsv, peakDom);
    const side = clearVerticalSide(poly, 0.5, 0, 0.28, "r");
    expect(side.v).toBe("b");
  });

  it("keeps the placement deterministic (same input → same side)", () => {
    const poly = seriesPolyline(csv, dom);
    const a = clearVerticalSide(poly, 0.5, 0.5);
    const b = clearVerticalSide(poly, 0.5, 0.5);
    expect(a.v).toBe(b.v);
    expect(a.dySign).toBe(b.dySign);
  });
});

// ── Delivered-width placement: measured, anchor-aware, collision-free ─────────
describe("label safety — resolveAnchorPlacement (measured, anchor-aware)", () => {
  // A peak-shaped series like case 2: climb to a near-top peak then descend.
  // Content box is the DELIVERED size so the test exercises the same geometry the
  // guardrail sees.
  const content = { x: 0, y: 0, w: EXPORT_WIDTH, h: 700 };
  const peakSeries: Point[][] = [
    [
      { x: 100, y: 600 },
      { x: 500, y: 560 }, // pre-pandemic point
      { x: 820, y: 120 }, // peak (near top)
      { x: 1100, y: 300 },
    ],
  ];

  it("places the Peak label in clear whitespace NEAR its anchor, off the line", () => {
    const anchor = anchorOnSeries(peakSeries, 820)!; // on the peak
    // A broken initial rect dumped far below the peak (like the delivered defect).
    const rect: TextRect = {
      text: "Peak: $442,600",
      x: 720,
      y: 560,
      w: 200,
      h: 20,
    };
    const { dx, dy } = resolveAnchorPlacement(
      rect,
      anchor,
      peakSeries,
      content,
    );
    const box: TextRect = {
      text: rect.text,
      x: rect.x + dx,
      y: rect.y + dy,
      w: rect.w,
      h: rect.h,
    };
    // Off the line.
    expect(rectHitsSeries(box, peakSeries[0])).toBe(false);
    // Near the anchor: the label's nearest edge is within a short connector.
    const nx = Math.min(Math.max(anchor.x, box.x), box.x + box.w);
    const ny = Math.min(Math.max(anchor.y, box.y), box.y + box.h);
    expect(Math.hypot(anchor.x - nx, anchor.y - ny)).toBeLessThan(80);
    // In the content box.
    expect(box.x).toBeGreaterThanOrEqual(content.x);
    expect(box.y).toBeGreaterThanOrEqual(content.y);
    expect(box.x + box.w).toBeLessThanOrEqual(content.x + content.w);
    expect(box.y + box.h).toBeLessThanOrEqual(content.y + content.h);
  });

  it("never places two annotations so their boxes overlap", () => {
    const aAnchor = anchorOnSeries(peakSeries, 500)!; // pre-pandemic
    const bAnchor = anchorOnSeries(peakSeries, 820)!; // peak
    const aRect: TextRect = {
      text: "Pre-pandemic: $322,600",
      x: 420,
      y: 560,
      w: 240,
      h: 20,
    };
    const bRect: TextRect = {
      text: "Peak: $442,600",
      x: 720,
      y: 560,
      w: 200,
      h: 20,
    };
    const aShift = resolveAnchorPlacement(aRect, aAnchor, peakSeries, content);
    const aBox: TextRect = {
      ...aRect,
      x: aRect.x + aShift.dx,
      y: aRect.y + aShift.dy,
    };
    // Second placement must avoid the first (passed as an already-placed other).
    const bShift = resolveAnchorPlacement(bRect, bAnchor, peakSeries, content, [
      aBox,
    ]);
    const bBox: TextRect = {
      ...bRect,
      x: bRect.x + bShift.dx,
      y: bRect.y + bShift.dy,
    };
    const ix = Math.max(
      0,
      Math.min(aBox.x + aBox.w, bBox.x + bBox.w) - Math.max(aBox.x, bBox.x),
    );
    const iy = Math.max(
      0,
      Math.min(aBox.y + aBox.h, bBox.y + bBox.h) - Math.max(aBox.y, bBox.y),
    );
    expect(ix * iy).toBe(0); // no overlap
  });

  it("is deterministic (same geometry → same shift)", () => {
    const anchor = anchorOnSeries(peakSeries, 820)!;
    const rect: TextRect = { text: "Peak", x: 720, y: 560, w: 200, h: 20 };
    const a = resolveAnchorPlacement(rect, anchor, peakSeries, content);
    const b = resolveAnchorPlacement(rect, anchor, peakSeries, content);
    expect(a).toEqual(b);
  });
});

// ── Delivered-width guardrail: it FAILS on the broken case-2 (overlap) ────────
describe("label safety — guardrail catches the broken delivered case", () => {
  it("FAILS (text-vs-text overlap) on the two stacked, colliding annotations", () => {
    // Reproduces the delivered defect at 1200px: both labels dumped into the same
    // lower band, boxes overlapping. The completed guardrail — run at the delivered
    // width — must flag it.
    const content = { x: 0, y: 0, w: EXPORT_WIDTH, h: EXPORT_HEIGHT };
    const rects: TextRect[] = [
      {
        text: "Peak: $442,600 (Q4 2022)",
        x: 796,
        y: 612,
        w: 240,
        h: 20,
        kind: "annotation",
      },
      {
        text: "Pre-pandemic: $322,600",
        x: 650,
        y: 620,
        w: 220,
        h: 20,
        kind: "annotation",
      },
    ];
    const v = findLabelViolations(content, rects, []);
    expect(v.some((s) => s.includes("overlap"))).toBe(true);
  });

  it("exports and validates at the same delivered width (1200×800)", () => {
    // Guard the invariant that keeps validated == delivered.
    expect(EXPORT_WIDTH).toBe(1200);
    expect(EXPORT_HEIGHT).toBe(800);
  });
});
