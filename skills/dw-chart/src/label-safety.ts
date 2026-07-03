import { chromium, type Browser } from "playwright";

// Label-safety guardrail. Loads a published/exported Datawrapper chart, enumerates
// the bounding rects of every text element (series direct labels, text-annotations,
// axis tick labels, title/subtitle) and FAILS if any rect (a) extends beyond the
// chart's content box (clipped / off-canvas) or (b) intersects another text rect.
//
// This is deterministic: same DOM → same rects → same verdict. It runs headless at
// a fixed viewport so a chart that clips or overlaps a label cannot pass produce().

export interface TextRect {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelSafetyResult {
  ok: boolean;
  violations: string[];
  rects: TextRect[];
}

const EDGE_TOLERANCE = 1.5; // px slack for sub-pixel rounding / antialiasing
const OVERLAP_TOLERANCE = 2; // px of intersection ignored (touching descenders etc.)

function overlapArea(a: TextRect, b: TextRect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ix > OVERLAP_TOLERANCE && iy > OVERLAP_TOLERANCE ? ix * iy : 0;
}

// Pure geometry core, testable without a browser: given the content box and every
// text rect, return the list of clip/overlap violations.
export function findLabelViolations(
  content: { x: number; y: number; w: number; h: number },
  rects: TextRect[],
): string[] {
  const violations: string[] = [];
  const left = content.x - EDGE_TOLERANCE;
  const top = content.y - EDGE_TOLERANCE;
  const right = content.x + content.w + EDGE_TOLERANCE;
  const bottom = content.y + content.h + EDGE_TOLERANCE;
  for (const r of rects) {
    if (r.x < left || r.y < top || r.x + r.w > right || r.y + r.h > bottom)
      violations.push(
        `clipped: "${r.text}" extends beyond the chart content box`,
      );
  }
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (overlapArea(rects[i], rects[j]) > 0)
        violations.push(
          `overlap: "${rects[i].text}" intersects "${rects[j].text}"`,
        );
  return violations;
}

// Collect the content box + every text rect from a rendered Datawrapper chart page.
async function collect(page: import("playwright").Page): Promise<{
  content: { x: number; y: number; w: number; h: number };
  rects: TextRect[];
}> {
  return page.evaluate(() => {
    // The chart's content box: the visualization container DW renders into.
    const container =
      document.querySelector(
        ".chart-body, .dw-chart-body, main, .vis-container",
      ) || document.body;
    const cb = container.getBoundingClientRect();
    const seen = new Set<Element>();
    const rects: {
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];
    // Every leaf-ish text node: SVG <text>/<tspan> (axis ticks, direct labels,
    // annotations) and HTML text blocks (title, subtitle, annotation divs).
    const nodes = Array.from(
      document.querySelectorAll(
        "svg text, .annotation, .dw-text-annotation, .headline, .description, .title, .subtitle",
      ),
    );
    for (const el of nodes) {
      const t = (el.textContent || "").trim();
      if (!t) continue;
      // Skip a parent when a child already covers the same text (avoid self-overlap).
      let anc = el.parentElement;
      let nested = false;
      while (anc) {
        if (seen.has(anc)) {
          nested = true;
          break;
        }
        anc = anc.parentElement;
      }
      if (nested) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      seen.add(el);
      rects.push({ text: t, x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return {
      content: { x: cb.x, y: cb.y, w: cb.width, h: cb.height },
      rects,
    };
  });
}

export async function checkPublishedChart(
  url: string,
  opts: { width?: number; height?: number; browser?: Browser } = {},
): Promise<LabelSafetyResult> {
  const width = opts.width ?? 600;
  const height = opts.height ?? 450;
  const browser = opts.browser ?? (await chromium.launch());
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // DW renders progressively; wait for the axis/labels to settle.
    await page.waitForSelector("svg text", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const { content, rects } = await collect(page);
    const violations = findLabelViolations(content, rects);
    await page.close();
    return { ok: violations.length === 0, violations, rects };
  } finally {
    if (!opts.browser) await browser.close();
  }
}
