import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StackedAreaChart,
  type StackedAreaConfig,
} from "../src/StackedAreaChart";

// A stacked area labels each band at the right edge with "name value" (bold). The
// gutter was a hardcoded 116px — fine for the sample, but a long series name+value
// ("Renouvelables 280", 17 chars ≈ 143px bold) overflowed it and rendered clipped
// as "Renouvelables 28" (Wave 7, render-confirmed on the German electricity mix).
// The fix sizes the right gutter to the WIDEST actual label (endLabelGutterPx),
// floored at 116 so short-label charts keep their layout. This test locks the
// rendered right edge of every band label inside the canvas.
const MIX: StackedAreaConfig = {
  title: "Le nucléaire s'efface, les renouvelables prennent la tête du mix",
  source: { name: "AGEB", url: "https://ag-energiebilanzen.de" },
  lang: "fr",
  unit: "Production électrique (TWh)",
  xField: "annee",
  seriesFields: ["Charbon", "Nucléaire", "Gaz", "Renouvelables"],
  rows: [
    { annee: 2005, Charbon: 300, Nucléaire: 160, Gaz: 70, Renouvelables: 60 },
    { annee: 2014, Charbon: 250, Nucléaire: 100, Gaz: 75, Renouvelables: 150 },
    { annee: 2023, Charbon: 180, Nucléaire: 30, Gaz: 110, Renouvelables: 280 },
  ],
};

const decode = (t: string) =>
  t
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
// same character-width model the reservation math uses (bold-inflated at the edge)
const estWidth = (text: string, font: number) =>
  text.length * font * 0.6 * 1.08;

/** The plot group's translate → [padding.left, padding.top]. */
function plotOrigin(svg: string): [number, number] {
  const m = svg.match(/translate\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)/);
  if (!m) throw new Error("plot group translate not found");
  return [Number(m[1]), Number(m[2])];
}

/** The right-edge band labels: bold (font-weight 700), start-anchored "name value". */
function bandLabels(svg: string) {
  const out: { x: number; font: number; text: string }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = m[1];
    if (!/text-anchor="start"/.test(attrs) || !/font-weight="700"/.test(attrs))
      continue;
    const x = attrs.match(/\bx="([\d.]+)"/);
    const font = attrs.match(/font-size="([\d.]+)"/);
    if (!x || !font) continue;
    out.push({ x: Number(x[1]), font: Number(font[1]), text: decode(m[2]) });
  }
  return out;
}

function renderAt(width: number, height: number) {
  return renderToStaticMarkup(
    <StackedAreaChart
      config={MIX}
      responsive={false}
      width={width}
      height={height}
    />,
  );
}

describe("StackedAreaChart — right-edge band labels never clip", () => {
  it("renders one bold band label per series with its full value", () => {
    const labels = bandLabels(renderAt(840, 480));
    expect(labels.length).toBe(4);
    // the load-bearing case: the full value 280 is present, not clipped to 28
    expect(labels.some((l) => l.text === "Renouvelables 280")).toBe(true);
  });

  it("keeps every band label's right edge inside the canvas (840×480)", () => {
    const W = 840;
    const svg = renderAt(W, 480);
    const [padLeft] = plotOrigin(svg);
    for (const l of bandLabels(svg)) {
      const rightEdge = padLeft + l.x + estWidth(l.text, l.font);
      expect(rightEdge).toBeLessThanOrEqual(W);
    }
  });

  it("still fits on the tight article-web landscape canvas (600×338)", () => {
    const W = 600;
    const svg = renderAt(W, 338);
    const [padLeft] = plotOrigin(svg);
    for (const l of bandLabels(svg)) {
      const rightEdge = padLeft + l.x + estWidth(l.text, l.font);
      expect(rightEdge).toBeLessThanOrEqual(W);
    }
  });
});
