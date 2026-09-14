/**
 * The distribution of CO₂ per person across every country in 2023, drawn as a histogram THROUGH the
 * design base and delivered as an interactive page.
 *
 * `bin-named-by-both-edges-and-an-open-top` — a bin is an interval, so it is named by BOTH of its
 * edges, and the last one says it is open rather than pretending to end where the data happens to
 * stop. A histogram labelled `0 2 4 6` leaves the reader to guess which side of 4 a country at
 * exactly 4 t fell on; this one does not.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the shape is the argument, so the bars are
 * one neutral; the bins the headline counts are the ones that carry the accent.
 *
 * WHAT THE WEB ADDS, and it is the type's own trap turned around. A still has to pick one bin width
 * and the reader has to trust it. This page cannot hand the width over — `BRIEF.md` records the
 * three measurements that closed that door — so it hands over the readings NO choice of bins can
 * move: the distribution's own quantiles, stood up across the plot on the `level.ts` vocabulary.
 * Three quarters of the world's countries stop at 5,8 t, which is 14 % of this chart's width; the
 * last 40 % of it carries two countries. Not one of those numbers is a bin edge, so not one of them
 * can be printed on a still of this claim. Every bar also answers, with its interval, its count, its
 * share of the whole, the running share up to its own top edge, and the countries inside it.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  levelSlugOf,
  levelOptionId,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 880, height: 340, xAxisRowPx: 30 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** The one series this beat draws. A histogram has exactly one: the binned variable itself. */
const SERIES = ["paliers"] as const;
const RING_PX = 1.6;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "2 5";
const MEDIAN_DASH = "5 4";
const REVEAL_MS = 220;

export type Bar = {
  from: number;
  to: number | null;
  count: number;
  inClaim: boolean;
  label: string;
  detail: string;
  /** The bar's identity: the string `data-col`/`data-mark` carry and the yardstick's slug. */
  key: string;
  /** The yardstick options this bar lies ENTIRELY beyond, if any. */
  beyond: string[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

/** WHAT A BAR TAKES UNDER THE POINTER. It used to be `--mark-active: label` on the figure — the
 *  TEXT ink, so every bar went near-black under the pointer, which reads as a selection rather than
 *  a bar answering. A bar lifts from ITS OWN fill toward the ink by a measured step, and a step that
 *  a reader cannot see is refused rather than shipped. Same rule and same two numbers as the ranking
 *  beat's columns and the donut's wedges. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;

export function DirectedHistogramWeb({
  bars,
  yTicks,
  xTicks,
  binWidth,
  median,
  levels,
  bandFeet,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  medianNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  bars: Bar[];
  yTicks: number[];
  xTicks: number[];
  binWidth: number;
  median: number;
  levels: LevelDeclaration;
  bandFeet: Record<string, string>;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  medianNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let neutral = mix(ground, ink, 0.34);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const baseline = mix(ground, ink, 0.75);
  const hoverOf = (fill: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `a bar lifts only ${step.toFixed(3)}:1 under the pointer, under the ` +
          `${MARK_ACTIVE_MIN_STEP}:1 floor — a reader cannot see which bar answered`,
      );
    return lifted;
  };

  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  /**
   * EVERY RULE ON THIS PLATE RUNS THE FULL HEIGHT OF IT, SO EVERY RULE CROSSES BARS.
   *
   * `references/types/histogram.md`'s own amendment, measured on the static sibling: a median rule
   * "spends nearly its whole length INSIDE the tallest bar, and it is then measured against that
   * bar's fill, not against the page". This page reproduced that exactly and unmeasured — the rule
   * was `mix(ground, ink, 0.6)`, which reads 5,68:1 against the creme ground and **1,17:1 against
   * the accent bar it crosses at the median**. The static beat answered by inking the rule near
   * black, which works there because the bar it crosses is a mid grey. Here the median falls inside
   * an ACCENT bin, and no ink reads at 3:1 over both a near-white page and this accent.
   *
   * So the rules are cased, the way this base's own yardsticks are: a ground-coloured dash under the
   * ink dash, same pattern, so the casing shows only under the dashes and the rule is measured
   * against ITS OWN CASING wherever it crosses a mark. Asserted below over every fill on the plate
   * rather than looked at.
   */
  const ruleInk = label;
  const ruleCasing = ground;
  for (const fill of [
    { ink: ground, where: "the bare ground" },
    { ink: neutral, where: "a neutral bar" },
    { ink: accent, where: "one of the two bins the headline counts" },
    { ink: grid, where: "a gridline" },
  ]) {
    const best = Math.max(contrast(ruleInk, fill.ink), contrast(ruleCasing, fill.ink));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `a full-height rule crosses ${fill.where} (${fill.ink}) and neither its dash ${ruleInk} ` +
          `(${contrast(ruleInk, fill.ink).toFixed(3)}:1) nor its casing ${ruleCasing} ` +
          `(${contrast(ruleCasing, fill.ink).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a rule is laid down to be read WHERE IT CROSSES`,
      );
  }
  if (contrast(ruleInk, ruleCasing) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `a rule is drawn ${ruleInk} on a casing of ${ruleCasing}, ` +
        `${contrast(ruleInk, ruleCasing).toFixed(3)}:1 against each other — a rule that cannot be ` +
        `told from its own halo is a rule the reader cannot follow across the plot`,
    );
  /** What a bar beyond the chosen band steps back to: no fill, and its own outline. GEOMETRIC and
   *  not a second tone, because two tones clamped to the same floor on the same ground come out
   *  identical by construction — measured on the dumbbell at 1,023:1. */
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `a hollowed bar is outlined ${neutral} on ${ground}, ` +
        `${contrast(neutral, ground).toFixed(3)}:1 — a bar that steps back still has to be seen`,
    );

  const lastEdge = bars[bars.length - 1].from + binWidth;
  const x = (v: number) => (v / lastEdge) * FRAME.width;
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed the twenty-one bars the beat actually draws
   * and its one series, so an option reading its band off a bar that is not on the plate, or laying
   * its reference outside the frame, is caught here and not by a reader. `width` is passed because
   * on this shape the MEASURED variable is the x axis: a coverage band's edge is a reference stood
   * UP, and a flat one would name a count rather than a quantile.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: bars.map((b) => b.key),
    drawnSeries: [...SERIES],
    height: FRAME.height,
    width: FRAME.width,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  for (const rule of levelRules)
    if (rule.x === undefined)
      throw new Error(
        `the yardstick option ${rule.slug} lays its ${rule.series} reference flat, and on a histogram ` +
          `the measured variable is the x axis — a flat rule would name a COUNT, not a quantile`,
      );
  /** No bin the headline counts may lie beyond an offered band: the accent that carries the claim is
   *  drawn in every state of this page (`directed-interaction.md` rule 5). Asserted rather than
   *  remembered, because the day a fourth option is added below 4 t this is what says so. */
  for (const bar of bars)
    if (bar.inClaim && bar.beyond.length)
      throw new Error(
        `the bin ${bar.label} carries the accent and would be hollowed by the band(s) ` +
          `${bar.beyond.join(", ")} — a control cannot take the claim's own colour off the plate`,
      );

  const css = [
    levelChromeCss({ scope: SCOPE }),
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--muted)", weight: "400" },
      revealMs: REVEAL_MS,
    }),
    /* THE SPAN OUTSIDE THE CHOSEN BAND, STEPPING BACK. One rule per option, emitted AFTER the
       vocabulary's own block: `levelCss` writes `:has(#…:checked) [data-col] { stroke: none }` at
       (1,1,0) to take every ring off before it puts one back, and these are (1,2,0), so they clear
       it without either of them having to be remembered. `:not(.mark-active)` leaves the hover
       alone — a hollowed bar a reader asks still answers in full ink. */
    ...levels.options.map((option) => {
      const slug = levelSlugOf(option.key);
      return (
        `${SCOPE}:has(#${levelOptionId(LEVEL_ID_PREFIX, slug)}:checked) ` +
        `[data-beyond~="${slug}"]:not(.mark-active) { fill: var(--ground); stroke: var(--neutral); stroke-width: 1; }`
      );
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
        ["--neutral" as string]: neutral,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the quantile's own value, how many of the 213
          sit under it, its multiple of the median, and what share of the drawn width the countries
          beyond it occupy. None of those four is a bin edge, so none of them is on the plate. Its
          row is reserved whether or not an option is chosen, so choosing one never moves the plot
          underneath it. The untouched option reveals none: it is the claim the title states. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "40px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 40} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {t}
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

          {/* Bars TOUCH: a histogram's bins are contiguous intervals, and a gap between them says
              the scale is categorical. The 1 px ground hairline that tells one from the next is
              drawn BELOW as its own element and is no longer a stroke on the rect — `levelCss`
              strips `stroke` from everything carrying `data-col` before it rings the chosen bar,
              and `data-col` is what a bar carries here, so a stroked rect lost its separation the
              moment a reader pressed any band. */}
          {bars.map((b) => (
            <rect
              key={b.key}
              data-col={b.key}
              data-mark={b.key}
              {...(b.beyond.length ? { "data-beyond": b.beyond.join(" ") } : {})}
              x={x(b.from)}
              y={y(b.count)}
              width={x(b.from + binWidth) - x(b.from)}
              height={FRAME.height - y(b.count)}
              fill={b.inClaim ? accent : neutral}
              style={
                { "--mark-active": hoverOf(b.inClaim ? accent : neutral) } as React.CSSProperties
              }
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The hairline, only where two bars actually overlap in height — from the shorter
              neighbour's top down to the baseline. Above that there is one bar and the page behind
              it, which needs no separating. */}
          {bars.slice(1).map((b, i) => {
            const top = Math.max(y(bars[i].count), y(b.count));
            return top >= FRAME.height ? null : (
              <line
                key={`sep-${b.key}`}
                x1={x(b.from)}
                x2={x(b.from)}
                y1={top}
                y2={FRAME.height}
                stroke={ground}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* EVERY OPTION'S REFERENCE, DRAWN ONCE AT ITS OWN COORDINATE AND HIDDEN. The stylesheet
              only reveals them; nothing here emits a transform, which is what keeps
              `interaction.mjs`'s resolution honest — it reads `cx`/`cy` once at init and a CSS
              transform never changes them. Two lines per reference carrying the same
              `data-level-rule`: the ground casing first, then the dash on top of it, same pattern,
              so the casing shows only under the dashes. */}
          {levelRules.map((r) => (
            <g key={r.key}>
              <line data-level-rule={r.key} x1={r.x} x2={r.x} y1={0} y2={FRAME.height} stroke={ruleCasing} strokeWidth={RULE_CASING_PX} strokeDasharray={RULE_DASH} vectorEffect="non-scaling-stroke" />
              <line data-level-rule={r.key} x1={r.x} x2={r.x} y1={0} y2={FRAME.height} stroke={ruleInk} strokeWidth={RULE_PX} strokeDasharray={RULE_DASH} vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {/* The median, cased for the same reason and in every state of this page. */}
          <line x1={x(median)} x2={x(median)} y1={0} y2={FRAME.height} stroke={ruleCasing} strokeWidth={RULE_CASING_PX} strokeDasharray={MEDIAN_DASH} vectorEffect="non-scaling-stroke" />
          <line x1={x(median)} x2={x(median)} y1={0} y2={FRAME.height} stroke={ruleInk} strokeWidth={direction.stroke?.rule ?? 0.8} strokeDasharray={MEDIAN_DASH} vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {bars.map((b) => (
            <circle
              key={`hit-${b.key}`}
              className="pt"
              data-mark-ref={b.key}
              cx={x(b.from + binWidth / 2)}
              cy={y(b.count)}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{ ...regs.annot, color: accent, ...noteAnchor(28), top: "3%" }}
          >
            {claimNote}
          </span>
          <span
            className="note"
            style={{ ...regs.annot, color: label, ...noteAnchor(pct(x(median), FRAME.width)), top: "22%" }}
          >
            {medianNote}
          </span>

          {/* EACH BAND'S OWN VALUE, AT THE FOOT OF ITS RULE, revealed by the same `:checked` that
              reveals the rule. It is the one reading that belongs ON the plot rather than in the
              sentence: the quantile is NOT a bin edge, so the axis under it cannot print it and the
              reader has no way to say where the line actually stands. Drawn in full ink, which
              measures 6,74:1 / 6,92:1 / 5,89:1 over a neutral bar and past 17:1 over the ground —
              the two things a foot label can sit on here, the accent bins being entirely to the left
              of the leftmost band. */}
          {levelRules.map((rule) => {
            const at = pct(rule.x as number, FRAME.width);
            return (
              <span
                key={`${rule.key}-foot`}
                className="note"
                data-level-rule={rule.key}
                style={{
                  ...regs.annot,
                  color: label,
                  bottom: "1%",
                  ...(at > 75
                    ? { right: `${100 - at}%`, maxWidth: `${Math.max(10, at)}%` }
                    : { left: `${at}%`, maxWidth: `${Math.max(10, 100 - at)}%` }),
                  whiteSpace: "nowrap",
                }}
              >
                {bandFeet[rule.slug]}
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
