/**
 * Ten countries' life expectancy in 2000 and 2023, drawn as dumbbells THROUGH the design base and
 * delivered as an interactive page.
 *
 * `segment-between-two-named-states` — the bar between the two heads IS the gap, and both of its ends
 * are named states rather than an anonymous range. That is the whole difference from a lollipop pair:
 * a dumbbell answers "how far apart", not "how far from nothing", and the axis is fitted for exactly
 * that reason.
 *
 * `the-delta-is-its-own-register-beside-the-values` — the gain is printed in its own register at the
 * end of the row, never mixed in with the two levels it was computed from.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE TOOLTIP. A still has to pick one order and that order is the
 * author's: sorted by gain, this plate says who moved most and hides who lives longest. The reader
 * lays one country's OWN TWO LEVELS across the other nine — `level.ts`'s yardstick, stood up rather
 * than laid flat because on this shape the value axis is horizontal — and gets back what the gain
 * order buries: not one of these ten changed rank in twenty-three years. The row's bar answers
 * separately with what LINKS its two ends, never with either end again.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

const ROW = 40;
/** The first row's own value labels sit beside its bar, so the band of rows starts below the top of
 *  the frame — without this a label centred on a row at y=0 lifts out of the svg's rectangle, where
 *  the hit area cannot answer for it and the format's own overlay probe goes silent. */
const TOP_PAD = 14;
/** And the band stops short of the bottom, because the yardstick writes each upright's year at the
 *  foot of the plot. Without it those two words sit on the last row's own value labels. */
const BOTTOM_PAD = 22;
export const FRAME = { width: 860, height: 0, xAxisRowPx: 28 };
/** The delta's own column, inside the viewBox. A label placed at `left: 100.5 %` of the plot cell
 *  hangs outside the figure and scrolls the page sideways — the defect this base's bump beat paid
 *  for at all seven viewports. A column that belongs to the frame is drawn inside the frame. */
const DELTA_GUTTER = 96;
const PLOT_RIGHT = FRAME.width - DELTA_GUTTER;
const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** The two series this beat draws, in the order the eye meets them. `level.ts` calls them series;
 *  here they are the two dated states of one measure, and every yardstick option owes a rule on
 *  each — a reference on one of them would answer half the question. */
export const SERIES = ["before", "after"] as const;

const HEAD_R = 6;
/** The head's ground casing, in READER pixels — the separation the colours cannot provide. See the
 *  refusal below and `PALETTE.md`, "What that costs, measured, and how it is paid". */
const CASING_PX = 2;
/** The bar is scaffolding, not a third mark — `references/types/dumbbell.md`, "What the drawing
 *  actually needs". It shipped at 6 px, the diameter of the heads it was supposed to sit under. */
const CONNECTOR_PX = 2.5;
const RING_PX = 1.2;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "2 5";
const REVEAL_MS = 220;

export type Row = {
  code: string;
  name: string;
  before: number;
  after: number;
  gain: number;
  beforeLabel: string;
  afterLabel: string;
  gainLabel: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

/**
 * THE ONE SCALE, SHARED BY BOTH CALLERS. The runner has to place each yardstick option's two
 * references in the geometry's own units, and the component has to draw the heads at the same
 * numbers; deriving that twice is how a reference ends up beside the mark it claims to sit on
 * rather than on it.
 */
export const scaleFor = (xTicks: number[]) => {
  const floor = xTicks[0];
  const top = xTicks[xTicks.length - 1];
  return (value: number) => ((value - floor) / (top - floor)) * PLOT_RIGHT;
};

export function DirectedDumbbellWeb({
  rows,
  subject,
  xTicks,
  stateLabels,
  levels,
  interaction: _interaction,
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
}: {
  rows: Row[];
  subject: string;
  xTicks: number[];
  stateLabels: { before: string; after: string };
  levels: LevelDeclaration;
  interaction?: unknown;
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
  measure: (text: string, options: { fontSize: number; fontWeight?: unknown; fontFamily?: string }) => number;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  // TOP_PAD lifts the first row clear of the frame (its own value labels sit beside it, and at
  // 375 px a label centred on a row at y=0 lifts out of the svg's rectangle). BOTTOM_PAD is the
  // strip the yardstick writes its two year labels in — without it they sit on the last row's own
  // value labels, which the United States option made visible in one look.
  const height = rows.length * ROW + TOP_PAD + BOTTOM_PAD;

  // ONE HUE, TWO CHROMAS: the two heads are two STATES of one measure, never two categories. The
  // argument for spending that on a form whose own sheet asks for two hues, and the measurement it
  // is constrained by, are in this beat's `PALETTE.md`.
  let early = mix(accent, ground, 0.6);
  if (contrast(early, ground) < NON_TEXT_CONTRAST_MIN)
    early = adjustToContrast(early, ground, NON_TEXT_CONTRAST_MIN) ?? early;
  const late = accent;
  let connector = mix(ground, ink, 0.28);
  if (contrast(connector, ground) < NON_TEXT_CONTRAST_MIN)
    connector = adjustToContrast(connector, ground, NON_TEXT_CONTRAST_MIN) ?? connector;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const subjectInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;

  /**
   * A HEAD IS LEGIBLE ON THE BAR IT TERMINATES, OR ITS CASING IS — and this beat shipped with
   * neither, at 1,023:1 in creme, 1,020 in rapport and 1,015 in nocturne.
   *
   * Both the earlier head and the connector were put through `adjustToContrast(…, non-text floor)`
   * against the SAME ground, and a floor is a point: two marks pinned to it are the same value by
   * construction. No colour fixes it either — the darkest an earlier head may be, while staying
   * lighter than the later one, IS the later one — so the separation is geometric, and the floor
   * below is the general form the scatter's yardstick already states: legible over a fill when
   * EITHER the mark or its casing separates from that fill. The casing here is the ground.
   */
  const headCasing = ground;
  for (const head of [
    { ink: early, which: `the ${stateLabels.before} head` },
    { ink: late, which: `the ${stateLabels.after} head` },
  ]) {
    if (contrast(head.ink, ground) < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `${head.which} is drawn ${head.ink}, ${contrast(head.ink, ground).toFixed(3)}:1 against the ` +
          `ground — under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor`,
      );
    const best = Math.max(contrast(head.ink, connector), contrast(headCasing, connector));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `${head.which} sits ON the connector (${connector}) and neither the head ${head.ink} ` +
          `(${contrast(head.ink, connector).toFixed(3)}:1) nor its casing ${headCasing} ` +
          `(${contrast(headCasing, connector).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a head a reader cannot tell from the bar is a dumbbell read ` +
          `as a lollipop, which is the one thing this type's own caveat says it is not`,
      );
  }
  if (contrast(connector, ground) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the connector is drawn ${connector}, ${contrast(connector, ground).toFixed(3)}:1 against the ` +
        `ground — the bar IS the gap, so it is a mark and it is held to the mark's floor`,
    );

  /**
   * THE READER'S YARDSTICK IS NOT THE ACCENT. The accent already carries the two states and the
   * subject's own gain; a hue that meant both would leave the reader no way to tell the page's claim
   * from their own question — the refusal `web-scatter-income-life-expectancy` states in full.
   */
  const yardstick = label;
  if (yardstick.toLowerCase() === late.toLowerCase() || yardstick.toLowerCase() === early.toLowerCase())
    throw new Error(
      `the reader's yardstick is drawn ${yardstick}, one of the two inks the page spends on the ` +
        `states it compares — that is the accent spent twice, on two arguments that are not the ` +
        `same argument`,
    );
  const ruleCasing = ground;
  // EVERY FILL A REFERENCE CROSSES, MEASURED — not the ground alone. An upright reference spans the
  // whole band of ten rows, so it crosses every mark on the plate, and on this palette ink against
  // the later head measures 3,075:1 in creme, 2,962:1 in rapport and 1,646:1 in nocturne: under the
  // floor twice. Hence the casing, and hence this check rather than a look.
  for (const fill of [
    { ink: ground, where: "the bare ground" },
    { ink: connector, where: "a row's connector" },
    { ink: early, where: `a ${stateLabels.before} head` },
    { ink: late, where: `a ${stateLabels.after} head` },
    { ink: grid, where: "a gridline" },
  ]) {
    const best = Math.max(contrast(yardstick, fill.ink), contrast(ruleCasing, fill.ink));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `the reader's yardstick crosses ${fill.where} (${fill.ink}) and neither its dash ` +
          `${yardstick} (${contrast(yardstick, fill.ink).toFixed(3)}:1) nor its casing ${ruleCasing} ` +
          `(${contrast(ruleCasing, fill.ink).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a reference is laid down to be read WHERE IT CROSSES`,
      );
  }
  if (contrast(yardstick, ruleCasing) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the yardstick is drawn ${yardstick} on a casing of ${ruleCasing}, ` +
        `${contrast(yardstick, ruleCasing).toFixed(3)}:1 against each other — a rule that cannot be ` +
        `told from its own halo is a rule the reader cannot follow across the plot`,
    );

  const floor = xTicks[0];
  const top = xTicks[xTicks.length - 1];
  for (const r of rows)
    for (const v of [r.before, r.after])
      if (v < floor || v > top) throw new Error(`${r.name} draws ${v}, outside the fitted axis ${floor}–${top}`);
  const x = scaleFor(xTicks);
  const cy = (i: number) => TOP_PAD + ROW * i + ROW / 2;

  /**
   * THE LABEL GUTTER IS MEASURED, NEVER TYPED — and this is the one type whose own sheet names the
   * gutter as its production failure: "shipped with literally zero reserved space for the label
   * column … purely because nobody sized the label gutter to what the labels actually needed."
   *
   * It shipped here at a typed `104px`, with a `white-space: normal` overriding the shared sheet's
   * `nowrap` and a hard-coded `lineHeight: 1.1` to keep a wrapped name out of its neighbour's row —
   * an overflow fixed with the lever of vertical rhythm, which then beat the leading the register
   * emits. Measured instead: in the register's own face, size and weight, and at the SUBJECT row's
   * 700 as well, which is wider than the rest. Nothing wraps, so the leading goes back to the
   * register, where it belongs.
   */
  const axisSize = Number.parseFloat(regs.axis.fontSize as string);
  const axisFamily = String(regs.axis.fontFamily).split(",")[0].replace(/"/g, "");
  const yGutterPx =
    Math.ceil(
      Math.max(
        ...rows.map((r) =>
          measure(r.name, {
            fontSize: axisSize,
            fontWeight: r.code === subject ? 700 : regs.axis.fontWeight,
            fontFamily: axisFamily,
          }),
        ),
      ),
    ) + 16;

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed the ten rows the beat actually draws and BOTH
   * of its series, so an option reading its levels off a country that is not on the plate, or laying
   * a reference on one of the two states and not the other, is caught here and not by a reader.
   * `width` is passed because on this shape the value axis is horizontal: a chosen country's levels
   * are references STOOD UP, not laid flat.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: rows.map((r) => r.code),
    drawnSeries: [...SERIES],
    height,
    width: FRAME.width,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  for (const rule of levelRules)
    if (rule.x === undefined)
      throw new Error(
        `the yardstick option ${rule.slug} lays its ${rule.series} reference flat, and on a dumbbell ` +
          `the value axis is horizontal — a flat rule would name a ROW, not a level`,
      );

  // THE AXIS AND ANNOTATION REGISTERS' INK AND WEIGHT LEAVE THE INLINE STYLE. An inline `color` beats
  // every generated selector, so with `regs.axis` spread whole the yardstick's own rules could not
  // light a chosen row's name — the correction the grouped bar and the scatter both had to make.
  const { color: _axisInk, fontWeight: _axisWeight, ...axisRest } = regs.axis as any;
  const { color: _annotInk, fontWeight: annotWeight, ...annotRest } = regs.annot as any;

  const css = [
    // The default state as rules and never as inline styles — see above. The subject's own accent is
    // drawn in EVERY state of this page except while the reader is holding a yardstick of their own,
    // which is that vocabulary's doctrine; its accent on the DELTA, which is where the claim lives,
    // no control can remove.
    `${SCOPE} .y-axis [data-axis] { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    `${SCOPE} .y-axis [data-axis="${subject}"] { color: var(--subject-ink); font-weight: 700; }`,
    `${SCOPE} .overlay [data-delta] { color: var(--annot-ink); }`,
    `${SCOPE} .overlay [data-delta="${subject}"] { color: var(--subject-ink); }`,
    // A head takes no ring until a reader asks for one. Declared here rather than as a presentation
    // attribute so the yardstick's generated ring is the only thing that ever draws one.
    `${SCOPE} [data-col] { stroke: none; }`,
    // THE BAR IS THE MARK, AND A BAR IS STROKED. The shared sheet paints an active mark's FILL,
    // which is exactly right for a rect and a no-op on a `<line>`; the row's reading is its
    // connector, so the beat says how its own mark lights. `--mark-active` is read off the figure,
    // measured there against the ground, and it is full ink rather than the accent for the same
    // reason the yardstick is.
    `${SCOPE} .mark-active { stroke: var(--mark-active); }`,
    levelChromeCss({ scope: SCOPE }),
    // THE CONTROL'S OWN GAP, AND THE BEAT OWNS IT. `levelChromeCss` opens the fieldset with 10 px
    // above it, which is right on a plate carrying six pills; eleven of them wrap to three rows at
    // 375 px and this beat's title already takes 426 px of an 812 px window. Emitted after the
    // vocabulary's own block, at the same specificity, so source order is the whole of it.
    `${SCOPE} .chart-level { margin-top: 4px; }`,
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--muted)", weight: String(_axisWeight ?? 400) },
      revealMs: REVEAL_MS,
    }),
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--axis-ink" as string]: _axisInk,
        ["--axis-weight" as string]: String(_axisWeight ?? 400),
        ["--annot-ink" as string]: _annotInk,
        ["--subject-ink" as string]: subjectInk,
        ["--mark-active" as string]: label,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE LEGEND, AND IT IS LOAD-BEARING. `references/types/dumbbell.md`: lose it and "a dumbbell
          degrades into two colours of dot with no stated meaning". Kept whole even though this beat
          spends one hue at two chromas rather than two hues — the trap's other half does not depend
          on the hue count. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "8px 0 0", flex: "0 0 auto" }}>
        {[{ c: early, t: stateLabels.before }, { c: late, t: stateLabels.after }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                background: k.c,
                boxShadow: `0 0 0 ${CASING_PX}px var(--ground)`,
                display: "inline-block",
                borderRadius: "50%",
              }}
            />
            {k.t}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it — and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from the picture. Each accessible name CONTAINS its visible one (WCAG 2.5.3),
          which `assertLevelDeclaration` refuses the declaration without. */}
      <fieldset className="chart-level">
        <legend>{levels.label}</legend>
        <div className="options">
          {levelOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-level"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the level rank in each year and the two counts
          the gain order hides. Its row is reserved whether or not an option is chosen, so choosing
          one never moves the plot underneath it. The untouched option reveals none: it is not a
          comparison, it is the claim the title states. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + yGutterPx} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        {/* The row labels are furniture, not controls. Without this the gutter's own <span>s are
            the topmost element wherever a value label slides over them at a narrow width, and the
            plot's hit area never sees the pointer — the format's overlay probe caught it at 375px. */}
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              data-axis={r.code}
              style={{ ...axisRest, top: `${pct(cy(i), height)}%` }}
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

          {xTicks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* EVERY OPTION'S REFERENCES, DRAWN ONCE AT THEIR OWN COORDINATE AND HIDDEN. The
              stylesheet only reveals them; nothing here emits a transform, which is what keeps
              `interaction.mjs`'s resolution honest — it reads `cx`/`cy` once at init and a CSS
              transform never changes them.

              Each is TWO lines carrying the same `data-level-rule`, so the generated `opacity: 1`
              reveals both: the ground casing first, then the dash on top of it, same dash pattern,
              so the casing shows only under the dashes.

              BEHIND THE DATA, AND THAT IS A LOOK RATHER THAN A CONVENTION. Drawn last, as the
              scatter draws them, each upright ran THROUGH the two heads it is read off — the
              casing's ground dots punched holes in the very marks the option names. There are
              twenty heads and ten hairlines on this plate, not 165 translucent dots, so a
              reference behind them is interrupted where a bar crosses it and nowhere else. */}
          {levelRules.map((r) => (
            <g key={r.key}>
              <line
                data-level-rule={r.key}
                x1={r.x}
                x2={r.x}
                y1={0}
                y2={height}
                stroke={ruleCasing}
                strokeWidth={RULE_CASING_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
              <line
                data-level-rule={r.key}
                x1={r.x}
                x2={r.x}
                y1={0}
                y2={height}
                stroke={yardstick}
                strokeWidth={RULE_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {rows.map((r, i) => (
            <g key={r.code}>
              {/* THE BAR IS THE ROW'S MARK — it is what `data-mark-ref` names, and what takes ink
                  under a pointer. Thin, because this type's sheet asks the connector to read as
                  scaffolding "not a third mark competing with the two dots"; it shipped at 6 px,
                  the diameter of the heads it sits under. */}
              <line
                data-mark={r.code}
                x1={x(r.before)}
                x2={x(r.after)}
                y1={cy(i)}
                y2={cy(i)}
                stroke={connector}
                strokeWidth={CONNECTOR_PX}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* EACH HEAD ON ITS OWN GROUND CASING, as its own shape rather than as the head's
                  stroke: the yardstick's generated `[data-col] { stroke: none }` steps every other
                  row's ring back, and a casing carried on that stroke would step back with it —
                  re-opening, for nine rows at a time, exactly the collision it exists to close. */}
              {[r.before, r.after].map((v, k) => (
                <circle
                  key={k}
                  cx={x(v)}
                  cy={cy(i)}
                  r={HEAD_R}
                  fill={headCasing}
                  stroke={headCasing}
                  strokeWidth={CASING_PX * 2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <circle data-col={r.code} cx={x(r.before)} cy={cy(i)} r={HEAD_R} fill={early} vectorEffect="non-scaling-stroke" />
              <circle data-col={r.code} cx={x(r.after)} cy={cy(i)} r={HEAD_R} fill={late} vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {/* ONE READING PER ROW, ALL AT THE SAME x — and that single number is a defect repair.
              `data-hit="cell"` resolves by Euclidean distance in the GEOMETRY's own units, and this
              `<svg>` carries `preserveAspectRatio="none"`, so a unit of x and a unit of y are
              different numbers of reader pixels. With each point at its own bar's midpoint the ten
              were not a grid: probed at five positions across each of the ten rows, 40 of 50 probes
              answered about a country the pointer was not over — France's row answered Pologne,
              then Espagne, then Suisse. At one shared x the x term is a constant for every
              candidate and the nearest cell IS the nearest row, which is what a cell means on a
              plate with one row per category. */}
          {rows.map((r, i) => (
            <circle
              key={r.code}
              className="pt"
              data-mark-ref={r.code}
              cx={PLOT_RIGHT / 2}
              cy={cy(i)}
              r={9}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={r.detail}
              data-detail={r.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {rows.map((r, i) => {
            // A LABEL THAT WOULD LEAVE THE FRAME FLIPS TO THE INSIDE. Beside the head is the right
            // place until the head is near an edge; then the label slides out of the plot's own
            // column into the label gutter, where the hit area cannot answer for it and, at 375px,
            // out of the figure entirely. `.end-label` carries a ground chip, so a flipped label
            // sits legibly over the connector it now covers.
            const beforePct = pct(x(r.before), FRAME.width);
            const afterPct = pct(x(r.after), FRAME.width);
            const flipBefore = beforePct < 14;
            const flipAfter = afterPct > 86;
            return (
            <span key={r.code}>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  // BESIDE the head, never above it. A label lifted by a percentage of its own
                  // (fixed-pixel) height clears the row at desktop scale and lifts clean out of the
                  // svg's rectangle at 375px, where the geometry has shrunk and the type has not —
                  // measured by the format's own overlay probe, which went silent at the phone.
                  left: `${pct(x(r.before), FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: flipBefore
                    ? "translateY(-50%) translateX(9px)"
                    : "translate(-100%, -50%) translateX(-9px)",
                }}
              >
                {r.beforeLabel}
              </span>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(x(r.after), FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: flipAfter
                    ? "translate(-100%, -50%) translateX(-9px)"
                    : "translateY(-50%) translateX(9px)",
                }}
              >
                {r.afterLabel}
              </span>
              {/* THE DELTA, in its own register, in its own column, past the end of every bar. */}
              <span
                className="note"
                data-delta={r.code}
                style={{
                  ...annotRest,
                  fontWeight: annotWeight,
                  left: `${pct(PLOT_RIGHT + 10, FRAME.width)}%`,
                  top: `${pct(cy(i), height)}%`,
                  transform: "translateY(-50%)",
                  background: "transparent",
                  padding: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {r.gainLabel}
              </span>
            </span>
            );
          })}

          {/* EACH UPRIGHT SAYS WHICH STATE IT MARKS, AT ITS OWN FOOT — the one thing the picture
              cannot say. Two dashed rules in the same ink are two references in the same ink; which
              of them is the earlier state is readable off their order only because this beat ASSERTS
              that every country gained, and an assertion in the runner is not a label on the plot.

              NOT THE COUNTRY'S NAME, and that is a subtraction rather than an omission. The reader
              just pressed a pill carrying it, and its row's name in the gutter takes full ink the
              moment they do — a third copy on the plot would be ink spent saying what two other
              places already say, on a plate that has ten rows of labels already.

              THEY GROW AWAY FROM EACH OTHER, so they cannot meet: the earlier one is anchored from
              its rule's right and the later one from its rule's left. The pair's narrowest gap on
              this data is 18,5 % of the frame (the United States), which is 46 px at 375. A rule
              too near a frame edge flips inward, into a gap that is never smaller than that — and
              the two cannot flip at once, because no country here is both inside 16 % on its 2000
              level and past 72 % on its 2023 one. */}
          {levelRules.map((rule) => {
            const at = pct(rule.x as number, FRAME.width);
            const isBefore = rule.series === SERIES[0];
            const flip = isBefore ? at < 16 : at > 72;
            const outward = isBefore ? !flip : flip;
            return (
              <span
                key={`${rule.key}-foot`}
                className="note"
                data-level-rule={rule.key}
                style={{
                  ...annotRest,
                  fontWeight: annotWeight,
                  bottom: "1%",
                  ...(outward
                    ? { right: `${100 - at}%`, maxWidth: `${Math.max(10, at)}%` }
                    : { left: `${at}%`, maxWidth: `${Math.max(10, 100 - at)}%` }),
                  whiteSpace: "nowrap",
                }}
              >
                {isBefore ? stateLabels.before : stateLabels.after}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
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
