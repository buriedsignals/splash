// Video format proof. Validate ONE still BEFORE the full mp4 (Tom's discipline),
// then render the mp4 with --gl=angle. Frame-deterministic: pure function of frame.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const remotion = join(here, "..", "remotion", "index.ts");
const stillOut = process.argv[2] ?? "/tmp/native-still.png";
const mp4Out = process.argv[3] ?? "/tmp/native-line-reveal.mp4";
const comp = process.env.COMP ?? "LineReveal"; // LineReveal | BarReveal

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
  execFileSync("npx", args, { stdio: "inherit", cwd: join(here, ".."), shell: process.platform === "win32" });

console.log(`1/2 validating a still frame (frame 140) of ${comp} before the mp4…`);
run(["remotion", "still", remotion, comp, stillOut, "--frame=140", "--gl=angle", ...propsArgs]);

console.log("2/2 rendering the mp4…");
run(["remotion", "render", remotion, comp, mp4Out,
  "--gl=angle", "--concurrency=1", "--timeout=120000", ...propsArgs]);

console.log("Wrote", stillOut, "and", mp4Out);
