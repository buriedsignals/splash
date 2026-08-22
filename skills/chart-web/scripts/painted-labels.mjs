// WHAT THIS FORMAT ACTUALLY PAINTS, IN THE COORDINATES A READER SEES IT IN.
//
// Two of this skill's declared decisions read an SVG STRING: `labelStacksFrom`/`mislabelledRows`
// (`labels-name-their-own-row`) look for `<text>` and `<line>` elements, and `rtlRunsAreIsolated`
// (`rtl-runs-carry-their-direction`) walks a beat directory for `.svg` FILES. Both are byte-identical
// copies shared with six sister skills, and both were written against a format that rasterises a
// standalone `.svg`.
//
// THIS FORMAT WRITES NEITHER. Its delivered artefact is one HTML page: the geometry is an INLINE
// `<svg>`, and every word on it — title, caveat, source, axis ticks, end labels, notes — is an HTML
// element positioned over that geometry (`references/web-discipline.md`, "Type is HTML"). So on
// every chart-web beat ever produced, `labelStacksFrom` read zero labels and `rtlRunsAreIsolated`
// reported `{"applies":false,"reason":"this beat drew no .svg"}` — a sentence that is not true of a
// page that is mostly SVG. Measured on the real 7 585-row story beat
// `stories/real-ember-renewables-share/beats/1-where-your-country-sits`: 15 painted labels, 7 drawn
// lines, one inline `<svg>` — and both decisions saw none of it.
//
// A DECISION IS NOT WEAKENED TO FIT A FORMAT; THE FORMAT HANDS IT WHAT IT DRAWS. Nothing here
// changes what either decision decides — the copies stay byte-identical with their six siblings,
// which is the whole point of `splash/test/guard-copies-parity.test.ts`. What changes is the input:
// the page is measured in the browser that lays it out, and what it paints is written back in the
// one notation those decisions read. Screen space is the honest frame for that: a still's `<text
// x= y=>` is already in the units the rasteriser paints in, and a browser's own
// `getBoundingClientRect` is the same claim about the same page.

/** Every inline `<svg>…</svg>` block in a delivered page, in source order.
 *
 *  Non-greedy and un-nested on purpose: this format's own `render-web.mjs` writes exactly one
 *  top-level `<svg class="chart">` per page and never nests one inside another, and a scan that
 *  cannot be wrong about a tag that is not there is worth more here than a parser. What it is FOR
 *  is handing `rtlRunsAreIsolated` the SVG this beat drew, written to a file with the extension that
 *  decision walks for, so its answer is about this page rather than about the absence of a file type
 *  this format never writes. */
export function inlineSvgOf(html) {
  return [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)].map((match) => match[0]);
}

/** The labels and the joining marks a laid-out page paints, in client coordinates.
 *
 *  A LABEL is an element with its own text node — not an ancestor that merely contains one, which
 *  would report the whole figure as a label sitting at the figure's own centre. The accessible
 *  table is excluded: `same-facts-without-the-picture` requires a full second copy of every reading
 *  in `<td>` cells, and reading those as drawn labels would invent one stack per column out of a
 *  table nobody looks at. `x` is the anchor the label is SET from — its right edge when the text is
 *  right-aligned, its left when left-aligned, its centre when centred — because that is what a
 *  still's `<text x=>` means, and a de-collided column is a column of anchors.
 *
 *  A JOINING MARK is an SVG `<line>`, transformed through its own `getScreenCTM` so a plot drawn in
 *  a viewBox lands where the reader sees it. `<path>` and `<polyline>` are deliberately left out:
 *  `labelStacksFrom`'s own doc names them as what it cannot see, and inventing endpoints for them
 *  here would make this translation decide something the shared decision does not.
 *
 *  The page is the caller's, already navigated and already at the viewport being measured. */
export async function readPaintedGeometry(page) {
  return page.evaluate(() => {
    const figure = document.querySelector(".chart-figure") ?? document.body;
    const labels = [];
    for (const el of figure.querySelectorAll("*")) {
      if (el.closest("table")) continue;
      const own = [...el.childNodes].some(
        (node) => node.nodeType === 3 && node.textContent.trim() !== "",
      );
      if (!own) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const align = style.textAlign;
      const x =
        align === "right" || align === "end"
          ? box.right
          : align === "center"
            ? box.left + box.width / 2
            : box.left;
      labels.push({
        text: el.textContent.trim(),
        x,
        y: box.top + box.height / 2,
        fontSize: Number.parseFloat(style.fontSize),
      });
    }
    const lines = [];
    for (const el of figure.querySelectorAll("line")) {
      const ctm = typeof el.getScreenCTM === "function" ? el.getScreenCTM() : null;
      if (!ctm) continue;
      const at = (x, y) => ({
        x: ctm.a * x + ctm.c * y + ctm.e,
        y: ctm.b * x + ctm.d * y + ctm.f,
      });
      const from = at(Number(el.getAttribute("x1")), Number(el.getAttribute("y1")));
      const to = at(Number(el.getAttribute("x2")), Number(el.getAttribute("y2")));
      if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) continue;
      lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
    return { labels, lines };
  });
}

/** The same painted geometry, written as the SVG string `labelStacksFrom` reads.
 *
 *  Pure, and separated from the browser on purpose: the translation is the part that can be wrong,
 *  and a translation only testable through Puppeteer is a translation nobody writes a failing test
 *  for first. Coordinates keep two decimals — `ROW_TOLERANCE` is 1px and `ANCHOR_TOLERANCE` 0.5px,
 *  so rounding to whole pixels would decide rows that the page itself leaves undecided.
 *
 *  Text is emitted with `<`, `>` and `&` removed rather than escaped: `labelStacksFrom` matches
 *  `<text …>([^<]*)</text>` and uses the run only as the NAME it reports a crossing under, so an
 *  entity would put `&amp;` in a sentence a human reads while a stray `<` would break the element
 *  the reader is scanning for. */
export function paintedLabelSvg({ labels, lines }) {
  const text = labels
    .map(
      (label) =>
        `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" font-size="${label.fontSize}">${label.text.replace(/[<>&]/g, "")}</text>`,
    )
    .join("");
  const drawn = lines
    .map(
      (line) =>
        `<line x1="${line.x1.toFixed(2)}" y1="${line.y1.toFixed(2)}" x2="${line.x2.toFixed(2)}" y2="${line.y2.toFixed(2)}"/>`,
    )
    .join("");
  return `<svg>${text}${drawn}</svg>`;
}
