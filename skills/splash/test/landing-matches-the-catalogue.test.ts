/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * `landing/index.html` arrived on `main` on 2026-08-21 and is the one artefact in this repository
 * that strangers read. It hard-codes the toolchain's own inventory — "Charts 32 forms", "Maps 8
 * forms", and all forty names spelled out one by one — while every OTHER generated claim in this
 * tree is drift-checked against its source: `MATRIX.md` by `matrix:check`, `type-survey.md` by
 * `survey:check`, `GUARDS.md` by `guards:check`, the visual catalogue by `catalog:check`.
 *
 * Measured when this file was written: nothing read `landing/index.html` at all. A treatment added
 * to or removed from `skills/storyboard/references/visual-catalog.json` would leave the public page
 * silently wrong, and the round-four fix plan came within one deferred decision of doing exactly
 * that — finding 25 asked for a "one confirmed figure" treatment, and had it been built, the page
 * would have said 32 while the catalogue said 33.
 *
 * THE PAGE IS NOT GENERATED, and this check does not offer to write it. It is a designed document
 * with its own voice; the catalogue is the authority for WHAT EXISTS, not for how the page reads.
 * So `landing.mjs` has a `--check` and deliberately no writer — the one script in `scripts/` shaped
 * that way, and the header says why.
 *
 * Like `matrix-is-current.test.ts`, this spawns the real CLI once and asserts its EXIT CODE rather
 * than re-implementing the comparison, because a second copy of the rule is the drift the check
 * exists to report, and the exit code is the half `bun run landing:check` and CI actually read.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. WHETHER THE PROSE IS TRUE. It compares an inventory, not a description. "Splash guides the
 *    agent toward visual forms the evidence supports" is checked by nothing here; that sentence
 *    happens to have become MORE true in round four (the recommender now returns `null` for a
 *    one-row table instead of a streamgraph), but this file would be equally green if it had
 *    become less so.
 * 2. THE FOUR SCROLLY FORMS. The page lists Chart, Map, Image sequence and Mixed media. The
 *    catalogue has no `scrolly` medium at all — it holds 32 chart, 8 map and 1 image treatment —
 *    so there is no authority in this tree to check those four names against. Their COUNT is
 *    checked against the page's own list, and the names are not. Naming that gap rather than
 *    inventing an authority for it.
 * 3. ANYTHING OUTSIDE THE FORM INVENTORY. Source links, statistics quoted from the EJC survey, the
 *    Reuters Institute claim — all unread by this check.
 */
import { describe, it, expect } from "bun:test";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

// ONE spawn, read twice — the lesson `matrix-is-current.test.ts` records in its own header: a
// second invocation to "probe liveness" is how that file's first draft went permanently green.
const RUN = Bun.spawnSync(["bun", "scripts/landing.mjs", "--check"], { cwd: ROOT });
const SAID = new TextDecoder()
  .decode(RUN.exitCode === 0 ? RUN.stdout : RUN.stderr)
  .trim();

describe("the public page still describes the toolchain it advertises", () => {
  it("should actually have run the checker", () => {
    // The premise, pinned: a spawn that never started, or a bun that could not find the script,
    // would make the assertion below read a meaningless status.
    expect([
      RUN.exitCode === 0 || RUN.exitCode === 1,
      /landing\/index\.html|landing page/.test(SAID),
    ]).toEqual([true, true]);
  });

  it("should match the visual catalogue's own inventory today", () => {
    expect(
      RUN.exitCode === 0
        ? "bun scripts/landing.mjs --check exits 0"
        : `bun scripts/landing.mjs --check exits ${RUN.exitCode}: ${SAID}`,
    ).toBe("bun scripts/landing.mjs --check exits 0");
  });
});
