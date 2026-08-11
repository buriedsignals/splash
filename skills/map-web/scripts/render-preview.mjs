// Renders THIS skill's seed from THIS skill's sample data to a static PNG preview — so a reader of
// this skill sees the same picture the interactive HTML draws before ever opening a browser. Never
// a story's render: a story's artifact proves the story, not the mechanism this skill teaches.
//
// UNLIKE the old two-fixed-layout version, `MapWebSeed`'s own furniture (title, legend, point
// labels, controls) is now plain HTML/CSS, not SVG `<text>` — so this can no longer hand the SSR'd
// markup straight to an SVG rasteriser (`@resvg/resvg-js`, used only for `deriveFurniture`'s own
// colour maths now). It instead writes the SAME self-contained HTML `render()` below produces to a
// temp file and SCREENSHOTS it with headless Chrome at one fixed viewport width — proving the actual
// rendered page, the same "screenshot it, do not trust a computed value" rule
// `references/map-web-discipline.md`'s own "Verification" section states for every claim about this
// genre's responsiveness.
//
// Uses the seed's committed frozen sample plate at `DEFAULT_PLATE_DIR`, so preview checks are
// deterministic and do not require a MapTiler key. Real story beats still bake their own plates.

import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { render, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH } from "./render-web.mjs";
import { comparePngBuffers } from "./compare-png.mjs";

const HERE = import.meta.dirname;

// The width this skill's own documentation screenshot is taken at — one of the four widths this
// genre's own verification proof is required to cover (1600/1024/768/375), chosen here because it
// is a plausible "article column, desktop" width, not the extreme end of the range.
const PREVIEW_WIDTH = 1024;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) outDir = resolve(process.cwd(), outDir);
const TARGET = join(outDir, "preview.png");

/** A DUPLICATE of `bake-plate.mjs`'s own `resolveChrome` — not an import: `bake-plate.mjs` is a
 *  top-level script with no `import.meta.main` guard (its capture runs the moment it is loaded),
 *  so importing anything from it here would also launch its browser and demand a MapTiler key this
 *  script does not need. Small helper, duplicated rather than making the bake importable. */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

const tmpRoot = await mkdtemp(join(tmpdir(), "map-web-preview-"));
try {
  await render({
    dataPath: DEFAULT_DATA_PATH,
    plateDir: DEFAULT_PLATE_DIR,
    outDir: tmpRoot,
    name: "preview.html",
  });

  // `--font-render-hinting=none --disable-lcd-text --disable-font-subpixel-positioning`: headless
  // Chrome's own text anti-aliasing is NOT perfectly reproducible run-to-run on the same input
  // otherwise — caught here by `--check` disagreeing with itself between two back-to-back renders
  // before these flags were added. Standard flags for byte-stable screenshot testing.
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: [
      "--no-sandbox",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      "--disable-lcd-text",
      "--disable-font-subpixel-positioning",
      "--force-color-profile=srgb",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: PREVIEW_WIDTH, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file://${join(tmpRoot, "preview.html")}`, { waitUntil: "load" });
  const png = await page.screenshot({ fullPage: true });

  if (process.argv.includes("--check")) {
    const committed = await readFile(TARGET);
    // Tolerant, not byte-exact — see compare-png.mjs's own header note: two Chrome launches of the
    // identical HTML are not always byte-identical (anti-aliasing jitter on the text-heavy
    // furniture), so a strict `.equals()` here would fail on the SAME seed, not a changed one.
    const diff = await comparePngBuffers(page, committed, png);
    await browser.close();
    if (!diff.same) {
      console.error(
        `preview.png is stale — the seed changed and the preview did not (${diff.reason}). Re-run without --check.`,
      );
      process.exit(1);
    }
    console.log("preview.png matches a fresh render of the seed.");
  } else {
    await browser.close();
    await mkdir(outDir, { recursive: true });
    await writeFile(TARGET, png);
    console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
  }
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
