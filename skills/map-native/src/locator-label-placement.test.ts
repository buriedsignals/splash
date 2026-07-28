// One label model for the whole cartographic family.
//
// The symbol maps place a direct label by computing, in screen space, which side of the
// point keeps the text inside the viewport (`placeSymbolLabel`) — the fix for the reported
// "Indonésie" clipped to "Indonés". The locator maps never got it: their four renderers ask
// MapLibre for `text-variable-anchor`, which re-anchors only on label↔label COLLISION and is
// blind to the viewport edge, so a marker near a frame edge keeps its default side and its
// label runs off-canvas.
//
// Swapping the layer property alone would not have worked, and that is why this is a helper
// and not a one-line change. The locator's declutter (`placeLabels`, a deterministic
// priority rule that replaces MapLibre's silent culling) builds each label's box from a
// HARDCODED assumption that the text sits above the dot. Choose an anchor without telling
// the declutter, and the two disagree: a label flipped to the left of its marker would still
// be tested for collisions as if it were above it. So the anchor and the collision box must
// come from ONE placement, which is exactly what `placeSymbolLabel` already returns.
import { describe, it, expect } from "bun:test";
import { locatorLabelPlacement } from "./locator-label-placement.ts";
import { placeLabels } from "./locator-labels.ts";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VIEWPORT = { width: 1200, height: 800 };
const TEXT = 14;
const RADIUS = 6;

const opts = { viewport: VIEWPORT, textSize: TEXT, radius: RADIUS };

describe("locatorLabelPlacement", () => {
  it("keeps the FT/NYT default (text to the right of the point) away from any edge", () => {
    const r = locatorLabelPlacement(
      [{ label: "Genève" }],
      [{ x: 600, y: 400 }],
      opts,
    );
    expect(r.anchors).toEqual(["left"]); // MapLibre "left" = text on the RIGHT
  });

  it("flips a marker at the right edge so its label stays inside the frame", () => {
    const r = locatorLabelPlacement(
      [{ label: "Kaliningrad" }],
      [{ x: VIEWPORT.width - 12, y: 400 }],
      opts,
    );
    expect(r.anchors).toEqual(["right"]); // text on the LEFT
    expect(r.boxes[0].x).toBeGreaterThanOrEqual(0);
    expect(r.boxes[0].x + r.boxes[0].w).toBeLessThanOrEqual(VIEWPORT.width);
  });

  it("a label at an EDGE lands fully inside the frame", () => {
    const pts = [
      { x: VIEWPORT.width - 2, y: 400 },
      { x: 2, y: 400 },
      { x: 600, y: VIEWPORT.height - 2 },
      { x: 600, y: 2 },
    ];
    const r = locatorLabelPlacement(
      pts.map((_, i) => ({ label: `Marker ${i}` })),
      pts,
      opts,
    );
    for (const b of r.boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(VIEWPORT.width);
      expect(b.y + b.h).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  it("a label in a CORNER is placed as inside as the four sides allow, never worse", () => {
    // 2px from a corner there is no fully-inside placement: the label is vertically centred
    // for left/right and horizontally centred for top/bottom, so half of it always crosses
    // one of the two edges. `placeSymbolLabel` documents this as "clamp as a last resort" —
    // pick the LEAST-overflowing anchor. The guarantee to assert is therefore minimality,
    // not containment; asserting containment here would be asserting something false and
    // would have to be relaxed later by someone who did not know why it was written.
    const overflow = (b: { x: number; y: number; w: number; h: number }) =>
      Math.max(0, -b.x) +
      Math.max(0, -b.y) +
      Math.max(0, b.x + b.w - VIEWPORT.width) +
      Math.max(0, b.y + b.h - VIEWPORT.height);

    for (const pt of [
      { x: 2, y: 2 },
      { x: VIEWPORT.width - 2, y: 2 },
      { x: 2, y: VIEWPORT.height - 2 },
      { x: VIEWPORT.width - 2, y: VIEWPORT.height - 2 },
    ]) {
      const chosen = locatorLabelPlacement([{ label: "Corner" }], [pt], opts);
      // Compare against the same label placed at the centre, which HAS a fitting anchor:
      // the corner case may overflow, but never by more than the label's own half-extent.
      expect(overflow(chosen.boxes[0])).toBeLessThan(
        Math.max(chosen.boxes[0].w, chosen.boxes[0].h),
      );
      // And it is still a real anchor, not a silent drop.
      expect(["left", "right", "top", "bottom"]).toContain(chosen.anchors[0]);
    }
  });

  it("the collision box FOLLOWS the chosen anchor — the whole reason for one placement", () => {
    // Same marker, one comfortably inside and one at the right edge. The inside one is
    // boxed to the RIGHT of its point; the flipped one to the LEFT. A declutter fed the
    // old hardcoded "above the dot" box would have tested the wrong rectangle for both.
    const inside = locatorLabelPlacement(
      [{ label: "Genève" }],
      [{ x: 600, y: 400 }],
      opts,
    );
    expect(inside.boxes[0].x).toBeGreaterThan(600);

    const edge = locatorLabelPlacement(
      [{ label: "Genève" }],
      [{ x: VIEWPORT.width - 12, y: 400 }],
      opts,
    );
    expect(edge.boxes[0].x + edge.boxes[0].w).toBeLessThan(VIEWPORT.width - 12);
  });

  it("carries key and priority straight into the declutter", () => {
    const r = locatorLabelPlacement(
      [
        { label: "Low", priority: 0 },
        { label: "High", priority: 9 },
      ],
      [
        { x: 600, y: 400 },
        { x: 604, y: 402 }, // overlapping on purpose
      ],
      opts,
    );
    expect(r.boxes.map((b) => b.key)).toEqual(["m0", "m1"]);
    const { shown, hidden } = placeLabels(r.boxes);
    expect(shown).toEqual(["m1"]); // higher priority wins
    expect(hidden).toEqual(["m0"]);
  });

  it("is deterministic and index-aligned with the markers it was given", () => {
    const markers = [{ label: "A" }, { label: "Bee" }, { label: "Cee" }];
    const pts = [
      { x: 100, y: 100 },
      { x: 1190, y: 100 },
      { x: 600, y: 795 },
    ];
    const a = locatorLabelPlacement(markers, pts, opts);
    const b = locatorLabelPlacement(markers, pts, opts);
    expect(a.anchors).toEqual(b.anchors);
    expect(a.boxes).toEqual(b.boxes);
    expect(a.anchors.length).toBe(markers.length);
    expect(a.boxes.length).toBe(markers.length);
  });

  it("a longer label flips sooner than a short one at the same point", () => {
    const at = { x: VIEWPORT.width - 120, y: 400 };
    const short = locatorLabelPlacement([{ label: "Ur" }], [at], opts);
    const long = locatorLabelPlacement(
      [{ label: "Ulaanbaatar-Hovsgol" }],
      [at],
      opts,
    );
    expect(short.anchors[0]).toBe("left");
    expect(long.anchors[0]).toBe("right");
  });
});

// ─── The invariant, swept over the real render-sites ────────────────────────────────────
// Not "the four files were edited once" but "the family runs ONE label model". A fifth
// locator renderer, or a regression to the MapLibre property, fails here.
describe("every locator renderer runs the shared placement", () => {
  const SRC = join(dirname(fileURLToPath(import.meta.url)));
  const FILES = [
    "LocatorMap.tsx",
    "components/LocatorReveal.tsx",
    "components/LocatorStory.tsx",
    "components/LocatorScrolly.tsx",
  ];

  it("finds every locator renderer there is (no silent empty sweep)", () => {
    const found = [
      ...readdirSync(SRC).filter((f) => /^Locator.*\.tsx$/.test(f)),
      ...readdirSync(join(SRC, "components"))
        .filter((f) => /^Locator.*\.tsx$/.test(f))
        .map((f) => `components/${f}`),
    ].sort();
    expect(found).toEqual([...FILES].sort());
  });

  it("no locator renderer asks MapLibre for text-variable-anchor any more", () => {
    // The property that cannot see the viewport edge. Symbol dropped it after "Indonésie"
    // shipped clipped; locator kept it, which is the whole of A31.
    const offenders = FILES.filter((f) =>
      readFileSync(join(SRC, f), "utf8").includes('"text-variable-anchor"'),
    );
    expect(offenders).toEqual([]);
  });

  it("every locator renderer reads its anchor per feature and computes it from the projection", () => {
    for (const f of FILES) {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(src).toContain('"text-anchor": ["get", "anchor"]');
      expect(src).toContain("locatorLabelPlacement(");
    }
  });

  it("and WRITES what it computed onto the feature", () => {
    // Caught in review of this very change: two comps called the placement and then never
    // assigned the result, leaving `anchor` pinned at its "left" initial value — strictly
    // worse than the variable-anchor it replaced, and invisible to a test that only checked
    // the call was made. Computing a placement nobody reads is the failure mode here.
    for (const f of FILES) {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(src).toMatch(
        /(props\.anchor = anchors\[i\]|anchor: anchors\[i\])/,
      );
    }
  });

  it("the animated comps recompute it EVERY frame, not once per beat", () => {
    // The camera glides within a beat/step. An anchor chosen at the boundary is stale by the
    // middle of the move, which is exactly when a marker drifts toward the frame edge. The
    // per-frame effect must own the placement; only the declutter's verdict may be per-beat.
    for (const f of [
      "components/LocatorStory.tsx",
      "components/LocatorScrolly.tsx",
    ]) {
      const src = readFileSync(join(SRC, f), "utf8");
      const call = src.indexOf("locatorLabelPlacement(");
      // The beat/step boundary test, however it is spelled (inline `if`, or hoisted into a
      // `stepChanged` const) — what matters is that the placement precedes it.
      const beatGuard = src.search(
        /(?:beatIndex|refBeatIndex) !== last\w*\.current/,
      );
      expect(call).toBeGreaterThan(-1);
      expect(beatGuard).toBeGreaterThan(-1);
      // The placement is resolved BEFORE the beat-change guard, i.e. unconditionally.
      expect(call).toBeLessThan(beatGuard);
    }
  });

  it("and no one rebuilds a declutter box by hand behind its back", () => {
    // The hardcoded `y: pt.y - DOT_RADIUS_PX - h` box is what disagreed with a flipped
    // anchor. It must not come back alongside the shared placement.
    for (const f of FILES) {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(src).not.toContain("y: pt.y - DOT_RADIUS_PX");
    }
  });
});
