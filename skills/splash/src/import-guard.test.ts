import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import { join, resolve } from "node:path";

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

// ── THE SCAN WAS INERT WHERE IT RAN (registry E16, measured 2026-08-04) ────────────────────
// `glob.scan(".")` resolves against the CWD, and the gate runs this suite with `cwd=skills/splash`
// (scripts/check.mjs). From there the pattern `skills/<engine>/**` matches NOTHING: measured 746
// files scanned from the repo root, **0** from the gate's directory. So this guard passed the gate
// by inspecting nothing at all, for as long as it has existed — a green check asserting a vacuum,
// which is worse than a red one because it reads as coverage.
//
// The root is now derived from this file's own location, so the answer no longer depends on where
// the runner happens to stand — and `scanEngineFiles` is asserted non-empty below, so the same
// failure cannot come back silently.
const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");

async function scanEngineFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const eng of ENGINES) {
    const glob = new Glob(`skills/${eng}/**/*.{ts,tsx,mjs}`);
    // RELATIVE paths are kept: the sanction matchers below test `file.startsWith(
    // "skills/map-dw/")`, so handing them an absolute path silently disables every exemption —
    // measured, and it turned 3 offenders into 9 before it was caught.
    for await (const f of glob.scan(REPO_ROOT)) files.push(f);
  }
  return files;
}

// WHAT THE INERT GUARD WAS HIDING — a ratchet, not an allowlist, and deliberately the same idiom
// as lib/delivery/ambient-state.test.ts: the entries are NAMED with what unblocks them and the
// COUNT is asserted, so a fourth reach-in cannot arrive under cover of these three.
//
// Each is a real violation of the rule stated above. None is fixed here, and the reason is
// stated rather than implied: the remedy is to move the shared primitive into lib/core, and
// `fmtBin` pulls map-native's whole `locale` layer with it (labelWithUnit, localizeNumberString,
// Lang). That is a design move about where localisation lives, not a repair — doing it in the
// same breath as un-blinding the guard would be exactly the rushed refactor this project's
// history warns about. Un-blinding is the part that had to happen first: these three were
// INVISIBLE, and now they are counted.
// ONE RATCHET PER RULE — they see different things, and a single shared list would make each
// test assert the other's findings. Measured per rule, not assumed.
//
// Rule 1: map-dw imports SYMBOL_LABELS_INTERACTIVE from map-native. Remedy: the sentence is
// shared by two engines, so it belongs in lib/core, not in map-native's feature-limits.
// EMPTY, and that is the point (registry E16, closed 2026-08-04). The one entry here — map-dw
// reaching into map-native for a shared refusal sentence — is gone because the sentence moved to
// lib/core/limit-sentences.ts, where a string two engines show the journalist belongs.
// A ratchet that reaches zero stops being an allowlist: any entry added back is a deliberate act
// with a name on it.
const KNOWN_REACH_INS: Record<string, number> = {};

// Rule 2 (no exemptions, by design): scrolly reads `fmtBin` from map-native's own src/core.
// Remedy: move fmtBin to lib/core — WITH the locale layer it depends on (labelWithUnit,
// localizeNumberString, Lang). That is a design move about where localisation lives, not a
// repair, which is why un-blinding the guard came first and this did not.
// EMPTY. scrolly read `fmtBin` from map-native's own src/core; it now reads
// lib/core/legend-format.ts. The move cost nothing it was feared to cost — the dependency it was
// said to "drag" was already a re-export shim of lib/core/locale, which a measurement settled and
// a first reading had got wrong.
const KNOWN_CORE_REACH_INS: Record<string, number> = {};

/** Offenders counted per file, so the ratchet compares a shape and not an ordering. */
function tally(offenders: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of offenders) {
    const file = o.split(":")[0];
    out[file] = (out[file] ?? 0) + 1;
  }
  return out;
}

describe("import-guard: no cross-engine src reach-in", () => {
  it("no engine reaches into another engine's src (except the two sanctioned integration surfaces)", async () => {
    const offenders: string[] = [];
    for (const f of await scanEngineFiles()) {
      const contents = readFileSync(join(REPO_ROOT, f), "utf8");
      for (const line of contents.split("\n")) {
        if (!OFFENDER.test(line)) continue;
        if (isScrollyComposition(f, line)) continue;
        if (isMapDwSharedImport(f, line)) continue;
        offenders.push(`${f}: ${line.trim()}`);
      }
    }
    expect(tally(offenders)).toEqual(KNOWN_REACH_INS);
  });

  it("no engine imports a shared primitive from a sibling's src/core (must come from lib/core)", async () => {
    const offenders: string[] = [];
    for (const f of await scanEngineFiles()) {
      const contents = readFileSync(join(REPO_ROOT, f), "utf8");
      for (const line of contents.split("\n")) {
        if (CORE_REACH.test(line)) offenders.push(`${f}: ${line.trim()}`);
      }
    }
    expect(tally(offenders)).toEqual(KNOWN_CORE_REACH_INS);
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
      const contents = readFileSync(join(REPO_ROOT, f), "utf8");
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
    expect(tally(offenders)).toEqual(KNOWN_REACH_INS);
  });

  // A scan that finds nothing must never read as compliance again — the exact failure this file
  // just came out of. 746 engine files exist today; the floor is deliberately far below that so
  // it fails on a broken scan, not on ordinary growth.
  it("scans a non-trivial number of engine files, so a vacuum cannot pass as clean", async () => {
    expect((await scanEngineFiles()).length).toBeGreaterThan(100);
  });
});
