// twin/skills/chart-web/scripts/annotation-clearance.mjs
//
// THE ONE DEFINITION OF "THIS ANNOTATION COLLIDES", shared by the corpus guard and the format's own
// verifier (issue #78).
//
// It used to live only inside `skills/splash/test/web-annotation-clears-its-marks.test.ts`, which
// runs over the committed `proof/` pages. A journalist's own beat is never in `proof/`: the check a
// journalist actually runs on a new web chart is `verify-web.mjs`, and it measured nothing about an
// annotation printed over another label or punched into the mark it names. So the measurement moved
// here, into the skill that ships it, and both callers import it:
//
//   - `scripts/verify-web.mjs` (`checkAnnotationsClear`) — every finding is a FAIL on the
//     journalist's page, worded exactly as below;
//   - the corpus guard — the same findings, held against its `OWED` ratchet for the proof pages.
//
// A skill's own `test/` directory may import out of it; nothing else may, so the guard reaches in
// here and this file reaches out to nothing. It takes a puppeteer `page` rather than launching a
// browser, so it carries no engine of its own and each caller keeps its own browser.
//
// WHAT IS MEASURED, for every drawn `.note`, at each of `ANNOTATION_VIEWPORTS`:
//   1. whether it is printed over another run of type — its box against the box of every word the
//      format draws, collected by the class contract the shared stylesheet and the components agree
//      on (a parent/child pair is not an overlap);
//   2. whether its opaque ground chip punches into a mark — 25 points across its own rectangle, each
//      asked `isPointInFill` in the mark's own SVG user space. A mark filled at less than
//      `MARK_CONTRAST_FLOOR` against the page ground is a wash, not a mark;
//   3. for a `.note.peak-label`, whether its `.peak-leader-v` renders at zero height.
//
// WHAT IT IS NOT: a judgement of where a label SHOULD sit, a measurement of a word that is not a
// `.note`, or exact — 25 sample points is an approximation, and a bounding box is not glyph ink.

/** The four widths the measurement is taken at, each with the real window height it is read in. */
export const ANNOTATION_VIEWPORTS = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1400, h: 900 },
  { w: 1600, h: 800 },
];

/** Below this against the page ground, a filled shape is a wash rather than a mark —
 *  `webz-diverging-bar-eu-per-capita` highlights its subject's row in `#e2efee` (1.19 : 1 against
 *  white) and puts that row's own note inside the band on purpose. */
export const MARK_CONTRAST_FLOOR = 1.5;

/** Reads every annotation in the page against every painted mark it intersects. Everything that
 *  crosses the CDP boundary is a plain object. */
export const READ_ANNOTATIONS = (floor) => `(() => {
  const lum = (c) => {
    const m = c.match(/\\d+(\\.\\d+)?/g) || [];
    const [r, g, b] = m.slice(0, 3).map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const vis = (e) => {
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
  };
  const ground = getComputedStyle(document.body).backgroundColor;
  const marks = [...document.querySelectorAll("svg rect, svg circle, svg path, svg polygon")].filter((e) => {
    const f = getComputedStyle(e).fill;
    if (!f || f === "none" || f === "rgba(0, 0, 0, 0)" || f === "transparent") return false;
    if (ratio(f, ground) < ${floor}) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && vis(e);
  });
  const inFill = (m, cx, cy) => {
    const svg = m.ownerSVGElement;
    if (!svg || !m.isPointInFill || !m.getScreenCTM) return false;
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    try { return m.isPointInFill(pt.matrixTransform(m.getScreenCTM().inverse())); }
    catch (e) { return false; }
  };
  const leader = document.querySelector(".peak-leader-v");
  // Every word this format draws, by the class contract the shared stylesheet and every component
  // agree on. A label overlapping another label is unreadable whichever of the two you meant.
  const WORDS = ".chart-title, .chart-caveat, .chart-source, .chart-legend span, .axis-label," +
    " .note, .end-label, .band-label, .name-label, .crossing-label, .slope-label," +
    " .period-label, .cell-value, .legend-caption, .legend-min, .legend-max";
  const words = [...document.querySelectorAll(WORDS)].filter(
    (e) => vis(e) && (e.textContent || "").trim().length > 0 && e.getBoundingClientRect().width > 0,
  );
  return [...document.querySelectorAll(".note")].filter(vis).map((n) => {
    const nb = n.getBoundingClientRect();
    let worst = null;
    for (const m of marks) {
      const mb = m.getBoundingClientRect();
      if (mb.right < nb.left || mb.left > nb.right || mb.bottom < nb.top || mb.top > nb.bottom) continue;
      let covered = 0;
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        const cx = nb.left + (nb.width * i) / 4, cy = nb.top + (nb.height * j) / 4;
        if (cx < mb.left || cx > mb.right || cy < mb.top || cy > mb.bottom) continue;
        if (inFill(m, cx, cy)) covered++;
      }
      if (covered > 0 && (!worst || covered > worst.covered))
        worst = { covered, fill: getComputedStyle(m).fill, tag: m.tagName };
    }
    // Which other WORD this one is printed on top of. A parent/child pair (a note and the line
    // inside it) is not an overlap; only two independent runs are.
    let collides = null;
    for (const other of words) {
      if (other === n || n.contains(other) || other.contains(n)) continue;
      const ob = other.getBoundingClientRect();
      if (ob.right <= nb.left || ob.left >= nb.right || ob.bottom <= nb.top || ob.top >= nb.bottom)
        continue;
      collides = (other.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40);
      break;
    }
    return {
      peak: n.classList.contains("peak-label"),
      text: (n.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
      worst,
      collides,
      leaderPx: leader ? Math.round(leader.getBoundingClientRect().height) : -1,
    };
  });
})()`;

/**
 * @typedef {{ peak: boolean, text: string, worst: { covered: number, fill: string, tag: string } | null,
 *   collides: string | null, leaderPx: number }} Annotation
 */

/** Every drawn `.note` on the page as it stands, measured. The caller sets the viewport and loads
 *  the page first.
 *  @returns {Promise<Annotation[]>} */
export async function readAnnotations(page, floor = MARK_CONTRAST_FLOOR) {
  return page.evaluate(READ_ANNOTATIONS(floor));
}

/**
 * The findings, in the one wording both callers print. `where` is the page as the reader of the
 * report knows it (a repository-relative path), `width` the viewport width it was measured at.
 *   - `standing`: an ordinary `.note` printed over another word or punched into a mark;
 *   - `peak`: the same two defects on a `.note.peak-label`, plus a zero-height leader;
 *   - `peaks`: how many peak labels were measured.
 * @param {string} where
 * @param {number} width
 * @param {Annotation[]} notes
 */
export function annotationFindings(where, width, notes) {
  const standing = [];
  const peak = [];
  let peaks = 0;
  for (const n of notes) {
    if (!n.peak) {
      if (n.worst)
        standing.push(
          `${where} @ ${width}: "${n.text}" covers a ${n.worst.tag} filled ${n.worst.fill} ` +
            `at ${n.worst.covered}/25 sample points`,
        );
      if (n.collides) standing.push(`${where} @ ${width}: "${n.text}" is printed over "${n.collides}"`);
      continue;
    }
    peaks += 1;
    if (n.worst)
      peak.push(
        `${where} @ ${width}: the annotation "${n.text}" punches its own ground chip into a ` +
          `${n.worst.tag} filled ${n.worst.fill} — ${n.worst.covered} of 25 points across ` +
          `its own box are inside that mark's painted fill`,
      );
    if (n.collides)
      peak.push(
        `${where} @ ${width}: the annotation "${n.text}" is printed over "${n.collides}" — two ` +
          `runs of type on the same pixels, and neither is readable`,
      );
    if (n.leaderPx === 0)
      peak.push(
        `${where} @ ${width}: the annotation "${n.text}" has a leader of zero height — it points ` +
          `at nothing, or its own calc() went negative and rendered as nothing`,
      );
  }
  return { standing, peak, peaks };
}
