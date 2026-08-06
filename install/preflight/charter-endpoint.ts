// charter-endpoint.ts — the thin layer between the charter extractor and the setup page.
//
// `proposeCharter` (lib/newsroom/charter.ts) returns a `CharterProposal`: raw measurements,
// signal weights, an extraction-wide confidence. A page cannot show that directly — it needs a
// VALUE and the SENTENCE saying where it was read, because (skills/newsroom-charter/SKILL.md)
// "a journalist can only disagree with a value whose origin they can see". `readoutFrom` is that
// translation, pure and total: it never raises the confidence the extractor states, and it never
// invents a signal beyond the ones charter.ts actually emits (`ColourSignal`, `SIGNAL_LABEL`).
import type {
  CharterConfidence,
  CharterProposal,
  ColourCandidate,
  Measurement,
  TypeMeasurement,
} from "../../lib/newsroom/charter.ts";
import { SIGNAL_LABEL, WEIGHT } from "../../lib/newsroom/charter.ts";

export type CharterReadout = {
  /** Ranked, best first. Empty means the site declared nothing — a legitimate answer. */
  palette: { hex: string; receipt: string; confidence: CharterConfidence }[];
  ground?: { value: string; receipt: string };
  /** Measured, never written to frontmatter — see Task 2. */
  typefaces: { family: string; role: string; receipt: string }[];
  /** Verbatim caveats from the extractor, for the page to relay unchanged. */
  notes: string[];
};

/**
 * The receipt sentence for one colour reading: what kind of declaration it is (`SIGNAL_LABEL`,
 * the same table charter.ts uses to keep every signal labelled) plus the literal token it was
 * read from, so the journalist can find it on their own site.
 */
function receiptFor(m: Measurement): string {
  return `Read from ${SIGNAL_LABEL[m.signal]}: \`${m.token}\`.`;
}

const TYPE_ROLE_LABEL: Record<TypeMeasurement["role"], string> = {
  body: "the body text",
  headings: "the headings",
  webfont: "a self-hosted webfont",
};

function typeReceiptFor(t: TypeMeasurement): string {
  return `Read as the font of ${TYPE_ROLE_LABEL[t.role]}: \`${t.token}\`.`;
}

/**
 * The same three signals `proposeCharter` treats as an actual DECLARATION (theme-color,
 * brand-property, masthead) rather than an inference from links/controls/frequency — see
 * `DECLARED_SIGNALS` in lib/newsroom/charter.ts, duplicated here because it is not exported.
 */
const DECLARED_SIGNALS = new Set(["theme-color", "brand-property", "masthead"]);

/**
 * A candidate's own confidence, read straight off ITS evidence — never off the extraction-wide
 * `proposal.confidence`, which only describes the top candidate. This cannot overstate: the
 * ranking sorts by best signal weight first, and every declared signal outweighs every
 * non-declared one (charter.ts's `WEIGHT` table), so a candidate ranked below one with no
 * declared evidence can never itself carry declared evidence either. `proposeCharter` never
 * proposes a candidate with only neutral/absent evidence, so this is always `declared` or
 * `inferred` in practice — never `none`.
 */
function candidateConfidence(candidate: ColourCandidate): CharterConfidence {
  return candidate.evidence.some((e) => DECLARED_SIGNALS.has(e.signal))
    ? "declared"
    : "inferred";
}

/**
 * The reading that most earns a candidate's receipt: the HIGHEST-weighted entry in its evidence,
 * by the exact same rule `rank()` in charter.ts uses to pick a merged candidate's representative
 * value (`WEIGHT[c.signal] > WEIGHT[a.signal]`, first element as the seed so ties keep the
 * earliest-scanned reading).
 *
 * Deliberately NOT `evidence.find(e => e.value === candidate.value)`: `rank()` buckets by EXACT
 * hex first (a `Map` keyed on the literal `#rrggbb`), and that bucket's `value` field is simply
 * whichever measurement was pushed into it first — the weight-based reassignment only runs on
 * the MERGE path, across buckets whose hexes are merely close. Two different signals that declare
 * the identical hex (`--accent:#0a5c36` then `--brand:#0a5c36`) land in the SAME bucket and never
 * hit that reassignment, so value-equality returns whichever was scanned first — the accent, even
 * though the brand property is the higher-weighted, more deliberate declaration. Selecting by
 * weight directly is correct in both cases (same-bucket and merged-bucket) and needs no bucketing
 * knowledge here at all.
 */
function bestEvidence(candidate: ColourCandidate): Measurement {
  return candidate.evidence.reduce((a, c) =>
    WEIGHT[c.signal] > WEIGHT[a.signal] ? c : a,
  );
}

export function readoutFrom(proposal: CharterProposal): CharterReadout {
  const palette = proposal.candidates.map((candidate) => ({
    hex: candidate.value,
    receipt: receiptFor(bestEvidence(candidate)),
    confidence: candidateConfidence(candidate),
  }));

  const typefaces = proposal.typography.map((t) => ({
    family: t.family,
    role: t.role,
    receipt: typeReceiptFor(t),
  }));

  return {
    palette,
    ...(proposal.ground
      ? {
          ground: {
            value: proposal.ground.value,
            receipt: receiptFor(proposal.ground),
          },
        }
      : {}),
    typefaces,
    notes: proposal.notes,
  };
}
