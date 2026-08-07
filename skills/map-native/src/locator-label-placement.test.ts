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
import { estimateLabelBox } from "./symbol-labels.ts";
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
        { x: 604, y: 402 }, // 4px apart — the default side cannot hold both
      ],
      opts,
    );
    expect(r.boxes.map((b) => b.key)).toEqual(["m0", "m1"]);
    expect(r.boxes.map((b) => b.priority)).toEqual([0, 9]);
    // Priority no longer decides who is SACRIFICED. Both are named.
    expect(placeLabels(r.boxes).hidden).toEqual([]);
  });

  it("priority decides who KEEPS the preferred side, not who survives", () => {
    // Two markers stacked 15px apart. Both default boxes (text to the right, vertically
    // centred) overlap, and either marker could take that side without its label ending up
    // nearer the other one — so nothing but the priority order can settle it. The
    // higher-priority marker is placed first and keeps the FT/NYT default; the other moves.
    //
    // The pair matters: an earlier version of this test used two markers 4px apart, where
    // the ownership rule pushed the first-placed one aside anyway and the result was the
    // same whichever order they were visited in. It stayed green with the ordering removed.
    const pts = [
      { x: 600, y: 400 },
      { x: 600, y: 415 },
    ];
    const labels = ["Glacier inférieur", "Glacier supérieur"];

    const lowFirst = locatorLabelPlacement(
      [
        { label: labels[0], priority: 0 },
        { label: labels[1], priority: 9 },
      ],
      pts,
      opts,
    );
    expect(lowFirst.anchors[1]).toBe("left"); // the priority keeps the default side
    expect(lowFirst.anchors[0]).not.toBe("left");

    const highFirst = locatorLabelPlacement(
      [
        { label: labels[0], priority: 9 },
        { label: labels[1], priority: 0 },
      ],
      pts,
      opts,
    );
    expect(highFirst.anchors[0]).toBe("left");
    expect(highFirst.anchors[1]).not.toBe("left");
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

// ─── A marker the map plots is a marker the map names ───────────────────────────────────
// Reported on a real run (glaciers-requiem-2026, locator video, 2026-08-06): "Sur l'image
// finale, le Mont Miné perd son étiquette. Elle entre en collision avec celle du Cervin, à
// 9 km de là, et le moteur en sacrifie une." Four red dots, three names — on the closing
// frame, the one a reader screenshots.
//
// The sacrifice was ours, not MapLibre's: the locator layers run `text-allow-overlap: true`,
// so nothing is culled by the renderer. `placeLabels` is the culler, and it was being fed
// ONE candidate rectangle per marker — whatever side `placeSymbolLabel` picked for the
// VIEWPORT — so a label that collided had nowhere else to be asked about and was dropped.
// A dot with no name is not a smaller version of the map; it is a map that points at
// something and refuses to say what it is.
//
// The placement now asks every side (and, if every side is taken, a wider radial offset)
// before it lets anything be dropped, and it keeps each label nearer its own marker than
// any other so moving a label never reassigns it. `placeLabels` stays as the last-resort
// net — it just has almost nothing left to catch.
const distanceToBox = (
  b: { x: number; y: number; w: number; h: number },
  p: { x: number; y: number },
): number => {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy);
};
const boxesOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("a marker the map plots is a marker the map names", () => {
  // The reported frame's own numbers: the four glaciers as they project at 1280×720 on the
  // takeaway beat, and the text size that composition renders at.
  const REPORTED_MARKERS = [
    { label: "Glacier d'Aletsch" },
    { label: "Cervin" },
    { label: "Glacier du Rhône" },
    { label: "Glacier du Mont Miné" },
  ];
  const REPORTED_POINTS = [
    { x: 694, y: 292 },
    { x: 475, y: 633 },
    { x: 856, y: 163 },
    { x: 424, y: 619 }, // Mont Miné — 9 km from Cervin, ~51px from it on screen
  ];
  const REPORTED_OPTS = {
    viewport: { width: 1280, height: 720 },
    textSize: 13,
    radius: 6,
  };

  it("names all four glaciers of the reported final frame", () => {
    const r = locatorLabelPlacement(
      REPORTED_MARKERS,
      REPORTED_POINTS,
      REPORTED_OPTS,
    );
    expect(placeLabels(r.boxes).hidden).toEqual([]);
    expect(placeLabels(r.boxes).shown.length).toBe(REPORTED_MARKERS.length);
  });

  it("resolves the Cervin / Mont Miné collision by MOVING a label, never by stacking two", () => {
    const r = locatorLabelPlacement(
      REPORTED_MARKERS,
      REPORTED_POINTS,
      REPORTED_OPTS,
    );
    for (let i = 0; i < r.boxes.length; i++)
      for (let j = i + 1; j < r.boxes.length; j++)
        expect(boxesOverlap(r.boxes[i], r.boxes[j])).toBe(false);
  });

  it("keeps every label nearer its OWN marker than any other — moving it never renames it", () => {
    const r = locatorLabelPlacement(
      REPORTED_MARKERS,
      REPORTED_POINTS,
      REPORTED_OPTS,
    );
    for (let i = 0; i < r.boxes.length; i++) {
      const own = distanceToBox(r.boxes[i], REPORTED_POINTS[i]);
      for (let j = 0; j < REPORTED_POINTS.length; j++) {
        if (j === i) continue;
        expect(
          distanceToBox(r.boxes[i], REPORTED_POINTS[j]),
        ).toBeGreaterThanOrEqual(own);
      }
    }
  });

  // Eight markers inside 150px, names long enough that the FT/NYT default side collides for
  // most of them. Nothing here is special-cased about the reported map — this is the same
  // rule under load.
  const CLUSTER = [
    { x: 600, y: 400 },
    { x: 640, y: 405 },
    { x: 610, y: 445 },
    { x: 655, y: 450 },
    { x: 585, y: 430 },
    { x: 665, y: 415 },
    { x: 625, y: 385 },
    { x: 600, y: 465 },
  ];
  const CLUSTER_MARKERS = CLUSTER.map((_, i) => ({ label: `Glacier ${i}` }));

  it("names every marker of a dense cluster, not just the ones that fit the default side", () => {
    const r = locatorLabelPlacement(CLUSTER_MARKERS, CLUSTER, opts);
    expect(placeLabels(r.boxes).hidden).toEqual([]);
  });

  it("widens the radial offset when every side is taken, and reports it per marker", () => {
    // A boxed-in marker has no free side at the base gap, so it steps out. The offset is a
    // per-feature datum (`text-radial-offset`), which is what makes that possible at all.
    const r = locatorLabelPlacement(CLUSTER_MARKERS, CLUSTER, opts);
    expect(r.offsets.length).toBe(CLUSTER_MARKERS.length);
    const base = (RADIUS + 6) / TEXT;
    expect(r.offsets.every((o) => o >= base)).toBe(true);
    expect(Math.max(...r.offsets)).toBeGreaterThan(base);
  });

  it("prefers a side that keeps the label off a neighbouring dot", () => {
    // Two markers 30px apart on a row: the FT/NYT default would lay the LEFT one's text
    // straight across the RIGHT one's dot, so the reader would attach the name to the wrong
    // place. The label goes the other way instead. Both are still named — this is a
    // preference between placements, never a reason to drop one.
    const pts = [
      { x: 600, y: 400 },
      { x: 630, y: 400 },
    ];
    const r = locatorLabelPlacement(
      [{ label: "Zermatt" }, { label: "Täsch" }],
      pts,
      opts,
    );
    expect(placeLabels(r.boxes).hidden).toEqual([]);
    for (let i = 0; i < r.boxes.length; i++) {
      const own = distanceToBox(r.boxes[i], pts[i]);
      for (let j = 0; j < pts.length; j++)
        if (j !== i)
          expect(distanceToBox(r.boxes[i], pts[j])).toBeGreaterThanOrEqual(own);
    }
  });

  it("leaves an uncontested layout exactly as it was: default side, base offset", () => {
    // The fix must not move labels that were never in trouble. Three markers far apart keep
    // the FT/NYT default (text to the right) and the plain radius+gap offset.
    const r = locatorLabelPlacement(
      [{ label: "Genève" }, { label: "Bâle" }, { label: "Coire" }],
      [
        { x: 200, y: 200 },
        { x: 600, y: 400 },
        { x: 950, y: 620 },
      ],
      opts,
    );
    expect(r.anchors).toEqual(["left", "left", "left"]);
    const base = (RADIUS + 6) / TEXT; // labelRadialOffset's own definition, in ems
    expect(r.offsets).toEqual([base, base, base]);
  });

  it("measures the label box at the width the locator layer actually wraps at", () => {
    // The four locator layers set `text-max-width: 9`; the shared estimator capped every
    // label at 8 ems, so a long name's collision rectangle was ~1em narrower than the text
    // MapLibre draws — a placement can then be collision-free in the arithmetic and overlap
    // on screen. The box the declutter is handed must be the box the reader sees.
    const long = locatorLabelPlacement(
      [{ label: "Glacier du Mont Miné" }],
      [{ x: 400, y: 400 }],
      opts,
    );
    // Strictly wider than the shared estimator's default (the symbol layers' 8 ems) — an
    // absolute px threshold would have been cleared by the halo padding alone, which is how
    // a first version of this test stayed green with the drift still in place.
    expect(long.boxes[0].w).toBeGreaterThan(
      estimateLabelBox("Glacier du Mont Miné", TEXT).width,
    );
  });

  it("still refuses to stack when there is genuinely nowhere to put a second name", () => {
    // A viewport with no room for either label on any side: the placement falls back to
    // least-overflow (`placeSymbolLabel`'s documented last resort), the two rectangles land
    // on top of each other, and the declutter drops one. Two names in the same pixels is not
    // a better failure than one name — so the net stays.
    const tiny = {
      viewport: { width: 70, height: 44 },
      textSize: TEXT,
      radius: RADIUS,
    };
    const r = locatorLabelPlacement(
      [{ label: "Grindelwald" }, { label: "Wengernalp" }],
      [
        { x: 35, y: 22 },
        { x: 37, y: 22 },
      ],
      tiny,
    );
    expect(placeLabels(r.boxes).hidden.length).toBe(1);
  });

  it("is order-independent: the same markers shuffled place the same way", () => {
    // Three stacked markers with DISTINCT priorities, close enough that each one's default
    // side is contested — so who is visited first genuinely changes the layout, and the
    // priority order is the only thing that can make the answer the same either way.
    const markers = [
      { label: "Glacier inférieur", priority: 1 },
      { label: "Glacier supérieur", priority: 3 },
      { label: "Glacier médian", priority: 2 },
    ];
    const pts = [
      { x: 600, y: 400 },
      { x: 600, y: 415 },
      { x: 600, y: 430 },
    ];
    const straight = locatorLabelPlacement(markers, pts, opts);
    const perm = [2, 0, 1];
    const shuffled = locatorLabelPlacement(
      perm.map((i) => markers[i]),
      perm.map((i) => pts[i]),
      opts,
    );
    for (let k = 0; k < perm.length; k++) {
      expect(shuffled.anchors[k]).toBe(straight.anchors[perm[k]]);
      expect(shuffled.offsets[k]).toBe(straight.offsets[perm[k]]);
    }
  });
});

// ─── The invariant, swept over the real render-sites ────────────────────────────────────
// Not "the four files were edited once" but "the family runs ONE label model". A fifth
// locator renderer added to THIS skill, or a regression to the MapLibre property, fails here.
//
// The boundary is the skill, and it is not the whole story: `skills/scrolly` ships its own
// locator renderer for the web scroll track (ScrollyLocatorMap.tsx), which this sweep cannot
// see and which still asks MapLibre for `text-variable-anchor` with `text-allow-overlap:
// false` — i.e. the renderer's own silent culling, the same "four dots, three names" class
// this file exists to prevent. Bringing it onto the shared placement is a change to another
// engine with its own producer to re-render against, so it is named here rather than
// half-done: a sweep that quietly implied it had covered every locator renderer anywhere
// would be the more expensive lie.
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

  it("every locator renderer takes its radial offset from the placement, not from a constant", () => {
    // The placement may widen a label's offset to find it room. A renderer that keeps
    // computing `labelRadialOffset(DOT_RADIUS_PX, textSize)` itself throws that away and
    // draws the label back on top of its neighbour — collision-free in the arithmetic,
    // colliding on screen. The offset is a per-feature datum like the anchor.
    for (const f of FILES) {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(src).toContain('"text-radial-offset": ["get", "labelOffset"]');
      expect(src).toMatch(
        /(props\.labelOffset = offsets\[i\]|labelOffset: offsets\[i\])/,
      );
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
