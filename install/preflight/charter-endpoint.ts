// charter-endpoint.ts — the thin layer between the charter extractor and the setup page.
//
// `proposeCharter` (lib/newsroom/charter.ts) returns a `CharterProposal`: raw measurements,
// signal weights, an extraction-wide confidence. A page cannot show that directly — it needs a
// VALUE and the SENTENCE saying where it was read, because (skills/newsroom-charter/SKILL.md)
// "a journalist can only disagree with a value whose origin they can see". `readoutFrom` is that
// translation, pure and total: it never raises the confidence the extractor states, and it never
// invents a signal beyond the ones charter.ts actually emits (`ColourSignal`, `SIGNAL_LABEL`).
//
// M1 (final review, 2026-08-06): the receipt SENTENCES used to be English literals, relayed
// verbatim to a page that may be reading in French — the one flagship feature of this branch,
// unreadable to the newsroom it was built for. They now route through `PageCopy`
// (`signalLabel`/`typeRoleLabel`/`receiptReadFrom`/`receiptReadFont`), so `readoutFrom` takes a
// language and builds the sentence in it. `SIGNAL_LABEL` (English, charter.ts's own diagnostic
// vocabulary) stays that module's source of truth — `copy.ts`'s EN table re-exports it by
// reference rather than re-typing it, so the two cannot drift apart the way a hand-copied second
// table would. The extractor's own free-text `notes` (caveats it writes itself) are a separate,
// larger job and are NOT translated here — see docs/installer/setup-page-proof.md.
import type {
  CharterConfidence,
  CharterProposal,
  ColourCandidate,
  Measurement,
  TypeMeasurement,
} from "../../lib/newsroom/charter.ts";
import { WEIGHT } from "../../lib/newsroom/charter.ts";
import { pageCopy, type PageCopy } from "./copy.ts";

export type CharterReadout = {
  /** Ranked, best first. Empty means the site declared nothing — a legitimate answer. */
  palette: { hex: string; receipt: string; confidence: CharterConfidence }[];
  ground?: { value: string; receipt: string };
  /** Measured, never written to frontmatter — see Task 2. */
  typefaces: { family: string; role: string; receipt: string }[];
  /** Verbatim caveats from the extractor, for the page to relay unchanged. English only — see
   *  the module comment above. */
  notes: string[];
};

/**
 * The receipt sentence for one colour reading: what kind of declaration it is (`copy.signalLabel`,
 * translated the same way the page around it is) plus the literal token it was read from, so the
 * journalist can find it on their own site.
 */
function receiptFor(m: Measurement, copy: PageCopy): string {
  return `${copy.receiptReadFrom} ${copy.signalLabel[m.signal]}: \`${m.token}\`.`;
}

function typeReceiptFor(t: TypeMeasurement, copy: PageCopy): string {
  return `${copy.receiptReadFont} ${copy.typeRoleLabel[t.role]}: \`${t.token}\`.`;
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

/**
 * `lang` picks the receipt vocabulary (`pageCopy`, the same fallback-to-English table the rest
 * of the page uses) — it does not touch `proposal` itself, which is language-neutral (hex
 * values, literal CSS tokens). Defaults to English so every existing caller (this module's own
 * tests included) is byte-identical without passing one.
 */
export function readoutFrom(
  proposal: CharterProposal,
  lang = "en",
): CharterReadout {
  const copy = pageCopy(lang);
  const palette = proposal.candidates.map((candidate) => ({
    hex: candidate.value,
    receipt: receiptFor(bestEvidence(candidate), copy),
    confidence: candidateConfidence(candidate),
  }));

  const typefaces = proposal.typography.map((t) => ({
    family: t.family,
    role: t.role,
    receipt: typeReceiptFor(t, copy),
  }));

  return {
    palette,
    ...(proposal.ground
      ? {
          ground: {
            value: proposal.ground.value,
            receipt: receiptFor(proposal.ground, copy),
          },
        }
      : {}),
    typefaces,
    notes: proposal.notes,
  };
}
