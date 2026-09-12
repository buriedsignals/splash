/**
 * THE CONTRE-ÉPREUVE: WITHOUT THE FILES, NOTHING IS DRAWN.
 *
 * `loadSystemFonts: false` is the load-bearing half of the typeface change, and it is the half
 * nobody can see working. With it left TRUE, a face resvg cannot find is silently replaced by one
 * the rendering machine happens to have: every PNG in this repository looks right on the laptop
 * that made it and arrives in another typeface on a newsroom's Linux box, with no error, no exit
 * code and no pixel difference anybody would notice HERE. That is the failure — a guard that is
 * satisfied by the machine it runs on.
 *
 * So this asserts the opposite property directly. Hand resvg the same markup with NO font files and
 * system fonts off, and it must produce nothing: no ink box, and a PNG that is the blank ground.
 * Hand it the files and the same markup must produce real ink. The gap between the two is the
 * mechanism; if it ever closes, `loadSystemFonts` has been turned back on somewhere and this goes
 * red rather than shipping a beat whose face depends on the machine.
 *
 * MUTATION THAT REDDENS IT: change `loadSystemFonts: false` to `true` in the "without" case below —
 * it starts drawing in a system face and the assertions fail. Change it in `render-still.mjs`'s
 * `rasterise`, or drop the whole `font:` option from any rasteriser in the tree, and the walked
 * per-file case fails instead. Both directions are held, and the second is held over a population
 * this file does not enumerate.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, relative, basename } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { fontFilesForSvg } from "../../../shared/design-base/typefaces.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** French copy with the characters this repository's beats really set. */
const LINE = `Électricité bas-carbone — l’Albanie`;

/** TEXT AND NOTHING ELSE, so the ink box is the type's own. A background rectangle would give
 *  `getBBox()` something to measure whether or not a single letter was drawn, which is exactly the
 *  false green this test exists to avoid. */
const TEXT_ONLY =
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">` +
  `<text x="20" y="120" font-family="Open Sans" font-size="48" font-weight="700">${LINE}</text></svg>`;

/** The same line on a ground — what a rasterised plate really looks like. */
const PLATE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">` +
  `<rect width="900" height="200" fill="#FFFFFF"/>` +
  `<text x="20" y="120" font-family="Open Sans" font-size="48" font-weight="700">${LINE}</text></svg>`;

/** The weight of the rasterised plate. A flat white rectangle compresses to almost nothing; the
 *  same rectangle with a line of bold type on it does not. */
const pngBytes = (png: Uint8Array) => png.length;

describe("a render without its font files", () => {
  it("should produce no ink box at all, where the same markup with the files produces one", () => {
    const blind = new Resvg(TEXT_ONLY, {
      font: { loadSystemFonts: false, fontFiles: [] },
    }).getBBox();
    expect(blind).toBeUndefined();

    const files = fontFilesForSvg(TEXT_ONLY);
    expect(files.length).toBeGreaterThan(0);
    const seeing = new Resvg(TEXT_ONLY, {
      font: { loadSystemFonts: false, fontFiles: files },
    }).getBBox();
    expect(seeing).toBeDefined();
    expect(seeing!.width).toBeGreaterThan(400);
    expect(seeing!.height).toBeGreaterThan(20);
  });

  it("should rasterise to a blank plate, where the same markup with the files rasterises to ink", () => {
    const blind = new Resvg(PLATE, {
      font: { loadSystemFonts: false, fontFiles: [] },
    })
      .render()
      .asPng();
    const seeing = new Resvg(PLATE, {
      font: { loadSystemFonts: false, fontFiles: fontFilesForSvg(PLATE) },
    })
      .render()
      .asPng();
    // Measured on this markup: ~600 bytes blind against several thousand with the files.
    expect(pngBytes(blind)).toBeLessThan(2_000);
    expect(pngBytes(seeing)).toBeGreaterThan(4_000);
    expect(pngBytes(seeing)).toBeGreaterThan(pngBytes(blind) * 3);
  });

  /**
   * EVERY CONSTRUCTION SITE, FOUND BY WALKING — NEVER BY A LIST.
   *
   * This case used to name four files. It was written when four were the ones that had just been
   * changed, and it was already wrong on the day it landed: the five `render-preview.mjs` are not
   * carried copies of anything, so nothing held them, and a sixth skill's preview would have joined
   * the tree unguarded and silent. A guard that enumerates is a guard that goes stale, and a stale
   * guard is worse than none — it reports green about a population it no longer covers.
   *
   * SO THE POPULATION IS DERIVED, by two rules that between them leave no shipped render outside.
   *
   *   1. THE SHIPPED TREE. Any source file under `skills/` or `shared/`, outside `test/`, that
   *      constructs `Resvg` at all. No filename pattern and no exemption: a new rasteriser in a new
   *      skill is in scope the moment it is written. The two sample-photo builders draw no text and
   *      are in scope anyway — they say `loadSystemFonts: false` rather than leaving the option out,
   *      because resvg's own default is TRUE and an omission is indistinguishable from an intention.
   *
   *   2. THE BEATS. Any `render-*.mjs` under `proof/`. Those are the thirteen map beats' own copies
   *      of the rasteriser, outside `carried-copies`' walk, and re-rendering one of them with system
   *      fonts on is exactly the defect this task removed. What is deliberately NOT in scope, by the
   *      same rule rather than by an exemption: the one-off measurement probes
   *      (`proof/palette-proof/render.mjs`, `proof/portrait-aspect-probe/*-probe.mjs`,
   *      `proof/static-carbon-footprint-spread/probe/probe.mjs`, `scripts/two-palette-proof.mjs`).
   *      They are named `probe`/`render`, not `render-*`, they ship nothing, and they are recorded
   *      in `task-8c-report.md` §3.
   *
   * WHAT EACH SITE MUST SATISFY: no `loadSystemFonts: true` anywhere in its code, and as many
   * `loadSystemFonts: false` as there are `new Resvg(` — so a construction that simply OMITS the
   * font option, which resvg reads as system fonts ON, fails here too.
   *
   * MUTATION THAT REDDENS IT: add a file under `skills/` with an unguarded `new Resvg(` — it is in
   * the roster on the next run with nobody editing this file.
   */
  const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;
  const SKIP = new Set(["node_modules", "test", "output-proof", ".git", "renders", "render"]);

  function* walk(dir: string): Generator<string> {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(path);
      else if (entry.isFile() && SOURCE.test(entry.name)) yield path;
    }
  }

  /** Comments stripped, so a `loadSystemFonts: true` quoted in prose is not mistaken for code. */
  const codeOf = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  function constructionSites(): string[] {
    const found: string[] = [];
    for (const root of ["skills", "shared"]) {
      for (const path of walk(join(TWIN, root))) {
        if (/\bnew Resvg\(/.test(codeOf(readFileSync(path, "utf8")))) found.push(relative(TWIN, path));
      }
    }
    const proof = join(TWIN, "proof");
    if (statSync(proof, { throwIfNoEntry: false })?.isDirectory()) {
      for (const path of walk(proof)) {
        if (!/^render-.+\.(mjs|ts|tsx)$/.test(basename(path))) continue;
        if (/\bnew Resvg\(/.test(codeOf(readFileSync(path, "utf8")))) found.push(relative(TWIN, path));
      }
    }
    return found.sort();
  }

  const sites = constructionSites();

  it("should find the whole population by walking, not by a list (premise)", () => {
    // If this roster collapses, the walker has stopped seeing the tree and every case below passes
    // vacuously. Measured on 2026-09-12: 32 files — 10 `render-still.mjs` in the shipped tree,
    // 3 `inspect-render.mjs`, 5 `render-preview.mjs`, 2 sample-photo builders, 13 `render-still.mjs`
    // under `proof/`. The floor is deliberately well under that: it exists to catch zero, not to pin
    // a number a new skill would have to come here and edit.
    expect(sites.length).toBeGreaterThan(20);
    // The five that nothing held before this rewrite, named so their absence is loud.
    for (const skill of ["chart-beat", "chart-web", "image-beat", "map-beat", "scrolly"]) {
      expect([skill, sites.includes(`skills/${skill}/scripts/render-preview.mjs`)]).toEqual([skill, true]);
    }
    // And the beats' own copies, which are outside `carried-copies`' walk entirely.
    expect(sites.filter((f) => /^proof\/.*\/render-still\.mjs$/.test(f)).length).toBeGreaterThan(10);
  });

  for (const file of sites) {
    it(`${file} should construct every Resvg with system fonts switched off`, () => {
      const code = codeOf(readFileSync(join(TWIN, file), "utf8"));
      const constructions = (code.match(/\bnew Resvg\(/g) ?? []).length;
      expect([file, "says loadSystemFonts: true", code.includes("loadSystemFonts: true")]).toEqual([
        file,
        "says loadSystemFonts: true",
        false,
      ]);
      // One `false` per construction: a site that omits the font option entirely gets resvg's own
      // default, which is system fonts ON, and would otherwise pass the check above.
      expect([file, "guarded constructions", (code.match(/loadSystemFonts: false/g) ?? []).length]).toEqual([
        file,
        "guarded constructions",
        constructions,
      ]);
    });
  }
});
