/**
 * WHAT A MAP BEAT CARRIES, after the render ladder has proved it exists.
 *
 * `render-map.mjs` runs the join and the claim check and produces a still, a final frame and an mp4.
 * Nothing until now asked the two questions this format's own doctrine spends most of its words on:
 * does the baked plate describe the same geography the marks were projected into, and is it on the
 * same side of the theme as the ground the beat declares.
 *
 * THE SUBSTRATE IS THE BAKE'S OWN OUTPUT, not a render and not a browser. `bake-plate.mjs` writes
 * `plate/plate.png` and `plate/geometry.json` beside each other, and `geometry.json` records the
 * FRAME the marks were projected into (`frame: {width, height}`) along with every point's pixel
 * position in it. So "the plate and the marks describe the same place" is decidable from two files
 * and nothing else — exactly, with no rasteriser, no Chrome, and no tolerance.
 *
 * WHY NOT `projectionDisagreements`, the guard the catalogue first pointed here. That decision
 * compares an `<img>`'s CSS `object-fit` against the `preserveAspectRatio` of the SVG drawn over it.
 * Measured across this tree: `object-fit` appears in exactly TWO files, both scrolly IMAGE beats, and
 * in no map component at all. A map beat composites its plate as an `<image>` INSIDE the marks' own
 * SVG, in the marks' own coordinate system — there are not two projections that could disagree. The
 * same DEFECT class is reachable here by a different mechanism, and that is what
 * `plateMatchesGeometry` decides: an `<image>` drawn into a box of a different aspect ratio
 * letterboxes under the default `preserveAspectRatio="xMidYMid meet"`, and every projected point
 * then lands somewhere the basemap never claimed.
 *
 * THE POPULATION, measured 2026-08-19 across the 17 beats on disk that carry a baked plate:
 *   16 carry `plate/geometry.json`; every one has a plate whose aspect ratio matches its frame's to
 *      0.000%, at exactly 2.00x (the bake's `deviceScaleFactor`)
 *   17 declare a ground in their own `PALETTE.md`; every plate is on that ground's side — sixteen
 *      light plates (0.661 to 0.893) under `#FFFFFF`, one dark plate (0.016) under `#16191B`
 *    4 map components carry a `strokeDasharray`; the two that belong to this format
 *      (`FlowMapVideo`, `LocatorVideo`) divide theirs by the camera's scale, which is the correct
 *      compensation, and neither declares a `vectorEffect`
 *
 * Nothing here is being repaired. All three are ratchets.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  groundFromPalette,
  marksFromSource,
  plateFollowsGround,
  plateLuminance,
  plateMatchesGeometry,
  revealDashInScreenSpace,
  surfaceLuminance,
} from "../scripts/verify-map.mjs";
import { decodePng } from "../scripts/compare-png.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("a baked plate under a declared ground", () => {
  it("refuses a light plate under a dark ground", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.83 })).toBe(false);
  });

  it("refuses a dark plate under a light ground", () => {
    expect(plateFollowsGround({ ground: 0.95, plate: 0.014 })).toBe(false);
  });

  it("accepts a mid-grey plate under either", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.42 })).toBe(true);
    expect(plateFollowsGround({ ground: 0.95, plate: 0.42 })).toBe(true);
  });

  it("does not run at all on a ground it could not read", () => {
    expect(plateFollowsGround({ ground: null, plate: 0.83 })).toBe(true);
  });
});

describe("reading the ground a beat declares", () => {
  it("takes it from the PALETTE.md frontmatter", () => {
    expect(groundFromPalette('---\nground: "#16191B"\naccent: "#13A99B"\n---\n')).toBe("#16191B");
    expect(groundFromPalette("---\nground: #FFFFFF\n---\n")).toBe("#FFFFFF");
  });

  it("returns null rather than a guess when there is none", () => {
    expect(groundFromPalette("---\naccent: \"#13A99B\"\n---\n")).toBe(null);
    expect(groundFromPalette("")).toBe(null);
  });

  // The guard that failed three correct beats read a transparent box as black. A ground that cannot
  // be read must travel as `null` the whole way, never as a number.
  it("hands plateFollowsGround a null it can refuse to act on", () => {
    expect(surfaceLuminance(groundFromPalette(""))).toBe(null);
  });
});

describe("a plate and the frame its marks were projected into", () => {
  it("refuses a plate whose aspect ratio is not the frame's", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 960 }, frame: { width: 836, height: 520 } }),
    ).toMatchObject({ ok: false });
  });

  it("accepts the exact pairing every beat on disk has", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 960 }, frame: { width: 836, height: 480 } }),
    ).toMatchObject({ ok: true, scale: 2 });
  });

  // Sub-pixel: a 936x827 frame baked at 2x is 1872x1654, and the two ratios are 1.13180 and 1.13180.
  // A tolerance is needed because a frame is integers and a ratio is not; one part in a thousand is
  // four times under the smallest letterboxing that could hide a mark at this corpus's sizes.
  it("allows the rounding an integer frame forces, and nothing more", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1872, height: 1654 }, frame: { width: 936, height: 827 } }),
    ).toMatchObject({ ok: true });
    expect(
      plateMatchesGeometry({ plate: { width: 1872, height: 1650 }, frame: { width: 936, height: 827 } }),
    ).toMatchObject({ ok: false });
  });

  it("says by how much, so a failure is actionable", () => {
    const verdict = plateMatchesGeometry({
      plate: { width: 1672, height: 960 },
      frame: { width: 836, height: 520 },
    });
    expect(verdict.plateRatio).toBeCloseTo(1.7417, 4);
    expect(verdict.frameRatio).toBeCloseTo(1.6077, 4);
    expect(verdict.drift).toBeGreaterThan(0.08);
  });
});

describe("a dash that measures its own path", () => {
  it("refuses it in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "route", dasharray: "1", dashoffset: "0.4", pathLength: "1", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["route"]);
  });

  it("leaves a decorative dash alone, including one divided by the camera's scale", () => {
    expect(
      revealDashInScreenSpace([
        { id: "graticule", dasharray: "`${7 / scale} ${6 / scale}`", dashoffset: "0", vectorEffect: null },
      ]),
    ).toEqual([]);
  });
});

describe("reading a map component's dashed marks", () => {
  it("reads the attribute form", () => {
    const marks = marksFromSource(
      `<path strokeDasharray={\`\${7 / scale} \${6 / scale}\`} vectorEffect="non-scaling-stroke" />`,
      "Beat.tsx",
    );
    expect(marks[0].dasharray).toBe("`${7 / scale} ${6 / scale}`");
    expect(marks[0].dashoffset).toBe("0");
  });

  // A map beat writes its reveals as a STYLE OBJECT — `style={{ strokeDasharray: 1, strokeDashoffset: x }}`
  // — as often as it writes them as attributes. A reader that only knew attributes would return a
  // mark with no offset and pass it, which is the blind spot this case exists to close.
  it("reads the style-object form, which is how a route reveal is actually written here", () => {
    const marks = marksFromSource(
      `<path style={{ strokeDasharray: 1, strokeDashoffset: 1 - reached }} vectorEffect="non-scaling-stroke" />`,
      "Beat.tsx",
    );
    expect(marks).toHaveLength(1);
    expect(marks[0].dasharray).toBe("1");
    expect(marks[0].dashoffset).toBe("1 - reached");
    expect(revealDashInScreenSpace(marks)).toEqual(["Beat.tsx:1 path"]);
  });
});

/** Every beat on disk that carries a baked plate. */
function platedBeats(): { name: string; dir: string }[] {
  const found = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROOF, entry.name);
    if (existsSync(join(dir, "plate", "plate.png"))) found.push({ name: entry.name, dir });
  }
  return found;
}

describe("every baked plate on disk", () => {
  it("describes the same frame its own marks were projected into", () => {
    const beats = platedBeats();
    expect(beats.length).toBeGreaterThanOrEqual(15);
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir } of beats) {
      const geometryPath = join(dir, "plate", "geometry.json");
      // `mapmore-scrolly-route-access` records its camera in `camera.json` instead, having been
      // recovered from a delivered file rather than baked from a brief. Named rather than silently
      // skipped: a beat with no geometry is a beat this guard cannot speak about.
      if (!existsSync(geometryPath)) continue;
      const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
      if (!geometry.frame) continue;
      checked++;
      const png = decodePng(readFileSync(join(dir, "plate", "plate.png")));
      const verdict = plateMatchesGeometry({
        plate: { width: png.width, height: png.height },
        frame: geometry.frame,
      });
      if (!verdict.ok)
        offenders.push(
          `${name}: plate ${png.width}x${png.height} (${verdict.plateRatio.toFixed(4)}) against frame ` +
            `${geometry.frame.width}x${geometry.frame.height} (${verdict.frameRatio.toFixed(4)}) — ` +
            `${(verdict.drift * 100).toFixed(3)}% apart`,
        );
    }
    expect(checked).toBeGreaterThanOrEqual(15);
    expect(offenders).toEqual([]);
  });

  it("is on the same side of the theme as the ground its beat declares", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir } of platedBeats()) {
      const palette = join(dir, "PALETTE.md");
      if (!existsSync(palette)) continue;
      const ground = surfaceLuminance(groundFromPalette(readFileSync(palette, "utf8")));
      if (ground == null) continue;
      checked++;
      const plate = plateLuminance(decodePng(readFileSync(join(dir, "plate", "plate.png"))));
      if (!plateFollowsGround({ ground, plate }))
        offenders.push(
          `${name}: ground luminance ${ground.toFixed(3)}, plate ${plate.toFixed(3)} — opposite sides`,
        );
    }
    expect(checked).toBeGreaterThanOrEqual(15);
    expect(offenders).toEqual([]);
  });
});
