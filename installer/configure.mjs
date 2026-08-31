#!/usr/bin/env bun
// Splash's setup server writes non-secret newsroom configuration and reports
// Engine credential status. It never accepts credential values. Indicator Labs
// owns managed credential input; open-source users configure the same IDs through
// Engine's protected bsig stdin/keychain flow outside Splash.

import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const HEADLESS = argv.includes("--headless");
const ROOT = resolve(flag("--root", resolve(HERE, "..")));
const HOME = resolve(flag("--home", homedir()));
const IDLE_MS = Number(flag("--idle-ms", String(30 * 60 * 1000)));
const bsig = flag("--bsig", Bun.which("bsig") ?? "");
if (!bsig) throw new Error("Engine setup requires --bsig <absolute path> or bsig on PATH");

const newsroomPath = resolve(
  flag("--newsroom-path", join(HOME, ".config", "splash", "NEWSROOM.md")),
);
const { createEngineBridge } = await import("./setup/engine-bridge.mjs");
const { startSetupController } = await import("./setup/controller.mjs");
const controller = await startSetupController({
  engineBridge: createEngineBridge({ executable: resolve(bsig) }),
  newsroomPath,
  legacyEnvPath: join(ROOT, ".env"),
  idleMs: IDLE_MS,
});
console.log(`SPLASH_CONFIGURE_URL=${controller.url}`);

if (!HEADLESS) {
  const opener = process.platform === "darwin"
    ? Bun.which("open")
    : process.platform === "win32"
      ? Bun.which("rundll32.exe")
      : Bun.which("xdg-open");
  if (opener) {
    const args = process.platform === "win32"
      ? [opener, "url.dll,FileProtocolHandler", controller.url]
      : [opener, controller.url];
    try {
      const opened = Bun.spawn(args, {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
      opened.exited.then((code) => {
        if (code !== 0)
          console.error("Splash setup could not open the browser; use the printed local URL.");
      });
    } catch {
      console.error("Splash setup could not open the browser; use the printed local URL.");
    }
  } else {
    console.error("Splash setup found no platform URL opener; use the printed local URL.");
  }
}

await controller.closed;
