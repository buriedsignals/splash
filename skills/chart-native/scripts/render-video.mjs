// Video format proof. Validate ONE still BEFORE the full mp4 (Tom's discipline),
// then render the mp4 with --gl=angle. Frame-deterministic: pure function of frame.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const remotion = join(here, "..", "remotion", "index.ts");
const stillOut = process.argv[2] ?? "/tmp/native-still.png";
const mp4Out = process.argv[3] ?? "/tmp/native-line-reveal.mp4";

const run = (args) =>
  execFileSync("npx", args, { stdio: "inherit", cwd: join(here, "..") });

console.log("1/2 validating a still frame (frame 90) before the mp4…");
run(["remotion", "still", remotion, "LineReveal", stillOut, "--frame=90", "--gl=angle"]);

console.log("2/2 rendering the mp4…");
run(["remotion", "render", remotion, "LineReveal", mp4Out,
  "--gl=angle", "--concurrency=1", "--timeout=120000"]);

console.log("Wrote", stillOut, "and", mp4Out);
