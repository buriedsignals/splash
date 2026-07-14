import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DumbbellChart, type DumbbellConfig } from "../src/DumbbellChart";
import {
  worstOverflowPx,
  LABEL_FIT_TOLERANCE_PX,
  type Box,
} from "../src/core/label-fit";

// A dumbbell labels each ROW at the LEFT with the bare category name (end-anchored, in
// the left gutter). PAD_LEFT was a hardcoded 124 — fine for a short sample ("Retail"),
// but a genuinely long occupational name ("Professions intermédiaires de la santé et du
// travail social", 59 chars ≈ 460px) overflowed the frame's LEFT edge by ~230-350px at
// EVERY width (the plot just shrank; the fixed gutter never grew). Fix E gave the SLOPE
// a label-driven gutter; the dumbbell was never covered. This mirrors that treatment:
// size the gutter to the widest actual label (leftLabelGutterPx) and WRAP the rare
// over-cap name onto ≤2 lines (wrapLabel) — the full name always renders, never
// truncated, and the render-time label-fit guard never fires.
//
// Grounded in the real harness case fix-slope-long-labels-pro (INSEE median wages by
// occupational category, 2019 vs 2024).
const OCCUPATIONS: DumbbellConfig = {
  title:
    "Les métiers les moins payés ont le plus rattrapé leur salaire entre 2019 et 2024",
  source: {
    name: "INSEE, salaires nets mensuels médians par catégorie socioprofessionnelle",
    url: "https://www.insee.fr",
  },
  lang: "fr",
  unit: "€",
  labelField: "categorie",
  leftField: "s2019",
  rightField: "s2024",
  leftLabel: "2019",
  rightLabel: "2024",
  rows: [
    {
      categorie: "Cadres administratifs et commerciaux d'entreprise",
      s2019: 3200,
      s2024: 3550,
    },
    {
      categorie: "Techniciens de la maintenance industrielle",
      s2019: 2350,
      s2024: 2600,
    },
    {
      categorie: "Professeurs des écoles et instituteurs",
      s2019: 2250,
      s2024: 2480,
    },
    {
      categorie: "Professions intermédiaires de la santé et du travail social",
      s2019: 2100,
      s2024: 2380,
    },
    {
      categorie: "Personnel administratif et technique hospitalier",
      s2019: 1850,
      s2024: 2050,
    },
    {
      categorie: "Ouvriers qualifiés de la manutention et du magasinage",
      s2019: 1720,
      s2024: 1980,
    },
    {
      categorie: "Aides-soignants et auxiliaires de puériculture",
      s2019: 1650,
      s2024: 1980,
    },
    {
      categorie: "Employés de commerce et des services aux particuliers",
      s2019: 1480,
      s2024: 1720,
    },
  ],
};

const LONG_NAME = "Professions intermédiaires de la santé et du travail social";

const estWidth = (text: string, font: number) => text.length * font * 0.6;

/** Decode the few HTML entities React emits into SVG text, so a width estimate is on
 *  the REAL glyph string (an apostrophe renders as `&#x27;` — 6 chars — inflating the
 *  raw string width otherwise). */
function decode(s: string): string {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

interface TextNode {
  x: number;
  y: number;
  font: number;
  anchor: string;
  text: string;
}

function textNodes(svg: string): TextNode[] {
  const out: TextNode[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    const x = attrs.match(/\bx="(-?[\d.]+)"/);
    const y = attrs.match(/\by="(-?[\d.]+)"/);
    const font = attrs.match(/font-size="([\d.]+)"/);
    const anchor = attrs.match(/text-anchor="(\w+)"/);
    if (!x || !y || !font) continue;
    out.push({
      x: Number(x[1]),
      y: Number(y[1]),
      font: Number(font[1]),
      anchor: anchor ? anchor[1] : "start",
      text: decode(m[2].replace(/<!--.*?-->/g, "")),
    });
  }
  return out;
}

function plotOrigin(svg: string): [number, number] {
  const m = svg.match(/translate\(([\d.]+),([\d.]+)\)/);
  if (!m) throw new Error("plot group translate not found");
  return [Number(m[1]), Number(m[2])];
}

/** End-anchored labels in the LEFT gutter (negative x) = the category names. */
function categoryLabels(svg: string): TextNode[] {
  return textNodes(svg).filter((t) => t.anchor === "end" && t.x < 0);
}

function renderStatic(width: number, height: number, scale = 1) {
  return renderToStaticMarkup(
    <DumbbellChart
      config={OCCUPATIONS}
      responsive={false}
      width={width}
      height={height}
      scale={scale}
    />,
  );
}

function renderResponsive(width: number, height: number, interactive = false) {
  return renderToStaticMarkup(
    <DumbbellChart
      config={OCCUPATIONS}
      responsive
      interactive={interactive}
      width={width}
      height={height}
    />,
  );
}

/** Every category label sits inside the canvas [0..W]×[0..H] within tolerance. The
 *  labels are end-anchored, so their right edge is padLeft + x (x negative) and they
 *  extend LEFT by their estimated width. */
function expectCategoryLabelsInside(svg: string, W: number, H: number) {
  const [padLeft] = plotOrigin(svg);
  const labels = categoryLabels(svg);
  expect(labels.length).toBeGreaterThan(0);
  const bounds: Box = { left: 0, top: 0, right: W, bottom: H };
  for (const l of labels) {
    const rightEdge = padLeft + l.x;
    const box: Box = {
      left: rightEdge - estWidth(l.text, l.font),
      top: 0,
      right: rightEdge,
      bottom: l.font,
    };
    const worst = worstOverflowPx(box, bounds);
    if (worst > LABEL_FIT_TOLERANCE_PX) {
      throw new Error(
        `category label "${l.text}" overflows by ${worst.toFixed(1)}px; ` +
          `box.left=${box.left.toFixed(1)}, padLeft=${padLeft}`,
      );
    }
  }
}

/** No two category-label LINES overlap vertically (the black-on-black failure a naive
 *  2-line wrap introduces when adjacent rows are closer than the wrapped block is tall). */
function expectNoVerticalCollision(svg: string) {
  const [, padTop] = plotOrigin(svg);
  const boxes = categoryLabels(svg)
    .map((l) => ({
      top: padTop + l.y - l.font / 2,
      bottom: padTop + l.y + l.font / 2,
      text: l.text,
    }))
    .sort((a, b) => a.top - b.top);
  for (let i = 1; i < boxes.length; i++) {
    const overlap = boxes[i - 1].bottom - boxes[i].top;
    if (overlap > 2) {
      throw new Error(
        `category labels collide vertically by ${overlap.toFixed(1)}px: ` +
          `"${boxes[i - 1].text}" over "${boxes[i].text}"`,
      );
    }
  }
}

/** The full long name survives across however many lines it wrapped onto. */
function expectFullNamePresent(svg: string) {
  const joined = categoryLabels(svg)
    .map((l) => l.text)
    .join(" ");
  expect(joined).toContain(LONG_NAME);
}

describe("DumbbellChart — a long category name renders in full, never overflows or truncates", () => {
  it("never emits an ellipsis (the data is never truncated to fit) at article-web static", () => {
    expect(renderStatic(600, 338, 1)).not.toContain("…");
    expect(renderStatic(840, 480, 1)).not.toContain("…");
  });

  it("renders the full 'Professions intermédiaires…' name at article-web static (600×338)", () => {
    expectFullNamePresent(renderStatic(600, 338, 1));
  });

  it("keeps every category label inside the frame at article-web static (600×338)", () => {
    expectCategoryLabelsInside(renderStatic(600, 338, 1), 600, 338);
  });

  it("keeps every category label inside the frame at a wider article-web static (840×480)", () => {
    expectCategoryLabelsInside(renderStatic(840, 480, 1), 840, 480);
  });

  it("keeps every category label inside the frame at social-vertical portrait (1080×1920, scale 1.7)", () => {
    const svg = renderStatic(1080, 1920, 1.7);
    expect(svg).not.toContain("…");
    expectFullNamePresent(svg);
    expectCategoryLabelsInside(svg, 1080, 1920);
  });

  it("keeps the full name inside a 1100px-wide responsive interactive embed (the judge's ~230px overflow case)", () => {
    const svg = renderResponsive(1100, 620, true);
    expect(svg).not.toContain("…");
    expectFullNamePresent(svg);
    expectCategoryLabelsInside(svg, 1100, 620);
  });

  it("keeps the full name inside a narrow 360px responsive interactive embed", () => {
    const svg = renderResponsive(360, 520, true);
    expectFullNamePresent(svg);
    expectCategoryLabelsInside(svg, 360, 520);
  });

  it("never overlaps two category labels vertically (no black-on-black) at any tested width", () => {
    expectNoVerticalCollision(renderStatic(600, 338, 1));
    expectNoVerticalCollision(renderStatic(840, 480, 1));
    expectNoVerticalCollision(renderResponsive(1100, 620, true));
    expectNoVerticalCollision(renderStatic(1080, 1920, 1.7));
  });

  it("leaves a short-label dumbbell unchanged — one line per row, no wrap, no regression", () => {
    const short: DumbbellConfig = {
      ...OCCUPATIONS,
      rows: [
        { categorie: "Retail", s2019: 14, s2024: 17 },
        { categorie: "Finance", s2019: 28, s2024: 41 },
        { categorie: "Health", s2019: 22, s2024: 27 },
      ],
    };
    const svg = renderToStaticMarkup(
      <DumbbellChart
        config={short}
        responsive={false}
        width={840}
        height={480}
      />,
    );
    // exactly one end-anchored category label per row (no wrap → layout unchanged)
    expect(categoryLabels(svg).length).toBe(short.rows.length);
    expectCategoryLabelsInside(svg, 840, 480);
  });
});
