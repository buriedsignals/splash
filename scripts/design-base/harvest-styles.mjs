// twin/scripts/design-base/harvest-styles.mjs
//
// THE STYLE ROUTE: a published page's own typographic and chromatic signature, read from the
// styles the browser actually computed — never from a screenshot, and never from an impression.
//
// This is the half of the harvest that reaches TYPE, and type is where the gap this whole design
// base exists to close actually lives. Measured on 2026-09-07 across 122 components, Splash uses
// one family, four weights, and ZERO italic, ZERO letter-spacing, ZERO case transforms. The six
// published pieces harvested the same day use two to four families, weights down to 100, and
// treat italic, tracking and case as a register of their own — ABC alone carries 77 letter-spaced
// runs and 57 case-transformed ones. A key that collapsed those into one tuple would report the
// two as identical, which is why the key below carries all six axes.
//
// The other half is `pixel-palette.mjs`, which reaches everything this cannot: posters, canvas
// graphics, video frames. Neither is a fallback for the other; a reference measured by one only is
// under-measured (spec §6).
//
// This module takes an OPEN page rather than a url, so the browser lifecycle belongs to the caller
// (`harvest.mjs` in the chain, a test fixture under test) and this file stays measurable without a
// network.

/** A text run shorter than this is punctuation or a stray character, not a typographic decision. */
const MIN_RUN_CHARS = 2;
/** A paragraph shorter than this is a caption or a label, and its width is not the column's. */
const MIN_COLUMN_CHARS = 120;
/** Below this on either axis an element paints nothing a reader can read. */
const MIN_PAINTED_PX = 2;
/** At or below this opacity an element is on its way out, not on the page. */
const MIN_PAINTED_OPACITY = 0.05;
/** How many distinct type tuples and mark colours are kept. Beyond this is the long tail of a
 *  page's own chrome — navigation, cookie banners, share widgets — not the graphic's signature. */
const KEEP_TYPE = 40;
const KEEP_MARKS = 24;
/** Rough mean advance as a fraction of the font size, for turning a column's pixels into
 *  characters. The number that matters is the comparison between references, not its absolute
 *  accuracy, so one constant beats measuring a specimen per page. */
const MEAN_ADVANCE_RATIO = 0.5;

/**
 * WHAT COUNTS AS THE PIECE'S GRAPHIC — ONE implementation, called by both routes.
 *
 * The two routes each used to look for the graphic on their own, and on 2026-09-08 they disagreed
 * on the very first re-harvest: the pixel route photographed the chart while the style route filed
 * `svg 280x80` — `logo-100.svg`, Ferdio's wordmark. A record whose two halves name different
 * objects is worse than a record that names none, because both halves read as measured. So there is
 * now one picker, it lives here, and `harvest.mjs` calls it and writes what it found into the
 * record; `harvestStyles` no longer looks for a graphic at all.
 *
 * AN IFRAME IS A GRAPHIC. Every informationisbeautiful.net piece embeds its visualisation from
 * `vizsweet.com` in a 1380 x 806 frame; the host page holds the article and nothing else. Without
 * `iframe` here the twenty IIB references report no graphic — and the type they carried was the
 * publisher's article furniture, not the graphic's.
 */
export const GRAPHIC_SELECTOR = "svg, canvas, img, iframe";
export const MIN_GRAPHIC_PX = { w: 200, h: 120 };

/**
 * A landmark is chrome by definition: whatever is inside a header, a nav, a footer or an aside is
 * the site talking about itself.
 */
export const CHROME_LANDMARKS =
  "header, nav, footer, aside, [role='banner'], [role='navigation']";

/**
 * A STRIP IS CHROME ONLY WHILE IT IS A STRIP, and this cost the whole IIB archive one wave.
 *
 * Cookie bars and promo banners have no landmark to sit in, so they are matched by the words in
 * their class names. Matched unconditionally, that rule ate the archive: IIB's page ROOT is
 * `div#iib-page.iib-base.has-banner--top.has-banner--bottom`, so `[class*='banner']` matched the
 * container of the entire document and every graphic on the site was "inside a banner". A page
 * where nothing can be the graphic looks exactly like a page that has none.
 *
 * So a class match only counts when the matched element is actually a strip — smaller than half the
 * document. A cookie bar is; a page wrapper is not.
 */
export const CHROME_STRIPS =
  "[id*='cookie' i], [class*='cookie' i], [class*='consent' i], [class*='promo' i], " +
  "[class*='banner' i]";
export const MAX_STRIP_SHARE = 0.5;

/**
 * THE LARGEST GRAPHIC ON A PAGE NEED NOT BE THE GRAPHIC THE URL NAMES.
 *
 * Two of five re-verification agents found this independently, on different families. An
 * informationisbeautiful.net page carries the piece it is about AND the next piece down: on
 * *Major LLMs ranked by performance* the named chart is a 1380 x 806 frame and a treemap five
 * screens below it is 1280 x 903 — **43 560 pixels larger**. The record then says `ok`,
 * `measuredFrom: graphic.png`, and reports a real, correct palette of the wrong drawing. No
 * arithmetic catches that: it is a true measurement of a different piece.
 *
 * A published piece leads with its own graphic — but position alone is the wrong rule, and it cost
 * one reference before this sentence was written. Preferring anything in the first screens made the
 * ABC mullet record measure a 900 x 230 banner at y=128 instead of the 1440 x 900 canvas at y=1840
 * that is the actual chart: one error traded for another, six times smaller.
 *
 * So SIZE still leads and position breaks the tie between graphics of COMPARABLE size. An earlier
 * candidate wins only when it is within `COMPARABLE_AREA_SHARE` of the largest. On the IIB page the
 * named frame is 96 % of the treemap below it — comparable, and it wins. On the ABC page the banner
 * is 16 % of the chart — not a rival, and the chart wins wherever it sits.
 *
 * Where the piece really is buried, `describeGraphic` records how far down it sat, so a reader can
 * see that the page led with nothing.
 */
export const NEAR_THE_TOP_SCREENS = 2;
export const COMPARABLE_AREA_SHARE = 0.75;

/**
 * A GRID OF THUMBNAILS IS NOT A GRAPHIC, AND THE TIE-BREAK ABOVE WILL HAPPILY RETURN THE FIRST ONE.
 *
 * Preferring the earliest among comparable rivals is right when there are two of them. On NPR's
 * *Book Concierge* there are two hundred: the page is a wall of book covers, and the rule dutifully
 * returned the first one instead of the previous rule's arbitrary one further down. A different
 * arbitrary answer is not a better answer.
 *
 * A COUNT ALONE IS NOT ENOUGH, AND SETTING ONE ON THREE PAGES PROVED IT. A first version refused any
 * page with four comparable candidates. It took the corpus from two refusals to six, and four of the
 * six were real graphics: ABC's article of seven slope panels, ProPublica's map drawn as six
 * stacked full-viewport SVGs, La Nación's map, and ESPN. Measured across the pages that disagree —
 * candidates within `COMPARABLE_AREA_SHARE` of the largest, and how wide the largest is:
 *
 *   NPR book covers      91 candidates   240 px wide    a wall of covers
 *   La Nación map        24              1567 px        one map, plus a gallery
 *   ESPN card grid       12              420 px         a wall of portraits
 *   ABC slope panels      7              390 px         an article of charts
 *   ProPublica map        6              1440 px        one map in stacked layers
 *   IIB two pieces        2              1280 px        two real pieces
 *
 * So a grid is MANY candidates AND small ones. Ten separates NPR and ESPN — both walls of
 * photographs — from ABC's seven panels; the width condition keeps the two maps, whose "rivals" are
 * layers of one full-width drawing rather than tiles of anything. ESPN falling on this side is the
 * intended outcome and was found independently: its picked graphic was a 441 x 248 portrait of a
 * basketball player, read as a palette of skin and jersey.
 *
 * Neither number is a natural constant. They are where this corpus's own distribution separates,
 * and a page that sits between them will need looking at rather than deciding.
 */
/** Ten times the viewport on BOTH axes: a scaffold, not a graphic. Plotly's docs served one at
 *  9000 x 9000 against a 1440 x 900 window. */
export const OVERSIZE_FACTOR = 6;
export const GRID_CANDIDATES = 10;
export const GRID_MAX_TILE_SHARE = 0.5;

/**
 * Browser-side. Returns the page's largest painted graphic, or null.
 *
 * Serialised into the page by puppeteer, so it closes over nothing and takes everything it needs as
 * one argument.
 */
export function pickGraphic({
  selector,
  floor,
  landmarks,
  strips,
  maxStripShare,
  nearTheTopScreens,
  comparableAreaShare,
  gridCandidates,
  gridMaxTileShare,
  oversizeFactor,
}) {
  const doc = document.documentElement;
  const documentArea = Math.max(1, doc.scrollWidth * doc.scrollHeight);

  const isChrome = (el) => {
    if (el.closest(landmarks)) return true;
    const strip = el.closest(strips);
    if (!strip) return false;
    return strip.scrollWidth * strip.scrollHeight < documentArea * maxStripShare;
  };

  const candidates = [];
  for (const el of document.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width < floor.w || r.height < floor.h) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) <= 0.05) continue;
    if (isChrome(el)) continue;
    // A FIXED SHEET OVER THE WHOLE VIEWPORT IS A VEIL, NOT A GRAPHIC — and it wins, because it is
    // the largest thing on the page by construction.
    //
    // MEASURED on Eurostat's energy-balance app. Two SVGs: the diagram at 1440 x 803, and a
    // `position: fixed` sheet at 1440 x 900 filled `rgba(255,255,255,0.08)` — the guided tour's
    // veil. The veil is bigger, so the picker chose IT; and because a graphic is never hidden from
    // its own photograph, the floating-chrome pass then exempted the very thing it exists to
    // remove. The record read `#999999` at 68.42 %: a dimmed screenshot of a website, both routes
    // green, `measuredFrom: graphic.png`.
    //
    // The first repair written for this looked for an element CONTAINING the site's landmarks. It
    // was checked against the live page and the picked SVG contains none — a plausible rule aimed
    // at a case that does not exist. This is the measured one.
    if (s.position === "fixed" && r.width >= window.innerWidth * 0.95 && r.height >= window.innerHeight * 0.95)
      continue;
    // A GRAPHIC OUTSIDE THE DOCUMENT, OR AN ORDER OF MAGNITUDE PAST THE VIEWPORT, IS NOT A PICTURE
    // ANYONE IS LOOKING AT. Measured on Plotly's documentation: `svg 9000 x 9000` at
    // `documentTop -10000`, a full-page scaffold that won the largest-painted rule because that
    // rule has no ceiling. Both halves are needed — the negative offset says it is not in the flow,
    // the size says it was never meant to be read at this scale.
    if (r.top + window.scrollY < 0) continue;
    if (r.width > window.innerWidth * oversizeFactor && r.height > window.innerHeight * oversizeFactor)
      continue;
    // AN EMPTY FRAME IS AN AD SLOT, NOT A GRAPHIC. Measured on Reuters' swing-states piece, where
    // the picker returned a 300 x 250 `about:blank` iframe at the top of the page — the standard IAB
    // medium rectangle, unfilled. It cleared the size floor and sat in no landmark, so nothing else
    // refused it, and the record then carried a frame reading with zero type tuples that read as a
    // completed measurement of the piece.
    if (el.tagName === "IFRAME") {
      const src = el.getAttribute("src");
      // `srcdoc` is content too — an embed written inline rather than fetched.
      const hasContent = (src && src !== "about:blank") || el.hasAttribute("srcdoc");
      if (!hasContent) continue;
    }
    candidates.push({ el, area: r.width * r.height, width: r.width, top: r.top + window.scrollY });
  }
  // A REASON RATHER THAN A BARE NULL. Two pages with no graphic have nothing else in common, and a
  // record that cannot say which case it met sends the next reader to look for themselves.
  if (!candidates.length)
    return (
      "no graphic outside the site's own chrome — a palette read from the page would be the " +
      "site's navigation and banners, not this piece's design"
    );

  // Largest leads. Among graphics of comparable size, the one the page leads with wins.
  const largest = candidates.reduce((best, c) => (c.area > best.area ? c : best));
  const comparable = candidates.filter((c) => c.area >= largest.area * comparableAreaShare);
  if (
    comparable.length >= gridCandidates &&
    largest.width < window.innerWidth * gridMaxTileShare
  )
    return (
      `the page shows a grid of ${comparable.length} images ${Math.round(largest.width)} px wide — ` +
      "a wall of covers, cards or thumbnails rather than one graphic, and any single one of them " +
      "would be an arbitrary answer"
    );

  const band = window.innerHeight * nearTheTopScreens;
  const rivals = comparable.filter((c) => c.top < band);
  if (!rivals.length) return largest.el;
  return rivals.reduce((best, c) => (c.top < best.top ? c : best)).el;
}

/** The picker's arguments, in one place, so a caller cannot pass a different floor. */
export const GRAPHIC_PICKER_ARGS = Object.freeze({
  selector: GRAPHIC_SELECTOR,
  floor: MIN_GRAPHIC_PX,
  landmarks: CHROME_LANDMARKS,
  strips: CHROME_STRIPS,
  maxStripShare: MAX_STRIP_SHARE,
  nearTheTopScreens: NEAR_THE_TOP_SCREENS,
  comparableAreaShare: COMPARABLE_AREA_SHARE,
  gridCandidates: GRID_CANDIDATES,
  gridMaxTileShare: GRID_MAX_TILE_SHARE,
  oversizeFactor: OVERSIZE_FACTOR,
});

/**
 * A handle on the page's graphic, or null. Returned as a HANDLE rather than a box so the caller can
 * photograph it: a box would have to be turned back into pixels, and that is the arithmetic that
 * put a crop below the fold on the first real harvest.
 *
 * @param {import("puppeteer-core").Page} page
 */
export async function findGraphic(page) {
  const handle = await page.evaluateHandle(pickGraphic, GRAPHIC_PICKER_ARGS);
  const element = handle.asElement();
  if (element) return { element, why: null };
  const why = await handle.jsonValue();
  await handle.dispose();
  return { element: null, why };
}

/** What the record says it measured: the graphic's tag and box, never the handle. */
export async function describeGraphic(handle) {
  const box = await handle.boundingBox();
  const where = await handle.evaluate((el, screens) => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    return {
      tag: el.tagName.toLowerCase(),
      documentTop: Math.round(top),
      // False means the top-of-page preference could not apply: nothing qualified, and this is the
      // largest graphic anywhere on the page. A reader deciding whether the record measured the
      // piece the url names needs to know that.
      nearTheTop: top < window.innerHeight * screens,
    };
  }, NEAR_THE_TOP_SCREENS);
  return {
    ...where,
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.width),
    h: Math.round(box.height),
    ratio: Math.round((box.width / box.height) * 100) / 100,
  };
}

/**
 * @param {import("puppeteer-core").Page | import("puppeteer-core").Frame} page  an open document
 * @returns {Promise<{title, ground, type, marks, column}>}
 */
export async function harvestStyles(page) {
  return page.evaluate(
    ({ MIN_RUN_CHARS, MIN_COLUMN_CHARS, MIN_PAINTED_PX, MIN_PAINTED_OPACITY, KEEP_TYPE, KEEP_MARKS, MEAN_ADVANCE_RATIO }) => {
      const painted = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width < MIN_PAINTED_PX || r.height < MIN_PAINTED_PX) return false;
        const s = getComputedStyle(el);
        return (
          s.visibility !== "hidden" &&
          s.display !== "none" &&
          Number(s.opacity) > MIN_PAINTED_OPACITY
        );
      };

      // ── TYPE ──────────────────────────────────────────────────────────────
      // One entry per element that paints its OWN text nodes. Without that restriction a wrapper
      // inherits its child's run and every page reports its body font as its heading font.
      const runs = new Map();
      for (const el of document.querySelectorAll("body *")) {
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join(" ")
          .trim();
        if (own.length < MIN_RUN_CHARS) continue;
        if (!painted(el)) continue;
        const s = getComputedStyle(el);
        const tuple = {
          family: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
          size: Math.round(parseFloat(s.fontSize) * 10) / 10,
          weight: s.fontWeight,
          style: s.fontStyle,
          // `normal` is zero tracking said in words; recording it as the word would make two
          // identical runs look different.
          tracking:
            s.letterSpacing === "normal"
              ? 0
              : Math.round(parseFloat(s.letterSpacing) * 100) / 100,
          transform: s.textTransform,
        };
        const key = [tuple.family, tuple.size, tuple.weight, tuple.style, tuple.tracking, tuple.transform].join(" | ");
        const seen = runs.get(key) ?? { ...tuple, key, count: 0, sample: "", colors: new Set() };
        seen.count += 1;
        if (!seen.sample) seen.sample = own.slice(0, 60);
        seen.colors.add(s.color);
        runs.set(key, seen);
      }
      const type = [...runs.values()]
        .map((r) => ({ ...r, colors: [...r.colors].slice(0, 4) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, KEEP_TYPE);

      // ── MARKS ─────────────────────────────────────────────────────────────
      const ground = getComputedStyle(document.body).backgroundColor;
      const markColours = new Map();
      for (const el of document.querySelectorAll(
        "svg path, svg rect, svg circle, svg line, svg polygon, svg ellipse",
      )) {
        if (!painted(el)) continue;
        const s = getComputedStyle(el);
        for (const [prop, value] of [
          ["fill", s.fill],
          ["stroke", s.stroke],
        ]) {
          if (!value || value === "none" || value === "rgba(0, 0, 0, 0)") continue;
          const key = `${prop} ${value}`;
          markColours.set(key, (markColours.get(key) ?? 0) + 1);
        }
      }
      const marks = [...markColours.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, KEEP_MARKS)
        .map(([colour, count]) => ({ colour, count }));

      // ── SPACE ─────────────────────────────────────────────────────────────
      let column = null;
      for (const p of document.querySelectorAll("p")) {
        if (!painted(p) || p.textContent.trim().length < MIN_COLUMN_CHARS) continue;
        const r = p.getBoundingClientRect();
        const size = parseFloat(getComputedStyle(p).fontSize);
        if (!column || r.width > column.px)
          column = {
            px: Math.round(r.width),
            ch: Math.round(r.width / (size * MEAN_ADVANCE_RATIO)),
          };
      }

      // THE GRAPHIC IS NOT LOOKED FOR HERE. `pickGraphic` above is the one implementation, and
      // `harvest.mjs` writes what it found onto this record — so the two routes cannot name
      // different objects, which is exactly what they did on 2026-09-08.
      return { title: document.title.slice(0, 120), ground, type, marks, column };
    },
    {
      MIN_RUN_CHARS,
      MIN_COLUMN_CHARS,
      MIN_PAINTED_PX,
      MIN_PAINTED_OPACITY,
      KEEP_TYPE,
      KEEP_MARKS,
      MEAN_ADVANCE_RATIO,
    },
  );
}
