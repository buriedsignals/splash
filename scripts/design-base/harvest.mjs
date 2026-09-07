// twin/scripts/design-base/harvest.mjs
//
// ONE HARVEST, BOTH ROUTES, ALWAYS.
//
// The style route (`harvest-styles.mjs`) reads computed styles: it reaches TYPE everywhere and
// marks wherever they are SVG. The pixel route (`pixel-palette.mjs`) reads the rendered pixels: it
// reaches everything the first cannot — posters, canvas graphics, video frames. Measured on
// 2026-09-07, four informationisbeautiful.net pieces returned 17-23 type tuples and ZERO mark
// colours; a harvest that ran only the style route would have filed four colourless records for
// four of the most chromatically deliberate artifacts in the corpus.
//
// So both run on every reference, and the record says what each returned. A route that throws is
// recorded as `failed` WITH ITS REASON, never omitted: an absent key and a failed route look
// identical to a reader, and only one of them is honest.
//
// Usage:
//   bun scripts/design-base/harvest.mjs --family line --archive url-list --url "https://…"
//   bun scripts/design-base/harvest.mjs --family line --archive url-list --pool pool.txt

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { harvestStyles } from "./harvest-styles.mjs";
import { readPixelPalette } from "./pixel-palette.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CORPUS = join(ROOT, "docs", "design-base", "references");

/** The four pools a reference may be drawn from. A record that cannot name one is not filed. */
export const ARCHIVES = ["url-list", "informationisbeautiful", "datavizproject", "buried-signals"];

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];

/** The one viewport every reference is measured at, so two records are comparable. */
const VIEWPORT = { width: 1440, height: 900 };
/** After load: let webfonts, charts and scroll-triggered first steps actually paint. */
const SETTLE_MS = 6000;
const AFTER_SCROLL_MS = 3500;
const BACK_AT_TOP_MS = 1500;

export function resolveChrome() {
  const found = CHROMES.find(existsSync);
  if (!found) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
  return found;
}

/** A stable directory name for a url: its host and path, and nothing invented. */
export function slugOf(url) {
  const parsed = new URL(url);
  return (parsed.hostname.replace(/^www\./, "") + parsed.pathname)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)
    .toLowerCase();
}

/**
 * THE CONSENT WALL IS THE DOMINANT FAILURE MODE, MEASURED.
 *
 * A second map wave returned zero usable references out of twelve. Nine of the twelve were walls
 * rather than bad choices: three bot checks (SCMP), four consent dialogs (La Nación ×2, National
 * Geographic ×2), a 404 and a 403. The four consent dialogs are the recoverable ones, and this is
 * what recovers them.
 *
 * Known consent platforms first, because their buttons are stable and unambiguous. A text match
 * follows for the rest — deliberately narrow, and only ever on a BUTTON: matching link text would
 * click "Accept our terms" in a footer and navigate away from the piece.
 */
const CONSENT_SELECTORS = [
  "#onetrust-accept-btn-handler",
  ".onetrust-close-btn-handler",
  "#didomi-notice-agree-button",
  ".qc-cmp2-summary-buttons button[mode='primary']",
  "button[title='Accept all']",
  "button[aria-label*='Accept' i]",
  ".fc-cta-consent",
  "#truste-consent-button",
  ".cmp-intro_acceptAll",
  "[data-testid='GDPR-accept']",
];

/** Only these words, only on a button, only when it is actually painted. */
const CONSENT_WORDS =
  /^(accept|accept all|i accept|agree|i agree|allow all|got it|ok|continue|j.?accepte|tout accepter|accepter|aceptar|acepto|zustimmen|akzeptieren)$/i;

/**
 * Dismiss a consent dialog if one is in the way. Returns what it clicked, or null — recorded in the
 * reference, because a page read after a dialog was dismissed is a page in a state the harvester
 * put it in, and that belongs in the record.
 */
async function dismissConsent(page) {
  for (const selector of CONSENT_SELECTORS) {
    const handle = await page.$(selector);
    if (!handle) continue;
    const box = await handle.boundingBox();
    if (box) {
      await handle.click().catch(() => {});
      await handle.dispose();
      return selector;
    }
    await handle.dispose();
  }
  return page.evaluate((source) => {
    const words = new RegExp(source, "i");
    for (const button of document.querySelectorAll("button, [role='button']")) {
      const label = (button.textContent ?? "").trim();
      if (!words.test(label)) continue;
      const r = button.getBoundingClientRect();
      if (r.width < 40 || r.height < 20) continue;
      button.click();
      return `button "${label}"`;
    }
    return null;
  }, CONSENT_WORDS.source);
}

/** Below this the element is a logo, an icon or a spacer, not the piece's graphic. */
const MIN_GRAPHIC_PX = { w: 200, h: 120 };

/**
 * A handle on the page's largest painted graphic, or null. Returned as a handle rather than a box
 * so the caller can photograph it: a box would have to be turned back into pixels, and that is the
 * arithmetic that put a crop below the fold on the first real harvest.
 */
async function largestGraphic(page) {
  const handles = await page.$$("svg, canvas, figure img, picture img");
  let best = null;
  let bestArea = 0;
  for (const handle of handles) {
    const box = await handle.boundingBox();
    if (!box || box.width < MIN_GRAPHIC_PX.w || box.height < MIN_GRAPHIC_PX.h) {
      await handle.dispose();
      continue;
    }
    const area = box.width * box.height;
    if (area > bestArea) {
      if (best) await best.dispose();
      best = handle;
      bestArea = area;
    } else await handle.dispose();
  }
  return best;
}

/**
 * Harvest one reference into `docs/design-base/references/<family>/<id>/`.
 *
 * @param {{url: string, family: string, archive: string, id?: string, browser: import("puppeteer-core").Browser, corpus?: string}} options
 */
export async function harvestReference({ url, family, archive, id, browser, corpus = CORPUS }) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    throw new Error(`refusing a non-http url: ${url}`);
  if (!ARCHIVES.includes(archive))
    throw new Error(`archive must be one of ${ARCHIVES.join(", ")}, got ${archive}`);

  const slug = id ?? slugOf(url);
  const dir = join(corpus, family, slug);
  mkdirSync(dir, { recursive: true });
  const shot = join(dir, "screenshot.png");

  const record = {
    url,
    archive,
    family,
    id: slug,
    harvestedAt: new Date().toISOString().slice(0, 10),
    viewport: VIEWPORT,
    routes: { style: { state: "not-applicable" }, pixel: { state: "not-applicable" } },
  };

  const page = await browser.newPage();
  try {
    await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    // Before anything is measured: a dialog in the way is measured INSTEAD of the piece, and both
    // routes report `ok` on it. See correction 3 in `docs/design-base/METHOD.md`.
    record.consent = await dismissConsent(page);
    if (record.consent) await new Promise((r) => setTimeout(r, 2000));
    // Scroll once and back, so lazy graphics and a scrollytelling first step actually paint.
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await new Promise((r) => setTimeout(r, AFTER_SCROLL_MS));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, BACK_AT_TOP_MS));

    await page.screenshot({ path: shot });

    try {
      record.style = await harvestStyles(page);
      record.routes.style = { state: "ok" };
    } catch (err) {
      record.routes.style = { state: "failed", why: String(err).slice(0, 300) };
    }

    try {
      // THE GRAPHIC IS PHOTOGRAPHED, NEVER CROPPED OUT OF THE PAGE SHOT.
      //
      // The first version cropped the viewport screenshot to the graphic's `getBoundingClientRect`.
      // That box is VIEWPORT-relative and the largest graphic is routinely below the fold: the
      // first real harvest returned `crop 0,1840,1440,900` against a 1440x900 image and read zero
      // pixels. Screenshotting the element scrolls it into view and captures exactly it — no
      // coordinate arithmetic, and the palette is the GRAPHIC's rather than the site's chrome.
      const target = await largestGraphic(page);
      const measuredFrom = target ? join(dir, "graphic.png") : shot;
      if (target) {
        await target.screenshot({ path: measuredFrom });
        await target.dispose();
      }
      record.pixel = readPixelPalette(measuredFrom);
      record.routes.pixel = { state: "ok", measuredFrom: target ? "graphic.png" : "screenshot.png" };
    } catch (err) {
      record.routes.pixel = { state: "failed", why: String(err).slice(0, 300) };
    }
  } catch (err) {
    const why = String(err).slice(0, 300);
    record.routes.style = { state: "failed", why };
    record.routes.pixel = { state: "failed", why };
  } finally {
    await page.close();
  }

  await writeFile(join(dir, "measured.json"), JSON.stringify(record, null, 2) + "\n");
  return { dir, record };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback = null) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const family = flag("--family");
  const archive = flag("--archive");
  const one = flag("--url");
  const pool = flag("--pool");
  if (!family || !archive || (!one && !pool))
    throw new Error(
      "usage: bun scripts/design-base/harvest.mjs --family <f> --archive <a> (--url <u> | --pool <file>)",
    );

  const urls = one
    ? [one]
    : (await readFile(resolve(pool), "utf8"))
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));

  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  let ok = 0;
  try {
    for (const url of urls) {
      const { dir, record } = await harvestReference({ url, family, archive, browser });
      const states = Object.entries(record.routes)
        .map(([route, r]) => `${route} ${r.state}`)
        .join(", ");
      if (record.routes.style.state === "ok" || record.routes.pixel.state === "ok") ok += 1;
      console.log(`${record.id}  ${states}  -> ${dir}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${ok}/${urls.length} harvested with at least one route`);
}
