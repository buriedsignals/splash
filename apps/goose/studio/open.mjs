#!/usr/bin/env bun

import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { productionDependencies } from "../server.mjs";

const checkoutRoot = await realpath(
  process.env.SPLASH_CHECKOUT_ROOT ??
    join(fileURLToPath(import.meta.url), "..", "..", "..", ".."),
);
const newsroomPath =
  process.env.SPLASH_NEWSROOM_PATH ??
  join(homedir(), ".config", "splash", "NEWSROOM.md");

const { studio } = await productionDependencies({ checkoutRoot, newsroomPath });

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
