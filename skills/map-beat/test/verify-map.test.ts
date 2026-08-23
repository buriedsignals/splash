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
 * A FOURTH QUESTION, added once the trait derivation named it: `renderStill` writes the format's own
 * STILL as an SVG with the baked plate inlined as a `data:` URI, beside the PNG it rasterises from —
 * a self-contained delivered file, and `duplicatedPayload` is the guard `chart-web`, `image-beat`,
 * `map-web` and `scrolly` already carry for exactly that shape. Measured 2026-08-19 across the 7
 * stills this format has rendered to disk: 0 inline any asset twice.
 *
 * A FIFTH, from this format's own VIDEO genre. Six proof beats declare a `timing.ts` with a `total`
 * frame count, the same shape `chart-video` earned `neverArrives` for — a ramp over an
 * already-clamped progress whose input range ends above 1 never reaches its own end. Measured
 * 2026-08-20 across the seed and those 6 components: 22 ramps, 0 with a bound the reveal cannot
 * reach.
 *
 * Nothing here is being repaired. All five are ratchets.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  credentialNamesRead,
  credentialReadsWithoutAlias,
  csvSplitByHand,
  duplicatedPayload,
  groundFromPalette,
  inkFromPalette,
  marksFromSource,
  neverArrives,
  plateFollowsGround,
  plateLuminance,
  plateMatchesGeometry,
  plateSurfaces,
  plateSurfacesYieldToInk,
  rampsFromSource,
  revealDashInScreenSpace,
  surfaceLuminance,
  unmatchedValues,
} from "../scripts/verify-map.mjs";
import { CO2_ALIAS, CO2_STUDY, valuesFromCsv } from "../assets/geo.ts";
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

describe("the surfaces a basemap paints, against the ink the beat draws with", () => {
  // The worst page in this corpus, measured 2026-08-23 off its own committed plate:
  // `stories/r8-map-web-japan-bear-casualties`, ground #16191B (0.0094), accent #D4A853 (0.4263),
  // plate 66.9% water #aac9e0 (0.5570) and 32.8% land #292929 (0.0222).
  const JAPAN = {
    ground: 0.0094,
    ink: [{ name: "#D4A853", luminance: 0.4263 }],
    surfaces: [
      { hex: "#aac9e0", luminance: 0.557, share: 0.669, underInk: ["#D4A853"] },
      { hex: "#292929", luminance: 0.0222, share: 0.328, underInk: ["#D4A853"] },
    ],
  };

  it("refuses a sea that carries more contrast against the ground than the ink does", () => {
    expect(plateSurfacesYieldToInk(JAPAN).join(" | ")).toMatch(/#aac9e0 covers 66\.9%.*10\.22:1 against the ground, past the 8\.02:1/);
  });

  it("refuses a surface a mark drawn on it cannot be seen against", () => {
    expect(plateSurfacesYieldToInk(JAPAN).join(" | ")).toMatch(/1\.27:1 against it, under the 3:1/);
  });

  // The same plate with the sea derived from this ground and this ink instead of a literal:
  // `#505e69`, the blue this palette leaves room for — 2.65:1 against the ground, so the coast still
  // reads, and 3.03:1 under the accent, so a mark drawn on it is still a mark.
  it("accepts the same plate once the sea is derived from the palette", () => {
    expect(
      plateSurfacesYieldToInk({
        ...JAPAN,
        surfaces: [
          { hex: "#505e69", luminance: 0.1073, share: 0.669, underInk: ["#D4A853"] },
          { hex: "#292929", luminance: 0.0222, share: 0.328, underInk: ["#D4A853"] },
        ],
      }),
    ).toEqual([]);
  });

  // A choropleth's fills REPLACE the plate, so no ink is drawn over the basemap and the second
  // reading has nothing to fire on. The honey beat's own land, at 1.21:1 against a ground whose ink
  // carries 8.01:1.
  it("says nothing about a surface no mark is drawn on", () => {
    expect(
      plateSurfacesYieldToInk({
        ground: 0.0094,
        ink: [{ name: "#D4A853", luminance: 0.4263 }],
        surfaces: [{ hex: "#292929", luminance: 0.0222, share: 0.687, underInk: [] }],
      }),
    ).toEqual([]);
  });

  it("passes over a fill too small to be a surface the reader reads the map against", () => {
    expect(
      plateSurfacesYieldToInk({
        ...JAPAN,
        surfaces: [{ hex: "#aac9e0", luminance: 0.557, share: 0.001, underInk: ["#D4A853"] }],
      }),
    ).toEqual([]);
  });

  it("does not run at all on a ground or an ink it could not read", () => {
    expect(plateSurfacesYieldToInk({ ...JAPAN, ground: null })).toEqual([]);
    expect(plateSurfacesYieldToInk({ ...JAPAN, ink: [] })).toEqual([]);
  });

  // `plateFollowsGround`'s own contract, one screen above: a value that was not read must not travel
  // as a value that was.
  it("throws on an arithmetic that failed rather than reading it as a pass", () => {
    expect(() => plateSurfacesYieldToInk({ ...JAPAN, ground: NaN })).toThrow(/not a measurement/);
    expect(() =>
      plateSurfacesYieldToInk({ ...JAPAN, ink: [{ name: "#D4A853", luminance: NaN }] }),
    ).toThrow(/not a measurement/);
  });

  // THE READING `plateFollowsGround` CANNOT MAKE, and the reason this decision exists beside it.
  it("is silent on the very plate its neighbour passes by construction", () => {
    expect(plateFollowsGround({ ground: 0.0094, plate: 0.3809 })).toBe(true);
    expect(plateSurfacesYieldToInk(JAPAN).length).toBeGreaterThan(0);
  });
});

describe("the ink a beat records, and the fills its plate carries", () => {
  it("takes the accent and every further house accent from PALETTE.md", () => {
    expect(inkFromPalette('---\nground: "#16191B"\naccent: "#D4A853"\n---\n')).toEqual(["#D4A853"]);
    expect(
      inkFromPalette('---\nground: "#16191B"\naccent: "#D4A853"\naccents: "#5B8A8A"\n---\n'),
    ).toEqual(["#D4A853", "#5B8A8A"]);
  });

  it("returns nothing rather than a guess when there is none", () => {
    expect(inkFromPalette('---\nground: "#16191B"\n---\n')).toEqual([]);
    expect(inkFromPalette("")).toEqual([]);
  });

  it("reads the flat fills off a plate and leaves the anti-aliased edges out", () => {
    const image = { width: 10, height: 10, data: new Uint8Array(400) };
    for (let at = 0; at < 400; at += 4) {
      const bright = at < 240;
      image.data[at] = bright ? 0xaa : 0x29;
      image.data[at + 1] = bright ? 0xc9 : 0x29;
      image.data[at + 2] = bright ? 0xe0 : 0x29;
      image.data[at + 3] = 255;
    }
    image.data[396] = 0x9a;
    image.data[397] = 0xb5;
    image.data[398] = 0xc9;
    const surfaces = plateSurfaces(image);
    expect(surfaces.map((one) => one.hex)).toEqual(["#aac9e0", "#292929"]);
    expect(surfaces[0]!.share).toBeCloseTo(0.6, 5);
    expect(surfaces[0]!.luminance).toBeCloseTo(0.557, 3);
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

describe("what a rendered still carries", () => {
  it("names an asset inlined more than once", () => {
    const blob = "A".repeat(4096);
    expect(
      duplicatedPayload(
        `<image href="data:image/png;base64,${blob}"/><image href="data:image/png;base64,${blob}"/>`,
      ),
    ).toEqual([{ copies: 2, bytes: 4096, wastedBytes: 4096 }]);
  });

  it("leaves a single plate and every icon under the payload floor alone", () => {
    const blob = "A".repeat(4096);
    expect(duplicatedPayload(`<image href="data:image/png;base64,${blob}"/>`)).toEqual([]);
    expect(
      duplicatedPayload(
        `<image href="data:image/svg+xml;base64,YWJj"/><image href="data:image/svg+xml;base64,YWJj"/>`,
      ),
    ).toEqual([]);
  });
});

describe("a ramp that cannot finish", () => {
  it("refuses one whose input range ends past the progress that drives it", () => {
    expect(
      neverArrives([
        { id: "QuakeSymbolVideo.tsx:12 opacity", ceiling: 1.4, limit: 1 },
        { id: "QuakeSymbolVideo.tsx:20 opacity", ceiling: 1, limit: 1 },
      ]),
    ).toEqual(["QuakeSymbolVideo.tsx:12 opacity"]);
  });

  it("leaves a sub-range that closes early alone — an early finish is a choice, not a defect", () => {
    expect(neverArrives([{ id: "a", ceiling: 0.45, limit: 1 }])).toEqual([]);
  });

  it("says nothing about a ramp whose bounds it could not read", () => {
    expect(neverArrives([{ id: "a", ceiling: null, limit: 1 }])).toEqual([]);
  });

  it("measures a frame-driven ramp against the composition's own last frame", () => {
    expect(
      neverArrives([
        { id: "late", ceiling: 260, limit: 239 },
        { id: "fine", ceiling: 200, limit: 239 },
      ]),
    ).toEqual(["late"]);
  });
});

describe("reading a map video beat's ramps out of its own component", () => {
  it("reads a normalised progress against 1, and names the ramp by file and line", () => {
    const ramps = rampsFromSource(
      `const o = interpolate(conclusion, [0.45, 1], [0, 1], { extrapolateRight: "clamp" });`,
      "Beat.tsx",
      { total: 240 },
    );
    expect(ramps).toEqual([
      { id: "Beat.tsx:1 interpolate(conclusion)", driver: "conclusion", ceiling: 1, limit: 1 },
    ]);
  });

  it("reads a frame-driven ramp against the last frame instead", () => {
    const ramps = rampsFromSource(`interpolate(frame, [0, 260], [0, 1])`, "Beat.tsx", {
      total: 240,
    });
    expect(ramps[0]).toMatchObject({ driver: "frame", ceiling: 260, limit: 239 });
  });

  it("keeps a ramp whose bounds are computed, with no ceiling to decide on", () => {
    const ramps = rampsFromSource(`interpolate(reveal, [w.start, w.end], [0, 1])`, "Beat.tsx", {
      total: 240,
    });
    expect(ramps[0]).toMatchObject({ driver: "reveal", ceiling: null });
  });

  it("ignores an interpolate that is not a ramp over time at all", () => {
    expect(rampsFromSource(`const x = 3;`, "Beat.tsx", { total: 240 })).toEqual([]);
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

/** Every `render/static.svg` this format's own render ladder has produced — rung 1 of it, and the
 *  only place an inlined base64 plate becomes a self-contained delivered file. `renderStill`
 *  (`render-still.mjs`) writes it beside the PNG it rasterises from; a video-only beat that never
 *  calls `--still` carries none, which is why this counts the files that exist on disk rather than
 *  every beat's own directory. */
function mapStills(): { name: string; file: string }[] {
  const found: { name: string; file: string }[] = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(PROOF, entry.name, "render", "static.svg");
    if (existsSync(file)) found.push({ name: entry.name, file });
  }
  return found;
}

describe("every map beat's own still on disk", () => {
  it("inlines its baked plate once, never twice", () => {
    const stills = mapStills();
    // Measured 2026-08-19: 7 of this format's beats on disk render a still — every beat that
    // asks `render-map.mjs` for `--still`, whether or not it also ships a video. A floor below
    // that count catches a reader that went quiet without pinning the corpus's exact size.
    expect(stills.length).toBeGreaterThanOrEqual(6);
    const offenders: string[] = [];
    for (const { name, file } of stills) {
      const svg = readFileSync(file, "utf8");
      for (const found of duplicatedPayload(svg))
        offenders.push(
          `${name}: ${found.copies} copies of one ${(found.bytes / (1024 * 1024)).toFixed(2)} MB ` +
            `asset, ${(found.wastedBytes / (1024 * 1024)).toFixed(2)} MB wasted`,
        );
    }
    expect(offenders).toEqual([]);
  });
});

/** Every `*Video.tsx` this format's own video beats carry, the seed included. Scoped by the
 *  presence of `timing.ts` beside the component rather than by `BRIEF.md` text: that file is
 *  unique to this format's video beats in this corpus — a chart video keeps its contract in
 *  `timing-contract.ts` instead — so it names this format's own population without reaching into
 *  a repository-level script. */
function mapVideoComponents(): string[] {
  const found = [join(SKILL, "assets", "Co2MapVideo.tsx")];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!existsSync(join(PROOF, entry.name, "timing.ts"))) continue;
    for (const file of readdirSync(join(PROOF, entry.name)))
      if (/Video\.tsx$/.test(file)) found.push(join(PROOF, entry.name, file));
  }
  return found;
}

/** The composition length a beat's own timing records — the only place the last frame is written
 *  down. Read from `timing.ts` beside the component, this format's own filename (`totalFrames` in
 *  `chart-video/test/verify-video.test.ts` also tries `timing-contract.ts` first, for its own
 *  corpus; this format has no video component that keeps its contract there, so trying `timing.ts`
 *  alone is enough — and a component whose total cannot be found is REPORTED rather than silently
 *  skipped, the same discipline that guard's own header names). */
function totalFrames(component: string): number | null {
  let source: string;
  try {
    source = readFileSync(join(component, "..", "timing.ts"), "utf8");
  } catch {
    return null;
  }
  const found = /\btotal:\s*(\d+)/.exec(source);
  return found ? Number(found[1]) : null;
}

describe("every map video on disk ends with nothing still on its way", () => {
  it("should find no ramp whose input range outruns the progress driving it", () => {
    const offenders: string[] = [];
    const unreadable: string[] = [];
    let ramps = 0;
    let undecidable = 0;
    for (const file of mapVideoComponents()) {
      const total = totalFrames(file);
      const where = file.slice(TWIN.length + 1);
      if (total === null) {
        unreadable.push(where);
        continue;
      }
      const found = rampsFromSource(readFileSync(file, "utf8"), where, { total });
      ramps += found.length;
      undecidable += found.filter((ramp) => ramp.ceiling === null).length;
      offenders.push(...neverArrives(found));
    }
    // Measured 2026-08-20: 7 video components (the seed and the 6 proof beats that declare a
    // `timing.ts`), 22 ramps, 0 with computed bounds. The floor sits under the measured count and
    // exists to catch a reader that broke, not to pin the corpus's exact size.
    expect(ramps).toBeGreaterThanOrEqual(18);
    expect(undecidable).toBeLessThan(ramps / 4);
    expect(unreadable).toEqual([]);
    expect(offenders).toEqual([]);
  });
});

// FINDING 4 (stress test, 2026-08-20): this skill's own `render-map.mjs` names a `.csv` path but
// delegates the actual read to `valuesFromCsv` — which lives in `assets/geo.ts`, not this file, and
// itself cut a row on a bare comma until this fix. Both are checked: the entrypoint, because that is
// where the trait's own witness reads the `.csv` reference, and `assets/geo.ts`, because that is
// where the parsing — and the pattern the stress test found in
// `proof/more-line-swiss-life-expectancy/render.mjs`, the worked example every craft skill points
// authors at — actually happens. Read from disk rather than pinned as a fixture string, so a naive
// `row.split(",")` reintroduced into either real file turns this red instead of passing quietly.
describe("the csv this skill reads is not cut on a bare comma", () => {
  it("should find no hand-split field in render-map.mjs", () => {
    const source = readFileSync(join(SKILL, "scripts", "render-map.mjs"), "utf8");
    expect(csvSplitByHand(source)).toEqual([]);
  });

  it("should find no hand-split field in assets/geo.ts, where valuesFromCsv actually parses", () => {
    const source = readFileSync(join(SKILL, "assets", "geo.ts"), "utf8");
    expect(csvSplitByHand(source)).toEqual([]);
  });

  it("should find no hand-split field in scripts/extent-range.mjs, this skill's own dev instrument", () => {
    const source = readFileSync(join(SKILL, "scripts", "extent-range.mjs"), "utf8");
    expect(csvSplitByHand(source)).toEqual([]);
  });
});

// FINDING 6 (stress test, 2026-08-20): `joinValues` already refused a shape with no value; nothing
// refused a VALUE with no shape — the stress csv carried a reading for "Atlantis", a country that
// does not exist, and the join said nothing. `unmatchedValues` is the mirror decision, exercised
// here against this skill's OWN real study set and a real committed csv, not a fixture invented for
// the test, so a regression in the real join is what turns this red.
describe("a value the study set does not claim is named, not silent", () => {
  it("should refuse a real csv's own value once a stray key is added, naming it", () => {
    const csv = readFileSync(
      join(SKILL, "..", "..", "proof", "mapgen-choropleth-web", "co2-per-capita-2023.csv"),
      "utf8",
    );
    const values = valuesFromCsv(csv);
    values.set("ATL", 99);
    const stray = unmatchedValues(CO2_STUDY, values, { alias: CO2_ALIAS });
    expect(stray).toEqual(["ATL"]);
  });

  it("should stay quiet on the real csv as committed — every value the study set already claims", () => {
    const csv = readFileSync(
      join(SKILL, "..", "..", "proof", "mapgen-choropleth-web", "co2-per-capita-2023.csv"),
      "utf8",
    );
    const values = valuesFromCsv(csv);
    expect(unmatchedValues(CO2_STUDY, values, { alias: CO2_ALIAS })).toEqual([]);
  });
});

/**
 * FINDING 2 (round-two stress, added to this wave by the coordinator): a credential read by its
 * canonical name with no declared alias list is the exact gap that let a real, present token under
 * the root's own name (DATAWRAPPER_API_TOKEN) read back as "not set" — this is the guard,
 * `doctrine/references/guard-catalogue.json`'s `credential-alias-reconciled`, carried byte for byte
 * by every producing skill that reads a provider credential (`splash/test/guard-copies-parity.test.ts`).
 */
describe("credentialReadsWithoutAlias", () => {
  it("says nothing about a canonical name that declares its own alias list", () => {
    const source = 'const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY"];\nconst k = env.MAPTILER_KEY;';
    expect(credentialNamesRead(source)).toEqual(["MAPTILER_KEY"]);
    expect(credentialReadsWithoutAlias(source)).toEqual([]);
  });

  it("refuses a canonical name read with no alias list anywhere in the source", () => {
    const source = 'const token = process.env.DATAWRAPPER_TOKEN;\nif (!token) throw new Error("no token");';
    expect(credentialReadsWithoutAlias(source)).toEqual(["DATAWRAPPER_TOKEN"]);
  });

  it("does not mistake an ordinary data-selection constant for a credential", () => {
    // `SUBJECT_KEY` (`map-web/assets/MapWebSeed.tsx`) names which point is the subject, not a
    // credential — a bare `_KEY` substring is not enough to be read as one.
    const source = 'const SUBJECT_KEY = "paris";\nconst isSubject = point.key === SUBJECT_KEY;';
    expect(credentialNamesRead(source)).toEqual([]);
  });

  it("this format's own bake-plate.mjs reads MAPTILER_KEY through its declared alias list", () => {
    const source = readFileSync(join(SKILL, "scripts/bake-plate.mjs"), "utf8");
    expect(credentialReadsWithoutAlias(source)).toEqual([]);
  });

  it("this skill's whole own source carries no credential read without a declared alias", () => {
    const dirs = [join(SKILL, "scripts"), join(SKILL, "assets")];
    let combined = "";
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
        if (/^(verify|detect)-.*\.mjs$/.test(name)) continue;
        combined += readFileSync(join(dir, name), "utf8") + "\n";
      }
    }
    expect(credentialReadsWithoutAlias(combined)).toEqual([]);
  });
});
