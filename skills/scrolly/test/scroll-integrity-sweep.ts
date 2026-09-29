// The body of the scroll-integrity sweep, shared by its shard files (scroll-integrity.test.ts is
// shard 1; scroll-integrity-<n>.test.ts are the others). Not a test file itself.
import { describe, expect, it } from "bun:test";
import { basename, dirname, join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { verifyAll } from "../scripts/verify-scrolly.mjs";
import { render } from "../scripts/render-scrolly.mjs";
import {
  SCOPE_ENV_VAR,
  scopedBeatDir,
  scrolliesUnder,
} from "../scripts/scroll-integrity-scope.mjs";

const SKILL = join(import.meta.dirname, "..");
const PROOF = join(SKILL, "..", "..", "proof");

// `SCROLL_INTEGRITY_BEAT=<beat>` scopes the sweep below to one beat's own renders — see
// scroll-integrity-scope.mjs's own header for why, and skills/scrolly/SKILL.md, step 6, for how a run
// checks only its own beat. Unset — the CI default — sweeps every proof/scrolly-* beat, unchanged.
const SCOPED_DIR = scopedBeatDir(PROOF);

// ONE TEST PER BEAT, NOT ONE TEST FOR THE CORPUS. This used to be a single `it` that drove every
// page on disk — 120 renders at three widths, 40 beats — under one 600 000 ms ceiling. Measured on
// this corpus, one beat's three renders cost ~81 s, so the sweep needs about three quarters of an
// hour and the single test could never reach its assertion: it timed out, reported no beat, and
// nothing it would have caught was being caught. That is the defect, and a bigger number on the
// same monolith would only move it.
//
// So the population is unchanged — every beat still runs, and the guard is not scoped, sampled or
// sharded away — and only the granularity moved: each beat is its own named test with its own
// ceiling, so a run terminates, a failure says which beat failed in its own title, and a beat that
// hangs costs that beat rather than the sweep. `SCROLL_INTEGRITY_BEAT` still narrows the run to one
// beat while a journalist is working on it (see scroll-integrity-scope.mjs, and SKILL.md step 6).
const PAGES = scrolliesUnder(PROOF, SCOPED_DIR);
const BY_BEAT = new Map<string, string[]>();
for (const page of PAGES) {
  const beat = basename(dirname(dirname(page)));
  if (!BY_BEAT.has(beat)) BY_BEAT.set(beat, []);
  BY_BEAT.get(beat)!.push(page);
}

// A beat's three renders measured ~81 s cold, including the browser launch this now pays per beat.
// The ceiling is a hang detector with room for a slow machine, not a budget anything runs close to.
const PER_BEAT_MS = 300_000;

/** Drive one beat's pages and assert the vehicle's contract across them. */
async function driveAndAssert(label: string, files: string[]) {
  const { failures, notes } = await verifyAll(files);
  // Printed whether or not anything failed: the residues this guard deliberately does not assert
  // are only useful if a person reads them, and a note nobody prints is a note nobody has.
  for (const note of notes) console.log(`  note  ${note}`);
  expect(
    failures,
    `driven across ${files.length} ${label} scrollies at three widths:\n  ${failures.join("\n  ")}`,
  ).toEqual([]);
}

/** The number of files the sweep is split across, so `bun test --parallel` can drive them side by
 *  side. Each file owns every SHARDS-th beat in sorted order; beats cost about the same (~81 s), so
 *  round-robin keeps the files level. Changing it means adding or removing a shard file. */
export const SHARDS = 8;

/** Register this shard's tests. Shard 1 (scroll-integrity.test.ts) also drives the scaffold's own
 *  seed, and — when `SCROLL_INTEGRITY_BEAT` narrows the run to one beat — drives that beat alone
 *  while the other shards stand down, so the single-beat command in SKILL.md is unchanged. */
export function sweep(shard: number) {
  const beats = [...BY_BEAT].sort(([a], [b]) => a.localeCompare(b));
  const mine = SCOPED_DIR
    ? shard === 1
      ? beats
      : []
    : beats.filter((_, i) => i % SHARDS === shard - 1);
  describe(
    SCOPED_DIR
      ? `only ${process.env[SCOPE_ENV_VAR]} survives a continuous scroll (shard ${shard}/${SHARDS})`
      : `every scrolly on disk survives a continuous scroll (shard ${shard}/${SHARDS})`,
    () => {
      if (SCOPED_DIR && shard !== 1) {
        it.skip("is scoped to one beat, which shard 1 drives", () => {});
        return;
      }
      // The discovery itself is an assertion: a scan that silently found nothing would turn every
      // test below into a vacuous pass, which is the shape this whole pass exists to end. Each
      // shard asserts its own slice, so a shard left empty by a shrinking corpus says so.
      it("should find scrollies on disk to drive", () => {
        expect(BY_BEAT.size).toBeGreaterThanOrEqual(1);
        expect(PAGES.length).toBeGreaterThanOrEqual(1);
        expect(mine.length).toBeGreaterThanOrEqual(1);
      });

      if (shard === 1)
        it(
          "should hold the contract on the scaffold's own freshly rendered seed",
          async () => {
            const seedDir = await mkdtemp(join(tmpdir(), "scrolly-integrity-"));
            const { outPath } = await render({ outDir: seedDir });
            await driveAndAssert("seed", [outPath]);
          },
          PER_BEAT_MS,
        );

      for (const [beat, files] of mine) {
        it(
          `should hold the contract on ${beat}'s own renders, on a real, driven, uninterrupted scroll`,
          async () => {
            await driveAndAssert(beat, files);
          },
          PER_BEAT_MS,
        );
      }
    },
  );
}
