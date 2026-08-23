// Drives the rendered page in a real browser and screenshots each step at the scroll position
// where `data-progress` reaches it — the evidence that this vehicle carries three different media,
// taken from a driven page rather than described. A screenshot taken before scrolling proves
// nothing about a scrolly.
//
// Usage: bun stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/drive.mjs [--width 1600]

import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, "renders", "the-deaths-moved.html");
const OUT = join(HERE, "drive");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const width = Number(flag("--width", "1600"));
const height = Number(flag("--height", width === 375 ? "812" : "900"));

function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("no Chrome to drive with");
  return found;
}

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: resolveChrome() });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(FILE).href, { waitUntil: "load" });

const steps = await page.$$eval(".scrolly-steps .step", (nodes) => nodes.map((n) => n.dataset.step));

// The scroller is `.scrolly-steps`; walk it CONTINUOUSLY and stop where `data-progress` first
// reaches each integer, which is the position each step's sentence is centred at.
const shots = [];
for (let i = 0; i < steps.length; i++) {
  const at = await page.evaluate(async (target) => {
    const lane = document.querySelector(".scrolly-steps");
    const root = document.querySelector(".scrolly");
    lane.scrollTop = 0;
    const max = lane.scrollHeight - lane.clientHeight;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    let best = { delta: Infinity, top: 0, progress: 0 };
    for (let top = 0; top <= max; top += 12) {
      lane.scrollTop = top;
      await frame();
      const p = Number(root.dataset.progress);
      const delta = Math.abs(p - target);
      if (delta < best.delta) best = { delta, top, progress: p };
    }
    lane.scrollTop = best.top;
    // The step-boundary swap is a 0.3s transition; a screenshot taken two animation frames after
    // the scroll lands catches two frames mid-blend and reads as a double exposure. Waited out
    // here rather than described.
    await new Promise((r) => setTimeout(r, 600));
    await frame();
    return best;
  }, i);
  const path = join(OUT, `${width}x${height}-step-${i + 1}-${steps[i]}.png`);
  await page.screenshot({ path });
  shots.push(`${steps[i]} @ progress ${at.progress.toFixed(2)} (scrollTop ${at.top}) → ${path}`);
}

await browser.close();
console.log(shots.join("\n"));
