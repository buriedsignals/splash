/**
 * THE ROW UNDER A CONTROL IS AS DEEP AS ITS DEEPEST SENTENCE, AND NOBODY TYPES THAT NUMBER.
 *
 * The defect this file closes, measured on the committed corpus before it was touched
 * (`.superpowers/sdd/2026-09-12-sp1-map-plan-contract/fix-verify-controls.md`): `control-chrome.ts`
 * reserved the note row with a hand-authored `min-height` — `1.5em` by default, one line — and the
 * sentences the row holds wrap to two, three or four. **34 of 58 committed web beats** lost plot
 * height the moment a reader chose an option; on `web-heatmap-coal-share-europe` at 375px the
 * drawing's top moved 504 → 557px. Seven were wrong at 1600px as well, and this skill's own seed
 * was one of them (18px, at 1600 AND at 375).
 *
 * A bigger number per vocabulary would not have closed it. How deep a sentence sets is a function
 * of the READER'S width and of the beat's own words, so any build-time number is right at one width
 * and wrong at the next — the repository has paid this bill before (`MARK_ACTIVE_MIN_STEP = 1.12`),
 * and the twenty-two hand-authored reserves this change deleted ranged from `null` to `4.2em` with
 * a measured paragraph beside each one, three of which conceded in writing that the number was
 * wrong below some width.
 *
 * So the browser measures instead: every sentence sits in ONE grid cell, all of them in flow at
 * once, and the cell is as deep as the deepest. That mechanism has exactly one requirement, and it
 * is the one this file guards — **an unchosen sentence must stay IN FLOW**. A sentence hidden by
 * its display leaves the grid cell entirely and contributes nothing, so a row holding four of them
 * that way is as deep as whichever one is showing, which is the jump and not a reservation. Three
 * vocabularies (`rebase`, `side`, `reorder`) had already asked for `stacked: true` while still
 * hiding by display; the stacking was inert on all three and their `min-height` was doing the whole
 * job alone. Nothing said so.
 *
 * WHAT THIS FILE CANNOT SEE, so it is not trusted past its reach: whether a real row in a real
 * browser at a real width actually holds its deepest sentence. That is measured on the delivered
 * page by `scripts/verify-web.mjs` — `the note row is as deep as its deepest sentence`, `every
 * sentence the note row reserves for is IN FLOW where the row can measure it`, and `choosing "X"
 * does not change the note row's depth`, at 1600x800, at 375x812 and with JavaScript off.
 */

import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { controlChromeCss } from "../assets/control-chrome.ts";

const HERE = new URL(".", import.meta.url).pathname;
const SCOPE = ".chart-figure";

/** WHERE A NOTE RULE MAY BE WRITTEN, and it is deliberately not only this skill's own directory.
 *  `control-chrome.ts` lives here and draws the row, but the vocabularies that fill it do not all
 *  live here: eight committed `proof/web-*` beats call this chrome with a vocabulary vendored from
 *  `map-web/assets/` (`pool`, `restore`, `classing`, `measure`, `vantage`, `area-scale`), and the
 *  scaffold a new map beat is written from is a template rather than a module. `pool.ts` is the
 *  reason this sweep is wide: it was the last file still hiding a sentence by its display, it is
 *  not in this skill's tree, and a sweep of this skill's tree alone reported clean while
 *  `web-hex-grid-europe-protection` was losing 200px of map on a phone. */
const SOURCES = [
  join(HERE, "..", "assets"),
  join(HERE, "..", "..", "map-web", "assets"),
  join(HERE, "..", "..", "map-web", "assets", "web-map-beat-scaffold"),
];

/** Every rule whose subject is a control's sentence, with the file it is written in. Matched on the
 *  SELECTOR rather than on a vocabulary name, so a stem nobody has written yet is covered the day
 *  it is: `[data-<anything>-note]`. */
function noteRules(): { file: string; line: number; text: string }[] {
  const found: { file: string; line: number; text: string }[] = [];
  for (const dir of SOURCES)
    for (const file of readdirSync(dir).filter((f) => /\.(ts|tsx|tmpl)$/.test(f))) {
      const source = readFileSync(join(dir, file), "utf8").split("\n");
      source.forEach((text, i) => {
        if (/\[data-[a-z0-9-]+-note(?:=|\])/.test(text) && /\{[^}]*:/.test(text))
          found.push({ file, line: i + 1, text: text.trim() });
      });
    }
  return found;
}

describe("a sentence the row does not show still has to be in the row", () => {
  it("should find the note rules at all, so an empty sweep cannot pass for a clean one", () => {
    const rules = noteRules();
    expect(rules.length).toBeGreaterThan(30);
    expect(new Set(rules.map((r) => r.file)).size).toBeGreaterThan(20);
  });

  it("should hide and show a sentence by its visibility, never by its display", () => {
    const offenders = noteRules().filter((r) =>
      /\{[^}]*\bdisplay\s*:/.test(r.text),
    );
    expect(
      offenders.map((r) => `${r.file}:${r.line} ${r.text}`),
      "a sentence taken out of the row's flow contributes no height, so control-chrome's grid cell " +
        "collapses to whichever sentence is showing and the row reserves nothing",
    ).toEqual([]);
  });

  it("should reveal a chosen sentence with visibility: visible", () => {
    const shown = noteRules().filter((r) =>
      /visibility:\s*visible/.test(r.text),
    );
    expect(shown.length).toBeGreaterThan(20);
  });
});

describe("the row takes its depth from the browser, not from an author", () => {
  const css = controlChromeCss({ scope: SCOPE, name: "probe" });
  const noteRule = css.slice(css.indexOf(`${SCOPE} .probe-notes {`));
  const noteBlock = noteRule.slice(0, noteRule.indexOf("}") + 1);

  it("should stack every sentence in one grid cell", () => {
    expect(noteBlock).toContain("display: grid;");
    expect(css).toContain(
      `${SCOPE} .probe-notes p { grid-area: 1 / 1; margin: 0; }`,
    );
  });

  it("should reserve the row with no min-height of its own", () => {
    expect(noteBlock).not.toContain("min-height");
  });

  // THE NUMBER IS NOT MERELY UNUSED — IT IS REFUSED BY NAME. A knob that silently stops being read
  // is worse than one that was never removed: the caller keeps its measured paragraph, keeps
  // believing the row is reserved, and finds out from a reader.
  for (const key of ["reserve", "why", "stacked"])
    it(`should refuse a call site still passing notes.${key}`, () => {
      expect(() =>
        controlChromeCss({
          scope: SCOPE,
          name: "probe",
          // deliberately the retired shape, which is why the cast is here
          notes: { [key]: key === "stacked" ? true : "3em" } as never,
        }),
      ).toThrow(/no longer exists/);
    });

  it("should still let a vocabulary set the row's margin", () => {
    expect(
      controlChromeCss({
        scope: SCOPE,
        name: "probe",
        notes: { margin: "2px 0 0" },
      }),
    ).toContain("margin: 2px 0 0;");
  });
});
