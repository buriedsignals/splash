/**
 * Sixteen European countries' low-carbon electricity in 2024, stacked by source, with each country's
 * 2000 total marked on its own bar — drawn THROUGH the design base and delivered as an interactive
 * page.
 *
 * `the-stack-gives-back-the-total-it-hides` — a stack's segments are easy to compare only at the
 * baseline; every one above it starts somewhere the reader cannot see. So each bar prints its own
 * total in a gutter of its own, and that total is what the ranking is built on.
 *
 * `a-segment-not-starting-at-zero-carries-its-own-number` — every segment wide enough prints its own
 * TWh inside itself, because a segment that starts at 180 and ends at 240 is a length nobody can
 * read off an axis.
 *
 * THE EARLIER TOTAL IS A TICK ON THE BAR, NOT A SECOND BAR. What the headline is about is the
 * ADDITION, and an addition is the distance between a mark and the end of the bar it sits on.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO NEIGHBOUR'S.
 *
 * A stacked bar hands the reader exactly ONE comparison for free, and which one is not a matter of
 * taste: only the bottom segment is measured from a common baseline. Every segment above it starts
 * at its own row's partial sum, so a band that ends further right may well be the shorter one. The
 * totals are honest and every internal comparison is not — the type's whole structural weakness,
 * and `types/stacked-bar.md` puts it in those terms: "Precise comparison of an INNER segment across
 * columns is exactly what this type can't give you."
 *
 * Which is exactly the question this plate's own headline provokes. Spain's +118,9 TWh is almost
 * entirely solar and wind — 115,7 of the 118,9 — and both of those bands float. Worse, on this data
 * the failure has a systematic direction: France's nuclear base pushes every one of her bands to the
 * far right of the plate whatever its size, so a reader ranking by right edge puts France first on
 * wind, first on solar and first on biomass, where she is fourth on all three.
 *
 * So the reader picks a source and gets, under every bar, in a lane of its own, a RAIL: that
 * country's band for that source, drawn a second time, from the plate's own zero, at the plate's own
 * scale, against the plate's own graduations — `../../skills/chart-web/assets/rebase.ts`, written
 * for this beat.
 *
 * AND NOTHING IN THE STACK MOVES. Not a bar, not a segment, not a tick, not a word. That is the
 * decision the whole vocabulary rests on, and it is a decision against the two obvious neighbours:
 * `floor.ts` (the streamgraph's) and `stack.ts` (`proof/webx-electricity-mix`'s) both give a band a
 * baseline by MOVING IT THERE, and in a stacked bar that is a reorder — which this type's own sheet
 * forbids outright, requiring an order "IDENTICAL across every single column" and recording that a
 * reorder "also shifts the position of every segment sitting above the swap". A band laid flat here
 * buys its baseline by destroying the composition and every total's position, which is the one
 * comparison the type gives honestly. So the reader keeps both, in the same row: where the band sits,
 * and how long it is.
 *
 * THE SEGMENT IS WHAT ANSWERS A POINTER, NEVER A DOT ON TOP OF IT. Each `.pt` names the rect it
 * speaks for (`data-mark-ref` -> `data-mark`) and the rect takes `--mark-active`, searched off ITS
 * OWN fill until a measured separation is cleared — per tone, per direction, refused rather than
 * dosed. Before this, the invisible point named nothing and the format's stylesheet filled it with
 * `--muted`: a grey dot floating over the bar, which is the owner's second arbitration exactly.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import {
  assertRebaseDeclaration,
  rebaseChromeCss,
  rebaseCss,
  rebaseNotesForMarkup,
  rebaseOptionsForMarkup,
  rebaseRailAttrs,
  type RebaseDeclaration,
} from "../../skills/chart-web/assets/rebase.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a
 *  control that moves the picture and owes the reader a sentence, not a copy-paste slip: see
 *  `rebase.ts`, "IT EMITS `data-stack-note`". */
const REBASE_ID_PREFIX = "chart-stack";

/** One row's band, in geometry units of the 820-unit frame. */
const ROW = 32;
const BAR_TOP = 4;
const BAR_H = 15;
/** The 2000 tick runs a little past the bar at both ends, and STOPS above the rail lane: a tick that
 *  reached into the lane would read as a mark on the rail, which measures something else. */
const TICK_TOP = 2;
const TICK_BOTTOM = 21;
const RAIL_TOP = 23;
const RAIL_H = 6;
/** The gap between a gutter's own edge and the words in it, in CSS pixels. */
const LABEL_GAP_PX = 10;
/** The shortest rail a reader can compare to another rail, in CSS pixels, at the narrowest width
 *  this format is verified at (`verify-web.mjs` opens 375). Under it a rail is a tick, and a control
 *  that hands back a length nobody can measure hands back nothing. `rebase.ts` turns this into the
 *  data's own unit using the cell this beat's own gutters leave at that width. */
const MIN_RAIL_PX = 3;
/** How much darker than its own fill a pointed-at segment has to be before it counts as answering.
 *  A DOSE IS SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne. */
const MARK_SEPARATION = 1.4;
/** How long a rail takes to reach its length, in ms. Honoured only under `no-preference`. */
const RAIL_MS = 260;
/** How far apart two neighbouring bands of the stack have to stand before a reader can tell them
 *  apart. Refused, not hoped for — see the ramp below for what the first form measured. */
const RAMP_STEP_MIN = 1.2;

/** The geometry the bars are drawn in. The height is the row pitch times the rows, derived below,
 *  and the graduation row's height is derived from the direction's own axis register — neither is a
 *  number this frame can carry, and the literal 28 it used to carry was two lines of nocturne's
 *  10 px axis and one and a half of creme's. */
export const FRAME = { width: 820 };

export type Segment = {
  key: string;
  tone: number;
  from: number;
  to: number;
  label: string | null;
  detail: string;
};
export type Row = {
  code: string;
  name: string;
  total: number;
  before: number;
  totalLabel: string;
  segments: Segment[];
  highlight: boolean;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedStackedBarWeb({
  rows,
  tones,
  toneLabels,
  span,
  xTicks,
  beforeLabel,
  rebase,
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
}: {
  rows: Row[];
  tones: number;
  toneLabels: string[];
  span: number;
  xTicks: number[];
  beforeLabel: string;
  rebase: RebaseDeclaration;
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
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;

  /**
   * ONE HUE AT FIVE CHROMAS, SPACED IN CONTRAST AND REFUSED IF THEY CROWD.
   *
   * The first form of this ramp mixed the accent toward the ground on a linear ladder and then
   * floor-adjusted whatever fell under the non-text minimum. MEASURED ON `creme`, the six steps it
   * produced stood 1,400 · 1,415 · 1,079 · 1,015 · 1,016 apart: the top three bands were the same
   * colour to any eye, because three independent clamps against the same floor against the same
   * ground land on the same value BY CONSTRUCTION — the defect this branch has already written down
   * twice (1,023:1 measured on one beat, 1,000:1 on a lollipop).
   *
   * So the ladder is walked in CONTRAST instead: geometrically from the accent's own contrast down
   * to the non-text floor, every step the first mix that reaches its target, so the last one lands
   * on the floor rather than under it. And the separation between neighbours is then MEASURED and
   * REFUSED, because the spacing a ramp can hold is a property of the accent and not of the wish:
   * with five bands this beat gets 1,216 - 1,242 on the two light directions and 1,371 - 1,388 on
   * `nocturne`; with six it gets 1,165 - 1,189 everywhere, which is why there are five.
   *
   * Darkest at the baseline, lightest at the top: the order is the stack's own and it never changes.
   */
  const ramp = Array.from({ length: tones }, (_, i) => {
    const top = contrast(accent, ground);
    const target = top * Math.pow(NON_TEXT_CONTRAST_MIN / top, i / (tones - 1));
    for (let step = 0; step <= 400; step++) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, ground) >= target) return candidate;
    }
    return accent;
  });
  for (let i = 1; i < ramp.length; i++) {
    const separation = contrast(ramp[i], ramp[i - 1]);
    if (separation < RAMP_STEP_MIN)
      throw new Error(
        `bands ${i} and ${i + 1} of the stack are ${ramp[i - 1]} and ${ramp[i]}, which stand ` +
          `${separation.toFixed(3)}:1 apart — under the ${RAMP_STEP_MIN}:1 this beat asks of two ` +
          `bands a reader has to tell apart. One hue between ${contrast(accent, ground).toFixed(2)}:1 ` +
          `and the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor carries only so many levels; past four ` +
          "or five, name rather than shade. `types/stacked-bar.md` says the same thing in its own " +
          'terms: past roughly five series a stack "turns into an unreadable ribbon — group the ' +
          'smallest into Other rather than adding a sixth colour".',
      );
  }

  /**
   * WHAT A POINTED-AT SEGMENT BECOMES, SEARCHED OFF ITS OWN FILL.
   *
   * Not a fixed dose and not a filter: a `brightness()` lightens on a light ground and on a dark one
   * alike, and a fixed mix measured 1,104:1 on nocturne, which is no answer at all. The dose is
   * walked up until the result stands `MARK_SEPARATION` from the fill it replaces AND still clears
   * the non-text floor against the page's own ground — and it is refused rather than approximated.
   */
  const activeFor = (fill: string) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, ink, dose);
      if (
        contrast(candidate, fill) >= MARK_SEPARATION &&
        contrast(candidate, ground) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at segment from its own fill ${fill} by ` +
        `${MARK_SEPARATION}:1 while staying ${NON_TEXT_CONTRAST_MIN}:1 above the ground ${ground}. ` +
        "A segment that answers by becoming a colour the reader cannot tell from the one beside it " +
        "has not answered.",
    );
  };
  const activeRamp = ramp.map(activeFor);

  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const tick = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  /**
   * THE TWO GUTTERS AND THE AXIS ROW, MEASURED IN THE FACE THE PAGE WILL DRAW IN.
   *
   * `registerOf` rather than the CSS strings, because a gutter is measured in the size the page
   * DRAWS at, which is the cap-height-resolved one. Both of these used to be typed numbers holding a
   * literal `lineHeight` up — 92px of name gutter with the names wrapped at `lineHeight: 1.05`, and
   * 200 geometry units of plot given over to a total label wrapped at `1.1`. Both literals beat the
   * leading the register emits, and both were fixing an overflow with the tool of vertical rhythm.
   * The overflow's own levers are here instead: the gutter is as wide as the widest string it has to
   * hold, and the total labels are in a COLUMN OF THEIR OWN (`--end-gutter`, the third column the
   * trunk declares) rather than inside the plot — so they are a fixed number of CSS pixels at every
   * viewport instead of a fixed fraction of a plot that is 1348 px wide on a laptop and 210 on a
   * phone. Nothing here sets a `line-height`; the register owns it.
   */
  const axisReg = registerOf(direction, "axis", { family: "chart" });
  const valueReg = registerOf(direction, "value", { family: "chart" });
  const widest = (strings: string[], reg: any, weight?: number) =>
    Math.max(
      ...strings.map((text) =>
        measureText(text, {
          fontSize: reg.fontSize,
          fontWeight: weight ?? (reg.fontWeight as number),
          fontFamily: reg.fontFamily,
          fontStyle: reg.fontStyle,
        }),
      ),
    );
  // The two named rows are drawn at 700 and every other at the register's own weight, so the widest
  // string is measured at the weight IT will be set in rather than at one weight for all sixteen.
  const yGutter = Math.ceil(
    Math.max(
      widest(rows.filter((r) => !r.highlight).map((r) => r.name), axisReg),
      widest(rows.filter((r) => r.highlight).map((r) => r.name), axisReg, 700),
    ) + LABEL_GAP_PX,
  );
  const endGutter = Math.ceil(
    Math.max(
      widest(rows.filter((r) => !r.highlight).map((r) => r.totalLabel), valueReg),
      widest(rows.filter((r) => r.highlight).map((r) => r.totalLabel), valueReg, 700),
    ) + LABEL_GAP_PX,
  );
  /** The graduation row's own height: one line of the axis register plus the offset the shared
   *  stylesheet drops it by. It was the literal 28, which is height taken off the plot in every
   *  direction to fit a row nothing fills. */
  const xAxisRowPx = Math.ceil(leadOf(axisReg) + 6);

  const x = (v: number) => (v / span) * FRAME.width;
  const rowTop = (i: number) => ROW * i;
  const cy = (i: number) => rowTop(i) + BAR_TOP + BAR_H / 2;

  /**
   * THE READABLE FLOOR, IN THE DATA'S OWN UNIT, DERIVED RATHER THAN TYPED.
   *
   * At 375 CSS px the plot cell is what the window leaves after both gutters, and the frame is 820
   * units wide inside it — so one CSS pixel is worth `820 / cell` units and, at this beat's scale,
   * `span / cell` TWh. A rail shorter than `MIN_RAIL_PX` of that is a tick, and `rebase.ts` refuses
   * the option that would draw one. It is what refuses « les autres renouvelables », whose longest
   * band is Italy's 5,67 TWh.
   */
  const NARROWEST_PX = 375;
  const cellAtNarrowest = NARROWEST_PX - yGutter - endGutter;
  const minRailUnits = (MIN_RAIL_PX * span) / cellAtNarrowest;

  // Refused before anything is drawn, against what this component is actually handed: the
  // declaration comes from the runner and the drawing is `rows`, so the length check below is a
  // comparison of two derivations rather than a restatement of one.
  const bandDrawn = (row: string, optionKey: string) => {
    const segment = rows.find((r) => r.code === row)?.segments.find((s) => s.key === optionKey);
    return segment ? { from: segment.from, to: segment.to } : null;
  };
  assertRebaseDeclaration(rebase, {
    rows: rows.map((r) => r.code),
    bandDrawn,
    minRailUnits,
    unitsPerValue: FRAME.width / span,
  });

  const options = rebaseOptionsForMarkup(rebase, REBASE_ID_PREFIX);
  const notes = rebaseNotesForMarkup(rebase);
  const toneOfKey = new Map(rows.flatMap((r) => r.segments.map((s) => [s.key, s.tone] as const)));

  const css = [
    rebaseChromeCss({ scope: SCOPE }),
    rebaseCss(rebase, {
      scope: SCOPE,
      idPrefix: REBASE_ID_PREFIX,
      railMs: RAIL_MS,
      plotUnits: x(span),
      frameUnits: FRAME.width,
      // The rail is painted in its own band's tone, which is the only cue tying the lane to the
      // stack above it — and it is a colour this component measured, never one the vocabulary named.
      paint: (key) => ramp[toneOfKey.get(key) ?? 0],
    }),
    // THE TOTALS' OWN COLUMN. The shared `.end-label` rule draws a chip on the ground and pulls it
    // back over the plot; in a column of its own it needs neither.
    `${SCOPE} .chart-plot .end-axis .end-label { background: none; padding: 0; white-space: nowrap; }`,
    // THE POINTED-AT SEGMENT, RAISED ABOVE THE PAINT. `fill` is a presentation ATTRIBUTE on the rect,
    // which every CSS rule outranks; this one is at (0,3,0) with the scope, above the format's own
    // `.mark-active` at (0,1,0), so the colour that wins is the one this beat measured.
    `${SCOPE} [data-mark].mark-active { fill: var(--mark-active); }`,
    // The answer is five readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 320px; }`,
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
          nothing leaves this picture — sixteen countries and six sources are drawn in every state,
          and a stack with a source hidden is a different total. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {toneLabels.map((t, i) => (
          <span key={t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, background: ramp[i], display: "inline-block", borderRadius: 2 }} />
            {t}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 2, height: 14, background: tick, display: "inline-block" }} />
          {beforeLabel}
        </span>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertRebaseDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-rebase">
        <legend>{rebase.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={REBASE_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN RAIL SAYS THE STACK GETS WRONG. Its row is reserved whether or not an option
          is chosen, so choosing one never moves the plot underneath it, and every sentence sits in
          one grid cell so the row is always as tall as the longest of them. The default gets none:
          the untouched plate is the claim, not a comparison. */}
      <div className="rebase-notes" role="status">
        {notes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutter}px`,
          ["--end-gutter" as string]: `${endGutter}px`,
          ["--x-axis-h" as string]: `${xAxisRowPx}px`,
          // A THIRD COLUMN, so the totals are outside the plot the bars are drawn in and have room
          // that is a property of the strings rather than of the plot's width.
          gridTemplateColumns: `var(--y-gutter) 1fr var(--end-gutter)`,
          aspectRatio: `${FRAME.width + yGutter + endGutter} / ${height + xAxisRowPx}`,
        }}
      >
        {/* The sixteen names, at the sixteen bar centres, in every state of the page. No
            `line-height` and no `white-space` here: the shared `.axis-label` keeps them on one line
            and the register owns its own leading. The gutter above is the right lever. */}
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.highlight ? accent : (regs.axis.color as string),
                fontWeight: r.highlight ? 700 : regs.axis.fontWeight,
                top: `${pct(cy(i), height)}%`,
              }}
            >
              {r.name}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={height} fill={ground} />

          {xTicks.filter((t) => t > 0).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {rows.map((r, i) =>
            r.segments.map((s) => (
              <rect
                key={`${r.code}-${s.key}`}
                data-mark={`${r.code}-${s.key}`}
                style={{ ["--mark-active" as string]: activeRamp[s.tone] }}
                x={x(s.from)}
                y={rowTop(i) + BAR_TOP}
                width={Math.max(0.6, x(s.to) - x(s.from))}
                height={BAR_H}
                fill={ramp[s.tone]}
                stroke={ground}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}

          {/* The earlier total, as a tick ON the bar: the addition is the distance from here to the
              end, which is what the headline is about. */}
          {rows.map((r, i) => (
            <line
              key={`b-${r.code}`}
              x1={x(r.before)}
              x2={x(r.before)}
              y1={rowTop(i) + TICK_TOP}
              y2={rowTop(i) + TICK_BOTTOM}
              stroke={tick}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* WHAT ANSWERS, AND WHAT SPEAKS FOR IT. The point is the keyboard's target and the
              pointer's index; the RECT is what lights up. `data-hit="cell"` because sixteen rows put
              six marks each at the same y and an x-only answer would pick whichever the markup
              listed first — a confident wrong answer, which is the worst thing a chart can give. */}
          {rows.flatMap((r, i) =>
            r.segments.map((s) => (
              <circle
                key={`hit-${r.code}-${s.key}`}
                className="pt"
                data-mark-ref={`${r.code}-${s.key}`}
                cx={(x(s.from) + x(s.to)) / 2}
                cy={cy(i)}
                r={Math.max(3, Math.min(10, (x(s.to) - x(s.from)) / 2))}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={s.detail}
                data-detail={s.detail}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE RAIL LANE. One rail per row, in the document from the start at zero width in every
            direction — `display` does not transition, so a rail that arrived by being displayed
            would snap. What a chosen option changes is the width of an element that was already
            there, which is the shape a transition needs. `left` is never written by anyone: it is
            zero, and it is zero in every state, which is the whole of what this control is. */}
        <div className="rebase-layer" aria-hidden="true">
          {rows.map((r, i) => (
            <span
              key={`rail-${r.code}`}
              {...rebaseRailAttrs(r.code)}
              style={{
                top: `${pct(rowTop(i) + RAIL_TOP, height)}%`,
                height: `${pct(RAIL_H, height)}%`,
              }}
            />
          ))}
        </div>

        <div className="overlay" aria-hidden="true">
          {rows.map((r) =>
            r.segments.filter((s) => s.label !== null).map((s) => (
              <span
                key={`sl-${r.code}-${s.key}`}
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                  color: inkOnFill(ramp[s.tone], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
                  left: `${pct((x(s.from) + x(s.to)) / 2, FRAME.width)}%`,
                  top: `${pct(cy(rows.indexOf(r)), height)}%`,
                  transform: "translate(-50%, -50%)",
                  background: "transparent",
                  padding: 0,
                  // A HALO IN THE BAND'S OWN FILL, AND IT IS NOT DECORATION. The 2000 tick has to
                  // cross the bar — the addition is the distance from it to the end — and on five
                  // of the sixteen rows it crosses a segment's own figure, which was legible but
                  // struck through. A chip of ground under the figure would punch a hole in the
                  // band; a chip of the band's own fill would break the tick into two pieces a
                  // reader reads as a gap. A halo in the fill thins the tick around the digits and
                  // leaves both readable, which is the only outcome that keeps the treatment
                  // (`a-segment-not-starting-at-zero-carries-its-own-number`) and the tick.
                  textShadow: `0 0 2px ${ramp[s.tone]}, 0 0 2px ${ramp[s.tone]}, 0 0 3px ${ramp[s.tone]}`,
                }}
              >
                {s.label}
              </span>
            )),
          )}
        </div>

        {/* THE TOTAL AND THE ADDITION, IN A COLUMN OF THEIR OWN. Outside the plot, so their room is
            a number of CSS pixels rather than a fraction of a plot whose width changes by a factor
            of six between a laptop and a phone. */}
        <div className="end-axis">
          {rows.map((r, i) => (
            <span
              key={`total-${r.code}`}
              className="end-label"
              style={{
                ...regs.value,
                color: r.highlight ? accent : label,
                fontWeight: r.highlight ? 700 : regs.value.fontWeight,
                left: `${LABEL_GAP_PX}px`,
                top: `${pct(cy(i), height)}%`,
                transform: "translateY(-50%)",
              }}
            >
              {r.totalLabel}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
