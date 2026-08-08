import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture } from "./capture";
import type { CaptureCheck, FurnitureExpectation } from "./types";

// A REAL html document opened in a REAL browser — not a mock of a render, and not a
// screenshot fixture. Its geometry is the one MEASURED on a loop-produced interactive
// (chart-native slope, article-web): body inset 24px, component root 557px tall, so the
// root ends at y=581, and the "Source: …" footer occupies y 554→581. At the 900x560
// viewport the engines' own snap scripts hard-code, that footer is BELOW THE FOLD — which
// is exactly the failure issue #10 reports and asks to see caught.
const TITLE = "Health premiums rose in every canton shown";
const UNIT = "Monthly adult premium (CHF)";
const SOURCE = "Source: Provided by the newsroom";
const ALT =
  "Between 2015 and 2024 the adult premium rose in all three cantons shown.";

function componentHtml(opts: { withSource?: boolean } = {}): string {
  const source =
    opts.withSource === false ? "" : `<div class="src">${SOURCE}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chart</title>
<style>
  html{margin:0;padding:0;background:#f4f4f4}
  body{margin:0;padding:24px;background:#f4f4f4}
  #root{width:100%;box-sizing:border-box}
  #root > div{margin:0 auto;position:relative;height:557px;background:#fff}
  .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .title{padding:4px 24px;font:600 18px system-ui}
  .unit{padding:0 24px;font:12px system-ui;color:#555}
  .src{position:absolute;left:0;right:0;bottom:0;height:27px;font:12px system-ui;color:#555}
</style></head><body>
<div id="root"><div>
  <p class="sr-only">${ALT}</p>
  <div class="title">${TITLE}</div>
  <div class="unit">${UNIT}</div>
  <svg width="100%" height="420" role="img">
    <line class="series-line" x1="20" y1="300" x2="600" y2="120" stroke="#1B7F79" stroke-width="3"/>
    <circle class="dot" cx="20" cy="300" r="5" fill="#1B7F79"/>
    <circle class="dot" cx="600" cy="120" r="5" fill="#1B7F79"/>
    <rect class="bar" x="40" y="200" width="18" height="90" fill="#D95F02"/>
  </svg>
  ${source}
</div></div>
</body></html>`;
}

const dir = mkdtempSync(join(tmpdir(), "verify-capture-html-"));

function writeDoc(name: string, html: string): string {
  const p = join(dir, name);
  writeFileSync(p, html);
  return p;
}

const FURNITURE: FurnitureExpectation[] = [
  { role: "title", text: TITLE },
  { role: "unit", text: UNIT },
  { role: "source", text: SOURCE },
  { role: "alt-text", text: ALT },
];

function pick(
  checks: CaptureCheck[],
  id: CaptureCheck["id"],
  role?: string,
): CaptureCheck[] {
  return checks.filter(
    (c) => c.id === id && (role === undefined || c.role === role),
  );
}

function isPngFile(path: string): boolean {
  const b = readFileSync(path);
  return (
    b.length > 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  );
}

describe("capture — the real deliverable at the real publication container", () => {
  it("captures the whole component with its furniture, at each responsive breakpoint", async () => {
    const artifactPath = writeDoc("ok.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-ok"),
      id: "e1",
      furniture: FURNITURE,
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);

    expect(r.value.images.map((i) => i.breakpoint)).toStrictEqual([
      "narrow",
      "primary",
      "wide",
    ]);
    const primary = r.value.images.find((i) => i.breakpoint === "primary")!;

    // The still is a real png on disk, at the captured ROOT's size times the device
    // scale factor — an element screenshot, not a viewport crop.
    expect(isPngFile(primary.path)).toBe(true);
    const b = readFileSync(primary.path);
    expect(b.readUInt32BE(16)).toBe(
      Math.round(primary.rootBox.width * primary.deviceScaleFactor),
    );
    expect(b.readUInt32BE(20)).toBe(
      Math.round(primary.rootBox.height * primary.deviceScaleFactor),
    );

    // The provenance issue #10 asks for on every review image.
    expect(primary.cssViewport).toStrictEqual({ width: 1200, height: 675 });
    expect(primary.deviceScaleFactor).toBe(2);
    expect(primary.destinationId).toBe("channel:article-web");
    expect(primary.artifactSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(primary.artifactPath).toBe(artifactPath);
    expect(primary.rootSelector).toBe("#root > div");
    expect(primary.rootBox.height).toBe(557);

    // Real measurement of what got painted, for the taste-risk lane.
    expect(primary.marks).toBeGreaterThanOrEqual(4);
    expect(primary.markColours).toContain("#1b7f79");

    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    expect(
      pick(primaryChecks, "capture:furniture-present").every(
        (c) => c.outcome === "pass",
      ),
    ).toBe(true);
    expect(
      pick(primaryChecks, "capture:furniture-in-frame").every(
        (c) => c.outcome === "pass",
      ),
    ).toBe(true);
    expect(pick(primaryChecks, "capture:fits-viewport")[0]!.outcome).toBe(
      "pass",
    );
  }, 120_000);

  it("CATCHES the 900x560 source-footer failure issue #10 reports", async () => {
    const artifactPath = writeDoc("fold.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-fold"),
      id: "e1",
      furniture: FURNITURE,
      settleMs: 0,
      // The arbitrary browser viewport the review still was taken at, declared here as
      // the destination it claims to represent.
      destination: {
        id: "adhoc-900x560",
        primary: { width: 900, height: 560 },
      },
    });
    if (!r.ok) throw new Error(r.message);

    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    const sourceInFrame = pick(
      primaryChecks,
      "capture:furniture-in-frame",
      "source",
    )[0]!;
    expect(sourceInFrame.outcome).toBe("fail");
    // The evidence names the geometry, so nobody has to take the verdict on faith.
    expect(sourceInFrame.detail).toContain("581");
    expect(sourceInFrame.detail).toContain("560");

    // The component as a whole does not fit its claimed container either.
    expect(pick(primaryChecks, "capture:fits-viewport")[0]!.outcome).toBe(
      "fail",
    );

    // And the footer IS in the DOM and visible — the defect is the destination, not a
    // missing element. Distinguishing the two is the point of having both checks.
    expect(
      pick(primaryChecks, "capture:furniture-present", "source")[0]!.outcome,
    ).toBe("pass");
  }, 120_000);

  it("passes the same component at the destination it is actually published to", async () => {
    const artifactPath = writeDoc("fits.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-fits"),
      id: "e1",
      furniture: FURNITURE,
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    expect(
      pick(primaryChecks, "capture:furniture-in-frame", "source")[0]!.outcome,
    ).toBe("pass");
  }, 120_000);

  it("reports furniture that is absent from the DOM as MISSING, not as out of frame", async () => {
    const artifactPath = writeDoc(
      "nosource.html",
      componentHtml({ withSource: false }),
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-nosource"),
      id: "e1",
      furniture: FURNITURE,
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    expect(
      pick(primaryChecks, "capture:furniture-present", "source")[0]!.outcome,
    ).toBe("fail");
    // No in-frame verdict for something that is not there: two failures for one defect
    // would inflate the record and make the real cause harder to read.
    expect(
      pick(primaryChecks, "capture:furniture-in-frame", "source"),
    ).toHaveLength(0);
  }, 120_000);

  it("counts a visually-hidden alt text as present — a11y text is not meant to be seen", async () => {
    const artifactPath = writeDoc("alt.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-alt"),
      id: "e1",
      furniture: [{ role: "alt-text", text: ALT }],
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    expect(
      pick(primaryChecks, "capture:furniture-present", "alt-text")[0]!.outcome,
    ).toBe("pass");
    // It is exempt from the frame check by construction — a 1x1 clipped node has no
    // meaningful box to be "in frame".
    expect(
      pick(primaryChecks, "capture:furniture-in-frame", "alt-text"),
    ).toHaveLength(0);
  }, 120_000);

  it("degrades to body on a document with no #root, and says so in the record", async () => {
    const artifactPath = writeDoc(
      "bare.html",
      `<!doctype html><html><body><h1>${TITLE}</h1></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-bare"),
      id: "e1",
      furniture: [{ role: "title", text: TITLE }],
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.rootSelector).toBe("body");
  }, 120_000);

  it("harvests the colours a reader must tell apart, not the gridline tints", async () => {
    // Measured on the real loop-produced slope: its gridlines are 1px strokes at
    // #e6e6e6 and #cfcfcf, 69 apart on the adjacency metric — close enough to trip a
    // naive harvest on EVERY chart, which would make the human-eye lane noise people
    // learn to click past. Furniture rules are not an encoding a reader must decode.
    const artifactPath = writeDoc(
      "grid.html",
      `<!doctype html><html><body><div id="root"><div>
          <svg width="600" height="300">
            <line x1="0" y1="10" x2="600" y2="10" stroke="#e6e6e6" stroke-width="1"/>
            <line x1="0" y1="40" x2="600" y2="40" stroke="#cfcfcf" stroke-width="1"/>
            <line class="series" x1="0" y1="200" x2="600" y2="80" stroke="#1b7f79" stroke-width="2"/>
            <circle cx="30" cy="200" r="4" fill="#d95f02"/>
          </svg>
        </div></div></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-grid"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const colours = r.value.images[0]!.markColours;
    expect(colours).toContain("#1b7f79");
    expect(colours).toContain("#d95f02");
    expect(colours).not.toContain("#e6e6e6");
    expect(colours).not.toContain("#cfcfcf");
    // The mark COUNT still sees everything — density is about how much is drawn.
    expect(r.value.images[0]!.marks).toBe(4);
  }, 120_000);

  // --- the title the render itself declares ------------------------------------------
  //
  // Not the title the CALLER commissioned: the furniture roles are declared as expected
  // TEXT (types.ts:112), so asking for the title that way can only answer "it is there" or
  // "it is not" — never "here is what is there instead", which is the only thing a
  // divergence detector can use. So the read walks a candidate ladder, exactly like
  // ROOT_SELECTORS, and RECORDS which candidate answered.

  it("reads the accessible name the render declares — the title chart-native really ships", async () => {
    // Measured on the engine, not assumed: each of chart-native's 41 chart components roots
    // on `<svg role="img" aria-label={config.title}>` (e.g. BarChart.tsx:289-290). ChartFrame
    // paints the VISIBLE title in an unclassed, unattributed <div> (ChartFrame.tsx:167-176),
    // so the accessible name is the only title this DOM actually names.
    const declared = "Health premiums rose in every canton shown";
    const artifactPath = writeDoc(
      "aria.html",
      `<!doctype html><html><body><div id="root"><div>
          <div class="title">a different visible string</div>
          <svg width="600" height="300" role="img" aria-label="${declared}">
            <circle cx="30" cy="200" r="4" fill="#d95f02"/>
          </svg>
        </div></div></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-aria"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    for (const img of r.value.images) {
      expect(img.renderedTitle).toBe(declared);
      expect(img.titleSource).toBe("svg[role='img'][aria-label]");
    }
  }, 120_000);

  it("falls back to a heading when nothing names a title, and says which candidate answered", async () => {
    const artifactPath = writeDoc(
      "heading.html",
      `<!doctype html><html><body><div id="root"><div>
          <h1>Rents rose across the region</h1>
          <svg width="600" height="300"><circle cx="30" cy="200" r="4" fill="#d95f02"/></svg>
        </div></div></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-heading"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.renderedTitle).toBe(
      "Rents rose across the region",
    );
    expect(r.value.images[0]!.titleSource).toBe("h1");
  }, 120_000);

  it("records that NO candidate answered rather than guessing from the biggest text", async () => {
    // The fixture used by every other test in this file: an unclassed title div, an <svg>
    // with role="img" but no aria-label. Nothing here NAMES a title, and "the largest text
    // near the top" would just as happily return a value label.
    const artifactPath = writeDoc("untitled.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-untitled"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.titleSource).toBe("none");
    expect(r.value.images[0]!.renderedTitle).toBeUndefined();
  }, 120_000);

  it("refuses a candidate that returns a document dump instead of a headline", async () => {
    const dump = "prose ".repeat(120); // 720 chars — a section, not a title
    const artifactPath = writeDoc(
      "dump.html",
      `<!doctype html><html><body><div id="root"><div>
          <h2>${dump}</h2>
          <svg width="600" height="300"><circle cx="30" cy="200" r="4" fill="#d95f02"/></svg>
        </div></div></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-dump"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.titleSource).toBe("none");
    expect(r.value.images[0]!.renderedTitle).toBeUndefined();
  }, 120_000);

  it("prefers an explicit marker over every degradation below it", async () => {
    const artifactPath = writeDoc(
      "marker.html",
      `<!doctype html><html><body><div id="root"><div>
          <div data-splash-title>The marked title</div>
          <h1>A heading that is not the title</h1>
          <svg width="600" height="300" role="img" aria-label="An accessible name">
            <circle cx="30" cy="200" r="4" fill="#d95f02"/>
          </svg>
        </div></div></body></html>`,
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-marker"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.renderedTitle).toBe("The marked title");
    expect(r.value.images[0]!.titleSource).toBe("[data-splash-title]");
  }, 120_000);

  // --- the content-driven height, on the HTML path -----------------------------------
  //
  // captureStatic has honoured `heightPolicy` since the row-driven family came back into the
  // offer; captureHtml never read the field at all. That cost every scrolly a blocking
  // `component-overflows-viewport` finding: measured on a loop-produced chart scrolly, the
  // component ends at y 3645 in a 1200x675 destination at EVERY breakpoint, because a scrolly is
  // its own scroll. The fixture below is that shape, an order of magnitude smaller.
  function tallPage(height: number, width = "100%"): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Scrolly</title>
<style>html,body{margin:0;padding:0}#root>div{width:${width};height:${height}px;background:#fff}</style>
</head><body><div id="root"><div><div class="title">${TITLE}</div></div></div></body></html>`;
  }

  it("does not hold a content-driven page to its destination's HEIGHT — and still holds it to the width", async () => {
    const artifactPath = writeDoc("tall.html", tallPage(1400));
    const r = await capture({
      artifactPath,
      format: "scrolly",
      channel: "article-web",
      outDir: join(dir, "out-tall"),
      id: "e1",
      furniture: [{ role: "title", text: TITLE }],
      settleMs: 0,
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    for (const bp of ["narrow", "primary", "wide"] as const) {
      const checks = r.value.checks.filter((c) => c.breakpoint === bp);
      const fits = pick(checks, "capture:fits-viewport")[0]!;
      expect(`${bp}: ${fits.outcome}`).toBe(`${bp}: pass`);
      // The relaxation is NAMED in the evidence — a reader must be able to tell "the height was
      // never checked" from "the height was checked and matched".
      expect(fits.detail).toContain("content-driven");
      // …and the ceiling the height still has is measured: 1400 is 2.1x a 675 box, inside the 10x
      // bound, so a runaway page would still fail here.
      const bound = pick(checks, "capture:height-within-bound")[0]!;
      expect(`${bp}: ${bound.outcome}`).toBe(`${bp}: pass`);
    }
    // Recorded on the image, exactly as captureStatic records it: a check that forgave an axis
    // must say so IN the evidence.
    expect(
      r.value.images.every((i) => i.heightPolicy === "content-driven"),
    ).toBe(true);
  }, 120_000);

  // A SMALL DECLARED DESTINATION, on purpose. The two negative cases below need a page that runs
  // PAST the ceiling, and the ceiling is a multiple of the destination's own height — so against
  // article-web's 675 the fixture would have to be 7000px+, screenshotted at deviceScaleFactor 2
  // across three breakpoints. That is ~100 megapixels of PNG for two boolean assertions, and it
  // is what made the first draft of this test time out under the full suite's parallelism.
  // Declaring a 300x100 destination at scale 1 asks the identical questions for a thousandth of
  // the pixels: the rule under test is a RATIO, and it does not care which box it is a ratio of.
  const SMALL = {
    id: "small-box",
    primary: { width: 300, height: 100 },
    narrow: { width: 200, height: 100 },
    wide: { width: 400, height: 100 },
    deviceScaleFactor: 1,
  };

  it("still fails a content-driven page that overflows the WIDTH", async () => {
    // 900px wide inside a 300px container: an overflow on any policy, and the only axis a
    // content-driven page is still held to.
    const wide = writeDoc("tall-wide.html", tallPage(400, "900px"));
    const r = await capture({
      artifactPath: wide,
      format: "scrolly",
      channel: "article-web",
      outDir: join(dir, "out-tall-wide"),
      id: "e1",
      settleMs: 0,
      destination: SMALL,
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const primary = r.value.checks.filter((c) => c.breakpoint === "primary");
    const fits = pick(primary, "capture:fits-viewport")[0]!;
    expect(fits.outcome).toBe("fail");
    // The refusal names the axis, so nobody reads it as a height complaint.
    expect(fits.detail).toContain("WIDTH");
  }, 120_000);

  // THE CEILING IS PER SHAPE, and the reason is arithmetic rather than taste.
  //
  // A scrolly's card is `min-height: 90vh` (skills/scrolly/src/Scrolly.tsx:495), so its height is
  // not merely "content-driven" the way a row-driven export's is — it is a MULTIPLE OF THE
  // VIEWPORT, and the ratio IS the card count: `0.9 x cards`, where `cards = beats + 2` (the walk
  // is framed by an intro and a takeaway card). That is measured, not modelled — the e2e's 4-beat
  // walk is 6 cards and lands at exactly 5.4x (lib/loop/scrolly-e2e.test.ts).
  //
  // Against the 10x row-driven ceiling that means a walk of TEN beats — 12 cards, 10.8x — files
  // `height-far-exceeds-destination` on a completely correct artifact. The derived walk is capped
  // at four beats (lib/brain/beats.ts: a line takes first + two interior + last, a bar three
  // leaders + the tail), but an AUTHORED anchor list is not capped at all, so ten beats is an
  // ordinary long-read rather than an edge case.
  it("does not file a runaway warning on an ordinary long WALK — the ceiling knows the shape", async () => {
    // 1400px against a 100px box is 14x: a ~14-card walk. Past the row-driven 10x, and well
    // inside what a scrolly legitimately is.
    const longWalk = writeDoc("long-walk.html", tallPage(1400));
    const r = await capture({
      artifactPath: longWalk,
      format: "scrolly",
      channel: "article-web",
      outDir: join(dir, "out-long-walk"),
      id: "e1",
      settleMs: 0,
      destination: SMALL,
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const primary = r.value.checks.filter((c) => c.breakpoint === "primary");
    expect(pick(primary, "capture:fits-viewport")[0]!.outcome).toBe("pass");
    const bound = pick(primary, "capture:height-within-bound")[0]!;
    expect(`14x: ${bound.outcome}`).toBe("14x: pass");
    expect(bound.detail).toContain("14.0x");
  }, 120_000);

  it("still fails a scrolly that runs past its OWN ceiling", async () => {
    // 3500px against a 100px box is 35x — a ~39-beat walk, past the scroll ceiling.
    const runaway = writeDoc("runaway.html", tallPage(3500));
    const r = await capture({
      artifactPath: runaway,
      format: "scrolly",
      channel: "article-web",
      outDir: join(dir, "out-runaway"),
      id: "e1",
      settleMs: 0,
      destination: SMALL,
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const primary = r.value.checks.filter((c) => c.breakpoint === "primary");
    // The overflow check stays forgiving — the ceiling is the check that catches a runaway, and
    // only one of the two files a verdict on the same number.
    expect(pick(primary, "capture:fits-viewport")[0]!.outcome).toBe("pass");
    const bound = pick(primary, "capture:height-within-bound")[0]!;
    expect(bound.outcome).toBe("fail");
    expect(bound.detail).toContain("35.0x");
  }, 120_000);

  it("keeps the ROW-DRIVEN ceiling at 10x — the per-shape number is not a blanket loosening", async () => {
    // The same 14x page, declared as the shape the 10x was actually chosen for. An html
    // interactive is not a scrolly, so it keeps the tighter ceiling.
    const tall = writeDoc("tall-rows.html", tallPage(1400));
    const r = await capture({
      artifactPath: tall,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-tall-rows"),
      id: "e1",
      settleMs: 0,
      destination: SMALL,
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const primary = r.value.checks.filter((c) => c.breakpoint === "primary");
    expect(pick(primary, "capture:height-within-bound")[0]!.outcome).toBe(
      "fail",
    );
  }, 120_000);

  it("leaves a PINNED html deliverable exactly as it was — no ceiling check, no relaxation", async () => {
    const artifactPath = writeDoc("tall-pinned.html", tallPage(1400));
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-tall-pinned"),
      id: "e1",
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const primary = r.value.checks.filter((c) => c.breakpoint === "primary");
    expect(pick(primary, "capture:fits-viewport")[0]!.outcome).toBe("fail");
    expect(pick(primary, "capture:height-within-bound")).toHaveLength(0);
    expect(r.value.images[0]!.heightPolicy).toBeUndefined();
  }, 120_000);

  it("reports an unopenable deliverable as a typed failure, never a throw", async () => {
    const r = await capture({
      artifactPath: join(dir, "gone.html"),
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-gone"),
      id: "e1",
      settleMs: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
  }, 120_000);

  // A ROLE WITH TWO TRUE SPELLINGS, measured in a real browser. The page below states its
  // unit only in the journalist's own words ("54 percent recycled") — which is what a
  // dw-chart subtitle now looks like, since the assembler stopped appending a redundant "(%)"
  // to a sentence that already says it (measured live on chart saWby, 2026-08-08). Hunting
  // for the literal "%" alone would file `furniture-missing` on a chart whose unit reaches
  // the reader perfectly well.
  const SPELLED_OUT_UNIT_DOC = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chart</title></head>
<body style="margin:0;padding:24px"><div id="root"><div style="height:200px">
  <div style="font:600 18px system-ui">Basel recycles more of its waste than any other Swiss city</div>
  <div style="font:12px system-ui">A ranking of four Swiss cities, Basel highest at 54 percent recycled</div>
</div></div></body></html>`;

  it("accepts the spelled-out unit as the same proof as the symbol", async () => {
    const artifactPath = writeDoc("spelled.html", SPELLED_OUT_UNIT_DOC);
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-spelled"),
      id: "e1",
      furniture: [{ role: "unit", text: "%", alternates: ["percent"] }],
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    const primaryChecks = r.value.checks.filter(
      (c) => c.breakpoint === "primary",
    );
    const present = pick(
      primaryChecks,
      "capture:furniture-present",
      "unit",
    )[0]!;
    expect(present.outcome).toBe("pass");
    // The record names WHICH spelling answered, so the evidence is not "a unit, somewhere".
    expect(present.detail).toBe('the unit is present, as "percent"');
    expect(
      pick(primaryChecks, "capture:furniture-in-frame", "unit")[0]!.outcome,
    ).toBe("pass");
  }, 120_000);

  it("still reports a unit that is stated in NEITHER spelling as missing", async () => {
    const artifactPath = writeDoc(
      "nounit.html",
      SPELLED_OUT_UNIT_DOC.replace("at 54 percent recycled", "highest"),
    );
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-nounit"),
      id: "e1",
      furniture: [{ role: "unit", text: "%", alternates: ["percent"] }],
      settleMs: 0,
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      pick(
        r.value.checks.filter((c) => c.breakpoint === "primary"),
        "capture:furniture-present",
        "unit",
      )[0]!.outcome,
    ).toBe("fail");
  }, 120_000);

  it("round-trips its result through JSON with no key lost (I6)", async () => {
    const artifactPath = writeDoc("json.html", componentHtml());
    const r = await capture({
      artifactPath,
      format: "interactive",
      channel: "article-web",
      outDir: join(dir, "out-json"),
      id: "e1",
      furniture: FURNITURE,
      settleMs: 0,
    });
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  }, 120_000);
});
