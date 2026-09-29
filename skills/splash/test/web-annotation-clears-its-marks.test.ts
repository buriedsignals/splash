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
 *      an opaque ground chip in this format, so a point inside a mark's fill is a hole punched in
 *      that mark — the exact defect the pyramid's own build comment describes ("a white hole in the
 *      60-64 men's bar").
 *   2. **It is not printed on another run of type.** Every word this format draws is collected by the
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
 *      and the format's own seed. Every other `.note` in the corpus is measured against `OWED`
 *      below — the exact set of standing findings on committed proof pages, pinned by page, width
 *      and text (issue #64). A finding outside that set FAILS, naming itself; a pinned finding that
 *      is no longer found also fails, so a fixed page strikes its own pin. The set can only fall.
 *      The detector samples 25 points per label and is approximate, which is why the two pages
 *      are pinned rather than re-rendered here. The three known cases:
 *        - `webx-world-population` — "passed 1 billion in 1805" grazes the `#0B7A75` area's own
 *          edge, **1 of 25 sample points**, at 375, 768 and 1400. A real notch in the line, small.
 *        - `webx-life-expectancy` — FIXED and struck (2026-09-13). "first year past 80" was
 *          printed **over** "Switzerland 84.0 (2023)" at 375: two direct labels 22,4 % of the
 *          plot's height apart, with fixed-px heights that close that gap as the plot shrinks.
 *          Measured across five widths (8 px of overlap at 320, 3 at 360, 1 at 375, clear from
 *          414), so the note now flips under its own point below 480 px, which is the empty half
 *          of that neighbourhood. The pin is gone from the set below (then named `ACCEPTED`).
 *        - `webz-diverging-bar-eu-per-capita` — "the only rise since 1990" sits inside the `#e2efee`
 *          row band, which is the wash case above and is deliberate (it is below the floor, so it
 *          does not even reach the report).
 *      The first two are the pinned set; they are recorded in `FEEDBACK-2026-08-10.md` under B6.6's row.
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
import puppeteer from "puppeteer-core";
// The measurement itself lives in the skill that ships it, so the format's own verifier
// (`chart-web/scripts/verify-web.mjs`) reports a journalist's page by the same definition (#78).
import {
  ANNOTATION_VIEWPORTS,
  MARK_CONTRAST_FLOOR,
  annotationFindings,
  readAnnotations,
} from "../../chart-web/scripts/annotation-clearance.mjs";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

setDefaultTimeout(600000);

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `map-web/test/standalone.test.ts`'s own copy states. */
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

/**
 * OWED — the standing findings on committed proof pages, the debt counted. A RATCHET: this list may
 * only shrink.
 *
 * Recorded 2026-09-29, the day before the public release, by measuring this file against the
 * committed `proof/` tree: 228 findings on 18 web beats (three renders each), 156 of them at 375,
 * 44 at 768, 13 at 1400 and 15 at 1600. They are REAL defects — a `.note` printed over another run of
 * type, or punching its opaque ground chip into a mark it names — and they are owed rather than fixed
 * because each is per-beat placement work plus a re-render of three directions, which could not be
 * done and reviewed before the release. The owner chose to ship them named here instead of leaving
 * the guard red, where a new collision would have been invisible among the known ones.
 *
 * Key: the exact line this guard reports — `<page> @ <width>: "<note>" is printed over "<other>"` or
 * `<page> @ <width>: "<note>" covers a <tag> filled <fill> at <n>/25 sample points`. The sample count
 * is kept in the key: it was identical across two full runs on 2026-09-29, and dropping it would let
 * a note slide further into the mark it already grazes without anything going red.
 *
 *   - A finding NOT in this list fails, naming itself — a new page, a new width, a new note on an
 *     owed page, or an owed note that now collides with something else or covers more of its mark.
 *   - An entry here that is NO LONGER FOUND fails too, telling whoever fixed it to delete the line.
 *   - Never add a line for a new finding. Fix the page instead.
 */
const OWED = new Set<string>([
  // Empty since 2026-09-29: all 228 sites fixed (#78). The list may only shrink; never add a line.
]);

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
      for (const { w, h } of ANNOTATION_VIEWPORTS) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        for (const file of files) {
          await page.goto(`file://${file}`, { waitUntil: "load" });
          const found = annotationFindings(
            relative(TWIN, file),
            w,
            await readAnnotations(page, MARK_CONTRAST_FLOOR),
          );
          reported.push(...found.standing);
          failures.push(...found.peak);
          peaksSeen += found.peaks;
        }
      }
    } finally {
      await browser.close();
    }

    // Standing findings are a ratchet, not a report: anything new fails, anything fixed strikes.
    const unexpected = reported.filter((line) => !OWED.has(line));
    const struck = [...OWED].filter((line) => !reported.includes(line));
    // One assertion, so a run that both fixes one site and breaks another names both.
    expect({
      "NEW annotation defects, not in OWED — fix the page; never add a line to OWED": unexpected,
      "OWED entries no longer found — the defect is fixed: delete these lines from OWED": struck,
    }).toEqual({
      "NEW annotation defects, not in OWED — fix the page; never add a line to OWED": [],
      "OWED entries no longer found — the defect is fixed: delete these lines from OWED": [],
    });
    expect(peaksSeen).toBeGreaterThan(0);
    expect(failures.join("\n")).toBe("");
  });
});
