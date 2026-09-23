// twin/shared/chart-video/moves.mjs
//
// IT LIVES IN ITS OWN FILE BECAUSE OF WHO IMPORTS WHAT.
//
// `sizes.mjs` is imported by the Remotion COMPOSITION, which is bundled for a browser. Putting this
// beside `assertDeliveredSize` there — its natural home, and where it was written first — broke
// every video render with `UnhandledSchemeError: Reading from "node:child_process" is not handled
// by plugins`. This guard reads a delivered mp4 with ffmpeg, so it is Node-only by nature, and only
// the RUNNER imports it.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";


/**
 * EVERY EVENT CHANGES THE RENDERED PICTURE, measured on the mp4's own frames.
 *
 * `assertEventStates` already refuses an event whose declared STATE equals the one before it. What
 * it cannot see is whether that state change produces pixels a viewer can find. Measured 2026-09-23
 * on a real story, twice, and the owner found both before any check did:
 *
 *   · a beat whose `reveal` split one bar into twenty-seven and dimmed twenty-six of them. Every
 *     state differed; twenty-five of the twenty-seven values are under two percent, so the frames
 *     did not. "rien n'a bougé."
 *   · a beat whose `subject` gathered twenty-six hairlines onto one line. Same again: the states
 *     moved, the pixels did not.
 *
 * So the states are checked in Bun and the FRAMES are checked here, on the delivered file, because
 * only the delivered file knows what a viewer sees. A frame is taken at the start and the end of
 * every event and, for an event long enough to hold one, at its middle — and consecutive samples
 * inside an event must differ by more than the encoder's own noise.
 *
 * WHAT IT DOES NOT ASK. Nothing about how MUCH the picture moves, or whether the motion is good: a
 * beat that crawls is a beat an author has to look at. This is the floor — the difference between a
 * video and a still with a clock.
 *
 * `hold` is exempt by name, because the motion grammar's own rule is that it plays no gesture: a
 * hold whose frames differ is a hold smuggling one in, and `assertEventStates` already refuses that.
 */
export function assertEventsMove(moviePath, timing, { what = "this video", spawn, sampler } = {}) {
  const sample = sampler ?? defaultSampler(spawn);
  const still = [];
  const order = Object.keys(timing).filter((k) => k !== "fps" && k !== "total");
  for (const event of order) {
    if (event === "hold") continue;
    const { start, duration } = timing[event];
    if (!(duration > 1)) continue;
    // Just inside each edge: the first frame of an event is the last of the one before it, and a
    // comparison across a boundary would measure the neighbour rather than this event.
    const at = [start + 1, start + Math.floor(duration / 2), start + duration - 1];
    const frames = [...new Set(at)].map((frame) => sample(moviePath, frame, timing.fps));
    const moved = frames.slice(1).some((f, i) => f !== frames[i]);
    if (!moved) still.push(`${event} (frames ${at[0]}–${at[at.length - 1]})`);
  }
  if (still.length)
    throw new Error(
      `${what}: the picture does not move during ${still.join(", ")}. Every event but the final ` +
        "hold plays a gesture, and a gesture nobody can see is a still with a clock attached. The " +
        "declared states differ — `assertEventStates` checked that — so what is missing is the " +
        "PIXELS: a change of two percent of a bar's own length is a change, and a viewer will not " +
        "find it.",
    );
}

/** One frame of the movie, as a content hash. Uses ffmpeg, which every video beat already needs. */
function defaultSampler(spawn) {
  const run = spawn ?? spawnSync;
  return (moviePath, frame, fps) => {
    const at = (frame / fps).toFixed(3);
    const probe = run(
      "ffmpeg",
      ["-loglevel", "error", "-ss", at, "-i", moviePath, "-frames:v", "1", "-vf", "scale=160:-1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
      { encoding: "buffer", maxBuffer: 1 << 24 },
    );
    if (probe.status !== 0) throw new Error(`ffmpeg could not read ${moviePath} at ${at}s`);
    return createHash("sha256").update(probe.stdout).digest("hex");
  };
}
