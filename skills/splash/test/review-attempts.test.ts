/**
 * A REVIEW THAT COULD NOT RUN, AS OPPOSED TO ONE THAT HAS NOT RUN — issue #46.
 *
 * The `designer` persona died twice on a real beat, to an HTTP 500 and an HTTP 529 from the model
 * serving the subagent. Nothing on the filesystem changed when it died — state here is derived from
 * the directory — so `whereIs` kept reporting `production` / `ready` / `persona:designer` and
 * re-issuing the instruction that had just failed. A later session recovering state off the
 * directory could not tell "not yet run" from "run twice and killed by infrastructure".
 *
 * These pin the three facts that answers, which were previously inferred from other rules or
 * improvised per run: the attempt is recorded, it is bounded at two, and an unobtainable review
 * does not block the journalist's own gate.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MAX_REVIEW_ATTEMPTS,
  REVIEW_ATTEMPTS_FILE,
  readReviewAttempts,
  recordFailedReview,
  reviewDisclosure,
} from "../scripts/review-attempts.mjs";

let beatDir: string;
beforeEach(async () => {
  beatDir = await mkdtemp(join(tmpdir(), "review-attempts-"));
});
afterEach(async () => rm(beatDir, { recursive: true, force: true }));

const FIVE_HUNDRED =
  "API Error: 500 Internal server error (error type server_error, HTTP 500, request id req_011CegaaiDY4PCxvZN4H2taY)";
const OVERLOADED =
  "API Error: 529 Overloaded (error type server_error, HTTP 529, request id req_011CegbFXVx3VnZM8xzhuSHM)";

describe("a lost review is written to the beat", () => {
  it("should read as empty before anything is attempted", async () => {
    // "Not yet run". The distinction this file exists for only works if this case is quiet.
    expect(await readReviewAttempts(beatDir)).toEqual([]);
    expect(reviewDisclosure(await readReviewAttempts(beatDir))).toBeNull();
  });

  it("should keep the transport error verbatim, request id included", async () => {
    // Paraphrasing throws away the request id, which is the only part of a capacity incident that
    // is not reproducible afterwards.
    await recordFailedReview(beatDir, { persona: "designer", error: FIVE_HUNDRED });
    const [attempt] = await readReviewAttempts(beatDir);
    expect(attempt.error).toBe(FIVE_HUNDRED);
    expect(attempt.persona).toBe("designer");
    expect(Number.isNaN(Date.parse(attempt.at))).toBe(false);
  });

  it("should append rather than overwrite, so the second failure does not erase the first", async () => {
    await recordFailedReview(beatDir, { persona: "designer", error: FIVE_HUNDRED });
    await recordFailedReview(beatDir, { persona: "designer", error: OVERLOADED });
    const attempts = await readReviewAttempts(beatDir);
    expect(attempts.map((a: { error: string }) => a.error)).toEqual([FIVE_HUNDRED, OVERLOADED]);
  });

  it("should write JSON a later session can read back", async () => {
    await recordFailedReview(beatDir, { persona: "designer", error: OVERLOADED });
    const text = await readFile(join(beatDir, REVIEW_ATTEMPTS_FILE), "utf8");
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it("should refuse to record an attempt with no error to record", async () => {
    // An entry with no cause is a record of nothing — it would make the directory say "could not
    // run" without saying why, which is worse than saying nothing.
    await expect(recordFailedReview(beatDir, { persona: "designer" })).rejects.toThrow(/verbatim/);
    await expect(recordFailedReview(beatDir, { error: OVERLOADED })).rejects.toThrow(/persona/);
  });
});

describe("it is bounded, and the bound is two", () => {
  it("should still be worth attempting after one failure", async () => {
    await recordFailedReview(beatDir, { persona: "designer", error: FIVE_HUNDRED });
    expect(reviewDisclosure(await readReviewAttempts(beatDir))).toBeNull();
  });

  it("should disclose after two, rather than attempt a third", async () => {
    // A 529 is a capacity signal; a third immediate attempt is likely to fail the same way.
    expect(MAX_REVIEW_ATTEMPTS).toBe(2);
    await recordFailedReview(beatDir, { persona: "designer", error: FIVE_HUNDRED });
    await recordFailedReview(beatDir, { persona: "designer", error: OVERLOADED });
    expect(reviewDisclosure(await readReviewAttempts(beatDir))).not.toBeNull();
  });

  it("should word the disclosure for the journalist, not for us", async () => {
    await recordFailedReview(beatDir, { persona: "designer", error: FIVE_HUNDRED });
    await recordFailedReview(beatDir, { persona: "designer", error: OVERLOADED });
    const disclosure = reviewDisclosure(await readReviewAttempts(beatDir))!;
    // What happened, in their terms.
    expect(disclosure).toContain("could not be obtained");
    expect(disclosure).toContain("outside this story");
    // That it does not block them — the designer never approves pixels, G3 is theirs alone.
    expect(disclosure).toContain("approval is yours");
    // And what they are actually giving up, said plainly rather than softened away.
    expect(disclosure).toContain("no independent eye has read it");
    // The request ids survive into the sentence, because that is what makes it traceable.
    expect(disclosure).toContain("req_011CegbFXVx3VnZM8xzhuSHM");
  });
});

// The resolver half of this lives in `where.test.ts`, beside the fixtures that build a story as
// far as the review step — see "should stop re-issuing a review that already failed twice".
