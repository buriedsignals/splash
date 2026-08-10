/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The failure this defends against: a video beat renders correctly and its FIRST frame is empty —
 * a solid rectangle of ground colour with nothing drawn on it. Frame 0 is the poster frame: the
 * single image a reader sees before pressing play, and the image a CMS or a social platform pulls
 * as the thumbnail. A beat whose poster frame is blank looks broken before it plays, and every
 * other check in this suite passes it: the mp4 exists, it is the right size, its last frame is a
 * complete chart, its timing contract is valid.
 *
 * It happened to EVERY video beat in this corpus at once, and none of the six existing guards saw
 * it. The cause was one line repeated per beat: the `establish` event starts at frame 0, so
 * `progressOf(0, timing.establish)` is exactly 0, and the title/source group was gated on it —
 * `opacity={0}` on the only thing drawn that early. Measured before the fix: 19 of the 22 mp4s
 * under `proof/` returned ZERO pixels differing from white at frame 0. `beat-genre-produces-
 * artifact.test.ts` is the direct ancestor of this file and says in its own header that its size
 * floor "cannot open a file and judge what's inside it"; this is the narrowest useful thing that
 * can be judged inside it, and only that.
 *
 * WHAT IT CHECKS, exactly. For every `.mp4` found recursively under `proof/` (excluding
 * `comparison/`, `seance/` and `trial/`, which hold evidence ABOUT the experiment rather than a
 * beat's own production — the same exclusion, for the same reason, as the artifact guard):
 * ffmpeg decodes the first frame to raw rgb24 on stdout, the MOST COMMON pixel colour in that
 * frame is taken as the ground, and the share of pixels that are NOT that colour must clear
 * MIN_NON_GROUND_SHARE. Nothing is written to disk and nothing is decoded by hand — `-frames:v 1`
 * is the first frame in presentation order, cross-checked against `-vf select=eq(n\,0)` on both a
 * blank beat and a correct one: identical counts, 0 and 70,949, so the shorter form is the one
 * used here.
 *
 * THE FLOOR IS A FLOOR, NOT A CHECK — the same discipline the artifact guard states about its
 * byte sizes. MIN_NON_GROUND_SHARE is 0.25% of the frame's pixels. Measured across this corpus
 * after the fix, the SMALLEST real frame 0 is `vidy-pyramid-niger-population` at 3.41% (a two-line
 * title, a note and a source line on a 1080×1350 portrait frame — the most ground of any beat
 * here), nearly fourteen times the floor; the largest is 9.20%. The floor exists to separate
 * "something is drawn" from "literally nothing is drawn", and it separates them by more than an
 * order of magnitude on real data. It is not a judgement about what that something is.
 *
 * WHY THE MODAL COLOUR RATHER THAN WHITE. Every beat in this corpus today renders on a white
 * ground, but `deriveFurniture` derives ink/muted/grid from whatever ground it is handed, and
 * `palette` exists precisely so a newsroom can choose a near-black one. Hardcoding white
 * would make this guard pass a blank BLACK poster frame, which is the same defect in a different
 * house style. Taking the frame's own most common colour as its ground costs nothing and survives
 * a theme change — see the named gap below for the one case where that inference is wrong.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. WHAT is on frame 0 — only that something is. A frame carrying the axis furniture and no title
 *    passes. A frame carrying the title in a colour that fails contrast against its own ground
 *    passes. A frame carrying one large accidental rectangle passes. This guard cannot read a
 *    frame, and the defect it was built for is the total absence of marks, not their content.
 *    The fix that created it made a specific editorial choice — title and source at full opacity
 *    from frame 0, axis furniture still fading in over `establish` — and nothing here verifies
 *    that choice was the one made. A beat could satisfy this guard by fading in its axis a few
 *    frames earlier and leaving the title invisible.
 * 2. ONLY FRAME 0. Frames 1..n are not looked at. A beat that renders a correct poster frame and
 *    then a hundred blank ones is invisible here. The rest of the corpus's coverage of the middle
 *    of a video is a `--frame=-1` still per beat (its LAST frame) in each beat's own render
 *    script; between the first frame and the last, nothing is mechanically checked by anything.
 * 3. A FRAME WHOSE MARKS COVER MORE THAN HALF OF IT inverts the ground inference: the modal colour
 *    becomes the mark's, and the true ground counts as "not ground". Such a frame still PASSES
 *    (the share is large either way), so this cannot produce a false failure — but the number in
 *    the failure message would describe the wrong thing if it ever did fail. No frame 0 in this
 *    corpus is anywhere near that, since frame 0 is by construction the emptiest frame of a beat.
 * 4. A FRAME THAT IS FAINT RATHER THAN EMPTY. Ground plus a few hundred antialiased pixels at 0.3%
 *    clears the floor. There is no lower bound here that distinguishes "a title" from "a stray
 *    mark", and inventing one would be guessing — see the floor discussion above for what the
 *    0.25%-vs-4.68% margin does and does not license.
 * 5. AN mp4 THIS SCAN CANNOT FIND OR FFMPEG CANNOT OPEN. The search is by `.mp4` extension under
 *    `proof/` only. A video shipped in another container, or written outside `proof/`, is not
 *    covered. If ffmpeg is absent from the machine, this guard reports that ONCE, loudly, as a
 *    failure rather than skipping quietly — a guard that silently disappears where it cannot run
 *    is worse than none, and this project already carries `--check` guards that go red on a fresh
 *    clone for reasons that are not defects (see `HANDOVER.md`, "Still open"). Treat a red here
 *    with an ffmpeg message as a machine problem, not a beat problem; the message says which.
 *
 * THREE BEATS ARE RED WHEN THIS GUARD LANDS, and that is the guard working, not a break to hunt
 * for. `life-expectancy`, `migration` and `map-quake-symbol` carry the same defect and all three
 * were being corrected by other agents in the same working tree at the time, so they were left
 * untouched here rather than fixed twice or conflicted over. Each fails with 0.0000% non-ground at
 * frame 0. When their corrections land the failures go away on their own; no exclusion list was
 * added, because a list like that outlives the reason for it and the hole stays open silently.
 *
 * MUTATION-PROVED, because a test that stays green when the code is broken is worthless. A copy of
 * `vidy-lollipop-renewables-share-europe` was made OUTSIDE this tree (in `/tmp`, never here —
 * several agents share this working tree and one agent's mutation must not turn it red for
 * everyone), its `LollipopVideo.tsx` header group re-gated on `opacity={axisOpacity}` exactly as
 * it was before the fix, and re-rendered. Frame 0 of that mp4 measured 0.0000% non-ground, and
 * this guard — the same file, copied unchanged into a scratch scaffold with the same relative
 * layout — failed on it naming the file and the share. Swapping the corrected mp4 back into that
 * same scaffold turned it green. The unmutated beat measures 5.57%.
 */
import { describe, it, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const PROOF_ROOT = join(import.meta.dirname, "..", "..", "..", "proof");

// Evidence ABOUT the experiment, not a beat's own production — the same exclusion, for the same
// reason, as `beat-genre-produces-artifact.test.ts`.
const NOT_A_BEAT = new Set(["comparison", "seance", "trial"]);

// A floor, not a check. 0.25% of the frame. Smallest real frame 0 measured in this corpus: 4.68%.
const MIN_NON_GROUND_SHARE = 0.0025;

function walkMp4s(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMp4s(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp4"))
      out.push(full);
  }
  return out;
}

/**
 * The first frame, raw rgb24, straight off ffmpeg's stdout — no file written, no PNG decoded.
 * Returns the buffer, or an error string explaining why there is none.
 */
function firstFrameRgb(file: string): { rgb: Buffer } | { error: string } {
  const run = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-i",
      file,
      "-frames:v",
      "1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "-",
    ],
    { maxBuffer: 1 << 28 },
  );
  if (run.error && (run.error as NodeJS.ErrnoException).code === "ENOENT")
    return {
      error:
        "ffmpeg is not on PATH. This guard decodes the first frame of every beat's mp4 and " +
        "cannot verify anything without it — see item 5 of this file's header.",
    };
  if (run.status !== 0)
    return {
      error: `ffmpeg exited ${run.status} for ${file}: ${String(run.stderr).trim()}`,
    };
  const rgb = run.stdout;
  if (!rgb || rgb.length < 3)
    return { error: `ffmpeg produced no pixels for ${file}` };
  return { rgb };
}

/** The share of pixels that are not the frame's own most common colour. */
function nonGroundShare(rgb: Buffer): { share: number; ground: string } {
  const counts = new Map<number, number>();
  const pixels = Math.floor(rgb.length / 3);
  for (let i = 0; i < pixels; i++) {
    const key = (rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let groundKey = 0;
  let groundCount = -1;
  for (const [key, count] of counts)
    if (count > groundCount) {
      groundKey = key;
      groundCount = count;
    }
  return {
    share: (pixels - groundCount) / pixels,
    ground: `#${groundKey.toString(16).padStart(6, "0").toUpperCase()}`,
  };
}

const mp4s = readdirSync(PROOF_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !NOT_A_BEAT.has(e.name))
  .flatMap((e) => walkMp4s(join(PROOF_ROOT, e.name)))
  .sort();

describe("every beat's mp4 has something drawn on its first frame", () => {
  it("should find at least one mp4 under proof/ to check", () => {
    // Without this, a rename of `proof/` or a change of extension would empty the loop below and
    // the whole guard would pass by checking nothing at all.
    expect(mp4s.length).toBeGreaterThan(0);
  });

  for (const file of mp4s) {
    const label = relative(PROOF_ROOT, file);

    it(`should draw something on frame 0 of proof/${label} — it is the poster frame`, () => {
      const frame = firstFrameRgb(file);
      if ("error" in frame) throw new Error(frame.error);

      const { share, ground } = nonGroundShare(frame.rgb);

      expect(
        share,
        `frame 0 of proof/${label} is ${(100 * (1 - share)).toFixed(4)}% a single colour ` +
          `(${ground}) — only ${(100 * share).toFixed(4)}% of its pixels are anything else, under ` +
          `the ${(100 * MIN_NON_GROUND_SHARE).toFixed(2)}% floor. Frame 0 is the poster frame a ` +
          `reader sees before pressing play and a CMS pulls as the thumbnail; a blank one is a ` +
          `beat that says nothing. The usual cause is the title/source group gated on ` +
          `\`establish\`, whose progress at frame 0 is exactly 0 — render them unconditionally ` +
          `and let the axis furniture keep the fade.`,
      ).toBeGreaterThanOrEqual(MIN_NON_GROUND_SHARE);
    });
  }
});
