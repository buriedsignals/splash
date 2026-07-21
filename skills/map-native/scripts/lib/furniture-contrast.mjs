// Pure helpers for the map-native render-time furniture-contrast snap
// (../snap-contrast.mjs). Kept DOM-free — no `document`/`window` reference anywhere in
// this file — so every function here is a plain, independently unit-testable Node
// function (see ../../tests/furniture-contrast.test.ts). This is the deliberate
// counterpart to ./furniture-contrast-browser.mjs, whose functions run INSIDE the page
// via Playwright's `page.evaluate(fn)` and therefore MUST stay closure-free/self-
// contained (fn.toString() serialisation loses any outer reference, including an
// import of this module) — so the split is: thin DOM reads in the browser file, all
// parsing/geometry math here.

/** r,g,b (0-255, may be fractional from anti-aliased/subpixel rendering) → "#rrggbb". */
export function rgbToHex(r, g, b) {
  const h = (n) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Parse a CSS computed-style colour string ("rgb(r, g, b)" / "rgba(r, g, b, a)") into a
 * "#rrggbb" hex string, or null when unparseable or fully transparent (alpha === 0) — a
 * fully transparent glyph fill is not a real colour to contrast-check against. */
export function parseCssColorToHex(cssColor) {
  const m = cssColor && cssColor.match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b, a] = m.map(Number);
  if (a === 0) return null;
  return rgbToHex(r, g, b);
}

/** CSS `font-weight` computed-style value ("400" | "700" | "bold" | …) → true when it
 * renders visually bold (WCAG SC 1.4.3's large-text bold threshold is font-weight >= 700). */
export function isBoldFontWeight(fontWeight) {
  return fontWeight === "bold" || Number(fontWeight) >= 700;
}

/** For a furniture text leaf's CSS-px bounding rect (viewport coordinates, as read by
 * `getBoundingClientRect()`) and the screenshot image's scale factors (image px per CSS
 * px — `naturalWidth/innerWidth`, `naturalHeight/innerHeight`), return the worst-case
 * sample points: left/mid/right of the text at its vertical centre, in IMAGE-space pixel
 * coordinates — mirrors chart-native's sample-text-contrast.mjs 0.2/0.5/0.8 fractions.
 * Pure geometry, no DOM: the caller decodes the screenshot in-page (browser file) to get
 * the scale factors, then calls this in Node before handing the concrete points back to
 * the page for pixel reads. */
export function computeSamplePoints(rect, scaleX, scaleY, fractions = [0.2, 0.5, 0.8]) {
  const y = (rect.top + rect.height / 2) * scaleY;
  return fractions.map((f) => ({ x: (rect.left + rect.width * f) * scaleX, y }));
}
