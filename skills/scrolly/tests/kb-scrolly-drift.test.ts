import { test, expect } from "bun:test";
import { loadTypology } from "../../../lib/brain/typology";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "../src/Scrolly";

test("DRIFT 3: a sheet may declare the scrolly format exactly when a track hosts its type", () => {
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
  const SCROLLY_ENGINES = ["chart-native", "map-native", "image-native"];
  const declares: string[] = [];
  for (const sheet of loadTypology())
    if (sheet.formats.includes("scrolly"))
      for (const engine of SCROLLY_ENGINES)
        declares.push(...(sheet.engines[engine] ?? []));
  // Both directions: nothing declares it without a host, nothing hosted lacks the declaration.
  expect(declares.filter((key) => !hosted.has(key))).toEqual([]);
  expect([...hosted].filter((key) => !declares.includes(key))).toEqual([]);
});
