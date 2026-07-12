// scripts/lib/sample-text-contrast.mjs
// The shared render-time WCAG sampler: for every visible <text> in the current page,
// hide the glyph and sample the REAL background behind it at 3 points
// (elementsFromPoint, worst-case), returning {text, fill, bgs[]}. Extracted from
// snap-contrast.mjs (the static-build guard) so snap-interactive-contrast.mjs (the
// interactive-build guard) can reuse the IDENTICAL sampling logic against a
// different dist — one engine, two entry points that differ only in how they load
// the page (snap-contrast.mjs serves the static dist over http; snap-interactive-
// contrast.mjs opens the interactive dist's self-contained HTML directly).
//
// MUST stay a closure-free, browser-only function: Playwright's page.evaluate(fn)
// serialises this via fn.toString() and runs it inside the page — it cannot close
// over any Node-side variable, only `document` / `window` / other DOM globals.
export function sampleTextContrast() {
  const toHex = (rgb) => {
    const m = rgb && rgb.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    if (a === 0) return null; // transparent → not a background
    const h = (n) => Math.round(n).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  };
  // Known limitations: (1) reads mark fill from inline fill ATTRIBUTE only; a mark
  // filled via CSS class falls through to paper #ffffff fallback. (2) the whole <text>
  // (glyph + halo) is hidden before sampling; a label relying on halo legibility OVER
  // a coloured mark could be false-positive flagged against the mark alone.
  const bgAt = (x, y, glyph) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === glyph) continue;
      const fillAttr = el.getAttribute && el.getAttribute("fill");
      if (fillAttr && fillAttr !== "none") {
        const hx = toHex(getComputedStyle(el).fill);
        if (hx) return hx;
      }
      const bc = toHex(getComputedStyle(el).backgroundColor);
      if (bc) return bc;
    }
    return "#ffffff"; // the paper
  };
  const out = [];
  for (const t of Array.from(document.querySelectorAll("text"))) {
    const s = (t.textContent || "").trim();
    if (!s) continue;
    const cs = getComputedStyle(t);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    const fill = toHex(cs.fill);
    if (!fill) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // font size (CSS px) + bold flag — the node side applies the WCAG SC 1.4.3
    // large-text 3:1 provision (large bold ≥ 18.66px / large normal ≥ 24px). `bold`
    // is font-weight ≥ 700 (numeric) or the keyword "bold".
    const fontPx = parseFloat(cs.fontSize) || 0;
    const fw = cs.fontWeight;
    const bold = fw === "bold" || Number(fw) >= 700;
    const y = r.top + r.height / 2;
    const prev = t.style.visibility;
    t.style.visibility = "hidden"; // remove glyph + its halo before sampling
    const bgs = [0.2, 0.5, 0.8].map((f) => bgAt(r.left + r.width * f, y, t));
    t.style.visibility = prev;
    out.push({ text: s, fill, bgs, fontPx, bold });
  }
  return out;
}
