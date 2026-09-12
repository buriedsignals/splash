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
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { harvestStyles, findGraphic, describeGraphic } from "./harvest-styles.mjs";
import { readPixelPalette } from "./pixel-palette.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CORPUS = join(ROOT, "docs", "design-base", "references");

/** The four pools a reference may be drawn from. A record that cannot name one is not filed. */
/**
 * `search` was added on 2026-09-08, when two harvests filed real published work under `url-list`
 * because the enum had nowhere else to put it. The url list holds ZERO sankey and ZERO alluvial
 * across 3 827 lines; stamping eight IEA and Carbon Brief pieces as having come from it is a record
 * lying about its own provenance, which is the one thing these records may never do.
 */
export const ARCHIVES = [
  "url-list",
  "informationisbeautiful",
  "datavizproject",
  "buried-signals",
  "search",
];

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
/** How far down the page the harvester walks looking for a lazily created graphic, and how long it
 *  waits on each step. Bounded rather than open-ended: a scrollytelling piece can be forty screens
 *  long, and the graphic that identifies it is never in the fortieth. */
const MAX_SCROLL_STEPS = 8;
const SCROLL_STEP_MS = 900;
/** After the graphic is brought into view, before it is photographed: a scroll-driven canvas draws
 *  when the reader arrives at it, and a picture taken on arrival is a picture of nothing. */
const GRAPHIC_SETTLE_MS = 2500;

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

/**
 * Only these openings, only on a button, only when it is actually painted.
 *
 * ANCHORED AT THE START, NOT AT BOTH ENDS. A whole-label match missed every consent button that
 * says what it does — "Zustimmen und weiter", "Accept all cookies", "Accepter et fermer" — which is
 * most of them outside the English-speaking web. The trailing allowance is capped at twenty
 * characters so the opening still has to be the button's subject rather than a word inside a
 * sentence.
 */
export const CONSENT_WORDS =
  /^(accept|i accept|agree|i agree|allow all|tillad alle|godkend alle|got it|ok|continue|j.?accepte|tout accepter|accepter|aceptar|acepto|accetta|zustimmen|akzeptieren|alle akzeptieren|jag godkänner)\b.{0,20}$/i;

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

/**
 * THE THIRD ROUTE: Firecrawl, for a wall the browser cannot pass.
 *
 * Measured. SCMP answers a headless Chrome with an "Access Verification" bot check — three pieces,
 * three times — and that is a site declining automated reading, which the consent handler above
 * deliberately does not work around. Firecrawl is a rendering service the account already pays for;
 * it returns the page as a reader meets it. On SCMP's *China's worst floods* it returned the whole
 * piece, and with it the second publication the map vocabulary had been missing for two waves.
 *
 * IT COSTS CREDITS AND IT IS NOT THE DEFAULT. It is asked for per pool, because a route that spends
 * money should be chosen rather than fallen into.
 *
 * AND IT RETURNS PIXELS, NOT A DOM. The style route needs a live document to read computed styles
 * from; through Firecrawl there is none, so that route is recorded `not-applicable` with its reason
 * rather than quietly omitted. A record harvested this way carries the pixel route only, and says
 * so.
 */
function firecrawlScreenshot(url, out) {
  const run = spawnSync(
    "firecrawl",
    ["scrape", url, "--screenshot", "--wait-for", "8000", "--format", "screenshot"],
    { encoding: "utf8", timeout: 120000 },
  );
  const link = (run.stdout ?? "").match(/https:\/\/storage\.googleapis\.com\S+/)?.[0];
  if (!link)
    throw new Error(
      `firecrawl returned no screenshot for ${url}: ${(run.stderr || run.stdout || "").slice(0, 200)}`,
    );
  const fetched = spawnSync("curl", ["-sS", "-o", out, link], { encoding: "utf8", timeout: 120000 });
  if (fetched.status !== 0) throw new Error(`could not fetch the firecrawl screenshot: ${fetched.stderr}`);
  return link.split("?")[0];
}

/**
 * THE ENTRY SCREEN: a longform piece that opens on a photograph and puts its graphic behind a door.
 *
 * Measured. Two of the three Buried Signals sites stop at their own entry — `kashmir-documentary`
 * on "START WATCHING", `yemen` on "EXPLORE THE MAP" — and the harvester scrolled past nothing,
 * because there was nothing below the fold to scroll to. Both were recorded as reaching no map,
 * which was true and useless.
 *
 * NARROWER THAN THE CONSENT HANDLER, deliberately. Consent is a wall in front of every page and its
 * buttons are standardised; an entry is one piece's own invitation and its words are its own. So
 * this fires ONLY when the page is a single viewport tall — a real entry screen has nothing under
 * it — and only on a control whose whole label is one of a short list of openings. A page with an
 * article below the fold is already showing its content and is never touched.
 */
export const ENTRY_WORDS =
  /^(start( watching| reading| here)?|explore( the map| the data)?|enter|begin|play|watch( the film| the video)?|view the (map|graphic|data)|see the (map|graphic|data)|launch|open the map)$/i;

/** A page taller than this much of the viewport already has content to scroll to. */
const ENTRY_MAX_PAGE_RATIO = 1.6;

/**
 * Click through an entry screen if the page is one. Returns what it clicked, or null — recorded,
 * because a page read after a door was opened is a page in a state the harvester put it in.
 */
async function openEntry(page) {
  return page.evaluate(
    ({ source, maxRatio }) => {
      const doc = document.documentElement;
      if (doc.scrollHeight > window.innerHeight * maxRatio) return null;
      const words = new RegExp(source, "i");
      for (const control of document.querySelectorAll("button, a, [role='button']")) {
        const label = (control.textContent ?? "").trim();
        if (!words.test(label)) continue;
        const r = control.getBoundingClientRect();
        // 16, not 24: measured. `yemen`'s own "Explore the map" is a text link 148 x 19, and a
        // threshold set by eye at 24 skipped the very control this was written to click.
        if (r.width < 60 || r.height < 16) continue;
        control.click();
        return `"${label}"`;
      }
      return null;
    },
    { source: ENTRY_WORDS.source, maxRatio: ENTRY_MAX_PAGE_RATIO },
  );
}

/**
 * A GRAPHIC IS NEVER THE SITE'S OWN CHROME, and this cost four families their colour readings.
 *
 * The first picker took the largest painted `svg | canvas | figure img` above no floor at all. On
 * `100.datavizproject.com` that returned nothing — Ferdio's wordmark `logo-100.svg` is 280 x 80 —
 * so the pixel route fell back to the WHOLE PAGE and reported the site's fixed navigation bar,
 * `#3274DA` at 8.6-10.5 %, which happens to be the same blue its charts are drawn in. Four of five
 * parallel harvests found this independently and not one of them found it by looking: the number
 * was plausible, and three records agreeing with each other looked like corroboration.
 *
 * The picker itself now lives in `harvest-styles.mjs` and is called from here, so the graphic is
 * decided ONCE and both halves of the record name the same object. What this file does with it is
 * photograph it, and read the type inside it when it turns out to be another document.
 */

/**
 * A FIXED HEADER LANDS INSIDE AN ELEMENT SCREENSHOT, AND IT IS THE SAME COLOUR AS THE CHART.
 *
 * Photographing the element rather than cropping the page fixed the coordinate arithmetic
 * (correction 13) and left a residue nobody expected: puppeteer scrolls the element into view, and a
 * `position: fixed` masthead is then painted OVER its first rows. On `100.datavizproject.com` the
 * panel starts 172 px down under a fixed nav, so every clip carries three or four rows of solid
 * `rgb(50, 116, 218)` — 2 472 px, 0.365 % of every frame, identical across all five records.
 *
 * That would be a rounding error if the nav were any other colour. It is the same blue Ferdio draws
 * its charts in. Measured by two agents independently: the strip is **96 %** of one record's entire
 * reported blue, 84 % of another's, and 55.7 % of a third's — and it is why one record alone
 * buckets at `#3274D9` where its siblings say `#3274D8`.
 *
 * So anything that floats is hidden for the length of the photograph and restored afterwards. The
 * page is left as it was found; only the picture changes.
 *
 * EXCEPT THE GRAPHIC ITSELF, AND WHATEVER HOLDS IT. A scrollytelling chart is `position: sticky` —
 * that is how it stays put while the prose moves past it — so a rule that hid everything floating
 * hid the piece. Measured within the hour, on ABC's mullet count: its 1440 x 900 canvas came back
 * 97.76 % cream, zero chromatic, `monochrome`. A true photograph of a graphic this function had
 * just made invisible, filed as the piece's palette, and it went green. The masthead fix had become
 * the defect it was written to remove.
 */
export async function withFloatingChromeHidden(page, take, target = null) {
  // THE FRAME HAS ITS OWN CHROME, AND THIS PASS DID NOT REACH IT. Measured on NSIDC's Charctic:
  // the graphic is an iframe, its masthead is sticky INSIDE that frame's own document, and hiding
  // floating elements in the host page left it in the picture. `#C4E0F5` / `#003366` / `#0062CC`
  // led the palette; `measuredFrom: "graphic.png"` was true and useless. It was caught only because
  // the style route independently named a different set of marks.
  const insideFrame = target ? await target.contentFrame() : null;
  const hiddenInside = insideFrame
    ? await hideFloating(insideFrame, null).catch(() => null)
    : null;
  const hidden = await page.evaluate((graphic) => {
    const marks = [];
    for (const el of document.querySelectorAll("body *")) {
      const position = getComputedStyle(el).position;
      if (position !== "fixed" && position !== "sticky") continue;
      if (graphic && (el === graphic || el.contains(graphic))) continue;
      marks.push(el.style.visibility);
      el.setAttribute("data-harvest-hidden", String(marks.length - 1));
      el.style.visibility = "hidden";
    }
    return marks;
  }, target);
  try {
    return await take();
  } finally {
    await restoreFloating(page, hidden);
    if (insideFrame && hiddenInside)
      await restoreFloating(insideFrame, hiddenInside).catch(() => {});
  }
}

/** Hide everything floating in one document, remembering what each element had. */
function hideFloating(context, graphic) {
  return context.evaluate((keep) => {
    const marks = [];
    for (const el of document.querySelectorAll("body *")) {
      const position = getComputedStyle(el).position;
      if (position !== "fixed" && position !== "sticky") continue;
      if (keep && (el === keep || el.contains(keep))) continue;
      marks.push(el.style.visibility);
      el.setAttribute("data-harvest-hidden", String(marks.length - 1));
      el.style.visibility = "hidden";
    }
    return marks;
  }, graphic);
}

/** Put one document back exactly as it was found. */
function restoreFloating(context, marks) {
  return context.evaluate((was) => {
    for (const el of document.querySelectorAll("[data-harvest-hidden]")) {
      const at = Number(el.getAttribute("data-harvest-hidden"));
      el.style.visibility = was[at] ?? "";
      el.removeAttribute("data-harvest-hidden");
    }
  }, marks);
}

/**
 * Harvest one reference into `docs/design-base/references/<family>/<id>/`.
 *
 * @param {{url: string, family: string, archive: string, id?: string, browser: import("puppeteer-core").Browser, corpus?: string}} options
 */
export async function harvestReference({ url, family, archive, id, browser, corpus = CORPUS, via = "browser" }) {
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

  if (via === "firecrawl") {
    record.via = "firecrawl";
    try {
      record.firecrawl = firecrawlScreenshot(url, shot);
      record.routes.style = {
        state: "not-applicable",
        why: "fetched through Firecrawl, which returns rendered pixels rather than a live DOM",
      };
      record.pixel = readPixelPalette(shot);
      record.routes.pixel = { state: "ok", measuredFrom: "screenshot.png" };
    } catch (err) {
      const why = String(err).slice(0, 300);
      record.routes.style = { state: "failed", why };
      record.routes.pixel = { state: "failed", why };
    }
    await writeFile(join(dir, "measured.json"), JSON.stringify(record, null, 2) + "\n");
    return { dir, record };
  }

  const page = await browser.newPage();
  try {
    await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    // Before anything is measured: a dialog in the way is measured INSTEAD of the piece, and both
    // routes report `ok` on it. See correction 3 in `docs/design-base/METHOD.md`.
    record.consent = await dismissConsent(page);
    if (record.consent) await new Promise((r) => setTimeout(r, 2000));
    // Then the piece's own door, if it has one and nothing else.
    record.entry = await openEntry(page);
    if (record.entry) await new Promise((r) => setTimeout(r, 4000));
    // ONE SCROLL DOWN AND BACK WAS NOT ENOUGH, MEASURED.
    //
    // The first version scrolled 1.2 viewports and came back. On informationisbeautiful.net the
    // embed frame that holds the actual visualisation is not in the document at that point at all —
    // it is created when the reader reaches it, five or six viewports down. The harvester saw a
    // page with a logo and a promo banner on it and reported, correctly, that there was no graphic.
    // So it now walks the page to the bottom, bounded, and comes back to the top to be measured.
    // The bottom is detected AFTER the wait, never during the same evaluate: a page with
    // `scroll-behavior: smooth` has not moved yet when `scrollBy` returns, so a synchronous check
    // reads "did not move" on the very first step and the walk ends before it starts.
    let previousY = -1;
    for (let step = 0; step < MAX_SCROLL_STEPS; step += 1) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, SCROLL_STEP_MS));
      const y = await page.evaluate(() => window.scrollY);
      if (y === previousY) break;
      previousY = y;
    }
    await new Promise((r) => setTimeout(r, AFTER_SCROLL_MS));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, BACK_AT_TOP_MS));

    await page.screenshot({ path: shot });

    try {
      record.style = await harvestStyles(page);
      // A ROUTE THAT READ NOTHING HAS NOT RETURNED OK. `harvestStyles` succeeding is not the same as
      // its having found type, and `a-record-names-its-route` has always required that `ok` carry at
      // least one tuple — so a page with no readable text produced a record its own guard refused.
      // An agent met this on a 2008 NYT archive page and repaired the record BY HAND, which is a
      // measurement written by a person (correction 6). The repair belongs here.
      record.routes.style = record.style.type?.length
        ? { state: "ok" }
        : {
            state: "not-applicable",
            why: "the document painted no text this route could read — an archived page, a canvas-only piece, or a frame that renders none",
          };
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
      const { element: target, why } = await findGraphic(page);
      if (record.style) record.style.graphic = target ? await describeGraphic(target) : null;
      if (!target) {
        // A page with no single graphic has none, and saying WHICH way it has none is worth more
        // than a colour reading of the site. The picker supplies the reason; this file does not
        // restate it, because a reason written in two places is a reason that drifts.
        record.routes.pixel = { state: "not-applicable", why };
      } else {
        const measuredFrom = join(dir, "graphic.png");
        // CONSENT IS ASKED ONCE, EARLY, AND A PANEL THAT ARRIVES LATER IS NEVER TOUCHED.
        //
        // Two independent publications in one family came back measured through the same French
        // consent panel, both routes `ok`, both `consent: null`. `populationpyramids.org`'s leading
        // chromatic entry is `#4CAF50` at 1.256 % — the green *Tout accepter* button — and the wash
        // MULTIPLIES every colour beneath it, so `two-records-that-agree-exactly-are-both-wrong` is
        // structurally blind to it. Its wording is in `CONSENT_WORDS` and the handler still returned
        // null, which leaves two possibilities: the panel arrived after the handler ran at
        // `SETTLE_MS`, or its button is not a control this handler recognises.
        //
        // THE MECHANISM IS INFERRED, NOT MEASURED, AND THAT IS WORTH SAYING. The panel could not be
        // reproduced: probed at 3, 6, 10, 16 and 24 seconds on a clean profile it never appeared, so
        // it is conditioned on something this machine does not have. Asking again immediately before
        // the photograph covers both possibilities and costs one evaluate when there is nothing
        // there. If a record still comes back veiled, this comment is where the next reader starts.
        record.consentBeforeGraphic = await dismissConsent(page);
        if (record.consentBeforeGraphic) await new Promise((r) => setTimeout(r, 1500));
        // A SCROLL-DRIVEN CANVAS IS BLANK UNTIL IT HAS BEEN LOOKED AT.
        //
        // Measured on ABC's mullet-count piece: its chart is a 1440 x 900 canvas 1 840 px down,
        // drawn as the reader arrives at it. The harvester scrolls the page, comes back to the top,
        // and `element.screenshot()` then scrolls the canvas into view a second time and photographs
        // it in the same instant — 97.76 % cream, zero chromatic, `monochrome`. A true picture of a
        // canvas that had not drawn yet, filed as the piece's palette. It is `SETTLE_MS` again, at
        // the graphic's own scale: bring it into view, then let it draw before taking the picture.
        await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await new Promise((r) => setTimeout(r, GRAPHIC_SETTLE_MS));
        await withFloatingChromeHidden(
          page,
          () => target.screenshot({ path: measuredFrom }),
          target,
        );
        record.pixel = readPixelPalette(measuredFrom);
        record.routes.pixel = { state: "ok", measuredFrom: "graphic.png" };

        // THE GRAPHIC'S TYPE IS OFTEN IN ANOTHER DOCUMENT.
        //
        // Every informationisbeautiful.net piece embeds its visualisation from `vizsweet.com`; the
        // host page carries the article, the byline and the promo banner, and NOT ONE LABEL of the
        // graphic. Twenty records were filed with 17-23 type tuples that were the publisher's
        // article furniture — measured, green, and about the wrong document. So when the graphic is
        // a frame its own type is harvested too, and kept beside the host's rather than instead of
        // it: the article's voice is a real reading, it is just not the graphic's.
        const frame = await target.contentFrame();
        // WHOSE TYPE IS THIS? The style route reads a DOCUMENT, and the graphic is one element in
        // it. Three honest answers, and until now the record gave none of them: a raster carries no
        // readable type at all, so `style.type` is purely the publisher's article furniture and the
        // record still looked complete — measured on four of five boxplot references, all `img`,
        // all describing zero labels on their own plates. The iframe case had a second reading to
        // compare against; the raster case has nothing, which is why it needed saying out loud.
        if (record.style)
          record.style.typeSource = frame
            ? "the graphic's own document, in style.graphicFrame"
            : record.style.graphic?.tag === "img"
              ? "the page only — the graphic is a raster and carries no type this route can read"
              : "the page, which contains the graphic — the two are not separated";
        if (frame && record.style)
          try {
            const inside = await harvestStyles(frame);
            // A frame that renders no text has not been read, whatever the call returned. An empty
            // `type` array is indistinguishable from a page with no typography, and only one of
            // those is a thing that happens.
            record.style.graphicFrame = inside.type?.length
              ? { url: frame.url(), ...inside }
              : {
                  url: frame.url(),
                  why: "the frame rendered no text — it is empty, cross-origin without content, or an unfilled slot",
                };
          } catch (err) {
            record.style.graphicFrame = { url: frame.url(), why: String(err).slice(0, 200) };
          }
        await target.dispose();
      }
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
  // Costs credits, so it is asked for and never fallen into.
  const via = argv.includes("--via-firecrawl") ? "firecrawl" : "browser";
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
      const { dir, record } = await harvestReference({ url, family, archive, browser, via });
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
