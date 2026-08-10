/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The class: **an annotation coloured against the page instead of against the mark it is drawn
 * over.** `annotation-ink.mjs` is the arithmetic and `annotation-ink.test.ts` mutates it; this is
 * the one that reads the ARTIFACT. It parses every committed static SVG, works out what is really
 * underneath each dashed rule and each line of text, and measures the pair.
 *
 * THREE ASSERTIONS, not one: a dashed rule must read against every mark it crosses (3:1); a line of
 * text must read against every mark it sits on (4.5:1); and **no line may be drawn through a line
 * of text.** The third exists for `12d2589d`'s defect — the age pyramid's zero spine ran through all
 * 21 of its band labels, so "85-89" read "85+89" — which was repaired with, in that commit's own
 * words, no guard of its own. This is that guard, and it looks at EVERY line, not only the dashed
 * ones, because the spine is solid.
 *
 * Measured on the corpus the day before it existed: **21 of the 32 dashed rules that cross a mark
 * at all were under the 3:1 floor**, worst at 1.20:1 (an accent rule spending 97 % of its length
 * inside a bar), and 23 texts sat on a mark they did not clear 4.5:1 against. Three chart beats
 * carried the real ones; the rest are the same two charts re-rendered as probes.
 *
 * TWO FLOORS, NOT ONE. A dashed rule is a non-text graphical object — WCAG 2.2 SC 1.4.11, 3:1.
 * Text is SC 1.4.3, 4.5:1, relaxed to 3:1 at 24px or 18.66px bold. Both come from
 * `annotation-ink.mjs` rather than being restated here, so a floor cannot drift between the
 * component that draws and the guard that checks.
 *
 * HOW IT DECIDES WHAT IS UNDERNEATH. Not by bounding-box overlap — by sampling. For a rule it takes
 * a point at each pixel CENTRE strictly inside the segment; for a text it samples a grid across the
 * measured ink box. At each point it walks the document in order and keeps the LAST filled shape
 * containing it, which is the one a reader sees. Two consequences worth stating:
 *
 *   - pixel centres, never the endpoints. `static-germany-electricity-bridge`'s four waterfall
 *     connectors run from one bar's right edge to the next bar's left edge — measured, every
 *     endpoint is exactly a bar edge — so an endpoint-sampling scan reports four crossings at
 *     1.00-1.60:1 that have zero interior area. A guard that cried wolf on that beat is a guard
 *     someone switches off.
 *   - the ground plate counts. It is the first shape in every one of these documents, so a rule
 *     that leaves the bars is measured against the page as well, which is what forces the carbon
 *     histogram's median to near-black rather than near-white.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **Anything over a `<path>` or `<polygon>`.** Point-in-polygon is not implemented; those
 *    shapes are read for their existence and skipped as backgrounds. The chart corpus draws its
 *    marks as `<rect>` and `<circle>`, so this is a real hole only for a future beat that does not.
 * 2. **Anything over a raster plate.** Every map static embeds its basemap as one `<image>`, and
 *    nothing under it can be measured from the markup. Those files are skipped WHOLE and counted —
 *    see the exclusion assertion below. What the scan CAN read in them is recorded here rather than
 *    silently dropped, because it belongs to another chantier's files: `mapmore-dot-population`
 *    prints five country names in `#000000` over `#0072B2` dots at **4.05:1** with 5-19 % of each
 *    box on the dot; `mapmore-flow-danube` and `mapgen-flowmap-video` clip a `#332288` route with
 *    their source line at 1.73:1; `map-geneva-locator` clips a marker with its own. Handed to the
 *    map chantier, not fixed here.
 * 3. **Probe directories.** A probe is a frozen measurement of a question already answered, and
 *    re-rendering one rewrites the record it exists to hold. `portrait-aspect-probe/` and
 *    `static-carbon-footprint-spread/probe/` both still carry the 1.20:1 median rule their beat has
 *    since fixed, and both say so in their own headers. Skipped by a mechanical rule — a path
 *    segment named `probe` or ending `-probe` — not by a list of files.
 * 4. **A non-dashed annotation's CONTRAST.** The contrast half discovers rules by `stroke-dasharray`,
 *    the spec's own selector, so a solid leader's colour is unmeasured here. (The strike-through
 *    half sees every line, dashed or not.) Widen the selector when a solid annotation ships.
 * 4b. **A haloed label's strike.** A ground-coloured halo painted under the glyphs
 *    (`paint-order="stroke"`) is this corpus's own answer to a rule crossing a label, and glyph-level
 *    occlusion is not something this scan can compute — so a haloed label is exempt from the strike
 *    check. M5 below proves the exemption tracks the real mechanism rather than hiding a defect. The
 *    cost, named: a halo painted in a colour that does NOT match what the label sits on passes here
 *    and still looks ragged. That has shipped in this very corpus, and a person looking caught it.
 * 5. **`opacity` below 1.** A partly transparent fill is not a background this can compute, and a
 *    rule at `opacity=0` is not drawn; both are skipped rather than guessed at.
 * 6. **Video and web.** No committed SVG per frame, no DOM here. The video path is covered by the
 *    render-time assertion in the components; the web path is not covered at all.
 *
 * THE MUTATIONS THAT REDDEN IT — three, all run 2026-08-10 in a copy of the tree under
 * `/tmp/annotation-crossing/`, never here.
 *
 * M1 — the rule half. `static-carbon-footprint-spread`'s median put back to `stroke={accent}` and
 * the beat re-rendered:
 *
 *   error: expect(received).toEqual(expected)
 *   + "proof/static-carbon-footprint-spread/static-carbon-footprint-spread-still.svg: a dashed rule
 *      in #0B7A75 measures 1.20:1 against #616161, which it crosses for 98% of its length — the
 *      floor for a non-text mark is 3:1"
 *   (fail) … should draw no dashed rule in an ink it cannot be seen in
 *   3 pass · 1 fail
 *
 * M2 — the text half, and proof the pre-filter above did not make it vacuous.
 * `static-swiss-age-pyramid`'s callout put back to the page's ink and re-rendered:
 *
 *   + "proof/static-swiss-age-pyramid/static-swiss-age-pyramid-still.svg: "55-59: the widest band
 *      (669,962)" in #000000 measures 4.05:1 against #0072B2, which 100% of its ink box lies on —
 *      the floor at 12px/700 is 4.5:1"
 *   (fail) … should print no text on a mark it cannot be read against
 *   3 pass · 1 fail
 *
 * M3 — aimed at the GUARD, not at a beat: interior sampling replaced by endpoint sampling
 * (`t = i / samples` instead of `(i + 0.5) / samples`), against the CORRECT tree:
 *
 *   + "…static-bar-top-emitters-2024-still.svg: a dashed rule in #0B7A75 measures 1.00:1 against
 *      #0B7A75, which it crosses for 0% of its length …"
 *   + "…static-germany-electricity-bridge-still.svg: … 1.00:1 against #616161 … 4% …"
 *   + "… 1.19:1 against #0072B2 … 4% …"   + "… 1.60:1 against #D55E00 … 4% …"   (×2)
 *   (fail) … should draw no dashed rule in an ink it cannot be seen in
 *   3 pass · 1 fail
 *
 * M3 is the one to read. Five findings, at 0 % and 4 % of a length — every one a segment ending
 * exactly on a bar's edge, with no interior area at all. A guard written the obvious way reports
 * all five as defects, and the beats it accuses are correct.
 *
 * M4 — the strike-through half. `static-swiss-age-pyramid`'s spine mask removed (one continuous
 * line from `plot.top` to `plot.bottom`, the drawing `12d2589d` replaced) and the beat re-rendered:
 *
 *   + "…static-swiss-age-pyramid-still.svg: a #616161 line is drawn through "0-4" for 8px of its
 *      own length, with nothing painted over it there — a rule may not strike a label it crosses"
 *   … and one for every other band label: "5-9", "10-14", "15-19", "20-24", "25-29", "30-34",
 *   "35-39", "40-44", "45-49", "50-54", "55-59", …
 *   (fail) … should draw no line through a line of text
 *
 * M5 — aimed at the halo exemption (limit 4b), to prove it tracks the mechanism rather than hiding
 * the defect. `static-diverging-bar-eu-per-capita`'s three `paintOrder="stroke"` haloes removed and
 * the beat re-rendered:
 *
 *   + "…static-diverging-bar-eu-per-capita-still.svg: a #000000 line is drawn through "−3.94" for
 *      10px …"   + the same for "−4.01", "−4.09", "−4.55"
 *   (fail) … should draw no line through a line of text
 *
 * Those four labels are EXACTLY the ones that beat's own header names as the claim defect its video
 * sibling shipped — the average rule at −4.93 striking "−3.94", "−4.01", "−4.09" and turning a minus
 * into a plus. Put the halo back and the guard goes green, because the defect is really gone.
 *
 * TWO THINGS THIS HALF DELIBERATELY DOES NOT REPORT, each argued rather than tuned:
 *
 *   - a line COVERED where it meets the text — the pyramid draws its magnitude gridlines under its
 *     bars, and a gridline hidden by an opaque bar strikes nothing;
 *   - a line under the 3:1 visibility floor against the paper it crosses. A `#D1D1D1` gridline at
 *     1.36:1 passing behind a bold value label cannot be mistaken for a glyph stroke; a `#616161`
 *     spine at 6.19:1 through an 11px band label is what turned "85-89" into "85+89". That is the
 *     floor already in `annotation-ink.mjs`, read the other way round. Without it this reports ten
 *     gridline crossings in `static-wind-vs-solar`, `static-small-multiples-solar-eu-six` and
 *     `more-dumbbell-life-expectancy-gains` that corrupt nothing — opened and looked at, all three.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  NON_TEXT_CONTRAST_FLOOR,
  inkBox,
  textContrastFloor,
  worstContrast,
} from "../../chart-beat/scripts/annotation-ink.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");

/** A probe records a measurement, not a delivered beat — see the header. */
function isProbe(path: string): boolean {
  return path
    .split(sep)
    .some((segment) => segment === "probe" || segment.endsWith("-probe"));
}

type Shape = {
  order: number;
  fill: string;
  rect?: { x: number; y: number; width: number; height: number };
  circle?: { cx: number; cy: number; r: number };
};
type Rule = {
  order: number;
  stroke: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
type Text = {
  order: number;
  haloed: boolean;
  content: string;
  fill: string;
  x: number;
  y: number;
  anchor: string;
  fontSize: number;
  fontWeight: number;
};

const NAMED: Record<string, string | null> = {
  white: "#FFFFFF",
  black: "#000000",
  none: null,
  transparent: null,
};

/** #rgb / #rrggbb / the two colour keywords this corpus uses. Anything else is not a colour this
 *  can measure, and returning `undefined` makes the caller skip rather than invent a number. */
function normaliseColour(raw: string | undefined): string | null | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (value in NAMED) return NAMED[value];
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value))
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toUpperCase();
  return undefined;
}

// Attribute names carry digits — `x1`, `y2`. A `[a-zA-Z-]+` key pattern silently drops all four
// coordinates of every `<line>`, which makes the whole rule half of this guard pass on nothing.
// That happened on the first run of this scan and is why the pattern is written out here.
function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/g))
    out[m[1]] = m[2];
  return out;
}

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

function parse(svg: string) {
  const root = attributes(svg.slice(0, svg.indexOf(">")));
  const fontFamily = root["font-family"] || "Helvetica, Arial, sans-serif";
  const shapes: Shape[] = [];
  const rules: Rule[] = [];
  const strokes: Rule[] = [];
  const texts: Text[] = [];
  let raster = false;
  let order = 0;
  const scan =
    /<(rect|circle|ellipse|line|path|polygon|polyline|image)\b([^>]*?)\/?>|<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = scan.exec(svg))) {
    order += 1;
    if (m[1] === "image") {
      raster = true;
      continue;
    }
    if (m[1]) {
      const a = attributes(m[0]);
      const opacity = Number(a.opacity ?? 1);
      const fill = normaliseColour(a.fill);
      if (fill && opacity === 1 && Number(a["fill-opacity"] ?? 1) === 1) {
        if (m[1] === "rect")
          shapes.push({
            order,
            fill,
            rect: { x: +a.x, y: +a.y, width: +a.width, height: +a.height },
          });
        else if (m[1] === "circle")
          shapes.push({
            order,
            fill,
            circle: { cx: +a.cx, cy: +a.cy, r: +a.r },
          });
      }
      const stroke = normaliseColour(a.stroke);
      if (stroke && opacity > 0 && m[1] === "line") {
        const line = {
          order,
          stroke,
          x1: +a.x1,
          y1: +a.y1,
          x2: +a.x2,
          y2: +a.y2,
        };
        // DASHED lines are the annotation layer, and go to the contrast check. EVERY line —
        // gridline, axis, spine, connector — goes to the strike-through check, because the defect
        // that check exists for was a SOLID one: the pyramid's zero spine drawn straight through
        // all 21 of its band labels, so "85-89" read "85+89".
        if (a["stroke-dasharray"]) rules.push(line);
        strokes.push(line);
      }
      continue;
    }
    const a = attributes(`<text ${m[3]}>`);
    const fill = normaliseColour(a.fill);
    const content = decodeEntities(m[4]);
    if (!fill || !content.trim()) continue;
    texts.push({
      order,
      // A ground-coloured halo painted UNDER the glyphs (`paint-order="stroke"`) is this corpus's
      // own answer to a rule crossing a label — `static-diverging-bar-eu-per-capita` carries it,
      // and its header records the claim defect in the video sibling that made it necessary. Glyph-
      // level occlusion is not something this scan can compute, so a haloed label is exempt from
      // the strike check. NAMED COST: a halo painted in a colour that does not match what the label
      // actually sits on would pass here and still look ragged, which is a defect that has shipped
      // in this very beat and was caught by a person looking, not by a scan.
      haloed:
        (a["paint-order"] || "").trim().startsWith("stroke") &&
        !!normaliseColour(a.stroke),
      content,
      fill,
      x: +a.x,
      y: +a.y,
      anchor: a["text-anchor"] || "start",
      fontSize: Number(a["font-size"] || 16),
      fontWeight: Number(a["font-weight"] || 400),
    });
  }
  return { shapes, rules, strokes, texts, raster, fontFamily };
}

/** The topmost filled shape containing a point — document order decides, as the painter does. */
function backgroundAt(shapes: Shape[], x: number, y: number): Shape | null {
  let found: Shape | null = null;
  for (const s of shapes) {
    if (s.rect) {
      if (
        x >= s.rect.x &&
        x <= s.rect.x + s.rect.width &&
        y >= s.rect.y &&
        y <= s.rect.y + s.rect.height
      )
        found = s;
    } else if (s.circle) {
      const dx = x - s.circle.cx;
      const dy = y - s.circle.cy;
      if (dx * dx + dy * dy <= s.circle.r * s.circle.r) found = s;
    }
  }
  return found;
}

const measured = new Map<
  string,
  { width: number; ascent: number; descent: number } | null
>();
function measureInk(
  text: string,
  font: { fontSize: number; fontWeight: number; fontFamily: string },
) {
  const key = `${font.fontFamily}|${font.fontWeight}|${font.fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key)!;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const baseline = 300;
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="600">` +
    `<text x="0" y="${baseline}" font-family="${font.fontFamily}" font-size="${font.fontSize}" font-weight="${font.fontWeight}">${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const out = box
    ? {
        width: box.x + box.width,
        ascent: baseline - box.y,
        descent: box.y + box.height - baseline,
      }
    : null;
  measured.set(key, out);
  return out;
}

function findSvgs(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findSvgs(p, out);
    else if (e.name.endsWith(".svg")) out.push(p);
  }
  return out;
}

const everySvg = findSvgs(PROOF).sort();
const probes = everySvg.filter((p) => isProbe(relative(TWIN, p)));
const rasterised: string[] = [];
const measurable: string[] = [];
for (const file of everySvg) {
  if (isProbe(relative(TWIN, file))) continue;
  if (parse(readFileSync(file, "utf8")).raster) rasterised.push(file);
  else measurable.push(file);
}

const ruleFindings: string[] = [];
const textFindings: string[] = [];
const strikeFindings: string[] = [];
let rulesCrossingAMark = 0;
let textsOnAMark = 0;

for (const file of measurable) {
  const label = relative(TWIN, file);
  const svg = readFileSync(file, "utf8");
  const { shapes, rules, strokes, texts, fontFamily } = parse(svg);
  const drawnStrokes = strokes.filter((s) =>
    [s.x1, s.y1, s.x2, s.y2].every((v) => Number.isFinite(v)),
  );

  for (const rule of rules) {
    if ([rule.x1, rule.y1, rule.x2, rule.y2].some((v) => !Number.isFinite(v)))
      continue;
    const length = Math.hypot(rule.x2 - rule.x1, rule.y2 - rule.y1);
    const samples = Math.max(1, Math.min(1200, Math.ceil(length)));
    const onMark = new Map<string, number>();
    for (let i = 0; i < samples; i++) {
      // Pixel CENTRES, strictly inside the segment — never `i / samples`, which lands on both
      // endpoints. See the header, and M2.
      const t = (i + 0.5) / samples;
      const under = backgroundAt(
        shapes,
        rule.x1 + (rule.x2 - rule.x1) * t,
        rule.y1 + (rule.y2 - rule.y1) * t,
      );
      if (under && under.order > 1)
        onMark.set(under.fill, (onMark.get(under.fill) || 0) + 1);
    }
    if (!onMark.size) continue;
    rulesCrossingAMark += 1;
    for (const [fill, count] of onMark) {
      const { ratio } = worstContrast(rule.stroke, [fill]);
      if (ratio < NON_TEXT_CONTRAST_FLOOR) {
        ruleFindings.push(
          `${label}: a dashed rule in ${rule.stroke} measures ${ratio.toFixed(2)}:1 against ${fill}, ` +
            `which it crosses for ${Math.round((count / samples) * 100)}% of its length — the floor for a non-text mark is ${NON_TEXT_CONTRAST_FLOOR}:1`,
        );
      }
    }
  }

  const marks = shapes.filter((s) => s.order > 1);
  for (const text of texts) {
    // A GENEROUS pre-filter, so resvg is only asked about strings that could possibly touch a mark.
    // Helvetica's widest advance is well under 0.75em, so this box is always at least as big as the
    // real ink box — it can only skip a string that is definitely clear of everything, never one
    // that is not. Without it this guard spends a minute laying out ~1300 titles and axis labels
    // that sit on bare page, and a guard people find slow is a guard people stop running.
    const roomy = {
      x:
        text.anchor === "end"
          ? text.x - text.content.length * text.fontSize * 0.75
          : text.anchor === "middle"
            ? text.x - (text.content.length * text.fontSize * 0.75) / 2
            : text.x,
      y: text.y - text.fontSize * 1.2,
      width: text.content.length * text.fontSize * 0.75,
      height: text.fontSize * 1.6,
    };
    if (
      !marks.some(
        (s) =>
          s.rect &&
          roomy.x < s.rect.x + s.rect.width &&
          s.rect.x < roomy.x + roomy.width &&
          roomy.y < s.rect.y + s.rect.height &&
          s.rect.y < roomy.y + roomy.height,
      ) &&
      !marks.some(
        (s) =>
          s.circle &&
          roomy.x < s.circle.cx + s.circle.r &&
          s.circle.cx - s.circle.r < roomy.x + roomy.width &&
          roomy.y < s.circle.cy + s.circle.r &&
          s.circle.cy - s.circle.r < roomy.y + roomy.height,
      ) &&
      // …and the same generous box against every drawn LINE's own extent, for the strike-through
      // check below. Same property: over-generous, so it can only skip a string no line comes near.
      !drawnStrokes.some(
        (l) =>
          roomy.x < Math.max(l.x1, l.x2) + 1 &&
          Math.min(l.x1, l.x2) - 1 < roomy.x + roomy.width &&
          roomy.y < Math.max(l.y1, l.y2) + 1 &&
          Math.min(l.y1, l.y2) - 1 < roomy.y + roomy.height,
      )
    )
      continue;
    const ink = measureInk(text.content, { ...text, fontFamily });
    if (!ink) continue;
    const box = inkBox({ x: text.x, y: text.y, anchor: text.anchor, ...ink });

    // A LINE DRAWN THROUGH A LINE OF TEXT. The defect this half exists for is `12d2589d`'s: the age
    // pyramid's zero spine ran from the top of the plot to the bottom, straight through all 21 of
    // its band labels, so "85-89" read "85+89" and "100+" read "100|+". The commit that repaired it
    // admits, in its own message, that it shipped with no guard of its own. This is that guard.
    //
    // It looks at EVERY line, not only the dashed ones — the spine is solid — and it asks whether
    // the line is still VISIBLE where it meets the text: a gridline covered by an opaque bar drawn
    // after it strikes nothing, and the pyramid draws its magnitude gridlines under its bars for
    // exactly that reason. Visibility is decided by the same painter's rule as everything else
    // here, restricted to shapes painted after the line.
    for (const line of text.haloed ? [] : drawnStrokes) {
      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
      const samples = Math.max(1, Math.min(1200, Math.ceil(length)));
      let through = 0;
      for (let i = 0; i < samples; i++) {
        const t = (i + 0.5) / samples;
        const px = line.x1 + (line.x2 - line.x1) * t;
        const py = line.y1 + (line.y2 - line.y1) * t;
        if (px <= box.x || px >= box.x + box.width) continue;
        if (py <= box.y || py >= box.y + box.height) continue;
        const covering = backgroundAt(shapes, px, py);
        if (covering && covering.order > line.order) continue;
        // A line only STRIKES a label if it can be mistaken for one of its glyph strokes, and a
        // line under the 3:1 visibility floor against the paper it crosses cannot be. This is not a
        // threshold picked to make the suite green — it is the floor already in `annotation-ink.mjs`
        // read the other way round, and it is the difference between the two things this scan finds:
        // a `#D1D1D1` gridline at 1.36:1 passing behind a bold value label (visible on close
        // inspection, corrupting nothing) and a `#616161` spine at 6.19:1 running through an 11px
        // band label, which is what turned "85-89" into "85+89".
        const paper = backgroundAt(shapes, px, py)?.fill ?? "#FFFFFF";
        if (worstContrast(line.stroke, [paper]).ratio < NON_TEXT_CONTRAST_FLOOR)
          continue;
        through += 1;
      }
      if (through > 0) {
        strikeFindings.push(
          `${label}: a ${line.stroke} line is drawn through "${text.content.slice(0, 60)}" for ` +
            `${through}px of its own length, with nothing painted over it there — a rule may not ` +
            `strike a label it crosses`,
        );
      }
    }

    const columns = 40;
    const rows = 5;
    const onMark = new Map<string, number>();
    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        const px = box.x + (box.width * (i + 0.5)) / columns;
        const py = box.y + (box.height * (j + 0.5)) / rows;
        const under = backgroundAt(shapes, px, py);
        if (under && under.order > 1)
          onMark.set(under.fill, (onMark.get(under.fill) || 0) + 1);
      }
    }
    if (!onMark.size) continue;
    textsOnAMark += 1;
    const floor = textContrastFloor(text);
    for (const [fill, count] of onMark) {
      const { ratio } = worstContrast(text.fill, [fill]);
      if (ratio < floor) {
        textFindings.push(
          `${label}: "${text.content.slice(0, 60)}" in ${text.fill} measures ${ratio.toFixed(2)}:1 against ${fill}, ` +
            `which ${Math.round((count / (columns * rows)) * 100)}% of its ink box lies on — the floor at ${text.fontSize}px/${text.fontWeight} is ${floor}:1`,
        );
      }
    }
  }
}

describe("every committed chart still — an annotation reads against what it is drawn over", () => {
  it("should have found something to measure, in both halves", () => {
    // Both halves of this guard went vacuously green once already, for two different reasons — the
    // attribute pattern that dropped every `x1`, and a first draft that compared bounding boxes and
    // found no text on any mark. A guard that measures nothing passes everything, so the premise is
    // pinned rather than assumed.
    expect(measurable.length).toBeGreaterThanOrEqual(12);
    expect(rulesCrossingAMark).toBeGreaterThanOrEqual(1);
    expect(textsOnAMark).toBeGreaterThanOrEqual(1);
  });

  it("should skip only the two kinds of file it cannot read, and say which", () => {
    // Not a list of filenames — two mechanical rules. If a third kind of exclusion is ever wanted,
    // it has to be written here, in the open.
    expect(probes.map((p) => relative(TWIN, p)).every(isProbe)).toBe(true);
    expect(
      rasterised.every((p) => readFileSync(p, "utf8").includes("<image")),
    ).toBe(true);
    expect([
      "probe files skipped",
      probes.length > 0,
      "raster-plated files skipped",
      rasterised.length > 0,
    ]).toEqual([
      "probe files skipped",
      true,
      "raster-plated files skipped",
      true,
    ]);
  });

  it("should draw no dashed rule in an ink it cannot be seen in", () => {
    expect(ruleFindings).toEqual([]);
  });

  it("should print no text on a mark it cannot be read against", () => {
    expect(textFindings).toEqual([]);
  });

  it("should draw no line through a line of text", () => {
    expect(strikeFindings).toEqual([]);
  });
});
