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
import type { HeightPolicy } from "../../verify/types";

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
  // The hosted Datawrapper chart (Task 12) — STATIC only, and the format bound is not a
  // conservatism, it is a MEASURED boundary of the loop:
  //   · dw-chart "static"      → the engine exports a PNG it hands back (form "file"). The loop
  //                              records an artifact by PATH, so this is a delivery it can keep.
  //   · dw-chart "interactive" → the engine publishes and hands back a URL and NO file (form
  //                              "hosted", `files: []` — skills/dw-chart/src/manifest.ts). The run
  //                              manifest's artifact slot requires `path`, and produce() answers
  //                              "no interactive artifact in the delivery". Offering it unmarked
  //                              put a dead end at rank 1 of a real run's offer (measured — see
  //                              .sdd/task-12-report.md).
  // A hosted, file-less deliverable is a capability the loop does not have yet; until it does,
  // this table says so rather than letting the brain promise it.
  //
  // The ROW-DRIVEN family (d3-bars and its variants, dot / arrow / range plots, tables) used to be
  // excluded here TOO — nine of Datawrapper's twenty-two types, kept out of the offer. Not for a
  // fault of the engine's: such a chart is exported WIDTH-ONLY on purpose, because a pinned height
  // makes Datawrapper CROP the rows that overflow (silent data loss — see export-aspect.ts
  // ROW_DRIVEN_TYPES), so a 3-row bar chart legitimately came back 1200x600 for article-web's
  // 1200x675 and `capture:size-matches-destination` filed a `size-mismatch` on a correct artifact.
  // Neither side was wrong: the verify layer simply could not express "width pinned, height follows
  // the content". It can now (lib/verify/types.ts HeightPolicy), so the exclusion is GONE and the
  // knowledge that justified it did not disappear with it — it moved to heightPolicyFor below,
  // where it declares the shape the capture layer measures against instead of refusing the type.
  "dw-chart": {
    assemble: assembleDwChart,
    supports: (t, format) =>
      (CHART_TYPES as readonly string[]).includes(t) &&
      (format === undefined || format === "static"),
    declines: (t, format) =>
      !(CHART_TYPES as readonly string[]).includes(t)
        ? `Datawrapper does not build a "${t}" chart`
        : format !== undefined && format !== "static"
          ? `Datawrapper delivers a ${format} chart as a HOSTED embed — a URL, with no file the ` +
            `newsroom owns — and a run keeps each element as a file of its own, so the loop ` +
            `builds a Datawrapper chart as a static image; an interactive one is built in-house`
          : undefined,
  },
};

/**
 * The SHAPE the artifact this (engine, type) pairing produces will have against its destination
 * box — the fact `capture` needs in order to measure it correctly.
 *
 * WHY IT TRAVELS FROM HERE, and not from the two other places it could have:
 *   · not from the CHANNEL model — a channel is not row-driven. article-web hosts a column chart
 *     that lands exactly on its box and a bar chart whose height belongs to its rows; the property
 *     is the ENGINE's and the TYPE's, and putting it on the channel would make it true of both.
 *   · not from the PRODUCER'S REPORT — the run manifest records an artifact as path + sha256 +
 *     provenance + producedAt (lib/loop/manifest.ts); a producer's `report` bag never reaches
 *     capture. Widening the persisted schema to carry a value that is a pure function of (engine,
 *     type) would buy a migration AND a second copy of the answer that can disagree with the
 *     engine's own — the drift this codebase has already paid for more than once.
 *   · so from the ENGINE, read at the one place lib/loop already keeps engine knowledge (this
 *     table), and handed to `capture` as a NEUTRAL vocabulary term (lib/verify/types.ts
 *     HeightPolicy) — never as a type name. lib/verify stays free of chart types, which is what
 *     keeps this from becoming a list someone has to remember to extend.
 *
 * A future engine with the same property answers here, in one line, and the verify layer needs
 * no edit at all.
 */
export function heightPolicyFor(
  engine?: string,
  nativeType?: string,
): HeightPolicy {
  if (engine === "dw-chart" && isRowDriven(nativeType as ChartType))
    return "content-driven";
  return "pinned";
}

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
