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

// Golden measurements below were captured directly from `textWidth`/`truncate`/etc
// (source: lib/core/text-fit.ts) at the exact LABELS×FONTS×WIDTHS grid above — pinned
// literals, NOT a parity check against another module's re-export of the SAME code.
// Each table is indexed [labelIndex][...] in LABELS order.

// TEXT_WIDTH[li][fi] = textWidth(LABELS[li], FONTS[fi])
const TEXT_WIDTH: number[][] = [
  [33.6, 54.6, 58.8, 92.39999999999999],
  [81.6, 132.6, 142.79999999999998, 224.4],
  [283.2, 460.2, 495.59999999999997, 778.8],
  [62.4, 101.39999999999999, 109.2, 171.6],
  [24, 39, 42, 66],
  [76.8, 124.8, 134.4, 211.2],
  [38.4, 62.4, 67.2, 105.6],
  [76.8, 124.8, 134.4, 211.2],
  [14.399999999999999, 23.4, 25.2, 39.6],
  [163.2, 265.2, 285.59999999999997, 448.8],
];

// TRUNCATE[li][fi][wi] = truncate(LABELS[li], WIDTHS[wi], FONTS[fi])
const TRUNCATE: string[][][] = [
  [
    ["Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110"],
    ["Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110"],
    ["Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110"],
    ["Gaz…", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110", "Gaz 110"],
  ],
  [
    [
      "Renouvelabl…",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
    ],
    [
      "Renouv…",
      "Renouvelables…",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
    ],
    [
      "Renouv…",
      "Renouvelables…",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
    ],
    [
      "Ren…",
      "Renouvel…",
      "Renouvelable…",
      "Renouvelables 280",
      "Renouvelables 280",
      "Renouvelables 280",
    ],
  ],
  [
    [
      "Professions…",
      "Professions intermédiair…",
      "Professions intermédiaires de la san…",
      "Professions intermédiaires de la santé et du t…",
      "Professions intermédiaires de la santé et du travail social",
      "Professions intermédiaires de la santé et du travail social",
    ],
    [
      "Profes…",
      "Professions in…",
      "Professions intermédi…",
      "Professions intermédiaires d…",
      "Professions intermédiaires de la santé et du trava…",
      "Professions intermédiaires de la santé et du travail social",
    ],
    [
      "Profes…",
      "Professions i…",
      "Professions interméd…",
      "Professions intermédiaires…",
      "Professions intermédiaires de la santé et du t…",
      "Professions intermédiaires de la santé et du travail social",
    ],
    [
      "Pro…",
      "Professi…",
      "Professions…",
      "Professions inte…",
      "Professions intermédiaires de…",
      "Professions intermédiaires de la santé et du travail social",
    ],
  ],
  [
    [
      "YouTube Mus…",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
    ],
    [
      "YouTub…",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
    ],
    [
      "YouTub…",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
    ],
    [
      "You…",
      "YouTube…",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
      "YouTube Music",
    ],
  ],
  [
    ["shops", "shops", "shops", "shops", "shops", "shops"],
    ["shops", "shops", "shops", "shops", "shops", "shops"],
    ["shops", "shops", "shops", "shops", "shops", "shops"],
    ["sho…", "shops", "shops", "shops", "shops", "shops"],
  ],
  [
    [
      "pib_par_hab…",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
    ],
    [
      "pib_pa…",
      "pib_par_habita…",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
    ],
    [
      "pib_pa…",
      "pib_par_habit…",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
    ],
    [
      "pib…",
      "pib_par_…",
      "pib_par_habi…",
      "pib_par_habitant",
      "pib_par_habitant",
      "pib_par_habitant",
    ],
  ],
  [
    ["passRate", "passRate", "passRate", "passRate", "passRate", "passRate"],
    ["passRa…", "passRate", "passRate", "passRate", "passRate", "passRate"],
    ["passRa…", "passRate", "passRate", "passRate", "passRate", "passRate"],
    ["pas…", "passRate", "passRate", "passRate", "passRate", "passRate"],
  ],
  [
    [
      "PIB par hab…",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
    ],
    [
      "PIB pa…",
      "PIB par habita…",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
    ],
    [
      "PIB pa…",
      "PIB par habit…",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
    ],
    [
      "PIB…",
      "PIB par…",
      "PIB par habi…",
      "PIB par habitant",
      "PIB par habitant",
      "PIB par habitant",
    ],
  ],
  [
    ["GDP", "GDP", "GDP", "GDP", "GDP", "GDP"],
    ["GDP", "GDP", "GDP", "GDP", "GDP", "GDP"],
    ["GDP", "GDP", "GDP", "GDP", "GDP", "GDP"],
    ["GDP", "GDP", "GDP", "GDP", "GDP", "GDP"],
  ],
  [
    [
      "Supercalifr…",
      "Supercalifragilisticexpi…",
      "Supercalifragilisticexpialidocious",
      "Supercalifragilisticexpialidocious",
      "Supercalifragilisticexpialidocious",
      "Supercalifragilisticexpialidocious",
    ],
    [
      "Superc…",
      "Supercalifragi…",
      "Supercalifragilistice…",
      "Supercalifragilisticexpialid…",
      "Supercalifragilisticexpialidocious",
      "Supercalifragilisticexpialidocious",
    ],
    [
      "Superc…",
      "Supercalifrag…",
      "Supercalifragilistic…",
      "Supercalifragilisticexpial…",
      "Supercalifragilisticexpialidocious",
      "Supercalifragilisticexpialidocious",
    ],
    [
      "Sup…",
      "Supercal…",
      "Supercalifra…",
      "Supercalifragili…",
      "Supercalifragilisticexpialido…",
      "Supercalifragilisticexpialidocious",
    ],
  ],
];

// HUMANIZE[li] = [humanizeColumn(LABELS[li]), seriesLabelFromColumn(LABELS[li])]
const HUMANIZE: [string, string][] = [
  ["Gaz 110", "Gaz 110"],
  ["Renouvelables 280", "Renouvelables 280"],
  [
    "Professions intermédiaires de la santé et du travail social",
    "Professions intermédiaires de la santé et du travail social",
  ],
  ["YouTube Music", "YouTube Music"],
  ["shops", "Shops"],
  ["Pib par habitant", "Pib par habitant"],
  ["Pass Rate", "Pass Rate"],
  ["PIB par habitant", "PIB par habitant"],
  ["GDP", "GDP"],
  ["Supercalifragilisticexpialidocious", "Supercalifragilisticexpialidocious"],
];

// ROTATED_DESCENT[li] = rotatedLabelDescentPx(textWidth(LABELS[li], 13))
const ROTATED_DESCENT: number[] = [
  35.096203488885045, 85.2336370444351, 295.81085797774534, 65.17866362221507,
  25.06871677777503, 80.21989368888009, 40.109946844440046, 80.21989368888009,
  15.041230066665017, 170.4672740888702,
];
// rotatedLabelFitPx(600, 4) — constant across labels, args fixed
const ROTATED_FIT = 778.0227444420381;

// WRAP_LABEL[li][wi][fi] = wrapLabel(LABELS[li], WIDTHS[wi], FONTS[fi])
const WRAP_LABEL: string[][][][] = [
  [
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz", "110"]],
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz 110"]],
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz 110"]],
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz 110"]],
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz 110"]],
    [["Gaz 110"], ["Gaz 110"], ["Gaz 110"], ["Gaz 110"]],
  ],
  [
    [
      ["Renouvelables", "280"],
      ["Renouvelables", "280"],
      ["Renouvelables", "280"],
      ["Renouvelables", "280"],
    ],
    [
      ["Renouvelables 280"],
      ["Renouvelables", "280"],
      ["Renouvelables", "280"],
      ["Renouvelables", "280"],
    ],
    [
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables", "280"],
    ],
    [
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
    ],
    [
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
    ],
    [
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
      ["Renouvelables 280"],
    ],
  ],
  [
    [
      ["Professions", "intermédiai…"],
      ["Professions", "interm…"],
      ["Professions", "interm…"],
      ["Professions", "int…"],
    ],
    [
      ["Professions", "intermédiaires de la san…"],
      ["Professions", "intermédiaires…"],
      ["Professions", "intermédiaire…"],
      ["Professions", "interméd…"],
    ],
    [
      ["Professions intermédiaires de la", "santé et du travail social"],
      ["Professions", "intermédiaires de la…"],
      ["Professions", "intermédiaires de la…"],
      ["Professions", "intermédiair…"],
    ],
    [
      ["Professions intermédiaires de la santé et du", "travail social"],
      ["Professions intermédiaires de", "la santé et du travail social"],
      ["Professions intermédiaires", "de la santé et du travail…"],
      ["Professions", "intermédiaires d…"],
    ],
    [
      ["Professions intermédiaires de la santé et du travail social"],
      ["Professions intermédiaires de la santé et du", "travail social"],
      ["Professions intermédiaires de la santé et du", "travail social"],
      ["Professions intermédiaires de", "la santé et du travail social"],
    ],
    [
      ["Professions intermédiaires de la santé et du travail social"],
      ["Professions intermédiaires de la santé et du travail social"],
      ["Professions intermédiaires de la santé et du travail social"],
      ["Professions intermédiaires de la santé et du travail social"],
    ],
  ],
  [
    [
      ["YouTube", "Music"],
      ["YouTube", "Music"],
      ["YouTube", "Music"],
      ["YouTube", "Mus…"],
    ],
    [
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube", "Music"],
    ],
    [
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
    ],
    [
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
    ],
    [
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
    ],
    [
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
      ["YouTube Music"],
    ],
  ],
  [
    [["shops"], ["shops"], ["shops"], ["sho…"]],
    [["shops"], ["shops"], ["shops"], ["shops"]],
    [["shops"], ["shops"], ["shops"], ["shops"]],
    [["shops"], ["shops"], ["shops"], ["shops"]],
    [["shops"], ["shops"], ["shops"], ["shops"]],
    [["shops"], ["shops"], ["shops"], ["shops"]],
  ],
  [
    [["pib_par_hab…"], ["pib_pa…"], ["pib_pa…"], ["pib…"]],
    [
      ["pib_par_habitant"],
      ["pib_par_habita…"],
      ["pib_par_habit…"],
      ["pib_par_…"],
    ],
    [
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habi…"],
    ],
    [
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
    ],
    [
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
    ],
    [
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
      ["pib_par_habitant"],
    ],
  ],
  [
    [["passRate"], ["passRa…"], ["passRa…"], ["pas…"]],
    [["passRate"], ["passRate"], ["passRate"], ["passRate"]],
    [["passRate"], ["passRate"], ["passRate"], ["passRate"]],
    [["passRate"], ["passRate"], ["passRate"], ["passRate"]],
    [["passRate"], ["passRate"], ["passRate"], ["passRate"]],
    [["passRate"], ["passRate"], ["passRate"], ["passRate"]],
  ],
  [
    [
      ["PIB par", "habitant"],
      ["PIB par", "habita…"],
      ["PIB par", "habita…"],
      ["PIB", "par…"],
    ],
    [
      ["PIB par habitant"],
      ["PIB par", "habitant"],
      ["PIB par", "habitant"],
      ["PIB par", "habitant"],
    ],
    [
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par", "habitant"],
    ],
    [
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
    ],
    [
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
    ],
    [
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
      ["PIB par habitant"],
    ],
  ],
  [
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
    [["GDP"], ["GDP"], ["GDP"], ["GDP"]],
  ],
  [
    [["Supercalifr…"], ["Superc…"], ["Superc…"], ["Sup…"]],
    [
      ["Supercalifragilisticexpi…"],
      ["Supercalifragi…"],
      ["Supercalifrag…"],
      ["Supercal…"],
    ],
    [
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilistice…"],
      ["Supercalifragilistic…"],
      ["Supercalifra…"],
    ],
    [
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialid…"],
      ["Supercalifragilisticexpial…"],
      ["Supercalifragili…"],
    ],
    [
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialido…"],
    ],
    [
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialidocious"],
      ["Supercalifragilisticexpialidocious"],
    ],
  ],
];

// WRAP_LINES[li][wi][fi] = wrapLineCount(LABELS[li], WIDTHS[wi], FONTS[fi]) — UNBOUNDED
// line count, independent of WRAP_LABEL's ≤2-line cap (diverges on the long labels).
const WRAP_LINES: number[][][] = [
  [
    [1, 1, 1, 2],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [2, 2, 2, 2],
    [1, 2, 2, 2],
    [1, 1, 1, 2],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [6, 7, 7, 9],
    [4, 5, 5, 7],
    [2, 4, 4, 5],
    [2, 2, 3, 4],
    [1, 2, 2, 2],
    [1, 1, 1, 1],
  ],
  [
    [2, 2, 2, 2],
    [1, 1, 1, 2],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [2, 2, 2, 3],
    [1, 2, 2, 2],
    [1, 1, 1, 2],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ],
];

const BAND_STEPS: number[] = [
  178.7878787878788, 91.78743961352657, 152.4390243902439,
];
const VERTICAL_BUDGET = 156.7878787878788;
// VERTICAL_LINES[li] = verticalCatLines(LABELS[li], bandStepPx(944, 5), 22.1)
const VERTICAL_LINES: string[][] = [
  ["Gaz 110"],
  ["Renouvelables", "280"],
  ["Professions", "intermédia…"],
  ["YouTube", "Music"],
  ["shops"],
  ["pib_par_ha…"],
  ["passRate"],
  ["PIB par", "habitant"],
  ["GDP"],
  ["Supercalif…"],
];
const VERTICAL_MAX_LINES = 2;
const END_GUTTER = 506;
const LEFT_GUTTER = 352.8;
const FIT_SHORT = { font: 13, lineHeight: 14.95, maxLines: 1, minGap: 18.2 };
const FIT_LONG = { font: 6.5, lineHeight: 7.475, maxLines: 2, minGap: 18.2 };

describe("core/text-fit golden measurements", () => {
  it("constants are pinned", () => {
    expect(ROTATED_TICK_ANGLE_DEG).toBe(40);
    expect(ROTATED_TICK_MAX_CHARS).toBe(24);
    expect(VERTICAL_CAT_MAX_LINES).toBe(2);
    expect(SIDE_LABEL_LINE_HEIGHT).toBe(1.15);
  });

  it("textWidth / truncate match golden values on every label × font × width", () => {
    LABELS.forEach((l, li) => {
      FONTS.forEach((f, fi) => {
        expect(textWidth(l, f)).toBe(TEXT_WIDTH[li][fi]);
        WIDTHS.forEach((w, wi) => {
          expect(truncate(l, w, f)).toBe(TRUNCATE[li][fi][wi]);
        });
      });
    });
  });

  it("humanizeColumn / seriesLabelFromColumn match golden values on every label", () => {
    LABELS.forEach((l, li) => {
      expect(humanizeColumn(l)).toBe(HUMANIZE[li][0]);
      expect(seriesLabelFromColumn(l)).toBe(HUMANIZE[li][1]);
    });
  });

  it("rotatedLabelDescentPx / rotatedLabelFitPx match golden values", () => {
    LABELS.forEach((l, li) => {
      const w = textWidth(l, 13);
      expect(rotatedLabelDescentPx(w)).toBe(ROTATED_DESCENT[li]);
      expect(rotatedLabelFitPx(600, 4)).toBe(ROTATED_FIT);
    });
  });

  it("wrapLabel / wrapLineCount match golden values on every label × width × font", () => {
    LABELS.forEach((l, li) => {
      WIDTHS.forEach((w, wi) => {
        FONTS.forEach((f, fi) => {
          expect(wrapLabel(l, w, f)).toEqual(WRAP_LABEL[li][wi][fi]);
          expect(wrapLineCount(l, w, f)).toBe(WRAP_LINES[li][wi][fi]);
        });
      });
    });
  });

  it("bandStepPx / verticalCatBudgetPx / verticalCatLines / verticalCatMaxLines match golden values", () => {
    (
      [
        [944, 5],
        [760, 8],
        [500, 3],
      ] as const
    ).forEach(([range, n], i) => {
      expect(bandStepPx(range, n)).toBe(BAND_STEPS[i]);
    });
    const step = bandStepPx(944, 5);
    LABELS.forEach((l, li) => {
      expect(verticalCatBudgetPx(step, 22)).toBe(VERTICAL_BUDGET);
      expect(verticalCatLines(l, step, 22.1)).toEqual(VERTICAL_LINES[li]);
    });
    expect(verticalCatMaxLines(LABELS, step, 22.1)).toBe(VERTICAL_MAX_LINES);
  });

  it("endLabelGutterPx / leftLabelGutterPx match golden values", () => {
    const opts = { gapPx: 8, floorPx: 116, bold: true };
    expect(endLabelGutterPx(LABELS, 13, opts)).toBe(END_GUTTER);
    const leftOpts = {
      gapPx: 8,
      floorPx: 138,
      width: 840,
      scale: 1,
      bold: true,
    };
    expect(leftLabelGutterPx(LABELS, 13, leftOpts)).toBe(LEFT_GUTTER);
  });

  it("fitSideLabels matches golden values on a short and a cramped case", () => {
    const short = ["Cadres 38.0", "Easton 5.2"];
    expect(fitSideLabels(short, 200, 60, 13)).toEqual(FIT_SHORT);
    const long = [
      "Cadres administratifs et commerciaux d'entreprise 3200.0",
      "Professions intermédiaires de la santé et du travail social 2100.0",
      "Aides-soignants et auxiliaires de puériculture 1650.0",
    ];
    expect(fitSideLabels(long, 230, 150 / 8, 13)).toEqual(FIT_LONG);
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
