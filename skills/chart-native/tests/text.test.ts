import { describe, it, expect } from "bun:test";
import { scaleBand } from "d3-scale";
import {
  wrapLabel,
  textWidth,
  rotatedLabelDescentPx,
  rotatedLabelFitPx,
  ROTATED_TICK_ANGLE_DEG,
  bandStepPx,
  verticalCatBudgetPx,
  verticalCatLines,
  verticalCatMaxLines,
  endLabelGutterPx,
  humanizeColumn,
} from "../src/core/text";

const F = 13; // base axis font
const cos = (deg: number) => Math.cos((deg * Math.PI) / 180);
const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);

describe("rotatedLabelDescentPx — bottom margin a rotated tick label needs", () => {
  it("is sinθ · width", () => {
    expect(rotatedLabelDescentPx(200, 40)).toBeCloseTo(sin(40) * 200, 5);
  });

  it("grows with the label width", () => {
    expect(rotatedLabelDescentPx(200)).toBeGreaterThan(
      rotatedLabelDescentPx(100),
    );
  });

  it("is never negative", () => {
    expect(rotatedLabelDescentPx(-5)).toBe(0);
    expect(rotatedLabelDescentPx(0)).toBe(0);
  });
});

describe("rotatedLabelFitPx — width that keeps the readable START on-canvas", () => {
  it("places the rotated label's far (start) end exactly at safeLeft", () => {
    const tickX = 161;
    const safeLeft = 4;
    const maxPx = rotatedLabelFitPx(tickX, safeLeft, 40);
    const startX = tickX - cos(40) * maxPx;
    expect(startX).toBeCloseTo(safeLeft, 5);
  });

  it("gives a wider budget to a tick further from the left edge", () => {
    expect(rotatedLabelFitPx(600, 4)).toBeGreaterThan(
      rotatedLabelFitPx(120, 4),
    );
  });

  it("is 0 when the tick sits at or left of the safe margin", () => {
    expect(rotatedLabelFitPx(4, 4)).toBe(0);
    expect(rotatedLabelFitPx(2, 10)).toBe(0);
  });

  it("uses the shared −40° tick angle by default", () => {
    expect(ROTATED_TICK_ANGLE_DEG).toBe(40);
    expect(rotatedLabelFitPx(161, 4)).toBeCloseTo(
      rotatedLabelFitPx(161, 4, 40),
      5,
    );
  });
});
describe("wrapLabel — fit long labels onto ≤2 lines", () => {
  it("returns the text as one line when it already fits", () => {
    expect(wrapLabel("Action sociale", 1000, F)).toEqual(["Action sociale"]);
  });

  it("wraps a long multi-word label onto two lines, each within maxPx", () => {
    const label = "Administration générale et finances";
    const maxPx = textWidth("Administration générale", F) + 2; // force a break
    const lines = wrapLabel(label, maxPx, F, 2);
    expect(lines.length).toBe(2);
    for (const l of lines)
      expect(textWidth(l, F)).toBeLessThanOrEqual(maxPx + 1);
    // no words are dropped (last line may carry an ellipsis, but the words are there)
    expect(lines.join(" ")).toContain("Administration");
  });

  it("truncates the last line only when the remaining words still overflow", () => {
    const label =
      "Direction générale des infrastructures et de la mobilité urbaine";
    const lines = wrapLabel(label, 120, F, 2);
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("truncates a single unbreakable word rather than looping", () => {
    expect(wrapLabel("Supercalifragilisticexpialidocious", 60, F)).toEqual([
      // one word → no wrap point → falls back to truncate
      wrapLabel("Supercalifragilisticexpialidocious", 60, F)[0],
    ]);
    expect(
      wrapLabel("Supercalifragilisticexpialidocious", 60, F)[0].endsWith("…"),
    ).toBe(true);
  });
});

describe("bandStepPx — d3 scaleBand centre-to-centre step", () => {
  it("matches d3's scaleBand.step() at the shared 0.28 padding", () => {
    for (const [range, n] of [
      [944, 5],
      [760, 8],
      [500, 3],
    ] as const) {
      const d3step = scaleBand<number>()
        .domain([...Array(n).keys()])
        .range([0, range])
        .padding(0.28)
        .step();
      expect(bandStepPx(range, n)).toBeCloseTo(d3step, 5);
    }
  });

  it("equals the centre-to-centre distance of adjacent bands", () => {
    const s = scaleBand<number>()
      .domain([0, 1, 2, 3, 4])
      .range([0, 944])
      .padding(0.28);
    const centre = (i: number) => (s(i) ?? 0) + s.bandwidth() / 2;
    expect(bandStepPx(944, 5)).toBeCloseTo(centre(1) - centre(0), 5);
  });

  it("never divides by less than one band", () => {
    expect(bandStepPx(300, 0)).toBe(300); // n=0 → denominator clamped to 1
  });
});

describe("verticalCatBudgetPx — wrap budget for a centred column label", () => {
  it("is the band step less a one-character gutter", () => {
    expect(verticalCatBudgetPx(178, 22)).toBe(156);
  });
  it("is never negative", () => {
    expect(verticalCatBudgetPx(10, 22)).toBe(0);
  });
});

describe("verticalCatLines — wrap a column label, never a clipped stub", () => {
  const STEP = bandStepPx(944, 5); // portrait 9:16 inner width, 5 columns ≈ 178.8px
  const FONT = 22.1; // TYPE.axis * 1.7 (portrait scale)

  it("keeps a short name on one line, unchanged", () => {
    expect(verticalCatLines("Spotify", STEP, FONT)).toEqual(["Spotify"]);
  });

  it("wraps a long two-word name onto two lines instead of truncating", () => {
    const lines = verticalCatLines("YouTube Music", STEP, FONT);
    expect(lines.length).toBe(2);
    expect(lines.join(" ")).toBe("YouTube Music"); // nothing dropped
    expect(lines.some((l) => l.includes("…"))).toBe(false); // no ellipsis
  });

  it("never emits a single truncated stub while a 2nd line is available", () => {
    for (const name of [
      "Apple Music",
      "Amazon Music",
      "Tencent Music",
      "YouTube Music",
    ]) {
      const lines = verticalCatLines(name, STEP, FONT);
      expect(lines.join(" ")).toBe(name);
      expect(lines.some((l) => l.endsWith("…"))).toBe(false);
    }
  });
});

describe("verticalCatMaxLines — rows a column-label block needs", () => {
  const STEP = bandStepPx(944, 5);
  const FONT = 22.1;

  it("is 1 when every label fits on one line (no reserve, no regression)", () => {
    expect(verticalCatMaxLines(["USA", "JAM", "GBR"], STEP, FONT)).toBe(1);
  });

  it("is 2 when at least one label must wrap", () => {
    expect(verticalCatMaxLines(["Spotify", "YouTube Music"], STEP, FONT)).toBe(
      2,
    );
  });
});

describe("humanizeColumn — raw CSV header → reader-facing axis label", () => {
  it("de-snakes a snake_case column and capitalizes the first letter only", () => {
    // the shipped-bug cases: axis titles rendered as raw headers verbatim
    expect(humanizeColumn("pib_par_habitant")).toBe("Pib par habitant");
    expect(humanizeColumn("esperance_vie")).toBe("Esperance vie");
    expect(humanizeColumn("class_size")).toBe("Class size");
    expect(humanizeColumn("pass_rate")).toBe("Pass rate");
  });

  it("de-kebabs a kebab-case column", () => {
    expect(humanizeColumn("pass-rate")).toBe("Pass rate");
    expect(humanizeColumn("gdp-per-capita")).toBe("Gdp per capita");
  });

  it("splits a camelCase column at the hump", () => {
    expect(humanizeColumn("passRate")).toBe("Pass Rate");
    expect(humanizeColumn("gdpPerCapita")).toBe("Gdp Per Capita");
  });

  it("leaves an already-spaced human label untouched (never mangles it)", () => {
    expect(humanizeColumn("PIB par habitant")).toBe("PIB par habitant");
    expect(humanizeColumn("Unemployment rate")).toBe("Unemployment rate");
    expect(humanizeColumn("Espérance de vie (années)")).toBe(
      "Espérance de vie (années)",
    );
  });

  it("leaves a plain single token untouched (no separator / hump → not an identifier)", () => {
    // don't force-case a bare word or an acronym — the guard only fires on a raw identifier
    expect(humanizeColumn("unemployment")).toBe("unemployment");
    expect(humanizeColumn("inflation")).toBe("inflation");
    expect(humanizeColumn("GDP")).toBe("GDP");
    expect(humanizeColumn("score")).toBe("score");
  });
});

describe("endLabelGutterPx — right-edge band-label gutter fits the widest", () => {
  const AXIS = 13; // TYPE.axis, unscaled

  it("keeps the floor for short labels (no regression on existing layouts)", () => {
    // "Gaz 110" etc. all measure well under 116px → gutter stays at the sample's 116
    expect(
      endLabelGutterPx(["Gaz 110", "Nucléaire 30", "Charbon 180"], AXIS, {
        gapPx: 8,
        floorPx: 116,
        bold: true,
      }),
    ).toBe(116);
  });

  it("grows past the floor so a long series name+value never clips", () => {
    // "Renouvelables 280" is 17 chars → 17·13·0.6·1.08 ≈ 143px + 8 gap ≈ 152 > 116
    const g = endLabelGutterPx(["Renouvelables 280"], AXIS, {
      gapPx: 8,
      floorPx: 116,
      bold: true,
    });
    expect(g).toBeGreaterThan(116);
    // the widest label + its gap must fit inside the reserved gutter
    expect(g).toBeGreaterThanOrEqual(8 + textWidth("Renouvelables 280", AXIS));
  });

  it("sizes to the WIDEST label, not the last", () => {
    const wide = endLabelGutterPx(["A 1", "Renouvelables 280", "B 2"], AXIS, {
      gapPx: 8,
      floorPx: 116,
      bold: true,
    });
    const narrow = endLabelGutterPx(["A 1", "B 2", "C 3"], AXIS, {
      gapPx: 8,
      floorPx: 116,
      bold: true,
    });
    expect(wide).toBeGreaterThan(narrow);
  });
});
