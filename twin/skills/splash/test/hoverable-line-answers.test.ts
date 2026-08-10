/**
 * A LINE THAT CARRIES A READING ANSWERS ON THE LINE.
 *
 * The owner asked for it by name on the slope beat: *"a full hover tooltip on the connecting line,
 * giving the information that links the two ends."* Before this, `pointer-events: stroke` appeared
 * nowhere in the tree outside spec prose, and every hit surface in this genre was either one shared
 * `.hit-area` rect resolved by nearest-x or a per-point target. A reading that belongs to the line —
 * both ends AND the change between them — had nowhere to live.
 *
 * WHY IT NEEDS ITS OWN GUARD RATHER THAN AN EXTENSION OF THE POINT ONE.
 * `interaction-promises-are-kept.test.ts` probes a mark at its `data-detail` element's own BOUNDING
 * BOX CENTRE. For a diagonal that centre is off the line: on this beat's own connectors it misses
 * the stroke by up to 40px, so the existing guard would report a working primitive as broken, and a
 * broken one as working the moment a component grew a transparent rect. This file takes the probe
 * point from the element itself in the page — `getPointAtLength(getTotalLength() * f)` at
 * f = 0.25, 0.5, 0.75 — which is on the line by construction whatever shape it is.
 *
 * EVERY PROBE COORDINATE IS ROUNDED TO AN INTEGER. `page.mouse.move` at a fractional coordinate
 * silently does nothing — measured in this tree, x=65.63 produced no event and x=66 produced the
 * hover — and a fluid layout lands on fractions roughly half the time.
 *
 * WHAT IT ASSERTS, at 1400×900 and 375×812, for every delivered artifact carrying a hoverable line:
 *   1. Each of the three points along each line answers: the shared `#tooltip` becomes visible and
 *      carries text.
 *   2. What it says is one of THIS artifact's own `data-detail` strings, byte for byte — never a
 *      string this test invents, never a stale one from the previous probe.
 *   3. The three points along ONE line all answer with the SAME line's reading. Points are held to
 *      membership only (they overlap and resolve by nearest); a line is not ambiguous about which
 *      line you are pointing at, except at a crossing — see the residue below.
 *   4. Keyboard focus on the line names its own line: focusing it shows its own detail exactly.
 *   5. The reading LINKS THE TWO ENDS. A line's detail must carry more than one number — the guard
 *      counts numeric runs and requires at least three (both ends and the change), which is the
 *      difference between "the information that links the two ends" and a second copy of an
 *      endpoint's own tooltip.
 *
 * WHAT IT DOES NOT COVER.
 *   1. **Resolution at a true crossing.** The twins are wide and overlap, so the script resolves a
 *      pointer to the NEAREST line's own stroke rather than to whichever twin caught the event —
 *      without that, 21 of 60 probes taken ON a line answered with a different line at 375, which is
 *      how this was found. Where two lines genuinely cross, the two distances are equal and the
 *      answer is arbitrary between them. Stated, not fixed.
 *   2. **Two widths, one engine.**
 *   3. **It says nothing about whether the reading is TRUE.** `data-detail` is ground truth here;
 *      `claims-grounded-in-data.test.ts` is the file that asks whether it matches the frozen CSV.
 *
 * THE MUTATIONS, both run in a copy of the tree under `/tmp/line-mut/`, never here.
 *   (a) THE PRIMITIVE BROKEN — `pointer-events: stroke` removed from `.line-hit` in the genre's own
 *       `buildCss`, and the beat re-rendered in the copy:
 *
 *         0 pass · 1 fail
 *         Received: "proof/web-co2-decline-slope/co2-decline-slope.html @ 1400: 30 of 30 probes
 *         along 10 lines got no answer — the first silent one is "Germany · 1990 13.23 t → 2024
 *         6.77 t · down 6.46 t (48.85%)" at 25% along its own length
 *         … the same at 375"
 *
 *   (b) THE GUARD ITSELF AIMED WRONG — `getPointAtLength` replaced by the element's bounding-box
 *       centre, against the CORRECT artifact. **It does NOT go red, and that is worth stating
 *       rather than hiding**: measured, 30 of 30 probes still answer. The reason is geometric — a
 *       STRAIGHT segment's bounding-box centre is its own midpoint, so on the only beat that ships
 *       a hoverable line today the two probes are the same point. The on-path probe is still the
 *       right one and is what makes this guard correct for the curved case (a route doubling back
 *       on itself has a bbox centre nowhere near its stroke), but until such a beat exists this
 *       mutation proves nothing and is recorded as not reproducing. Mutation (a) is the one that
 *       establishes this file can go red.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer from "puppeteer";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

setDefaultTimeout(600000);

const WIDTHS = [
  { w: 1400, h: 900 },
  { w: 375, h: 812 },
];

/** Where along each line the probe lands. Never 0 or 1: a line's own ends are where its endpoint
 *  targets legitimately win, and a guard that demanded the LINE answer there would be asserting the
 *  wrong thing about a correct artifact. */
const ALONG = [0.25, 0.5, 0.75];

/** How many numeric runs a line's reading must carry to count as linking its two ends: both values
 *  and the change. Two would be satisfied by printing the endpoints twice. */
const NUMBERS_IN_A_LINE_READING = 3;

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `map-web/test/standalone.test.ts`'s own copy states. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

function deliveredHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) deliveredHtml(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

/** Discovers hoverable lines by BEHAVIOUR, never by class: a stroked geometry element carrying a
 *  `data-detail` whose computed `pointer-events` is `stroke`. A beat that renames the class keeps
 *  being measured; a beat that drops the property stops being a hoverable line and is caught by the
 *  discovery count instead of passing silently. */
const FIND_LINES = `(() => {
  const out = [];
  for (const el of document.querySelectorAll("path[data-detail], line[data-detail], polyline[data-detail]"))
    out.push({ detail: el.getAttribute("data-detail"), pointerEvents: getComputedStyle(el).pointerEvents });
  return out;
})()`;

/** The probe point on line `i` at fraction `f`, in integer client coordinates — taken from the
 *  element's own geometry in the page, never from its box. */
const pointOnLine = (i: number, f: number) => `(() => {
  const els = [...document.querySelectorAll("path[data-detail], line[data-detail], polyline[data-detail]")];
  const el = els[${i}];
  if (!el || !el.getTotalLength) return null;
  const total = el.getTotalLength();
  if (!total) return null;
  const p = el.getPointAtLength(total * ${f});
  const m = el.getScreenCTM();
  const x = p.x * m.a + p.y * m.c + m.e;
  const y = p.x * m.b + p.y * m.d + m.f;
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
  return { x: Math.round(x), y: Math.round(y), detail: el.getAttribute("data-detail") };
})()`;

const focusLine = (i: number) => `(() => {
  const els = [...document.querySelectorAll("path[data-detail], line[data-detail], polyline[data-detail]")];
  const el = els[${i}];
  if (!el) return null;
  el.focus();
  return el.getAttribute("data-detail");
})()`;

const READ_TOOLTIP = `(() => {
  const t = document.getElementById("tooltip");
  if (!t) return null;
  const cs = getComputedStyle(t);
  return {
    shown: !t.hidden && cs.display !== "none" && cs.visibility !== "hidden",
    text: (t.textContent || "").trim(),
  };
})()`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("a hoverable line answers on the line", () => {
  it("prints the reading that links its two ends, by pointer and by keyboard", async () => {
    const files = deliveredHtml(PROOF);
    expect(files.length).toBeGreaterThan(0);

    const browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
    });
    const failures: string[] = [];
    const roster: string[] = [];
    let linesDriven = 0;
    try {
      const page = await browser.newPage();
      for (const { w, h } of WIDTHS) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        for (const file of files) {
          await page.goto(`file://${file}`, { waitUntil: "load" });
          const found = (await page.evaluate(FIND_LINES)) as {
            detail: string;
            pointerEvents: string;
          }[];
          if (found.length === 0) continue;
          const details = found.map((f) => f.detail);
          const rel = relative(TWIN, file);
          for (const f of found)
            if (f.pointerEvents !== "stroke")
              failures.push(
                `${rel} @ ${w}: ${JSON.stringify(f.detail)} carries a reading but its ` +
                  `pointer-events is ${JSON.stringify(f.pointerEvents)} — the hit region is its ` +
                  `BOUNDING BOX, which for a diagonal is mostly empty space and covers every ` +
                  `neighbour between it and the frame`,
              );
          const own = new Set(details);
          let answered = 0;
          let probed = 0;
          let firstSilent: string | null = null;

          for (let i = 0; i < details.length; i++) {
            for (const f of ALONG) {
              const at = (await page.evaluate(pointOnLine(i, f))) as {
                x: number;
                y: number;
                detail: string;
              } | null;
              if (!at) continue;
              probed += 1;
              await page.mouse.move(at.x - 40, at.y - 40);
              await page.mouse.move(at.x, at.y);
              await sleep(40);
              const tip = (await page.evaluate(READ_TOOLTIP)) as {
                shown: boolean;
                text: string;
              } | null;
              if (!tip || !tip.shown || tip.text.length === 0) {
                if (firstSilent === null)
                  firstSilent = `${at.detail}" at ${Math.round(f * 100)}% along its own length`;
                continue;
              }
              answered += 1;
              if (!own.has(tip.text))
                failures.push(
                  `${rel} @ ${w}: pointing at a line printed ${JSON.stringify(tip.text)}, which is ` +
                    `not one of this artifact's own readings`,
                );
              else if (tip.text !== at.detail)
                failures.push(
                  `${rel} @ ${w}: pointing ${Math.round(f * 100)}% along ` +
                    `${JSON.stringify(at.detail)} answered with ${JSON.stringify(tip.text)} — a ` +
                    `line is not ambiguous about which line you are pointing at`,
                );
            }

            const focused = (await page.evaluate(focusLine(i))) as
              string | null;
            await sleep(40);
            const tip = (await page.evaluate(READ_TOOLTIP)) as {
              shown: boolean;
              text: string;
            } | null;
            if (focused && (!tip || !tip.shown || tip.text !== focused))
              failures.push(
                `${rel} @ ${w}: focusing ${JSON.stringify(focused)} showed ` +
                  `${JSON.stringify(tip?.text ?? "")} — keyboard must name its own line`,
              );

            const numbers = (details[i].match(/-?\d[\d.,]*/g) ?? []).length;
            if (numbers < NUMBERS_IN_A_LINE_READING)
              failures.push(
                `${rel} @ ${w}: the line reading ${JSON.stringify(details[i])} carries ${numbers} ` +
                  `numbers — a line's reading has to LINK its two ends, which needs both of them ` +
                  `and the change between them`,
              );
            linesDriven += 1;
          }

          if (answered < probed)
            failures.push(
              `${rel} @ ${w}: ${probed - answered} of ${probed} probes along ${details.length} ` +
                `lines got no answer — the first silent one is "${firstSilent}`,
            );
          roster.push(
            `  ${rel} @ ${w}: ${details.length} lines, ${answered}/${probed} probes answered`,
          );
        }
      }
    } finally {
      await browser.close();
    }

    console.log(`hoverable lines driven:\n${roster.join("\n")}`);
    expect(linesDriven).toBeGreaterThan(0);
    expect(failures.join("\n")).toBe("");
  });
});
