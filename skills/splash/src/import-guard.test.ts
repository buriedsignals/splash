import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { Glob } from "bun";

// Mechanical gate against the coupling the whole shared-core refactor removed: no engine
// may import another engine's src/ — shared code comes only from lib/core (see
// lib/core/index.ts's own header: "Engines import ONLY from this barrel, never from each
// other's src/"). Two integration surfaces are SANCTIONED and pre-date this refactor
// (verified via `git log` against the branch's merge-base — Tasks 1-8 never introduced or
// touched them); everything else is a real reach-in.
const ENGINES = ["chart-native", "map-native", "dw-chart", "map-dw", "scrolly"];

// Matches an import/re-export "from" specifier that reaches into another engine's src/,
// at any relative depth (`../../`, `../../../`, …) — components/ and tests/ subfolders
// sit one level deeper than src/ itself.
const OFFENDER =
  /from\s+["'](?:\.\.\/)+(chart-native|map-native|dw-chart|map-dw|scrolly)\/src\//;

// SANCTIONED #1 — scrolly <-> {chart-native, map-native}, bidirectional composition.
// scrolly is the shared scroll MECHANISM: it imports its host engines' render COMPONENTS
// and (src/manifest.ts, Task 7) their VALIDATORS (nativeSpecErrors, narrativeBeatErrors,
// mapNativeConfigErrors). The reverse also holds and is equally sanctioned: map-native
// converts its own beat data into scrolly's shared narrative-chapter vocabulary
// (ScrollyStory/ScrollyStep, scrolly/src/chapters.ts — mapStoryToChapters) and reuses
// scrolly's temporal-narrative conformance check (scrolly/src/conformance.ts —
// auditTemporalNarrative) so its own map types can drive the scrolly mechanism. This is
// genuinely bidirectional composition between the mechanism and one of its two host
// engines, not a fresh reach-in — confirmed pre-existing (map-native/src/conformance.ts's
// scrolly import predates 23ccde4, the only branch commit to touch that file, and that
// commit's diff never adds/changes the import block; map-native/src/route-story.ts and
// the 7 skills/map-native/src/components/*Scrolly.tsx files are untouched by this branch
// entirely).
function isScrollyComposition(file: string, line: string): boolean {
  if (file.includes("/scrolly/")) return true; // scrolly -> chart-native/map-native
  return (
    file.startsWith("skills/map-native/") &&
    /\/scrolly\/src\/(chapters|conformance)["']/.test(line)
  ); // map-native -> scrolly's shared chapter contract
}

// SANCTIONED #2 — map-dw -> dw-chart (shared Datawrapper plumbing, e.g. export-aspect,
// the one native->dw fallback). Pre-existing (introduced in f408afe/d474127, both before
// this branch's merge-base 7362745; untouched by Tasks 1-8).
// (Tier 2: the sibling exception this used to carry — map-dw -> map-native/src/theme/
// house-ramp, a pure colour-ramp deriver map-dw had no copy of its own for — is GONE:
// house-ramp moved to lib/core/house-ramp.ts, and map-dw's spec-to-map-metadata.ts /
// produce-conformance.ts now import it from there like every other shared primitive. No
// map-dw file reaches into map-native/src/ anymore.)
function isMapDwSharedImport(file: string, line: string): boolean {
  if (!file.startsWith("skills/map-dw/")) return false;
  return /\/dw-chart\/src\//.test(line);
}

// Belt-and-suspenders: no engine may import a shared primitive (contrast, theme, locale,
// i18n-furniture, text-fit, video-verify, conformance-l0) from a SIBLING engine's local
// src/core/ mirror/shim — only lib/core ships those. Catches a future dev re-mirroring a
// primitive (or importing someone else's re-export shim) instead of importing core
// directly. No exceptions: even the two sanctioned integration surfaces above must reach
// primitives through lib/core.
const CORE_REACH =
  /from\s+["'](?:\.\.\/)+(chart-native|map-native|dw-chart|map-dw|scrolly)\/src\/core\//;

async function scanEngineFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const eng of ENGINES) {
    const glob = new Glob(`skills/${eng}/**/*.{ts,tsx,mjs}`);
    for await (const f of glob.scan(".")) files.push(f);
  }
  return files;
}

describe("import-guard: no cross-engine src reach-in", () => {
  it("no engine reaches into another engine's src (except the two sanctioned integration surfaces)", async () => {
    const offenders: string[] = [];
    for (const f of await scanEngineFiles()) {
      const contents = readFileSync(f, "utf8");
      for (const line of contents.split("\n")) {
        if (!OFFENDER.test(line)) continue;
        if (isScrollyComposition(f, line)) continue;
        if (isMapDwSharedImport(f, line)) continue;
        offenders.push(`${f}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no engine imports a shared primitive from a sibling's src/core (must come from lib/core)", async () => {
    const offenders: string[] = [];
    for (const f of await scanEngineFiles()) {
      const contents = readFileSync(f, "utf8");
      for (const line of contents.split("\n")) {
        if (CORE_REACH.test(line)) offenders.push(`${f}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Belt-and-suspenders against the per-line scan's own blind spot: OFFENDER is only ever
  // tested against ONE line at a time (`contents.split("\n")`), so an import whose `from`
  // keyword and specifier string land on DIFFERENT physical lines (a formatter- or
  // hand-split multi-line import) would never appear on any single line the per-line loop
  // inspects and would silently evade the guard above. Re-run OFFENDER as a GLOBAL match
  // against the file's WHOLE content instead of per-line: `\s` inside OFFENDER already
  // matches newlines, so this catches a reach-in regardless of how the import is wrapped.
  // The precise per-line error messages stay owned by the first test; this one only proves
  // nothing slips through.
  it("no engine reaches into another engine's src via an import split across multiple lines", async () => {
    const offenders: string[] = [];
    const globalOffender = new RegExp(OFFENDER.source, "g");
    for (const f of await scanEngineFiles()) {
      const contents = readFileSync(f, "utf8");
      globalOffender.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = globalOffender.exec(contents))) {
        // A window around the match, newlines collapsed to spaces, so it reads like the
        // single "line" the sanction checks below expect (they need to see past the
        // "/src/" the OFFENDER match itself stops at, e.g. "/scrolly/src/chapters").
        const window = contents
          .slice(m.index, m.index + 200)
          .replace(/\n/g, " ");
        if (isScrollyComposition(f, window)) continue;
        if (isMapDwSharedImport(f, window)) continue;
        offenders.push(`${f}: ${window.trim().slice(0, 120)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
