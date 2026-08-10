/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * `assertCameraReachesBounds` (`map-beat/scripts/bake-plate.mjs`, and its nineteen vendored
 * copies) validates the plate's measured `frameCorners` against `BEAT.bounds` — **a box somebody
 * typed**. At 19 of 19 call sites. A box that already excludes a study point passes by
 * construction, which is how `map-quake-density` ships a green bake that crops 104 earthquakes:
 * its `bounds` are padded NEGATIVE, −5.30° south and −8.61° north, so the camera reaches exactly
 * what it was told to reach and the events outside it are never mentioned to the invariant.
 *
 * The information already exists in the tree and nothing failed on it. Four bakes COUNT the
 * cropped points — `offFrame` at `map-geneva-locator/bake.mjs:246`, `map-quake-symbol/bake.mjs:256`,
 * `map-quake-density/bake.mjs:283-288`, `mapvid-hexgrid-quakes/bake.mjs:287-292` — and every one of
 * them puts the number in a `console.log` and moves on. A number printed to a terminal during a
 * bake nobody re-runs is not a guard.
 *
 * SO THIS ONE ASKS THE QUESTION AGAINST THE STUDY SET, from what is committed, without re-baking:
 * the beat's own frozen CSV, and the beat's own committed `plate/geometry.json`. Three assertions
 * per beat.
 *
 *   1. THE CROP IS RECOMPUTED INDEPENDENTLY AND MUST AGREE WITH THE BAKE'S OWN ARITHMETIC. Every
 *      row of the frozen CSV is tested against the committed `frameCorners`, in the same wrapped
 *      longitude the bake uses; the count that falls outside must equal
 *      `rows − geometry.points.length`. This is a second opinion on the bake, computed by different
 *      code from the same two committed files, and it reproduces all three hex counts exactly
 *      (14,175 − 14,071 = 104; − 14,073 = 102; − 14,057 = 118).
 *
 *   2. THE CROP MATCHES A RECORDED NUMBER. A camera that starts dropping points, or drops more of
 *      them, turns this red instead of changing a line of terminal output nobody reads.
 *
 *   3. A BEAT THAT CROPS ANYTHING MUST SAY SO, IN ITS OWN BRIEF, WITH THE NUMBER. This is the half
 *      that makes a crop legitimate rather than hidden. All four cropping beats already do it —
 *      "104 of the 14,175 catalogued events fall outside it, poleward" — and nothing checked that
 *      the sentence and the plate still agree. Now a crop that grows and a caption that does not
 *      is a failure of this assertion, by name.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. REGION BEATS. A choropleth's study set is polygons, not points: `mapgen-choropleth-web`,
 *    `mapgen-dot-web`, `mapmore-`/`mapvid-dot-population` and `mapscrolly-one-map-europe-carbon`
 *    carry a `.geojson` and no lon/lat column, and are outside this population. The W5 audit
 *    measured them by hand — 8 of 41 regions partly clipped on the choropleth, Malta cut in half
 *    by the dot map's south edge — and that is a vertex-containment question this does not ask.
 * 2. WHETHER A CROP IS EDITORIALLY RIGHT. It proves the number is stable and disclosed. Whether
 *    dropping 104 poleward events is the right frame for a story about earthquakes is a person's
 *    judgement, and the BRIEF is where they make it.
 * 3. THE INVARIANT ITSELF. `assertCameraReachesBounds` still compares a typed box, in all nineteen
 *    copies. Changing what it compares means changing nineteen vendored files and the beats whose
 *    bounds are deliberately negative-padded; this guard makes the consequence visible from
 *    outside instead, which is what could be done without touching another chantier's files.
 * 4. A BEAT WITH NO COMMITTED GEOMETRY. Assertion 1 needs `geometry.points`; the flow beats bake a
 *    route rather than a point set and are reconciled by assertion 2 and 3 only.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree under /tmp, never in this one — see the
 * block at the foot of this file for the pasted output.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");

/**
 * How many of each beat's own catalogued rows fall outside its own committed frame, and whether
 * the beat's BRIEF is required to say so. Recorded from a measurement, not from a bake's log.
 */
const CROP_CENSUS: Record<string, number> = {
  // Point beats that hold their whole study set.
  "map-geneva-locator": 0,
  "mapgen-locator-web": 0,
  "mapvid-locator-geneva": 0,
  "mapgen-symbol-web": 0,
  "mapgen-flowmap-video": 0,
  "mapmore-flow-danube": 0,
  "mapmore-scrolly-danube": 0,
  // The quake corpus, cropped poleward — each number is in that beat's own BRIEF, and assertion 3
  // is what keeps the two in step. The three different values are three different cameras over one
  // catalogue, which is why a single number would have been wrong.
  "map-quake-density": 104,
  "mapvid-hexgrid-quakes": 102,
  "mapgen-hexgrid-web": 118,
  "mapscrolly-quakes-three-ways": 118,
};

type PointBeat = {
  name: string;
  frameCorners: { west: number; east: number; north: number; south: number };
  bakedPoints: number | null;
  rows: { lon: number; lat: number }[];
};

function readPointBeats(): PointBeat[] {
  if (!existsSync(PROOF)) return [];
  const out: PointBeat[] = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROOF, entry.name);
    const geometryPath = join(dir, "plate", "geometry.json");
    if (!existsSync(geometryPath)) continue;
    const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
    if (!geometry.frameCorners) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
      const lines = readFileSync(join(dir, file), "utf8").trim().split(/\r?\n/);
      const head = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
      const lonAt = head.findIndex((h) => h === "lon" || h === "longitude");
      const latAt = head.findIndex((h) => h === "lat" || h === "latitude");
      if (lonAt < 0 || latAt < 0) continue;
      const rows: { lon: number; lat: number }[] = [];
      for (const line of lines.slice(1)) {
        const cells = line.split(",");
        const lon = Number(cells[lonAt]);
        const lat = Number(cells[latAt]);
        if (Number.isFinite(lon) && Number.isFinite(lat))
          rows.push({ lon, lat });
      }
      out.push({
        name: entry.name,
        frameCorners: geometry.frameCorners,
        bakedPoints: Array.isArray(geometry.points)
          ? geometry.points.length
          : null,
        rows,
      });
      break;
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The bake's own longitude convention: a point west of the frame's west edge is read one turn on,
 *  which is what lets a Pacific-centred frame run from −20° to 340°. */
function outsideFrame(beat: PointBeat): number {
  const { west, east, north, south } = beat.frameCorners;
  let outside = 0;
  for (const { lon, lat } of beat.rows) {
    const wrapped = lon < west ? lon + 360 : lon;
    if (wrapped < west || wrapped > east || lat < south || lat > north)
      outside += 1;
  }
  return outside;
}

const BEATS = readPointBeats();

describe("a baked camera holds the beat's own study set, or says what it drops", () => {
  it("should find the point beats, and hold a census row for each", () => {
    // Without this every assertion below goes vacuously green on a walk that broke. Measured
    // 2026-08-11: twelve beats carry both a `plate/geometry.json` and a lon/lat CSV.
    expect(BEATS.length).toBeGreaterThanOrEqual(10);
    const found = BEATS.map((b) => b.name).sort();
    expect([
      found.filter((n) => !(n in CROP_CENSUS)),
      Object.keys(CROP_CENSUS)
        .sort()
        .filter((n) => !found.includes(n)),
    ]).toEqual([[], []]);
    // And the population is not all zeroes: a census where nothing crops would make assertion 3
    // unreachable, which is the shape this file exists to refuse.
    expect(
      Object.values(CROP_CENSUS).filter((n) => n > 0).length,
    ).toBeGreaterThanOrEqual(3);
  });

  for (const beat of BEATS) {
    it(`proof/${beat.name} should crop exactly what its census records, and its bake should agree`, () => {
      const outside = outsideFrame(beat);
      const problems: string[] = [];
      const recorded = CROP_CENSUS[beat.name]!;
      if (outside !== recorded)
        problems.push(
          `${outside} of its ${beat.rows.length} catalogued rows fall outside the committed ` +
            `frameCorners (${beat.frameCorners.west.toFixed(2)}°..${beat.frameCorners.east.toFixed(2)}° / ` +
            `${beat.frameCorners.south.toFixed(2)}°..${beat.frameCorners.north.toFixed(2)}°); the census records ${recorded}`,
        );
      if (beat.bakedPoints !== null) {
        const dropped = beat.rows.length - beat.bakedPoints;
        if (dropped !== outside)
          problems.push(
            `the bake kept ${beat.bakedPoints} of ${beat.rows.length} points (dropping ${dropped}), ` +
              `but recomputing against its own frameCorners drops ${outside} — the plate and its ` +
              `geometry disagree about what is on frame`,
          );
      }
      expect([beat.name, problems]).toEqual([beat.name, []]);
    });

    it(`proof/${beat.name} should tell a reader, in its own BRIEF, about anything it crops`, () => {
      const recorded = CROP_CENSUS[beat.name]!;
      const briefPath = join(PROOF, beat.name, "BRIEF.md");
      const brief = existsSync(briefPath)
        ? readFileSync(briefPath, "utf8")
        : "";
      // A crop of zero has nothing to disclose. A crop of N must appear as N in the beat's own
      // published prose — grouped or plain, since these briefs write both.
      const spellings = [String(recorded), recorded.toLocaleString("en-US")];
      const disclosed =
        recorded === 0 || spellings.some((s) => brief.includes(s));
      expect(
        `proof/${beat.name} discloses its crop of ${recorded}: ${disclosed}`,
      ).toBe(`proof/${beat.name} discloses its crop of ${recorded}: true`);
    });
  }
});

/**
 * THE MUTATIONS, run in a copy of the tree under /tmp on 2026-08-11, never here.
 * Baseline in the copy: 23 pass, 0 fail.
 *
 *   M1  a camera crops one more point — `map-quake-density`'s committed `frameCorners.north`
 *       78.223 -> 60.0, which is what a bake would produce from a `bounds` box someone padded a
 *       little more negatively, and which `assertCameraReachesBounds` would still pass:
 *
 *         - []
 *         + [
 *         +   "204 of its 14175 catalogued rows fall outside the committed frameCorners
 *         +    (-20.00°..340.00° / -60.54°..60.00°); the census records 104",
 *         +   "the bake kept 14071 of 14175 points (dropping 104), but recomputing against its own
 *         +    frameCorners drops 204 — the plate and its geometry disagree about what is on frame",
 *         + ]
 *         (fail) … proof/map-quake-density should crop exactly what its census records, and its
 *                bake should agree
 *          22 pass · 1 fail
 *
 *   M2  the crop stays and the beat stops saying so — the "104 of the 14,175" sentence struck from
 *       `map-quake-density/BRIEF.md`:
 *
 *         Expected: "proof/map-quake-density discloses its crop of 104: true"
 *         Received: "proof/map-quake-density discloses its crop of 104: false"
 *         (fail) … proof/map-quake-density should tell a reader, in its own BRIEF, about anything
 *                it crops
 *          22 pass · 1 fail
 */
