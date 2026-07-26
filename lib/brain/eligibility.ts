// lib/brain/eligibility.ts
// The LEGAL SET. Four conditions, each measurable, each producing a readable reason when it
// excludes. Nothing semantic happens here — the intent never reaches this file, which is what
// guarantees a mis-read intent cannot change what is legal (spec §4.2).
import type { Channel, VisualFormat } from "../core/vocabulary";
import { isFormatAllowed } from "../core/channel-policy";
import { getProducer, producerForFormat } from "../core/registry";
import { bgIsDark } from "../core/theme";
import type { CapabilityReadiness } from "../newsroom/readiness";
// The ONE list of engines production can build through — the same module produce.ts guards
// with, so a form this file offers unmarked is a form produce.ts accepts (C1).
import { isLoopBuildable, unbuildableEngineReason } from "../loop/buildable";
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
};

// The engines whose output is a narrative page rather than an embeddable element. Until the
// article branch exists they are offered MARKED, never dropped (spec §8).
const ARTICLE_BRANCH_ENGINES = new Set(["scrolly", "image-native"]);
const ARTICLE_BRANCH = "article-branch";

export function eligible(
  input: EligibilityInput,
  pairs: RenderableSheet[] = renderableSheets(),
): { eligible: Candidate[]; excluded: Excluded[] } {
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
    const formats = channelFormats.filter(
      (f) =>
        getProducer(producerForFormat(engine, f))?.formats?.includes(f) ?? true,
    );
    if (formats.length === 0) {
      const renders = channelFormats
        .map((f) => `${f}: ${producerForFormat(engine, f)}`)
        .join(", ");
      exclude(
        sheet.id,
        `nothing renders this form in a format the ${input.channel} channel allows — the channel needs one of ${channelFormats.join(", ")} (${renders})`,
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
  return {
    eligible: out,
    excluded: excluded.filter((e) => !stillEligible.has(e.id)),
  };
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
  if (l.maxSeries != null && f.series > l.maxSeries)
    return `this form stays readable up to ${l.maxSeries} series, and the data has ${f.series}`;
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
  const cap = sheet.limits.maxSeries ?? sheet.limits.maxCategories;
  if (cap == null || cap <= 0) return 0.5;
  const used = sheet.limits.maxSeries != null ? f.series : f.rows;
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
 *  chart-native form in the scrolly format is not a chart-native build. Exported because the
 *  mark it returns is masked inside a full `eligible()` call — the article-branch mark shares
 *  its severity and is pushed first — so this is the only level at which the rule is
 *  observable. */
export function buildabilityMark(
  engine: string,
  format: VisualFormat,
): { status: CapabilityReadiness["status"]; reason: string } | null {
  const builder = producerForFormat(engine, format);
  if (isLoopBuildable(builder)) return null;
  return { status: "missing", reason: unbuildableEngineReason(builder) };
}

function withMarks(c: Candidate, input: EligibilityInput): Candidate {
  const requires = [
    c.engine,
    ...(ARTICLE_BRANCH_ENGINES.has(c.engine) || c.format === "scrolly"
      ? [ARTICLE_BRANCH]
      : []),
  ];
  // Order matters: `worst` below keeps the FIRST mark of the highest severity, and several
  // marks can share it. The article-branch mark leads because it is the one that tells the
  // journalist what they would be GETTING (a whole narrative page, not an embeddable element);
  // the engine-wiring reason below is the same "not yet" said in production's terms.
  const marks: { status: CapabilityReadiness["status"]; reason: string }[] = [];
  // The branch does not exist yet — and whether it exists is a fact about THIS BUILD, never
  // about what the run asked for. This used to fire only when `input.route !== "article"`,
  // i.e. it was conditioned on the journalist's declared intent: a manifest saying
  // route:"article" got the narrative forms offered CLEAN, buildable by nobody. `route` is
  // gone from this file's input entirely, so the condition cannot come back by accident.
  if (requires.includes(ARTICLE_BRANCH))
    marks.push({
      status: "missing",
      reason:
        "this is the whole-article branch — it is not built yet, and it changes what gets delivered",
    });
  // The engine exists and renders this type — but the loop's produce verb cannot assemble a
  // spec for it yet, so choosing it would dead-end. MARKED, exactly like a missing capability:
  // the journalist still learns the form is the right one for this data (P1 — the tool offers,
  // the journalist decides), and the day produce wires the engine the mark disappears with no
  // change here. NOT added to `requires`: that list is the decor's CAPACITÉ axis (ids a
  // newsroom can turn on), and no newsroom setting can make this true.
  const engineMark = buildabilityMark(c.engine, c.format);
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
