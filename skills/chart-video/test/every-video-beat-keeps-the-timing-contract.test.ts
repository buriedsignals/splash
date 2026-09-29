/**
 * EVERY VIDEO BEAT KEEPS THE DIRECTED TIMING CONTRACT — ONE TABLE, DISCOVERED, NOT LISTED.
 *
 * Every directed video beat, chart or live map, times itself with one `BeatTiming` in its own
 * `timing-contract.ts`, and the same four rules hold for all of them (SKILL.md, "Title card at
 * frame 0" and "Brisk"):
 *
 *   - `checkTiming` finds nothing: the motion grammar's structural rules;
 *   - the title card starts at frame 0 and lasts no longer than 1.5 s;
 *   - the final frame is held at least 60 frames;
 *   - the whole runs no longer than 22 s, unless RUNS_LONGER below names the beat.
 *
 * Forty beats each re-asserted these in their own `timing.test.ts`. They are asserted here once,
 * for every `timing-contract.ts` under `proof/video-*` and under a story's `beats/` in this
 * checkout, so a new beat is held to them without writing a line. What stays in a beat's own
 * `timing.test.ts` is what only that beat claims: the seconds each of its gestures needs.
 *
 * The rules' own red cases (`checkTiming` refusing a broken timing) live in `timing.test.ts` beside
 * this file.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { checkTiming, type BeatTiming } from "../assets/timing";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/**
 * The beats owner-validated at more than 22 s. Each entry pins the length it was validated at, so
 * it cannot grow unnoticed; an entry that names no discovered beat fails below.
 */
const RUNS_LONGER: Record<string, { seconds: number; why: string }> = {
  "proof/video-bar-top-emitters-2024": {
    seconds: 22.2,
    why: "five bars summed end to end under China, then Germany sliding into the gap: 666 frames, validated",
  },
  "proof/video-connected-scatter-lowcarbon": {
    seconds: 23.7,
    why: "sixteen countries travelling 2000 → 2024 one after another; its type sheet sets about 24 s",
  },
};

const subdirs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith(".")) // a scaffold probe is not a beat
        .map((e) => join(dir, e.name))
    : [];

const beatDirs = [
  ...subdirs(join(ROOT, "proof")).filter((d) => /\/video-[^/]+$/.test(d)),
  ...subdirs(join(ROOT, "stories")).flatMap((story) => subdirs(join(story, "beats"))),
]
  .filter((d) => existsSync(join(d, "timing-contract.ts")))
  .sort();

const isTiming = (value: unknown): value is BeatTiming =>
  typeof value === "object" &&
  value !== null &&
  "fps" in value &&
  "total" in value &&
  "establish" in value &&
  "hold" in value;

const beats = await Promise.all(
  beatDirs.map(async (dir) => {
    const module = await import(join(dir, "timing-contract.ts"));
    return {
      beat: relative(ROOT, dir).split("\\").join("/"),
      timings: Object.values(module).filter(isTiming),
    };
  }),
);

/** Every rule the timing breaks, in words that name the rule. Empty means it keeps the contract. */
function violationsOf(beat: string, T: BeatTiming): string[] {
  const out = checkTiming(T);
  if (T.establish.start !== 0) out.push(`the title card starts at frame ${T.establish.start}, not frame 0`);
  if (T.establish.duration > T.fps * 1.5)
    out.push(`the title card lasts ${T.establish.duration} frames, over 1.5 s (${T.fps * 1.5})`);
  if (T.hold.duration < 60) out.push(`the final frame is held ${T.hold.duration} frames, under 60`);
  const maxSeconds = RUNS_LONGER[beat]?.seconds ?? 22;
  if (T.total > T.fps * maxSeconds)
    out.push(`it runs ${(T.total / T.fps).toFixed(2)} s, over ${maxSeconds} s`);
  return out;
}

describe("every video beat's timing contract", () => {
  it("should be found in every proof/video-* beat", () => {
    const videoDirs = subdirs(join(ROOT, "proof")).filter((d) => /\/video-[^/]+$/.test(d));
    expect(videoDirs.length).toBeGreaterThan(0);
    expect(videoDirs.filter((d) => !beatDirs.includes(d)).map((d) => relative(ROOT, d))).toEqual([]);
  });

  it("should name only discovered beats as running longer than 22 s", () => {
    const found = new Set(beats.map((b) => b.beat));
    expect(Object.keys(RUNS_LONGER).filter((beat) => !found.has(beat))).toEqual([]);
  });

  for (const { beat, timings } of beats) {
    it(`${beat} should export one BeatTiming that keeps the directed timing contract`, () => {
      expect(timings.length).toBe(1);
      expect(violationsOf(beat, timings[0])).toEqual([]);
    });
  }
});
