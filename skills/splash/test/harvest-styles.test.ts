/**
 * THE STYLE ROUTE: a page's own typographic signature, read from its computed styles.
 *
 * This is the half of the harvest that reaches TYPE. What it measures is exactly what separates
 * published work from this tree's own output: across 122 components Splash uses one family, four
 * weights, and — measured on 2026-09-07 — ZERO italic, ZERO letter-spacing and ZERO case
 * transforms, while ABC alone uses 77 letter-spaced runs and 57 case-transformed ones. A harvester
 * that collapsed those into one tuple would report the two as identical, so the three tests below
 * are the ones that matter.
 *
 * It drives a real browser, so it lands in the HEAVY lane on its own: `scripts/test-lanes.mjs`
 * derives the lane by following imports, and nothing needs registering.
 *
 * The page is built with `setContent`, never fetched: a test whose result depends on a live
 * newsroom's markup fails for reasons that have nothing to do with this code.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { harvestStyles } from "../../../scripts/design-base/harvest-styles.mjs";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];

const PAGE = `<!doctype html><body style="background:#FFFCEE;margin:0">
  <h1 style="font-family:Georgia;font-size:30px;font-weight:700">Plain heading</h1>
  <p style="font-family:Georgia;font-size:14px;font-style:italic;width:600px">An italic caveat that runs on long enough to be measured as a real column of running text rather than as a caption or a label, which is the distinction the column floor exists to draw.</p>
  <span style="font-family:Helvetica;font-size:10px;letter-spacing:2px;text-transform:uppercase">tracked label</span>
  <!-- Four runs identical on family, size and weight, differing ONLY on the three axes this tree
       never uses. If the key drops any of them these collapse into one tuple, and the harvester
       reports a page's whole annotation register as its axis register. -->
  <span style="font-family:Helvetica;font-size:12px;font-weight:400">register plain</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;font-style:italic">register italic</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;letter-spacing:3px">register tracked</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;text-transform:uppercase">register caps</span>
  <div style="display:none"><p style="font-family:Georgia;font-size:99px">Never painted, never counted, and long enough to pass the length floor for a column.</p></div>
  <svg width="120" height="60"><circle cx="30" cy="30" r="20" fill="#0B7A75"></circle><line x1="0" y1="0" x2="120" y2="60" stroke="#E41E26"></line></svg>
</body>`;

let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
let measured: Awaited<ReturnType<typeof harvestStyles>>;

beforeAll(async () => {
  const chrome = CHROMES.find(existsSync);
  if (!chrome) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setContent(PAGE, { waitUntil: "load" });
  measured = await harvestStyles(page);
});

afterAll(async () => {
  await browser?.close();
});

describe("the style route", () => {
  it("should keep four runs that differ ONLY on italic, tracking and case as four tuples", () => {
    // The decision under test is the KEY, and it can only be tested by runs that agree on
    // everything else. Four spans at Helvetica 12/400 differ one axis each; a key that drops any
    // axis merges them, and a page's annotation register is then reported as its axis register.
    const register = measured.type.filter(
      (t) => t.family === "Helvetica" && t.size === 12,
    );
    expect(register).toHaveLength(4);
    expect(new Set(register.map((t) => t.key)).size).toBe(4);
    expect(register.filter((t) => t.style === "italic")).toHaveLength(1);
    expect(register.filter((t) => Number(t.tracking) === 3)).toHaveLength(1);
    expect(register.filter((t) => t.transform === "uppercase")).toHaveLength(1);
  });

  it("should record absent tracking as the number zero, not as the word normal", () => {
    // `letterSpacing` reads back as "normal" when unset. Kept as a word it sorts and compares
    // against nothing, and two runs at zero tracking look different from each other.
    const plain = measured.type.find(
      (t) =>
        t.family === "Helvetica" &&
        t.size === 12 &&
        t.style === "normal" &&
        t.transform === "none",
    );
    expect(plain?.tracking).toBe(0);
  });

  it("should carry the other five axes on the tuple as well as in the key", () => {
    const italic = measured.type.find(
      (t) => t.family === "Georgia" && t.style === "italic",
    );
    expect(italic?.size).toBe(14);

    const tracked = measured.type.find(
      (t) => t.family === "Helvetica" && t.size === 10,
    );
    expect(tracked?.transform).toBe("uppercase");
    expect(Number(tracked?.tracking)).toBe(2);
  });

  it("should read the ground off the page rather than assuming white", () => {
    expect(measured.ground).toBe("rgb(255, 252, 238)");
  });

  it("should take both fill and stroke off the marks", () => {
    const colours = measured.marks.map((m) => m.colour);
    expect(
      colours.some((c) => c.startsWith("fill") && c.includes("11, 122, 117")),
    ).toBe(true);
    expect(
      colours.some((c) => c.startsWith("stroke") && c.includes("228, 30, 38")),
    ).toBe(true);
  });

  it("should count nothing that is not painted", () => {
    // A hidden element carries computed styles like any other. Counting it would report a
    // typographic vocabulary the reader never sees.
    expect(measured.type.some((t) => t.size === 99)).toBe(false);
  });

  it("should measure the column off the widest paragraph actually painted", () => {
    expect(measured.column?.px).toBe(600);
    expect(measured.column?.ch).toBeGreaterThan(50);
  });
});
