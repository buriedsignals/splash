// twin/shared/chart-beat/treatments.mjs
//
// THE TREATMENTS THE DESIGN BASE HAS FILED, AND THE DATA SHAPES THEY CLAIM.
//
// A treatment is CONDITIONAL and PLURAL: it applies when the beat's own facts have a shape, several
// apply to one beat at once, and `arbiter.mjs` resolves what they ask for. A direction, by
// contrast, is global and exclusive. The two meet only through `registers.mjs`.
//
// EVERY TREATMENT HERE IS FILED UNDER `docs/design-base/treatments/`, WITH TWO INDEPENDENT
// PUBLICATIONS BEHIND IT, and `treatments-apply-to-the-data-they-claim.test.ts` holds the two sets
// equal in both directions. A treatment in this file with no filed record is a design decision
// somebody took without a reference; a filed record with no entry here is knowledge that never
// reached a pixel, which is exactly how the predecessor branch died at 112 thumbnails.
//
// TWO KINDS, TWO BURDENS OF PROOF. An IMPORTED treatment takes a practice observed elsewhere and
// must cite two independent publications. A DERIVED treatment draws a fact the beat itself carries
// — its own geometry, its own declared reference level, its own series — and cites none, because
// there is nothing for a second publication to corroborate. It owes a `detect` and a rendered proof
// instead.
//
// The distinction was not there at first, and its absence cost the tool its precision for a day:
// `crossing-marked` was refused for want of a second publication, when what it draws is the value
// `crossingGeometry` ALREADY COMPUTES. The floor exists to stop a newsroom's habit being copied
// without its logic (`anti-patterns.md`, closing entry); applied to a fact the data contains, it
// refuses honest work. See `docs/design-base/METHOD.md`, correction 7.

/** Above this many marks, a label per mark cannot be placed without collision, and offering one
 *  would hand the arbiter a list it can only drop. Measured against the filed evidence: Ferdio's
 *  encodings carry three to six marks; `$$$Billions` carries about forty cells and prints them all,
 *  which is where this floor sits. */
const MOST_MARKS_THAT_CAN_CARRY_A_LABEL = 40;

/**
 * The beat's own facts, derived rather than asserted, so a caller never assembles them by hand and
 * two beats cannot disagree about what "few marks" means.
 *
 * @param {Array<{key: string, label?: string, value: number}>} data
 * @param {{comparisonSet?: unknown[], unitMark?: string, subject?: string}} options
 */
export function beatFacts(
  data,
  {
    comparisonSet = [],
    unitMark = null,
    subject = null,
    namedSeries = [],
    reference = null,
    eras = [],
  } = {},
) {
  const marks = Array.isArray(data) ? data : [];
  const values = marks.map((m) => m.value).filter(Number.isFinite);
  const peakAt = values.length ? values.indexOf(Math.max(...values)) : -1;
  /** The first reading after the peak at or below the reference — the same derivation
   *  `crossing-geometry.ts` makes, so the predicate and the drawing never disagree. */
  const crossingIndex =
    reference === null || peakAt < 0
      ? -1
      : marks.findIndex((m, i) => i >= peakAt && m.value <= reference);
  /** Mean absolute year-on-year change as a fraction of the series' own range, so "noisy" is
   *  measured rather than judged. */
  const range = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const steps = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const noisiness =
    range > 0 && steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length / range : 0;
  const span = marks.length ? { first: marks[0].key, last: marks[marks.length - 1].key } : null;

  return {
    markCount: marks.length,
    hasReference: reference !== null,
    reference,
    crosses: crossingIndex >= 0,
    crossingKey: crossingIndex >= 0 ? marks[crossingIndex].key : null,
    noisiness,
    /** Only the declared events that actually fall inside the series' own extent. An era outside
     *  the span would be drawn off the plot, or worse, clamped onto its edge as though it had
     *  happened there. */
    eras: span
      ? eras.filter((e) => String(e.from) >= String(span.first) && String(e.to) <= String(span.last))
      : [],
    /** Series the beat can name at their own ends. One is the common case and still counts: a
     *  single line's end label is the same decision as nine of them. */
    seriesCount: namedSeries.length,
    /** Entities, periods or precedents the beat draws that are NOT its subject. */
    hasComparisonSet: comparisonSet.length > 0,
    comparisonSize: comparisonSet.length,
    /** A drawn mark the beat supplies for its own unit — a mullet, a human figure. */
    unitMark,
    subject,
  };
}

/**
 * The filed treatments. `applies` is a predicate over `beatFacts`'s output, written so it can be
 * read beside the record it implements.
 */
export const TREATMENTS = Object.freeze([
  {
    id: "accent-marks-the-thread",
    name: "The accent marks the argument's thread, never the largest value",
    // A floor rather than an option: it governs wherever an accent is assigned, which is always.
    applies: () => true,
    draws: Object.freeze(["value", "annot"]),
    priority: 9,
  },
  {
    id: "crossing-marked",
    name: "The year the series crosses its reference level is drawn and named",
    applies: (facts) => facts.hasReference && facts.crosses,
    draws: Object.freeze(["annot"]),
    priority: 8,
  },
  {
    id: "direct-end-label-in-the-series-colour",
    name: "Every series is named at its own end, in its own colour",
    // The usual objection is that past three or four series direct labelling stops working. Our
    // World in Data does it at NINE on one axis with no legend, which is where the evidence puts
    // the threshold. Beyond that the arbiter drops or displaces rather than overlapping.
    applies: (facts) => facts.seriesCount >= 1,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "context-in-neutral-at-the-subject-scale",
    name: "The comparison set shares the subject's unit and is drawn in neutral",
    applies: (facts) => facts.hasComparisonSet,
    draws: Object.freeze(["axis", "annot"]),
    priority: 5,
  },
  {
    id: "area-to-reference",
    name: "The band between the series and its reference level is tinted",
    applies: (facts) => facts.hasReference,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "raw-under-smoothed",
    name: "Faint per-reading dots under a bold centred mean",
    // Measured rather than judged: the mean step is at least this fraction of the whole range, and
    // there are enough readings for a window to mean anything.
    applies: (facts) => facts.markCount >= 20 && facts.noisiness >= 0.02,
    draws: Object.freeze(["value"]),
    priority: 4,
  },
  {
    id: "era-bands",
    name: "Datable events inside the series' own span are shaded",
    applies: (facts) => facts.eras.length > 0,
    draws: Object.freeze(["eyebrow"]),
    priority: 1,
  },
  {
    id: "value-on-the-mark",
    name: "The value is printed on the mark it belongs to",
    applies: (facts) => facts.markCount > 0 && facts.markCount <= MOST_MARKS_THAT_CAN_CARRY_A_LABEL,
    draws: Object.freeze(["value"]),
    priority: 3,
  },
  {
    id: "mark-depicts-its-subject",
    name: "The mark is a drawing of the thing being counted",
    // It costs a drawn asset per subject, which no renderer can invent: the beat supplies it or the
    // treatment does not apply. And there is no drawing of a megatonne.
    applies: (facts) =>
      Boolean(facts.unitMark) && facts.markCount <= MOST_MARKS_THAT_CAN_CARRY_A_LABEL,
    draws: Object.freeze(["value"]),
    priority: 2,
  },
]);

/**
 * Which filed treatments this beat's data shape admits, highest priority first — the order the
 * arbiter resolves them in.
 *
 * @param {ReturnType<typeof beatFacts>} facts
 */
export function applicableTreatments(facts) {
  return TREATMENTS.filter((treatment) => treatment.applies(facts)).sort(
    (a, b) => b.priority - a.priority,
  );
}
