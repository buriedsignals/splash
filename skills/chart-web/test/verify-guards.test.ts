/**
 * THE TWO GUARDS THIS FORMAT REACHES, read in the file it actually ships.
 *
 * A chart web beat's output is ONE self-contained HTML file — chart, interaction, fonts and every
 * asset inlined so it can be dropped into a CMS. That shape is what makes both guards reachable, and
 * it is also the best substrate any format in this tree has: the artifact IS the thing a reader gets,
 * so nothing here reads a component or a screenshot.
 *
 * THE POPULATION, measured 2026-08-19 across the 23 non-scrolly HTML files under `proof/`:
 *   0 inline the same asset twice
 *   29 dashed marks in all, and **all 29 of them carry `vector-effect: non-scaling-stroke`** — which
 *      is CORRECT for a decorative pattern, and is exactly why the guard belongs here: every dash
 *      this format draws is already in screen space, one authored offset away from measuring a
 *      length it does not have
 *    0 of the 29 measure anything: no declared `pathLength`, no non-zero offset
 *    5 files contain a `stroke-dashoffset` at all, and in every one it is the inert
 *      `stroke-dasharray:none;stroke-dashoffset:0` boilerplate of an inlined third-party SVG
 *
 * Both are ratchets. The second one matters more than its zero suggests: this format puts
 * `non-scaling-stroke` on nearly everything it draws, so it sits one authored `stroke-dashoffset`
 * away from the defect that cost a map beat six hours and five wrong diagnoses.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  duplicatedPayload,
  marksFromSource,
  pageLanguageMatchesStory,
  revealDashInScreenSpace,
} from "../scripts/verify-guards.mjs";
import { assertRecordedLanguage, render, SEED } from "../scripts/render-web.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("an asset inlined more than once", () => {
  it("names it, with the bytes nobody benefits from", () => {
    const blob = "A".repeat(4096);
    const html = `<img src="data:image/png;base64,${blob}"><img src="data:image/png;base64,${blob}">`;
    expect(duplicatedPayload(html)).toEqual([{ copies: 2, bytes: 4096, wastedBytes: 4096 }]);
  });

  it("says nothing about an asset inlined once, or a scrap under the floor", () => {
    const blob = "A".repeat(4096);
    const scrap = "B".repeat(512);
    expect(duplicatedPayload(`<img src="data:image/png;base64,${blob}">`)).toEqual([]);
    expect(
      duplicatedPayload(`<i style="background:url(data:image/svg+xml;base64,${scrap})"></i>`.repeat(3)),
    ).toEqual([]);
  });
});

describe("a dash that measures its own path", () => {
  it("refuses it in screen space, read off a rendered element", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<path d="M0 0" stroke-dasharray="1" stroke-dashoffset="0.4" pathLength="1" vector-effect="non-scaling-stroke"></path>`,
          "beat.html",
        ),
      ),
    ).toEqual(["beat.html:1 path"]);
  });

  it("leaves this format's own gridline alone", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<line x1="0" x2="760" stroke="#d1d1d1" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></line>`,
          "beat.html",
        ),
      ),
    ).toEqual([]);
  });

  it("leaves the inert boilerplate of an inlined third-party SVG alone", () => {
    // `stroke-dasharray:none;stroke-dashoffset:0` on an inlined icon — five files carry it, and a
    // reader that flagged it would bury a real finding under fifteen of these.
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<path style="stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" vector-effect="non-scaling-stroke"></path>`,
          "beat.html",
        ),
      ),
    ).toEqual([]);
  });
});

/** Every non-scrolly HTML file under `proof/` — the artifacts this format and its map sibling ship.
 *
 *  Scrollies are told apart by their own markup, the same test `scripts/matrix.mjs` uses: a page
 *  with `data-step` or `step-panel` belongs to the vehicle, and `scrolly/test/scroll-integrity.test.ts`
 *  drives it. */
function webArtifacts(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (!/data-step|step-panel/.test(source)) found.push(path);
      }
    }
  };
  if (existsSync(PROOF) && statSync(PROOF).isDirectory()) walk(PROOF);
  return found;
}

/**
 * FINDING 1 (stress round two): `renderWeb`'s own HTML shell used to hard-code `<html lang="fr">`
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
    const outDir = mkdtempSync(join(tmpdir(), "chart-web-lang-"));
    try {
      const { outPath } = await render({
        dataPath: join(SKILL, "assets/sample-data/rainfall.json"),
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

describe("every web artifact on disk", () => {
  it("inlines each of its assets exactly once", () => {
    const files = webArtifacts();
    expect(files.length).toBeGreaterThanOrEqual(18);
    const offenders: string[] = [];
    for (const file of files) {
      const mb = (n: number) => (n / (1024 * 1024)).toFixed(2);
      for (const found of duplicatedPayload(readFileSync(file, "utf8")))
        offenders.push(
          `${file.slice(TWIN.length + 1)}: ${found.copies} copies of one ${mb(found.bytes)} MB asset, ${mb(found.wastedBytes)} MB wasted`,
        );
    }
    expect(offenders).toEqual([]);
  });

  it("draws every dash in the path's own units", () => {
    const offenders: string[] = [];
    let marks = 0;
    for (const file of webArtifacts()) {
      const found = marksFromSource(readFileSync(file, "utf8"), file.slice(TWIN.length + 1));
      marks += found.length;
      offenders.push(...revealDashInScreenSpace(found));
    }
    // A reader going quiet must fail, not pass. Measured 2026-08-19: 23 files, 29 dashed marks, and
    // all 29 under `non-scaling-stroke` — which is the point of the guard rather than an alarm: a
    // decorative pattern belongs in screen space, and every one of them is one authored offset away
    // from measuring a length it does not have. The floor catches a reader that broke.
    expect(marks).toBeGreaterThanOrEqual(20);
    expect(offenders).toEqual([]);
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
