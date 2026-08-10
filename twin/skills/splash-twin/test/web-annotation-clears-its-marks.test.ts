/**
 * AN ANNOTATION IS PLACED BY THE SHAPE IT ANNOTATES, NOT BY A TYPED CORNER.
 *
 * The W3 audit swept this class and counted **eight live sites placing a label by a hand-typed
 * number**, in six beats and two skill seeds, while the derivation that would place it correctly
 * already exists in six places in the tree and none of the eight calls it. This guard is the WEB
 * half of that class; the static half (an annotation *coloured* against the page rather than against
 * what it crosses) is a different measurement in a different chantier.
 *
 * The instance the owner reported: `weby-population-pyramid-switzerland`'s peak annotation was
 * parked at `left: 0%, top: 0%` — the plot's top-left corner, twelve rows above the band it names,
 * with a dashed rule running the whole height of the frame. *"It sits off-centre and reads poorly."*
 * At 1400 the leader measured 600+ px; the label overlapped nothing only because the corner happened
 * to be empty, which nothing checked and nothing would have noticed changing.
 *
 * WHAT THIS ASSERTS, driven at four real widths, for every delivered artifact that ships a
 * `.note.peak-label`:
 *   1. **It clears every mark it sits over.** Not a bounding-box test — a bounding box would call a
 *      label inside the empty corner of a filled area a collision. Each mark whose box intersects
 *      the label's is asked, at 25 points across the label's own rectangle, whether that point is
 *      inside its PAINTED fill (`isPointInFill`, in the mark's own SVG user space). A label carries
 *      an opaque ground chip in this genre, so a point inside a mark's fill is a hole punched in
 *      that mark — the exact defect the pyramid's own build comment describes ("a white hole in the
 *      60-64 men's bar").
 *   2. **It is not printed on another run of type.** Every word this genre draws is collected by the
 *      class contract the shared stylesheet and the components agree on, and the annotation's box is
 *      tested against all of them. This is also the corpus's only measurement of label-vs-label
 *      overlap OUTSIDE video — the W3 audit's §4.5 records that the only such guard renders the
 *      seed. It is what catches the pyramid's own regression: parked at the corner, its box lands on
 *      the caveat above the plot, at every width.
 *   3. **Its leader reaches something.** Where the beat draws `.peak-leader-v`, its rendered height
 *      must be > 0 at every width: a zero-length leader is an annotation that has quietly landed on
 *      the row it points at, and a leader whose `calc()` went negative renders as nothing at all.
 *
 * A mark filled at less than `MARK_CONTRAST_FLOOR` against the page ground is not a mark for this
 * purpose — it is a wash. `webz-diverging-bar-eu-per-capita` highlights its subject's whole row in
 * `#e2efee` (**1.19 : 1** against white) and puts the row's own note inside that band on purpose;
 * failing that would be being wrong about a correct artifact.
 *
 * WHAT IT DOES NOT COVER, and the two things it FOUND and does not fail.
 *   1. **It FAILS only on `.note.peak-label`.** Today that is `weby-population-pyramid-switzerland`
 *      and the genre's own seed. Every other `.note` in the corpus is measured and REPORTED, because
 *      three of them are already over something and none is this chantier's to change:
 *        - `webx-world-population` — "passed 1 billion in 1805" grazes the `#0B7A75` area's own
 *          edge, **1 of 25 sample points**, at 375, 768 and 1400. A real notch in the line, small.
 *        - `webx-life-expectancy` — "first year past 80" is printed **over** "Switzerland 84.0
 *          (2023)" at 375. Two runs of type on the same pixels, in a beat nobody reported.
 *        - `webz-diverging-bar-eu-per-capita` — "the only rise since 1990" sits inside the `#e2efee`
 *          row band, which is the wash case above and is deliberate (it is below the floor, so it
 *          does not even reach the report).
 *      The first two are printed on every run so they are visible to a person, which is not the same
 *      as being guarded, and they are recorded in `FEEDBACK-2026-08-10.md` under B6.6's row.
 *   2. **It does not judge WHERE a label should be**, only that where it is does not damage a mark.
 *      A correctly-placed-but-useless annotation passes.
 *   3. **Four widths, one engine.**
 *
 * THE MUTATION THAT REDDENS IT, run in a copy of the tree under `/tmp/annot-mut/`, never here. The
 * pyramid's derived anchor replaced by the corner it used to be typed at (`--peak-top: 0%`, the
 * container steps deleted), and the beat re-rendered in the copy:
 *
 *   0 pass · 1 fail
 *   Received: "proof/weby-population-pyramid-switzerland/population-pyramid-switzerland.html @ 375:
 *   the annotation "55-59the widest band669,962 people" is printed over "Age bands run in their
 *   natural sequence," — two runs of type on the same pixels, and neither is readable
 *   … the same at 768, 1400 and 1600"
 *
 * Four lines, one per width, and no other artifact moved — the three reported instances above
 * printed identically before and after.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer from "puppeteer";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

setDefaultTimeout(600000);

const WIDTHS = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1400, h: 900 },
  { w: 1600, h: 800 },
];

/** Below this against the page ground, a filled shape is a wash rather than a mark — see the header
 *  for the artifact this exists for and its measured 1.19 : 1. */
const MARK_CONTRAST_FLOOR = 1.5;

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `twin-map-web/test/standalone.test.ts`'s own copy states. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

function deliveredHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) deliveredHtml(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

/** Reads every annotation in the page against every painted mark it intersects. Everything that
 *  crosses the CDP boundary is a plain object. */
const READ_ANNOTATIONS = (floor: number) => `(() => {
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
  // Every word this genre draws, by the class contract the shared stylesheet and every component
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

type Annotation = {
  peak: boolean;
  text: string;
  worst: { covered: number; fill: string; tag: string } | null;
  collides: string | null;
  leaderPx: number;
};

describe("a web annotation is placed by the shape it annotates", () => {
  it("clears the marks it sits over, stays inside the plot, and its leader reaches", async () => {
    const files = deliveredHtml(PROOF);
    expect(files.length).toBeGreaterThan(0);

    const browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
    });
    const failures: string[] = [];
    const reported: string[] = [];
    let peaksSeen = 0;
    try {
      const page = await browser.newPage();
      for (const { w, h } of WIDTHS) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        for (const file of files) {
          await page.goto(`file://${file}`, { waitUntil: "load" });
          const notes = (await page.evaluate(
            READ_ANNOTATIONS(MARK_CONTRAST_FLOOR),
          )) as Annotation[];
          const rel = relative(TWIN, file);
          for (const n of notes) {
            if (!n.peak) {
              if (n.worst)
                reported.push(
                  `  ${rel} @ ${w}: "${n.text}" covers a ${n.worst.tag} filled ${n.worst.fill} ` +
                    `at ${n.worst.covered}/25 sample points [reported, not failed]`,
                );
              if (n.collides)
                reported.push(
                  `  ${rel} @ ${w}: "${n.text}" is printed over "${n.collides}" [reported, not failed]`,
                );
              continue;
            }
            peaksSeen += 1;
            if (n.worst)
              failures.push(
                `${rel} @ ${w}: the annotation "${n.text}" punches its own ground chip into a ` +
                  `${n.worst.tag} filled ${n.worst.fill} — ${n.worst.covered} of 25 points across ` +
                  `its own box are inside that mark's painted fill`,
              );
            if (n.collides)
              failures.push(
                `${rel} @ ${w}: the annotation "${n.text}" is printed over "${n.collides}" — two ` +
                  `runs of type on the same pixels, and neither is readable`,
              );
            if (n.leaderPx === 0)
              failures.push(
                `${rel} @ ${w}: the annotation "${n.text}" has a leader of zero height — it points ` +
                  `at nothing, or its own calc() went negative and rendered as nothing`,
              );
          }
        }
      }
    } finally {
      await browser.close();
    }

    if (reported.length)
      console.log(`other annotations over a mark:\n${reported.join("\n")}`);
    expect(peaksSeen).toBeGreaterThan(0);
    expect(failures.join("\n")).toBe("");
  });
});
