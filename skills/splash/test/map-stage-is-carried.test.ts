/**
 * THE MAP'S OWN HALF OF THE SIZE DECISION.
 *
 * `delivered-size-matches-the-pin.test.ts` holds the FRAME: a beat that pins `landscape` delivers a
 * file whose own bytes read 1920x1080. It says nothing about what that frame did to the MAP inside
 * it, and for a chart the answer to that is `assertPlotAspect`. A map has no plot rectangle to
 * clamp — `type-at-size.mjs` says so in its own `NAMED_REFUSALS` and hands the question to the map
 * chantier. `skills/map-beat/scripts/stage.mjs` is the answer; this is its guard.
 *
 * THREE THINGS IT HOLDS, and the third is the one that matters:
 *
 *  1. **Carriage.** Three physical copies — the skill's `scripts/`, the `shared/` mirror a `proof/`
 *     beat loads through `#shared/*`, and the vendored copy a `cp -r root-template/` install puts in
 *     a newsroom's root. Walked, never listed, so a fourth copy is guarded the moment it lands.
 *  2. **Agreement with `assets/geo.ts`.** `maxStageHeightPx` exists twice, in a `.ts` a component
 *     imports and a `.mjs` a render script imports, because neither runtime can reach the other's
 *     file. They are compared by being DRIVEN over the same inputs, not by comparing their text: a
 *     duplicated derivation that agrees on every reading is one derivation.
 *  3. **Every committed plate a beat draws clears the ceiling.** Walked over `proof/*​/plate*​/
 *     geometry.json`, so this is a statement about the tree rather than about the function. It is
 *     what licenses `stage.mjs` to assert the ceiling instead of clamping it: if a bake ever lands a
 *     plate whose longitude its own aspect cannot hold, this reddens before any render does.
 *
 * ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────
 * In an rsync of the tree under `/tmp/map-stage-mut/`, never in this working tree.
 * Baseline 9 pass / 0 fail.
 *
 *   the CANONICAL 360 -> 361 in maxStageHeightPx        RED 7/2 — both halves: carriage, because the
 *                                                             mirrors no longer match, AND the
 *                                                             agreement with `geo.ts`, which is the
 *                                                             reading that matters
 *   `shared/map-beat/stage.mjs` 360 -> 361 only         RED 8/1 — carriage alone. Recorded because
 *                                                             the difference is the point: the
 *                                                             agreement assertion imports the
 *                                                             canonical, so a drifted MIRROR is
 *                                                             caught by byte-identity and by nothing
 *                                                             else. That is what the mirror
 *                                                             assertion is for.
 *   `mapStageBox` returns `availableHeight` always      RED 8/1 — the letterbox assertion: the map
 *                                                             takes the frame's whole height, which
 *                                                             is the crop this file exists to forbid
 *   `assertStageHonoursGeography` returns, never throws RED 8/1
 *   `typeScaleFor` returns `row.typeScale` always       RED 8/1 — an 11px marker label lands at
 *                                                             24.2px under a 26px floor, silently
 *   the canonical `stage.mjs` renamed                   RED 1/8 on the premise, not silently green
 *   one committed plate's `frameCorners.east` widened
 *     past 360a (mapmore-flow-danube)                   RED 8/1, naming the plate
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(TWIN, "skills", "map-beat", "scripts", "stage.mjs");

function findAll(dir: string, basename: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAll(p, basename, out);
    else if (e.name === basename) out.push(p);
  }
  return out;
}

const copies = findAll(TWIN, "stage.mjs");

describe("the map stage module — carried, and identical wherever it landed", () => {
  it("should find the canonical copy and the two mirrors, so nothing below is vacuous", () => {
    expect(copies).toContain(CANONICAL);
    expect(copies.length).toBeGreaterThanOrEqual(3);
  });

  it("should be byte-identical in every copy", () => {
    const canonical = readFileSync(CANONICAL, "utf8");
    for (const path of copies)
      expect([
        relative(TWIN, path),
        readFileSync(path, "utf8") === canonical,
      ]).toEqual([relative(TWIN, path), true]);
  });
});

describe("the Mercator ceiling, derived twice and driven over the same readings", () => {
  it("should agree with assets/geo.ts at every width and longitude span", async () => {
    const mjs = await import(CANONICAL);
    const ts = await import(
      join(TWIN, "skills", "map-beat", "assets", "geo.ts")
    );
    // Driven, not compared as text. One is a `.mjs` a render script imports and the other a `.ts` a
    // component imports; neither runtime can reach the other's file, which is why the duplication
    // exists at all. What has to be true is that they answer the same.
    const disagreements: string[] = [];
    for (const width of [360, 900, 940, 1080, 1920, 3840])
      for (const lon of [0.137, 23.7, 59, 83, 180, 266, 360]) {
        const a = mjs.maxStageHeightPx(width, lon);
        const b = ts.maxStageHeightPx(width, lon);
        if (Math.abs(a - b) > 1e-9)
          disagreements.push(`${width}px / ${lon}° → ${a} vs ${b}`);
      }
    expect(disagreements).toEqual([]);
  });
});

describe("a frame taller than the geography letterboxes, and never crops", () => {
  it("should give the map the height its geography demands and hand the rest back", async () => {
    const { mapStageBox } = await import(CANONICAL);
    // A planet-extent plate (the shape `map-quake-density` bakes) in a portrait content box.
    const box = mapStageBox({
      availableWidth: 984,
      availableHeight: 1400,
      plateFrame: { width: 836, height: 480 },
      studyLonSpanDeg: 360,
    });
    expect(box.boundBy).toBe("width");
    expect(box.width).toBe(984);
    expect(box.height).toBe(Math.floor(984 / (836 / 480)));
    expect(box.letterboxed).toBe(true);
    // The whole point: what the frame offered and the geography could not fill comes BACK, as a
    // number a beat spends on furniture. A crop would have returned 1400 here.
    expect(box.spareHeightPx).toBe(1400 - box.height);
    expect(box.height).toBeLessThanOrEqual(box.ceilingPx);
  });

  it("should be bound by height, with nothing left over, where the frame is the flat one", async () => {
    const { mapStageBox } = await import(CANONICAL);
    const box = mapStageBox({
      availableWidth: 1800,
      availableHeight: 500,
      plateFrame: { width: 836, height: 480 },
      studyLonSpanDeg: 360,
    });
    expect(box.boundBy).toBe("height");
    expect(box.height).toBe(500);
    expect(box.letterboxed).toBe(false);
    expect(box.width).toBe(Math.floor(500 * (836 / 480)));
  });

  it("should refuse a plate whose own aspect cannot hold the longitude it shows", async () => {
    const { assertStageHonoursGeography } = await import(CANONICAL);
    // A tall plate — 480 wide by 836 — showing the whole world: `360 * 0.574 = 207°` is all a box
    // of that aspect can ever hold, at any size.
    expect(() =>
      assertStageHonoursGeography({ width: 480, height: 836 }, 360, {
        what: "an impossible plate",
      }),
    ).toThrow(/Web Mercator's world is square/);
    expect(
      assertStageHonoursGeography({ width: 836, height: 480 }, 360),
    ).toBeCloseTo(836 / 480, 6);
  });
});

describe("every committed plate in the tree clears the ceiling its own aspect sets", () => {
  /** Every `geometry.json` under `proof/`, at any depth — the plates beats actually draw. */
  function geometriesUnder(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) geometriesUnder(p, out);
      else if (e.name === "geometry.json") out.push(p);
    }
    return out;
  }

  const geometries = existsSync(join(TWIN, "proof"))
    ? geometriesUnder(join(TWIN, "proof"))
    : [];

  it("should find the plates, so the assertion below cannot go vacuously green", () => {
    expect(geometries.length).toBeGreaterThanOrEqual(10);
  });

  it("should hold for every one of them", async () => {
    const { assertStageHonoursGeography, lonSpanOf } = await import(CANONICAL);
    const broken: string[] = [];
    for (const path of geometries) {
      const geometry = JSON.parse(readFileSync(path, "utf8"));
      if (!geometry.frame || !geometry.frameCorners) continue;
      try {
        assertStageHonoursGeography(geometry.frame, lonSpanOf(geometry), {
          what: relative(TWIN, path),
        });
      } catch (e) {
        broken.push((e as Error).message);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("the type scale a map beat draws at", () => {
  it("should put the beat's own smallest token on the floor, and never go under the table", async () => {
    const { typeScaleFor } = await import(CANONICAL);
    const { SIZES } = await import(
      join(TWIN, "shared", "chart-beat", "sizes.mjs")
    );
    // The locator's marker label is 11px at 900x560 — under the seed's own smallest token (12), so
    // the table's default scale would land it at 24.2px against a 26px floor.
    for (const name of ["landscape", "square", "portrait"]) {
      const row = SIZES[name as keyof typeof SIZES];
      const scale = typeScaleFor(row, 11);
      expect([name, scale >= row.typeScale]).toEqual([name, true]);
      expect([name, Math.round(11 * scale) >= row.minTypePx]).toEqual([
        name,
        true,
      ]);
    }
    // And a beat whose smallest token already clears the floor keeps the table's own scale.
    expect(typeScaleFor(SIZES.landscape, 13)).toBe(SIZES.landscape.typeScale);
  });
});
