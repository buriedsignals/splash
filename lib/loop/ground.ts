// lib/loop/ground.ts — THE HOUSE GROUND, WHEN IT CANNOT CARRY TEXT: the question that is put,
// and the answer that is recorded.
//
// A newsroom declares a background once and every visual inherits it. Most colours carry text
// fine; a few cannot, and a mid-grey is the plain case — nothing, black or white, separates from
// it enough to read. Until now the run met that as an engine refusal: a conformance dump naming
// hex values and a ratio, with no way forward but editing NEWSROOM-PROFILE.md and guessing.
//
// Three things are true at once, and this module is where they are reconciled:
//   · a compliant ground is simply allowed — the measurement that used to refuse saturated house
//     colours over a backdrop the run cannot render is repaired in lib/core/ground.ts;
//   · Splash never proposes a ground of its own that fails — both alternatives offered here are
//     re-measured before they are offered;
//   · when the newsroom's OWN colour genuinely fails, they are told what happens to their text
//     and asked. Keeping it is one of the answers.
//
// ★ WHY THE ANSWER IS RECORDED ON THE MANIFEST, like `confirmedTakeaway`. A ground kept despite
// the warning ships a visual whose text is hard to read; the only acceptable version of that is
// one that traces to a person who was shown the consequence and said yes. `run.ground` is that
// trace: written only by `chooseGround` below, re-checked by `groundGate` at every produce, and
// INVALIDATED when the newsroom's declared colour moves — an override belongs to the colour it
// was given for, never to whatever the profile says later.
import { groundChoices, groundLegibility } from "../core/ground";
import { resolveThemeBg } from "../core/theme";
import { fail, ok, type VerbResult } from "../core/verbs";
import { groundChoiceCopy } from "../newsroom/ui-copy";
import {
  producerHonoursGround,
  type BrandProfile,
} from "../../skills/splash/src/brand-profile";
import type { GroundDecision, RunManifest } from "./manifest";

/** The house style produce should build with, or the question it must put first. */
export type GroundGate =
  { ok: true; house?: BrandProfile } | { ok: false; message: string };

/** The house hue, when the profile declares one — the furniture's greys are tinted toward it, so
 *  the legibility question has to be asked about the colours that are actually painted. */
function hueOf(house: BrandProfile | undefined): string | undefined {
  return house?.palette?.[0];
}

/**
 * Compose the notification and the offer. Everything a journalist reads is copy
 * (lib/newsroom/ui-copy.ts); everything a journalist chooses between is measured
 * (lib/core/ground.ts). This function only puts the two together.
 */
function question(
  declared: string,
  house: BrandProfile,
  lang?: string,
): string {
  const copy = groundChoiceCopy(lang ?? house.lang ?? "");
  const choices = groundChoices(declared, hueOf(house))!;
  return [
    copy.problem(choices.declared),
    "",
    copy.optionNearest(choices.nearest),
    copy.optionSubject(choices.subject),
    copy.optionKeep(choices.declared),
    "",
    copy.question,
  ].join("\n");
}

/**
 * What `produce` asks before it assembles anything.
 *
 * Returns the house style to build with — untouched when the ground is fine (so an install with a
 * legible charter is byte-identical), carrying the recorded replacement or the recorded
 * acceptance when the journalist has answered — or the question, when they have not.
 */
export function groundGate(
  /** The producer this build will actually run. The question is only put to the ones a house
   *  ground reaches: Datawrapper's two engines render on their own plan-gated white whatever the
   *  newsroom declares (skills/splash/src/brand-profile.ts's merge, and lib/brain/eligibility.ts
   *  says the same at the offer), so stopping one of those over a colour it never paints would be
   *  a wall in front of a problem it does not have. */
  producer: string,
  house: BrandProfile | undefined,
  recorded: GroundDecision | undefined,
  lang?: string,
): GroundGate {
  if (!producerHonoursGround(producer)) return { ok: true, house };
  const declared = resolveThemeBg(house?.theme);
  // No house style, or the light default: nothing was declared that could fail.
  if (!house || !declared) return { ok: true, house };
  if (groundLegibility(declared, hueOf(house)).ok) return { ok: true, house };
  // A decision made about a DIFFERENT colour is not a decision about this one — the newsroom
  // edited its profile since, and the question has to be put again for the colour now declared.
  if (!recorded || recorded.declared !== declared)
    return { ok: false, message: question(declared, house, lang) };
  return {
    ok: true,
    house:
      recorded.decision === "keep"
        ? { ...house, themeAccepted: true }
        : { ...house, theme: recorded.applied },
  };
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * Record the journalist's answer on the run.
 *
 * `answer` is either the word `keep` — their colour, as declared, with the consequence accepted —
 * or a `#rrggbb` they chose: one of the two the offer proposed, or any other colour they name.
 *
 * A named colour that ALSO cannot carry text is refused rather than recorded. That is not the tool
 * overruling them: `keep` is always available for the colour they declared, and it is the one
 * answer that carries the acceptance. What must not exist is a second illegible ground arriving
 * through the door marked "alternatives that work".
 */
export function chooseGround(
  run: RunManifest,
  house: BrandProfile | undefined,
  answer: "keep" | (string & {}),
  now: () => string = () => new Date().toISOString(),
): VerbResult<RunManifest> {
  const declared = resolveThemeBg(house?.theme);
  if (!house || !declared)
    return fail(
      "invalid-request",
      "choose-ground: this install declares no house background, so there is nothing to decide",
    );
  if (groundLegibility(declared, hueOf(house)).ok)
    return fail(
      "invalid-request",
      `choose-ground: the house background ${declared} carries readable text — there is nothing to decide`,
    );

  const chosen = answer.trim();
  if (chosen === "keep")
    return ok({
      ...run,
      ground: {
        declared,
        decision: "keep",
        applied: declared,
        at: now(),
      },
    });
  if (!HEX6.test(chosen))
    return fail(
      "invalid-request",
      `choose-ground: ${JSON.stringify(answer)} is not a colour — answer "keep" to stay with ${declared}, or give a #rrggbb`,
    );
  const applied = chosen.toUpperCase();
  if (!groundLegibility(applied, hueOf(house)).ok)
    return fail(
      "invalid-request",
      `choose-ground: ${applied} cannot carry readable text either — pick another colour, or answer "keep" to stay with ${declared} as it is`,
    );
  return ok({
    ...run,
    ground: { declared, decision: "replace", applied, at: now() },
  });
}
