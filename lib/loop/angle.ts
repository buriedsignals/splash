// lib/loop/angle.ts
// The DECISION that records the confirmed angle — the human turn `nextActions` has always been
// able to NAME (`confirm-angle`) and that nothing could ever perform.
//
// Why this exists at all, given that the decision-surface slice deliberately left it out ("free
// editorial text; a command that writes arbitrary prose into the manifest would be the disease,
// not the cure"): that reasoning is right, and it is about a GENERIC writer — a `set --field
// <path> --value <prose>`, where the caller chooses WHERE the prose lands. Such a command would
// make the loop's mechanics decorative, because every guard that assumes state was written by
// code would be bypassable by construction.
//
// The angle is not that. It has KNOWN PARTS, and this codebase already knows them: the manifest
// types them (`{confirmedTakeaway, emphasis?, altInsight, unit}`) and lib/host/drive.ts already
// NAMES the three required ones in its refusal ("the angle (takeaway, alt text, unit) has to be
// confirmed"). So the caller never names a key — it answers one of four known questions, and
// three of them are refused blank. That is a questionnaire with refusals, not a prose writer.
//
// The two blank refusals are not invented here either. lib/delivery/metadata.ts already makes
// both, at PACKAGING time: a blank altInsight (WCAG 1.1.1 — and lib/core/conformance-l0.ts makes
// the producers fail hard on it) and a blank confirmedTakeaway ("a blank title is as visible to a
// reader as a blank alt text is to a screen-reader user"). Making them here means the run cannot
// carry the blank at all: the journalist learns before producing, not hours later at hand-over.
//
// The INTENT is the fourth refusal, added 2026-07-27 (spec 2026-07-27-intent-declared-design.md).
// It was not asked at all: the ranking's semantic input was GUESSED from the takeaway's prose by
// a keyword pass, which is exactly what the socle forbids — the tool describes factually and the
// journalist chooses the angle; it never proposes the story. Measured, the guess also no-oped on
// ordinary French phrasings ("Genève paie la prime la plus lourde" ⇒ nothing) and mis-fired on
// others (a claim about spread read as geography, because "canton" won), leaving the offer
// ordered by fit and readiness alone with nothing saying so.
//
// It belongs HERE rather than in a command of its own for the reason above: it is one more of the
// angle's known parts, from a CLOSED vocabulary, so it is the least prose-like question on this
// surface — the caller picks one of nine values.
import { INTENTS, isIntent, type Intent } from "../brain/intents";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { RunElement } from "./manifest";

/** The parts of an angle, as a caller supplies them. `emphasis` is the only optional one —
 *  it selects what to highlight, and having nothing to highlight is an ordinary answer.
 *
 *  `intent` arrives as a plain string, not as `Intent`: it reaches this function from a CLI flag
 *  and from a host's JSON, so the value has to be REFUSED here rather than assumed by a type that
 *  nothing checked at the boundary. */
export type AngleParts = {
  takeaway: string;
  altInsight: string;
  unit: string;
  intent: Intent | (string & {});
  emphasis?: string;
};

// One rule, applied three times, so the three refusals cannot drift into three different
// standards of "present".
function required(
  value: string,
  what: string,
  why: string,
): { message: string } | null {
  return value.trim() === "" ? { message: `${what} — ${why}` } : null;
}

/**
 * Record the confirmed angle on an element. Returns a NEW element — the caller persists it.
 *
 * Takes the element alone, like chooseForm: nothing here depends on run-level state, and an
 * argument this function does not read would misdescribe what the decision rests on.
 *
 * Re-confirming is ALLOWED, and it is the back-edge lib/loop/revise.ts models — the journalist
 * changes the angle after seeing the visual. The angle is in provenanceHash, so a produced
 * artifact goes stale and nextActions routes back to produce on its own. Nothing is deleted here.
 */
export function confirmAngle(
  el: RunElement,
  parts: AngleParts,
): VerbResult<RunElement> {
  const refusal =
    required(
      parts.takeaway,
      `confirm-angle: element ${el.id} was given a blank takeaway`,
      "the confirmed takeaway becomes the visual's title, and a blank title is as visible to a reader as a blank alt text is to a screen-reader user",
    ) ??
    required(
      parts.altInsight,
      `confirm-angle: element ${el.id} was given a blank alt text`,
      "WCAG 1.1.1: the alt text must state the insight, not the chart's structure — the producers refuse to render without one",
    ) ??
    required(
      parts.unit,
      `confirm-angle: element ${el.id} was given a blank unit`,
      "a value with no unit is a claim about a bare number; for a count, the unit is the thing counted",
    ) ??
    required(
      parts.intent,
      `confirm-angle: element ${el.id} was given no intent`,
      "what the journalist wants the figure to SHOW is what orders the offer — left blank, the forms are ranked by fit and readiness alone and the one that serves the point is buried among the ones that do not",
    );
  if (refusal) return fail("invalid-request", refusal.message);

  const intent = parts.intent.trim();
  // A CLOSED vocabulary, so an unrecognised answer is refused with the whole list rather than
  // dropped: the ranking has nothing to do with a value no KB sheet declares, and silently
  // ignoring it would put us back where this slice started — an offer ordered by nothing, with
  // the run reporting that an intent was recorded.
  if (!isIntent(intent))
    return fail(
      "invalid-request",
      `confirm-angle: element ${el.id} was given the intent ${JSON.stringify(intent)}, ` +
        `which is not one of ${INTENTS.join(", ")}`,
    );

  const emphasis = parts.emphasis?.trim();
  return ok({
    ...el,
    angle: {
      confirmedTakeaway: parts.takeaway.trim(),
      altInsight: parts.altInsight.trim(),
      unit: parts.unit.trim(),
      intent,
      // Conditional, never `emphasis: undefined` riding along — the discipline driver.ts records
      // for `refusal`: no present-but-empty marker where absent already says the same thing.
      ...(emphasis ? { emphasis } : {}),
    },
  });
}

/**
 * Carry a just-confirmed angle to the deliverables declared as siblings of that element.
 *
 * One story, several outputs, ONE editorial point: that is the whole multi-deliverable model
 * (`docs/superpowers/specs/2026-07-26-cadrage-deliverables-design.md`), and `deliverables.ts`
 * already copies the angle when it PLANS siblings from a master. But `init` lets a host declare
 * `deliverableOf` directly, which reaches no such code — so on a real run the master got its
 * takeaway and the declared sibling got none, and a second `confirm-angle` accepted a
 * contradictory one for the same story. The discipline "the title IS the confirmed takeaway"
 * cannot hold if one run carries two.
 *
 * It fills a blank and never overrules: a sibling that confirmed its own angle made a deliberate
 * decision (the back-edge revise.ts owns), and inheritance is not entitled to undo it.
 */
export function inheritAngle(
  elements: RunElement[],
  master: RunElement,
): RunElement[] {
  if (!master.angle) return elements;
  return elements.map((el) =>
    el.deliverableOf === master.id && !el.angle
      ? { ...el, angle: master.angle }
      : el,
  );
}
