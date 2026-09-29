// THE ROW FLOOR — what a declaration must say, what the page must carry, and when a scroll is the
// floor's. `render-web.mjs`'s `rowFloorCss` / `stampRowFloor` / `assertRowFloor` / `rowFloorVerdict`.
//
// The ruling (issue #78): legibility beats fitting the window. A beat whose marks sit in rows may
// declare the pitch its labels need; wherever the ratio-derived cell gives less, the cell grows
// taller and the page may scroll — for that reason only. What is held here is the structure and the
// verdict; the browser half (the cell actually grows at 375 and not at 1400, and `verify-web.mjs`
// accepts only the attributable scroll) is `row-floor-in-a-browser.test.ts`.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertRowFloor,
  buildCss,
  rowFloorCellPx,
  rowFloorCss,
  rowFloorVerdict,
  stampRowFloor,
  webDocument,
} from "../scripts/render-web.mjs";
import { cellHeightPx, cellWidthPx, rowFloorCellPx as keyedRowFloorCellPx } from "../assets/keyed-note.ts";
import { FLOOR, FURNITURE, PLOT, rowMarkup, rowPage } from "./row-floor-fixture.ts";

describe("a beat that declares no floor is the page it was", () => {
  it("emits no floor rule and no attribute, so the stylesheet is byte for byte unchanged", () => {
    const without = buildCss({ ...FURNITURE, plot: PLOT });
    const explicitNull = buildCss({ ...FURNITURE, plot: PLOT, rowFloor: null });
    expect(explicitNull).toBe(without);
    expect(without).not.toContain("THE ROW FLOOR");
    expect(without).not.toContain("data-row-floor");
    expect(without).not.toContain("atan2");
    expect(stampRowFloor(rowMarkup(), null)).toBe(rowMarkup());
    expect(() => rowPage()).not.toThrow();
  });
});

describe("rowFloorCss — the floor as CSS, scoped to the declaration", () => {
  const css = rowFloorCss(FLOOR, PLOT);

  it("floors the cell at px × viewBox height / pitch", () => {
    // 18 px a row, 40 of 400 units a row → the cell is at least 180 px tall.
    expect(rowFloorCellPx(FLOOR, PLOT.height)).toBe(180);
    expect(css).toContain("--row-floor-cell: 180px;");
    expect(css).toContain("min-height: max(120px, calc(var(--row-floor-cell) + var(--x-axis-h)));");
  });

  it("lets the cell leave its ratio in ONE direction only — taller — and never touches --cell-w", () => {
    expect(css).toContain(
      "--cell-h: min(var(--track-h), max(calc(var(--track-w) * 400 / 800), var(--row-floor-cell)));",
    );
    // Comments aside, --cell-w is never DECLARED here: the counter-scale below only reads it.
    expect(css.replace(/\/\*[^]*?\*\//g, "")).not.toMatch(/--cell-w\s*:/);
  });

  it("counter-scales every circle and ellipse by what the floor added, at the viewBox's own ratio", () => {
    // (cell-w / 800) / (cell-h / 400) as a number: 1 where the floor does not bind, < 1 where it does.
    expect(css).toContain(
      ".chart-figure[data-row-floor] svg.chart :is(circle, ellipse) {\n" +
        "  transform-box: fill-box;\n" +
        "  transform-origin: center;\n" +
        "  transform: scale(1, round(nearest, tan(atan2(calc(var(--cell-w) * 400), calc(var(--cell-h) * 800))), 0.0001));\n" +
        "}",
    );
  });

  it("scopes every rule to the figure's data-row-floor, which is how verify-web takes it away", () => {
    const selectors = [...css.replace(/\/\*[^]*?\*\//g, "").matchAll(/^([^{}\n]+)\{/gm)].map((m) => m[1].trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) expect(s.startsWith(".chart-figure[data-row-floor]")).toBe(true);
  });

  it("keeps the frame's bottom margin inside the scroll", () => {
    expect(css).toContain(".chart-figure[data-row-floor] { padding-bottom: 0; }");
    expect(css).toContain(`.chart-figure[data-row-floor]::after { content: ""; flex: 0 0 24px; }`);
  });

  it("refuses a declaration that is not a measurement of rows", () => {
    expect(() => rowFloorCss({ ...FLOOR, rows: 1 }, PLOT)).toThrow(/at least two/);
    expect(() => rowFloorCss({ ...FLOOR, pitch: 0 }, PLOT)).toThrow(/row centres/);
    expect(() => rowFloorCss({ ...FLOOR, px: 3 }, PLOT)).toThrow(/MEASURED box height/);
    expect(() => rowFloorCss({ ...FLOOR, px: Number.NaN }, PLOT)).toThrow(/MEASURED box height/);
    expect(() => rowFloorCss({ ...FLOOR, why: "rows" }, PLOT)).toThrow(/ARGUE itself/);
    expect(() => rowFloorCss({ ...FLOOR, rows: 11 }, PLOT)).toThrow(/describes a different plate/);
  });

  it("carries the same arithmetic as keyed-note.ts, and cellWidthPx/cellHeightPx read the floor", () => {
    expect(keyedRowFloorCellPx(FLOOR, PLOT.height)).toBe(rowFloorCellPx(FLOOR, PLOT.height));
    expect(rowFloorCellPx({ px: 19, pitch: 40 }, 436)).toBe(keyedRowFloorCellPx({ px: 19, pitch: 40 }, 436));
    const at = { frame: PLOT, box: { width: 860, height: 428 }, gutterPx: 60, axisPx: 28, floorCellPx: 180 };
    // Measured in Chrome on the fixture page: 267 × 180 at 375 px, 1290 × 645 at 1400 px.
    expect(cellWidthPx(327, at)).toBe(267);
    expect(cellHeightPx(327, at)).toBe(180);
    expect(Math.round(cellWidthPx(1352, at))).toBe(1290);
    expect(Math.round(cellHeightPx(1352, at))).toBe(645);
    // …and without the floor the phone cell is its ratio, 267 × 133.5.
    expect(cellHeightPx(327, { ...at, floorCellPx: 0 })).toBe(133.5);
  });
});

describe("assertRowFloor — the written page against the declaration", () => {
  it("accepts a page the trunk wrote from the declaration", () => {
    expect(() => rowPage({ rowFloor: FLOOR })).not.toThrow();
    expect(stampRowFloor(rowMarkup(), FLOOR)).toContain(
      '<figure class="chart-figure" data-row-floor="18" data-row-pitch="40" data-rows="10"',
    );
  });

  const page = (markup: string, rowFloor: typeof FLOOR | null) =>
    webDocument({
      lang: "en",
      title: "t",
      css: buildCss({ ...FURNITURE, plot: PLOT, rowFloor }),
      markup,
      script: "",
    });

  it("refuses a floor on the page that nothing declared", () => {
    const html = page(stampRowFloor(rowMarkup(), FLOOR), FLOOR);
    expect(() => assertRowFloor(html, null)).toThrow(/handed no row-floor declaration/);
  });

  it("refuses a declaration the page does not carry, or carries with other numbers", () => {
    expect(() => assertRowFloor(page(rowMarkup(), null), FLOOR)).toThrow(/says nothing about it/);
    const html = page(stampRowFloor(rowMarkup(), FLOOR), FLOOR);
    expect(() => assertRowFloor(html.replace('data-row-floor="18"', 'data-row-floor="12"'), FLOOR)).toThrow(
      /carries data-row-floor="12"/,
    );
    expect(() => assertRowFloor(html.replace("--row-floor-cell: 180px", "--row-floor-cell: 120px"), FLOOR)).toThrow(
      /need exactly 180px/,
    );
    expect(() =>
      assertRowFloor(html.replace("* 400 / 800), var(--row-floor-cell)", "* 500 / 800), var(--row-floor-cell)"), FLOOR),
    ).toThrow(/keep the viewBox's own ratio/);
    expect(() => assertRowFloor(html.replace("calc(var(--cell-w) * 400)", "calc(var(--cell-w) * 500)"), FLOOR)).toThrow(
      /counter-scale at the viewBox's own ratio \(400\/800\); the page carries 500\/800/,
    );
    expect(() => assertRowFloor(html.replace(/svg\.chart :is\(circle, ellipse\) \{[^}]*\}/, ""), FLOOR)).toThrow(
      /the page carries no such rule/,
    );
  });

  it("refuses a floored plot that draws a shape the counter-scale cannot keep, and accepts round marks of any size", () => {
    const withShape = (svgInner: string) =>
      page(stampRowFloor(rowMarkup(), FLOOR).replace("</svg>", `${svgInner}</svg>`), FLOOR);
    expect(() => assertRowFloor(withShape('<polygon points="0,0 10,0 5,8"/>'), FLOOR)).toThrow(/<polygon>/);
    expect(() => assertRowFloor(withShape('<image href="x.png" width="4" height="4"/>'), FLOOR)).toThrow(/<image>/);
    expect(() => assertRowFloor(withShape('<use href="#m"/>'), FLOOR)).toThrow(/<use>/);
    // Round marks are counter-scaled, so neither a row marker nor a symbol spanning rows (r > pitch / 2)
    // nor an ellipse is distorted any more — `row-floor-in-a-browser.test.ts` measures all three round.
    expect(() => assertRowFloor(withShape('<circle cx="50" cy="50" r="6" fill="#0b7a75"/>'), FLOOR)).not.toThrow();
    expect(() => assertRowFloor(withShape('<circle cx="50" cy="50" r="30" fill="#0b7a75"/>'), FLOOR)).not.toThrow();
    expect(() => assertRowFloor(withShape('<ellipse cx="1" cy="1" rx="2" ry="3"/>'), FLOOR)).not.toThrow();
    expect(() => assertRowFloor(withShape('<circle cx="50" cy="50" r="30" fill="transparent"/>'), FLOOR)).not.toThrow();
    // …except one whose own transform the rule's would replace, or whose entrance owns the property.
    expect(() =>
      assertRowFloor(withShape('<circle transform="translate(4 0)" cx="50" cy="50" r="6" fill="#0b7a75"/>'), FLOOR),
    ).toThrow(/<circle> round .* a transform of its own/);
    expect(() =>
      assertRowFloor(withShape('<ellipse data-entrance-motion="land" cx="1" cy="1" rx="2" ry="3"/>'), FLOOR),
    ).toThrow(/<ellipse> round .* a data-entrance-motion of its own/);
    expect(() =>
      assertRowFloor(withShape('<circle style="transform:scale(2)" cx="50" cy="50" r="6" fill="#0b7a75"/>'), FLOOR),
    ).toThrow(/an inline transform/);
    // A transform-origin is not a transform; a group may carry either.
    expect(() =>
      assertRowFloor(withShape('<g transform="translate(4 0)"><circle style="transform-origin:0 0" cx="5" cy="5" r="6" fill="#0b7a75"/></g>'), FLOOR),
    ).not.toThrow();
  });

  it("is run by renderWeb on every page it writes", () => {
    const source = readFileSync(join(import.meta.dirname, "../scripts/render-web.mjs"), "utf8");
    expect(source).toMatch(/assertRowFloor\(html, rowFloor, name \?\? "this beat"\);/);
    expect(source).toMatch(/markup = stampRowFloor\(markup, rowFloor, name \?\? "this beat"\);/);
  });
});

describe("rowFloorVerdict — the only scroll verify-web accepts", () => {
  it("passes a page that fits, declared or not", () => {
    expect(rowFloorVerdict({ declared: false, overflowPx: 0 }).ok).toBe(true);
    expect(rowFloorVerdict({ declared: true, overflowPx: 1 }).ok).toBe(true);
  });

  it("fails an undeclared page that overflows, however little", () => {
    const v = rowFloorVerdict({ declared: false, overflowPx: 20 });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/declares no row floor/);
  });

  it("passes a declared page that fits without its floor, by what the floor added", () => {
    const v = rowFloorVerdict({ declared: true, overflowPx: 20, overflowWithoutFloorPx: 0, floorGrowthPx: 45 });
    expect(v).toMatchObject({ ok: true, attributablePx: 20 });
  });

  it("fails a declared page that would overflow without its floor too", () => {
    const v = rowFloorVerdict({ declared: true, overflowPx: 200, overflowWithoutFloorPx: 88, floorGrowthPx: 88 });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/still overflows by 88px/);
  });

  it("fails a declared page whose overflow exceeds what the floor explains", () => {
    // 88 px of plot and the 24 px margin it keeps explain 112 px, and not 140.
    expect(rowFloorVerdict({ declared: true, overflowPx: 112, overflowWithoutFloorPx: 0, floorGrowthPx: 88 }).ok).toBe(true);
    const v = rowFloorVerdict({ declared: true, overflowPx: 140, overflowWithoutFloorPx: 0, floorGrowthPx: 88 });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/more than the floor explains/);
  });

  it("is what verify-web's fit check asks, after measuring the page without the attribute", () => {
    const source = readFileSync(join(import.meta.dirname, "../scripts/verify-web.mjs"), "utf8");
    expect(source).toMatch(/import \{[^}]*rowFloorVerdict[^}]*\} from "\.\/render-web\.mjs"/);
    expect(source).toMatch(/figure\.removeAttribute\("data-row-floor"\)/);
    expect(source).toMatch(/const verdict = rowFloorVerdict\(/);
  });
});
