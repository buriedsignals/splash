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
// WHAT IS DELIBERATELY ABSENT. The probes that produced this design drew four more —
// `area-to-reference`, `crossing-marked`, `raw-under-smoothed`, `era-bands` — and they are real:
// one of them surfaced an editorial fact the CO₂ beat was hiding. None is here, because each rests
// entirely on `100.datavizproject.com`, one publication, and the evidence floor measures
// independence at the PUBLICATION. They will be filed the day a second desk is found doing them.
// See `docs/design-base/METHOD.md`, correction 4.

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
  { comparisonSet = [], unitMark = null, subject = null, namedSeries = [] } = {},
) {
  const marks = Array.isArray(data) ? data : [];
  return {
    markCount: marks.length,
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
