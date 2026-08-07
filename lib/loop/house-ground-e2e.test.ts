// THE OTHER HALF OF A CHARTER, ON THE PIXELS.
//
// A NEWSROOM-PROFILE.md declares two things about colour: a `palette` (the house hue its marks
// are painted in) and a `theme` (the house GROUND — the background every piece of furniture is
// derived from, by contrast, in lib/core/theme.ts). 3a1af005 threaded the charter into the loop
// at `assemblerFor` and proved the HUE on a render; the GROUND was never exercised, because the
// profile that proof used declared no `theme`.
//
// Driving it found the ground did not arrive at all — it BROKE the run. A `theme: "dark"` sets
// `mapStyle: "dataviz-dark"`, which is the one condition that arms map-native's dark-basemap
// guard, and that guard wrote its debug screenshot (`theme.png`) into the produce OUTDIR. The
// loop's render() collects the whole outDir as the delivery, so a `static` produce came back
// holding TWO image files and `assertFileMedia` refused it: "static format requires exactly one
// image file (.png/.svg/.jpg), found 2". Exactly the trap the sibling guard (snap-contrast.mjs)
// had already been pulled out of — snap-theme was left in it because no chain reached a dark
// basemap until the charter did.
//
// WHY THE PROOF IS PIXELS AND NOT THE CONFIG: a config assertion passes on a map that renders
// the wrong ground, and — as this run showed — even on a map that never renders at all. The
// expected furniture is not hard-coded either; it is COMPUTED from `resolveFrameColors`, the
// same function the engine derives from, so this measures "the declared ground reached the
// paint", not "someone typed the same hex twice".
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { fileArtifact } from "./manifest";
import { assemblerFor } from "./assemble";
import {
  decodePng,
  modalColor as modal,
  toHex as hex,
  parseRgba,
  over,
} from "./fixtures/render-pixels";
import { resolveFrameColors, resolveThemeBg } from "../core/theme";
import { contrastRatio, relativeLuminance } from "../core/contrast";
import { mapNativeConfigErrors } from "../../skills/map-native/src/validate-config";
import type { BrandProfile } from "../../skills/splash/src/brand-profile";
import type { ProductionBrief } from "../core/production-brief";
import type { Decor } from "../newsroom/decor";
import { RunManifestSchema, type RunManifest } from "./manifest";
import { chooseGround } from "./ground";

// OPT-IN, like its sibling lib/loop/map-e2e.test.ts: a MapLibre static produce is a real browser
// render over the network. The always-on half below is what stops this file rotting silently.
const RUN_IT = process.env.SPLASH_MAP_E2E === "1";
const proof = RUN_IT ? test : test.skip;

const CSV = "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19";

// THREE GROUNDS, and each one is here for a reason a mutation established.
//
//  · "dark" — the preset a newsroom actually writes, and the config that arms the dark-basemap
//    guard. It is the case that was BROKEN. It cannot, however, prove the ground was THREADED:
//    MapFrame reads `themeBg ?? (dark ? DARK_FRAME_BG : undefined)`, so for this one value the
//    charter's ground and the engine's own fallback land on the same furniture. Deleting the
//    threading leaves this render pixel-identical — measured, not assumed.
//  · "#0A2540" — an ARBITRARY DARK ground. Same dark basemap, but a navy pill the fallback does
//    not produce, so this is the dark side's discriminating case.
//  · "#F7D9E3" — an ARBITRARY LIGHT ground. The basemap does not change at all here, so the
//    furniture is the ONLY evidence: it shows the ground drives the frame even when it moves
//    nothing else. Deliberately not grey and not white — a "did it get darker" check would pass
//    on this one by accident.
//  · "#0A5C36" — a SATURATED house green, and the case this file exists to close since
//    2026-08-07: the produce guard REFUSED it, measuring its pill over WHITE — a backdrop its own
//    `mapStyle: dataviz-dark` rules out — at 3.26:1. On the basemap it actually pins the same
//    furniture reads at 5.22:1. A newsroom with a charter usually has a saturated colour, so this
//    is the ordinary case, not the exotic one.
//  · "#717171" — a mid-grey, which genuinely cannot carry text on ANY basemap. It is here to
//    prove the repair did not become a loosening: it must still be refused, and then must produce
//    once the journalist has SAID to keep it.
const HOUSE_DARK: BrandProfile = { palette: ["#d5121e"], theme: "dark" };
const HOUSE_NAVY: BrandProfile = { palette: ["#d5121e"], theme: "#0A2540" };
const HOUSE_PINK: BrandProfile = { palette: ["#d5121e"], theme: "#F7D9E3" };
const HOUSE_SATURATED: BrandProfile = { palette: ["#d5121e"], theme: "#0A5C36" };
const HOUSE_ILLEGIBLE: BrandProfile = { palette: ["#d5121e"], theme: "#717171" };

const REGION_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A map of Africa shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: CSV,
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
  geo: {
    column: "country",
    geography: {
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    },
    matched: 4,
    total: 4,
    unmatched: [],
  },
};

// ── The always-on half: the ground reaches a config the engine accepts ────────────────────────

test("a declared ground reaches the loop-assembled map config, and the engine accepts it", () => {
  for (const house of [HOUSE_DARK, HOUSE_NAVY, HOUSE_PINK]) {
    const assemble = assemblerFor("map-native", "choropleth", "static", house)!;
    const r = assemble(REGION_BRIEF);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cfg = r.value as Record<string, unknown>;
    expect(cfg.themeBg).toBe(resolveThemeBg(house.theme)!);
    // The ground's LUMINANCE picks the basemap — MapTiler ships two, so an arbitrary ground
    // snaps to the nearer one. Both of these are read off the declared ground, never restated.
    expect(cfg.mapStyle).toBe(
      relativeLuminance(resolveThemeBg(house.theme)!) < 0.4
        ? "dataviz-dark"
        : "dataviz-light",
    );
    expect(mapNativeConfigErrors(cfg)).toEqual([]);
  }
});

// ── The pixel half ────────────────────────────────────────────────────────────────────────────


async function produceUnder(
  house: BrandProfile | undefined,
  ground?: RunManifest["ground"],
): Promise<{
  result: Awaited<ReturnType<typeof produce>>;
  runDir: string;
}> {
  const runDir = mkdtempSync(join(tmpdir(), "splash-ground-"));
  const src = join(runDir, "data.csv");
  writeFileSync(src, CSV);
  const run: RunManifest = {
    runId: "ground",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "World Bank",
        url: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
      },
    },
    orient: {
      profile: {
        columns: ["country", "access"],
        numericColumns: ["access"],
        rowCount: 4,
      },
      supportsPoint: false,
      geo: REGION_BRIEF.geo,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: REGION_BRIEF.angle.confirmedTakeaway,
          altInsight: REGION_BRIEF.angle.altInsight,
          unit: "%",
        },
        proposal: {
          options: [
            {
              id: "m",
              nativeType: "choropleth",
              engine: "map-native",
              format: "static",
              why: "one value per country, shaded",
            },
          ],
          excluded: [],
          chosenId: "m",
        },
      },
    ],
    events: [],
  };
  const result = await produce(
    ground ? { ...run, ground } : run,
    run.elements[0]!,
    runDir,
    house ? ({ house } as unknown as Decor) : undefined,
  );
  return { result, runDir };
}

async function renderUnder(
  house: BrandProfile | undefined,
  ground?: RunManifest["ground"],
): Promise<{ png: Buffer; runDir: string }> {
  const { result: r, runDir } = await produceUnder(house, ground);
  expect(r.ok ? "produced" : `${r.code}: ${r.message}`).toBe("produced");
  if (!r.ok) throw new Error(r.message);
  return {
    png: readFileSync(join(runDir, fileArtifact(r.value.artifact)!.path)),
    runDir,
  };
}

/** The pixel in a box furthest in LUMINANCE from a reference colour — a glyph's core, when the
 *  box is a furniture band and the reference is the fill behind it. Antialiasing only ever pulls
 *  a letter TOWARD the fill, so the extreme is the letter's own colour, and a band with no text
 *  at all would return the fill itself (a ratio of 1:1, which fails loudly rather than passing). */
function extremeAgainst(
  px: ReturnType<typeof decodePng>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  reference: readonly [number, number, number],
): [number, number, number] {
  const refL = relativeLuminance(hex(reference));
  let best: [number, number, number] = [...reference] as [
    number,
    number,
    number,
  ];
  let bestD = -1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = px.at(x, y);
      const d = Math.abs(relativeLuminance(hex(p)) - refL);
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
  return best;
}

// Sample windows in the 1200x675 article-web box the channel pins (asserted below, so a size
// change fails loudly here rather than sampling sky).
//
// Each pill is paired with the strip of BASEMAP IMMEDIATELY BESIDE IT, never with a convenient
// patch elsewhere: the pill is translucent, so what it composites over is part of the answer, and
// this map's title band sits over OCEAN while its middle is LAND — two different backdrops, 23
// grey levels apart. Measured against the wrong one the arithmetic is off by 5 and the proof
// either fails on a correct render or needs a tolerance wide enough to hide a real miss.
const TITLE_PILL = [20, 12, 455, 66] as const;
const BESIDE_TITLE = [470, 12, 560, 66] as const;
// The SOURCE band, whose backdrop is land rather than ocean — a second pill, over a different
// colour, deriving from the same declared ground. It is also the band MapFrame did not always
// back at all, which is what furnitureGround's own header records.
const SOURCE_PILL = [18, 638, 132, 658] as const;
const BESIDE_SOURCE = [18, 600, 200, 630] as const;
// A wide stretch of open basemap, for the light/dark question the pill cannot answer.
const OPEN_BASEMAP = [600, 20, 900, 60] as const;

for (const [name, house] of [
  ["the dark preset", HOUSE_DARK],
  ["an arbitrary dark house ground", HOUSE_NAVY],
  ["an arbitrary light house ground", HOUSE_PINK],
  ["a saturated house ground that used to be refused", HOUSE_SATURATED],
] as const) {
  proof(
    `${name} arrives on the rendered map's furniture`,
    async () => {
      const { png, runDir } = await renderUnder(house);
      try {
        const px = decodePng(png);
        expect([px.width, px.height]).toEqual([1200, 675]);

        // The pill EVERY band is painted with, derived from the declared ground by the engine's
        // own function. What follows asks whether that is what the browser actually put down.
        const declaredPill = parseRgba(resolveFrameColors(house.theme).pill);
        // The pill the SAME map would carry with no charter at all — the alternative this proof
        // has to be able to tell apart. Asserted below to be far outside the ±2 window, so the
        // measurement cannot be satisfied by an unbranded render.
        const defaultPill = parseRgba(resolveFrameColors(undefined).pill);

        for (const [band, pillBox, backdropBox] of [
          ["title", TITLE_PILL, BESIDE_TITLE],
          ["source", SOURCE_PILL, BESIDE_SOURCE],
        ] as const) {
          const backdrop = modal(
            px,
            backdropBox[0],
            backdropBox[1],
            backdropBox[2],
            backdropBox[3],
          );
          const painted = modal(
            px,
            pillBox[0],
            pillBox[1],
            pillBox[2],
            pillBox[3],
          );
          const expected = over(declaredPill, backdrop);
          const unbranded = over(defaultPill, backdrop);
          console.log(
            `[house-ground] ${house.theme} ${band}: backdrop ${hex(backdrop)} · painted ${hex(painted)} · declared ${hex(expected)} · unbranded ${hex(unbranded)}`,
          );
          // ±2 per channel: the compositor rounds, and lossless PNG loses nothing else.
          for (let i = 0; i < 3; i++)
            expect(Math.abs(painted[i] - expected[i])).toBeLessThanOrEqual(2);
          // …and the window is nowhere near wide enough to also admit the unbranded pill, which
          // is what makes the assertion above a measurement rather than a coincidence.
          expect(
            Math.max(
              ...[0, 1, 2].map((i) => Math.abs(unbranded[i] - expected[i])),
            ),
          ).toBeGreaterThan(8);

          // ★ AND THE TEXT ON IT READS. The pill arriving is half the claim; the reason a ground
          // is refused at all is what happens to the LETTERS. So the glyph core is read off the
          // same band — the pixel furthest in luminance from the pill it sits on, which on a
          // 22px bold title and a 12px source line is the middle of a stroke — and measured
          // against the pill the compositor actually put down. Nothing here is a hex typed
          // twice: both sides come out of the image.
          const glyph = extremeAgainst(
            px,
            pillBox[0],
            pillBox[1],
            pillBox[2],
            pillBox[3],
            painted,
          );
          const read = contrastRatio(hex(glyph), hex(painted));
          console.log(
            `[house-ground] ${house.theme} ${band} text: ${hex(glyph)} on ${hex(painted)} = ${read.toFixed(2)}:1`,
          );
          expect(read).toBeGreaterThanOrEqual(4.5);
        }

        // AND the BASEMAP is the one the declared ground picks. MapTiler ships two, so an
        // arbitrary ground snaps to the nearer — the ground reaching the furniture and the
        // ground reaching the basemap are two separate arrivals.
        const openBasemap = modal(
          px,
          OPEN_BASEMAP[0],
          OPEN_BASEMAP[1],
          OPEN_BASEMAP[2],
          OPEN_BASEMAP[3],
        );
        const declared = resolveThemeBg(house.theme)!;
        expect(relativeLuminance(hex(openBasemap)) < 0.4).toBe(
          relativeLuminance(declared) < 0.4,
        );
      } finally {
        rmSync(runDir, { recursive: true, force: true });
      }
    },
    240_000,
  );
}

// ── The refusal, and the journalist's way through it ──────────────────────────────────────────
//
// Everything above proves a ground ARRIVES. These two prove the other half of the repair on the
// same machinery: a ground that genuinely cannot carry text is still stopped, and the stop is a
// question rather than a wall.

test("a ground no text can read on is refused, and the refusal carries the question", async () => {
  const { result, runDir } = await produceUnder(HOUSE_ILLEGIBLE);
  try {
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("needs-decision");
    // The journalist reads about their text, not about a ratio.
    expect(result.message).toContain("#717171");
    expect(result.message).not.toContain("4.5");
    expect(result.message).not.toContain("WCAG");
    // …and it offers a way out on every side, including keeping theirs.
    expect(result.message).toContain("a)");
    expect(result.message).toContain("b)");
    expect(result.message).toContain("c)");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

proof(
  "the same ground produces once the journalist has said to keep it",
  async () => {
    const kept = chooseGround(
      RunManifestSchema.parse({
        runId: "k",
        schemaVersion: 7,
        route: "embed",
        channel: "article-web",
        input: {},
        elements: [],
        events: [],
      }),
      HOUSE_ILLEGIBLE,
      "keep",
    );
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    const { png, runDir } = await renderUnder(
      HOUSE_ILLEGIBLE,
      kept.value.ground,
    );
    try {
      const px = decodePng(png);
      // Their colour, on the pixels — not a substitute Splash chose for them.
      const declaredPill = parseRgba(resolveFrameColors("#717171").pill);
      const backdrop = modal(px, BESIDE_TITLE[0], BESIDE_TITLE[1], BESIDE_TITLE[2], BESIDE_TITLE[3]);
      const painted = modal(px, TITLE_PILL[0], TITLE_PILL[1], TITLE_PILL[2], TITLE_PILL[3]);
      const expected = over(declaredPill, backdrop);
      console.log(
        `[house-ground] kept #717171: backdrop ${hex(backdrop)} · painted ${hex(painted)} · declared ${hex(expected)}`,
      );
      for (let i = 0; i < 3; i++)
        expect(Math.abs(painted[i] - expected[i])).toBeLessThanOrEqual(2);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  240_000,
);
