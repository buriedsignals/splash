// twin/skills/splash/scripts/review-attempts.mjs
//
// WHAT HAPPENS WHEN AN INDEPENDENT REVIEW CANNOT RUN — issue #46.
//
// The `designer` persona is a read-only review that informs the craft checklist before G3. On a
// real beat it was invoked twice and died both times before producing a verdict — an HTTP 500 and
// an HTTP 529 from the model serving the subagent. Both are infrastructure, not Splash code and
// not anything about the beat; the first had got as far as "now let me render it at the four
// viewports", so it died mid-review having already spent its reads.
//
// The operating contract covered the adjacent case and not this one. "3 cycles, then blocked, hand
// back with the gaps named and what was tried" is a rule about a beat whose RENDER keeps failing.
// A persona that never got to look at the render is a different thing: there is no gap in the beat
// to name, nothing to fix, and "a targeted fix naming the cause" is meaningless when the cause is
// a 529.
//
// So, three facts, written down instead of improvised per run:
//
//   1. AN UNOBTAINABLE REVIEW DOES NOT BLOCK G3. The designer never approves pixels; G3 is the
//      journalist's alone. The honest degraded path is to proceed and TELL them it is absent.
//   2. THE ATTEMPT IS RECORDED, in the beat, so `whereIs` and any later session can tell "review
//      not yet run" from "review run twice and killed by infrastructure". Nothing on the
//      filesystem changed when the persona died, so without this the resolver re-issues the same
//      instruction that just failed and the story can stall forever.
//   3. IT IS BOUNDED AT TWO. A 529 is a capacity signal; a third immediate attempt is likely to
//      fail the same way. Two, then proceed disclosed.
//
// NOT the maintainer channel. `recordMaintainerNote` is for defects in OUR code. A journalist whose
// beat was approved without an independent review needs to know that — it is a disclosure to them,
// not an internal note about us.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const REVIEW_ATTEMPTS_FILE = "REVIEW-ATTEMPTS.json";

/** Two, then proceed. See fact 3 above. */
export const MAX_REVIEW_ATTEMPTS = 2;

function attemptsPath(beatDir) {
  return join(beatDir, REVIEW_ATTEMPTS_FILE);
}

/** What this beat has recorded. `[]` when the file is absent — "not yet run". */
export async function readReviewAttempts(beatDir) {
  let text = null;
  try {
    text = await readFile(attemptsPath(beatDir), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${attemptsPath(beatDir)} is not valid JSON`, { cause: error });
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${attemptsPath(beatDir)} must hold a list of attempts`);
  }
  return parsed;
}

/**
 * Record one review that could not complete. `error` is the transport failure verbatim — the
 * request id in it is the only thing that makes a capacity incident traceable afterwards, and
 * paraphrasing it would throw away the one detail that is not reproducible.
 */
export async function recordFailedReview(beatDir, { persona, error, at = new Date().toISOString() }) {
  if (!persona) throw new Error("recordFailedReview needs the persona that was invoked");
  if (!error) throw new Error("recordFailedReview needs the transport error, verbatim");
  const attempts = await readReviewAttempts(beatDir);
  attempts.push({ persona, error: String(error), at });
  await writeFile(attemptsPath(beatDir), `${JSON.stringify(attempts, null, 2)}\n`);
  return attempts;
}

/**
 * `null` while a review is still worth attempting; otherwise the DISCLOSURE — the sentence the
 * journalist is told at G3, naming how many attempts were made and what killed them.
 *
 * It is worded for the journalist, not for us: they are being asked to approve a beat that no
 * independent eye has read, and the reason is ours to state plainly rather than to summarise away.
 */
export function reviewDisclosure(attempts, { persona = "designer" } = {}) {
  if (!Array.isArray(attempts) || attempts.length < MAX_REVIEW_ATTEMPTS) return null;
  const failures = attempts
    .slice(-MAX_REVIEW_ATTEMPTS)
    .map((attempt) => attempt.error)
    .join("; ");
  return (
    `the independent ${persona} review could not be obtained: ${attempts.length} attempts, each ` +
    `ended by an error outside this story (${failures}). It is a review of the RENDER, and it ` +
    `never approves anything — approval is yours — so this does not stop you approving the beat. ` +
    `It does mean no independent eye has read it, and you are deciding without one.`
  );
}
