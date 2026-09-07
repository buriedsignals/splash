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
 * @param {import("puppeteer-core").Page} page  an open page, already navigated and settled
 * @returns {Promise<{title, ground, type, marks, column, graphic}>}
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

      let graphic = null;
      for (const el of document.querySelectorAll("svg, canvas, figure img")) {
        if (!painted(el)) continue;
        const r = el.getBoundingClientRect();
        const box = {
          tag: el.tagName.toLowerCase(),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
        if (!graphic || box.w * box.h > graphic.w * graphic.h) graphic = box;
      }
      if (graphic) graphic.ratio = Math.round((graphic.w / graphic.h) * 100) / 100;

      return { title: document.title.slice(0, 120), ground, type, marks, column, graphic };
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
