// Runs map-web's own `graphicFillsItsFrame` decision against a delivered page, at the three widths
// its test measures. The skill declares the guard and calls it ONLY from its own *.test.ts against
// two hard-coded pages, so a beat outside that file has no way to run it; this drives the same
// pure decision over the same measurement.
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  graphicFillsItsFrame,
  bindingAxisFraction,
  FLOOR_FRACTION,
} from "../../../../skills/map-web/scripts/detect-fills-its-frame.mjs";
const exe = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
const file = process.argv[2];
const WIDTHS = [{ w: 1600, h: 900 }, { w: 1280, h: 800 }, { w: 375, h: 812 }];
const browser = await puppeteer.launch({ executablePath: exe, headless: true });
for (const { w, h } of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  const box = await page.evaluate(() => {
    const r = document.querySelector(".mw-viewport").getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  // THE BINDING AXIS, not the area (2026-08-23). This fed an AREA fraction to a floor that is now
  // measured over the binding axis, so it reported three false UNDERs on a page that is fine: a
  // baked plate keeps its own true aspect, and a portrait plate in a landscape window is genuinely
  // smaller in AREA by design while still filling every pixel of the axis it is bound on.
  const fraction = bindingAxisFraction(box, { width: w, height: h });
  const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
  console.log(`${w}x${h}  ${(fraction * 100).toFixed(1)}%  floor ${(FLOOR_FRACTION * 100).toFixed(1)}%  ${found.under ? "UNDER" : "clears"}`);
  await page.close();
}
await browser.close();
