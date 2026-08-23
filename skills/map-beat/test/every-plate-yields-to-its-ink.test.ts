/**
 * EVERY BAKED PLATE IN THIS TREE, AGAINST THE INK ITS OWN BEAT DRAWS WITH.
 *
 * THE DEFECT THIS RATCHET EXISTS FOR, and it is the owner's instruction given twice: *"the ocean
 * colours have to adapt to the palette."* It was built once, for the choropleth — `waterFor`,
 * `noDataFor`, `offRampLuminance`, `assertSurfacesRead` in `map-web/assets/geo-choropleth.ts` — and
 * the BAKE never got it. Every bake in this tree painted `#AAC9E0` unconditionally, or, in the one
 * copy of three that never carried rule 7's override at all, left MapTiler's own near-neutral water
 * where it was. On a light ground nobody could see the consequence, and five of this format's six
 * worked beats are on a light ground.
 *
 * Measured 2026-08-23 on `stories/r8-map-web-japan-bear-casualties`, a symbol map on a newsroom
 * ground of `#16191B`: the delivered plate came back **66.9% water at `#aac9e0`** (relative luminance
 * 0.5570) and 32.8% land at `#292929` (0.0222). The sea carried **10.22:1** against the ground while
 * the accent carrying the whole argument carried **8.02:1**, and an accent circle drawn over that sea
 * measured **1.27:1** against a 3:1 floor. The largest and brightest thing on the page carried no
 * data at all, and after the frame took the whole box it was three quarters of it.
 *
 * WHY THE POPULATION IS EVERY PLATE AND NOT THIS FORMAT'S OWN. Three skills bake, and all three
 * write the same artefact: a `plate.png` beside a `geometry.json`, under a beat whose `PALETTE.md`
 * says what it is drawn in. The existing walk beside this one (`verify-map.test.ts`'s `platedBeats`)
 * reads `proof/` and nothing else, which is why the corpus that matters — the delivered STORIES —
 * was invisible to it, and why this defect shipped. So this one walks the whole tree and finds its
 * plates rather than being told where they are.
 *
 * WHY IT ASKS ONLY OF THE PLATES `plateFollowsGround` ACCEPTS, and this is a scoping rule rather
 * than a list. The two decisions cover the same population between them: one refuses a plate on the
 * wrong SIDE of the ground, the other refuses the fills of a plate that is on the right side. A
 * plate its neighbour already refuses is already refused, and reporting it twice would teach a reader
 * that this file's red means something other than what it means. Both stress beats in that state on
 * the day this was written (`stress-l-mixed-unit-clinics` at plate mean 0.7093 and
 * `stress-m-forest-loss` at 0.6600, both under a ground of 0.0094) are counted and named below, so
 * they cannot go quiet.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { decodePng } from "../scripts/compare-png.mjs";
import {
  groundFromPalette,
  inkFromPalette,
  plateFollowsGround,
  plateLuminance,
  plateSurfaces,
  plateSurfacesYieldToInk,
  surfaceLuminance,
  surfacesUnderMarks,
} from "../scripts/verify-map.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** Every `plate.png` with a `geometry.json` beside it, wherever it lives. */
function bakedPlates(): { name: string; dir: string }[] {
  const found: { name: string; dir: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (
        existsSync(join(path, "plate.png")) &&
        existsSync(join(path, "geometry.json"))
      )
        found.push({ name: relative(TWIN, path), dir: path });
      walk(path);
    }
  };
  for (const top of ["proof", "skills", "stories"]) {
    const at = join(TWIN, top);
    if (existsSync(at) && statSync(at).isDirectory()) walk(at);
  }
  return found.sort((one, two) => one.name.localeCompare(two.name));
}

/** The nearest `PALETTE.md` at or above a plate directory, as text, or `""`. */
function paletteAbove(dir: string): string {
  let current = resolve(dir);
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
    const parent = dirname(current);
    if (parent === current || parent === TWIN) return "";
    current = parent;
  }
}

type Reading = {
  name: string;
  ground: number;
  ink: { name: string; luminance: number }[];
  surfaces: ReturnType<typeof plateSurfaces>;
  side: boolean;
  offences: string[];
  water: string | null;
};

function readEveryPlate(): { readings: Reading[]; withoutAPalette: string[] } {
  const readings: Reading[] = [];
  const withoutAPalette: string[] = [];
  for (const { name, dir } of bakedPlates()) {
    const palette = paletteAbove(dir);
    const ground = surfaceLuminance(groundFromPalette(palette));
    const ink = inkFromPalette(palette)
      .map((hex: string) => ({ name: hex, luminance: surfaceLuminance(hex) }))
      .filter((one: { luminance: number | null }) => one.luminance != null) as {
      name: string;
      luminance: number;
    }[];
    if (ground == null || ink.length === 0) {
      withoutAPalette.push(name);
      continue;
    }
    const image = decodePng(readFileSync(join(dir, "plate.png")));
    const geometry = JSON.parse(
      readFileSync(join(dir, "geometry.json"), "utf8"),
    );
    const surfaces = surfacesUnderMarks({
      image,
      geometry,
      surfaces: plateSurfaces(image),
      ink,
    });
    readings.push({
      name,
      ground,
      ink,
      surfaces,
      side: plateFollowsGround({ ground, plate: plateLuminance(image) }),
      offences: plateSurfacesYieldToInk({ ground, ink, surfaces }),
      water: typeof geometry?.water?.fill === "string" ? geometry.water.fill.toLowerCase() : null,
    });
  }
  return { readings, withoutAPalette };
}

describe("every baked plate in this tree, against the ink its own beat draws with", () => {
  const { readings, withoutAPalette } = readEveryPlate();

  // A floor rather than an equality: a beat added tomorrow must be walked, and a walk that went
  // quiet must be red. Measured on the day this was written: 27 plates carry a palette, 0 do not.
  it("finds the plates rather than being told where they are", () => {
    expect(readings.length + withoutAPalette.length).toBeGreaterThanOrEqual(25);
    expect(readings.length).toBeGreaterThanOrEqual(25);
  });

  // The two decisions between them cover the whole population, and the split is what each can see.
  it("hands the plates on the wrong side of their ground to the decision that refuses those", () => {
    const wrongSide = readings
      .filter((one) => !one.side)
      .map((one) => one.name);
    expect(wrongSide.sort()).toEqual([
      "stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/plate",
      "stories/stress-m-forest-loss/beats/forest-loss/plate-still",
      "stories/stress-m-forest-loss/beats/forest-loss/plate-video",
    ]);
  });

  // THE SURFACE THIS TOOLCHAIN PAINTS IS THE SEA, and it is the only one a bake can move. The land
  // under it is the provider's — MapTiler's `Background` layer, `hsl(0,0%,16%)` on `dataviz-dark`
  // and `hsl(0,0%,97%)` on `dataviz-light` — so the two halves are split by the plate's own record
  // of the tint it painted, never by a list of colour names.
  //
  // A PLATE WITH NO RECORD OWNS EVERYTHING, and that direction matters: it is the state every plate
  // in this tree was in before the bakes derived their sea, so a plate baked by a script that never
  // wrote down what it painted cannot disclaim any of its own fills. Checked by mutation — the
  // committed Japan plate put back where it was lands in the assertion above, naming both readings.
  const bakePainted = (reading: Reading, offence: string) =>
    reading.water === null || offence.startsWith(`${reading.water} covers`);

  it("has no fill this toolchain painted that out-shouts the ink of the beat it belongs to", () => {
    const offenders = readings
      .filter((one) => one.side)
      .flatMap((one) => one.offences.filter((each) => bakePainted(one, each)).map((each) => `${one.name}: ${each}`));
    expect(offenders).toEqual([]);
  });

  /**
   * AND THE LIMIT NO DERIVATION REMOVES, pinned with the numbers rather than left to be rediscovered.
   *
   * Two worked locator beats record `#C68900` as a house accent and draw marks with it on a light
   * basemap. Measured: `#C68900` has relative luminance 0.2988, and its own PALETTE.md records it at
   * 3.01:1 against a WHITE PAGE GROUND — which is the number `proposePalette` checks and passes. But
   * a locator's marks are not drawn on the page, they are drawn on the LAND, and MapTiler paints that
   * at `#f7f7f7` (0.9301) and `#eeeeee` (0.8550). Against those the same accent measures 2.81:1 and
   * 2.59:1, under the 3:1 floor.
   *
   * NO SEA FIXES THIS AND NEITHER WOULD A DERIVED LAND. For a mark at 0.2988 to clear 3:1 against the
   * surface under it, that surface has to sit at relative luminance 1.0000 or above — white itself,
   * which is the page ground, which would leave the land indistinguishable from the page. The band
   * has no room in it. The narrowest real answers are outside this decision: a darker accent for
   * marks on a light basemap, or a stroke around the mark measured against what it is drawn on. Both
   * are palette rulings, and neither is a change this file may make on a beat's behalf.
   *
   * THE LIST MAY ONLY EVER GET SHORTER. It is asserted as an equality, so a beat that stops carrying
   * the defect is red until it is removed, and a beat that starts carrying it is red on the day it
   * appears.
   */
  it("names the marks a light basemap cannot hold, with what they measure", () => {
    const providerPainted = readings
      .filter((one) => one.side)
      .flatMap((one) =>
        one.offences
          .filter((each) => !bakePainted(one, each))
          .map((each) => `${one.name} · ${each.slice(0, each.indexOf(" covers"))} · ${/\(#[0-9A-Fa-f]{6}\)/.exec(each)?.[0]} · ${/measures ([\d.]+):1/.exec(each)?.[1]}:1`),
      );
    expect(providerPainted.sort()).toEqual([
      "proof/map-geneva-locator/plate · #eeeeee · (#009E73) · 2.95:1",
      "proof/map-geneva-locator/plate · #eeeeee · (#C68900) · 2.59:1",
      "proof/map-geneva-locator/plate · #f7f7f7 · (#C68900) · 2.81:1",
      "proof/mapgen-locator-web/plate · #eeeeee · (#009E73) · 2.95:1",
      "proof/mapgen-locator-web/plate · #eeeeee · (#C68900) · 2.59:1",
      "proof/mapgen-locator-web/plate · #f7f7f7 · (#C68900) · 2.81:1",
    ]);
  });

  // THE READING ITS NEIGHBOUR CANNOT MAKE, pinned so it cannot quietly stop being true. A symbol
  // plate is mostly basemap, so the mean of a bright sea and a dark land is a number no bake
  // controls: on the Japan plate as it shipped it was 0.3809, inside the 0.25-0.6 band
  // `plateFollowsGround` deliberately says nothing about, and that guard returned true.
  it("is asked of plates their side reading passes, which is what made this defect invisible", () => {
    const japan = readings.find((one) =>
      one.name.includes("r8-map-web-japan-bear-casualties"),
    );
    expect(japan).toBeDefined();
    expect(japan!.side).toBe(true);
    expect(japan!.surfaces.length).toBeGreaterThanOrEqual(2);
  });
});
