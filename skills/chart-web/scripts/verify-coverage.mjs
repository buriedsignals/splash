// WHAT THE ONE COMMAND A PRODUCER RUNS DID NOT ASK, NAMED ON ITS OWN VERDICT.
//
// THE DEFECT THAT EARNED THIS. `SKILL.md` tells a producer to run `verify-web.mjs`. On the real
// 7 585-row Ember story it printed 63 green checks and, on the format's own declared decisions, it
// had asked two of them: `graphicFillsItsFrame` and `tableCarriesTheMarks`. The other sixteen —
// among them every capability this format PROMISES a reader (a keyboard that reaches every mark, a
// page that survives with scripting off, a build that stops under `prefers-reduced-motion`) — were
// reachable only from `test/`, whose walk covers the skill's own beats under `proof/` and has never
// seen a beat in `stories/`. Sixty-three green checks and no sentence anywhere saying which
// promises were not looked at is a FALSE CONFIRMATION, which is worse than a red.
//
// Most of the sixteen are now driven (see `verify-web.mjs`'s own CARGO, CAPABILITIES and BEAT
// RECORD sections). The ones that genuinely cannot be asked of one delivered page are the reason
// this file exists: they are printed, every run, with the reason they were not asked.
//
// THE POPULATION IS DERIVED, NEVER TYPED. `declaredDecisions` reads the `GUARDS` arrays this skill
// actually ships, so the day someone adds a decision to this skill and forgets to wire it, this
// reports it BY NAME on the next run and `test/verify-coverage.test.ts` goes red — rather than the
// decision joining the silent sixteen. What is hand-written here is only the REASON a name is not
// asked, and a name with no reason recorded is itself a failure: an unreachable decision has to be
// argued, not assumed.

import { declaredDecisions } from "./detect-guard-wiring.mjs";

/** Why a decision this skill declares is not asked of a single delivered page.
 *
 *  Each entry is a claim about the decision's own SUBJECT, not about the effort of wiring it. A
 *  decision that could be asked of the page and simply is not belongs in `verify-web.mjs`, not
 *  here — that is the difference this whole round is about. */
export const NOT_ABOUT_ONE_PAGE = {
  // QUOTED, and that is not a style choice: `declarationsWithoutACaller` blanks a quoted bare
  // name before it looks for a caller, precisely so a file that NAMES a decision cannot read as a
  // file that RUNS one. Written as a bare key, each of these three would have marked its own
  // decision "wired" from a table whose entire subject is that nothing wires it.
  "deadExampleRunners":
    "its subject is this SKILL's own example runners, not a beat: it asks whether the commands " +
    "`SKILL.md` advertises still run. `scripts/example-runners.mjs` is its command",
  "swallowedExampleRunners":
    "the same subject read one notch tighter — whether one of those runners exited 0 while printing " +
    "a thrown error, which is a fact about a spawned PROCESS and not about a page this command has " +
    "in its hands. `scripts/example-runners.mjs` is its command too",
  "declarationsWithoutACaller":
    "its subject is this skill's own wiring — which of these decisions anything calls — so asking " +
    "it of a page would be a rule reading itself. `scripts/check-guard-wiring.mjs` is its command",
  "framingMeasurement":
    "it decides on the VALUE ARRAY a component framed its axis from, which only the component " +
    "holds; a delivered page carries the marks' own readings as prose in `data-detail`, and " +
    "parsing numbers back out of a sentence would be this script inventing the input rather than " +
    "measuring it",
};

/**
 * Every decision this skill DECLARES that the run did not ask, each with the reason it was not
 * asked — or with `reason: null`, which is the failure this exists to make visible.
 *
 * `asked` is the set of names the caller actually ran, passed in rather than inferred: a scan of
 * this file's own source for the names would count an import and a comment as a question asked,
 * which is exactly the mistake `declarationsWithoutACaller` had to grow three separate defences
 * against.
 */
export function decisionsNotAsked(skillDir, asked) {
  const ran = new Set(asked);
  return declaredDecisions(skillDir)
    .map((decision) => decision.name)
    .filter((name) => !ran.has(name))
    .sort()
    .map((name) => ({ name, reason: NOT_ABOUT_ONE_PAGE[name] ?? null }));
}
