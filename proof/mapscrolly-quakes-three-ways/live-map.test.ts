// THE LIVE MAPTILER LAYER UNDER THIS BEAT — the pure half, and the artifact.
//
// `verify-live-tiles.mjs` and `drive.mjs` run the real measurement in real Chrome with a real key.
// This file guards the two things that can be wrong in SILENCE, which is what a test is for here:
//
//   1. **The camera.** A camera that lands a degree off looks like a map. The projection and the
//      contain fit are pure functions and are checked against independently-derived numbers.
//   2. **The artifact.** `AUDIT-W5-W6-map.md` §5.6 is the reason this half exists: for a week
//      every map page in this tree rendered a baked plate and NOTHING asserted otherwise, so the
//      whole of ruling R1 could be — and was — absent without a single guard going red. This beat
//      shipped in exactly that state until 2026-08-10: `grep -c 'maplibregl\|api.maptiler.com'`
//      over `render/quakes-four-maps.html` returned 0, and the page's own source line boasted
//      about it.
//
// THE MUTATIONS, run in an rsync copy under
// `/private/tmp/claude-501/.../scratchpad/mutate/` — never in this tree — with the red each one
// produced.
//
// M1 — `live-scroll-map.mjs`: `plateToLonLat` interpolates latitude LINEARLY
//      (`corners.north + (point[1]/frame.height) * (corners.south - corners.north)`) instead of
//      through Mercator, which is the mistake this projection invites and which no screenshot can
//      see:
//
//        error: expect(received).toBeCloseTo(expected, precision)
//        Expected: 25.882   Received: 7.684411465586976
//        Received difference: 18.197588534413025
//        (fail) the live camera > reads the plate's own centre back as the place it stands for
//         22 pass, 1 fail
//
//      ONE test, and the reason is worth keeping: the CORNERS test stays green because a linear
//      and a Mercator interpolation agree at both ends of the frame, and the `viewForCamera` test
//      stays green because it compares the camera against `plateToLonLat` — both mutated, so it
//      compares a wrong number with itself. Only a point in the MIDDLE, against a value derived by
//      hand in the test's own comment, can see this defect.
//
// M2 — `live-scroll-map.mjs`: `fitCamera` uses `Math.max` instead of `Math.min` — a COVER fit
//      instead of a CONTAIN one, which crops the marks this beat counts:
//
//        (fail) the live camera > puts the phone's camera BELOW zoom zero …
//               Expected: < 0        Received: 0.8151369339548645
//        (fail) the contain fit > fits the plate inside the frame on whichever axis binds first
//               Expected: 1          Received: 1.4354066985645932
//        (fail) the contain fit > centres what is left over
//               Expected: 182        Received: 0
//        (fail) the contain fit > never crops, which is the whole reason this beat fits rather than covers
//               Expected: <= 806.000000001   Received: 995.2153110047847
//         19 pass, 4 fail
//
// M3 — `live-scroll-map.mjs`: `worldRepeats` returns 0 unconditionally — the state this beat was
//      in for one render, when the world repeat drew an EMPTY Japan, Kamchatka and New Zealand
//      beside a paragraph counting every event on them:
//
//        (fail) the world repeat > asks for one copy each side when the frame is wider than the world
//               Expected: 1   Received: 0
//        (fail) the world repeat > asks for more copies as the frame outgrows the world
//               Expected: 2   Received: 0
//         21 pass, 2 fail
//
// M4 — `live-scroll-map.mjs`: `cameraDrift` charges the scale disagreement at the ORIGIN
//      (`Math.abs(computed.scale - measured.scale)` alone) instead of at the plate's far corner,
//      so 0.01 of scale on an 836-unit plate reports 0.01px instead of 8.36px and the tripwire
//      that refuses a misregistered map never fires:
//
//        error: expect(received).toBeCloseTo(expected, precision)
//        Expected: 8.36   Received: 0.010000000000000009
//        (fail) the drift tripwire > charges a scale disagreement at the plate's far corner, not
//               at its origin
//         22 pass, 1 fail
//
// M5 — `render.mjs`: the two inlined scripts are dropped from the first frame and `live` is passed
//      `false` — the exact state this beat shipped in until 2026-08-10 — then re-rendered:
//
//        (fail) the delivered file carries the live layer > carries maplibre-gl, the boot and the
//               container            Expected to contain: "maplibregl"
//        (fail) … > points its style at MapTiler, with the placeholder and never a key
//               Expected to contain: "https://api.maptiler.com/maps/dataviz-light/style.json?key="
//        (fail) … > gives the reader no controls at all
//               Expected to contain: "interactive: false"
//        (fail) … > keeps the baked plate under the live tiles as the fallback, on every frame
//               Expected to contain: "html.qm-live [data-part=plate]{opacity:0}"
//         19 pass, 4 fail

import { describe, expect, it } from "bun:test";
import { worldCopiesToCover } from "../../skills/scrolly/scripts/detect-wraps-the-world.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bakeZoomOf,
  cameraDrift,
  fitCamera,
  planIsUnkeyed,
  plateToLonLat,
  viewForCamera,
  worldRepeats,
} from "./live-scroll-map.mjs";

/** This beat's own plate, as `plate/geometry.json` records it — read off the file rather than
 *  re-typed, so a re-bake cannot leave the guard testing a camera that no longer exists. */
const GEOMETRY = JSON.parse(
  readFileSync(join(import.meta.dirname, "plate", "geometry.json"), "utf8"),
) as {
  frame: { width: number; height: number };
  frameCorners: { west: number; north: number; east: number; south: number };
  worldWidthPx: number;
};

describe("the live camera", () => {
  it("reads the plate's own corners back as the corners the bake recorded", () => {
    const [west, north] = plateToLonLat([0, 0], GEOMETRY);
    const [east, south] = plateToLonLat(
      [GEOMETRY.frame.width, GEOMETRY.frame.height],
      GEOMETRY,
    );
    expect(west).toBeCloseTo(GEOMETRY.frameCorners.west, 6);
    expect(north).toBeCloseTo(GEOMETRY.frameCorners.north, 6);
    expect(east).toBeCloseTo(GEOMETRY.frameCorners.east, 6);
    expect(south).toBeCloseTo(GEOMETRY.frameCorners.south, 6);
  });

  it("reads the plate's own centre back as the place it stands for", () => {
    // Mercator, not linear. This plate runs 79.84654°N to 64.47771°S. Independently:
    // mercatorY(79.84654) = 2.726447 and mercatorY(−64.47771) = −1.518809, whose midpoint 0.603819
    // inverts to 25.882°N. The arithmetic mean of the two latitudes is 7.684°N — **18 degrees,
    // about 2,000 km** — which is how far off this beat's whole live camera would sit if the
    // latitude were interpolated the obvious way. Nothing on the screen would look wrong; the
    // dots would simply be in the wrong sea.
    const [lon, lat] = plateToLonLat(
      [GEOMETRY.frame.width / 2, GEOMETRY.frame.height / 2],
      GEOMETRY,
    );
    expect(lon).toBeCloseTo(0, 6);
    expect(lat).toBeCloseTo(25.882, 3);
  });

  it("turns a resolved camera into the map's own centre and zoom", () => {
    // A camera drawing the plate 1:1 with its top-left at the frame's origin: the map's centre is
    // the plate point under the frame's centre, and its zoom is the bake's own.
    const frame = { width: 800, height: 600 };
    const view = viewForCamera({ scale: 1, tx: 0, ty: 0 }, frame, GEOMETRY);
    expect(view.zoom).toBeCloseTo(Math.log2(GEOMETRY.worldWidthPx / 512), 6);
    expect(view.center).toEqual(plateToLonLat([400, 300], GEOMETRY));
  });

  it("moves one zoom level per doubling of the camera's scale", () => {
    const frame = { width: 800, height: 600 };
    const one = viewForCamera({ scale: 1, tx: 0, ty: 0 }, frame, GEOMETRY);
    const two = viewForCamera({ scale: 2, tx: 0, ty: 0 }, frame, GEOMETRY);
    expect(two.zoom - one.zoom).toBeCloseTo(1, 12);
  });

  it("puts the phone's camera BELOW zoom zero, which is why the map's own floor is lowered", () => {
    // 375px of frame for an 836-unit world is zoom −0.45. MapLibre's default `minZoom` is 0, and a
    // clamp there would leave the tiles at 512px against marks drawn at 375 — the whole reason
    // `initLiveQuakeMap` passes `minZoom: -2`.
    const frame = { width: 375, height: 560 };
    const view = viewForCamera(
      fitCamera(frame, GEOMETRY.frame),
      frame,
      GEOMETRY,
    );
    expect(view.zoom).toBeLessThan(0);
    expect(view.zoom).toBeGreaterThan(-2);
  });

  it("refuses a plate that predates the camera facts rather than guessing a place", () => {
    expect(() =>
      plateToLonLat([0, 0], { frame: { width: 10, height: 10 } }),
    ).toThrow("frameCorners");
    expect(() => bakeZoomOf({ frame: { width: 10, height: 10 } })).toThrow(
      "worldWidthPx",
    );
  });
});

describe("the contain fit", () => {
  const plate = { width: 836, height: 520 };

  it("fits the plate inside the frame on whichever axis binds first", () => {
    // Wide frame: the HEIGHT binds. 520 → 520 is scale 1, and the width has 364px to spare.
    expect(fitCamera({ width: 1200, height: 520 }, plate).scale).toBe(1);
    // Tall frame: the WIDTH binds.
    expect(fitCamera({ width: 418, height: 900 }, plate).scale).toBe(0.5);
  });

  it("centres what is left over", () => {
    const camera = fitCamera({ width: 1200, height: 520 }, plate);
    expect(camera.tx).toBe((1200 - 836) / 2);
    expect(camera.ty).toBe(0);
    const tall = fitCamera({ width: 418, height: 900 }, plate);
    expect(tall.tx).toBe(0);
    expect(tall.ty).toBe((900 - 260) / 2);
  });

  it("never crops, which is the whole reason this beat fits rather than covers", () => {
    for (const frame of [
      { width: 1600, height: 806 },
      { width: 1280, height: 706 },
      { width: 768, height: 900 },
      { width: 375, height: 560 },
    ]) {
      const camera = fitCamera(frame, plate);
      expect(camera.scale * plate.width).toBeLessThanOrEqual(
        frame.width + 1e-9,
      );
      expect(camera.scale * plate.height).toBeLessThanOrEqual(
        frame.height + 1e-9,
      );
    }
  });

  it("refuses a box with no size rather than dividing by it", () => {
    expect(() => fitCamera({ width: 0, height: 100 }, plate)).toThrow(
      "contain fit",
    );
  });
});

describe("the world repeat", () => {
  it("asks for nothing while the world fills the frame or overflows it", () => {
    expect(worldRepeats(375, 375)).toBe(0);
    expect(worldRepeats(768, 900)).toBe(0);
  });

  it("asks for one copy each side when the frame is wider than the world", () => {
    // 1600px of frame for a 1320px world: 140px of slack down each side, which MapLibre fills with
    // a repeat and which the marks have to follow into.
    expect(worldRepeats(1600, 1320)).toBe(1);
    expect(worldRepeats(1280, 1135)).toBe(1);
  });

  it("asks for more copies as the frame outgrows the world", () => {
    expect(worldRepeats(3000, 800)).toBe(2);
    expect(worldRepeats(5000, 800)).toBe(3);
  });

  it("refuses to answer for a world with no width rather than returning a number", () => {
    expect(worldRepeats(1600, 0)).toBe(0);
  });

  // THE TWO SUBSTRATES COUNT WORLDS THE SAME WAY, and this is what keeps them from drifting.
  // `worldRepeats` above is the LIVE layer's own copy, run against MapLibre's camera; the skill's
  // `worldCopiesToCover` is the same arithmetic run at RENDER time for the no-JavaScript fallback,
  // which cannot measure the reader's box and has to bake its count. They live in two files on
  // purpose — a beat directory stays copy-pasteable on its own — so nothing but this asserts they
  // still agree.
  it("counts worlds exactly as the fallback's own derivation does, over every box a reader has", () => {
    for (let frame = 300; frame <= 6000; frame += 37)
      for (const world of [375, 512, 836.5, 1128, 1313, 2653])
        expect(worldRepeats(frame, world)).toBe(worldCopiesToCover(frame, world));
  });
});

describe("the drift tripwire", () => {
  const plate = { width: 836, height: 520 };

  it("is zero when the computed camera is the one the browser drew", () => {
    const camera = { scale: 1.577, tx: 140.5, ty: 0 };
    expect(cameraDrift(camera, { ...camera }, plate)).toBe(0);
  });

  it("charges a scale disagreement at the plate's far corner, not at its origin", () => {
    // 0.01 of scale is a hundredth of a pixel at the plate's origin and 8.36px at its east edge.
    // The second number is the one a reader meets, as a dot in the sea off Japan.
    expect(
      cameraDrift(
        { scale: 1.5, tx: 0, ty: 0 },
        { scale: 1.51, tx: 0, ty: 0 },
        plate,
      ),
    ).toBeCloseTo(8.36, 6);
  });

  it("charges a translation disagreement as it stands", () => {
    expect(
      cameraDrift(
        { scale: 1, tx: 10, ty: 4 },
        { scale: 1, tx: 12, ty: 4 },
        plate,
      ),
    ).toBe(2);
  });
});

describe("the plan is unkeyed until it is delivered", () => {
  it("recognises the committed state", () => {
    expect(
      planIsUnkeyed({
        styleUrl:
          "https://api.maptiler.com/maps/x/style.json?key=__MAPTILER" +
          "_KEY__",
      }),
    ).toBe(true);
    expect(planIsUnkeyed(null)).toBe(true);
    expect(planIsUnkeyed({})).toBe(true);
  });

  it("recognises a delivered one", () => {
    expect(
      planIsUnkeyed({
        styleUrl: "https://api.maptiler.com/maps/x/style.json?key=abc123",
      }),
    ).toBe(false);
  });
});

describe("the delivered file carries the live layer", () => {
  const html = readFileSync(
    join(import.meta.dirname, "render", "quakes-four-maps.html"),
    "utf8",
  );
  /** THE BEAT'S OWN SCRIPT, sliced off the file at its own first line. maplibre-gl is inlined
   *  BEFORE it and the library's source contains every word a naive assertion would look for —
   *  `NavigationControl`, `addControl`, `interactive` — so a claim about what this BEAT does has to
   *  be made against the beat's own script, not against the file. Sliced from the FIRST line of
   *  `live-scroll-map.mjs` rather than from `initLiveQuakeMap`, which sits at the bottom of it: the
   *  first attempt cut from the function and the slice no longer contained `syncWorldRepeats`,
   *  declared above it. */
  const boot = html.slice(
    html.indexOf("// THE LIVE MAPTILER LAYER UNDER THIS BEAT"),
  );

  it("carries maplibre-gl, the boot and the container", () => {
    expect(html).toContain("maplibregl");
    expect(html).toContain("function initLiveQuakeMap(");
    expect(html).toContain('data-part="live"');
    expect(boot).toContain("new win.maplibregl.Map");
    // The marks repeat with the world — the thing that keeps a repeated coast from being empty.
    expect(boot).toContain("function syncWorldRepeats(");
    // WHAT THIS FLOOR IS FOR: maplibre-gl really inlined, not a <script src> to a CDN that a
    // reader offline — or a newsroom CSP — would never load. Measured on this file: the library is
    // 802,816 of its 1,318,155 characters, so the page WITHOUT it is 515,339 and any floor above
    // that reddens when it is stripped.
    //
    // It used to read 1_400_000 and went red without anything breaking: `656f3d34` ("emit the
    // basemap plate once, reference it three times") legitimately removed two copies of a 340 KiB
    // plate, and the floor was never re-derived. A floor that only measures TOTAL weight cannot
    // tell a page that lost dead weight from a page that lost its library — so the library's own
    // block is measured here as well, and it is the assertion that carries the meaning.
    const library = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1])
      .filter((body) => body.includes("maplibre"))
      .reduce((widest, body) => Math.max(widest, body.length), 0);
    expect(library).toBeGreaterThan(700_000);
    expect(html.length).toBeGreaterThan(1_200_000);
  });

  it("points its style at MapTiler, with the placeholder and never a key", () => {
    expect(html).toContain(
      "https://api.maptiler.com/maps/dataviz-light/style.json?key=",
    );
    expect(html).toContain("__MAPTILER" + "_KEY__");
    // R1b, stated locally as well as in the tree-wide guard: exactly one key parameter, and it is
    // the placeholder.
    const keys = [
      ...html.matchAll(/api\.maptiler\.com[^"']*?key=([^"'&\s]+)/g),
    ].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key).toBe("__MAPTILER" + "_KEY__");
  });

  it("gives the reader no controls at all — the scroll is the only thing that moves this camera", () => {
    // The owner, 2026-08-10: *"Pas de controls sur le scrolly, le scroll pilote et la map doit
    // prendre toute la largeur."* A DELIBERATE difference from map × web, where R1 requires
    // MapTiler's own zoom and pan controls; recorded here so nobody later "fixes" it back.
    expect(boot).toContain("interactive: false");
    // By CONSTRUCTION rather than by word: the beat's own script names `NavigationControl` in the
    // comment that explains why it has none, so the guard has to look for the CALL.
    expect(boot).not.toContain(".addControl(");
    expect(boot).not.toContain("new win.maplibregl.NavigationControl");
  });

  it("keeps the baked plate under the live tiles as the fallback, on every frame", () => {
    expect(html.match(/data-part="plate"/g)).toHaveLength(4);
    expect(html.match(/data-part="marks"/g)).toHaveLength(4);
    expect(html.match(/data-part="surface"/g)).toHaveLength(4);
    expect(html).toContain("data:image/png;base64,");
    // The plate is hidden by a class the live layer adds, and by nothing else — so with no script
    // it is what a reader sees.
    expect(html).toContain("html.qm-live [data-part=plate]");
  });

  it("repeats the world east and west with no script, and puts this beat's marks on every copy", () => {
    // The 2026-08-23 wrap ruling, on the substrate that cannot ask MapLibre for anything. Four
    // frames, one copy each side, in BOTH layers: the plate a reader sees and the marks that make
    // the copy mean something. 4 x 2 x 2 = 16.
    expect(html.match(/data-part="fallback-world"/g)).toHaveLength(16);
    expect(html.match(/data-world="-1"/g)).toHaveLength(8);
    expect(html.match(/data-world="1"/g)).toHaveLength(8);
    // Each mark copy references its OWN frame's surface, never another frame's — one reference, no
    // second copy of a 190 KiB dot path in the delivered file.
    for (const step of ["events", "bins", "biggest", "strength"]) {
      expect(html).toContain(`id="qm-surface-${step}"`);
      expect(html.match(new RegExp(`href="#qm-surface-${step}"`, "g"))).toHaveLength(2);
    }
    // And the two substrates hand over rather than both painting: the fallback's copies go to zero
    // at the same moment the plate does.
    expect(html).toContain("html.qm-live [data-part=fallback-world]{opacity:0}");
  });
});
