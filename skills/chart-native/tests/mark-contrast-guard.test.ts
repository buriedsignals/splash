// F2 (mark contrast on the theme ground) — checkMarkContrastOnBg + its produce wiring.
// A HOUSE-SET data mark (baseColor/accent/explicit series) that does not clear its WCAG
// contrast floor (3:1 non-text, 4.5:1 text) against the chart's CHOSEN background
// (deriveFurniture(themeBg).bg) is KEPT (brand-first) and surfaced as a render-review
// CONCERN — never a hard fail, mirroring the map single-house-fill concern. This pins
// both the pure helper and that it fires (only) on the brand-explicit path.
import { describe, it, expect } from "bun:test";
import {
  checkMarkContrastOnBg,
  MARK_CONTRAST_MIN,
  TEXT_MARK_CONTRAST_MIN,
} from "../src/core/conformance";
import { runProduceConformance } from "../src/core/produce-conformance";
import { OKABE_ITO } from "../src/core/tokens";
import barsSample from "../assets/sample-data/bars.json";

describe("checkMarkContrastOnBg — pure floor check on the derived ground", () => {
  it("exposes the WCAG floors (3:1 non-text, 4.5:1 text)", () => {
    expect(MARK_CONTRAST_MIN).toBe(3);
    expect(TEXT_MARK_CONTRAST_MIN).toBe(4.5);
  });

  it("no concern when a mark clears 3:1 on the ground (blue on white)", () => {
    expect(
      checkMarkContrastOnBg([{ color: OKABE_ITO.blue }], undefined),
    ).toEqual([]);
  });

  it("concern when a mark fails 3:1 on the ground (blue on a dark-blue ground)", () => {
    // #0072B2 on #0B3D91 (dark navy) is ~1.6:1 — both blue, the house fill vanishes.
    const c = checkMarkContrastOnBg(
      [{ color: OKABE_ITO.blue, role: "baseColor" }],
      "#0B3D91",
    );
    expect(c).toHaveLength(1);
    expect(c[0]).toContain(OKABE_ITO.blue);
    expect(c[0]).toContain("baseColor");
    expect(c[0]).toContain("non-text");
    expect(c[0]).toContain("house style");
  });

  it("checks against deriveFurniture(themeBg).bg — a hue that PASSES on white FAILS on the dark ground", () => {
    // #333333 is ~12:1 on white (passes) but near-invisible on #18181B (fails). The
    // concern firing here proves the check uses the DERIVED ground, not a fixed white.
    expect(checkMarkContrastOnBg([{ color: "#333333" }], undefined)).toEqual(
      [],
    );
    expect(
      checkMarkContrastOnBg([{ color: "#333333" }], "#18181B"),
    ).toHaveLength(1);
  });

  it("the text floor (4.5:1) bites where the non-text floor (3:1) does not", () => {
    // #808080 on white ≈ 3.95:1 — clears 3:1 as a fill, fails 4.5:1 as a label.
    expect(checkMarkContrastOnBg([{ color: "#808080" }], undefined)).toEqual(
      [],
    );
    const asText = checkMarkContrastOnBg(
      [{ color: "#808080", isText: true }],
      undefined,
    );
    expect(asText).toHaveLength(1);
    expect(asText[0]).toContain("text");
  });

  it("dedupes by hex and skips a non-#rrggbb entry without throwing", () => {
    expect(
      checkMarkContrastOnBg(
        [
          { color: "#0072B2" },
          { color: "#0072b2" }, // same hue, different case → one concern max
          { color: "rgb(0,114,178)" }, // non-hex → skipped, never passed to contrastRatio
        ],
        "#0B3D91",
      ),
    ).toHaveLength(1);
  });

  it("empty marks → empty concerns (the auto path is concern-free by construction)", () => {
    expect(checkMarkContrastOnBg([], "#18181B")).toEqual([]);
  });
});

describe("runProduceConformance — house-mark contrast concern (policy b, never a hard fail)", () => {
  // An Okabe-Ito house hue (no CVD violation) on a same-family dark ground, brand-explicit
  // so it is KEPT — the mark-contrast concern is the ONLY thing that should surface.
  const branded = {
    ...barsSample,
    baseColor: OKABE_ITO.blue,
    brandExplicit: true,
    themeBg: "#0B3D91",
    altInsight:
      "The Central branch draws more visitors than the next three combined.",
  };

  it("brand-explicit house mark that fails on the chosen ground → concern, 0 hard violations", () => {
    const r = runProduceConformance("bar", branded);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
    expect(
      r.concerns.some(
        (c) => c.includes(OKABE_ITO.blue) && c.includes("house style"),
      ),
    ).toBe(true);
  });

  it("SAME house mark WITHOUT brandExplicit → no house-mark concern (auto path stays clean)", () => {
    const auto = { ...branded };
    delete (auto as Record<string, unknown>).brandExplicit;
    const r = runProduceConformance("bar", auto);
    expect(r.concerns.some((c) => c.includes("non-text"))).toBe(false);
  });

  it("brand-explicit house mark that CLEARS the floor on its ground → no mark concern", () => {
    // same blue on the default light ground reads ~5.8:1 — a fill that is perfectly legible.
    const ok = { ...branded, themeBg: undefined };
    const r = runProduceConformance("bar", ok);
    expect(r.concerns.some((c) => c.includes("non-text"))).toBe(false);
  });
});
