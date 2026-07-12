// Test fixture: a stand-in for produce.mjs/render-video.mjs — runs a hung child
// under runWithVideoWatchdog, so the test can send this PARENT a SIGINT (what the
// terminal's Ctrl-C delivers to the foreground process group, which the detached
// render child is NOT part of) and assert the child's process group dies too.
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runWithVideoWatchdog } from "../../src/video-watchdog";

const pidFile = process.argv[2];
const hangScript = fileURLToPath(new URL("./hang-forever.ts", import.meta.url));
try {
  await runWithVideoWatchdog("bun", [hangScript, pidFile], {
    timeoutMs: 60_000,
  });
} catch (err) {
  console.error(String(err));
  process.exit(1);
}
