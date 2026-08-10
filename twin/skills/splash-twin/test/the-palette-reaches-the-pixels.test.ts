/**
 * THE PALETTE GUARD THAT MEASURES THE PICTURE, IN THE DEFAULT SUITE.
 *
 * `seed-reads-a-recorded-palette.test.ts` proves a runner MENTIONS the mechanism — its own header
 * says so, and the W2 audit mutated it and watched it stay green on a decoy `readPalette(...)` call
 * sitting beside `const g = "#FFF" + "FFF"` (mutation M2b). Grepping a delivered artifact is no
 * better in the other direction: a bundled page inlines a whole colour registry, a false alarm this
 * project has already paid an investigation for.
 *
 * `scripts/two-palette-proof.mjs` answers it on the pixels instead: render the beat twice under two
 * recorded answers that SHARE A GROUND — so ink, muted and grid are byte-identical and every pixel
 * that moves is the accent's — and count what moved. This file runs it on ONE beat so the
 * mechanism is not optional. The full sweep over all 76 is the script itself, run by hand: it takes
 * the better part of an hour because thirteen of those beats render an mp4 through Remotion, and a
 * default suite that cost an hour is a suite people stop running.
 *
 * WHY THIS BEAT. `static-electricity-mix-source` is the smallest thing that exercises the whole
 * chain end to end: it records THREE accents, takes them through `seriesInks`, and draws a value
 * label inside each band whose ink flips with the fill. A beat with one accent would leave the
 * multi-accent path — the one the owner's report is actually about — unguarded.
 *
 * THE MUTATION, run in /tmp/mut2 and never in this tree: keep the decoy `seriesInks` call and
 * launder the three band colours back in as concatenated literals — the exact defeat the audit
 * named for the static scan.
 *
 *   rm -rf /tmp/mut2 && mkdir -p /tmp/mut2 && git archive HEAD | tar -x -C /tmp/mut2
 *   # in /tmp/mut2/twin/proof/static-electricity-mix-source/render.mjs, replace
 *   #   const [renewablesFill, nuclearFill, fossilFill] = seriesInks(palette, 3);
 *   # with
 *   #   seriesInks(palette, 3);
 *   #   const renewablesFill = "#009" + "E73";
 *   #   const nuclearFill    = "#007" + "2B2";
 *   #   const fossilFill     = "#D55" + "E00";
 *
 * Then, measured 2026-08-10:
 *
 *   seed-reads-a-recorded-palette.test.ts, in the mutated tree  ->  37 pass, 0 fail  (GREEN)
 *   two-palette-proof.mjs --from /tmp/mut2 --only …             ->  STILL — the palette did not
 *                                                                   reach the picture, exit 1
 *
 * which is this file's assertion turning from "DATA INK MOVED in 1 of 1" to "0 of 1".
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Two renders of a real chart, plus the export of a clean tree to render them in. Measured at
// about 25 s on this machine; the budget is generous because a rasteriser on a cold font cache is
// the slowest part and it is not this guard's job to fail on that.
setDefaultTimeout(180_000);

const TWIN = join(import.meta.dirname, "..", "..", "..");
const BEAT = "static-electricity-mix-source";
const WORK = "/tmp/two-palette-proof-guard";

describe("the recorded palette reaches the pixels, not just the source", () => {
  it("should redraw the beat's data ink when the recorded answer changes", () => {
    const run = spawnSync(
      "bun",
      ["scripts/two-palette-proof.mjs", "--only", BEAT],
      {
        cwd: TWIN,
        encoding: "utf8",
        // Its own workspace, so a hand-run sweep and this guard cannot overwrite each other.
        env: { ...process.env, TWO_PALETTE_WORK: WORK },
      },
    );
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    // The premise, pinned: a walk that matched nothing would report "0 of 0" and pass vacuously.
    expect([BEAT, output.includes(BEAT)]).toEqual([BEAT, true]);
    expect([BEAT, /DATA INK MOVED in 1 of 1/.test(output)]).toEqual([
      BEAT,
      true,
    ]);
    expect([BEAT, run.status]).toEqual([BEAT, 0]);

    // And the number, so a beat that moved by a single anti-aliased pixel could not pass as one
    // whose whole data channel moved. Measured on this beat: about a fifth of the frame.
    const report = JSON.parse(
      readFileSync(join(WORK, "report.json"), "utf8"),
    ) as { beat: string; verdict: string; fraction: number }[];
    const row = report.find((r) => r.beat === BEAT);
    expect([BEAT, row?.verdict]).toEqual([BEAT, "moved"]);
    expect(row!.fraction).toBeGreaterThan(0.05);
  });
});
