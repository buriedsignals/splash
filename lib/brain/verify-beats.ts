// The beats seam GUARD — the exact counterpart of lib/brain/verify-offer.ts, and written from
// it rather than beside it.
//
// The journalist (through the desk) writes each beat's claim; this decides whether what came
// back is still the plan they were shown. It THROWS rather than returning a verdict, for the
// reason verifyOffer and assertFormatAllowed throw: a caller that wants to be lenient has to say
// so out loud.
//
// WHAT IT PROTECTS, AND WHAT IT DELIBERATELY DOES NOT. A rewritten beat is the journalist's
// words. The guard protects FACTS, not style — it never asks whether a sentence is good, only
// whether it is still about the same point of the same data and whether every number in it came
// from that data.
//
// THE ANCHOR IS NOT CHECKED — IT IS UNREACHABLE. AuthoredBeat carries `id`, `role` and `text`,
// and nothing else. The authoring turn therefore has nowhere to put a coordinate, so it cannot
// move one; the anchor is taken from the suggestion by id. This is the same device confirm-angle
// uses (host-journey spec §2.2): the surface IS the questionnaire, so there is no key to name
// and no path to aim at. A guard that merely CHECKED the anchor would still have to be trusted
// to run; a shape that cannot express the mistake does not.
//
// THE ORDER IS EXACT — same ids, same count, same positions — and it matters more here than it
// does for an offer. A beat plan IS an order: it is the narrative walk the reader is taken
// along. A plan whose beats moved is not the plan anyone approved. Dropping a beat (including
// dropping all of them) fails this exactly like reordering does, and shares its refusal, because
// both are the same violation: the list was rewritten. The legitimate way to change the walk is
// a RE-DRAFT — suggestBeats takes an explicit `anchors` list — not a silent edit inside the
// authoring turn.
//
// THE ROLE IS THE JOURNALIST'S TO CHANGE, bounded by arcErrors. The draft never guesses `turn`
// (the pivot of the argument is an editorial judgement, not a property of the data), so naming
// it is precisely the act left to a human; what arcErrors forbids — a half-arc, two establishes,
// two payoffs, two turns, a role beat asserting nothing — stays forbidden. The rule is the
// codebase's own (lib/core/claim-arc.ts), re-applied, never re-written.
//
// Accepted limitations — known and deliberate, inherited from verifyOffer for the same reasons:
//   - CROSS-ATTRIBUTION: two beats' texts swapped still passes. There is no textual tie to
//     check against, and the anchors are data values while the prose is the journalist's.
//   - SPELLED-OUT NUMBERS ("deux millions") bypass grounding entirely. Digits only.
//   - A text that CONTRADICTS its anchor in words ("the 2012 collapse" written on the 2007 beat)
//     is a matter of meaning, not structure, and nothing here can see it.
import { arcErrors } from "../core/claim-arc";
import type { ArcRole } from "../core/claim-arc";
import type { SuggestedBeat } from "./beats";
import { figuresIn } from "../core/figures";

export type AuthoredBeat = {
  id: string;
  role: ArcRole;
  /** The claim, in the journalist's language. */
  text: string;
};

export function verifyBeats(
  authored: AuthoredBeat[],
  suggested: SuggestedBeat[],
): void {
  const drafted = suggested.map((b) => b.id);

  for (const a of authored)
    if (!drafted.includes(a.id))
      throw new Error(`verifyBeats: "${a.id}" was not in the drafted plan`);

  const got = authored.map((a) => a.id);
  if (got.length !== drafted.length || got.some((id, i) => id !== drafted[i]))
    throw new Error(
      `verifyBeats: the order changed — drafted ${drafted.join(", ")}, authored ${got.join(", ")}`,
    );

  // The arc, by the engine's own validator: it is what refuses a blank claim, so "a beat nobody
  // authored must not ship" needs no second rule written here.
  const arc = arcErrors(authored.map((a) => ({ role: a.role, text: a.text })));
  if (arc.length) throw new Error(`verifyBeats: ${arc.join("; ")}`);

  // Claim grounding. Every number a beat asserts must be one the data contains: its own anchor
  // and value, the plan's computed shape, or another beat's anchor — the connective tissue a
  // narrative needs ("nothing has come back since 1979" written on the last beat).
  //
  // NOT every value in the series, and that omission is the guard's whole edge: admitting them
  // would make almost any two-digit number find a twin in an ordinary dataset, and a guard is
  // worth exactly what it refuses.
  const anchors = suggested.flatMap((b) => figuresIn(b.anchor.value));
  for (const a of authored) {
    const beat = suggested.find((b) => b.id === a.id)!;
    const allowed = new Set([
      ...Object.values(beat.beatSource.facts).flatMap(groundedForms),
      ...Object.values(beat.beatSource.shared).flatMap(groundedForms),
      ...anchors,
    ]);
    for (const n of figuresIn(a.text))
      if (!allowed.has(n))
        throw new Error(
          `verifyBeats: "${a.id}" claims the number ${n}, which is in neither this beat's facts nor the plan's`,
        );
  }
}

// A digit-group separator — ordinary space, non-breaking space, narrow no-break space — sitting
// between a digit and a following exactly-three-digit chunk is thousands grouping ("8 000",
// "1 234 567"), not two different numbers. Taken verbatim from verify-offer.ts: the two guards
// read the same prose in the same languages, and they must not disagree about what a number is.

// The forms of a grounded value a claim may legitimately take. Beyond the value itself, a
// DECIMAL rounding of it: writing "38.6 %" for a measured 38.57 % is a presentation of the same
// measurement, and refusing it would make the guard unusable on ordinary journalism.
//
// Decimals ONLY — no significant-figure widening. 583 → 600 and 38.57 → 40 change the MAGNITUDE
// of the claim, and a reader takes 600 as a fact. The residual is named in the design spec: if a
// real run hits this refusal, the closure is to EMIT the rounded figure as a drafted fact, never
// to loosen the guard.
const ROUNDING_DECIMALS = [0, 1, 2] as const;

function groundedForms(raw: string): string[] {
  const forms = new Set(figuresIn(raw));
  for (const n of figuresIn(raw)) {
    const v = Number(n);
    if (!Number.isFinite(v)) continue;
    for (const d of ROUNDING_DECIMALS) {
      const p = 10 ** d;
      forms.add(String(Math.round(v * p) / p));
    }
  }
  return [...forms];
}
