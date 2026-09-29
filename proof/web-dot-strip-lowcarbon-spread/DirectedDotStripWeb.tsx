/**
 * Sixteen European countries on two ruled strips — where the low-carbon share of their electricity
 * stood in 2000 and in 2024 — drawn THROUGH the design base and delivered as an interactive page.
 *
 * WHAT THE WEB ADDS HERE, AND WHY IT IS THIS AND NOT A TOOLTIP.
 *
 * A dot strip is the most stripped-back distribution in the catalogue and the only LOSSLESS one.
 * One axis, one dot per case, no bin, no pack, no summary: every country is drawn at its own exact
 * value and nothing else is drawn at all. A histogram gives up exact position to buy counts; a
 * boxplot gives up fifteen of sixteen observations to buy five numbers; a beeswarm gives up the
 * perpendicular to buy separation. This type gives up nothing, and what it hands back for that is
 * the reading none of the others can give: THE SHAPE OF THE FIELD, read as a shape.
 *
 * And a shape of what? Of a quantity SOMEBODY DEFINED. "The low-carbon share" is not a measurement,
 * it is a sum over a list of sources a person chose — and in European electricity that list is the
 * argument rather than the preamble to it. Nuclear is on it. Hydro is on it. Both were built decades
 * before either date on this plate. A still has to pick one list, print it in the caveat and ask to
 * be trusted, which is exactly what the static sibling does, honestly, once.
 *
 * SO THE GESTURE THIS PAGE SHIPS IS THE ONE A STILL IS STRUCTURALLY UNABLE TO MAKE: the reader
 * chooses what counts. Four rungs, each taking one more source out of the numerator, the
 * denominator — total generation — never changing:
 *
 *   le bas-carbone              (default, the static plate)   écart 95,1 -> 67,6   -27,4
 *   sans le nucléaire                                         écart 71,6 -> 72,3   +0,7
 *   sans l'hydraulique non plus                               écart 15,3 -> 75,9   +60,6
 *   le vent et le soleil seuls                                écart 11,8 -> 63,1   +51,3
 *
 * The convergence the headline states is a property of the LEGACY fleet, and it reverses the moment
 * the legacy fleet stops counting. Same sixteen countries, same two dates, same rail, same
 * denominator: whether Europe converged or came apart depends entirely on which sources you agree to
 * count. A video or a scrolly could walk the four, but on the author's clock, in the author's order,
 * once — and this comparison is a back-and-forth rather than a walk, because rung three is FURTHER
 * from rung one than rung two is and you can only see that by going back.
 *
 * WHY IT IS THIS TYPE'S GESTURE AND NOBODY ELSE'S. Because a dot strip has NOTHING TO RE-DERIVE:
 * re-define the quantity and each mark takes a new position on the same rail and the chart is
 * finished. The axis keeps its meaning, the ticks keep their numbers, the lanes keep their dates, no
 * layout runs again. A histogram would re-bin (bars change position AND height at once, so a reader
 * cannot tell which moved); a beeswarm would re-pack (marks travel across a baseline, in a direction
 * with no data in it); a boxplot would re-derive five numbers and show none of the sixteen, leaving
 * nothing to check the new definition against.
 *
 * `qualify.ts` is the vocabulary, written for this beat and argued in `BRIEF.md` against the
 * eighteen that already exist. Native radios plus CSS generated at build time: no script, no
 * listener, and the complete plate WITH a working control when JavaScript is off.
 *
 * WHAT MOVES, WHAT CUTS, AND WHAT NEVER MOVES AT ALL.
 *
 *   - Nothing moves ACROSS a rail, ever. Each country's offset from its rail is a deterministic
 *     jitter derived from its own code — the type sheet's own device, so overlap shows through
 *     transparency instead of being resolved by pushing points apart — and it is identical in all
 *     four rungs. The only axis a mark can move along is the one carrying the data.
 *   - Every dot moves LEFT or stays put, at every rung, because the ladder is a strict subtraction.
 *     That is the visible reason the owner's first arbitration asks for: the whole field moves the
 *     same way and the pill names what came out of it.
 *   - The rungs CUT, and mechanically rather than by taste. `interaction.mjs` resolves the mark
 *     under a pointer from `cx`/`cy` read once at init, and on this type the position IS the datum,
 *     so a dot animated along the rail would keep answering for the value it left. Each rung is
 *     therefore its own `<svg class="chart">`, drawn once; a hidden `<svg>` has no CTM and no
 *     focusable content, so pointer and keyboard only reach the rail on screen.
 *   - What TRAVELS is the span bar, one per rail: floor to ceiling, always rendered, `left` and
 *     `width` generated per rung and transitioned. It is the reading itself, and the two bars swap
 *     relative lengths between the first rung and the third.
 *   - NO TEXT MOVES. Not one word. Each rail's four statistics sit in a fixed row above it, one
 *     variant per rung revealed by the same `:checked`, and `qualifyStatRow` decides in one pass
 *     both what that row says and how much room it gets — which is this type's own filed defect,
 *     answered the way the sheet asks for it. See `BRIEF.md`, "The type sheet's trap".
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the field is one achromatic tone in all four
 * rungs, and colour is spent on two cases: Poland, the subject and the 2000 floor, drawn
 * unconditionally because `web-discipline.md` requires it; and France, derived rather than chosen as
 * the country that falls furthest down the ladder. Under the first rung Poland is the floor and
 * France near the top; under the last they have swapped sides.
 *
 * NO OPACITY SITS ON AN UNMEASURED FILL. The type sheet prescribes transparency so overlapping dots
 * show through each other, and this branch has twice shipped a calibrated colour then faded it, which
 * makes every number in `PALETTE.md` describe a colour the page does not paint (1,75:1 and 2,19:1).
 * So the fill is searched until the COMPOSITE — what a single dot actually shows over this
 * direction's ground — clears the non-text floor, and every number filed is that composite.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertQualifyDeclaration,
  qualifyChromeCss,
  qualifyCss,
  qualifyLayerAttrs,
  qualifyMarkAttrs,
  qualifyNotesForMarkup,
  qualifyOptionsForMarkup,
  qualifySlugOf,
  qualifyPlace,
  qualifyStatRow,
} from "../../skills/chart-web/assets/qualify.ts";
import {
  cellWidthPx,
  labelBoxPx,
  rowFloorCellPx,
  type Measure,
} from "../../skills/chart-web/assets/keyed-note.ts";

/** The frame. `laneH` is the room one rail owns, `statTop` the row of numbers heading it, `railDy`
 *  where the rail itself sits inside that room and `spanDy` where its span bar does. Every one of
 *  them is a geometry unit, and none of them is a function of any rung: the composition is fixed and
 *  the values move through it. */
export const FRAME = {
  width: 880,
  height: 300,
  xAxisRowPx: 34,
  laneH: 150,
  statTop: 4,
  railDy: 86,
  spanDy: 34,
  jitter: 22,
  /** The rail is inset by a mark's own radius at both ends. A dot at 0 % is otherwise a circle
   *  centred on the frame's left edge and the frame clips half of it — five of them, measured on
   *  the first render of the last rung. `qualifyPlace` is the single mapping; nothing here does the
   *  arithmetic twice. */
  pad: 10,
};

/** `chart-stack-` ON PURPOSE, like `aim.ts`: it is the format's own discovery prefix for a
 *  control that moves the picture, and a third grammar with its own spellings would be invisible
 *  to the guards written to hold it. See `qualify.ts`, "IT EMITS `data-stack-total`". */
const QUALIFY_ID_PREFIX = "chart-stack";
const SCOPE = ".chart-figure";
/** How long a span bar takes to reach its new length. The one transition on this page. */
const SPAN_MS = 420;
/** What a single dot shows through. The type's own device for letting overlap read. */
const DOT_ALPHA = 0.72;
const R = 6;
/** THE FLOOR AN ACCENTED DOT CLEARS AGAINST THE FIELD IT SITS IN. There is no WCAG floor for one
 *  mark against another, so this is the beat's own declared number, and it is declared rather than
 *  eyeballed because the page draws two accented dots among thirty-two and the transparency this
 *  type needs eats exactly this separation. Taken here: 1,64:1 on creme, 1,64 on rapport, 1,96 on
 *  nocturne — where the floor is not binding, the direction's own accent stands. */
const CASE_VS_FIELD_MIN = 1.6;

/** The air between a lane's heading and its statistics row when the two are stacked, and between the
 *  row's last line and the lane's own ticks. */
const HEAD_GAP_PX = 2;
/** The air between the year and the row it heads when the row hangs beside it (below `widePx`). */
const HANG_GAP_PX = 6;
/** The narrowest plot this format is verified at: a 375 px window less 2 × 24 px of frame padding. */
const NARROWEST_PLOT_PX = 327;
/** The band above a lane's dots and ticks, in geometry units: from the heading's top to the top of
 *  the ticks, which reach `jitter + 8` above the rail. */
const BAND_UNITS = FRAME.railDy - FRAME.jitter - 8 - FRAME.statTop;

/**
 * THE LANE PITCH THIS PLATE'S WORDS NEED, AND WHY A PHONE PAGE MAY SCROLL FOR IT.
 *
 * Each lane is headed by its year and by a row of four statistics. Both are words, at the
 * direction's fixed pixel size; the lane is geometry, and on a phone it closes up with the cell. At
 * 375 px, with the cell at its ratio, a lane is 45 px tall and the band above its ticks is 16 px, for
 * a heading and a row that wraps to two lines: 38–54 px of type. Every rung printed the row over its
 * year (the guard's twelve OWED sites). The owner's ruling is that legibility beats fitting the
 * window, and a dot strip's lanes are rows, so the lane declares the pitch its words need and the
 * trunk grows the cell to it (`render-web.mjs`, `rowFloorCss`).
 *
 * WHAT SITS IN THE BAND, BELOW THE WIDTH WHERE THE ROW HOLDS ONE LINE. Stacked — heading on its own
 * line, then the row — the band has to hold one line more than the row does, and the band is only
 * `BAND_UNITS` of the lane's `laneH`: measured, that asked for a 127–164 px pitch, a 254–328 px cell,
 * and a page 67–165 px past its window. So there the row HANGS: it starts at the year's own top and
 * runs beside it, indented by the year's measured width, and the year keeps its column to the left.
 * Nothing is hidden and nothing is duplicated — the same two words and the same rows are drawn at
 * every width, only placed — and the band then holds the row's own lines and no more. Where the cell
 * is wide enough for the row on one line, the stacked layout (`widePx` below) comes back unchanged.
 *
 * The pitch is then derived, never typed: the row's line count at the narrowest plot, wrapped the way
 * the browser wraps it, in every rung and both lanes, times the register's own line box, plus the
 * gap to the ticks — scaled from the band to the whole lane. It is solved rather than read once,
 * because the cell under a floor is wider than the cell at its ratio (at 375 px the ratio cell is
 * height-bound at 264 px; the floor lifts that height and the cell takes the whole 327 px track), so
 * the count is the smallest one that still holds in the cell its own floor draws.
 */
export function rowFloorFor({
  direction,
  ink,
  measure,
  stats,
  lanes,
  laneHeadings,
}: {
  direction: any;
  ink: { ink: string; muted: string; accent: string };
  measure: Measure;
  stats: { lane: string; slug: string; text: string }[];
  lanes: string[];
  laneHeadings: Record<string, string>;
}) {
  const regs = webRegisters(direction, { ink });
  const annot = regs.annot as any;
  const lead = labelBoxPx(stats[0].text, annot, measure, { chip: false }).h;
  // The year is set in the annot register at the heading's weight; the row hangs past the wider one.
  const indentPx = Math.ceil(
    Math.max(...lanes.map((l) => labelBoxPx(laneHeadings[l], { ...annot, fontWeight: 700 }, measure, { chip: false }).w)) +
      HANG_GAP_PX,
  );
  // Greedy, word by word, measuring each candidate LINE whole — what the browser does with
  // `white-space: normal`, and what `labelBoxPx` asks for (a sum of words runs short).
  const linesOf = (text: string, widthPx: number) => {
    let lines = 0;
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && labelBoxPx(next, annot, measure, { chip: false }).w > widthPx) {
        lines += 1;
        line = word;
      } else line = next;
    }
    return lines + (line ? 1 : 0);
  };
  const box = { width: FRAME.width, height: FRAME.height + FRAME.xAxisRowPx };
  const cellAt = (floorCellPx: number) =>
    cellWidthPx(NARROWEST_PLOT_PX, { frame: FRAME, box, gutterPx: 0, axisPx: FRAME.xAxisRowPx, floorCellPx });
  const pxFor = (n: number) => Math.ceil(((n * lead + HEAD_GAP_PX) * FRAME.laneH) / BAND_UNITS);
  const floorCell = (n: number) => cellAt(rowFloorCellPx({ px: pxFor(n), pitch: FRAME.laneH }, FRAME.height));
  const worstAt = (cell: number) => Math.max(...stats.map((s) => linesOf(s.text, cell - indentPx)));
  // The smallest line count that is still true once its own floor is drawn: a floor for n lines
  // widens the cell, and the rows must wrap to at most n lines in THAT cell.
  let lines = 1;
  while (lines <= 3 && worstAt(floorCell(lines)) > lines) lines += 1;
  const px = pxFor(lines);
  if (lines > 2)
    throw new Error(
      `a statistics row hung beside its year runs to ${lines} lines at the narrowest plot; the lane's band was ` +
        "measured for two, and a pitch for three is a plate with no room left for its dots",
    );
  return {
    floor: {
      rows: lanes.length,
      pitch: FRAME.laneH,
      px,
      why:
        `Each lane is headed by its year and a row of four statistics that runs to ${lines} lines at ` +
        `the narrowest page, in a band that is ${BAND_UNITS} of the lane's ${FRAME.laneH} units; under ` +
        "this pitch that row is printed over its year and into the lane's own ticks.",
    },
    lines,
    lead,
    indentPx,
    cellPx: floorCell(lines),
  };
}

export type RowFloor = ReturnType<typeof rowFloorFor>["floor"];

export type StripMark = {
  key: string;
  name: string;
  /** Its position on the shared rail, in the data's own unit. */
  value: number;
  /** Its offset from the rail, in geometry units. Jitter: deterministic, and the same in every rung. */
  across: number;
  /** One of the two cases the page accents in every rung. */
  lit: boolean;
  /** The reading this mark answers with UNDER THIS RUNG — a different question per rung. */
  detail: string;
};

export type StripLane = {
  /** The lane's own key, which is also what its span bar is tagged with. */
  key: string;
  /** The three statistics drawn as ticks on the rail: floor, median, ceiling, in the data's unit. */
  ticks: number[];
  marks: StripMark[];
};

export type StripRail = { slug: string; lanes: StripLane[] };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDotStripWeb({
  rails,
  qualify,
  lanes,
  laneHeadings,
  stats,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  rowFloor,
}: {
  rails: StripRail[];
  qualify: any;
  lanes: string[];
  laneHeadings: Record<string, string>;
  stats: { lane: string; slug: string; text: string }[];
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, options: { fontSize: number; fontWeight?: number; fontFamily?: string; fontStyle?: string }) => number;
  /** What the runner handed `renderWeb` as this page's row floor — refused unless it is the one this
   *  component derives from the same direction and the same strings. */
  rowFloor: RowFloor;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const own = rowFloorFor({ direction, ink: { ink, muted, accent }, measure, stats, lanes, laneHeadings });
  const ownFloor = own.floor;
  if (!rowFloor || rowFloor.px !== ownFloor.px || rowFloor.pitch !== ownFloor.pitch || rowFloor.rows !== ownFloor.rows)
    throw new Error(
      `the row floor handed to this page (${JSON.stringify(rowFloor ?? null)}) is not the one its own ` +
        `lanes need (${JSON.stringify(ownFloor)}) — a floor nobody derived is a scroll nobody can account for`,
    );

  // THE FIELD, MEASURED AS THE READER RECEIVES IT. A dot is painted at DOT_ALPHA, so the colour that
  // reaches the eye is the fill composited onto the ground — a different colour from the fill, and
  // the one that has to clear the floor. Searched rather than typed.
  const composite = (fill: string) => mix(ground, fill, DOT_ALPHA);
  let fieldFill = mix(ground, ink, 0.34);
  for (let d = 0.34; d <= 1.001; d += 0.02) {
    const candidate = mix(ground, ink, d);
    if (contrast(composite(candidate), ground) >= NON_TEXT_CONTRAST_MIN) {
      fieldFill = candidate;
      break;
    }
  }
  if (contrast(composite(fieldFill), ground) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `no tone of the direction's ink survives being painted at ${DOT_ALPHA} on ${ground} — a ` +
        "reader could not see the field at all",
    );

  // THE TWO CASES, MEASURED TWICE, AND THE SECOND MEASUREMENT IS THE ONE THAT MATTERS HERE. An
  // accent has to clear the non-text floor against the GROUND — that is the rule everywhere — and
  // on this type it also has to clear a floor against THE FIELD, because a dot strip's accent is
  // not marking a bar against a background, it is marking two dots among thirty-two identical ones.
  // Measured before the floor existed: painted at DOT_ALPHA the accent stood at 1,18:1 against its
  // own field on `creme` and 1,25:1 on `rapport` — the opacity eating the separation the accent was
  // calibrated for, which is this branch's own recorded defect (1,75:1 and 2,19:1) in a third
  // costume. So the search takes the first adjustment clearing BOTH, and CASE_VS_FIELD_MIN is why
  // the light directions' accent comes out deeper than the direction files it.
  let litFill = null;
  for (let target = NON_TEXT_CONTRAST_MIN; target <= 18; target += 0.25) {
    const candidate = adjustToContrast(accent, ground, target) ?? accent;
    if (
      contrast(composite(candidate), ground) >= NON_TEXT_CONTRAST_MIN &&
      contrast(composite(candidate), composite(fieldFill)) >= CASE_VS_FIELD_MIN
    ) {
      litFill = candidate;
      break;
    }
  }
  if (!litFill)
    throw new Error(
      `no adjustment of ${accent} both clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground} and ` +
        `${CASE_VS_FIELD_MIN}:1 against the field, once painted at ${DOT_ALPHA} — a case a reader ` +
        "cannot pick out of the field is not a case",
    );

  let rule = mix(ground, ink, 0.55);
  if (contrast(rule, ground) < NON_TEXT_CONTRAST_MIN)
    rule = adjustToContrast(rule, ground, NON_TEXT_CONTRAST_MIN) ?? rule;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // WHAT A DOT BECOMES UNDER THE POINTER, AND THE DOSE IS SEARCHED RATHER THAN TYPED. The owner
  // refused a fixed dose that measured 1,104:1 on nocturne, and refused three times over a ring
  // plastered on top of a mark. So the mark itself darkens, off ITS OWN painted colour — the
  // composite, not the fill — by the smallest step of the direction's ink that clears a measured gap.
  const darken = (fill: string) => {
    const shown = composite(fill);
    for (let dose = 0.1; dose <= 0.9; dose += 0.02) {
      const moved = mix(fill, ink, dose);
      if (contrast(composite(moved), shown) >= 1.14) return moved;
    }
    throw new Error(
      `no dose of the direction's ink moves ${fill} 1,14:1 off itself once painted at ${DOT_ALPHA} ` +
        "— a reader could not see which dot answered the pointer",
    );
  };

  const x = (value: number) =>
    qualifyPlace(value, { axisMax: qualify.axisMax, width: FRAME.width, pad: FRAME.pad });
  const laneTop = (i: number) => i * FRAME.laneH;
  const railY = (i: number) => laneTop(i) + FRAME.railDy;

  // Refused before anything is drawn, against what this component is actually handed.
  assertQualifyDeclaration(qualify, {
    lanes,
    keys: rails[0].lanes[0].marks.map((m) => m.key),
    movedFloor: 0.05,
    spanFloor: 0.5,
  });

  // THE TYPE'S OWN FILED DEFECT. One function measures every rung's row for every lane and returns
  // the room in the same pass, so the space reserved and the space needed cannot drift apart. It
  // refuses rather than wrapping.
  const statStyle = {
    fontSize: Number.parseFloat(regs.annot.fontSize as string),
    fontWeight: Number(regs.annot.fontWeight ?? 400),
  };
  const row = qualifyStatRow(stats, {
    measure,
    style: statStyle,
    widthPx: FRAME.width,
    lineHeightPx: Math.round(statStyle.fontSize * 1.5),
  });

  /**
   * THE STATISTICS ROW SITS ONE LINE UNDER ITS HEADING IN READER PIXELS, NOT IN GEOMETRY UNITS.
   *
   * `row.reserve` is a line height in CSS pixels, and it was added to the heading's top as if it
   * were geometry units — so the gap between "2000" and its own row was a function of the plot's
   * width: 16 px of a 18 px line at 768 (the two runs printed over each other, in all three
   * directions) and 37 px of air at 1600. Pinned in pixels, the row lands exactly one line under
   * its heading at every width where the band above the dots can hold both lines.
   *
   * WHERE IT CANNOT, IT IS NOT PRETENDED. That band is `railDy - jitter - 8 - statTop` = 52
   * geometry units above the highest dot and tick, and it holds heading + row + air only once the
   * CELL (the viewBox scaled uniformly, `render-web.mjs`'s `--cell-w`) is at least `widePx` wide —
   * and only while the row is still one line. Both numbers are measured here from the direction's
   * own annot register and the real strings; the query asks the plot, which is a size container, for
   * both of its dimensions, because the cell is the smaller of the width it is given and the width
   * its height allows.
   *
   * BELOW IT, THE ROW HANGS BESIDE ITS YEAR AND THE LANE DECLARES ITS PITCH. At 375 px the cell at
   * its ratio was 264 px wide and the 52-unit band 16 px, for 38–54 px of type, and every rung printed
   * its row over its year. Moving the row could not fix that and keying it under the plot cost a page
   * that already filled its window 33 px it could not attribute to anything. So there the row starts
   * at the year's top, indented past the year by `own.indentPx`, and the band is guaranteed by the row
   * floor `rowFloorFor` derives — the one reason this page may scroll. Above `widePx` the query puts
   * the row back under its year, full width.
   */
  const annotFamily = String(regs.annot.fontFamily).split(",")[0].replace(/"/g, "").trim();
  const annotLead = statStyle.fontSize * Number(regs.annot.lineHeight ?? 1.5);
  const annotTracking = Number.parseFloat(String(regs.annot.letterSpacing ?? "0")) || 0;
  const upper = String(regs.annot.textTransform ?? "none") === "uppercase";
  const statPx = Math.ceil(
    Math.max(
      ...stats.map(
        (s) =>
          measure(upper ? s.text.toUpperCase() : s.text, {
            fontSize: statStyle.fontSize,
            fontWeight: statStyle.fontWeight,
            fontFamily: annotFamily,
            fontStyle: regs.annot.fontStyle,
          } as any) +
          annotTracking * s.text.length,
      ),
    ),
  );
  const widePx = Math.ceil(
    Math.max(statPx + 8, (FRAME.width * (2 * annotLead + HEAD_GAP_PX)) / BAND_UNITS),
  );
  const wideHeightPx = Math.ceil((widePx * FRAME.height) / FRAME.width) + FRAME.xAxisRowPx;
  const qualifyOptions = qualifyOptionsForMarkup(qualify, QUALIFY_ID_PREFIX);
  const qualifyNotes = qualifyNotesForMarkup(qualify);
  const defaultSlug = qualifySlugOf(qualify.options[0].key);

  const css = [
    `${SCOPE} .chart-plot { --y-gutter: 0px; }`,
    qualifyChromeCss({ scope: SCOPE }),
    qualifyCss(qualify, {
      scope: SCOPE,
      idPrefix: QUALIFY_ID_PREFIX,
      spanMs: SPAN_MS,
      width: FRAME.width,
      pad: FRAME.pad,
    }),
    // The two fills' answers. Field first, case second: the second selector is one attribute heavier
    // and would win on specificity anyway, but this file does not rely on that — `stack.ts` and
    // `floor.ts` both record what happens when a generated stylesheet does.
    `${SCOPE} circle.mark-active { fill: ${darken(fieldFill)}; }`,
    `${SCOPE} circle.mark-active[data-lit="1"] { fill: ${darken(litFill)}; }`,
    // THE SPAN BAR: the reading this control hands back, drawn as a length. Always rendered, which
    // is the shape a transition needs — `display` does not interpolate.
    `${SCOPE} [data-qualify-span] { position: absolute; height: 7px; border-radius: 4px; background: ${rule}; }`,
    // The statistics row heading each rail. Its content is what `qualifyStatRow` returned; its room
    // is the band the row floor (`rowFloorFor`) and the stacked query (`widePx`) derive from the same
    // strings in the same register.
    // `white-space: normal` overrides `.note`'s own `nowrap`, which is right for a label at a mark
    // and wrong for a row that spans the plot: unwrapped, this row measured 634 px of document in a
    // 375 px window, which the format's own fit check reports as exactly that.
    `${SCOPE} [data-stack-total] { position: absolute; left: ${own.indentPx}px; max-width: calc(100% - ${own.indentPx}px); white-space: normal; }`,
    // One line under its heading, in pixels — see `widePx` above. `!important` because the narrow
    // placement is the inline `top`, which beats any generated rule; the plot is the size container.
    // Below it the row hangs beside its year, from the year's own top (the inline `top`), and the
    // floor holds the band its lines need.
    `@container (min-width: ${widePx}px) and (min-height: ${wideHeightPx}px) {`,
    `  ${SCOPE} .chart-plot .overlay [data-stack-total] { top: calc(var(--head-top) + ${Number((annotLead + HEAD_GAP_PX).toFixed(2))}px) !important; }`,
    `  ${SCOPE} .chart-plot .overlay [data-stack-total] { left: 0; max-width: 100%; }`,
    `}`,
    // The answer is four readings long and the format's box is 220px wide, which put a five-line box
    // over the control the reader had just used on a sibling beat. Bare `#tooltip`: the element is
    // the page's, not this figure's.
    `#tooltip { max-width: min(430px, 100vw - 32px); }`,
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing leaves this picture in any rung, and a strip that hid dots would be answering a
          different question from the one its pills ask. A ladder pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertQualifyDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-qualify">
        <legend>{qualify.label}</legend>
        <div className="options">
          {qualifyOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={QUALIFY_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the re-qualification bought, in words, for
          a reader who is not looking at the plot. Its row is reserved whether or not a rung is
          chosen, so choosing one never moves the plot underneath it. The default reveals none: it is
          not a counterfactual, it is the claim the title states. */}
      <div className="qualify-notes" role="status">
        {qualifyNotes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />

        {/* ONE SVG PER RUNG, stacked in the same grid cell, and only the chosen one displayed. Not
            one svg whose circles are re-placed: `interaction.mjs` reads every point's coordinates
            once at init, so dots from three hidden rungs sitting in the same node list would answer
            for values nobody is looking at — and on this type a value is the whole of what a mark
            is. A hidden svg has no CTM and is never reached. */}
        {rails.map((rail) => (
          <svg
            key={rail.slug}
            {...qualifyLayerAttrs(rail.slug)}
            role="group"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            data-hit="cell"
            viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
            preserveAspectRatio="none"
          >
            {rail.slug === defaultSlug ? <desc>{alt}</desc> : null}
            <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

            {xTicks.map((t) => (
              <line
                key={t}
                x1={x(t)}
                x2={x(t)}
                y1={0}
                y2={FRAME.height}
                stroke={grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {rail.lanes.map((lane, i) => (
              <g key={lane.key}>
                <line
                  x1={0}
                  x2={FRAME.width}
                  y1={railY(i)}
                  y2={railY(i)}
                  stroke={rule}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                {/* The rail's three statistics as TICKS, because a tick is a position and a position
                    is what this type encodes. Their NUMBERS live in the fixed row above the rail —
                    see the header: under the last rung this lane's floor, median and ceiling are
                    0,0 %, 0,3 % and 11,8 %, three labels inside 104 px of rail. */}
                {lane.ticks.map((t, k) => (
                  <line
                    key={`${t}-${k}`}
                    x1={x(t)}
                    x2={x(t)}
                    y1={railY(i) - FRAME.jitter - 8}
                    y2={railY(i) + FRAME.jitter + 8}
                    stroke={rule}
                    strokeWidth={direction.stroke?.rule ?? 0.8}
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {lane.marks.map((m) => (
                  <circle
                    key={m.key}
                    {...qualifyMarkAttrs(rail.slug, m.key)}
                    data-mark={`${rail.slug}:${lane.key}:${m.key}`}
                    data-lit={m.lit ? "1" : undefined}
                    cx={x(m.value)}
                    cy={railY(i) + m.across}
                    r={R}
                    fill={m.lit ? litFill : fieldFill}
                    fillOpacity={DOT_ALPHA}
                    stroke="none"
                  />
                ))}
              </g>
            ))}

            {/* THE HIT TARGETS. Invisible, one per dot, and never swallowing an event: the
                `.hit-area` below is last in document order and therefore on top of everything. Only
                these carry `tabIndex`, so the keyboard walks one stop per country per rail. */}
            {rail.lanes.flatMap((lane, i) =>
              lane.marks.map((m) => (
                <circle
                  key={`hit-${lane.key}-${m.key}`}
                  className="pt"
                  {...qualifyMarkAttrs(rail.slug, m.key)}
                  data-mark-ref={`${rail.slug}:${lane.key}:${m.key}`}
                  cx={x(m.value)}
                  cy={railY(i) + m.across}
                  r={R + 1}
                  fill="transparent"
                  stroke="none"
                  tabIndex={0}
                  role="img"
                  aria-label={m.detail}
                  data-detail={m.detail}
                />
              )),
            )}

            <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
          </svg>
        ))}

        {/* THE WORDS, AND NOT ONE OF THEM MOVES. Each rail's heading is invariant; its four
            statistics are one span per rung at the same anchor, revealed by the same `:checked` that
            draws the rung. The owner refused, twice, a control that shifted labels for no reason the
            eye could see. Underneath them, the one thing on this page that travels: the span bar. */}
        <div className="overlay" aria-hidden="true">
          {lanes.map((lane, i) => (
            <span key={lane}>
              <span
                className="note"
                style={{
                  ...regs.annot,
                  color: labelInk,
                  left: "0%",
                  top: `${pct(laneTop(i) + FRAME.statTop, FRAME.height)}%`,
                  background: "transparent",
                  padding: 0,
                  fontWeight: 700,
                }}
              >
                {laneHeadings[lane]}
              </span>
              {row.entries
                .filter((entry) => entry.lane === lane)
                .map((entry) => (
                  <span
                    key={`${entry.lane}-${entry.slug}`}
                    className="note"
                    data-stack-total={entry.slug}
                    style={{
                      ...regs.annot,
                      color: labelInk,
                      ["--head-top" as string]: `${pct(laneTop(i) + FRAME.statTop, FRAME.height)}%`,
                      top: `${pct(laneTop(i) + FRAME.statTop, FRAME.height)}%`,
                      background: "transparent",
                      padding: 0,
                    }}
                  >
                    {entry.text}
                  </span>
                ))}
              <span
                data-qualify-span={lane}
                style={{ top: `${pct(railY(i) + FRAME.spanDy, FRAME.height)}%` }}
              />
            </span>
          ))}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === xTicks[xTicks.length - 1] ? `${t} %` : t}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
