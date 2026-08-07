// ★ A MARKER THE MAP PLOTS IS A MARKER THE MAP NAMES — on the web scroll track too.
//
// map-native fixed this for its four locator renderers (locator-label-placement.ts, and the
// sweep in its own test file). Its sweep could only reach its OWN skill, and said so: this
// package ships a FIFTH locator renderer, ScrollyLocatorMap.tsx, the one a reader actually
// scrolls, and it was still asking MapLibre for `text-variable-anchor` +
// `text-allow-overlap: false` + `text-optional: true` — i.e. the renderer's own silent
// culling, plus no viewport-edge awareness at all.
//
// REPRODUCED BEFORE ANYTHING WAS CHANGED, on the delivered page — a locator scrolly of six
// Valais/Engadine glaciers (the Cervin and the Mont Miné 9.8 km apart, Aletsch and the
// Engadine's Tschierva further out), built through skills/scrolly/scripts/produce.mjs and
// opened on its takeaway step. The renderer failed BOTH ways, one per breakpoint:
//
//   · 900×700 — `queryRenderedFeatures` returned six dots and six names, but "Glacier du
//     Mont Mine" was CLIPPED by the left frame edge: variable-anchor had swung its text to
//     the left of a dot sitting at x=68 to dodge Ferpècle, and never asked whether the canvas
//     ended there. A name a reader cannot read.
//   · 390×760 — six dots, FIVE names. "Glacier du Zmutt" was dropped outright by MapLibre's
//     own `text-optional` culling, its dot left pointing at nothing.
//
// Both frames' projected screen positions are below, read off `map.project` in the running
// page, not invented for a test.
//
// The fix is NOT a second placement algorithm. `locatorLabelPlacement` (map-native) is the
// tool — already proven, already the four other renderers' — and `placeLabels` is still the
// declutter. What lives HERE is only the web renderer's own plumbing, which the frame-driven
// Remotion comps have no analogue for: the camera FLIES between steps, so the projection
// changes continuously and the placement has to be recomputed on every MapLibre `move`, while
// WHICH labels show stays a per-step editorial decision (labels winking in and out mid-flight
// would read as a glitch). That state machine is what this file tests.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syncLocatorLabels } from "../src/locator-label-sync";

const TEXT = 12; // ScrollyLocatorMap's own `text-size`
const RADIUS = 6; // its DOT_RADIUS_PX

const LABELS = [
  "Glacier d'Aletsch",
  "Cervin",
  "Glacier de Tschierva",
  "Glacier du Mont Mine",
  "Glacier de Ferpecle",
  "Glacier du Zmutt",
];

// The two reproduced frames, measured in the running page (see header).
// DESKTOP: four of the six sit inside a 38×31px box hugging the LEFT edge, and Tschierva sits
// 64px from the RIGHT edge under a ~112px-wide name — the compound case, a dense cluster AND
// two frame edges.
const DESKTOP = {
  viewport: { width: 900, height: 700 },
  points: [
    { x: 235, y: 223 },
    { x: 102, y: 477 },
    { x: 836, y: 288 },
    { x: 68, y: 452 },
    { x: 64, y: 446 },
    { x: 88, y: 474 },
  ],
};
// MOBILE: the same story at a phone width. The four Valais tongues collapse into a 13×10px
// box — this is the frame where MapLibre culled a name outright.
const MOBILE = {
  viewport: { width: 390, height: 760 },
  points: [
    { x: 122, y: 337 },
    { x: 77, y: 423 },
    { x: 326, y: 359 },
    { x: 65, y: 415 },
    { x: 64, y: 413 },
    { x: 72, y: 422 },
  ],
};

const markers = LABELS.map((label) => ({
  label,
  lon: 0,
  lat: 0,
  color: "#e8a33d",
}));

const frame = (f: typeof DESKTOP) => ({
  markers,
  viewport: f.viewport,
  textSize: TEXT,
  radius: RADIUS,
  stepKey: 0,
  emphasise: false,
  highlight: new Set<string>(),
  previous: null,
  project: (_m: unknown, i: number) => f.points[i],
});

const project = (_m: unknown, i: number) => DESKTOP.points[i];
const base = frame(DESKTOP);
const VIEWPORT = DESKTOP.viewport;

const labelOf = (f: GeoJSON.Feature) =>
  (f.properties as Record<string, unknown>).label as string;
const shows = (f: GeoJSON.Feature) =>
  (f.properties as Record<string, unknown>).__showLabel === true;

describe.each([
  ["desktop 900×700", DESKTOP],
  ["mobile 390×760", MOBILE],
])("the reproduced frame (%s): six dots, six names", (_name, f) => {
  const input = frame(f);

  it("names every marker — the mobile frame is where MapLibre dropped one", () => {
    const r = syncLocatorLabels(input);
    const unnamed = r.features.filter((x) => !shows(x)).map(labelOf);
    expect(unnamed).toEqual([]);
    expect(r.features.length).toBe(LABELS.length);
  });

  it("gives no two labels the same pixels — a name moves, it never stacks", () => {
    const boxes = syncLocatorLabels(input).state.boxes;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(
          boxes[i].x < boxes[j].x + boxes[j].w &&
            boxes[i].x + boxes[i].w > boxes[j].x &&
            boxes[i].y < boxes[j].y + boxes[j].h &&
            boxes[i].y + boxes[i].h > boxes[j].y,
        ).toBe(false);
  });

  it("keeps every label INSIDE the frame — the half variable-anchor is blind to", () => {
    // The desktop frame's own failure: "Glacier du Mont Mine" sat at x=68 and variable-anchor
    // swung its ~90px name to the LEFT to dodge Ferpècle, off the canvas. Variable-anchor
    // re-anchors on label↔label collision only and never consults the frame. The shared
    // placement fits the viewport FIRST, so no box may leave it.
    for (const b of syncLocatorLabels(input).state.boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(f.viewport.width);
      expect(b.y + b.h).toBeLessThanOrEqual(f.viewport.height);
    }
  });
});

describe("the reproduced frame: six dots, six names", () => {
  it("puts a name that would overflow the RIGHT edge on the dot's left", () => {
    // Tschierva projects 64px from the right edge under a ~112px name. Anchor "right" means
    // the text's right edge is at the dot — i.e. the label sits to its LEFT. Render-confirmed:
    // the delivered page reports anchor "right" for this marker at 900×700.
    const r = syncLocatorLabels({ ...base, project });
    expect(r.state.anchors[LABELS.indexOf("Glacier de Tschierva")]).toBe(
      "right",
    );
    expect(VIEWPORT.width).toBe(900);
  });

  it("writes the placement it computed onto every feature — anchor AND offset", () => {
    // The failure this guards is the one map-native's own review caught: calling the
    // placement and then never assigning it, leaving `anchor` pinned at its initial value.
    const r = syncLocatorLabels({ ...base, project });
    r.features.forEach((f, i) => {
      const p = f.properties as Record<string, unknown>;
      expect(p.anchor).toBe(r.state.anchors[i]);
      expect(p.labelOffset).toBe(r.state.offsets[i]);
    });
  });
});

describe("the web renderer's own state machine", () => {
  // A camera move that genuinely changes the verdict: the same six markers squeezed into a
  // corner where the placement runs out of room and the declutter has to drop one.
  const crowdedProject = (_m: unknown, i: number) => ({
    x: 30 + (i % 3) * 7,
    y: 30 + Math.floor(i / 3) * 7,
  });

  it("recomputes the PLACEMENT on every move — an anchor chosen at the step boundary goes stale", () => {
    const first = syncLocatorLabels({ ...base, project });
    const moved = syncLocatorLabels({
      ...base,
      project: (m, i) => ({ x: project(m, i).x + 300, y: project(m, i).y }),
      previous: first.state,
    });
    expect(moved.changed).toBe(true);
    expect(moved.state.anchors).not.toEqual(first.state.anchors);
  });

  it("keeps the DECLUTTER verdict frozen within a step — labels must not wink mid-flight", () => {
    const first = syncLocatorLabels({ ...base, project });
    const mid = syncLocatorLabels({
      ...base,
      project: crowdedProject,
      previous: first.state,
    });
    // Same stepKey: the crowded geometry would hide a name, but the reader is mid-scroll on a
    // step whose verdict was already taken. Every name the step opened with stays.
    expect([...mid.state.shown].sort()).toEqual([...first.state.shown].sort());
    expect(mid.features.every(shows)).toBe(true);
  });

  it("retakes the verdict when the STEP changes — that is the editorial moment", () => {
    const first = syncLocatorLabels({ ...base, project });
    const nextStep = syncLocatorLabels({
      ...base,
      stepKey: 1,
      project: crowdedProject,
      previous: first.state,
    });
    expect(nextStep.state.shown.size).toBeLessThan(first.state.shown.size);
    expect(nextStep.changed).toBe(true);
  });

  it("reports a change when only the DIM moved — a reveal at a standing camera", () => {
    // The case the `changed` gate nearly ate: a reveal beat dims its siblings without moving
    // the camera and without retaking the verdict, so the placement and `shown` are both
    // identical. Reporting "nothing changed" there would skip the setData and the reader would
    // scroll onto the sentence about one glacier with all six still lit.
    const first = syncLocatorLabels({ ...base, project });
    const dimmed = syncLocatorLabels({
      ...base,
      project,
      emphasise: true,
      highlight: new Set(["Cervin"]),
      previous: first.state,
    });
    expect(dimmed.state.anchors).toEqual(first.state.anchors);
    expect([...dimmed.state.shown].sort()).toEqual(
      [...first.state.shown].sort(),
    );
    expect(dimmed.changed).toBe(true);
  });

  it("reports NO change when nothing moved — the source is not re-pushed every frame", () => {
    const first = syncLocatorLabels({ ...base, project });
    const again = syncLocatorLabels({
      ...base,
      project,
      previous: first.state,
    });
    expect(again.changed).toBe(false);
  });

  it("a dim beat's highlighted marker keeps the preferred side, and only it glows", () => {
    // The reveal beat's subject is the one the prose is about; it must not be the one shoved
    // onto a worse side by a neighbour. Priority is how the shared placement is told.
    const r = syncLocatorLabels({
      ...base,
      project,
      emphasise: true,
      highlight: new Set(["Glacier du Zmutt"]),
    });
    const i = LABELS.indexOf("Glacier du Zmutt");
    expect(r.state.anchors[i]).toBe("left"); // the FT/NYT default: text to the right
    r.features.forEach((f, k) => {
      expect((f.properties as Record<string, unknown>).__highlight).toBe(
        k === i,
      );
    });
  });

  it("marks every marker highlighted when the beat does not dim", () => {
    const r = syncLocatorLabels({ ...base, project, emphasise: false });
    expect(
      r.features.every(
        (f) => (f.properties as Record<string, unknown>).__highlight === true,
      ),
    ).toBe(true);
  });
});

// ─── The wiring, swept over this package's own locator renderer ─────────────────────────
// The behaviour above is only worth anything if the component runs it. maptilersdk.Map needs
// a real WebGL context bun:test cannot give it (the established pattern in this package —
// dark-mode-and-brand-colour.test.ts — scans the source for the wiring and tests the pure
// helpers genuinely), so the contract is asserted here and the RENDER is the proof of record.
describe("ScrollyLocatorMap runs the shared placement", () => {
  const SRC = readFileSync(
    join(import.meta.dir, "..", "src", "ScrollyLocatorMap.tsx"),
    "utf8",
  );

  it("no longer asks MapLibre for text-variable-anchor", () => {
    // The QUOTED key — a MapLibre layout property, which is the only form that reaches the
    // renderer. Matching the bare word would fail on the header comment that explains why the
    // property is gone, i.e. it would punish the documentation and not the defect.
    expect(SRC).not.toContain('"text-variable-anchor"');
  });

  it("reads anchor and radial offset per feature, and lets nothing cull behind its back", () => {
    expect(SRC).toContain('"text-anchor": ["get", "anchor"]');
    expect(SRC).toContain('"text-radial-offset": ["get", "labelOffset"]');
    // allow-overlap TRUE + optional FALSE: the declutter above is the only culler, exactly as
    // in the four map-native locator renderers. Either property back the other way hands the
    // decision to MapLibre again.
    expect(SRC).toContain('"text-allow-overlap": true');
    expect(SRC).toContain('"text-optional": false');
  });

  it("recomputes the placement on the CAMERA, not only on the step", () => {
    // The scrolly's camera flies for ~1200ms between steps. A placement taken once at the step
    // boundary is stale for the whole flight — which is exactly when a marker drifts toward
    // the frame edge. The component must subscribe to MapLibre's own move signal.
    expect(SRC).toContain("syncLocatorLabels");
    expect(SRC).toMatch(/\.on\(\s*"move"/);
  });

  it("retakes the declutter verdict only once the camera has LANDED", () => {
    // "Which names fit this frame" has to be asked of the frame the reader will READ. Promoting
    // the verdict at the step boundary asks it of the frame being left, and the answer is then
    // one camera behind for the rest of the story — a silent, permanent off-by-one.
    expect(SRC).toMatch(/\.on\(\s*"moveend"/);
    expect(SRC).toContain(
      "beatLabelRef.current.verdictKey = beatLabelRef.current.step",
    );
  });

  it("leaves exactly ONE writer on the locator source", () => {
    // The step effect used to rebuild the source itself, in the pre-placement feature shape
    // (no anchor, no labelOffset, no __showLabel) and then override the layers' opacity with
    // setPaintProperty. Either one silently undoes the placement — and the missing
    // `__showLabel` would have hit the label layer's own filter and hidden EVERY name.
    // Call syntax, not the bare word — the comment above this layer explains what was removed
    // and must not be what makes the test red.
    expect(SRC.match(/\.setData\(/g)?.length ?? 0).toBe(1);
    expect(SRC).not.toContain("map.setPaintProperty(");
  });
});
