/**
 * THE FOUR GUARDS THIS FORMAT REACHES, on the two substrates it actually has.
 *
 * A map web beat ships ONE self-contained HTML file carrying a baked plate, its marks and a live
 * MapTiler layer over them, and it ships that plate as `plate/plate.png` beside a
 * `plate/geometry.json` recording the frame every point's pixel position was computed in. So two
 * guards read the page and two read the bake, and none of them needs a browser.
 *
 * WHY NOT `projectionDisagreements`, which the catalogue first pointed here. That decision compares
 * an `<img>`'s CSS `object-fit` against the `preserveAspectRatio` of the SVG over it. Measured across
 * the 23 non-scrolly HTML artifacts on disk: **`object-fit` appears in none of them** — it appears in
 * exactly two files in this whole tree, both scrolly IMAGE beats. This format composites its plate as
 * an `<image>` inside the marks' own SVG, in the marks' own coordinate system; there are not two
 * projections that could disagree. `plateMatchesGeometry` is the same defect reached by the mechanism
 * this format does have, and the catalogue carries them as two rows.
 *
 * THE POPULATION, measured 2026-08-19 — 5 beats declare `map / web` and every one carries a plate:
 *   5/5 have a plate whose aspect ratio is their projected frame's, to 0.000 %, at exactly 2.00×
 *   5/5 have a plate on the side of the ground their own `PALETTE.md` declares (0.661–0.840 under
 *       `#FFFFFF`)
 *   0/5 inline any asset twice
 *   0   dashed marks in the five pages — the `stroke-dashoffset:0` a text search finds in them is
 *       URL-encoded inside a `data:image/svg+xml,` attribution icon, not markup. The dash guard is
 *       a pure ratchet here, and the reader that feeds it is proved live in `chart-web`'s own walk
 *       (23 artifacts, 29 marks) against a byte-identical copy
 *
 * Four ratchets. Nothing is being repaired.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { decodePng } from "../scripts/compare-png.mjs";
import {
  credentialNamesRead,
  credentialReadsWithoutAlias,
  duplicatedPayload,
  groundFromPalette,
  marksFromSource,
  pageLanguageMatchesStory,
  plateFollowsGround,
  plateLuminance,
  plateMatchesGeometry,
  revealDashInScreenSpace,
  surfaceLuminance,
} from "../scripts/verify-guards.mjs";
import { DEFAULT_DATA_PATH, DEFAULT_PLATE_DIR, assertRecordedLanguage, render, SEED } from "../scripts/render-web.mjs";
import { discoverMapWebBeats } from "../scripts/discover-pages.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("a plate and the frame its marks were projected into", () => {
  it("refuses a plate whose aspect ratio is not the frame's", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 960 }, frame: { width: 836, height: 520 } }),
    ).toMatchObject({ ok: false });
  });

  it("accepts the exact pairing every beat on disk has", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 1040 }, frame: { width: 836, height: 520 } }),
    ).toMatchObject({ ok: true, scale: 2 });
  });
});

describe("a baked plate under a declared ground", () => {
  it("refuses a light plate under a dark ground, and the reverse", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.83 })).toBe(false);
    expect(plateFollowsGround({ ground: 0.95, plate: 0.014 })).toBe(false);
  });

  it("does not run at all on a ground it could not read", () => {
    expect(surfaceLuminance(groundFromPalette(""))).toBe(null);
    expect(plateFollowsGround({ ground: null, plate: 0.83 })).toBe(true);
  });

  /**
   * A VALUE THAT WAS NOT READ MUST NOT TRAVEL AS A VALUE THAT WAS — `surfaceLuminance`'s own doc
   * comment says exactly this, and the consumer one screen below it used to do the opposite.
   * Measured: `plateFollowsGround({ ground: 0.009, plate: NaN })` returned TRUE, because `side(NaN)`
   * is neither `< DARK_SIDE` nor `> LIGHT_SIDE` and therefore resolved to "middle", the band this
   * guard deliberately says nothing about. `null` is a caller SAYING it could not read; `NaN` is an
   * arithmetic that failed on the way in, and no caller in this tree filters for it.
   */
  it("refuses to decide on a number that is not one, rather than reading it as the middle band", () => {
    expect(() => plateFollowsGround({ ground: 0.009, plate: NaN })).toThrow(/not a measurement/);
    expect(() => plateFollowsGround({ ground: NaN, plate: 0.83 })).toThrow(/not a measurement/);
    expect(() => plateFollowsGround({ ground: 0.009, plate: Infinity })).toThrow(/not a measurement/);
    // The genuine middle band still says nothing, and that is a different answer from "unreadable".
    expect(plateFollowsGround({ ground: 0.009, plate: 0.4 })).toBe(true);
  });
});

describe("what the shipped page carries", () => {
  it("names an asset inlined more than once", () => {
    const blob = "A".repeat(4096);
    expect(
      duplicatedPayload(`<img src="data:image/png;base64,${blob}"><img src="data:image/png;base64,${blob}">`),
    ).toEqual([{ copies: 2, bytes: 4096, wastedBytes: 4096 }]);
  });

  it("refuses a dash that measures its own path in screen space", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<path stroke-dasharray="1" stroke-dashoffset="0.4" pathLength="1" vector-effect="non-scaling-stroke"></path>`,
          "beat.html",
        ),
      ),
    ).toEqual(["beat.html:1 path"]);
  });

  it("leaves this format's own dashed furniture alone", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<line stroke="#d1d1d1" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></line>`,
          "beat.html",
        ),
      ),
    ).toEqual([]);
  });
});

/** Every beat declaring `map / web` in its own brief, from EVERY root this tree puts beats under —
 *  `scripts/discover-pages.mjs`'s own derivation, not a second walk written here.
 *
 *  THE DEFECT THIS REPLACES, measured on a real story (2026-08-22): the walk that used to live here
 *  read `proof/` and nothing else, and looked for `PALETTE.md` INSIDE the beat directory. A beat a
 *  journalist commissions lives at `stories/<slug>/beats/<id>/` and records its palette at the
 *  STORY root, so a 241-region world choropleth was produced, rendered, driven live and approved
 *  with both of this format's bake-side guards never once looking at it — while this file stayed
 *  green on a ">= 4" floor the proof beats already met. Population TYPED rather than DERIVED,
 *  twice over. `test/beat-population.test.ts` holds the derivation to both story beats by name. */
function mapWebBeats(): { name: string; dir: string; paletteDir: string | null }[] {
  return discoverMapWebBeats();
}

describe("every map web beat on disk", () => {
  it("bakes a plate that describes the frame its own marks were projected into", () => {
    const beats = mapWebBeats();
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir } of beats) {
      const geometryPath = join(dir, "plate", "geometry.json");
      const platePath = join(dir, "plate", "plate.png");
      // A `map / web` beat with no bake is not a beat this guard has nothing to say about — it is a
      // beat whose plate cannot be judged, and the old `continue` made that indistinguishable from
      // a pass. Named as an offender instead, so the count below can be the population itself.
      if (!existsSync(geometryPath) || !existsSync(platePath)) {
        offenders.push(`${name}: declares map / web and has no plate/plate.png + plate/geometry.json to judge`);
        continue;
      }
      const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
      if (!geometry.frame) {
        offenders.push(`${name}: plate/geometry.json records no frame, so the pairing cannot be measured`);
        continue;
      }
      checked++;
      const png = decodePng(readFileSync(platePath));
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
    // DERIVED, never a floor: every beat the walk finds is a beat this guard judged. ">= 4" is
    // what let five beats stand in for seven while two real ones were invisible.
    expect(checked).toBe(beats.length);
    expect(offenders).toEqual([]);
  });

  /**
   * THE ONE BEAT THAT FAILS `plateFollowsGround` TODAY, named with its measurement.
   *
   * Found the moment the population above stopped being `proof/`-only — which is the whole point of
   * deriving it. `stories/stress-f-housing-pressure` records ground `#16191B` (relative luminance
   * 0.009, dark) and its bake asks MapTiler for `dataviz-light`, producing a plate at 0.709: the
   * exact disagreement this guard exists to refuse, sitting in the tree unseen because nothing ever
   * walked `stories/`. The real OWID beat hit the same wall and fixed it by baking `dataviz-dark`.
   *
   * It is RECORDED rather than skipped, and the assertion runs in BOTH directions: this beat must
   * still fail (so re-baking it forces this entry to be deleted rather than leaving a stale
   * exemption behind), and nothing else may. The list can only shrink. Re-baking a story beat that
   * belongs to another package is not this skill's to do silently; naming it is.
   */
  const RECORDED_PLATE_DEBT = ["stories/stress-f-housing-pressure/beats/housing-pressure-choropleth"];

  it("bakes it on the side of the ground it declares", () => {
    const beats = mapWebBeats();
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir, paletteDir } of beats) {
      // The palette the beat ACTUALLY rendered in — its own, or the story's, whichever the walk
      // found. `join(dir, "PALETTE.md")`, which used to stand here, is not "this beat has no
      // palette": it is failing to find the one it rendered in, and then SKIPPING the beat.
      const palette = paletteDir ? join(paletteDir, "PALETTE.md") : join(dir, "PALETTE.md");
      const platePath = join(dir, "plate", "plate.png");
      if (!existsSync(palette) || !existsSync(platePath)) {
        offenders.push(`${name}: no PALETTE.md at or above the beat, or no plate — nothing to measure the plate against`);
        continue;
      }
      const ground = surfaceLuminance(groundFromPalette(readFileSync(palette, "utf8")));
      if (ground == null) {
        offenders.push(`${name}: ${palette} records a ground this reader cannot measure`);
        continue;
      }
      checked++;
      const plate = plateLuminance(decodePng(readFileSync(platePath)));
      if (!plateFollowsGround({ ground, plate }))
        offenders.push(`${name}: ground luminance ${ground.toFixed(3)}, plate ${plate.toFixed(3)} — opposite sides`);
    }
    expect(checked).toBe(beats.length);
    const failing = offenders.map((line) => line.split(":")[0]).sort();
    expect(failing).toEqual([...RECORDED_PLATE_DEBT].sort());
  });

  it("ships a page that inlines each asset once and dashes in the path's own units", () => {
    const beats = mapWebBeats();
    const offenders: string[] = [];
    let pages = 0;
    let marks = 0;
    const pageless: string[] = [];
    for (const { name, dir } of beats) {
      const walk = (at: string): string[] =>
        readdirSync(at, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory()
            ? walk(join(at, entry.name))
            : entry.name.endsWith(".html")
              ? [join(at, entry.name)]
              : [],
        );
      let beatPages = 0;
      for (const file of walk(dir)) {
        const html = readFileSync(file, "utf8");
        if (/data-step|step-panel/.test(html)) continue;
        pages++;
        const mb = (n: number) => (n / (1024 * 1024)).toFixed(2);
        for (const found of duplicatedPayload(html))
          offenders.push(
            `${name}: ${found.copies} copies of one ${mb(found.bytes)} MB asset, ${mb(found.wastedBytes)} MB wasted`,
          );
        const found = marksFromSource(html, file.slice(TWIN.length + 1));
        marks += found.length;
        offenders.push(...revealDashInScreenSpace(found));
        beatPages++;
      }
      if (beatPages === 0) pageless.push(name);
    }
    // Every beat the walk finds ships at least one page, and the page COUNT is derived from that
    // rather than floored at a number the proof beats already met.
    expect(pageless).toEqual([]);
    expect(pages).toBeGreaterThanOrEqual(beats.length);
    // NO FLOOR ON `marks`, and the reason is measured: this format's five pages carry ZERO dashed
    // elements. The five `stroke-dashoffset:0` strings a text search finds in them are URL-encoded
    // inside a `data:image/svg+xml,` attribution icon (`vector-effect:none;...;fill:%23000`), not
    // markup — the reader is right to see nothing. A floor here would be a number invented to look
    // rigorous. What keeps the reader honest is that it is BYTE-IDENTICAL to `chart-web`'s, which
    // walks 23 artifacts and 29 marks with a floor of its own, and `guard-copies-parity.test.ts`
    // refuses the two drifting apart.
    expect(marks).toBe(0);
    expect(offenders).toEqual([]);
  });
});

/**
 * FINDING 1 (stress round two): `renderMapWeb`'s own HTML shell used to hard-code `<html lang="en">`
 * regardless of what a beat actually said — this is the guard on the DELIVERED page,
 * `doctrine/references/guard-catalogue.json`'s `page-declares-story-language`.
 */
describe("pageLanguageMatchesStory", () => {
  it("agrees when the page's own <html lang> matches the recorded language", () => {
    expect(pageLanguageMatchesStory('<html lang="en"><head></head></html>', "en")).toBe(true);
  });

  it("refuses a page whose <html lang> is a different language than recorded", () => {
    expect(pageLanguageMatchesStory('<html lang="fr"><head></head></html>', "en")).toBe(false);
  });

  it("refuses a page with no <html lang> attribute at all", () => {
    expect(pageLanguageMatchesStory("<html><head></head></html>", "en")).toBe(false);
  });

  it("checks this format's own seed against the language it was told to write", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "map-web-lang-"));
    try {
      const { outPath } = await render({
        dataPath: DEFAULT_DATA_PATH,
        plateDir: DEFAULT_PLATE_DIR,
        outDir,
      });
      const html = readFileSync(outPath, "utf8");
      expect(pageLanguageMatchesStory(html, SEED.language)).toBe(true);
      expect(pageLanguageMatchesStory(html, "fr")).toBe(false);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("assertRecordedLanguage", () => {
  it("returns the trimmed tag when it is a real language code", () => {
    expect(assertRecordedLanguage("en")).toBe("en");
    expect(assertRecordedLanguage(" fr ")).toBe("fr");
    expect(assertRecordedLanguage("de-CH")).toBe("de-CH");
  });

  it("refuses a missing language rather than defaulting to English", () => {
    expect(() => assertRecordedLanguage(undefined)).toThrow(/never detected.*never defaulted/s);
    expect(() => assertRecordedLanguage("")).toThrow();
    expect(() => assertRecordedLanguage("   ")).toThrow();
  });

  it("refuses a string that is not a language code", () => {
    expect(() => assertRecordedLanguage("French")).toThrow(/not a language code/);
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
    // `SUBJECT_KEY` (this skill's own `assets/MapWebSeed.tsx`) names which point is the subject,
    // not a credential — a bare `_KEY` substring is not enough to be read as one.
    const source = 'const SUBJECT_KEY = "paris";\nconst isSubject = point.key === SUBJECT_KEY;';
    expect(credentialNamesRead(source)).toEqual([]);
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

  /**
   * THE POPULATION ABOVE IS THE WRONG UNIT FOR THIS SKILL, and a real run measured what that cost.
   *
   * `scripts/verify-live-map.mjs` read `process.env.MAPTILER_KEY` with no alias list, while the
   * root's `.env` holds the key as `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY`. So the live
   * probe printed "no MAPTILER_KEY", verified nothing, and exited 0 on a machine that had a working
   * key the whole time. The check above could not see it twice over: it SKIPS every `verify-*` file,
   * and even without that skip the alias list `bake-plate.mjs` declares one file over would have
   * satisfied it — a guard whose population is the whole skill cannot refuse a single file that
   * cannot resolve a key on its own.
   *
   * The combined reading stays, because it is argued for `dw-beat`, where `sealed-produce.mjs`
   * genuinely imports its resolver from `produce.mjs`. This adds the reading that matters here:
   * EVERY FILE, INCLUDING THE VERIFIERS, resolves the key it reads or does not read one. The only
   * exemption is the file that DECLARES the decision, whose own doc comment names the credentials it
   * exists to refuse — a rule cannot be its own subject.
   */
  it("every file of this skill that reads a credential resolves it on its own", () => {
    const offenders: string[] = [];
    let filesRead = 0;
    let filesWithACredential = 0;
    for (const dir of [join(SKILL, "scripts"), join(SKILL, "assets")]) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
        const source = readFileSync(join(dir, name), "utf8");
        filesRead++;
        if (source.includes("export function credentialReadsWithoutAlias")) continue;
        if (credentialNamesRead(source).length > 0) filesWithACredential++;
        for (const credential of credentialReadsWithoutAlias(source))
          offenders.push(`${name}: reads ${credential} and declares no ${credential}_ALIASES of its own`);
      }
    }
    // Anti-vacuity: the walk read the skill, and it found the two files that really do read a key.
    expect(filesRead).toBeGreaterThan(20);
    expect(filesWithACredential).toBe(2);
    expect(offenders).toEqual([]);
  });
});
