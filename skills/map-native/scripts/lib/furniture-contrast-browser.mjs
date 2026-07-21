// Browser-side closures for the map-native render-time furniture-contrast snap
// (../snap-contrast.mjs). Each export here runs INSIDE the page via Playwright's
// `page.evaluate(fn, ...)` — Playwright serialises the function via `fn.toString()` and
// reconstructs it in the page context, so (mirrors chart-native's ./sample-text-contrast.mjs
// header note) every function below MUST stay closure-free: no reference to anything
// outside its own body (no imports, no outer Node variables) — only `document` / `window`
// / other DOM/page globals. All parsing and geometry math that CAN live outside the page
// lives in ./furniture-contrast.mjs instead (plain, unit-tested Node functions) — these
// stay deliberately thin: find elements, read raw computed-style strings, decode pixels.

/** Find every FURNITURE TEXT LEAF — an element (HTML or SVG) with a direct, non-whitespace
 * text child — under the 4 furniture roots MapFrame/legend/filter-bar render
 * (`data-testid="map-title|map-source|map-legend|map-filterbar"`), and HIDE each leaf's
 * glyph (colour/fill → transparent) so a subsequent screenshot captures the composited
 * background BEHIND the text, not the glyph ink itself. Deliberately does NOT use
 * `visibility:hidden` (chart-native's SVG-only technique) — an HTML leaf can carry its OWN
 * background (e.g. an active `filter-chip` button, `background: colors.ink` when pressed);
 * hiding the whole element would erase that background from the sample along with the
 * glyph. Setting only `color`/`fill` transparent (+ `textShadow: none`, dead in responsive/
 * web mode but harmless) removes just the ink.
 *
 * Returns raw, UNPARSED data — `rawColor` is the live `getComputedStyle(...).color`/`.fill`
 * string, parsed into a hex colour by ../furniture-contrast.mjs#parseCssColorToHex in Node,
 * not here (keeps this function a thin DOM read, keeps the parsing pure/testable). */
export function collectFurnitureLeaves() {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const roots = Array.from(
    document.querySelectorAll(
      '[data-testid="map-title"], [data-testid="map-source"], [data-testid="map-legend"], [data-testid="map-filterbar"]',
    ),
  );
  const leaves = [];
  const seen = new Set();

  function hasDirectText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent && node.textContent.trim()) return true;
    }
    return false;
  }

  function visit(el) {
    if (seen.has(el)) return;
    const cs = getComputedStyle(el);
    // A hidden/collapsed subtree renders nothing — nothing to sample, and recursing would
    // read layout rects that don't reflect what's on screen.
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;

    if (hasDirectText(el)) {
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) {
        const isSvgText = el.namespaceURI === SVG_NS;
        leaves.push({
          text: (el.textContent || "").trim().slice(0, 80),
          rawColor: isSvgText ? cs.fill : cs.color,
          isSvgText,
          fontPx: parseFloat(cs.fontSize) || 0,
          fontWeight: cs.fontWeight,
          rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        });
        // Hide the glyph only — the element's own background (if any) is untouched.
        if (isSvgText) {
          el.style.fill = "transparent";
        } else {
          el.style.color = "transparent";
          el.style.textShadow = "none";
        }
      }
    }
    for (const child of Array.from(el.children)) visit(child);
  }

  roots.forEach(visit);
  return leaves;
}

/** Decode a `data:image/png;base64,...` screenshot (taken AFTER collectFurnitureLeaves has
 * hidden every glyph) into an offscreen canvas stashed on `window.__fcCanvas__` for
 * `readPixelsAtPoints` to read from, and report the image's natural size + the page's CSS
 * viewport size — the caller (Node) divides these to get the image-px-per-CSS-px scale
 * factor before computing sample points (mirrors snap-theme.mjs's scaleX/scaleY). */
export async function decodeScreenshot(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  window.__fcCanvas__ = canvas;
  return {
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };
}

/** Read the composited pixel at each IMAGE-space point off the canvas `decodeScreenshot`
 * stashed. Returns raw `[r, g, b, a]` per point — hex conversion happens in Node
 * (../furniture-contrast.mjs#rgbToHex), same thin-read/pure-math split as above. */
export function readPixelsAtPoints(points) {
  const canvas = window.__fcCanvas__;
  const ctx = canvas.getContext("2d");
  return points.map(({ x, y }) => {
    const cx = Math.min(canvas.width - 1, Math.max(0, Math.round(x)));
    const cy = Math.min(canvas.height - 1, Math.max(0, Math.round(y)));
    return Array.from(ctx.getImageData(cx, cy, 1, 1).data);
  });
}
