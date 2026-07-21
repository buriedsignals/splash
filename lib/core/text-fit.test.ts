import { describe, it, expect } from "bun:test";
import {
  textWidth,
  humanizeColumn,
  seriesLabelFromColumn,
  truncate,
  ROTATED_TICK_ANGLE_DEG,
  ROTATED_TICK_MAX_CHARS,
  rotatedLabelDescentPx,
  rotatedLabelFitPx,
  wrapLabel,
  VERTICAL_CAT_MAX_LINES,
  verticalCatBudgetPx,
  verticalCatLines,
  bandStepPx,
  verticalCatMaxLines,
  endLabelGutterPx,
  leftLabelGutterPx,
  SIDE_LABEL_LINE_HEIGHT,
  wrapLineCount,
  fitSideLabels,
  sourceFooterReserve,
} from "./text-fit";
// The current authoritative implementations we must stay behaviour-identical to:
import * as cnText from "../../skills/chart-native/src/core/text";

const LABELS = [
  "Gaz 110",
  "Renouvelables 280",
  "Professions intermédiaires de la santé et du travail social",
  "YouTube Music",
  "shops",
  "pib_par_habitant",
  "passRate",
  "PIB par habitant",
  "GDP",
  "Supercalifragilisticexpialidocious",
];
const FONTS = [8, 13, 14, 22];
const WIDTHS = [60, 120, 178.8, 230, 400, 1000];

describe("core/text-fit parity with chart-native core/text", () => {
  it("constants match", () => {
    expect(ROTATED_TICK_ANGLE_DEG).toBe(cnText.ROTATED_TICK_ANGLE_DEG);
    expect(ROTATED_TICK_MAX_CHARS).toBe(cnText.ROTATED_TICK_MAX_CHARS);
    expect(VERTICAL_CAT_MAX_LINES).toBe(cnText.VERTICAL_CAT_MAX_LINES);
    expect(SIDE_LABEL_LINE_HEIGHT).toBe(cnText.SIDE_LABEL_LINE_HEIGHT);
  });

  it("textWidth / truncate match on every label × font × width", () => {
    for (const l of LABELS) {
      for (const f of FONTS) {
        expect(textWidth(l, f)).toBe(cnText.textWidth(l, f));
        for (const w of WIDTHS) {
          expect(truncate(l, w, f)).toBe(cnText.truncate(l, w, f));
        }
      }
    }
  });

  it("humanizeColumn / seriesLabelFromColumn match on every label", () => {
    for (const l of LABELS) {
      expect(humanizeColumn(l)).toBe(cnText.humanizeColumn(l));
      expect(seriesLabelFromColumn(l)).toBe(cnText.seriesLabelFromColumn(l));
    }
  });

  it("rotatedLabelDescentPx / rotatedLabelFitPx match", () => {
    for (const l of LABELS) {
      const w = textWidth(l, 13);
      expect(rotatedLabelDescentPx(w)).toBe(cnText.rotatedLabelDescentPx(w));
      expect(rotatedLabelFitPx(600, 4)).toBe(cnText.rotatedLabelFitPx(600, 4));
    }
  });

  it("wrapLabel / wrapLineCount match on every label × width × font", () => {
    for (const l of LABELS) {
      for (const w of WIDTHS) {
        for (const f of FONTS) {
          expect(wrapLabel(l, w, f)).toEqual(cnText.wrapLabel(l, w, f));
          expect(wrapLineCount(l, w, f)).toBe(cnText.wrapLineCount(l, w, f));
        }
      }
    }
  });

  it("bandStepPx / verticalCatBudgetPx / verticalCatLines / verticalCatMaxLines match", () => {
    for (const [range, n] of [
      [944, 5],
      [760, 8],
      [500, 3],
    ] as const) {
      expect(bandStepPx(range, n)).toBe(cnText.bandStepPx(range, n));
    }
    const step = bandStepPx(944, 5);
    for (const l of LABELS) {
      expect(verticalCatBudgetPx(step, 22)).toBe(
        cnText.verticalCatBudgetPx(step, 22),
      );
      expect(verticalCatLines(l, step, 22.1)).toEqual(
        cnText.verticalCatLines(l, step, 22.1),
      );
    }
    expect(verticalCatMaxLines(LABELS, step, 22.1)).toBe(
      cnText.verticalCatMaxLines(LABELS, step, 22.1),
    );
  });

  it("endLabelGutterPx / leftLabelGutterPx match", () => {
    const opts = { gapPx: 8, floorPx: 116, bold: true };
    expect(endLabelGutterPx(LABELS, 13, opts)).toBe(
      cnText.endLabelGutterPx(LABELS, 13, opts),
    );
    const leftOpts = {
      gapPx: 8,
      floorPx: 138,
      width: 840,
      scale: 1,
      bold: true,
    };
    expect(leftLabelGutterPx(LABELS, 13, leftOpts)).toBe(
      cnText.leftLabelGutterPx(LABELS, 13, leftOpts),
    );
  });

  it("fitSideLabels matches on a short and a cramped case", () => {
    const short = ["Cadres 38.0", "Easton 5.2"];
    expect(fitSideLabels(short, 200, 60, 13)).toEqual(
      cnText.fitSideLabels(short, 200, 60, 13),
    );
    const long = [
      "Cadres administratifs et commerciaux d'entreprise 3200.0",
      "Professions intermédiaires de la santé et du travail social 2100.0",
      "Aides-soignants et auxiliaires de puériculture 1650.0",
    ];
    expect(fitSideLabels(long, 230, 150 / 8, 13)).toEqual(
      cnText.fitSideLabels(long, 230, 150 / 8, 13),
    );
  });
});

describe("core/text-fit sourceFooterReserve — parametrized vs the original zero-arg formula", () => {
  // The original chart-native `core/format.ts::sourceFooterReserve()` took no
  // arguments and closed over the chart-native-local `TYPE.source` (=12) design
  // token — a one-hop dependency on an engine-local font-metrics constant a
  // shared-core primitive must not import. Parametrized here as
  // `sourceFooterReserve(sourceFontPx)`; chart-native now calls it with its own
  // `TYPE.source`. This pins the exact formula (12 bottom-inset + font*1.2 line +
  // 8 clearance) so the value chart-native gets when it passes TYPE.source=12 is
  // byte-identical to the original hardcoded 12+12*1.2+8 = 34.4.
  it("matches the original formula at chart-native's TYPE.source=12", () => {
    expect(sourceFooterReserve(12)).toBeCloseTo(12 + 12 * 1.2 + 8, 10);
    expect(sourceFooterReserve(12)).toBeCloseTo(34.4, 10);
  });

  it("scales with the passed font size (generic, not hardcoded to 12)", () => {
    expect(sourceFooterReserve(20)).toBeCloseTo(12 + 20 * 1.2 + 8, 10);
  });
});
