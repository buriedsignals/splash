// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";
import { assembleImageNative } from "./image-native";
import { assembleScrolly } from "./scrolly";
import { assembleMapDw, supportsMapDwType } from "./map-dw";
import { assembleDwChart } from "./dw-chart";
import { MAP_TYPES } from "../../../skills/map-native/src/map-types";
import {
  CHART_TYPES,
  type ChartType,
} from "../../../skills/dw-chart/src/chart-spec";
import { isRowDriven } from "../../../skills/dw-chart/src/export-aspect";

export type AssemblerEntry = {
  assemble: Assembler;
  /** Absent = every type this engine declares, in every format. Present = the (type, format)
   *  pairings the LOOP can compose a spec for, which can lag the engine's own catalogue while a
   *  family is being wired.
   *
   *  `format` is OPTIONAL because two different questions are asked here: "can the loop build
   *  through this engine at all" (no format in hand) and "can it build THIS form" (one in hand).
   *  An entry answering the first must not answer `false` for an engine it does build — so a
   *  format-restricted entry returns true for `undefined`. */
  supports?: (nativeType: string, format?: VisualFormat) => boolean;
  /** WHY a pairing `supports` declines is declined, in the journalist's words — the sentence the
   *  offer's mark and produce's refusal both show. Optional: without it the generic engine
   *  sentence stands, which is the right one for an engine nothing is wired for and the WRONG one
   *  for an engine that is wired in another format (it would read "nothing can build a dw-chart
   *  form yet" of an engine sitting in the buildable list). */
  declines?: (nativeType: string, format?: VisualFormat) => string | undefined;
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
  // image-native owns its format ("scrolly") itself — registry.ts's producerForFormat routes
  // it straight to "image-native", never through the scrolly host — so this key is reached
  // directly, not via the entry above. Its one declared type (image-scrolly).
  "image-native": {
    assemble: assembleImageNative,
    supports: (t) => t === "image-scrolly",
  },
  // The hosted Datawrapper map (Task 13). `supports` is NARROWER than the engine's own
  // catalogue, and deliberately: map-dw declares three types but can never render `symbol`
  // (registry-declared `deferred` — validateMapSpec's symbol branch pushes an unconditional
  // error), and its `locator` is left to map-native, which already places markers from lat/lon
  // columns. Both are marked in the offer rather than chosen and dead-ended at produce.
  "map-dw": { assemble: assembleMapDw, supports: supportsMapDwType },
  // The hosted Datawrapper chart (Task 12).
  //
  // The STATIC-only bound this entry used to carry is GONE, and with it the reason for it: a
  // hosted, file-less deliverable used to be a capability the loop did not have, because the run
  // manifest's artifact slot required a `path` and produce() answered "no interactive artifact in
  // the delivery" for a chart Datawrapper had published perfectly well (measured — see
  // .sdd/task-12-report.md). The manifest now records a hosted delivery as the URL it is
  // (ArtifactRecordSchema, lib/loop/manifest.ts) and produce() writes it, so `interactive` is a
  // real form of this engine again and the brain may offer it unmarked. What the loop still cannot
  // do to a hosted artifact — capture it, preview it, approve it, hand it to a publisher — is
  // refused BY NAME at each of those steps rather than by pretending the form does not exist.
  //
  // FIXED-ASPECT types only, for the second measured reason, which is untouched: a ROW-DRIVEN
  // Datawrapper export (the d3-bars family, dot/arrow/range plots, tables) is exported WIDTH-ONLY
  // on purpose — a
  // pinned height makes Datawrapper CROP the rows that overflow, which is silent data loss
  // (skills/dw-chart/src/export-aspect.ts ROW_DRIVEN_TYPES). The loop's own capture layer then
  // measures the delivered image against the destination's box and reads the content-driven
  // height as a defect: a 3-row bar chart delivered 1200x600 against article-web's 1200x675 and
  // `capture:size-matches-destination` failed, which becomes a `size-mismatch` finding on a
  // correct artifact (measured in lib/host/journey.test.ts — see .sdd/task-12-report.md).
  // Neither side is wrong; they cannot both be satisfied until the verify layer can express
  // "width pinned, height follows the content". Datawrapper's vertical column chart, its lines,
  // areas, pies and scatter all export AT the channel box, so the offer keeps them.
  "dw-chart": {
    assemble: assembleDwChart,
    supports: (t) =>
      (CHART_TYPES as readonly string[]).includes(t) &&
      !isRowDriven(t as ChartType),
    declines: (t) =>
      !(CHART_TYPES as readonly string[]).includes(t)
        ? `Datawrapper does not build a "${t}" chart`
        : isRowDriven(t as ChartType)
          ? `a Datawrapper "${t}" grows its height with the row count rather than fitting the ` +
            `box this deliverable publishes into, and the loop checks a delivered image against ` +
            `that box — so this form is built in-house instead`
          : undefined,
  },
};

export function assemblerFor(
  engine: string,
  nativeType?: string,
  format?: VisualFormat,
): Assembler | undefined {
  const entry = ASSEMBLERS[engine];
  if (!entry) return undefined;
  // Gated on `nativeType`, not on `format`: an entry's `supports` is written to answer about a
  // TYPE, and calling it with none would ask map-native whether it builds "" — false, for an
  // engine it builds everything of. Callers with a format in hand have a type in hand too
  // (produce reads both off the chosen option; the offer's mark reads both off the candidate).
  if (nativeType && entry.supports && !entry.supports(nativeType, format))
    return undefined;
  return entry.assemble;
}

/** The table's own sentence for a pairing it declines, or undefined when it has none. Read by
 *  lib/loop/buildable.ts so the refusal a journalist sees is written where the restriction is
 *  declared, not in a generic fallback two modules away. */
export function declineReason(
  engine: string,
  nativeType?: string,
  format?: VisualFormat,
): string | undefined {
  if (!nativeType) return undefined;
  return ASSEMBLERS[engine]?.declines?.(nativeType, format);
}
