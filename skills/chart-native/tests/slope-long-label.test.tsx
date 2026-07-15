import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SlopeChart, type SlopeConfig } from "../src/SlopeChart";
import {
  overflowPx,
  worstOverflowPx,
  LABEL_FIT_TOLERANCE_PX,
  type Box,
} from "../src/core/label-fit";
import { checkLabelDataIntegrity } from "../src/core/conformance";

// A slope labels each line at the LEFT with "name value" (end-anchored, in the left
// gutter). basePad.left was a hardcoded 138 — fine for the short sample ("Easton 5.2"),
// but a long category name ("Professions intermédiaires 22.0", ~31 chars ≈ 242px)
// overflowed the frame's LEFT edge. The produce-time overflow guard then hard-failed,
// and the pipeline's fallback was to re-prompt for a shorter category name AND WRITE
// THE SHORTENED NAME INTO THE DATA FIELD — a real shipped slope config had
// `rows[1].categorie = "Interm."` while its `altInsight` still said "professions
// intermédiaires" in full: data mutilated to fit the layout. The fix sizes the left
// gutter to the WIDEST actual "name value" label (leftLabelGutterPx), so the FULL name
// always renders and the guard never fires → splash never needs to shorten the data.
//
// Fixture grounded in that real artifact (teletravail-polarisation), with the true full
// name RESTORED to the row the bug had shortened to "Interm.".
const POLARISATION: SlopeConfig = {
  title:
    "Le télétravail progresse chez les cadres et intermédiaires, recule chez les employés et ouvriers",
  source: {
    name: "Dares, « Comment évolue la pratique du télétravail depuis la crise sanitaire »",
    url: "https://dares.travail-emploi.gouv.fr/x",
  },
  lang: "fr",
  unit: "%",
  labelField: "categorie",
  leftField: "2020",
  rightField: "2024",
  leftPeriod: "2020",
  rightPeriod: "2024",
  rows: [
    { "2020": 38, "2024": 52, categorie: "Cadres" },
    // the FULL name the shipped config had truncated to "Interm.":
    { "2020": 22, "2024": 27, categorie: "Professions intermédiaires" },
    { "2020": 18, "2024": 14, categorie: "Employés" },
    { "2020": 9, "2024": 4, categorie: "Ouvriers" },
  ],
};

const LONG_NAME = "Professions intermédiaires";

// Same character-width model the fit math uses (core/text.ts textWidth: 0.6·font).
// The fixture never highlights a line, so every left label is 400-weight (no bold
// inflation); the gutter is sized with 8% bold headroom, so the 0.6 estimate has slack.
const estWidth = (text: string, font: number) => text.length * font * 0.6;

/** The plot group's translate → [padding.left, padding.top] (may be fractional). */
function plotOrigin(svg: string): [number, number] {
  const m = svg.match(/translate\(([\d.]+),([\d.]+)\)/);
  if (!m) throw new Error("plot group translate not found");
  return [Number(m[1]), Number(m[2])];
}

/** The LEFT category labels: end-anchored "name value" text, in document order.
 *  All share the same x (= x1 − 10·sc = −10·sc). Content is cleaned of any React
 *  comment markers so a `{a} {b}` split (unfixed code) still reconstructs. */
function leftLabels(svg: string): { x: number; font: number; text: string }[] {
  const out: { x: number; font: number; text: string }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (!/text-anchor="end"/.test(attrs)) continue;
    const x = attrs.match(/\bx="(-?[\d.]+)"/);
    const font = attrs.match(/font-size="([\d.]+)"/);
    if (!x || !font) continue;
    const text = m[2].replace(/<!--.*?-->/g, "");
    out.push({ x: Number(x[1]), font: Number(font[1]), text });
  }
  return out;
}

function renderAt(width: number, height: number, scale = 1) {
  return renderToStaticMarkup(
    <SlopeChart
      config={POLARISATION}
      responsive={false}
      width={width}
      height={height}
      scale={scale}
    />,
  );
}

/** Assert every left label sits inside the canvas [0..W]×[0..H] within tolerance,
 *  using core/label-fit's overflow decision (the same math the render-time guard uses).
 *  Left labels are end-anchored, so their right edge is padLeft + x (x is negative)
 *  and they extend LEFT by their width. */
function expectLeftLabelsInside(svg: string, W: number, H: number) {
  const [padLeft] = plotOrigin(svg);
  const labels = leftLabels(svg);
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
      const o = overflowPx(box, bounds);
      throw new Error(
        `left label "${l.text}" overflows by ${worst.toFixed(1)}px ` +
          `(sides ${JSON.stringify(o)}); box.left=${box.left.toFixed(1)}, padLeft=${padLeft}`,
      );
    }
  }
}

describe("SlopeChart — a long left category name renders in full, never overflows or truncates", () => {
  it("renders the full 'Professions intermédiaires' name un-truncated (no ellipsis) at article-web", () => {
    const svg = renderAt(840, 480, 1);
    expect(svg).not.toContain("…");
    // reconstruct: join every left-label line — the full name survives whether it sat
    // on one line or wrapped on a space.
    const joined = leftLabels(svg)
      .map((l) => l.text)
      .join(" ");
    expect(joined).toContain(LONG_NAME);
  });

  it("keeps every left label inside the frame at article-web landscape (840×480)", () => {
    expectLeftLabelsInside(renderAt(840, 480, 1), 840, 480);
  });

  it("keeps every left label inside the frame on a tight article-web landscape (600×338)", () => {
    expectLeftLabelsInside(renderAt(600, 338, 1), 600, 338);
  });

  it("keeps every left label inside the frame at social-vertical portrait (1080×1920, scale 1.7)", () => {
    const svg = renderAt(1080, 1920, 1.7);
    expect(svg).not.toContain("…");
    const joined = leftLabels(svg)
      .map((l) => l.text)
      .join(" ");
    expect(joined).toContain(LONG_NAME);
    expectLeftLabelsInside(svg, 1080, 1920);
  });

  it("renders the full long name un-truncated on a realistic interactive (responsive) embed (680)", () => {
    const svg = renderToStaticMarkup(
      <SlopeChart
        config={POLARISATION}
        responsive
        interactive
        width={680}
        height={420}
      />,
    );
    expect(svg).not.toContain("…");
    const joined = leftLabels(svg)
      .map((l) => l.text)
      .join(" ");
    expect(joined).toContain(LONG_NAME);
    expectLeftLabelsInside(svg, 680, 420);
  });

  it("stays inside the frame with the full NAME intact even at the narrow 360 interactive guard width", () => {
    // 360 is the width the produce-time interactive label-fit guard runs at. At this
    // extreme narrowness the name wraps onto 2 lines and the trailing VALUE may
    // abbreviate — but the frame never overflows and, crucially, the underlying data
    // field ("Professions intermédiaires") is never shortened (that was the bug). The
    // full NAME is still present across the wrapped lines.
    const svg = renderToStaticMarkup(
      <SlopeChart
        config={POLARISATION}
        responsive
        interactive
        width={360}
        height={480}
      />,
    );
    expectLeftLabelsInside(svg, 360, 480);
    const joined = leftLabels(svg)
      .map((l) => l.text)
      .join(" ");
    expect(joined).toContain(LONG_NAME);
  });

  it("leaves a short-label slope unchanged — one line per row, no wrap, no regression", () => {
    const short: SlopeConfig = {
      ...POLARISATION,
      rows: [
        { "2020": 38, "2024": 52, categorie: "Cadres" },
        { "2020": 22, "2024": 27, categorie: "Interm" },
        { "2020": 18, "2024": 14, categorie: "Employés" },
        { "2020": 9, "2024": 4, categorie: "Ouvriers" },
      ],
    };
    const svg = renderToStaticMarkup(
      <SlopeChart config={short} responsive={false} width={840} height={480} />,
    );
    // exactly one end-anchored label per row (no wrap → short-label layout unchanged)
    expect(leftLabels(svg).length).toBe(short.rows.length);
    expectLeftLabelsInside(svg, 840, 480);
  });
});

// Fix E gave the slope a label-driven LEFT gutter + a ≤2-line wrap. A driven harness run
// with a genuinely EXTREME 59-char occupational name ("Professions intermédiaires de la
// santé et du travail social") surfaced two failures the ~31-char fixture above never hit:
//   (1) the wrapped 2-line "name value" block of one row VERTICALLY OVERLAPS the next
//       row's block — both dark ink, unreadable (the "black-on-black" collision the judge
//       flagged); spreadLabels de-collided by a fixed 16px that only fits SINGLE-line
//       labels, so wrapped blocks (~2×lineHeight tall) run into each other.
//   (2) at a narrow canvas the 2-line block still can't hold "name value", so wrapLabel
//       TRUNCATES the trailing VALUE with an ellipsis ("…social…", "…1480…") — data lost.
// The fix keeps the full data at every width: multi-line-aware vertical de-collision + a
// bounded label-font shrink (never a truncation). Grounded in the real case
// fix-slope-long-labels-pro (INSEE median wages by occupational category, 2019 vs 2024).
const OCCUPATIONS: SlopeConfig = {
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
  leftPeriod: "2019",
  rightPeriod: "2024",
  highlightLabel: "Aides-soignants et auxiliaires de puériculture",
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

const LONG_OCCUPATION =
  "Professions intermédiaires de la santé et du travail social";

/** Decode the few HTML entities React emits (an apostrophe → `&#x27;`), so a width /
 *  content check is on the REAL glyph string. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/** Left-gutter label lines WITH their y and (decoded) text — end-anchored, negative x. */
function leftLabelLines(
  svg: string,
): { x: number; y: number; font: number; text: string }[] {
  const out: { x: number; y: number; font: number; text: string }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (!/text-anchor="end"/.test(attrs)) continue;
    const x = attrs.match(/\bx="(-?[\d.]+)"/);
    const y = attrs.match(/\by="(-?[\d.]+)"/);
    const font = attrs.match(/font-size="([\d.]+)"/);
    if (!x || !y || !font || Number(x[1]) >= 0) continue;
    out.push({
      x: Number(x[1]),
      y: Number(y[1]),
      font: Number(font[1]),
      text: decodeEntities(m[2].replace(/<!--.*?-->/g, "")),
    });
  }
  return out;
}

function renderOcc(
  width: number,
  height: number,
  scale = 1,
  responsive = false,
  interactive = false,
) {
  return renderToStaticMarkup(
    <SlopeChart
      config={OCCUPATIONS}
      responsive={responsive}
      interactive={interactive}
      width={width}
      height={height}
      scale={scale}
    />,
  );
}

/** Assert every left-gutter label line sits inside the canvas within tolerance, using
 *  the DECODED text width (so `d'entreprise` isn't over-measured as `d&#x27;entreprise`). */
function expectOccLabelsInside(svg: string, W: number, H: number) {
  const [padLeft] = plotOrigin(svg);
  const labels = leftLabelLines(svg);
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
      const o = overflowPx(box, bounds);
      throw new Error(
        `left label "${l.text}" overflows by ${worst.toFixed(1)}px ` +
          `(sides ${JSON.stringify(o)}); padLeft=${padLeft}`,
      );
    }
  }
}

/** No two left-gutter label LINES overlap vertically — the black-on-black failure. */
function expectNoLeftLabelCollision(svg: string) {
  const [, padTop] = plotOrigin(svg);
  const boxes = leftLabelLines(svg)
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
        `left labels collide vertically by ${overlap.toFixed(1)}px: ` +
          `"${boxes[i - 1].text}" over "${boxes[i].text}"`,
      );
    }
  }
}

function expectFullOccupationPresent(svg: string) {
  const joined = leftLabelLines(svg)
    .map((l) => l.text)
    .join(" ");
  expect(joined).toContain(LONG_OCCUPATION);
}

describe("SlopeChart — an EXTREME 59-char category name: full data, no overlap, no truncation", () => {
  it("never emits an ellipsis (the value data is never truncated) at any tested width", () => {
    expect(renderOcc(600, 338, 1)).not.toContain("…");
    expect(renderOcc(840, 480, 1)).not.toContain("…");
    expect(renderOcc(1080, 1920, 1.7)).not.toContain("…");
    expect(renderOcc(1100, 620, 1, true, true)).not.toContain("…");
  });

  it("renders the full 59-char occupation name at article-web static (600×338)", () => {
    expectFullOccupationPresent(renderOcc(600, 338, 1));
  });

  it("keeps every left label inside the frame at article-web static (600×338)", () => {
    expectOccLabelsInside(renderOcc(600, 338, 1), 600, 338);
  });

  it("keeps every left label inside the frame at a wider article-web static (840×480)", () => {
    expectOccLabelsInside(renderOcc(840, 480, 1), 840, 480);
  });

  it("keeps every left label inside the frame at social-vertical portrait (1080×1920, scale 1.7)", () => {
    const svg = renderOcc(1080, 1920, 1.7);
    expectFullOccupationPresent(svg);
    expectOccLabelsInside(svg, 1080, 1920);
  });

  it("keeps the full name inside a 1100px-wide responsive interactive embed", () => {
    const svg = renderOcc(1100, 620, 1, true, true);
    expectFullOccupationPresent(svg);
    expectOccLabelsInside(svg, 1100, 620);
  });

  it("no left label overlaps another vertically (no black-on-black) at any tested width", () => {
    expectNoLeftLabelCollision(renderOcc(600, 338, 1));
    expectNoLeftLabelCollision(renderOcc(840, 480, 1));
    expectNoLeftLabelCollision(renderOcc(1080, 1920, 1.7));
    expectNoLeftLabelCollision(renderOcc(1100, 620, 1, true, true));
    expectNoLeftLabelCollision(renderOcc(360, 480, 1, true, true));
  });
});

// Belt-and-suspenders to the layout fix: label-fit is a LAYOUT concern and must NEVER
// mutate the underlying data field. The medium-confidence heuristic flags an
// abbreviation-with-trailing-period labelField value whose expansion appears in the
// title/altInsight — exactly the "Interm." ⟶ "professions intermédiaires" mutilation.
describe("checkLabelDataIntegrity — flags a data field shortened to fit the layout", () => {
  it("flags 'Interm.' when its expansion 'professions intermédiaires' is in the altInsight", () => {
    const findings = checkLabelDataIntegrity({
      labels: ["Cadres", "Interm.", "Employés", "Ouvriers"],
      title: POLARISATION.title,
      altInsight:
        "Le télétravail progresse chez les cadres et les professions intermédiaires, recule chez les employés.",
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.join(" ")).toContain("Interm.");
  });

  it("does not flag a legitimate full-name label set", () => {
    const findings = checkLabelDataIntegrity({
      labels: ["Cadres", "Professions intermédiaires", "Employés", "Ouvriers"],
      title: POLARISATION.title,
      altInsight:
        "Le télétravail progresse chez les cadres et les professions intermédiaires.",
    });
    expect(findings).toEqual([]);
  });

  it("does not flag an abbreviation whose expansion is absent from title/altInsight", () => {
    const findings = checkLabelDataIntegrity({
      labels: ["Jan.", "Feb.", "Mar."],
      title: "Monthly rainfall peaked in the spring",
      altInsight: "Rainfall was highest in the spring months.",
    });
    expect(findings).toEqual([]);
  });

  it("does not flag short abbreviations (St., Dr.) — too short to be a truncated name", () => {
    const findings = checkLabelDataIntegrity({
      labels: ["St.", "Dr."],
      title: "Saint and Doctor titles are common",
      altInsight: "Saint and Doctor appear often.",
    });
    expect(findings).toEqual([]);
  });
});
