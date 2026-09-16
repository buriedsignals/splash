// twin/skills/chart-web/scripts/precision.mjs
//
// WHAT A WEB BEAT DECLARES IT ASSERTS — AND NOTHING DERIVED.
//
// Spec §1.1: web's precision is "the floor the JS-off static frame asserts, plus the readings only
// revealed on demand". Two places, not one, and the distinction is the whole point of the export:
// a reading that is only ever behind a hover is a reading a reader with no script never gets, so it
// may not be the one the claim rests on.
//
// So the declared shape carries `staticFloor` and `onDemand`, which scrolly's `perCard`, video's
// `perShot` and static's `labels` do not — the four shapes are pairwise distinct on purpose.
//
// WHICH OF THE TWO A READING LANDS IN IS READ OFF THE DELIVERED PAGE, never off a claim about it.
// The beat declares its datum ids and the exact text it puts in front of a reader for each; this
// module then asks the page where that text actually appears — printed before any control is
// touched (`defaultPrintedText`, the same reading `assertControlsChangeSomething` trusts), inside
// an answer a reader has to ask for (`askAnswers`), or nowhere. The ids and the readings are the
// journalist's; only the verdict is mechanical.

import { assertionId, requiredAssertions } from "#shared/editorial/frame.mjs";
import {
  answerPieces,
  askAnswers,
  defaultPrintedText,
} from "../assets/interaction-plan.ts";

/**
 * What this beat asserts, and WHERE a reader actually gets it.
 *
 * The ids and the strings are the JOURNALIST'S — `declares` maps each datum id to the exact text
 * the page puts in front of a reader for it. What is mechanical, and what this function does, is
 * deciding for each one whether the page prints it AT REST (the JS-off floor), only inside an
 * answer a reader must ask for (on demand), or nowhere at all.
 *
 * @param {string} briefText the beat's own `BRIEF.md`, unmodified
 * @param {{ html: string, declares?: Record<string, string>,
 *           rounding?: { unit: string, digits: number },
 *           values?: Record<string, { value: number|string, unit: string|null, digits: number|null }> }} ctx
 */
export function parsePrecision(briefText, ctx = {}) {
  const html = String(ctx.html ?? "");
  if (html === "")
    throw new Error(
      "parsePrecision needs one delivered page: web's precision is where a reading actually LANDS " +
        "\u2014 at rest or only on demand \u2014 and that is a property of the page, not a claim about it.",
    );
  const printed = defaultPrintedText(html);
  const answered = new Set(askAnswers(html).flatMap((answer) => answerPieces(answer)));

  const declares = ctx.declares ?? {};
  const staticFloor = [];
  const onDemand = [];
  const unfound = [];
  for (const [id, text] of Object.entries(declares)) {
    const reading = String(text);
    if (printed.includes(reading)) staticFloor.push(id);
    else if ([...answered].some((piece) => piece.includes(reading))) onDemand.push(id);
    else unfound.push(id);
  }

  return {
    kind: "pointer",
    rounding: ctx.rounding ?? null,
    asserts: [...staticFloor, ...onDemand],
    values: { ...(ctx.values ?? {}) },
    staticFloor,
    onDemand,
    // Declared and nowhere on the page. Kept rather than dropped, so `checkPrecision` can say so
    // instead of a requirement silently going uncovered for the wrong reason.
    unfound,
  };
}

/** A declared value, rounded the way the beat says it rounds, as a string so 0.57 and "0,57" meet. */
function atRounding(value, digits) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value).trim();
  return digits === null || digits === undefined ? String(n) : n.toFixed(digits);
}

/**
 * TWO MECHANICAL CHECKS AND NO THIRD (spec §2.5), plus the one thing that is web's alone: a
 * requirement the chain makes may be satisfied only by the STATIC FLOOR. A reading a reader has to
 * hover for is a reading the JS-off page never makes, so it cannot carry the claim.
 */
export function checkPrecision(declared, { required = [], data = {} } = {}) {
  const out = [];
  const floor = new Set((declared.staticFloor ?? []).map((id) => assertionId(id)));
  const anywhere = new Set((declared.asserts ?? []).map((id) => assertionId(id)));
  for (const id of declared.unfound ?? [])
    out.push({
      id,
      severity: "violation",
      says: `\`${id}\` is declared but the delivered page states it nowhere, at rest or on demand`,
    });

  for (const requirement of required) {
    const id = assertionId(requirement.id);
    if (floor.has(id)) continue;
    out.push({
      id,
      severity: "violation",
      says: anywhere.has(id)
        ? `\`${id}\` (${requirement.because}) is only answered on demand; the JS-off floor never states it`
        : `the chain requires \`${id}\` (${requirement.because}); this page states it nowhere`,
    });
  }

  const digits = declared.rounding?.digits ?? null;
  for (const [id, declaredValue] of Object.entries(declared.values ?? {})) {
    if (!(id in data)) {
      out.push({
        id,
        severity: "violation",
        says: `\`${id}\` is declared but the frozen data holds no such datum`,
      });
      continue;
    }
    const want = atRounding(data[id], declaredValue.digits ?? digits);
    const got = atRounding(declaredValue.value, declaredValue.digits ?? digits);
    if (want !== got)
      out.push({
        id,
        severity: "violation",
        says: `\`${id}\` is declared ${got} and the frozen data says ${want} at the declared rounding`,
      });
  }
  return out;
}

// ── THE EMPTY PRECISION SECTION A SCAFFOLD WRITES ──────────────────────────────────────────────
//
// It states what the CHAIN requires of this beat and answers none of it. Which numbers satisfy a
// requirement, at what rounding and in what unit, is read off the subject's own data and written
// by the journalist (spec §1.4).

/**
 * `## Precision`, empty: the requirements listed, every one of them unanswered.
 * @param {Array<{id: string, because: string}>} required `requiredAssertions`' own output
 */
export function renderPrecisionSection(required = []) {
  return [
    "## Precision",
    "",
    "<!-- WHAT THE CHAIN REQUIRES OF THIS BEAT. Each line is a requirement, not an answer: which",
    "     number satisfies it, at what rounding and in what unit, is read off this beat's own",
    "     frozen data and written below by you.",
    "",
    ...required.map((r) => `  ${r.id}  (${r.because})`),
    "-->",
    "",
    "SCAFFOLD: the rules this beat holds itself to, one bullet each, bold lead first — and, for every",
    "requirement quoted above, which of those rules answers it.",
    "",
  ].join("\n");
}

/**
 * THE REQUIREMENTS A SCAFFOLD CAN ALREADY STATE — and the two it may not.
 *
 * `requiredAssertions` draws on four sources. Two are known the moment a type and a format are
 * chosen: the type sheet's own `## Precision to assert`, and where the assertion may land. Two are
 * the journalist's answers at G1 — the claim's SHAPE and its GROUNDING — and at scaffold time no
 * beat has them yet. They are therefore NAMED AS OWED in the section this renders, never guessed:
 * a guessed `supported` is a beat asserting a number the journalist said could not be verified.
 *
 * The literal `supported` below is a sentinel that lets `requiredAssertions` run at all; every row
 * it produces from the grounding is filtered straight back out.
 */
export function scaffoldRequirements(sheet, format) {
  return requiredAssertions(
    { format, claim: { shape: "none", grounding: "supported" } },
    sheet,
  ).filter((requirement) => requirement.because !== "grounding");
}
