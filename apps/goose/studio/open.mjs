#!/usr/bin/env bun

import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createStudioSessionManager } from "./session.mjs";

const checkoutRoot = await realpath(
  process.env.SPLASH_CHECKOUT_ROOT ??
    join(fileURLToPath(import.meta.url), "..", "..", "..", ".."),
);
const bsigPath = process.env.SPLASH_BSIG_PATH ?? Bun.which("bsig");
if (!bsigPath) {
  console.error("Splash studio needs bsig on PATH or SPLASH_BSIG_PATH.");
  process.exit(1);
}
const newsroomPath =
  process.env.SPLASH_NEWSROOM_PATH ??
  join(homedir(), ".config", "splash", "NEWSROOM.md");

const studio = createStudioSessionManager({
  controllerPath: join(
    checkoutRoot,
    "apps",
    "goose",
    "studio",
    "controller-child.mjs",
  ),
  bsigPath,
  newsroomPath,
  legacyEnvPath: join(checkoutRoot, ".env"),
  checkoutRoot,
});

const stop = () => studio.close();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

try {
  await studio.start();
  const opened = await studio.openLocally();
  if (!opened.ok) {
    console.error("Splash studio could not open the local browser.");
    studio.close();
    process.exitCode = 1;
  } else {
    console.error(
      "Splash studio opened in your browser. Confirm readiness and visual choices there, then return here. Do not paste the studio URL into chat.",
    );
  }
  await studio.wait();
} catch {
  console.error("Splash studio could not start.");
  studio.close();
  process.exitCode = 1;
}
