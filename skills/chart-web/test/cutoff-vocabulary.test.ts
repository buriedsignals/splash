// twin/skills/chart-web/test/cutoff-vocabulary.test.ts
//
// The refusals `cutoff.ts` owes a reader, held here rather than by the eye. The two that a mutation
// through the real render already proves — two lines selecting the same region, and every line
// revealing a sentence the page already prints — are re-stated here at the unit, because a mutation
// proves the path is live and a test names the shape of each refusal.

import { describe, expect, it } from "bun:test";
import {
  assertCutoffDeclaration,
  cutoffCss,
  cutoffOptionsForMarkup,
  cutoffNotesForMarkup,
  cutoffRegionsForMarkup,
  CUTOFF_CLAIM_SLUG,
} from "../assets/cutoff.ts";

const FRAME = { width: 100, height: 50 };
const span = (x: number) => ({ x, y: 0, width: 10, height: 10 });
const declaration = () => ({
  label: "Le seuil",
  claim: { label: "20 °C", announce: "20 °C — le seuil du titre", spans: [span(0)] },
  options: [
    { key: "22", label: "22 °C", announce: "22 °C — plus haut", note: "Seuil 22 °C · 13 jours", spans: [span(20)] },
    { key: "24", label: "24 °C", announce: "24 °C — plus haut encore", note: "Seuil 24 °C · 4 jours", spans: [span(40)] },
  ],
});

describe("a cutoff is refused when the control would lie", () => {
  it("accepts a declaration whose lines each select their own region", () => {
    expect(() => assertCutoffDeclaration(declaration(), FRAME)).not.toThrow();
  });

  it("refuses two lines that select exactly the same region — one threshold under two names", () => {
    const d = declaration();
    d.options[1].spans = [span(20)];
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/same region of the plate/);
  });

  it("refuses a line whose region is the claim's own — the default wearing a second pill", () => {
    const d = declaration();
    d.options[0].spans = [span(0)];
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/same region of the plate/);
  });

  it("refuses a region drawn off the frame — a selection offered but not visible", () => {
    const d = declaration();
    d.options[0].spans = [{ x: 95, y: 0, width: 10, height: 10 }];
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/outside the plot's own/);
  });

  it("refuses an accessible name that does not contain the visible one (WCAG 2.5.3)", () => {
    const d = declaration();
    d.options[0].announce = "le seuil suivant";
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/WCAG 2\.5\.3 failure/);
  });

  it("refuses a line with no sentence — the derived reading would live nowhere", () => {
    const d = declaration();
    (d.options[0] as { note?: string }).note = "";
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/has no `note`/);
  });

  it("refuses a key that slugs onto the claim's reserved id", () => {
    const d = declaration();
    d.options[0].key = CUTOFF_CLAIM_SLUG;
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/reserved id/);
  });

  it("refuses a lone line — one option is not a choice", () => {
    const d = declaration();
    d.options = [];
    expect(() => assertCutoffDeclaration(d, FRAME)).toThrow(/makes this a choice/);
  });
});

describe("what the control hands the markup", () => {
  it("puts the claim first and checked, and gives it no sentence", () => {
    const options = cutoffOptionsForMarkup(declaration(), "chart-cutoff");
    expect(options[0]).toMatchObject({ id: "chart-cutoff-claim", isClaim: true });
    expect(options.filter((o) => o.isClaim)).toHaveLength(1);
    expect(cutoffNotesForMarkup(declaration()).map((n) => n.slug)).toEqual(["22", "24"]);
  });

  it("draws every line's region once, the claim's included", () => {
    expect(cutoffRegionsForMarkup(declaration()).map((r) => r.key)).toEqual([
      "claim:0",
      "22:0",
      "24:0",
    ]);
  });

  it("emits nothing at all for a beat that declares none — no dead CSS, no dead markup", () => {
    expect(cutoffCss(null, { scope: ".s", idPrefix: "p", revealMs: 1 })).toBe("");
    expect(cutoffOptionsForMarkup(null, "p")).toEqual([]);
    expect(cutoffRegionsForMarkup(null)).toEqual([]);
  });
});

describe("the stylesheet cannot be beaten by source order", () => {
  const css = cutoffCss(declaration(), { scope: ".chart-figure", idPrefix: "chart-cutoff", revealMs: 220 });

  it("hides every region with a class-weight rule and reveals with an id inside :has()", () => {
    // (0,1,0) against (1,3,0): the weights differ by construction, so no emission order can flip
    // this the way a sankey's same-specificity pair once rendered green with zero ribbons lit.
    expect(css).toContain(".chart-figure [data-cutoff-region] { visibility: hidden; }");
    expect(css).toContain(
      '.chart-figure:has(#chart-cutoff-22:checked) [data-cutoff-region^="22:"] { visibility: visible; }',
    );
  });

  it("takes every other line's region off before revealing the chosen one", () => {
    const at = '.chart-figure:has(#chart-cutoff-22:checked)';
    const off = css.indexOf(`${at} [data-cutoff-region] { visibility: hidden; }`);
    const on = css.indexOf(`${at} [data-cutoff-region^="22:"]`);
    expect(off).toBeGreaterThan(-1);
    expect(on).toBeGreaterThan(off);
  });

  it("ships the page in the claim's own state", () => {
    expect(css).toContain(
      `.chart-figure [data-cutoff-region^="${CUTOFF_CLAIM_SLUG}:"] { visibility: visible; }`,
    );
  });
});
