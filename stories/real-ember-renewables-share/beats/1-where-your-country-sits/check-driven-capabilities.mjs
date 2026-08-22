/**
 * THE THREE BROWSER-DRIVEN CAPABILITIES `verify-web.mjs` DOES NOT RUN.
 *
 * `chart-web` declares six capabilities in `doctrine/references/guard-catalogue.json` and its own
 * `verify-web.mjs` imports and drives exactly two of them (`graphicFillsItsFrame`,
 * `tableCarriesTheMarks`). The other three that need a browser — `keyboardReachesEveryMark`,
 * `staticFrameSurvives`, `motionUnderReduce` — are called only from the skill's own `test/`
 * directory, which walks the skill's OWN committed beats. A story beat in `stories/` is outside
 * that walk, so nothing would ever drive them against this page. This is that entry point.
 * `weightAgainstCeiling`, which needs no browser, is in `check-guards.mjs` beside this file.
 *
 *   bun stories/real-ember-renewables-share/beats/1-where-your-country-sits/check-driven-capabilities.mjs
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

import { keyboardReachesEveryMark } from "../../../../skills/chart-web/scripts/detect-reachable-by-keyboard.mjs";
import { staticFrameSurvives } from "../../../../skills/chart-web/scripts/detect-degrades-without-javascript.mjs";
import { motionUnderReduce } from "../../../../skills/chart-web/scripts/detect-honours-reduced-motion.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const page = join(HERE, "renders/where-your-country-sits.html");

/** The same candidate list every script in this repository that drives a browser carries —
 *  duplicated, because nothing outside a skill may import out of one either. */
function resolveChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const dir of readdirSync(cache)) {
      const mac = join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
      if (existsSync(mac)) return mac;
      const macIntel = join(cache, dir, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
      if (existsSync(macIntel)) return macIntel;
      const linux = join(cache, dir, "chrome-linux64/chrome");
      if (existsSync(linux)) return linux;
    }
  for (const path of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ])
    if (existsSync(path)) return path;
  throw new Error("no Chrome found — set CHROME_PATH");
}

const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome() });
try {
  {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1600, height: 800 });
    await tab.goto(`file://${page}`, { waitUntil: "load" });
    const reach = await keyboardReachesEveryMark(tab);
    console.log(
      `keyboardReachesEveryMark   ${JSON.stringify(reach)} — ` +
        (reach.focusable === reach.marks && reach.detailShown === reach.marks ? "every mark" : "MARKS MISSED"),
    );
    await tab.close();
  }
  {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1600, height: 800 });
    await tab.goto(`file://${page}`, { waitUntil: "load" });
    const survives = await staticFrameSurvives(tab);
    console.log(
      `staticFrameSurvives        ${JSON.stringify(survives)} — ` +
        (survives.marksWithJs === survives.marksWithout ? "the same population with scripting off" : "MARKS LOST"),
    );
    await tab.close();
  }
  for (const value of ["no-preference", "reduce"]) {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1600, height: 800 });
    await tab.emulateMediaFeatures([{ name: "prefers-reduced-motion", value }]);
    await tab.goto(`file://${page}`, { waitUntil: "load" });
    console.log(`motionUnderReduce (${value.padEnd(13)}) ${JSON.stringify(await motionUnderReduce(tab))}`);
    await tab.close();
  }
} finally {
  await browser.close();
}
