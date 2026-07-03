import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const url = pathToFileURL("/tmp/chart-scrolly/scrolly.html").href;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
// At step 0 (title beat) progress=0 → no line path yet; wait for the SVG frame instead.
await p.waitForSelector("svg", { timeout: 15000 });

async function lineLenAtScroll(frac) {
  await p.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
  await p.waitForTimeout(600);
  return p.evaluate(() => {
    const paths = [...document.querySelectorAll("svg path")].filter((el) => {
      const s = el.getAttribute("stroke");
      return s && s !== "none" && (el.getAttribute("fill") ?? "none") === "none";
    });
    return Math.max(0, ...paths.map((pp) => { try { return pp.getTotalLength(); } catch { return 0; } }));
  });
}

const early = await lineLenAtScroll(0.15); // near the first reveal
const late = await lineLenAtScroll(0.9); // near the last reveal
console.log(JSON.stringify({ errors: errs.slice(0, 2), early: Math.round(early), late: Math.round(late) }));
if (errs.length) { console.error("PAGE ERRORS"); process.exit(1); }
if (!(late > early + 5)) { console.error("line did not draw further on scroll"); process.exit(1); }
console.log("chart-scrolly smoke OK");
await b.close();
