// scripts/lib/collect-text-boxes.mjs
// The shared render-time label-fit MEASURER: for every rendered text — svg
// <text> (its box is the union of its tspans, so tspans are covered) AND HTML
// text the frame emits (ChartFrame title / subtitle / source line) — return its
// viewport box plus the boxes of every ancestor that CLIPS it (svg roots — svg
// overflow is hidden by default, so the svg rect IS the clip box — any
// overflow:hidden/clip element, and ancestor <clipPath> references resolved to
// their rect's screen box). The chart card's own box rides along as the
// outermost bound (the static.png screenshot crops exactly to it, see
// snap-proof.mjs). The DECISION (intersect the chain, measure overflow, apply
// the tolerance) stays in node via src/core/label-fit.ts — same split as
// sample-text-contrast.mjs vs core/contrast-scan.ts.
//
// Deliberately measured but SKIPPED:
//   - invisible text (display:none / visibility:hidden / opacity:0 anywhere in
//     the ancestor chain) — never ships;
//   - the visually-hidden a11y description (the `clip: rect(0 0 0 0)` pattern,
//     see ChartFrame's VISUALLY_HIDDEN) — clipped ON PURPOSE for screen
//     readers, the one legitimate "clipped text".
//
// MUST stay a closure-free, browser-only function: Playwright's
// page.evaluate(fn, arg) serialises this via fn.toString() and runs it inside
// the page — it cannot close over any Node-side variable, only DOM globals.
export function collectTextBoxes(canvasSelector) {
  const toBox = (r) => ({
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
  });
  const canvas = document.querySelector(canvasSelector);
  if (!canvas) return { canvas: null, items: [] };

  // the deprecated `clip` property only survives in the visually-hidden a11y
  // pattern — anything else uses overflow/clip-path. A non-auto clip marks
  // intentional screen-reader-only text.
  const isVisuallyHidden = (cs) => cs.clip && cs.clip !== "auto";

  const chainHidden = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        Number(cs.opacity || 1) === 0 ||
        isVisuallyHidden(cs)
      ) {
        return true;
      }
    }
    return false;
  };

  // A `clip-path: url(#id)` (attribute or CSS) referencing a <clipPath> element
  // → the referenced clip shape's screen-space box. SHAPE-SUPPORT BOUNDARY
  // (documented): only the default userSpaceOnUse units with RECT-only children
  // are resolved — every in-tree clip is a single reveal-wipe/fan rect drawn in
  // the referencing group's user space. objectBoundingBox, non-rect shapes
  // (path/circle/…) and rect-less clipPaths fail OPEN (not treated as a clip
  // bound): under-approximating a shape union with its rects could flag text the
  // real region contains. Multi-rect unions use the AABB of the union — an
  // over-approximation, again the fail-open direction. The rect corners are
  // mapped through the REFERENCING element's screen CTM (userSpaceOnUse
  // coordinates live in that element's user space, and none of the in-tree
  // referencing groups carries its own transform).
  const clipPathRefBox = (p) => {
    const cp = getComputedStyle(p).clipPath;
    if (!cp || cp === "none") return null;
    const m = /url\(["']?#([^"')]+)["']?\)/.exec(cp);
    if (!m) return null;
    const cpEl = document.getElementById(m[1]);
    if (!cpEl || cpEl.tagName.toLowerCase() !== "clippath") return null;
    const units = cpEl.getAttribute("clipPathUnits") ?? "userSpaceOnUse";
    if (units !== "userSpaceOnUse") return null;
    const kids = Array.from(cpEl.children);
    if (
      kids.length === 0 ||
      kids.some((k) => k.tagName.toLowerCase() !== "rect")
    ) {
      return null;
    }
    if (typeof p.getScreenCTM !== "function") return null; // HTML ancestor
    const ctm = p.getScreenCTM();
    if (!ctm) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const k of kids) {
      const x = Number(k.getAttribute("x") ?? 0);
      const y = Number(k.getAttribute("y") ?? 0);
      const w = Number(k.getAttribute("width") ?? 0);
      const h = Number(k.getAttribute("height") ?? 0);
      for (const [cx, cy] of [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ]) {
        const sx = ctm.a * cx + ctm.c * cy + ctm.e;
        const sy = ctm.b * cx + ctm.d * cy + ctm.f;
        if (sx < left) left = sx;
        if (sx > right) right = sx;
        if (sy < top) top = sy;
        if (sy > bottom) bottom = sy;
      }
    }
    return { left, top, right, bottom };
  };

  // every ancestor box that visually clips `el`: svg viewports (overflow hidden
  // by default) + explicit overflow:hidden/clip containers + ancestor
  // <clipPath> references (the FanChart reveal-wipe class: text cut mid-word by
  // a clip rect ending INSIDE the svg passed at 0.00px when only svg roots and
  // CSS overflow counted). scroll/auto are NOT treated as clips (nothing in
  // ChartFrame scrolls; a scrollable region would be reachable, not truncated).
  // The walk starts at `el` ITSELF for clip-path (an element's own clip-path
  // clips its own ink) but at the parent for overflow/svg viewports (CSS
  // overflow clips children, not the element itself).
  const clipBoxes = (el) => {
    const boxes = [];
    for (let p = el; p; p = p.parentElement) {
      if (p !== el) {
        const isSvgRoot = p instanceof SVGSVGElement;
        const ov = getComputedStyle(p).overflow;
        if (isSvgRoot || /(hidden|clip)/.test(ov)) {
          boxes.push(toBox(p.getBoundingClientRect()));
        }
      }
      const ref = clipPathRefBox(p);
      if (ref) boxes.push(ref);
    }
    return boxes;
  };

  const items = [];

  // 1) svg text — the chart body (axis ticks, value labels, direct labels,
  //    band/end labels, rotated category labels…).
  for (const t of Array.from(document.querySelectorAll("text"))) {
    const s = (t.textContent || "").trim();
    if (!s) continue;
    if (chainHidden(t)) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    items.push({
      kind: "svg",
      text: s.slice(0, 80),
      box: toBox(r),
      clips: clipBoxes(t),
    });
  }

  // 2) HTML text — the frame furniture (title, subtitle, source line, legend
  //    text…). Walk TEXT NODES and measure the actual glyph run via a Range: a
  //    block div spans the full card width regardless of its text, so the
  //    element box would hide a text overflowing its box.
  const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = (n.textContent || "").trim();
    if (!s) continue;
    const parent = n.parentElement;
    if (!parent || parent.closest("svg")) continue; // svg text handled above
    if (chainHidden(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    items.push({
      kind: "html",
      text: s.slice(0, 80),
      box: toBox(r),
      clips: clipBoxes(parent),
    });
  }

  return { canvas: toBox(canvas.getBoundingClientRect()), items };
}
