/**
 * FINDING 3 (round-two stress): does the graphic actually occupy a real share of the reader's own
 * window, at three widths, on a REAL delivered page — never a claim taken on trust. This format's
 * delivered page is `iframePage`'s own three CSS declarations
 * (`html,body,iframe{width:100%;height:100%;margin:0;border:0}`, `scripts/produce.mjs`), so what is
 * measured is that the real `produce()` output actually carries them and that a real browser
 * resolves the iframe to 100% of the window at every tested width — never the source text alone.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  graphicFillsItsFrame,
  FLOOR_FRACTION,
} from "../scripts/detect-fills-its-frame.mjs";
import { produce } from "../scripts/produce.mjs";

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
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
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

const WIDTHS = [
  { w: 1600, h: 900 },
  { w: 1280, h: 800 },
  { w: 375, h: 812 },
];

/** A conformant PNG header — nothing this file's own test decodes, but Finding 5 (round-three
 *  stress) now has the web branch export a measurement PNG through this same endpoint too, and a
 *  fake that cannot answer that call is a fake that would hide the wiring being wrong. */
function fakePng(): Uint8Array {
  const bytes = new Uint8Array(28);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  new DataView(bytes.buffer).setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, 1);
  new DataView(bytes.buffer).setUint32(20, 1);
  return bytes;
}

/** The six calls `produce` can now make, answered without a network — the same fixture shape
 *  `test/produce.test.ts` and `test/verify-owned.test.ts` each carry their own copy of. */
function fakeDatawrapper() {
  const fetchFn = async (url: string | URL, init: RequestInit = {}) => {
    const u = String(url);
    if (u === "https://api.datawrapper.de/v3/charts" && init.method === "POST")
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/data")
      return new Response(null, { status: 204 });
    if (
      u === "https://api.datawrapper.de/v3/charts/aBcDe" &&
      init.method === "PATCH"
    )
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/publish")
      return new Response(
        JSON.stringify({ publicUrl: "//datawrapper.dwcdn.net/aBcDe/1/" }),
        {
          status: 200,
        },
      );
    if (u.startsWith("https://api.datawrapper.de/v3/charts/aBcDe/export/png"))
      return new Response(fakePng(), { status: 200 });
    throw new Error(`fakeDatawrapper: unexpected call to ${u}`);
  };
  return { fetchFn };
}

async function graphicFraction(
  file: string,
  w: number,
  h: number,
): Promise<number> {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    const box = await page.evaluate(() => {
      const el = document.querySelector("iframe");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    if (!box) throw new Error(`${file}: no iframe on the delivered page`);
    return (box.width * box.height) / (w * h);
  } finally {
    await browser.close();
  }
}

describe("graphicFillsItsFrame — the graphic's own share of the window, measured", () => {
  it("clears this format's own floor on a real produce() output, at every width", async () => {
    // `htmlPath` is only populated for the identity-based call form (storiesRoot/storyId/outputId)
    // — the legacy `{outDir}` one-shot form never writes a beat directory to put it in.
    const root = await mkdtemp(join(tmpdir(), "dw-beat-frame-"));
    try {
      const identity = {
        storiesRoot: join(root, "stories"),
        storyId: "a-story",
        outputId: "the-beat",
      };
      const beatDir = join(
        identity.storiesRoot,
        identity.storyId,
        "beats",
        identity.outputId,
      );
      await mkdir(beatDir, { recursive: true });
      const { fetchFn } = fakeDatawrapper();
      const result = await produce(
        {
          takeaway: "Emissions fell",
          limits: "Territorial emissions only.",
          credit: "Global Carbon Budget",
          effectiveDate: "2024 data",
          language: "en",
          color: "#0B7A75",
          chartType: "d3-lines",
          format: "web",
          data: [
            { year: 1950, co2Mt: 10.25 },
            { year: 2024, co2Mt: 32.07 },
          ],
        },
        { ...identity, name: "co2", token: "secret", fetchFn },
      );
      const html = readFileSync(result.htmlPath!, "utf8");
      expect(html).toContain("width:100%;height:100%");
      for (const { w, h } of WIDTHS) {
        const fraction = await graphicFraction(result.htmlPath!, w, h);
        const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
        expect(`${w}x${h}: ${JSON.stringify(found)}`).toBe(
          `${w}x${h}: ${JSON.stringify({ ...found, under: false })}`,
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
