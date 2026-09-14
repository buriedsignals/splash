/**
 * Wind against solar in six countries' 2024 electricity, drawn as grouped columns THROUGH the design
 * base and delivered as an interactive page.
 *
 * `the-group-boundary-is-drawn` — the two bars that belong to one country are set tight against each
 * other and the NEXT country starts after a gap wider than the bars themselves. Without that a
 * grouped bar reads as one long row of alternating colours and the grouping, which is the whole
 * device, disappears.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT A TOOLTIP ON THE STILL. The static sibling POINTS: it draws a
 * callout with a leader line onto Switzerland's pair and hands the reader the answer. This page
 * deletes that callout. The group boundary above is exactly what makes the WITHIN-group comparison
 * easy and the ACROSS-group one hard — each series' six columns are separated by the other series'
 * — so a still can assert "this one is the exception" and has no way to draw WHICH HALF of the pair
 * makes it one. Here the reader chooses a country and its own two levels lie flat across the other
 * five, in the two series' own inks, with the rank on each series and the ratio between them in the
 * sentence underneath. Switzerland's solar turns out to be third of six and its wind last: the
 * reversal is a wind story, and that is the half the still cannot show.
 *
 * COLOUR, AND WHY IT IS NOT ONE HUE AT TWO CHROMAS BY ARGUMENT. This page used to claim
 * `two-states-of-one-measure-are-one-hue-at-two-chromas`, whose own imported source says "two states
 * of one measure should not read as two categories". Wind and solar are not two states of one
 * measure; they are two generation technologies, i.e. two categories, and the treatment was being
 * claimed backwards. Two hues is what two categories want and the directed substrate records ONE
 * accent per direction, so the refusal is the finding — see `PALETTE.md`. What ships instead is the
 * accent for solar (the series the claim is about) and one tint of it for wind, held apart by a
 * MEASURED lightness gap rather than by assumption.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  assertLegible,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, fitY } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 820, height: 340, xAxisRowPx: 30 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
const REVEAL_MS = 220;
const RING_PX = 1.5;
const LABEL_OFFSET_PX = 3;
// The underline a pointed band takes, in the geometry's own units — see the markup.
const BAND_TICK_UNITS = 5;

/**
 * THE TWO SERIES ARE TOLD APART BY LIGHTNESS, AND THE FLOOR IS HELD HERE RATHER THAN HOPED FOR.
 *
 * `references/types/grouped-bar.md`'s named trap is two warm hues sitting next to each other inside
 * one group; its REASON is one step further back — with a legend instead of per-bar series labels,
 * colour is the ONLY thing tying a bar in the sixth group back to "series A", first learned in the
 * first. So whatever the two inks are, the tie has to be measured.
 *
 * `seriesInks`'s own `readApart` is NOT the instrument for this pair and that is a measurement, not
 * an opinion: it passes a candidate on EITHER a 1.5:1 lightness gap OR a redmean hue distance of
 * 100, and on two chromas of ONE hue the hue half is meaningless. Measured on this tree —
 * `seriesInks({ground: "#111044", accent: "#4FE0C0"}, 2)` returns a pair that measures 1.269:1
 * against each other and would pass `readApart` on a redmean of 151. So the applicable half is held
 * directly, at the same 1.5:1 that docblock states.
 */
const SERIES_SEPARATION_MIN = 1.5;

export type Group = {
  code: string;
  name: string;
  wind: number;
  solar: number;
  windLabel: string;
  solarLabel: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedGroupedBarWeb({
  groups,
  subject,
  seriesLabels,
  yTicks,
  levels,
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
  groups: Group[];
  subject: string;
  seriesLabels: { wind: string; solar: string };
  yTicks: number[];
  levels: LevelDeclaration;
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

  // THE ACCENT GOES TO SOLAR, and that is `accent-marks-the-thread` rather than an arbitrary
  // assignment: the claim is that SOLAR passes wind in one country, so solar is the series the
  // argument is carried by. Wind takes one tint of the same accent, walked toward the ground and
  // then pushed back to the non-text floor if the walk went under it.
  const solarInk = accent;
  let windInk = mix(accent, ground, 0.58);
  if (contrast(windInk, ground) < NON_TEXT_CONTRAST_MIN)
    windInk = adjustToContrast(windInk, ground, NON_TEXT_CONTRAST_MIN) ?? windInk;
  assertLegible(solarInk, ground, { role: "mark", where: "the solar series" });
  assertLegible(windInk, ground, { role: "mark", where: "the wind series" });
  const separation = contrast(solarInk, windInk);
  if (separation < SERIES_SEPARATION_MIN)
    throw new Error(
      `the two series are drawn ${solarInk} and ${windInk}, which measure ${separation.toFixed(3)}:1 ` +
        `against each other — under the ${SERIES_SEPARATION_MIN}:1 lightness gap this beat holds. On a ` +
        `grouped bar the legend is the only thing tying a bar in the sixth group back to its series, ` +
        `and two chromas of one hue that a reader cannot separate break every comparison the chart ` +
        `offers, silently (references/types/grouped-bar.md, "the trap that's specific to this one")`,
    );

  const baseline = mix(ground, ink, 0.7);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  // THE AXIS NAMES' INK AND WEIGHT LEAVE THE INLINE STYLE AND BECOME TWO CUSTOM PROPERTIES, and
  // that is not tidiness. An inline style beats every selector there is, so with `regs.axis` spread
  // whole onto each name the generated option rules could not light one — measured by driving all
  // three directions: "the chosen country's name alone is lit" came back with an empty list at every
  // option, because the register's own 500 was sitting on the element. The default state is now two
  // rules like every other state, and the option rules clear them by an id.
  const { color: axisInk, fontWeight: axisWeight, ...axisRest } = regs.axis as any;

  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);
  const band = FRAME.width / groups.length;
  // The group's own boundary: two bars tight together, then a gap wider than one bar.
  const barW = band * 0.24;
  const cx = (i: number) => band * i + band / 2;

  /**
   * WHERE A BAR'S OWN FIGURE GOES WHEN THERE IS NO ROOM ABOVE IT, AND WHY IT IS A CONTAINER QUERY.
   *
   * A figure stands above its bar. The tallest bar on this plate is 28,5 % of a 30 %-ceiling scale,
   * so what is left above it is 6 % of the plot — and 6 % of a plot is a different number of reader
   * pixels at every window, because `.chart-figure` is capped at `100dvh` and `.chart-plot` is the
   * one compressible thing under it. Measured on this beat: the same 375 px-wide page gives the plot
   * 110 px of geometry in creme and 90 px in nocturne, whose uppercase display wraps to more lines.
   * At 90 px the space above the tallest bar is 9 px and the figure is 17,6 px, so it was drawn
   * OUTSIDE the plot, over the control above it — found by driving, not by reading the markup.
   *
   * So the box each figure lives in IS THE EMPTY SPACE ABOVE ITS OWN BAR: same width, from the top
   * of the plot down to the bar's top. `container-type: size` then makes "is there room above this
   * bar" a question the browser answers at the size it actually drew, which no build-time number
   * can. Under the threshold the figure moves INSIDE the bar, just below its top, where it sits on
   * the ground-coloured chip `.end-label` already carries — so it never puts ink on a hue.
   *
   * The threshold is DERIVED, never typed: the label's own line (the value register's line height
   * times the size this beat draws it at), plus the two pixels of the format's chip padding, plus
   * the offset that keeps a figure clear of its bar.
   */
  const labelSizePx = Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2);
  const labelFitsPx = Number(regs.value.lineHeight) * labelSizePx + 2 + LABEL_OFFSET_PX;

  // THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed what the beat actually draws — the six
  // countries and the two series — so an option reading its levels off a datum that is not on the
  // plate, or laying a rule on only one of the two series, is caught here and not by a reader.
  assertLevelDeclaration(levels, {
    drawnKeys: groups.map((g) => g.code),
    drawnSeries: ["wind", "solar"],
    height: FRAME.height,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  const seriesInkOf = (series: string) => (series === "solar" ? solarInk : windInk);

  // THE DEFAULT STATE AS TWO RULES, not as an inline style on every name — the option rules clear
  // this specificity by an id, so choosing a country steps the default subject back with everything
  // else instead of leaving a second emphasis on the plate.
  //
  // AND THE SUBJECT IS NOT RECOLOURED. `the-subject-is-ringed-not-recoloured`: "recolouring spends a
  // channel that is already carrying something", and on this page that channel is the series. The
  // version this replaces printed Switzerland's name in `var(--accent)` — which is one of the two
  // SERIES inks — so the one country the claim is about had its name written in the wind ink on a
  // page whose claim is about its solar. It takes full ink and weight now, and no hue.
  const css = [
    `${SCOPE} .axis-label.x { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    `${SCOPE} .axis-label.x[data-axis="${subject}"] { color: var(--ink); font-weight: 700; }`,
    `${SCOPE} [data-col] { stroke: none; }`,
    // WHAT A POINTED BAND BECOMES, declared on the shape because the format reads `--mark-active`
    // off the mark itself. The ink, and nothing else: on this page colour carries the SERIES, so a
    // pointer that repainted a column would break the one association the reader is asked to learn
    // once and reuse — see the header, and `references/types/grouped-bar.md`, "where it goes wrong".
    `${SCOPE} [data-mark] { --mark-active: var(--ink); }`,
    `${SCOPE} [data-col="${subject}"] { stroke: var(--ink); stroke-width: ${RING_PX}; }`,
    // THE BOX IS THE EMPTY SPACE ABOVE THE BAR — see `labelFitsPx` above for what that buys and
    // what it cost to find out.
    `${SCOPE} .overlay .label-box { position: absolute; container-type: size; }`,
    `${SCOPE} .overlay .label-box > .end-label {`,
    `  left: 50%;`,
    `  top: auto;`,
    `  bottom: ${LABEL_OFFSET_PX}px;`,
    `  transform: translateX(-50%);`,
    `}`,
    `@container (max-height: ${(labelFitsPx - 0.01).toFixed(2)}px) {`,
    `  ${SCOPE} .overlay .label-box > .end-label { bottom: auto; top: calc(100% + ${LABEL_OFFSET_PX}px); }`,
    `}`,
    levelChromeCss({ scope: SCOPE }),
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--axis-ink)", weight: "var(--axis-weight)" },
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
        ["--grid" as string]: grid,
        ["--axis-ink" as string]: axisInk,
        ["--axis-weight" as string]: String(axisWeight),
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not
          (nothing leaves its picture); a yardstick is a third mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE LEGEND, IN THE SAME LEFT-TO-RIGHT ORDER AS THE BARS INSIDE A GROUP. That order is the
          catalogue sheet's own requirement, not a nicety: matching a swatch to a bar has to cost the
          reader nothing beyond learning it once, because on this type colour is the only thread. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "10px 0 4px", flex: "0 0 auto" }}>
        {[{ c: windInk, t: seriesLabels.wind }, { c: solarInk, t: seriesLabels.solar }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: k.c, display: "inline-block", borderRadius: 2 }} />
            {k.t}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertLevelDeclaration`
          refuses the declaration otherwise (WCAG 2.5.3). */}
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the rank on each series and the ratio between
          them, revealed by the same `:checked` that lays the references across the plot. Its row is
          reserved whether or not an option is chosen, so the plot underneath never jumps. The
          untouched option reveals none, because it is not a comparison: it is the claim. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "44px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 44} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {`${t} %`}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {groups.map((g, i) => (
            <g key={g.code}>
              <rect
                data-col={g.code}
                data-series="wind"
                x={cx(i) - barW}
                y={y(g.wind)}
                width={barW}
                height={FRAME.height - y(g.wind)}
                fill={windInk}
                vectorEffect="non-scaling-stroke"
              />
              <rect
                data-col={g.code}
                data-series="solar"
                x={cx(i)}
                y={y(g.solar)}
                width={barW}
                height={FRAME.height - y(g.solar)}
                fill={solarInk}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* EVERY OPTION'S REFERENCES, DRAWN ONCE AT THEIR OWN HEIGHT AND HIDDEN. The stylesheet
              only reveals; nothing moves. That is what keeps `interaction.mjs`'s by-x resolution
              honest — it reads `cx` once at init and a CSS transform never changes it. Dashed, so a
              yardstick the reader parked is never read as a seventh datum. */}
          {levelRules.map((rule) => (
            <line
              key={rule.key}
              data-level-rule={rule.key}
              x1={0}
              x2={FRAME.width}
              y1={rule.y}
              y2={rule.y}
              stroke={seriesInkOf(rule.series)}
              strokeWidth={2}
              strokeDasharray="7 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE BAND ANSWERS, NOT A DOT ON TOP OF A COLUMN. A `.pt` filled under the pointer is
              right for a line — the reading IS a point there — and wrong for a column, where it
              prints a grey spot floating at the top of the taller bar. `render-web.mjs` already
              carries the generic way out: the point names the shape that answers for it
              (`data-mark-ref`), the shape carries `data-mark`, `interaction.mjs` moves
              `.mark-active` between them and the point itself stays invisible. What answers here is
              the GROUP — an underline the width of its band, on the baseline, transparent until the
              reader points at it. It is not a fill behind the columns, and that is a measurement:
              the wind series sits at 3,07–3,10:1 against the ground in all three directions, so any
              tint laid UNDER it would put it through the 3:1 non-text floor. */}
          {groups.map((g, i) => (
            <rect
              key={`${g.code}-band`}
              data-mark={g.code}
              x={band * i}
              y={FRAME.height - BAND_TICK_UNITS}
              width={band}
              height={BAND_TICK_UNITS}
              fill="transparent"
            />
          ))}

          {groups.map((g, i) => (
            <circle
              key={g.code}
              className="pt"
              cx={cx(i)}
              cy={y(Math.max(g.wind, g.solar))}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={g.detail}
              data-detail={g.detail}
              data-mark-ref={g.code}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {groups.flatMap((g, i) =>
            (
              [
                { series: "wind", value: g.wind, text: g.windLabel, centre: cx(i) - barW / 2 },
                { series: "solar", value: g.solar, text: g.solarLabel, centre: cx(i) + barW / 2 },
              ] as const
            ).map((bar) => (
              <span
                key={`${g.code}-${bar.series}`}
                className="label-box"
                style={{
                  left: `${pct(bar.centre - barW / 2, FRAME.width)}%`,
                  top: 0,
                  width: `${pct(barW, FRAME.width)}%`,
                  height: `${pct(y(bar.value), FRAME.height)}%`,
                }}
              >
                <span
                  className="end-label"
                  style={{ ...regs.value, fontSize: `${labelSizePx}px`, color: label }}
                >
                  {bar.text}
                </span>
              </span>
            )),
          )}
        </div>

        <div className="x-axis">
          {groups.map((g, i) => (
            <span
              key={g.code}
              className="axis-label x"
              data-axis={g.code}
              style={{ ...axisRest, left: `${pct(cx(i), FRAME.width)}%` }}
            >
              {g.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
