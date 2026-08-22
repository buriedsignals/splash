/**
 * THE BEHAVIOURAL HALF OF THIS BEAT'S VERIFICATION, driven in a real browser with real input.
 *
 * `map-web`'s own `scripts/verify-interaction.mjs` cannot be pointed at a story beat: it hard-codes
 * the skill's own sample data and its own thirteen POINTS, and every value it checks is a
 * population from `assets/sample-data/regions.json`. This is that script's shape, against this
 * beat's own eight ROUTES and five destinations, with every number checked against the frozen
 * table's own derived `routes.json`.
 *
 *   bun stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/verify-interaction.mjs
 */
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { destinationsByArrivals, people, shareOf, totalOf } from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, "renders/where-the-routes-lead.html");
const LANGUAGE = "en";

function resolveChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

const routes = JSON.parse(await readFile(join(HERE, "routes.json"), "utf8"));
const total = totalOf(routes);
const destinations = destinationsByArrivals(routes);
const expected = new Map([
  ...routes.map((r) => [r.key, `${r.origin} to ${r.destination}: ${people(r.value, LANGUAGE)} people, ${shareOf(r.value, total)}% of the eight recorded routes`]),
  ...destinations.map((d) => [d.key, `${d.name}: ${people(d.value, LANGUAGE)} people arriving on ${d.routes} of the eight recorded routes, ${shareOf(d.value, total)}% of them`]),
]);

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
try {
  for (const [w, h] of [[1600, 900], [1280, 800], [768, 1024], [375, 812]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });

    // §1 EVERY HIT SURFACE ANSWERS FOR ITSELF, UNDER A REAL POINTER.
    //
    // The surface is the RIBBON, not a disc at its midpoint (see `FlowMapWeb.tsx`'s own note), so
    // the point driven is a point ON each ribbon — taken from the path's own geometry through
    // `getPointAtLength` and mapped to client coordinates by the SVG's own screen CTM, never a
    // guess. `elementFromPoint` first, because `.focus()` does not hit-test and a swallowed hover
    // is invisible to any assertion that does not ask the browser what is actually there.
    const surfaces = await page.evaluate(() => {
      const svg = document.querySelector("svg.map");
      const ctm = svg.getScreenCTM();
      const at = (x, y) => {
        const p = svg.createSVGPoint();
        p.x = x; p.y = y;
        const q = p.matrixTransform(ctm);
        return { x: q.x, y: q.y };
      };
      return [...svg.querySelectorAll(".fm-hit")].map((el) => {
        const key = el.getAttribute("data-key");
        if (el.tagName.toLowerCase() === "circle")
          return {
            key,
            title: el.querySelector("title").textContent,
            points: [at(Number(el.getAttribute("cx")), Number(el.getAttribute("cy")))],
          };
        const point = el.getPointAtLength(el.getTotalLength() * 0.5);
        // NINE POINTS ALONG THE RIBBON, and the claim is "somewhere on its own length", not "at
        // its midpoint". Eight ribbons converging on five cities cross each other; at any single
        // sampled point the topmost crossing ribbon legitimately answers, and demanding otherwise
        // would be demanding a property a flow map cannot have. What must hold — and what the two
        // checks below assert — is that whatever answers answers TRUTHFULLY for the ribbon actually
        // under the pointer, and that no ribbon is buried along its whole length.
        const length = el.getTotalLength();
        return {
          key,
          title: el.querySelector("title").textContent,
          points: [0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88].map((t) => {
            const p = el.getPointAtLength(length * t);
            return at(p.x, p.y);
          }),
        };
      });
    });
    check(surfaces.length === 13, `${w}x${h}: expected 13 hit surfaces, found ${surfaces.length}`);
    for (const surface of surfaces) {
      check(surface.title === expected.get(surface.key),
        `${w}x${h}: ${surface.key}'s own native title reads ${JSON.stringify(surface.title)}`);
      const seen = [];
      let answered = false;
      for (const point of surface.points) {
        const atPoint = await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return el && el.getAttribute ? el.getAttribute("data-key") : null;
        }, point);
        await page.mouse.move(point.x - 40, point.y - 40);
        await page.mouse.move(point.x, point.y);
        const shown = await page.evaluate(() => {
          const tip = document.getElementById("tooltip");
          return tip.hidden ? null : tip.textContent;
        });
        seen.push({ atPoint, shown });
        // WRONG IS WORSE THAN NOTHING. Whatever answers must answer TRUTHFULLY for whatever the
        // pointer is actually over — a reading that belongs to another ribbon is the defect this
        // whole hit surface replaced a midpoint button to remove.
        check(atPoint === null || shown === expected.get(atPoint),
          `${w}x${h}: the pointer is over ${atPoint} and the page said ${JSON.stringify(shown)}`);
        if (atPoint === surface.key && shown === expected.get(surface.key)) answered = true;
      }
      check(answered,
        `${w}x${h}: ${surface.key} answered for itself at none of ${surface.points.length} points on its own length — ${JSON.stringify(seen)}`);
    }
    await page.mouse.move(2, 2);

    // §2 THE KEYBOARD REACHES EVERY ONE OF THEM, and focus alone gives the same reading.
    const reached = await page.evaluate(async () => {
      const seen = [];
      const buttons = [...document.querySelectorAll(".pt")];
      for (const b of buttons) {
        b.focus();
        const tip = document.getElementById("tooltip");
        seen.push({ key: b.getAttribute("data-key"), focused: document.activeElement === b, tip: tip.hidden ? null : tip.textContent });
      }
      return seen;
    });
    for (const r of reached) {
      check(r.focused, `${w}x${h}: ${r.key} could not take keyboard focus`);
      check(r.tip === expected.get(r.key), `${w}x${h}: focusing ${r.key} showed ${JSON.stringify(r.tip)}`);
    }

    // §3 THE ARGUMENT IS NEVER BEHIND AN INTERACTION. Both halves of the takeaway are readable with
    // nothing hovered, nothing focused and nothing opened.
    const atRest = await page.evaluate(() => document.querySelector(".map-web").innerText);
    for (const needed of ["23,600", "21,200", "18,400", "54,500", "Paris", "London"])
      check(atRest.includes(needed), `${w}x${h}: ${needed} is not readable at rest`);

    await page.close();
  }

  // §4 THE PAGE WITH JAVASCRIPT OFF. The plate, every label, the legend, the arrivals table and the
  // collapsed route table are all server-rendered; the disclosure is a native element.
  const off = await browser.newPage();
  await off.setJavaScriptEnabled(false);
  await off.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await off.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
  const noJs = await off.evaluate(() => ({
    ribbons: document.querySelectorAll('path[data-role="ribbon"]').length,
    arrows: document.querySelectorAll('path[data-role="arrow"]').length,
    // 12 visible: six origins in the anchored block, five destinations, one annotation. The six
    // `.fm-live-only` copies are in the markup and display:none until the live map boots — counted
    // apart, so a rule that stopped hiding them would be caught here rather than seen.
    labels: document.querySelectorAll(".point-label:not(.fm-live-only)").length,
    liveOnlyLabels: document.querySelectorAll(".fm-live-only").length,
    liveOnlyShown: [...document.querySelectorAll(".fm-live-only")].filter((el) => getComputedStyle(el).display !== "none").length,
    buttons: document.querySelectorAll(".pt").length,
    titles: document.querySelectorAll(".pt[title]").length,
    legend: document.querySelectorAll(".fm-legend-key").length,
    routeRows: document.querySelectorAll(".mw-table-disclosure tbody tr").length,
    plate: document.querySelectorAll("svg.map image").length,
    text: document.querySelector(".map-web-page").innerText,
  }));
  check(noJs.ribbons === 8, `no-JS: ${noJs.ribbons} ribbons`);
  check(noJs.arrows === 8, `no-JS: ${noJs.arrows} arrowheads`);
  check(noJs.labels === 12, `no-JS: ${noJs.labels} labels (11 places + 1 annotation)`);
  check(noJs.liveOnlyLabels === 6, `no-JS: ${noJs.liveOnlyLabels} live-only origin labels in the markup`);
  check(noJs.liveOnlyShown === 0, `no-JS: ${noJs.liveOnlyShown} live-only labels are visible with no live map`);
  check(noJs.buttons === 13 && noJs.titles === 13, `no-JS: ${noJs.titles}/${noJs.buttons} hit targets carry a native title`);
  check(noJs.legend === 3, `no-JS: ${noJs.legend} legend keys`);
  // ONE DISCLOSED TABLE, BOTH READINGS. Each route row also names the whole total arriving at its
  // own destination, so eight rows answer for all thirteen marks. The arrivals table that used to
  // render expanded in the composition is gone, and with it the check that counted its five rows.
  check(noJs.routeRows === 8, `no-JS: ${noJs.routeRows} route rows`);
  check(noJs.plate === 1, `no-JS: ${noJs.plate} plate images`);
  for (const needed of ["23,600", "21,200", "18,400", "54,500"])
    check(noJs.text.includes(needed), `no-JS: ${needed} missing from the page`);
  await off.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("interaction verified: 13 hit targets x 4 viewports, pointer + keyboard, argument at rest, and the JavaScript-off pass");
