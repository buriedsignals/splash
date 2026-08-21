// THE PROPOSAL, AND THE VERDICTS IT IS BUILT FROM.
//
// Measured before this file existed: `grep -rn "formatGap(\|capabilityGap(\|groundTakeaway("
// skills/` returned FOUR LINES, and all four were the definitions. Nothing called any of them.
// `grounding:` and `reachable:` are recorded scalars both Gate-2 readings check — and both gates
// were checking a field no code had ever produced. The convergence that design bought is real
// (neither gate can run a check the other cannot); what it did not buy is a verdict. `reachable`
// was not a trusted verdict, it was an unwritten one.
//
// This file is where the phases call them. Grounding is resolved at G1 (`resolveGrounding`), the
// medium/format/size options are computed for movements ④–⑦, and `confirmFormatReachable` is the ONE
// function that returns the string `reachable:` records — it returns `"yes"` only after `formatGap`
// and `capabilityGap` have both returned `null`, and throws the refusal otherwise. A pair nobody
// can produce cannot be handed a `yes` to write down.
//
// AND THE PROPOSAL ITSELF IS RENDERED FROM THOSE OPTIONS, never written beside them. That is this
// project's established shape for journalist-facing text (`palette/scripts/format-proposal.mjs`,
// `newsroom-charter/scripts/format-proposal.mjs`, `deliver/scripts/format-handover.mjs`):
// generate the sentence from structured input, so nothing the function was not given can appear in
// it. Here that means a menu physically cannot offer a pair the catalog refuses.
//
// WHAT IT DELIBERATELY DOES NOT DECIDE. Whether a type SUITS this story is the exchange's
// judgement, made against the frozen profile with the type's own sheet open — this file supplies
// the ground (what exists, what it is for, what is reachable) and refuses the unreachable. It does
// `formatCandidates` does not rank, choose, or write a slot. The graphical helper added below may
// order already-reachable rows as revision-bound advice, but it remains read-only and discloses
// unresolved requirements and ties.

import { groundTakeaway, findYearColumn, measureColumns } from "./ground-claim.mjs";
import { formatGap, formatsFor, FORMAT_CATALOG } from "./format-catalog.mjs";
import { capabilityGap } from "./capability-gap.mjs";
import { EXPORT_SIZES, SIZED_FORMATS } from "./storyboard.mjs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import visualCatalog from "../references/visual-catalog.json" with { type: "json" };

// ---------------------------------------------------------------------------------------------
// G1 — the grounding verdict
// ---------------------------------------------------------------------------------------------

// HOW N CLAIM VERDICTS BECOME THE ONE `grounding:` SCALAR. `groundTakeaway` returns an ARRAY —
// one verdict per claim it could pick out of the takeaway — and `grounding:` is a single word with
// a three-value vocabulary. Nothing anywhere stated the collapse, so which word closed G1 was the
// model's own call, and `supported` is the one that lets it proceed. The rule, stated here and in
// `references/exchange.md` because it is a judgement, not an implementation detail:
//
//   contradicted   any single claim the data REFUTES. Not a closing value: the takeaway is
//                  corrected with the journalist, or overridden by them with a reason they give.
//   supported      at least one claim resolved in favour, and none refuted.
//   unverifiable   nothing in the takeaway could be placed at all — including a takeaway with no
//                  checkable claim in it.
//
// `supported` therefore means "every claim this check could resolve, it resolved in favour", NOT
// "every number was verified" — a real takeaway carrying five numbers typically resolves one and
// cannot place four, because every bare integer is range-tested, years and counts included. That is
// why `unplaceable` is reported in the detail rather than folded into the verdict: an unverifiable
// claim is information, not a refusal, and the file this reads from holds the same rule
// (`ground-claim.mjs`'s header). Say the detail out loud at G1 — what the check could and could not
// see is the honest half of the answer.
//
// THIS IS THE CALLER `ground-claim.mjs`'s own `coverage` field is for. `groundTakeaway` now
// returns `{ claims, coverage }`, and `coverage.unevaluated` names the sentences that produced NOT
// ONE claim of any verdict — the difference between a takeaway this check actually read and one it
// never had a shape for at all. Folding it into `detail` here is what keeps that difference from
// dying at this seam: a caller reading only `claims` and dropping `coverage` on the floor is
// exactly the defect `ground-claim.mjs`'s own header warns about, one layer further from where it
// was found.
//
// ROUND FOUR (2026-08-21), findings 1 and 4 — TWO WAYS THIS SCALAR REPORTED CONFIDENCE IT DID NOT
// HAVE, both measured on frozen stories, both closed here rather than by teaching the checker
// another sentence shape.
//
//   1. A numeral inside a column's range is not a confirmed claim. `ground-claim.mjs` now returns
//      those under their own verdict, `consistent`, and this function keeps them in their own
//      bucket: they are REPORTED in the detail, and they can never make the verdict `supported`.
//      Measured on `stress-q-safety-incidents`, whose headline its own data refutes: the check
//      used to report "3 of 3 claim(s) confirmed" for the per-100k rates `233`, `205` and `100` —
//      the "k" of "100k" — each of which really does fall inside `incidents [96, 412]`, and none
//      of which is evidence for the sentence it sits in.
//
//   2. A takeaway this check did not read the whole of cannot be called supported. `coverage`
//      already named the sentences that produced NO claim at all; the scalar threw it away.
//      Measured on `stress-s-unspent-fund`: G1 closed `supported` on the incidental `2026`
//      matching `year [2026, 2026]` — min === max, a check that cannot fail — while `4.1` and
//      `0`, the two numbers the sentence actually asserts, both came back unverifiable. So
//      `supported` now requires BOTH a genuinely confirmed claim AND that every sentence of the
//      takeaway produced something; anything less is `unverifiable`, saying which sentence was
//      never read. `contradicted` is unaffected: one refuted claim refutes the takeaway whether
//      or not the rest of it was legible.
//
// The `grounding:` VOCABULARY is unchanged — `supported`, `unverifiable`, `overridden — "<why>"`
// — because it is mirrored byte-identically in `skills/splash/scripts/where.mjs`'s own Gate-2
// reading, and a fourth word would have to be added in both or the gates would disagree. What
// changed is which of the three this function is allowed to reach, not how many there are.
export function resolveGrounding(takeaway, profile, options = {}) {
  const { claims, coverage } = groundTakeaway(takeaway, profile, options);
  const contradicted = claims.filter((c) => c.verdict === "contradicted");
  const supported = claims.filter((c) => c.verdict === "supported");
  const consistent = claims.filter((c) => c.verdict === "consistent");
  const unplaceable = claims.filter((c) => c.verdict === "unverifiable");

  const wholeTakeawayRead = coverage.unevaluated.length === 0;
  const verdict =
    contradicted.length > 0
      ? "contradicted"
      : supported.length > 0 && wholeTakeawayRead
        ? "supported"
        : "unverifiable";

  const detail =
    contradicted.length > 0
      ? `the data refutes ${contradicted.length} of ${claims.length} claim(s): ${contradicted.map((c) => `${c.claim} — ${c.detail}`).join("; ")}`
      : supported.length > 0
        ? `${supported.length} of ${claims.length} claim(s) confirmed against the frozen data (${supported.map((c) => `${c.claim}: ${c.detail}`).join("; ")})${unplaceable.length > 0 ? `; ${unplaceable.length} could not be placed either way` : ""}`
        : claims.length === 0
          ? "no mechanically checkable claim in this takeaway — nothing was confirmed and nothing was refuted"
          : `none of ${claims.length} claim(s) came back confirmed or refuted — nothing was confirmed and nothing was refuted`;

  const placedNote =
    consistent.length > 0
      ? ` ${consistent.length} numeral(s) were placed but not confirmed — a value inside a column's range is not a claim the data confirms (${consistent.map((c) => `${c.claim}: ${c.detail}`).join("; ")}).`
      : "";

  const withheldNote =
    supported.length > 0 && !wholeTakeawayRead
      ? ` "supported" is WITHHELD: ${coverage.unevaluated.length} sentence(s) of this takeaway produced no claim at all, so the check did not read the whole of it.`
      : "";

  const coverageNote = ` (${coverage.decided} of ${coverage.sentences} sentence(s) carry a claim the frozen data could decide; ${coverage.evaluated} produced a claim of any kind${
    coverage.unevaluated.length > 0
      ? `; ${coverage.unevaluated.length} produced none: ${coverage.unevaluated.map((s) => `"${s}"`).join("; ")}`
      : ""
  })`;

  return {
    verdict,
    detail: `${detail}${placedNote}${withheldNote}${coverageNote}`,
    claims,
    contradicted,
    supported,
    consistent,
    unplaceable,
    coverage,
  };
}

// The exact string `STORYBOARD.md`'s `grounding:` takes. `contradicted` is NOT a closing value, so
// it is refused here rather than written: a refuted takeaway is corrected with the journalist, or
// they record an override with their own reason. The override reason is the journalist's, which is
// why this function will not manufacture one.
export function groundingScalar(resolved, { override } = {}) {
  if (resolved.verdict !== "contradicted") return resolved.verdict;
  const reason = (override ?? "").trim();
  if (!reason) {
    throw new Error(
      `this takeaway is contradicted by its own data and "contradicted" never closes G1 — correct it with the journalist, or record their override: ${resolved.detail}`,
    );
  }
  return `overridden — "${reason}"`;
}

// ---------------------------------------------------------------------------------------------
// ④ the survey — what could be made of this data
// ---------------------------------------------------------------------------------------------

const SURVEY_ROW_RE = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*`(.+?)`\s*\|$/;
const SURVEY_SECTION_RE = /^##\s+(Chart|Map)\s+types/i;

/**
 * The generated survey, as rows. `references/type-survey.md` is written by
 * `twin/scripts/type-survey.mjs` from the forty type sheets themselves and drift-checked by
 * `test/type-survey.test.ts`; this reads it back so the exchange can name what exists instead of
 * proposing three variants of one bar, which is what it did with no survey at all.
 *
 * `provenFormats` is a COVERAGE fact (an artifact of that format exists on disk for that type), never
 * a reachability one — reachability is `formatGap`, below, and the two must not be conflated: a type
 * with no proven format is one nobody has rendered here yet, which is worth saying out loud.
 */
export function readTypeSurvey(text) {
  const rows = [];
  let medium = null;
  for (const line of text.split(/\r?\n/)) {
    const section = SURVEY_SECTION_RE.exec(line);
    if (section) {
      medium = section[1].toLowerCase();
      continue;
    }
    const row = SURVEY_ROW_RE.exec(line);
    if (!row || !medium) continue;
    rows.push({
      medium,
      type: row[1],
      purpose: row[2],
      provenFormats: /none rendered/.test(row[3]) ? [] : row[3].split(",").map((g) => g.trim()),
      sheet: row[4],
    });
  }
  return rows;
}

export function typeSurvey() {
  return readTypeSurvey(readFileSync(new URL("../references/type-survey.md", import.meta.url), "utf8"));
}

// Every medium and every format this toolchain has an opinion about, read off the catalog itself
// rather than typed out again — a pair added there widens both vocabularies with no second edit.
export function knownMediums() {
  return [...new Set(Object.keys(FORMAT_CATALOG).map((pair) => pair.split("/")[0]))];
}

export function knownFormats() {
  return [...new Set(Object.keys(FORMAT_CATALOG).map((pair) => pair.split("/")[1]))];
}

// ---------------------------------------------------------------------------------------------
// The canonical catalogue — one normalized generated copy, expanded only for a caller that needs
// treatment × format rows. Proof coverage stays evidence; it never changes structural selection.
// ---------------------------------------------------------------------------------------------

export const VISUAL_CATALOG_REVISION = visualCatalog.catalogRevision;

const CATALOG_CAPABILITY_KEYS = {
  "hosted-embed": "hostedEmbed",
  "map-delivery": "mapDelivery",
};

function observedCapability(capabilities, id) {
  return capabilities[id] ?? capabilities[CATALOG_CAPABILITY_KEYS[id]] ?? null;
}

function availabilityFor(required, capabilities, capabilityRows) {
  for (const id of required) {
    const observed = observedCapability(capabilities, id);
    if (observed?.available === false) {
      const metadata = capabilityRows.get(id);
      return {
        available: false,
        cause: "capability",
        reason: observed.reason || metadata.unavailableReason,
        repairAction: metadata.repairAction,
        capability: id,
      };
    }
  }
  return { available: true, cause: null, reason: null, repairAction: null, capability: null };
}

/**
 * One stable row per treatment/format. Missing capability observations preserve the existing
 * host-neutral structural view; an explicit closed observation disables only dependent rows.
 */
export function visualCatalogueEntries({ capabilities = {} } = {}) {
  const pairs = new Map(visualCatalog.formatPairs.map((row) => [`${row.medium}/${row.format}`, row]));
  const producers = new Map(visualCatalog.producers.map((row) => [row.id, row]));
  const deliveryForms = new Map(visualCatalog.deliveryForms.map((row) => [row.id, row]));
  const capabilityRows = new Map(visualCatalog.capabilities.map((row) => [row.id, row]));
  const entries = [];
  for (const treatment of visualCatalog.treatments) {
    for (const format of treatment.formats) {
      const pair = pairs.get(`${treatment.medium}/${format}`);
      const structural = treatment.state === "proof-only"
        ? {
            available: false,
            cause: "proof-only",
            reason: treatment.disabledReason,
            repairAction: null,
            capability: null,
          }
        : availabilityFor(pair.requiredCapabilities, capabilities, capabilityRows);
      entries.push({
        id: `${treatment.id}.${format}`,
        label: treatment.label,
        optionLabel: `${treatment.label} · ${pair.label}`,
        medium: treatment.medium,
        format,
        treatmentId: treatment.id,
        treatment: treatment.label,
        purpose: treatment.purpose,
        dataShape: treatment.dataShape,
        state: treatment.state,
        proofFormats: treatment.proofFormats,
        provenInThisFormat: treatment.proofFormats.includes(format),
        sizeRule: pair.sizeRule,
        interaction: pair.interaction,
        producer: producers.get(pair.producer),
        producerAlternatives: visualCatalog.delegatedProducers.flatMap((delegated) =>
          delegated.mappings
            .filter((mapping) => mapping.treatmentId === treatment.id && mapping.format === format)
            .map((mapping) => ({
              id: delegated.id,
              label: delegated.label,
              producer: producers.get(delegated.producer),
              providerTypes: mapping.providerTypes,
              defaultProviderType: mapping.defaultProviderType,
              ...availabilityFor([delegated.capability], capabilities, capabilityRows),
            })),
        ),
        requiredCapabilities: pair.requiredCapabilities,
        optionalCapabilities: pair.optionalCapabilities.map((id) => ({
          id,
          ...availabilityFor([id], capabilities, capabilityRows),
        })),
        deliveryForms: pair.deliveryForms.map((id) => {
          const form = deliveryForms.get(id);
          return {
            ...form,
            ...availabilityFor(form.requiredCapabilities, capabilities, capabilityRows),
          };
        }),
        ...structural,
      });
    }
  }
  return entries;
}

export function visualCatalogueEntry(id, options) {
  return visualCatalogueEntries(options).find((row) => row.id === id) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Advisory ranking for the graphical Storyboard view. This never writes, never widens the current
// gate, and never treats proof coverage as evidence that a treatment suits the story. It scores only
// enabled U7 choices against confirmed Storyboard fields and the frozen intake profile, preserving
// canonical order as an explicit tie-break rather than hiding a tie behind model confidence.
// ---------------------------------------------------------------------------------------------

export const RECOMMENDATION_SCHEMA_VERSION = "splash-recommendation/v1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;
}

function profileFacts(profile) {
  const columns = Array.isArray(profile?.columns)
    ? profile.columns.slice(0, 512).flatMap((column) => {
        if (!column || typeof column.name !== "string" || !["number", "text", "date", "boolean"].includes(column.type)) return [];
        return [{
          name: column.name.slice(0, 256),
          normalizedName: column.name.toLowerCase(),
          type: column.type,
          distinct: Number.isSafeInteger(column.distinct) ? column.distinct : null,
          min: typeof column.min === "number" && Number.isFinite(column.min) ? column.min : null,
          max: typeof column.max === "number" && Number.isFinite(column.max) ? column.max : null,
        }];
      })
    : [];
  // THE SKILL'S ONE ANSWER TO "is `year` a measure?", read from where it lives rather than
  // decided again here — `ground-claim.mjs`'s `findYearColumn`/`measureColumns` (finding 23).
  // `numeric` is still every number column, because "this table carries numbers" is a real fact;
  // what a treatment's requirements are scored against is `measures`, which is `numeric` minus the
  // table's own x axis.
  const numeric = columns.filter((column) => column.type === "number");
  const yearColumn = findYearColumn(columns);
  const measures = measureColumns(columns, yearColumn);
  const text = columns.filter((column) => column.type === "text");
  const temporal = columns.filter((column) =>
    column.type === "date" || /(^|_)(date|time|year|month|day|week|quarter)($|_)/.test(column.normalizedName),
  );
  const regional = columns.filter((column) =>
    /(^|_)(country|iso2|iso3|region|state|province|county|district|postcode|postal|geoid)($|_)/.test(column.normalizedName),
  );
  const latitude = columns.some((column) => /(^|_)(lat|latitude)($|_)/.test(column.normalizedName));
  const longitude = columns.some((column) => /(^|_)(lon|lng|longitude)($|_)/.test(column.normalizedName));
  return {
    rowCount: Number.isSafeInteger(profile?.rowCount) && profile.rowCount >= 0 ? profile.rowCount : null,
    columns,
    numeric,
    yearColumn,
    measures,
    text,
    temporal,
    regional,
    geographicPoints: latitude && longitude,
  };
}

// WHAT A REQUIREMENT IS ALLOWED TO READ AS SATISFIED.
//
// ROUND FOUR (2026-08-21), findings 22 and 23. Measured: of the requirements this table answers,
// TWO consulted `rowCount` (`raw-observations`, `distribution`). Every other one was satisfied by
// column TYPE alone, so `stress-s-unspent-fund` — ONE row, `year=2026`, `fund=1` — was handed
// `chart.streamgraph` first, confidently, with zero unresolved requirements, on a table that
// supports no comparison whatsoever.
//
// The vocabulary already held the right idea in exactly one entry: `two-moments` asked for
// `distinct >= 2`. THE RULE, GENERALISED FROM IT AND STATED ONCE HERE: a requirement that names a
// COMPARISON, a SERIES, an AXIS or an ORDER needs more than one observation to be true. A time
// axis with one moment is not an axis; a series of one point is not a series; a ranking of one
// row is not a ranking. `atLeast` is the whole mechanism, and it answers `false` when the profile
// does not state a row count at all — an unknown row count is not evidence either.
//
// TWO ENTRIES DELIBERATELY TAKE NO ROW FLOOR, and the reason is worth writing down rather than
// rediscovering. `part-to-whole` is true of a ONE-row table carrying three non-negative measures
// (that is a pie chart, and a legitimate one); what it needs is two measures, not two rows.
// `categorical` says a text column exists, which is a fact about the table and not a claim about
// how many things it compares — `few-categories` and `ordered-categories` are where the count of
// categories is answered.
//
// And `facts.measures`, not `facts.numeric`, is what every numeric requirement is scored against
// (finding 23): a table's own x axis is not one of the things it measures. See `profileFacts`.
function requirementFinding(requirement, facts) {
  const measures = facts.measures;
  const numeric = measures.length > 0;
  const categorical = facts.text.length > 0;
  const regional = facts.regional.length > 0;
  const rows = facts.rowCount;
  const atLeast = (n) => rows !== null && rows >= n;
  const rowNote = `${rows ?? "an unstated number of"} profiled row(s)`;
  const measureNote = `${measures.length} measure column(s) beside the table's own axis`;
  // A moment a column never varies over is one moment. Where `distinct` is unstated the row count
  // answers instead, which is the same question asked of the only other fact available.
  const twoMoments = facts.temporal.some((column) =>
    column.distinct === null ? atLeast(2) : column.distinct >= 2,
  );
  const momentNote = `a temporal column carries at least two distinct moments across ${rowNote}`;
  const raw = numeric && atLeast(5);
  const nonnegative = numeric && measures.every((column) => column.min !== null && column.min >= 0);
  const integral = nonnegative && measures.every((column) => Number.isInteger(column.min) && Number.isInteger(column.max));
  const positive = numeric && measures.every((column) => column.min !== null && column.min > 0);
  const tests = {
    "numeric-value": [numeric, measureNote],
    "numeric-series": [numeric && atLeast(2), `${measureNote} over ${rowNote}`],
    "continuous-value": [numeric, measureNote],
    count: [integral, "a non-negative measure whose extremes are both whole numbers"],
    // NOT A COLUMN FACT AT ALL. "An explicit units-per-icon conversion" is a decision the
    // journalist makes about how to draw, and no profile can establish it — reporting it as
    // satisfied because the table carries numbers is the same defect as calling one moment an
    // axis. It is stated as unresolved every time, in its own words, rather than silently.
    "unit-conversion": [
      false,
      null,
      "the profile cannot state a units-per-icon conversion — how many things one icon stands for is the journalist's decision, not a fact about a column",
    ],
    "nonnegative-value": [nonnegative, "measure minima are non-negative"],
    "positive-value": [positive, "measure minima are positive"],
    "signed-value": [measures.some((column) => column.min < 0 && column.max > 0), "a measure crosses zero"],
    "numeric-pair": [measures.length >= 2 && atLeast(2), `${measureNote} over ${rowNote}`],
    "multiple-series": [measures.length >= 2 && atLeast(2), `${measureNote} over ${rowNote}`],
    "few-series": [measures.length >= 1 && measures.length <= 6 && atLeast(2), `${measureNote} over ${rowNote}`],
    categorical: [categorical, `${facts.text.length} text column(s)`],
    "few-categories": [facts.text.some((column) => column.distinct !== null && column.distinct <= 12), "a text column has at most 12 distinct values"],
    temporal: [twoMoments, momentNote],
    "calendar-date": [twoMoments, momentNote],
    "ordered-axis": [twoMoments, momentNote],
    "two-moments": [twoMoments, momentNote],
    "geographic-regions": [regional, `${facts.regional.length} regional identifier column(s)`],
    "region-join": [regional, `${facts.regional.length} regional identifier column(s)`],
    "place-labels": [regional, `${facts.regional.length} regional identifier column(s)`],
    "geographic-points": [facts.geographicPoints, "latitude and longitude columns are both present"],
    "raw-observations": [raw, `${rowNote} with a measure to read`],
    distribution: [raw, `${rowNote} with a measure to read`],
    rank: [numeric && categorical && atLeast(2), `a measure, a category and ${rowNote} to put in order`],
    "ordered-categories": [numeric && categorical && atLeast(2), `a measure, a category and ${rowNote} to put in order`],
    "part-to-whole": [measures.length >= 2 && nonnegative, "two or more non-negative measures are present"],
    "repeatable-schema": [facts.columns.length > 0, `${facts.columns.length} profiled columns`],
  };
  const result = tests[requirement];
  if (!result) return null;
  return {
    matched: result[0] === true,
    source: "source/profile.json",
    // A third element, where an entry has one, is what this requirement's REFUSAL says in its own
    // words. Without it the refusal reads "profile does not establish unit conversion", which
    // tells a journalist to go looking for a column that could never exist.
    fact:
      result[0] === true
        ? result[1]
        : (result[2] ?? `profile does not establish ${requirement.replaceAll("-", " ")}`),
  };
}

function evidenceText(model) {
  return Object.entries(model?.evidence ?? {})
    .flatMap(([field, value]) => typeof value === "string" ? [`${field}: ${value}`] : [])
    .join("\n")
    .toLowerCase();
}

function explicitSignal(text, signals) {
  return signals.some((signal) => new RegExp(`\\b${signal}\\b`, "i").test(text));
}

function rankChoice(choice, index, model, facts) {
  const matchedEvidence = [];
  const unresolvedRequirements = [];
  const tradeoffs = [];
  let score = 0;
  const text = evidenceText(model);
  if (choice.kind === "medium") {
    if (choice.value === "map" && (facts.regional.length || facts.geographicPoints)) {
      score += 5;
      matchedEvidence.push({ source: "source/profile.json", fact: "geographic identifiers are present" });
    }
    if (choice.value === "chart" && facts.measures.length) {
      score += 2;
      matchedEvidence.push({ source: "source/profile.json", fact: `${facts.measures.length} measure column(s) are present` });
    }
    if (choice.value === "image" && explicitSignal(text, ["photo", "photograph", "image", "portrait"])) {
      score += 5;
      matchedEvidence.push({ source: "STORYBOARD.md", fact: "a confirmed field explicitly names photographic evidence" });
    }
  } else if (choice.kind === "format") {
    const signals = {
      static: ["static", "print"],
      web: ["interactive", "web", "hover", "explore", "embed"],
      video: ["video", "motion", "animation"],
      scrolly: ["scrolly", "scroll", "scrolling"],
    }[choice.value] ?? [];
    if (explicitSignal(text, signals)) {
      score += 5;
      matchedEvidence.push({ source: "STORYBOARD.md", fact: `a confirmed field explicitly signals ${choice.label}` });
    } else if (choice.value === "static") {
      score += 1;
      tradeoffs.push("No confirmed field requires interaction or motion; static is the least demanding reachable format.");
    }
    if (choice.browserPrerequisites?.length) tradeoffs.push("This format uses the managed browser runtime.");
  } else if (choice.kind === "size") {
    if (choice.value && explicitSignal(text, [choice.value])) {
      score += 5;
      matchedEvidence.push({ source: "STORYBOARD.md", fact: `a confirmed field explicitly names ${choice.value}` });
    } else if (choice.value === "landscape") {
      score += 1;
      tradeoffs.push("No confirmed placement field names an aspect ratio; landscape is the stable editorial default.");
    }
  } else if (choice.kind === "treatment") {
    for (const requirement of choice.dataShape?.requires ?? []) {
      const finding = requirementFinding(requirement, facts);
      if (!finding) {
        unresolvedRequirements.push(requirement);
      } else if (finding.matched) {
        score += 2;
        matchedEvidence.push({ source: finding.source, fact: `${requirement.replaceAll("-", " ")}: ${finding.fact}` });
      } else {
        score -= 1;
        unresolvedRequirements.push(requirement);
      }
    }
    if (!choice.dataShape?.requires?.length) unresolvedRequirements.push("no machine-readable data-shape requirements");
  } else if (choice.kind === "producer") {
    if (choice.value === "datawrapper" && explicitSignal(text, ["datawrapper"])) {
      score += 5;
      matchedEvidence.push({ source: "STORYBOARD.md", fact: "a confirmed field explicitly requests Datawrapper" });
    } else if (choice.value === "custom") {
      score += 1;
      tradeoffs.push("No confirmed field requires delegation; Custom preserves the full Splash visual contract.");
    }
  }
  return {
    optionId: choice.id,
    score,
    canonicalIndex: index,
    matchedEvidence,
    unresolvedRequirements,
    tradeoffs,
  };
}

export function recommendVisualChoice({ model, profile = {} } = {}) {
  if (!model || model.schemaVersion !== "splash-selection/v1") throw new Error("recommendation requires a current Splash selection model");
  const facts = profileFacts(profile);
  const ranking = (model.choices ?? [])
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => choice.enabled === true)
    .map(({ choice, index }) => rankChoice(choice, index, model, facts))
    .sort((a, b) => b.score - a.score || a.canonicalIndex - b.canonicalIndex)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  // A CHOICE WITH AN UNRESOLVED REQUIREMENT IS NOT A RECOMMENDATION (round four, finding 22).
  // Before this, `ranking[0]` was recommended whatever it left unanswered, so a one-row table got
  // a confident top pick with its own unmet requirements printed one field away. The ranking is
  // still returned in full — the unresolved rows are the honest half of the answer — but the
  // RECOMMENDATION is drawn only from the rows the frozen profile fully establishes, and when
  // there is no such row the refusal says so and names what is missing.
  const eligible = ranking.filter((row) => row.unresolvedRequirements.length === 0);
  const top = eligible[0] ?? null;
  const tied = Boolean(top && eligible[1] && eligible[1].score === top.score);
  if (top && tied) {
    top.tradeoffs.push("The top choices have equal evidence scores; stable catalogue order breaks the tie.");
  } else if (top && top.matchedEvidence.length === 0) {
    top.tradeoffs.push("This is a conservative fallback because confirmed evidence does not positively distinguish the choices.");
  }
  const unmet = [...new Set(ranking.flatMap((row) => row.unresolvedRequirements))].sort();
  const refusal =
    top || ranking.length === 0
      ? null
      : `nothing is recommended: this profile establishes ${facts.rowCount === null ? "no stated row count" : `${facts.rowCount} row(s)`} and ${facts.measures.length} measure column(s) beside the table's own axis, and every one of the ${ranking.length} reachable choice(s) still needs something it does not supply — ${unmet.join(", ")}. Say that to the journalist rather than picking the least unsupported one.`;
  const profileProjection = {
    rowCount: facts.rowCount,
    columns: facts.columns.map(({ name, type, distinct, min, max }) => ({ name, type, distinct, min, max })),
  };
  const profileRevision = digest(profileProjection);
  const selectionRevisions = {
    storyRevision: model.revisions.story,
    catalogRevision: model.revisions.catalogue,
    capabilityGeneration: model.revisions.capabilities,
  };
  const revision = digest({ selectionRevisions, profileRevision, ranking });
  return {
    schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
    revision,
    selectionRevisions,
    profileRevision,
    recommendedOptionId: top?.optionId ?? null,
    refusal,
    tied,
    ranking,
  };
}

// ---------------------------------------------------------------------------------------------
// ⑤ medium → ⑥ format → ⑦ size, each verified before it is offered
// ---------------------------------------------------------------------------------------------

/**
 * Movement ⑤. Every medium, with the formats it can reach, the types this toolchain holds sheets
 * for, and — the half nobody computed — whether the ENVIRONMENT allows it at all. A map with no
 * working `MAPTILER_KEY` is named as closed HERE, at the medium question, with what would open it,
 * rather than three movements later at delivery.
 */
export function proposeMediums({ capabilities = {}, survey = typeSurvey() } = {}) {
  return knownMediums().map((medium) => {
    const gap = capabilityGap(capabilities, medium);
    return {
      medium,
      reachable: gap === null,
      why: gap,
      formats: formatsFor(medium),
      types: survey.filter((row) => row.medium === medium),
    };
  });
}

/**
 * Movement ⑥. Every format in this toolchain's vocabulary, for the medium just chosen, each marked
 * reachable or not AND CARRYING ITS REFUSAL. A format with no producer for this medium is NAMED as
 * absent rather than quietly omitted, which is the whole reason `FORMAT_CATALOG` is keyed on the
 * pair: "image reaches static and scrolly; it has no web or video producer" is a sentence the
 * journalist hears at the format gate.
 */
export function proposeFormats({ medium, capabilities = {} }) {
  const closed = capabilityGap(capabilities, medium);
  return knownFormats().map((format) => {
    const gap = closed ?? formatGap(medium, format);
    return { format, reachable: gap === null, why: gap, producer: FORMAT_CATALOG[`${medium}/${format}`]?.producerSkill ?? null };
  });
}

/**
 * Movement ⑦. The sizes this format exports — `EXPORT_SIZES` for a static or a video, none at all
 * for a web or a scrolly page, which fills whatever container it is given. Where the set has one
 * member the movement STATES it; where it has more, it asks. Either way `size:` is recorded, or
 * deliberately absent, and `sizeGap` in both gates reads the same rule.
 */
export function proposeSizes(format) {
  return SIZED_FORMATS.includes(format) ? [...EXPORT_SIZES] : [];
}

/**
 * THE RECORDED VERDICT. `reachable: yes` is written into the slot at G2b, and this is the only
 * function that produces the string — it returns `"yes"` exactly when `formatGap` and
 * `capabilityGap` both return `null`, and throws the refusal, verbatim and journalist-facing,
 * otherwise. Before this existed both gates read a field nobody computed.
 */
export function confirmFormatReachable({ medium, format, capabilities = {} }) {
  const closed = capabilityGap(capabilities, medium);
  if (closed) throw new Error(closed);
  const gap = formatGap(medium, format);
  if (gap) throw new Error(gap);
  return "yes";
}

// ---------------------------------------------------------------------------------------------
// ⑩ the candidates — genuinely different ways of seeing the same numbers
// ---------------------------------------------------------------------------------------------

/**
 * A5, made mechanical. The run offered three candidates and all three were stacked-or-grouped bars
 * of the same three numbers: a menu of one idea, presented as a choice. A candidate set has to
 * offer MATERIALLY DIFFERENT ways of seeing the data, so this refuses a set whose candidates all
 * name the same type.
 *
 * `min` is 2 rather than 3 on purpose, and `exchange.md` says the same thing in words: if the
 * honest answer is that this data supports two ways of seeing and no more, two is the answer. What
 * is refused is not "fewer than three", it is "several labels over one idea".
 */
export function assertDistinctWays(candidates, { min = 2 } = {}) {
  const types = candidates.map((c) => (typeof c === "string" ? c : c.type));
  if (types.some((t) => !t)) throw new Error("every candidate must name the type it would be");
  const distinct = new Set(types.map((t) => t.trim().toLowerCase()));
  if (candidates.length >= min && distinct.size < min) {
    throw new Error(
      `these ${candidates.length} candidates are ${distinct.size} way(s) of seeing this data, not ${candidates.length} — ${[...distinct].join(", ")}. Offer genuinely different types, or offer fewer and say why.`,
    );
  }
  return true;
}

/**
 * The menu, RENDERED FROM THE OPTIONS. Each line names the type, what that type is for in the
 * sheet's own words (verbatim — this function writes no editorial prose of its own), and the
 * formats that are genuinely reachable for it. A candidate whose pair the catalog refuses cannot
 * appear, because this throws before it renders one.
 *
 * `why` per candidate is the caller's own editorial reason — why THIS story is worth seeing that
 * way — and it is required: "each with why it would be interesting" is the ask, and a candidate
 * with no reason is a name in a list.
 */
export function formatCandidates({ medium, candidates, capabilities = {}, survey = typeSurvey() }) {
  assertDistinctWays(candidates);
  const lines = candidates.map((candidate) => {
    const { type, why, format } = candidate;
    if (!why || !why.trim()) throw new Error(`candidate "${type}" carries no reason — say why this way of seeing would be interesting`);
    if (format) confirmFormatReachable({ medium, format, capabilities });
    const row = survey.find((r) => r.medium === medium && r.type.toLowerCase() === type.trim().toLowerCase());
    const purpose = row ? ` — ${row.purpose}` : "";
    const reach = format ? ` (${format})` : "";
    return `- **${type}**${reach}${purpose}\n  Why here: ${why.trim()}`;
  });
  return lines.join("\n");
}
