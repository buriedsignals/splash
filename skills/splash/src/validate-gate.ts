// Tier-0 floor gate #1 — VALIDATION. The spine runs the producer's own validator on
// every accepted spec ITSELF, so a host that hand-rolled a spec and skipped the
// suggest-chart self-check (observed in 4/5 manual sessions) cannot ship an invalid or
// weak spec. This lives in CODE, at the spine, precisely because prose in a SKILL.md
// cannot force an LLM host to validate.
import type { AcceptedProposal } from "./producer-spec";
import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { validateMapSpec } from "../../map-dw/src/map-spec";
import {
  validateChoroplethConfig,
  validateSymbolConfig,
  validateLocatorConfig,
  validateRouteConfig,
  validateDotDensityConfig,
  validateHexGridConfig,
  validateCartogramConfig,
} from "../../map-native/src/validate-config";
import {
  specToNativeConfig,
  UnsupportedNativeType,
  type NativeSpec,
} from "../../chart-native/src/spec-to-config";
import {
  narrativeBeatErrors,
  narrativeBeatWarnings,
} from "../../chart-native/src/chart-story";
import {
  checkImageConformance,
  type ImageStory,
  type ImageFormat,
} from "../../image-native/src/image-story";
import {
  placeholderSourceReason,
  sourceNamePreservedReason,
  sourceUrlFidelityReason,
  droppedSourceHintWarning,
} from "./source-guard";
import { guardrailParityViolations } from "./guardrail-parity";

export type ValidationOutcome =
  { ok: true; warnings: string[] } | { ok: false; errors: string[] };

// Every producer validator returns this shape (ok+spec+warnings | errors); we keep only
// ok/warnings/errors — the re-parsed spec is not needed here.
type RawResult =
  | { ok: true; warnings: string[]; spec?: unknown }
  | { ok: false; errors: string[] };

function strip(r: RawResult): ValidationOutcome {
  return r.ok
    ? { ok: true, warnings: r.warnings }
    : { ok: false, errors: r.errors };
}

// map-native is a discriminated family; pick the validator by the config's `type`
// (absent ⇒ choropleth, the mount default).
function validateMapNative(spec: unknown): ValidationOutcome {
  const type = (spec as { type?: string } | null)?.type;
  switch (type) {
    case "symbol":
      return strip(validateSymbolConfig(spec));
    case "locator":
      return strip(validateLocatorConfig(spec));
    case "route":
      return strip(validateRouteConfig(spec));
    case "dot-density":
      return strip(validateDotDensityConfig(spec));
    case "hex-grid":
      return strip(validateHexGridConfig(spec));
    case "cartogram":
      return strip(validateCartogramConfig(spec));
    default:
      return strip(validateChoroplethConfig(spec));
  }
}

// chart-native validates by construction: specToNativeConfig runs validateShape and
// throws UnsupportedNativeType for a type it cannot map. An unmapped type is NOT a
// validation failure — it is the FALLBACK_TO_DW path the dispatch already handles — so it
// passes here; only a genuinely malformed spec (bad shape) is rejected.
function validateNative(spec: unknown): ValidationOutcome {
  try {
    specToNativeConfig(spec as NativeSpec);
    return { ok: true, warnings: [] };
  } catch (e) {
    if (e instanceof UnsupportedNativeType) return { ok: true, warnings: [] };
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }
}

// scrolly mirrors Scrolly.tsx's own dispatch: a chart-track config carries `nativeType`
// and IS a chart-native NativeSpec (validate by construction, NOT as a DW ChartSpec); a
// map-track config is one of the map-native family (dispatch by `type`, choropleth
// default). Anything else here silently blocked valid symbol/hex-grid/dot-density/
// locator/cartogram and chart scrollies.
// The chart track ALSO validates any explicit journalist beat plan (`spec.beats`,
// narrative control) against the data HERE — same fail-loud philosophy as dw-chart's
// annotation-domain tripwire: a typo'd x/category must fail at the spine gate (5a),
// never surface after production.
function validateScrolly(spec: unknown): ValidationOutcome {
  const hasNativeType =
    typeof (spec as { nativeType?: unknown } | null)?.nativeType === "string";
  if (hasNativeType) {
    const outcome = validateNative(spec);
    const beatErrors = narrativeBeatErrors(spec as NativeSpec);
    if (beatErrors.length)
      return {
        ok: false,
        errors: [...(outcome.ok ? [] : outcome.errors), ...beatErrors],
      };
    // Advisory: flag a bar walk whose rendered order does not follow the beats (an
    // explicit sort contradicting the geographic beat order, or a regression) — a
    // warning surfaced at the render gate, never a hard fail.
    if (outcome.ok) {
      const beatWarnings = narrativeBeatWarnings(spec as NativeSpec);
      if (beatWarnings.length)
        return { ok: true, warnings: [...outcome.warnings, ...beatWarnings] };
    }
    return outcome;
  }
  // The explicit `beats` override is CHART-track narrative control. The map track
  // derives its own story (deriveMapStory) and would silently IGNORE the field —
  // the exact flow failure the override exists to close — so reject it loud.
  if ((spec as { beats?: unknown } | null)?.beats !== undefined)
    return {
      ok: false,
      errors: [
        "explicit `beats` override is not supported on the map scrolly track " +
          "(chart-track line/bar narrative control only) — remove it; map scrolly " +
          "steps are derived from the data (deriveMapStory)",
      ],
    };
  return validateMapNative(spec);
}

// image-native (C5): the spec IS the ImageStory manifest — run the engine's own
// render-free conformance HERE, scoped by the proposal's pinned format (the frame
// floor differs per format, spec §6.3). "interactive" is refused mechanically: an
// image sequence has no data to explore (spec §2 non-goal — the engine's grid is
// static/video/scrolly, never interactive), so no ImageFormat maps to it.
function validateImageNative(
  spec: unknown,
  format: AcceptedProposal["format"],
): ValidationOutcome {
  if (format === "interactive") {
    return {
      ok: false,
      errors: [
        'image-native has no "interactive" format — an image sequence has no data to ' +
          "explore (spec §2); pin scrolly (or static/video, follow-ups) instead",
      ],
    };
  }
  const violations = checkImageConformance(spec as ImageStory, {
    format: format as ImageFormat,
  });
  return violations.length
    ? { ok: false, errors: violations }
    : { ok: true, warnings: [] };
}

// GUARD 2 — placeholder source URL. Every producer spec carries `source: { name, url? }`
// (dw-chart, chart-native, map-dw, map-native, and both scrolly track kinds). A source
// URL whose host is an RFC 2606/6761 reserved placeholder domain (…example.com, .test,
// localhost, …) is a fabricated citation — reject it hard at the spine, for EVERY
// producer, before any producer runs. Only a PRESENT placeholder is caught; a missing URL
// is left to the producers' own leniency / Gate 2c (so the honest name-only prose
// fallback still passes).
function placeholderSourceError(spec: unknown): string | null {
  const url = (spec as { source?: { url?: unknown } } | null)?.source?.url;
  if (typeof url !== "string") return null;
  return placeholderSourceReason(url);
}

// GUARD 3 — Gate 1b presence lever. Every accepted proposal must carry the takeaway the
// journalist EXPLICITLY confirmed at CADRAGE Gate 1b, VERBATIM, as `confirmedTakeaway`.
// Whether the title semantically MATCHES that takeaway is not mechanizable (render-review's
// job, Gate 3a) — but its PRESENCE is: a proposal without one cannot prove Gate 1b ever
// fired, and the render-review has nothing authoritative to quote the title against.
// Required on ALL proposals (no guided/direct flag exists on the contract, and Gate 1b is
// un-skippable on both branches anyway). `confirmedTakeaway` is typed `string` but arrives
// via untyped JSON.parse at the CLI seam, so non-string/empty are both checked here.
function missingConfirmedTakeawayError(p: AcceptedProposal): string | null {
  const takeaway: unknown = p.confirmedTakeaway;
  if (typeof takeaway === "string" && takeaway.trim() !== "") return null;
  return (
    "missing confirmedTakeaway — every accepted proposal must record, VERBATIM, the " +
    "takeaway the journalist explicitly confirmed at CADRAGE Gate 1b (un-skippable on " +
    "both branches); confirm the takeaway with the journalist and set it before producing"
  );
}

// GUARD 3b — Gate 1b duplicate tripwire. One element = one confirmedTakeaway: on a
// multi-element batch, two proposals carrying the byte-identical confirmedTakeaway
// string mean one combined takeaway was stamped onto several elements (the Wave-9
// shipped miss) — Gate 1b never confirmed a claim FOR THIS element, and the Gate-3a
// title check would compare each title against a claim that partly belongs to another
// visual. Exact (byte-identical) match only — semantic overlap is not mechanizable.
// Absence/emptiness is GUARD 3's finding; this guard only compares present takeaways.
// Single-element batches are unaffected by construction.
//
// ONE sanctioned twin shape: a step-12 re-format entry (`<id>`/`<id>-<format>`, splash
// SKILL.md Step 12) copies the confirmedTakeaway VERBATIM because it is the SAME element
// produced in another format, not a second element — Gate 1b's one-takeaway-per-element
// invariant is not violated. Two entries sharing the base id after stripping a trailing
// format suffix are that twin; every other duplicate stays refused.
const FORMAT_SUFFIX = /-(static|interactive|video|scrolly)$/;

// The base id a step-12 re-format entry derives from — ONLY when its id suffix matches the
// entry's OWN pinned format (step 12 prescribes `id = <original-id>-<newformat>`, so the
// sanctioned shape satisfies this by construction). A suffix that contradicts the pinned
// format (`id: "el-video", format: "static"`) is NOT a twin — that shape can only come from
// an id chosen to dodge the duplicate guard (review F7).
function reFormatBase(p: AcceptedProposal): string | null {
  const id = String(p.id);
  const m = id.match(FORMAT_SUFFIX);
  if (!m || m[1] !== p.format) return null;
  return id.slice(0, -(m[1].length + 1));
}

function isReFormatTwin(a: AcceptedProposal, b: AcceptedProposal): boolean {
  const idA = String(a.id);
  const idB = String(b.id);
  if (idA === idB) return false;
  const baseA = reFormatBase(a);
  const baseB = reFormatBase(b);
  // One derives from the other, or both derive from the same original (a multi-format
  // family produced across step-12 cycles). Ids are self-reported — the format-consistency
  // check above is the mechanical floor, not a trust boundary.
  return (
    (baseA !== null &&
      (baseA === idB || (baseB !== null && baseA === baseB))) ||
    (baseB !== null && baseB === idA)
  );
}

function duplicateConfirmedTakeawayError(
  p: AcceptedProposal,
  batch: AcceptedProposal[],
): string | null {
  const takeaway: unknown = p.confirmedTakeaway;
  if (typeof takeaway !== "string" || takeaway.trim() === "") return null;
  const twin = batch.find(
    (other) =>
      other !== p &&
      other.confirmedTakeaway === takeaway &&
      !isReFormatTwin(p, other),
  );
  if (!twin) return null;
  return (
    `duplicate confirmedTakeaway — proposals "${p.id}" and "${twin.id}" carry the ` +
    "byte-identical confirmed takeaway; Gate 1b confirms ONE takeaway PER accepted " +
    "element (never a shared combined string). Confirm and record THIS element's OWN " +
    "claim before producing"
  );
}

// GUARD 4 — claim-grounding tripwire (Gate 1b/3a, mechanical leg). The confirmedTakeaway/title
// can embed a numeric or temporal CLAIM the spec never encodes (the energie case: a "70% target
// by 2035" while the data tops out at 48% and ends in 2023). The title↔takeaway TEXT-agreement
// probe passes vacuously — neither is checked against the DATA domain. This is the same fail-loud
// stance as dw-chart's annotation-y-domain tripwire (spec-to-metadata.ts): a number the chart
// cannot possibly show, and that no annotation/reference line pins, is a defect, not a caption.
//
// NARROW by design (only numeric-out-of-domain; qualitative divergence stays for human review):
//   - 4-digit years are checked against the x-axis ONLY when the x-axis is time (its header names
//     a time field, or every x value is a calendar year) — a year outside [xMin, xMax] fires.
//   - other values (%, value+unit, plain numbers) are checked against the plotted y-domain and
//     fire ONLY when they EXCEED yMax — the over-claim / projection direction. Below-min values
//     are NOT flagged, so a legitimate delta ("+14 Prozentpunkte", 14 < the 34% floor) never
//     false-fires. A number matching an annotation / reference-line value is treated as backed.
// The domain is read from the spec's CSV `data` when present (chart producers + map-dw, whose
// MapSpec.data is CSV text), else from `rows[valueField]` (map-native joined configs). The guard
// no-ops (returns []) for any spec carrying neither (locator/route/symbol point configs, GeoJSON
// blobs), so it only bites the producers whose value domain it can actually read.

// Strip typographic grouping separators (regular/no-break/narrow spaces) and resolve the
// decimal separator (fr/de "1,5" → 1.5; "17.600"/"17,600" grouping → 17600). Returns NaN when
// the token is not a clean number (caller filters).
function parseLocaleNumber(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // the rightmost separator is the decimal point; the other groups thousands
    if (s.lastIndexOf(",") > s.lastIndexOf("."))
      s = s.replace(/\./g, "").replace(/,/g, ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = /^\d{1,3}(,\d{3})+$/.test(s)
      ? s.replace(/,/g, "")
      : s.replace(/,/g, ".");
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  return Number(s);
}

// A calendar year we would check against a time x-axis. Kept narrow (1900–2099) so a 2-digit
// percentage or a small count is never misread as a year.
function looksLikeYear(v: number): boolean {
  return Number.isInteger(v) && v >= 1900 && v <= 2099;
}

interface NumberToken {
  raw: string;
  value: number;
}

// Extract number-like tokens from prose. Internal separators are '.'/',' and the typographic
// thin/no-break spaces used for grouping — NOT a regular space, so two space-separated years
// ("2015 2016") never merge into one bogus 8-digit value.
function extractNumberTokens(text: string): NumberToken[] {
  const out: NumberToken[] = [];
  const re = /\d[\d.,   ]*\d|\d/g;
  for (const m of text.matchAll(re)) {
    const value = parseLocaleNumber(m[0]);
    if (Number.isFinite(value)) out.push({ raw: m[0], value });
  }
  return out;
}

// Numbers a spec ENCODES via annotations / reference lines — a takeaway number matching one of
// these is grounded (the chart shows it), so it is exempt from the domain check. Reads the
// numeric x/y/value of each annotation and any numbers embedded in its text/label, defensively.
function encodedBackingNumbers(spec: Record<string, unknown>): Set<number> {
  const backed = new Set<number>();
  const add = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) backed.add(v);
  };
  const addFromText = (v: unknown) => {
    if (typeof v === "string")
      for (const t of extractNumberTokens(v)) backed.add(t.value);
  };
  for (const key of [
    "annotations",
    "referenceLines",
    "refLines",
    "reference",
  ]) {
    const arr = spec[key];
    if (!Array.isArray(arr)) continue;
    for (const a of arr) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      add(o.x);
      add(o.y);
      add(o.value);
      addFromText(o.text);
      addFromText(o.label);
    }
  }
  return backed;
}

// Parse the spec's CSV `data` into an x-domain (+ whether it is time) and a y-max across every
// numeric non-x column. Returns null when there is nothing groundable (no CSV / no numeric data).
function csvDomain(csv: string): {
  xIsTime: boolean;
  xMin?: number;
  xMax?: number;
  yMax?: number;
} | null {
  const trimmed = csv.trim();
  // A JSON / GeoJSON blob (map producers) is not a groundable CSV table — bail so the guard
  // stays a strict no-op there rather than mining coordinates as a bogus value domain.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;
  const rows = trimmed.split(/\r?\n/).map((r) => r.split(","));
  if (rows.length < 2) return null;
  const header = rows[0].map((c) => c.trim());
  const body = rows.slice(1).map((r) => r.map((c) => c.trim()));
  const xRaw = body.map((r) => r[0] ?? "");
  const xNums = xRaw.map(parseLocaleNumber).filter(Number.isFinite);
  const headerIsTime =
    /^(year|annee|année|jahr|anno|ano|date|time|periode|période|mois|month|jour|day)/i.test(
      header[0] ?? "",
    );
  const allXAreYears =
    xNums.length === xRaw.length &&
    xNums.length > 0 &&
    xNums.every(looksLikeYear);
  const xIsTime = headerIsTime || allXAreYears;
  const yNums: number[] = [];
  for (const r of body)
    for (let i = 1; i < r.length; i++) {
      const n = parseLocaleNumber(r[i] ?? "");
      if (Number.isFinite(n)) yNums.push(n);
    }
  if (xNums.length === 0 && yNums.length === 0) return null;
  return {
    xIsTime,
    xMin: xNums.length ? Math.min(...xNums) : undefined,
    xMax: xNums.length ? Math.max(...xNums) : undefined,
    yMax: yNums.length ? Math.max(...yNums) : undefined,
  };
}

// map-native configs carry no CSV: their joined values live in rows[valueField] — the
// choropleth-style shape (ChoroplethData, choropleth-geo.ts; dot-density shares it). Hex-grid
// (points[]) and cartogram (values[].value) carry other shapes and are NOT read here — their
// value claims stay ungrounded (follow-up), same as locator/route/symbol.
// Domain = the numeric values of that one field; no time axis exists on this path, so the
// year check never applies (value-exceeds-max only — xIsTime is pinned false so the shape
// matches csvDomain's exactly and the year branch skips). Returns null for any config
// without rows/valueField so the guard stays a strict no-op there — including a TYPO'D
// valueField: a null/absent/empty cell is SKIPPED, never coerced (String(undefined ?? "") is
// "" and Number("") is 0 — the coercion bug that once made a typo'd field yield yMax:0 and
// false-fire on a validator-clean dot-density spec).
function rowsDomain(spec: Record<string, unknown>): {
  xIsTime: boolean;
  xMin?: number;
  xMax?: number;
  yMax?: number;
} | null {
  const rows = spec.rows;
  const valueField = spec.valueField;
  if (!Array.isArray(rows) || typeof valueField !== "string") return null;
  const values: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const v = (row as Record<string, unknown>)[valueField];
    if (v == null || (typeof v === "string" && !v.trim())) continue;
    const n = typeof v === "number" ? v : parseLocaleNumber(String(v));
    if (Number.isFinite(n)) values.push(n);
  }
  if (!values.length) return null;
  return { xIsTime: false, yMax: Math.max(...values) };
}

const CLAIM_EPS = 1e-9;

// Age bands ("over-55s", "unter 35", "les plus de 55 ans", "55-Jährigen", "65 anni e oltre")
// are COHORT LABELS, never plotted magnitudes — same false-positive class as durations (a
// "55" cohort was compared to a 48% max, re-pressuring a confirmed takeaway, 2026-07-17 KI run).
const AGE_BAND_RE =
  /(?:\b(?:over|under|unter|über|oltre|sotto|moins\s+de|plus\s+de)[-\s]*\d+s?\b)|(?:\d+[-\s]*(?:j[äa]hrigen?|year[-\s]?olds?)\b)|(?:\d+\s+ans\s+et\s+plus\b)|(?:\d+\s+anni\s+e\s+oltre\b)/giu;

// number + (optional "last/next"-style adjective) + a duration unit, fr/en/de/it.
const DURATION_PHRASE_RE =
  /\d[\d.,\s]*\s*(?:derni[eè]re?s?\s+|prochaines?\s+|last\s+|next\s+|letzten?\s+|ultimi?\s+)?(?:ans?\b|ann[ée]es?\b|years?\b|yrs?\b|mois\b|months?\b|jours?\b|days?\b|semaines?\b|weeks?\b|heures?\b|hours?\b|Jahren?\b|Monaten?\b|Tagen?\b|Wochen\b|anni\b|anno\b|mesi\b|mese\b|giorni\b|giorno\b|settimane\b|ore\b)/giu;

function claimGroundingErrors(p: AcceptedProposal): string[] {
  const spec = p.spec;
  if (!spec || typeof spec !== "object") return [];
  const s = spec as Record<string, unknown>;
  const csv = typeof s.data === "string" ? s.data : undefined;
  // Chained, not either/or: a stray non-groundable `data` string on a map spec (e.g. a
  // hand-authored GeoJSON blob — csvDomain bails to null on JSON) must not DISARM the rows
  // reader. Charts keep their CSV domain; rows/valueField is the fallback, and a spec with
  // neither stays a strict no-op.
  const domain = (csv ? csvDomain(csv) : null) ?? rowsDomain(s);
  if (!domain) return [];
  const backed = encodedBackingNumbers(s);
  const title = typeof s.title === "string" ? s.title : "";
  const takeaway =
    typeof p.confirmedTakeaway === "string" ? p.confirmedTakeaway : "";
  const errors: string[] = [];
  const seen = new Set<number>();
  // Duration phrases ("quadruplé en 5 ans", "over 10 years", "in 3 Monaten") are TIME SPANS,
  // never plotted magnitudes — stripped BEFORE token extraction so the "5" of "5 ans" is not
  // compared to yMax. Real false positive (2026-07-17 run): a confirmed takeaway carrying
  // "en 5 ans" was rejected twice against yMax 4, and the workaround edited a confirmed title
  // without re-confirmation — the guard must never manufacture that pressure. Dates/years keep
  // their own dedicated x-axis check below.
  const claimText = `${title}\n${takeaway}`
    .replace(DURATION_PHRASE_RE, " ")
    .replace(AGE_BAND_RE, " ");
  for (const tok of extractNumberTokens(claimText)) {
    if (seen.has(tok.value)) continue;
    if (backed.has(tok.value)) continue;
    if (looksLikeYear(tok.value)) {
      // Years are only checked against a TIME x-axis (Gate scope: years vs x-domain).
      if (
        !domain.xIsTime ||
        domain.xMin === undefined ||
        domain.xMax === undefined
      )
        continue;
      if (
        tok.value < domain.xMin - CLAIM_EPS ||
        tok.value > domain.xMax + CLAIM_EPS
      ) {
        seen.add(tok.value);
        errors.push(
          `claim-grounding: the confirmed takeaway/title cites the year ${tok.raw}, OUTSIDE the ` +
            `chart's time axis [${domain.xMin}, ${domain.xMax}] and not encoded by any annotation ` +
            `or reference line — encode it (annotation / reference line) or drop the claim`,
        );
      }
      continue;
    }
    // A value: flag only when it EXCEEDS the plotted maximum (the over-claim / projection
    // direction) — below-min numbers (deltas, sub-shares) stay for human review.
    if (domain.yMax !== undefined && tok.value > domain.yMax + CLAIM_EPS) {
      seen.add(tok.value);
      errors.push(
        `claim-grounding: the confirmed takeaway/title cites the value ${tok.raw}, which EXCEEDS ` +
          `the plotted data maximum (${domain.yMax}) and is not encoded by any annotation, ` +
          `reference line or target marker — encode it or drop the projection`,
      );
    }
  }
  return errors;
}

// GUARD 5 — skillsInvoked (mechanical sub-skill proof, Spotlight A5). Absent/empty ⇒ warning
// (legacy accepted.json). Present + guided branch declared without "suggest-chart" ⇒ error:
// the ranked candidates only suggest-chart can emit were bypassed. Present but declaring
// NEITHER branch token ⇒ warning too (review M1): a list that skips the branch declaration
// silently bypasses the guided check — self-reported, so a warning not an error, but never
// a silent pass.
function skillsInvokedIssues(p: AcceptedProposal): {
  errors: string[];
  warnings: string[];
} {
  const list = p.skillsInvoked;
  if (!Array.isArray(list) || list.length === 0) {
    return {
      errors: [],
      warnings: [
        (Array.isArray(list)
          ? "skillsInvoked is empty"
          : "skillsInvoked missing") +
          " — cannot mechanically prove suggest-chart produced this proposal (emit it at §5b like channel/confirmedTakeaway)",
      ],
    };
  }
  const guided = list.includes("splash:cadrage-guided");
  const direct = list.includes("splash:cadrage-direct");
  if (!guided && !direct) {
    return {
      errors: [],
      warnings: [
        "skillsInvoked declares no branch token (splash:cadrage-guided | splash:cadrage-direct) — the guided-branch check cannot run; declare the branch as the first entry (§5b)",
      ],
    };
  }
  if (guided && !list.includes("suggest-chart")) {
    return {
      errors: [
        "skillsInvoked declares the guided branch but does not list suggest-chart — a guided proposal must come from suggest-chart's candidates, never a host re-decision",
      ],
      warnings: [],
    };
  }
  return { errors: [], warnings: [] };
}

// Run the producer-appropriate validator on an accepted proposal's spec, then the
// cross-producer source-URL guard (GUARD 2), then the deterministic guardrail-parity gate
// (ENFORCEMENT SLICE 2 — the deterministic guardrails that lived only in suggest-chart's
// eval, re-applied here so a hand-authored bypass must clear the same bar). A spec is
// accepted only when it clears the producer validator AND every re-applied deterministic
// guardrail; any violation fails validation before the producer ever runs.
// `batch` is the FULL accepted batch the proposal belongs to (produceAll passes it) —
// it powers the cross-proposal GUARD 3b duplicate-takeaway tripwire; single-proposal
// callers may omit it (defaults to no siblings, so 3b never fires).
export function validateAccepted(
  p: AcceptedProposal,
  batch: AcceptedProposal[] = [],
): ValidationOutcome {
  const outcome = validateByProducer(p);
  const extraErrors: string[] = [];
  const missingTakeaway = missingConfirmedTakeawayError(p);
  if (missingTakeaway) extraErrors.push(missingTakeaway);
  const duplicateTakeaway = duplicateConfirmedTakeawayError(p, batch);
  if (duplicateTakeaway) extraErrors.push(duplicateTakeaway);
  const placeholder = placeholderSourceError(p.spec);
  if (placeholder) extraErrors.push(placeholder);
  // GUARD 2b/2c — source attribution fidelity (Defects B & D). Consume the article's captured
  // citation (`p.sourceHint`, from suggest-article) so a named org is never discarded for the
  // generic prose fallback, and a journalist-provided URL is never silently upgraded. sourceHint is
  // threaded onto the accepted proposal by the orchestrator LLM (splash/SKILL.md §5b) — prose-
  // enforced by necessity, like `channel`/`confirmedTakeaway`; there is no script between the
  // ProposalSet and accepted.json to mechanize it (see source-guard.ts). Absent hint ⇒ both return
  // null (the guards stay dormant), and the dropped-hint observability below flags the disarm.
  const namePreserved = sourceNamePreservedReason(p.spec, p.sourceHint);
  if (namePreserved) extraErrors.push(namePreserved);
  const urlFidelity = sourceUrlFidelityReason(p.spec, p.sourceHint);
  if (urlFidelity) extraErrors.push(urlFidelity);
  // OBSERVABILITY (non-blocking). Threading sourceHint onto accepted.json is prose-enforced (no
  // script transforms the LLM's ProposalSet — see source-guard.ts), so a dropped hint silently
  // disarms the guard above. Surface that disarm as a render-gate WARNING (never a hard error):
  // the ship is the generic fallback but no name hint was threaded, on a table-backed claim. It
  // rides the success-path warnings below onto ProposalResult.warnings.
  const extraWarnings: string[] = [];
  const droppedHint = droppedSourceHintWarning(
    p.spec,
    p.sourceHint,
    p.provenance,
  );
  if (droppedHint) extraWarnings.push(droppedHint);
  // GUARD 4 — claim-grounding (Defect C): a numeric/temporal claim in the title/takeaway that
  // the data domain does not encode (and no annotation/reference line backs) fails hard.
  extraErrors.push(...claimGroundingErrors(p));
  // GUARD 5 — skillsInvoked mechanical sub-skill proof (Spotlight A5): absent list is an
  // observability warning (legacy-safe); a guided-branch declaration without suggest-chart
  // is a hard error (the orchestrator re-decided what the sub-skill owns).
  const skillsIssues = skillsInvokedIssues(p);
  extraErrors.push(...skillsIssues.errors);
  extraWarnings.push(...skillsIssues.warnings);
  extraErrors.push(...guardrailParityViolations(p));
  if (extraErrors.length) {
    return {
      ok: false,
      errors: [...(outcome.ok ? [] : outcome.errors), ...extraErrors],
    };
  }
  // No extra errors. If the producer validator itself failed, return its failure unchanged.
  if (!outcome.ok) return outcome;
  // Success — attach any advisory warnings (producer warnings + the dropped-hint observability).
  if (extraWarnings.length)
    return { ok: true, warnings: [...outcome.warnings, ...extraWarnings] };
  return outcome;
}

function validateByProducer(p: AcceptedProposal): ValidationOutcome {
  switch (p.producer) {
    case "dw-chart":
      return strip(validateChartSpec(p.spec));
    case "map-dw":
      return strip(validateMapSpec(p.spec));
    case "map-native":
      return validateMapNative(p.spec);
    case "scrolly":
      return validateScrolly(p.spec);
    case "chart-native":
      return validateNative(p.spec);
    case "image-native":
      return validateImageNative(p.spec, p.format);
    default: {
      // produce-all.mjs builds `accepted` from an untyped JSON.parse, so a hand-authored
      // report can carry a producer outside the union. Handle it as a validation FAILURE,
      // never a crash: produceAll reads `.ok` before its try/catch, so an undefined return
      // here would kill the whole batch and break the drop-proof invariant. The `never`
      // assignment keeps compile-time exhaustiveness — a new Producer member added above
      // fails to compile here until it is handled.
      const _exhaustive: never = p.producer;
      void _exhaustive;
      return {
        ok: false,
        errors: [
          `unknown producer "${String((p as { producer?: unknown }).producer)}"`,
        ],
      };
    }
  }
}
