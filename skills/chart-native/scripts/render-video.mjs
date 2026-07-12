// Video format proof. Validate ONE still BEFORE the full mp4 (Tom's discipline),
// then render the mp4 with --gl=angle. Frame-deterministic: pure function of frame.
// Both Remotion invocations run under the render watchdog (src/video-watchdog.ts):
// a hung render (the seismes-class Remotion hang) is killed after
// ATELIER_VIDEO_TIMEOUT_MS (default 15 min) and fails hard instead of burning the
// run — root-causing the hang itself stays a separate ticket.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runWithVideoWatchdog } from "../src/video-watchdog.ts";

const here = dirname(fileURLToPath(import.meta.url));
const remotion = join(here, "..", "remotion", "index.ts");
const stillOut = process.argv[2] ?? "/tmp/native-still.png";
const mp4Out = process.argv[3] ?? "/tmp/native-line-reveal.mp4";
const finalOut = process.argv[4] ?? "/tmp/native-final-still.png";
const comp = process.env.COMP ?? "LineReveal"; // LineReveal | BarReveal

// Mid-reveal frame the review still is rendered at (of the 240-frame comps). Kept in
// lockstep with produce.mjs's VIDEO_STILL_FRAME via the STILL_FRAME env var so
// snap-video.mjs compares the mp4 at the SAME frame the Gate-3 review approves.
const STILL_FRAME = Number(process.env.STILL_FRAME ?? "140");

// CONFIG=path → inject an arbitrary config via Remotion inputProps ({config: ...});
// the <Type>Reveal falls back to its committed sample when no props are passed.
let propsArgs = [];
if (process.env.CONFIG) {
  const config = JSON.parse(readFileSync(process.env.CONFIG, "utf8"));
  const propsPath = join(mkdtempSync(join(tmpdir(), "remotion-props-")), "props.json");
  writeFileSync(propsPath, JSON.stringify({ config }));
  propsArgs = [`--props=${propsPath}`];
}

const run = (args) =>
  runWithVideoWatchdog("npx", args, {
    cwd: join(here, ".."),
    env: process.env,
    shell: process.platform === "win32",
  });

console.log(`1/3 validating a still frame (frame ${STILL_FRAME}) of ${comp} before the mp4…`);
await run(["remotion", "still", remotion, comp, stillOut, `--frame=${STILL_FRAME}`, "--gl=angle", ...propsArgs]);

// The END state, rendered separately (--frame=-1 = the composition's last frame):
// the most-read frame of a chart video. snap-video.mjs diffs the mp4's final frame
// against this, so an "end-state value labels never appear" regression fails hard
// instead of shipping — the mid-reveal still above never covers the end state.
console.log(`2/3 rendering the final-frame still of ${comp}…`);
await run(["remotion", "still", remotion, comp, finalOut, "--frame=-1", "--gl=angle", ...propsArgs]);

console.log("3/3 rendering the mp4…");
await run(["remotion", "render", remotion, comp, mp4Out,
  "--gl=angle", "--concurrency=1", "--timeout=120000", ...propsArgs]);

console.log("Wrote", stillOut, ",", finalOut, "and", mp4Out);
