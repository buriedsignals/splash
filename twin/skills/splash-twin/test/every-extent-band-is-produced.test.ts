/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * B4.1: "la production doit fonctionner pour N'IMPORTE QUELLE zone de cadrage — la planète entière,
 * plusieurs continents ou pays, un continent, un pays, une région, une ville." The tree's answer had
 * never been a number. Measured 2026-08-11 over every committed `plate/geometry.json`, by the ground
 * each frame actually covers:
 *
 *     planet      >= 10 019 km    4 beats     39 600 - 39 693 km
 *     hemisphere   2 505-10 019   6 beats      4 125 -  8 839 km
 *     continent      626- 2 505   3 beats      1 821 -  1 873 km
 *     country        156-   626   0 beats     ---------------------
 *     region          39-   156   0 beats     ---------------------
 *     city         under    39    3 beats         11 -     13 km
 *
 * A 138x hole in the middle of the range, with the two rungs a local newsroom asks for most inside
 * it. The W5 audit measured that hole twice, in two separate documents, and it was still empty — a
 * number in a document does not go red.
 *
 * SO THIS ONE ASKS THREE QUESTIONS OF WHAT IS COMMITTED, AND NOTHING ELSE.
 *
 *   1. EVERY COMMITTED CAMERA SITS WHERE THE CENSUS SAYS IT SITS. Band, ground width and Mercator
 *      area bias are RECOMPUTED here from each beat's own `frameCorners` — by different code from
 *      the one that wrote them, the `camera-holds-the-study-set.test.ts` method — and compared with
 *      a recorded row. A camera that drifts to another rung, or whose distortion grows, turns this
 *      red instead of changing a number in a table nobody re-reads.
 *
 *   2. EVERY RUNG OF THE LADDER HAS BEEN PRODUCED, by a beat or by the camera probe. The probe
 *      (`twin-map-beat/output-proof/extent-range/`) drives all six from one frozen catalogue and
 *      commits its plates and its numbers; the rungs it covers ALONE are recorded by name, so the
 *      gap is asserted rather than narrated, and closing it means editing this file.
 *
 *   3. THE WORLD-MAP-IN-PORTRAIT DERIVATION STILL PREDICTS WHAT THE BROWSER DID. Web Mercator's
 *      world is square, so a frame taller than `width * 360 / lonSpan` never gets the longitude it
 *      asked for whatever `fitBounds` is told. The probe drove that at 1080x1920 and recorded what
 *      MapLibre actually showed; this recomputes the prediction and requires the two to agree to a
 *      tenth of a degree. If someone "fixes" the model, the recorded browser measurement refuses it.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. WHETHER A RUNG IS RIGHT FOR A STORY. It proves the machinery has been run at every scale and
 *    that the cameras have not moved. Whether a planet frame serves a sentence about one country is
 *    a person's judgement, and the BRIEF is where they make it.
 * 2. A PROBE RUNG IS NOT A BEAT. `country` and `region` are covered by the probe and by nothing
 *    else; assertion 2 records exactly that and will keep recording it until two beats exist. It
 *    must not be read as "B4.1 is closed at every rung".
 * 3. THE STUDY-SET SIDE. Whether a camera CROPS what its beat is about is
 *    `camera-holds-the-study-set.test.ts`'s question, over the same files. Read them together.
 * 4. THE LIVE LAYER. These are baked cameras. What a reader can reach by panning is the web genre's
 *    leash, guarded elsewhere.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree under /tmp, never in this one — see the
 * block at the foot of this file for the pasted output.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");
const RANGE = join(
  TWIN,
  "skills",
  "twin-map-beat",
  "output-proof",
  "extent-range",
  "range.json",
);

/** WGS84's equatorial circumference — the ladder's one anchor. */
const C_KM = 40075.016686;

/** The six rungs, floors at powers of four of the circumference: each is two zoom levels wide. */
const BANDS: [string, number][] = [
  ["planet", C_KM / 4],
  ["hemisphere", C_KM / 16],
  ["continent", C_KM / 64],
  ["country", C_KM / 256],
  ["region", C_KM / 1024],
  ["city", 0],
];

type Corners = { west: number; east: number; north: number; south: number };

/** Recomputed here rather than imported, so this is a second opinion on the same committed file. */
function groundWidthKm(c: Corners): number {
  return (
    ((c.east - c.west) / 360) *
    C_KM *
    Math.cos((((c.north + c.south) / 2) * Math.PI) / 180)
  );
}

function bandOf(km: number): string {
  return BANDS.find(([, floor]) => km >= floor)![0];
}

/** Mercator's area scale is sec^2(lat); the worst ratio inside a frame is its furthest edge from the
 *  equator against its nearest — and a frame straddling the equator contains latitude 0 itself. */
function areaBias(c: Corners): number {
  const clamp = (lat: number) => Math.min(Math.abs(lat), 85);
  const far = Math.max(clamp(c.north), clamp(c.south));
  const near =
    c.north * c.south <= 0 ? 0 : Math.min(clamp(c.north), clamp(c.south));
  const sec2 = (lat: number) => 1 / Math.cos((lat * Math.PI) / 180) ** 2;
  return sec2(far) / sec2(near);
}

/**
 * Where every committed camera sits. Ground width to the kilometre and area bias to one decimal —
 * both read off the tree on 2026-08-11, both recomputed here from `frameCorners` rather than copied
 * from anything the bake wrote.
 */
const CAMERA_CENSUS: Record<
  string,
  { band: string; km: number; bias: number }
> = {
  "map-quake-density": { band: "planet", km: 39599, bias: 24.0 },
  "mapvid-hexgrid-quakes": { band: "planet", km: 39600, bias: 24.1 },
  "mapgen-hexgrid-web": { band: "planet", km: 39693, bias: 32.2 },
  "mapscrolly-quakes-three-ways": { band: "planet", km: 39693, bias: 32.2 },
  "mapgen-symbol-web": { band: "hemisphere", km: 8839, bias: 2.8 },
  "mapgen-dot-web": { band: "hemisphere", km: 4501, bias: 6.7 },
  "mapscrolly-one-map-europe-carbon": {
    band: "hemisphere",
    km: 4152,
    bias: 5.1,
  },
  "mapgen-choropleth-web": { band: "hemisphere", km: 4152, bias: 5.1 },
  "mapvid-dot-population": { band: "hemisphere", km: 4126, bias: 4.3 },
  "mapmore-dot-population": { band: "hemisphere", km: 4125, bias: 4.3 },
  "mapgen-flowmap-video": { band: "continent", km: 1873, bias: 1.3 },
  "mapmore-flow-danube": { band: "continent", km: 1821, bias: 1.3 },
  "mapmore-scrolly-danube": { band: "continent", km: 1821, bias: 1.3 },
  "mapvid-locator-geneva": { band: "city", km: 13, bias: 1.0 },
  "map-geneva-locator": { band: "city", km: 11, bias: 1.0 },
  "mapgen-locator-web": { band: "city", km: 11, bias: 1.0 },
};

/**
 * The rungs no BEAT reaches. These are covered by the camera probe and by nothing else, and the
 * distinction is the whole point of recording them: a probe proves the machinery runs at that
 * scale, a beat proves a story was told at it. Deleting a name from this list without producing a
 * beat at that rung turns assertion 2 red.
 */
const PROBE_ONLY_RUNGS = ["country", "region"];

type Beat = { name: string; corners: Corners };

const BEATS: Beat[] = existsSync(PROOF)
  ? readdirSync(PROOF, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        const path = join(PROOF, e.name, "plate", "geometry.json");
        if (!existsSync(path)) return [];
        const geometry = JSON.parse(readFileSync(path, "utf8"));
        return geometry.frameCorners
          ? [{ name: e.name, corners: geometry.frameCorners as Corners }]
          : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  : [];

const range = existsSync(RANGE)
  ? JSON.parse(readFileSync(RANGE, "utf8"))
  : null;

describe("the production works at any focus area — B4.1", () => {
  it("should find every committed camera, and hold a census row for each", () => {
    // Without this every assertion below goes vacuously green on a walk that broke.
    expect(BEATS.length).toBeGreaterThanOrEqual(14);
    expect([
      BEATS.map((b) => b.name).filter((n) => !(n in CAMERA_CENSUS)),
      Object.keys(CAMERA_CENSUS).filter(
        (n) => !BEATS.some((b) => b.name === n),
      ),
    ]).toEqual([[], []]);
  });

  for (const beat of BEATS) {
    it(`proof/${beat.name} should sit on the rung its census records`, () => {
      const km = groundWidthKm(beat.corners);
      const recorded = CAMERA_CENSUS[beat.name]!;
      expect([
        bandOf(km),
        Math.round(km),
        Math.round(areaBias(beat.corners) * 10) / 10,
      ]).toEqual([recorded.band, recorded.km, recorded.bias]);
    });
  }

  it("should have produced a real camera at every one of the six rungs", () => {
    expect(range).not.toBeNull();
    const byBeat = new Set(BEATS.map((b) => bandOf(groundWidthKm(b.corners))));
    // The probe's own rungs are re-derived from ITS recorded corners, not trusted from its label:
    // a probe that drifted off a rung and relabelled itself would otherwise fill the gap on paper.
    const byProbe = new Set(
      range.rungs.map((r: { corners: Corners }) =>
        bandOf(groundWidthKm(r.corners)),
      ),
    );
    const missing = BANDS.map(([band]) => band).filter(
      (band) => !byBeat.has(band) && !byProbe.has(band),
    );
    expect(missing).toEqual([]);
    // And the gap is asserted rather than narrated: exactly these rungs have a camera and no beat.
    expect(
      BANDS.map(([band]) => band).filter((band) => !byBeat.has(band)),
    ).toEqual(PROBE_ONLY_RUNGS);
  });

  it("should span the whole ladder in one measured range, not four clusters", () => {
    const kms = range.rungs.map((r: { corners: Corners }) =>
      groundWidthKm(r.corners),
    );
    // 40 053 km down to 20 km, produced by one fitBounds, one style and one capture gate.
    expect(Math.max(...kms) / Math.min(...kms)).toBeGreaterThan(1500);
    expect(range.rungs.length).toBe(6);
  });
});

describe("a world map in a portrait frame — the limit Web Mercator sets, not the fit", () => {
  it("should predict what the browser actually showed, to a tenth of a degree", () => {
    const planet = range.rungs.find(
      (r: { band: string }) => r.band === "planet",
    );
    // Recomputed from the recorded longitude span: a frame taller than `width * 360 / lonSpan`
    // is clamped, and shows `360 * width / height` instead.
    const predicted = (360 * 1080) / 1920;
    expect(Number(predicted.toFixed(1))).toBe(
      planet.portraitMeasured.forcedLonSpan,
    );
    // …and the letterboxed stage shows the whole geography, which is the point of the rule.
    expect(planet.portraitMeasured.letterboxedLonSpan).toBeCloseTo(
      planet.lonSpan,
      1,
    );
    expect(planet.portrait.stage).toBe("1080x1080");
    expect(planet.portrait.spareHeightPx).toBe(840);
  });

  it("should leave every narrower geography alone at the same export size", () => {
    // The limit bites only above 202.5° of longitude at 1080x1920. Five of the six rungs, and every
    // beat in the tree except the four planet ones, are untouched — which is why this rule costs
    // nothing anywhere except the rung it exists for.
    const letterboxed = range.rungs.filter(
      (r: { portrait: { letterboxed: boolean } }) => r.portrait.letterboxed,
    );
    expect(letterboxed.map((r: { band: string }) => r.band)).toEqual([
      "planet",
    ]);
  });
});

/**
 * THE MUTATIONS, run in a copy of the tree under /tmp on 2026-08-11, never here.
 * Baseline in the copy: 21 pass, 0 fail.
 *
 *   M1  a camera drifts off its rung — `proof/mapmore-flow-danube`'s committed `frameCorners.east`
 *       30.0 -> 45.0, which is what widening a beat's bounds by eye would produce and which both
 *       existing camera invariants pass:
 *
 *         - [ "continent", 1821, 1.3 ]
 *         + [ "hemisphere", 2974, 1.3 ]
 *         (fail) … proof/mapmore-flow-danube should sit on the rung its census records
 *          20 pass · 1 fail
 *
 *   M2  a rung loses its only camera — the `region` row deleted from the probe's `range.json`:
 *
 *         - []
 *         + [ "region" ]
 *         (fail) … should have produced a real camera at every one of the six rungs
 *         plus:  Expected: 6   Received: 5
 *         (fail) … should span the whole ladder in one measured range, not four clusters
 *          19 pass · 2 fail
 *
 *   M3  the world-in-portrait model is "fixed" so the planet beat keeps the whole frame height —
 *       `portrait.letterboxed` set false and `stage` set to 1080x1920 in `range.json`, the change
 *       somebody would make to stop the letterbox rule firing:
 *
 *         Expected: "1080x1080"   Received: "1080x1920"
 *         (fail) … should predict what the browser actually showed, to a tenth of a degree
 *         - [ "planet" ]
 *         + []
 *         (fail) … should leave every narrower geography alone at the same export size
 *          19 pass · 2 fail
 */
