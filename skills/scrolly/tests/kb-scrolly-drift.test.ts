import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTypology } from "../../../lib/brain/typology";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "../src/scrolly-types";

// Only these three engines ever build a scrolly track (Scrolly.tsx's own dispatch). Extracted
// so the fixture test below can call the exact same check against a temporary root — a
// production export would exist for no reason but this test.
const SCROLLY_ENGINES = ["chart-native", "map-native", "image-native"];

// Three guarantees, not two:
//   1. declaredWithoutHost   — nothing declares `scrolly` claiming a render key no track hosts.
//   2. hostedWithoutDeclaration — nothing a track hosts goes undeclared.
//   3. sheetsWithNoInScopeHost — PER SHEET, not just in aggregate: a sheet declaring `scrolly`
//      must itself contribute at least one in-scope render key, so a sheet naming only an
//      out-of-scope engine (dw-chart-only, map-dw-only) cannot satisfy guarantee 1 VACUOUSLY by
//      contributing zero keys to the pooled `declares` list. (1) and (2) alone are pooled checks
//      across all sheets together — they cannot tell "no sheet ever violates this" from "the one
//      sheet that would have violated it happened to contribute nothing to check". (3) is scoped
//      to each sheet individually, closing exactly that gap.
function checkScrollyDrift(root?: string) {
  const hosted = new Set([
    ...CHART_SCROLLY_TYPES,
    ...MAP_SCROLLY_TYPES,
    "image-scrolly", // image-native builds its own scrolly (manifest.ts:23)
  ]);
  // A sheet's `id` is its filename, not necessarily its render key — `proportional-symbol.md`
  // hosts render key "symbol" (`engines.map-native: symbol`), same distinction renderableSheets()
  // and DRIFT 1/2 already respect by joining through `sheet.engines`, never `sheet.id`. Only the
  // three engines that actually build a scrolly track can host it — `bar`/`line`/etc. also name
  // a `dw-chart` key, which is not a scrolly host and must not leak into the comparison.
  const declares: string[] = [];
  const sheetsWithNoInScopeHost: string[] = [];
  for (const sheet of loadTypology(root)) {
    if (!sheet.formats.includes("scrolly")) continue;
    const inScopeKeys = SCROLLY_ENGINES.flatMap(
      (engine) => sheet.engines[engine] ?? [],
    );
    declares.push(...inScopeKeys);
    if (!inScopeKeys.some((key) => hosted.has(key)))
      sheetsWithNoInScopeHost.push(sheet.id);
  }
  return {
    declaredWithoutHost: declares.filter((key) => !hosted.has(key)),
    hostedWithoutDeclaration: [...hosted].filter(
      (key) => !declares.includes(key),
    ),
    sheetsWithNoInScopeHost,
  };
}

test("DRIFT 3: a sheet may declare the scrolly format exactly when a track hosts its type", () => {
  const result = checkScrollyDrift();
  // Both directions: nothing declares it without a host, nothing hosted lacks the declaration.
  expect(result.declaredWithoutHost).toEqual([]);
  expect(result.hostedWithoutDeclaration).toEqual([]);
  // Per-sheet: every declaring sheet earns its declaration itself, not by riding along in the
  // aggregate while contributing nothing.
  expect(result.sheetsWithNoInScopeHost).toEqual([]);
});

// A sheet whose ONLY engine keys fall outside SCROLLY_ENGINES (a dw-chart-only type, say)
// contributes zero entries to `declares` above — so it would satisfy "nothing declares scrolly
// without a host" VACUOUSLY, while its own `formats` line lies about a track no engine hosts.
test("a sheet naming only an out-of-scope engine cannot satisfy the scrolly declaration vacuously", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-scrolly-vacuous-"));
  mkdirSync(join(root, "chart", "types"), { recursive: true });
  writeFileSync(
    join(root, "chart", "types", "fixture-dw-only.md"),
    [
      "---",
      "id: fixture-dw-only",
      "engines:",
      "  dw-chart: made-up-key",
      "intent: [magnitude]",
      "shape: single",
      "limits: {}",
      "formats: [static, scrolly]",
      "bestFor:",
      '  - "testing"',
      "notFor:",
      '  - "testing"',
      "---",
      "",
      "Fixture body.",
      "",
    ].join("\n"),
  );
  const result = checkScrollyDrift(root);
  expect(result.sheetsWithNoInScopeHost).toEqual(["fixture-dw-only"]);
});
