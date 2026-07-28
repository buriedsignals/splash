// lib/brain/eligibility.ts
// The LEGAL SET. Four conditions, each measurable, each producing a readable reason when it
// excludes. Nothing semantic happens here — the intent never reaches this file, which is what
// guarantees a mis-read intent cannot change what is legal (spec §4.2).
import type { Channel, VisualFormat } from "../core/vocabulary";
import {
  allowedFormats,
  destinationOf,
  isFormatAllowed,
} from "../core/channel-policy";
import { getProducer, producerForFormat } from "../core/registry";
import { bgIsDark } from "../core/theme";
import type { CapabilityReadiness } from "../newsroom/readiness";
// The ONE list of engines production can build through — the same module produce.ts guards
// with, so a form this file offers unmarked is a form produce.ts accepts (C1).
import {
  isLoopBuildable,
  unbuildableEngineReason,
  LOOP_BUILDABLE_ENGINES,
} from "../loop/buildable";
// The drafter's own sentence for "an image scrolly needs your photographs" — read, never
// restated, so the offer's mark and the refusal a journalist would meet are one wording.
import { IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED } from "./beats";
import {
  renderableSheets,
  type RenderableSheet,
  type TypeSheet,
} from "./typology";
import type { Facts } from "./facts";

export type Candidate = {
  id: string;
  engine: string;
  key: string;
  format: VisualFormat;
  sheet: TypeSheet;
  readiness?: { status: CapabilityReadiness["status"]; reason: string };
  requires?: string[];
  /** How full this form is against its own cap, 0..1 (0 when the sheet declares no cap).
   *  Computed here because this is where both the facts and the limits are in hand; the
   *  ranking consumes the number without needing either. */
  fill: number;
};

export type Excluded = { id: string; reason: string };

export type EligibilityInput = {
  facts: Facts;
  channel: Channel;
  /** The decor's capability readiness. Absent ⇒ no CAPACITÉ marking (spec §10). */
  readiness?: CapabilityReadiness[];
  /** The house background: "dark" · "light" · or a #rrggbb hex colour. Absent or light ⇒ no
   *  style exclusion. Anything else throws — see isDark. */
  themeBg?: string;
  /** A format the journalist asked for explicitly. A FACT of the run, not an intent read from
   *  prose — so it constrains legality, not order (CLAUDE.md, Wave 7: "an explicit journalist
   *  format signal WINS"). Absent ⇒ no constraint. */
  requestedFormat?: VisualFormat;
};

// ── WHAT USED TO BE HERE, and why it is not ────────────────────────────────────────────────────
//
// `ARTICLE_BRANCH_ENGINES = new Set(["scrolly", "image-native"])` and an `ARTICLE_BRANCH`
// capability id, which put this mark on every scrolly candidate and every image-native one:
//
//   "this is the whole-article branch — it is not built yet, and it changes what gets delivered"
//
// Both halves were measured false on 2026-07-28 (lib/loop/scrolly-e2e.test.ts). A chart-track
// scrolly walks produce → capture → review → preview → approve → request-delivery → deliver with
// no code change, and what it delivers is one self-contained HTML file of the EMBED genre
// (lib/core/publishers.ts's DELIVERY_GENRE maps scrolly and interactive to the same one), routed
// to the same publishers, defaulting to the same destination, packaged with the same <iframe>
// snippet — the produced scrolly.html, byte for byte, inside the archive the newsroom is handed.
// Nothing under lib/delivery/ has ever special-cased a scrolly.
//
// A scrolly DOES take over the reader's scroll for its own height, which is a real editorial
// difference from a chart in a box. That is a difference in the READING, not in what is
// delivered, and it is expressed where it belongs: lib/loop/assemble/index.ts declares the
// scrolly host content-driven, and lib/verify/capture.ts measures it as such.
//
// `ARTICLE_BRANCH` was also not a NEWSROOM_CAPABILITIES id, so it rode in `requires` — the
// decor's CAPACITÉ axis, the list of things a newsroom can turn on — as a requirement no install
// could ever satisfy. A capability nobody can satisfy must not linger.
//
// image-native keeps a mark, for a reason of its OWN — see imageWalkMark below.

export function eligible(
  input: EligibilityInput,
  pairs: RenderableSheet[] = renderableSheets(),
): { eligible: Candidate[]; excluded: Excluded[]; refusal?: string } {
  // A format the channel does not allow is one refusal about the run, not 45 identical
  // refusals about 45 sheets. Named loudly; never silently downgraded to the default.
  if (
    input.requestedFormat &&
    !isFormatAllowed(input.channel, input.requestedFormat)
  )
    return {
      eligible: [],
      excluded: [],
      refusal: `you asked for a ${input.requestedFormat}, and the ${input.channel} channel does not carry that format — it allows ${allowedFormats(input.channel).join(", ")}`,
    };

  const out: Candidate[] = [];
  const excluded: Excluded[] = [];
  const seenExclusion = new Set<string>();
  const exclude = (id: string, reason: string) => {
    if (seenExclusion.has(id)) return;
    seenExclusion.add(id);
    excluded.push({ id, reason });
  };

  for (const { sheet, engine, key } of pairs) {
    // Channel-format legality is checked before the data limit: it depends only on the
    // sheet's declared formats and the channel, never on the facts, so a form whose EVERY
    // format is off-channel is off-channel regardless of whether the data would also have
    // broken one of its limits — the journalist should read the reason that actually drove
    // the refusal for this channel, not an unrelated data limit that happened to run first
    // (a bad limit is fixable with different data; a wrong channel needs a channel this
    // engine already renders — the cheaper, in-session fix is named first).
    const channelFormats = sheet.formats.filter((f) =>
      isFormatAllowed(input.channel, f),
    );
    if (channelFormats.length === 0) {
      exclude(
        sheet.id,
        `the ${input.channel} channel allows none of the formats this form comes in (${sheet.formats.join(", ")})`,
      );
      continue;
    }
    // The requested format, applied per sheet: a form that does not come in it is excluded
    // with a reason of its own, which is genuinely useful information.
    if (
      input.requestedFormat &&
      !channelFormats.includes(input.requestedFormat)
    ) {
      exclude(
        sheet.id,
        `you asked for a ${input.requestedFormat}, and this form does not come in that format (it comes in ${sheet.formats.join(", ")})`,
      );
      continue;
    }
    const wanted = input.requestedFormat
      ? channelFormats.filter((f) => f === input.requestedFormat)
      : channelFormats;
    // The KB sheet's `formats` is what the TYPE can conceptually be shown as; the engine's
    // OWN producer.formats is what it can actually build (dw-chart and map-dw have no
    // video producer, for instance). Without this second filter the legal set can rank a
    // format to the top that then dies at dispatch on unsupportedFormatMessage — the mirror
    // image of a silent drop: a loud offer of something that cannot be built. Narrowed here,
    // not merged with the channel check above, because a producer-format miss and a
    // channel-format miss are different refusals with different reasons; only an EMPTY
    // result after both is worth excluding the id over — a producer missing just ONE of
    // several still-legal formats leaves the id offered through its other formats.
    // The format's EFFECTIVE producer, not the sheet's engine: skills/scrolly hosts a native
    // engine's track, so a chart-native or map-native sheet declaring `scrolly` is built by
    // the scrolly producer and must not be dropped for a format its host engine never claims.
    const formats = wanted.filter(
      (f) =>
        getProducer(producerForFormat(engine, f))?.formats?.includes(f) ?? true,
    );
    if (formats.length === 0) {
      const renders = wanted
        .map((f) => `${f}: ${producerForFormat(engine, f)}`)
        .join(", ");
      exclude(
        sheet.id,
        `nothing renders this form in a format the ${input.channel} channel allows — the channel needs one of ${wanted.join(", ")} (${renders})`,
      );
      continue;
    }
    const limit = limitFailure(sheet, input.facts);
    if (limit) {
      exclude(sheet.id, limit);
      continue;
    }
    // Both Datawrapper engines share one physical limit: their background is plan-gated and
    // render-proven light-only (skills/splash/src/brand-profile.ts:33). "dw-chart only" was
    // the spec's first cut (§4.1); the governing condition is "physically impossible", which
    // is equally true of a Datawrapper MAP, so map-dw is excluded on the same reason.
    if (
      isDark(input.themeBg) &&
      (engine === "dw-chart" || engine === "map-dw")
    ) {
      exclude(
        sheet.id,
        "the house theme has a dark background and Datawrapper only renders on a light one",
      );
      continue;
    }
    // Print (issue #1), on the same "physically impossible" condition as the dark background
    // above. Datawrapper's PNG export goes through three fixed SCREEN boxes
    // (skills/dw-chart/src/export-aspect.ts EXPORT_SIZES); there is no print-density export, and
    // channelToAspect refuses the print channel by name rather than casting onto a box that does
    // not exist. Excluding here means the journalist never gets offered a form that would then
    // die at produce — the offer and the build agree, which is the whole point of this file.
    if (
      destinationOf(input.channel) === "print" &&
      (engine === "dw-chart" || engine === "map-dw")
    ) {
      exclude(
        sheet.id,
        "this deliverable is for print, and Datawrapper only exports at screen density",
      );
      continue;
    }
    const fill = fillRatio(sheet, input.facts);
    for (const format of formats)
      out.push(
        withMarks({ id: sheet.id, engine, key, format, sheet, fill }, input),
      );
  }
  // A sheet can pass through this loop more than once (one pass per engine it names), and a
  // refusal on ONE engine's pairing (a dark-theme dw-chart variant, say) must not read as
  // "this form is unavailable" when another engine's pairing for the SAME id came through
  // clean — a journalist has no interest in which of two interchangeable renderers was
  // refused, only in whether the form is offered at all. `Excluded` stays `{ id, reason }`
  // (downstream contracts depend on that shape), so the fix is applied at return time: an id
  // that made it into `out` by any route is not "excluded", full stop.
  const stillEligible = new Set(out.map((c) => c.id));
  const finalExcluded = excluded.filter((e) => !stillEligible.has(e.id));
  // A requested format can be channel-legal and still be a dead end: every surviving row is
  // marked unbuildable (buildabilityMark, the same resolveBuilder/isLoopBuildable path produce
  // and the offer's mark already use — no fourth resolution here). Without this, the offer
  // carried rows but no refusal, so nextActionsForElement routed back to choose-form forever
  // with no verb to escape a request the loop can never satisfy. The rows are NOT removed —
  // "marked, never removed" still holds — this refusal is an ADDITIONAL sentence explaining
  // the dead end, exactly like the channel-illegal refusal above explains a different one.
  if (
    input.requestedFormat &&
    out.length > 0 &&
    out.every((c) => buildabilityMark(c.engine, c.format, c.key) != null)
  )
    return {
      eligible: out,
      excluded: finalExcluded,
      refusal: `you asked for a ${input.requestedFormat}, and nothing on the ${input.channel} channel can build one yet — production only builds through ${LOOP_BUILDABLE_ENGINES.join(", ")} today`,
    };
  return { eligible: out, excluded: finalExcluded };
}

// A limit is only checked when the sheet declares it: an absent limit means "not constrained",
// never zero.
function limitFailure(sheet: TypeSheet, f: Facts): string | null {
  const l = sheet.limits;
  if (l.points != null && f.points !== l.points)
    return `this form needs exactly ${l.points} measured points per row, and the data has ${f.points}`;
  if (l.minPoints != null && f.points < l.minPoints)
    return `this form needs at least ${l.minPoints} points, and the data has ${f.points}`;
  if (l.maxPoints != null && f.points > l.maxPoints)
    return `this form takes at most ${l.maxPoints} points, and the data has ${f.points}`;
  if (l.maxSeries != null) {
    // facts.series === facts.rows always (facts.ts) — the row count is what "series" measures
    // for a wide sheet with no separate row axis (a slope/dumbbell-style CSV: one row PER
    // series). But a sheet that ALSO caps `maxCategories` has already claimed the row axis for
    // categories — chart-selection.md documents grouped-bar/stacked-bar/marimekko's own CSV
    // shape as "first column = category [rows], every following numeric column = a series
    // [columns]" — so on THOSE sheets "series" means the numeric-column count (facts.points),
    // never the row count. Checking rows for both would compare the identical number against
    // two different ceilings and could name the wrong one to the journalist reading the refusal
    // (spec A17). This branches on the sheet's OWN declared shape, not a guess.
    const seriesCount = l.maxCategories != null ? f.points : f.series;
    if (seriesCount > l.maxSeries)
      return `this form stays readable up to ${l.maxSeries} series, and the data has ${seriesCount}`;
  }
  if (l.maxCategories != null && f.rows > l.maxCategories)
    return `this form stays readable up to ${l.maxCategories} categories, and the data has ${f.rows}`;
  if (l.minRows != null && f.rows < l.minRows)
    return `this form needs at least ${l.minRows} rows to read as one, and the data has ${f.rows}`;
  return null;
}

// How close a form runs to its own readability cap. A slope carrying 11 of its 12 lines is
// legal and cramped; one carrying 4 is legal and comfortable, and that difference is worth an
// ordering nudge (never a legality one). No cap declared ⇒ NEUTRAL (0.5), not best: `fill`
// means "how cramped, lower is better" on [0,1] — 0 would claim a roominess the sheet never
// earned, letting every uncapped sheet automatically out-rank every capped one (including the
// FT-canonical slope/dumbbell for two-point data) regardless of how comfortably either actually
// fits. 0.5 claims nothing: it sits below a genuinely roomy capped form and above a cramped one.
function fillRatio(sheet: TypeSheet, f: Facts): number {
  const l = sheet.limits;
  const cap = l.maxSeries ?? l.maxCategories;
  if (cap == null || cap <= 0) return 0.5;
  // Mirrors limitFailure's shape-aware read of `maxSeries` (A17): a sheet that caps BOTH
  // measures its series from the numeric columns, not the row count already claimed by
  // maxCategories.
  const used =
    l.maxSeries != null
      ? l.maxCategories != null
        ? f.points
        : f.series
      : f.rows;
  return Math.min(1, used / cap);
}

// CAPACITÉ and the article branch MARK, they never remove: the worst status among what a form
// requires is the status of the form (the rule already in lib/loop/propose.ts).
// Exported: rank.ts grades its readiness penalty on this same ordinal, rather than defining a
// second one that could drift from it.
export const SEVERITY = {
  ready: 0,
  unverified: 1,
  disabled: 2,
  missing: 3,
} as const;

// readiness.ts:54 deliberately returns reason:"" for a capability the newsroom simply switched
// off — "disabled" is not a failure, so it earns no actionable sentence there. But a mark on a
// candidate is read by a journalist, and a mark with nothing to say is exactly the silent
// degradation this design refuses (spec §8, "jamais silencieusement retirée" — the same
// principle applies to a mark left wordless). So the empty case is repaired HERE, at the one
// place a bare status becomes a sentence a journalist reads.
function markReason(r: {
  status: CapabilityReadiness["status"];
  reason: string;
  label: string;
}): string {
  if (r.reason) return r.reason;
  return `${r.label} is not turned on for this newsroom`;
}

/** The mark a form earns when nothing in the loop can build it. Resolved on the EFFECTIVE
 *  producer, not the sheet's engine: skills/scrolly hosts a native engine's track, so a
 *  chart-native form in the scrolly format is not a chart-native build. Exported because it was
 *  once the only level at which the rule was observable: an article-branch mark shared its
 *  severity and was pushed first, masking it for every scrolly candidate. That mark is gone, so
 *  eligible() shows this one now — the export stays as the unit-level probe, on fixtures the
 *  real KB cannot express.
 *
 *  `nativeType` narrows the check to what the loop can actually compose a spec for, not just
 *  the engine as a whole — an engine can be wired while only some of its types are (map-native's
 *  seven types land in families), and the day that happens an unmarked type-mismatch here is
 *  the same dead end this file already guards one level up. Optional so every existing caller
 *  without a type in hand still answers for the engine, unchanged. */
export function buildabilityMark(
  engine: string,
  format: VisualFormat,
  nativeType?: string,
): { status: CapabilityReadiness["status"]; reason: string } | null {
  const builder = producerForFormat(engine, format);
  // The FORMAT travels into the check, not only into the builder resolution: an engine can be
  // wired in one format and not another, and an unmarked pairing that dead-ends at produce is the
  // exact defect this mark exists to prevent.
  //
  // dw-chart WAS that case and no longer is. Its interactive form is a hosted Datawrapper embed
  // with no file the newsroom owns, and while the run manifest could only record an artifact by
  // PATH the pairing was marked, because produce() answered "no interactive artifact in the
  // delivery" for a chart Datawrapper had published perfectly well. The manifest now records a
  // hosted delivery as the URL it is (ArtifactRecordSchema, lib/loop/manifest.ts) and produce()
  // writes it, so isLoopBuildable answers true for both formats and neither is marked here.
  //
  // WHAT IS STILL TRUE, because a reader of this comment needs the live limit and not just the
  // history: the loop RECORDS a hosted delivery, but it cannot act on one. capture records a gap
  // instead of measuring it, and preview, approve and deliver each refuse it by name — there are
  // no bytes to present, to sign, or to hand a publisher. That is a limit of the verification
  // chain, not of the OFFER, which is why it is not a mark: the journalist can legitimately be
  // shown this form, and the refusal they eventually meet names the URL they can use.
  //
  // No format restriction survives in the table today (lib/loop/assemble/index.ts). The format
  // still travels because the entries are per-(type, format) pairings and the next engine wired
  // in one format and not another must be marked, not discovered at produce.
  if (isLoopBuildable(builder, nativeType, format)) return null;
  return {
    status: "missing",
    reason: unbuildableEngineReason(builder, nativeType, format),
  };
}

/**
 * THE MARK IMAGE-NATIVE EARNS — the only thing left of what the article-branch mark used to say,
 * and it says something else entirely.
 *
 * image-native's only format is `scrolly`, and its walk is one beat per photograph the journalist
 * declares WITH THE RUN. That is a fact about the run's INPUT, and this file cannot see it:
 * `EligibilityInput` carries facts, channel, readiness and themeBg — deliberately, so a mis-read
 * intent cannot change what is legal — and `run.input.images` is not among them.
 *
 * So the form cannot be offered clean. Measured: with no photographs declared,
 * `nextActionsForElement` answers `draft-beats`, `draftBeats` refuses, and the run answers the
 * same impossible action forever — `deadEndReason` is consulted only on "choose-form"
 * (lib/loop/driver.ts), so nothing catches it. A clean offer would strand the run.
 *
 * NOT added to `requires`, for buildabilityMark's reason: that list is the decor's CAPACITÉ axis
 * (ids a newsroom can turn on), and no newsroom setting declares a photograph. The sentence is
 * the DRAFTER'S OWN (lib/brain/beats.ts), so the offer's mark and the refusal a journalist would
 * eventually meet are one wording, not two.
 *
 * FOLLOW-UP, named rather than left implicit: the day `eligible()` is given the run's declared
 * inputs, this mark should fire only for a run that has none — a run that HAS declared its
 * photographs is being warned about a condition it already satisfies.
 */
function imageWalkMark(
  engine: string,
): { status: CapabilityReadiness["status"]; reason: string } | null {
  if (engine !== "image-native") return null;
  return { status: "missing", reason: IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED };
}

function withMarks(c: Candidate, input: EligibilityInput): Candidate {
  const requires = [c.engine];
  // Order matters: `worst` below keeps the FIRST mark of the highest severity, and several
  // marks can share it. The photographs mark leads because it is the one a journalist can ACT
  // on; the engine-wiring reason below is about what production cannot do for them.
  const marks: { status: CapabilityReadiness["status"]; reason: string }[] = [];
  const walkMark = imageWalkMark(c.engine);
  if (walkMark) marks.push(walkMark);
  // The engine exists and renders this type — but the loop's produce verb cannot assemble a
  // spec for it yet, so choosing it would dead-end. MARKED, exactly like a missing capability:
  // the journalist still learns the form is the right one for this data (P1 — the tool offers,
  // the journalist decides), and the day produce wires the engine the mark disappears with no
  // change here. NOT added to `requires`: that list is the decor's CAPACITÉ axis (ids a
  // newsroom can turn on), and no newsroom setting can make this true.
  const engineMark = buildabilityMark(c.engine, c.format, c.key);
  if (engineMark) marks.push(engineMark);
  for (const r of input.readiness ?? [])
    if (requires.includes(r.id) && r.status !== "ready")
      marks.push({ status: r.status, reason: markReason(r) });
  if (marks.length === 0) return { ...c, requires };
  const worst = marks.reduce((a, b) =>
    SEVERITY[b.status] > SEVERITY[a.status] ? b : a,
  );
  return { ...c, requires, readiness: worst };
}

// The house ground is "light", "dark", or any #rrggbb (skills/splash/src/brand-profile.ts:35)
// — exactly three accepted forms. brand-profile.ts validates its own load path down to those
// three and silently drops anything else to the light default; EligibilityInput.themeBg is a
// bare `string` a caller can hand ANYTHING, so this file re-asserts the same three forms
// itself, failing loud rather than failing open. A silently-accepted "midnight" would fall
// through to isDark's dead-end regex and read as light, offering Datawrapper on a background
// it cannot actually render on — exactly the physically-impossible case this check exists to
// catch, just reached via a malformed value instead of a real dark colour.
//
// Validation is this file's job; the DECISION is not. "Is this ground dark" is answered for the
// whole codebase by lib/core/theme's bgIsDark — the resolver every renderer routes through when
// it picks a basemap or derives furniture. This function once carried its own luminance test at
// a different threshold (< 0.5 against bgIsDark's < 0.4), so on the band between them (#B4B4B4,
// #AAAAAA…) the brain called a ground dark and dropped both Datawrapper engines while the
// renderer treated the same ground as light: a newsroom on a light-grey house ground silently
// lost dw-chart/map-dw on a false premise. Failing loud and delegating are not in conflict —
// the three accepted FORMS are still asserted here, and only the luminance call is delegated.
function isDark(themeBg?: string): boolean {
  if (!themeBg) return false;
  const t = themeBg.trim();
  // A bare 6-hex (no "#") has always been accepted here; normalise it so the shared resolver,
  // which requires the "#", sees the same colour rather than silently reading it as light.
  const hex = /^#?([0-9a-f]{6})$/i.exec(t);
  if (t !== "dark" && t !== "light" && !hex)
    throw new Error(
      `themeBg must be "dark", "light", or a #rrggbb hex colour — got ${JSON.stringify(themeBg)}`,
    );
  return bgIsDark(hex ? `#${hex[1]}` : t);
}
