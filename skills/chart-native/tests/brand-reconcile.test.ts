// F2 — policy (b) brand-first + warning. reconcileBrandViolations is the pure seam
// that DOWNGRADES a CVD-safety / contrast violation to a render-review CONCERN, but
// ONLY when the failing colour is one the journalist explicitly set via the brand
// profile. A non-brand colour that fails stays a hard violation (the auto path is
// unchanged). No colour is ever rewritten — the tradeoff is surfaced, not hidden.
import { describe, it, expect } from "bun:test";
import { reconcileBrandViolations } from "../src/core/conformance";

const CVD = "data colour #E30613 is not in the Okabe-Ito set";
const CONTRAST = "text colour #F5A623 contrast 2.03:1 on #FFFFFF < 4.5:1";
const NON_A11Y = 'title too short to be an insight: "x"';

describe("reconcileBrandViolations — policy (b) brand-first bypass", () => {
  it("downgrades a CVD violation to a RECORDED concern, with the way out", () => {
    const r = reconcileBrandViolations([CVD], ["#E30613"]);
    expect(r.violations).toEqual([]);
    expect(r.concerns).toHaveLength(1);
    expect(r.concerns[0]!.kind).toBe("cvd");
    expect(r.concerns[0]!.colour).toBe("#E30613");
    expect(r.concerns[0]!.reason).toContain("#E30613");
    expect(r.concerns[0]!.reason).toContain("house style");
    // The hex is a first-class field now — recoverable without re-parsing prose — and a
    // CVD concern proposes the perceptually nearest accessible hue (never applied).
    expect(r.concerns[0]!.nearestAccessible).toBe("#D55E00");
  });

  it("downgrades a contrast violation to a RECORDED concern, with no way out by hue", () => {
    const r = reconcileBrandViolations([CONTRAST], ["#F5A623"]);
    expect(r.violations).toEqual([]);
    expect(r.concerns).toHaveLength(1);
    expect(r.concerns[0]!.kind).toBe("contrast");
    expect(r.concerns[0]!.colour).toBe("#F5A623");
    expect(r.concerns[0]!.reason).toContain("#F5A623");
    expect(r.concerns[0]!.reason).toContain("2.03:1");
    expect(r.concerns[0]!.reason).toMatch(/WCAG|4\.5/);
    // A contrast tradeoff is not fixed by swapping hue — no proposed way out.
    expect(r.concerns[0]!.nearestAccessible).toBeUndefined();
  });

  it("matches brand colours case-insensitively", () => {
    const r = reconcileBrandViolations([CVD], ["#e30613"]);
    expect(r.violations).toEqual([]);
    expect(r.concerns).toHaveLength(1);
  });

  it("KEEPS a CVD violation as a hard failure when the colour is NOT brand-explicit", () => {
    // same violation, but the brand set is a DIFFERENT colour → the failing hue was
    // auto-chosen, so a11y stays hard.
    const r = reconcileBrandViolations([CVD], ["#009E73"]);
    expect(r.violations).toEqual([CVD]);
    expect(r.concerns).toEqual([]);
  });

  it("KEEPS every violation hard when there is NO brand profile (auto path unchanged)", () => {
    for (const brand of [undefined, [] as string[]]) {
      const r = reconcileBrandViolations([CVD, CONTRAST, NON_A11Y], brand);
      expect(r.violations).toEqual([CVD, CONTRAST, NON_A11Y]);
      expect(r.concerns).toEqual([]);
    }
  });

  it("NEVER downgrades a non-a11y violation, even for a brand colour", () => {
    // a bad title / missing source / truncated baseline is a hard failure regardless
    // of brand — the bypass is scoped to CVD + contrast only.
    const r = reconcileBrandViolations([NON_A11Y, CVD], ["#E30613"]);
    expect(r.violations).toEqual([NON_A11Y]);
    expect(r.concerns).toHaveLength(1);
  });
});
