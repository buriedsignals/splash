import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BEAT,
  digestOf,
} from "../../../proof/static-choropleth-europe-lowcarbon/bake.mjs";
import { plateIsCurrent } from "../../../proof/static-choropleth-europe-lowcarbon/plate-cache.mjs";

/**
 * `plateIsCurrent` used to compare only the drawn size and the two tints — three of the six inputs
 * `bake.mjs` actually takes and records — so a change to the camera bounds, the MapTiler style, or
 * the shapes file left a stale plate in place and reported it as current. Every case below changes
 * exactly one recorded input and expects the cache to notice; a run over a temp directory, never the
 * committed plates, so nothing here can trigger a re-bake of what is already shipped.
 */

/** A `geometry.json` exactly as `bake.mjs` would write one, for a plate baked with the given inputs
 *  — including the fields the cache never reads, because a real one carries them too. */
function geometryFor({
  width,
  height,
  water,
  land,
  bounds,
  style,
  shapesDigest,
}) {
  return {
    frame: { width, height },
    bounds,
    style,
    water,
    land,
    shapesDigest,
    gatedBy: "idle",
    zoom: 4,
    frameCorners: { west: -25, east: 42, south: 34, north: 68 },
    worldWidthPx: 8192,
    degreesPerPixel: 0.01,
    metresPerPixel: 1000,
    shapes: [],
  };
}

describe("plateIsCurrent", () => {
  const INPUTS = { width: 500, height: 400, water: "#111111", land: "#eeeeee" };
  let dir: string;
  let countriesPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "plate-cache-"));
    countriesPath = join(dir, "shapes.geojson");
    writeFileSync(
      countriesPath,
      JSON.stringify({ type: "FeatureCollection", features: [] }),
    );
    // The cache only checks that a plate image exists; its bytes are never read.
    writeFileSync(
      join(dir, "plate.png"),
      "not a real png, existence is all that is checked",
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Writes `geometry.json` as a bake of `INPUTS` (plus `BEAT`'s current bounds and style) would
   *  have recorded it, with the digest always taken off `countriesPath`'s CURRENT bytes — so a test
   *  that wants a stale shapes file changes the file itself after calling this, not the digest. */
  async function recordCurrentBake(overrides: Record<string, unknown> = {}) {
    const shapesDigest = await digestOf(countriesPath);
    writeFileSync(
      join(dir, "geometry.json"),
      JSON.stringify(
        geometryFor({
          width: INPUTS.width,
          height: INPUTS.height,
          water: INPUTS.water,
          land: INPUTS.land,
          bounds: BEAT.bounds,
          style: BEAT.style,
          shapesDigest,
          ...overrides,
        }),
      ),
    );
  }

  const check = () => plateIsCurrent(dir, { ...INPUTS, countriesPath });

  it("should accept a plate whose every recorded input still matches", async () => {
    await recordCurrentBake();
    expect(await check()).toBe(true);
  });

  it("should refuse a plate with no geometry.json at all", async () => {
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked at a different width", async () => {
    await recordCurrentBake({ width: INPUTS.width + 1 });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked at a different height", async () => {
    await recordCurrentBake({ height: INPUTS.height + 1 });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked with a different water tint", async () => {
    await recordCurrentBake({ water: "#ff0000" });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked with a different land tint", async () => {
    await recordCurrentBake({ land: "#00ff00" });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked on different bounds than bake.mjs would use today", async () => {
    await recordCurrentBake({
      bounds: [
        [-30, 30],
        [45, 70],
      ],
    });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate baked in a different MapTiler style than bake.mjs would use today", async () => {
    await recordCurrentBake({ style: "dataviz-dark" });
    expect(await check()).toBe(false);
  });

  it("should refuse a plate whose shapes file has since changed", async () => {
    await recordCurrentBake();
    // The recorded digest is of the OLD bytes; changing the file after the fact is the stale case.
    writeFileSync(
      countriesPath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [{ id: "a new country" }],
      }),
    );
    expect(await check()).toBe(false);
  });
});
