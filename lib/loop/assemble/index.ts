// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import { assembleChartNative } from "./chart-native";
import {
  chartNativeSupports,
  chartNativeDeclineReason,
} from "../../../skills/chart-native/src/video-reach";
import { assembleMapNative } from "./map-native";
import { assembleImageNative } from "./image-native";
import {
  assembleScrolly,
  scrollyTrackRefusal,
  SCROLLY_TRACK_TYPES,
} from "./scrolly";
import { assembleMapDw, supportsMapDwType, mapDwTypeRefusal } from "./map-dw";
import { assembleDwChart } from "./dw-chart";
import { MAP_TYPES } from "../../../skills/map-native/src/map-types";
import { IMAGE_SCROLLY_TYPE } from "../../../skills/image-native/src/image-story";
import {
  CHART_TYPES,
  type ChartType,
} from "../../../skills/dw-chart/src/chart-spec";
import { isRowDriven } from "../../../skills/dw-chart/src/export-aspect";
import { engineTypes, getProducer } from "../../core/registry";
import type { HeightPolicy } from "../../verify/types";
// THE NEWSROOM'S CHARTER — the SAME function the prose chain applies (skills/splash/src/
// produce-all.ts calls it on every accepted proposal's spec). Imported, never restated: the
// policy it holds is not "paint it the house colour" but a per-producer ruling (a chart takes
// a baseColor, a map takes a brandHue AND has its auto ramp CLEARED, a diverging scale keeps
// its registry palette, a journalist's explicit colour always wins), and a second copy of that
// would be a second answer to "what does the charter mean here".
import {
  mergeProfileDefaults,
  type BrandProfile,
} from "../../../skills/splash/src/brand-profile";

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
  // chart-native's `supports` restricts ONE format and nothing else: four of its types render a
  // static and an interactive chart perfectly well and cannot be shipped as a VIDEO, because the
  // producer's own reveal contract refuses the mp4 it has just encoded (skills/chart-native/src/
  // video-reach.ts carries the list, the measurements and the journalist's sentence for each).
  //
  // It is here, per-(type, format), rather than as a `deferred` flag on the producer manifest,
  // because `deferred` takes a type out of EVERY format at once — closing one broken form by
  // deleting three working ones. The measurement that put it here: on 2026-07-28 the brain
  // offered all four of these video forms CLEAN and produce refused every one, which is the
  // "offered but not producible" trap this table exists to make impossible.
  "chart-native": {
    assemble: assembleChartNative,
    supports: chartNativeSupports,
    declines: chartNativeDeclineReason,
  },
  // All seven of map-native's types (Task 6). `supports` is the engine's own type list, not a
  // hand-kept copy — see MAP_TYPES's header for the single-source-of-truth it drift-tests
  // against mount.tsx.
  "map-native": {
    assemble: assembleMapNative,
    supports: (t) => (MAP_TYPES as readonly string[]).includes(t),
    declines: (t) =>
      (MAP_TYPES as readonly string[]).includes(t)
        ? undefined
        : `map-native draws ${MAP_TYPES.join(", ")} — "${t}" is not one of them`,
  },
  // scrolly is not a third engine — it hosts chart-native's or map-native's own track (see
  // scrolly.ts's header).
  //
  // `supports` is the two tracks' OWN type lists (SCROLLY_TRACK_TYPES), and it used to be absent
  // — which, combined with a redirect that fired on the format alone, made EVERY engine's
  // scrolly candidate buildable. Measured against the real KB: a Datawrapper `d3-bars` composed
  // a chart-native spec no mapper knows (validation passed, the BUILD threw), and a hosted
  // Datawrapper choropleth silently became a MapLibre map the journalist never chose. The
  // ENGINE-level half of that is closed at the redirect (lib/core/registry.ts's FORMAT_HOST now
  // names the engines skills/scrolly hosts); this is the TYPE-level half.
  scrolly: {
    assemble: assembleScrolly,
    supports: (t) => SCROLLY_TRACK_TYPES.includes(t),
    declines: (t) =>
      SCROLLY_TRACK_TYPES.includes(t) ? undefined : scrollyTrackRefusal(t),
  },
  // image-native owns its format ("scrolly") itself — registry.ts's producerForFormat routes
  // it straight to "image-native", never through the scrolly host — so this key is reached
  // directly, not via the entry above. Its one declared type (image-scrolly).
  "image-native": {
    assemble: assembleImageNative,
    supports: (t: string) => t === IMAGE_SCROLLY_TYPE,
    declines: (t) =>
      t === IMAGE_SCROLLY_TYPE
        ? undefined
        : `image-native walks the journalist's own photographs — it draws no "${t}", and ` +
          `nothing about a "${t}" can be made out of a photograph sequence`,
  },
  // The hosted Datawrapper map (Task 13). `supports` is NARROWER than the engine's own
  // catalogue, and deliberately: map-dw declares three types but can never render `symbol`
  // (registry-declared `deferred` — validateMapSpec's symbol branch pushes an unconditional
  // error), and its `locator` is left to map-native, which already places markers from lat/lon
  // columns. Both are marked in the offer rather than chosen and dead-ended at produce.
  "map-dw": {
    assemble: assembleMapDw,
    supports: supportsMapDwType,
    // The engine's OWN sentence, which existed and was DEAD: assemblerFor returns undefined for a
    // declined type, so assembleMapDw — where mapDwTypeRefusal was reached from — never ran, and
    // the journalist read the generic engine fallback contradicting itself instead.
    declines: (t) => (supportsMapDwType(t) ? undefined : mapDwTypeRefusal(t)),
  },
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
    supports: (t) => (CHART_TYPES as readonly string[]).includes(t),
    declines: (t) =>
      !(CHART_TYPES as readonly string[]).includes(t)
        ? `Datawrapper does not build a "${t}" chart`
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
  // A SCROLLY IS ITS OWN SCROLL. It fills the destination's width and then runs for as many
  // screens as its walk has cards — measured on a loop-produced chart scrolly, the component
  // ends at y 3645 in a 1200x675 destination, at every breakpoint. That is the same statement
  // the row-driven family makes ("the width is the destination's, the height belongs to the
  // content"), so it is the same policy, not a second concept: held to the box instead, every
  // scrolly ever produced filed a blocking `component-overflows-viewport` on a correct artifact.
  //
  // Taking over the reader's scroll is a real editorial difference from a chart in a box — and
  // it is a difference in the READING, not in what is delivered (one self-contained HTML file of
  // the embed genre, the same publishers, the same iframe snippet). This line is where that
  // difference is expressed, and it is the whole of it.
  //
  // Keyed on the BUILDER, which is what the caller resolves (lib/loop/verify.ts passes
  // resolveBuilder(chosen)): skills/scrolly hosts chart-native's and map-native's tracks, so
  // "scrolly" covers every track it hosts, and image-native — whose only format IS scrolly —
  // answers for itself. An engine's non-scrolly forms are untouched.
  if (engine === "scrolly" || engine === "image-native")
    return "content-driven";
  return "pinned";
}

/**
 * THE ENGINE'S OWN "declared but not reachable" flag, read straight off its producer manifest
 * (`types: [{ id, deferred? }]`, lib/core/registry.ts).
 *
 * It is read HERE, in the table, because the table is meant to be the one arbiter of what the
 * loop can build — and it was not. chart-native's entry carries no `supports`, so every type its
 * manifest declares passed, INCLUDING the fourteen family-B types the manifest marks `deferred`
 * because no mapper builds them: `isLoopBuildable("chart-native", "sankey", "static")` answered
 * TRUE. Nothing downstream would have rendered one — lib/brain's `renderableSheets` join drops a
 * deferred type one layer up — but that is a join happening to sit above the gate, not the gate
 * being right, and every caller that is not the brain was being lied to.
 *
 * One rule, no per-engine exception: `isRenderable` (the registry's own predicate, which the
 * brain uses) already treats declared-and-deferred as un-renderable, so this makes the table
 * AGREE with it rather than adding a second opinion. Ten dw-chart types carry the flag for a
 * SOFTER reason (no KB sheet models them, rather than "the engine cannot draw it") and they leave
 * the table's `true` too — no sheet names any of them, so no offer changes; what changes is that
 * the table stops claiming what the manifest denies. Twenty-five types in all, across three
 * engines.
 */
function deferredReason(
  engine: string,
  nativeType?: string,
): string | undefined {
  if (!nativeType) return undefined;
  return engineTypes(engine).find((t) => t.id === nativeType)?.deferred;
}

/**
 * A FORMAT THE ENGINE DOES NOT DECLARE, read off the same manifest — the format axis of the
 * question above, and the one this table was still answering wrong after the scrolly redirect was
 * narrowed. Enumerated at the time: `isLoopBuildable("dw-chart", "d3-bars", "scrolly")` answered
 * TRUE, because dw-chart's `supports` is a TYPE list and knows nothing about formats, while
 * dw-chart's manifest declares `static` and `interactive` only. No journalist saw it — the brain
 * drops such a candidate through eligibility's producer-format filter — but the table is the
 * arbiter, and an arbiter that answers "yes" for a form nothing renders is the same defect as the
 * scrolly over-claim, one axis over.
 *
 * The ENGINE'S own message when it wrote one (`unsupportedFormatMessage` — image-native's v1
 * sentence is the live case), because a pre-dispatch gate must not silently replace wording a
 * journalist may already know from the engine's own CLI.
 *
 * Fail-OPEN on an unregistered producer, deliberately: the same condition resolveBuilder already
 * lives with (producerForFormat falls back when getProducer answers nothing), so a caller that
 * has not imported skills/splash/src/register-producers gets the pre-registry answer here too
 * rather than a table that refuses everything.
 */
function unsupportedFormatReason(
  engine: string,
  format?: VisualFormat,
): string | undefined {
  if (!format) return undefined;
  const producer = getProducer(engine);
  if (!producer || producer.formats.includes(format)) return undefined;
  return (
    producer.unsupportedFormatMessage ??
    `${engine} does not build a ${format} — it builds ${producer.formats.join(", ")}`
  );
}

/**
 * THE ONE PLACE THE HOUSE STYLE LANDS ON WHAT THE LOOP BUILDS.
 *
 * It sits in the TABLE rather than inside each assembler for the reason the table exists at all:
 * this is the one module of lib/loop that is allowed to know about engines, and the charter is a
 * per-ENGINE ruling (`mergeProfileDefaults`'s `producer` option). Threaded into the seven
 * map-native types, the map-track scrolly, the charts and both hosted engines by ONE wrap, so a
 * new assembler inherits the charter by being in the table — it cannot forget to apply it.
 *
 * The wrap is applied on the way OUT of the assembler, on the composed spec/config, exactly like
 * the prose chain applies it on the way IN to produceAll. Both chains therefore run the same
 * function over the same field names (`baseColor`, `brandHue`, `brandPalette`, `palette`,
 * `themeBg`, `mapStyle`), which is what makes "the newsroom's charter" mean one thing.
 *
 * A null profile returns the entry's own assembler UNWRAPPED — an install that declared no house
 * style builds a byte-identical spec, with no clone and no extra object identity.
 */
function withHouseStyle(
  assemble: Assembler,
  engine: string,
  house: BrandProfile | null | undefined,
): Assembler {
  if (!house) return assemble;
  return (brief) => {
    const r = assemble(brief);
    // A refusal is left exactly as the assembler wrote it: there is nothing to paint, and
    // rewrapping it would put this seam in the middle of a message a journalist reads.
    if (!r.ok) return r;
    return {
      ...r,
      value: mergeProfileDefaults(
        r.value as Parameters<typeof mergeProfileDefaults>[0],
        house,
        { producer: engine },
      ),
    };
  };
}

export function assemblerFor(
  engine: string,
  nativeType?: string,
  format?: VisualFormat,
  /** The newsroom's declared house style (lib/newsroom/decor.ts's `Decor.house`). Absent or
   *  null ⇒ today's unbranded path, byte for byte. */
  house?: BrandProfile | null,
): Assembler | undefined {
  const entry = ASSEMBLERS[engine];
  if (!entry) return undefined;
  // The engine's own flag first: a type it declares unreachable is unreachable whatever this
  // table's entry says about the rest of its catalogue.
  if (deferredReason(engine, nativeType)) return undefined;
  if (unsupportedFormatReason(engine, format)) return undefined;
  // Gated on `nativeType`, not on `format`: an entry's `supports` is written to answer about a
  // TYPE, and calling it with none would ask map-native whether it builds "" — false, for an
  // engine it builds everything of. Callers with a format in hand have a type in hand too
  // (produce reads both off the chosen option; the offer's mark reads both off the candidate).
  if (nativeType && entry.supports && !entry.supports(nativeType, format))
    return undefined;
  return withHouseStyle(entry.assemble, engine, house);
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
  // The ENTRY's sentence wins over the manifest's: map-dw declares `symbol` deferred AND writes
  // the journalist's version of why ("Datawrapper shows a circle's value on hover only … build it
  // with map-native"). The manifest's reason is written for a maintainer, so it is the fallback,
  // not the answer — but it IS an answer, which is what stops a deferred type falling through to
  // the generic engine sentence.
  const deferred = deferredReason(engine, nativeType);
  return (
    ASSEMBLERS[engine]?.declines?.(nativeType, format) ??
    (deferred
      ? `${engine} declares "${nativeType}" but cannot build it — ${deferred}`
      : unsupportedFormatReason(engine, format))
  );
}
