// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";
import { assembleScrolly } from "./scrolly";
import { assembleMapDw, supportsMapDwType } from "./map-dw";
import { MAP_TYPES } from "../../../skills/map-native/src/map-types";

export type AssemblerEntry = {
  assemble: Assembler;
  /** Absent = every type this engine declares. Present = the types the LOOP can compose a
   *  spec for, which can lag the engine's own catalogue while a family is being wired. */
  supports?: (nativeType: string) => boolean;
};

export const ASSEMBLERS: Record<string, AssemblerEntry> = {
  "chart-native": { assemble: assembleChartNative },
  // All seven of map-native's types (Task 6). `supports` is the engine's own type list, not a
  // hand-kept copy — see MAP_TYPES's header for the single-source-of-truth it drift-tests
  // against mount.tsx.
  "map-native": {
    assemble: assembleMapNative,
    supports: (t) => (MAP_TYPES as readonly string[]).includes(t),
  },
  // scrolly is not a third engine — it hosts chart-native's or map-native's own track (see
  // scrolly.ts's header). No `supports`: whatever nativeType arrives, assembleScrolly composes
  // the right host engine for it (a MAP_TYPES id goes to map-native, anything else to
  // chart-native), so every type either engine already supports is reachable through it.
  scrolly: { assemble: assembleScrolly },
  // The hosted Datawrapper map (Task 13). `supports` is NARROWER than the engine's own
  // catalogue, and deliberately: map-dw declares three types but can never render `symbol`
  // (registry-declared `deferred` — validateMapSpec's symbol branch pushes an unconditional
  // error), and its `locator` is left to map-native, which already places markers from lat/lon
  // columns. Both are marked in the offer rather than chosen and dead-ended at produce.
  "map-dw": { assemble: assembleMapDw, supports: supportsMapDwType },
};

export function assemblerFor(
  engine: string,
  nativeType?: string,
): Assembler | undefined {
  const entry = ASSEMBLERS[engine];
  if (!entry) return undefined;
  if (nativeType && entry.supports && !entry.supports(nativeType))
    return undefined;
  return entry.assemble;
}
