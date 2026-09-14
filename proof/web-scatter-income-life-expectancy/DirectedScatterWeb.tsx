/**
 * Income against life expectancy across every country with both readings in 2021, drawn as a
 * scatter THROUGH the design base and delivered as an interactive page.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the claim here is about the SHAPE of the
 * whole cloud, so there is no named subject: every point is one neutral, and the only ink that
 * carries an argument is the threshold rule and the band it names. The one case that becomes ink is
 * the one the READER parks a yardstick on, and only while they hold it.
 *
 * THE X AXIS IS LOGARITHMIC AND SAYS SO IN WORDS. A log axis is the single most common silent lie in
 * this family: it makes a tenfold difference look like a step, and a reader who has not noticed the
 * ticks reads the flattening as steeper than it is. The caveat names it; the ticks are decades.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT A TOOLTIP. A still can draw the author's threshold and assert
 * that the band above it is narrow; it cannot let a reader stand anywhere else. Here the reader
 * parks the threshold on a country they hold, and the two references that cross the plot are that
 * country's OWN two values — one upright at its income, one flat at its life expectancy. What comes
 * back with them is the claim in the reader's hand: at Nigeria, 119 countries are richer and not one
 * lives a shorter life; at the United States, 7th richest of 165, forty poorer countries live
 * longer.
 *
 * NO BUBBLE, AND THAT IS A CORRECTION. This build sized every mark by population, `sqrt(pop/max)`,
 * which is area-proportional and looks correct — and then floored the radius at 2,4 units, which
 * pinned 95 of the 165 countries at an identical size across a 253× population range while the
 * caveat stated flatly that the point's area WAS the population. The floor could not be lowered
 * either: a 21 220:1 population range drawn area-true puts the smallest mark at 0,15 units, under
 * one reader pixel. The static sibling had already refused this third variable in writing
 * (`IncomeLifeExpectancyScatter.tsx`, "no bubble, no third variable"). One radius for every country
 * now; population is carried where it was always readable, in the answer a mark gives when asked.
 */

import { mix, adjustToContrast, contrast, channels, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 880, height: 420, xAxisRowPx: 30 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** One radius for every country — see the header. Same number the static sibling draws. */
const MARK_RADIUS = 3.4;
const MARK_OPACITY = 0.55;
/** The ring the chosen case takes, in READER pixels: a hairline at 320 px and at 1600. */
const RING_PX = 1.2;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "2 5";
const REVEAL_MS = 220;
/** The two axes this beat lays a yardstick on. `level.ts` calls them series; here they are axes. */
export const AXES = ["income", "life"] as const;

export type Point = { code: string; x: number; y: number; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

/**
 * THE ONE PAIR OF SCALES, BUILT ONCE AND SHARED WITH THE RUNNER.
 *
 * The runner has to place each yardstick option's two references in the geometry's own units, which
 * means calling exactly the scales this component draws with. `proof/web-grouped-bar-wind-vs-solar`
 * does it by calling `fitY` twice with the same arguments and a comment asking the next person to
 * keep them in step; a log scale has more to get wrong, so this beat exports the pair instead.
 */
export function scalesFor(xTicks: { value: number }[], yTicks: number[]) {
  const xLo = Math.log10(xTicks[0].value);
  const xHi = Math.log10(xTicks[xTicks.length - 1].value);
  return {
    x: (v: number) => ((Math.log10(v) - xLo) / (xHi - xLo)) * FRAME.width,
    y: fitY(yTicks[0], yTicks[yTicks.length - 1], FRAME.height, 0.04),
  };
}

/**
 * THE FILL THAT COMPOSITES ONTO THE FLOOR, solved backwards — and the defect that forced it.
 *
 * The build this replaces lifted the dot fill to the 3:1 non-text floor and then painted it at
 * `fillOpacity 0,6`. A mark drawn at alpha over the ground IS `mix(ground, fill, alpha)`, so the
 * mark a READER SEES measured 1,752:1 in creme, 1,968 in nocturne and 1,744 in rapport — all three
 * under the floor the code believed it had cleared, because the colour it measured was never
 * painted anywhere. `mix` is a plain sRGB lerp and so is SVG alpha compositing, so the inverse is
 * exact: pick the composite the floor asks for, then solve for the fill that lands on it.
 *
 * Out of gamut is a refusal and not a clamp: a clamp would quietly hand back a fill that composites
 * SHORT of the floor, which is the same silence this function exists to end.
 */
function fillThatCompositesTo(target: string, ground: string, alpha: number): string {
  const g = channels(ground);
  const t = channels(target);
  const solved = g.map((v, i) => v + (t[i] - v) / alpha);
  if (solved.some((v) => v < -0.5 || v > 255.5))
    throw new Error(
      `no in-gamut fill composites to ${target} on ${ground} at opacity ${alpha} — the mark cannot ` +
        `reach the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor at this opacity on this ground, and a ` +
        `clamped fill would land short of it in silence`,
    );
  return (
    "#" +
    solved
      .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function DirectedScatterWeb({
  points,
  xTicks,
  yTicks,
  threshold,
  thresholdNote,
  bandNote,
  band,
  levels,
  levelPositions,
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
  points: Point[];
  xTicks: { value: number; label: string }[];
  yTicks: number[];
  threshold: number;
  thresholdNote: string;
  bandNote: string;
  band: { low: number; high: number };
  levels: LevelDeclaration;
  /** Where each option's name is written on the plot: the crossing of its own two references. */
  levelPositions: { slug: string; code: string; label: string; x: number; y: number }[];
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

  // THE MARK, MEASURED AS PAINTED. `dotTarget` is the colour the reader's eye receives; `dot` is
  // what the `fill` attribute has to be for that to happen at `MARK_OPACITY`.
  let dotTarget = mix(ground, ink, 0.4);
  if (contrast(dotTarget, ground) < NON_TEXT_CONTRAST_MIN)
    dotTarget = adjustToContrast(dotTarget, ground, NON_TEXT_CONTRAST_MIN) ?? dotTarget;
  const dot = fillThatCompositesTo(dotTarget, ground, MARK_OPACITY);
  const painted = mix(ground, dot, MARK_OPACITY);
  if (contrast(painted, ground) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the mark is drawn ${dot} at opacity ${MARK_OPACITY}, which a reader receives as ${painted} — ` +
        `${contrast(painted, ground).toFixed(3)}:1 against the ground, under the ` +
        `${NON_TEXT_CONTRAST_MIN}:1 non-text floor. Measure the mark the page PAINTS, never the ` +
        `colour the fill attribute happens to carry`,
    );

  const rule = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const bandFill = mix(ground, rule, 0.08);

  /**
   * THE ACCENT IS SPENT ONCE, AND THE BEAT REFUSES RATHER THAN REMEMBERS.
   *
   * The accent on this page carries the author's threshold and the band it names — one sentence
   * drawn twice. The reader's yardstick is a DIFFERENT argument: it says "the place you asked
   * about". A hue that meant both would be the accent spent twice, and the reader would have no way
   * to tell the claim from their own question.
   */
  const yardstick = label;
  if (yardstick.toLowerCase() === rule.toLowerCase())
    throw new Error(
      `the reader's yardstick is drawn ${yardstick}, the same ink as the threshold the page asserts ` +
        `— that is the accent spent twice, on two arguments that are not the same argument ` +
        `(PALETTE.md, "One accent, spent once")`,
    );
  const casing = ground;

  /**
   * EVERY FILL A YARDSTICK CROSSES, MEASURED — not the ground alone.
   *
   * A reference spans the whole plot, so it crosses everything drawn on it. The crossing that
   * matters most is the accent threshold rule: ink against it measures 2,979:1 in creme, 1,627:1 in
   * nocturne and 2,873:1 in rapport, all under the non-text floor, and the flat yardstick crosses it
   * EVERY time, at the one landmark the comparison is about.
   *
   * So each reference is drawn twice, a wider ground casing under the dash on the same dash pattern,
   * and the floor below is the honest general form of the grouped bar's pair: the rule is legible
   * over a fill when EITHER the dash or its casing separates from that fill, and the dash must
   * always separate from its own casing or it vanishes into its own halo.
   */
  const crossed: { ink: string; where: string }[] = [
    { ink: ground, where: "the bare ground" },
    { ink: painted, where: "a country's mark" },
    { ink: bandFill, where: "the band above the threshold" },
    { ink: rule, where: "the threshold rule the page asserts" },
    { ink: grid, where: "a gridline" },
  ];
  for (const fill of crossed) {
    const best = Math.max(contrast(yardstick, fill.ink), contrast(casing, fill.ink));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `the reader's yardstick crosses ${fill.where} (${fill.ink}) and neither its dash ` +
          `${yardstick} (${contrast(yardstick, fill.ink).toFixed(3)}:1) nor its casing ${casing} ` +
          `(${contrast(casing, fill.ink).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a reference is laid down to be read WHERE IT CROSSES, and one ` +
          `the picture swallows is offered as though the reader could follow it`,
      );
  }
  const inside = contrast(yardstick, casing);
  if (inside < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the yardstick is drawn ${yardstick} on a casing of ${casing}, which measure ` +
        `${inside.toFixed(3)}:1 against each other — a rule that cannot be told from its own halo is ` +
        `a rule the reader cannot follow across the plot`,
    );

  const { x, y } = scalesFor(xTicks, yTicks);
  // Every mark inside its own frame, proven rather than trusted — the defect the first render had.
  for (const p of points) {
    if (p.x < xTicks[0].value || p.x > xTicks[xTicks.length - 1].value)
      throw new Error(`${p.code} draws x=${p.x}, outside ${xTicks[0].value}-${xTicks[xTicks.length - 1].value}`);
    if (p.y < yTicks[0] || p.y > yTicks[yTicks.length - 1])
      throw new Error(`${p.code} draws y=${p.y}, outside ${yTicks[0]}-${yTicks[yTicks.length - 1]}`);
  }

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed what the beat actually draws — all 165
   * countries and BOTH axes — so an option reading its references off a country that is not on the
   * plate, or laying one of the two coordinates and not the other, is caught here and not by a
   * reader. `width` is passed because this beat is the one that stands a reference up.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: points.map((p) => p.code),
    drawnSeries: [...AXES],
    height: FRAME.height,
    width: FRAME.width,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  const declaredSlugs = new Set(levelRules.map((r) => r.slug));
  for (const position of levelPositions) {
    if (!declaredSlugs.has(position.slug))
      throw new Error(`a name is written on the plot for ${position.slug}, which declares no reference`);
    if (position.x < 0 || position.x > FRAME.width || position.y < 0 || position.y > FRAME.height)
      throw new Error(`the name for ${position.slug} is written outside the plot at ${position.x},${position.y}`);
  }

  // THE ANNOTATION REGISTER'S INK AND WEIGHT LEAVE THE INLINE STYLE for the name a chosen option
  // writes on the plot: an inline `color` beats every generated selector, so with `regs.annot`
  // spread whole the option rules could not light it. Same correction the grouped bar made on its
  // axis names, and the trap is documented there.
  const { color: annotInk, fontWeight: annotWeight, ...annotRest } = regs.annot as any;

  const css = [
    // The default state as a rule and never as an inline style — see above.
    `${SCOPE} .overlay [data-axis] { color: var(--annot-ink); font-weight: var(--annot-weight); }`,
    // A mark takes no stroke until a reader asks for one. Declared here rather than inline so the
    // generated ring can win: an inline `stroke` beats every selector there is.
    `${SCOPE} [data-col] { stroke: none; }`,
    levelChromeCss({ scope: SCOPE }),
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      // THE CHOSEN NAME TAKES FULL INK AND THE REGISTER'S OWN WEIGHT, not a bold — and that is a
      // measurement, not restraint. A bold would ask the page for a SECOND FACE of the annotation
      // family (Merriweather 700 italic in creme), which the build subsets per face: the six names
      // came back set in Georgia, visible only to a reader who chose an option, and
      // `verify-web.mjs`'s revealed-text probe named all twenty characters. On this plate the
      // emphasis is not needed anyway — a chosen case's name is the ONLY name on the plot.
      lit: { ink: "var(--ink)", weight: "var(--annot-weight)", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--muted)", weight: "var(--annot-weight)" },
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
        ["--annot-ink" as string]: annotInk,
        ["--annot-weight" as string]: String(annotWeight ?? 400),
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
          only get from it. Each accessible name CONTAINS its visible one; `assertLevelDeclaration`
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the rank on each axis, and the two counts no
          axis on this plate carries: how many countries are richer AND live shorter, how many are
          poorer AND live longer. Its row is reserved whether or not an option is chosen, so the plot
          underneath never jumps. The untouched option reveals none, because it is not a comparison:
          it is the claim the title states. */}
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
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.map((t) => (
            <line key={`h${t}`} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {xTicks.map((t) => (
            <line key={`v${t.value}`} x1={x(t.value)} x2={x(t.value)} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* The band the headline measures, drawn as a band rather than described. */}
          <rect
            x={x(threshold)}
            y={y(band.high)}
            width={FRAME.width - x(threshold)}
            height={y(band.low) - y(band.high)}
            fill={rule}
            fillOpacity={0.08}
          />
          <line x1={x(threshold)} x2={x(threshold)} y1={0} y2={FRAME.height} stroke={rule} strokeWidth={direction.stroke?.rule ? direction.stroke.rule * 1.6 : 1.4} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />

          {points.map((p) => (
            <circle
              key={p.code}
              className="pt"
              data-col={p.code}
              cx={x(p.x)}
              cy={y(p.y)}
              r={MARK_RADIUS}
              fill={dot}
              fillOpacity={MARK_OPACITY}
              vectorEffect="non-scaling-stroke"
              tabIndex={0}
              role="img"
              aria-label={p.detail}
              data-detail={p.detail}
            />
          ))}

          {/* EVERY OPTION'S REFERENCES, DRAWN ONCE AT THEIR OWN COORDINATE AND HIDDEN, AND DRAWN
              LAST. The stylesheet only reveals; nothing here emits a transform, which is what keeps
              `interaction.mjs`'s resolution honest — it reads `cx`/`cy` once at init and a CSS
              transform never changes them.

              Two per option and on different axes: `x` stands a reference UP at the country's own
              income, `y` lays one FLAT at its life expectancy. That pair is the whole reason
              `level.ts` was widened — on a scatter both axes carry a measured value, so a case's own
              values are two references and a vocabulary that could only lay them flat would answer
              half of them.

              Each is TWO lines carrying the same `data-level-rule`, so the generated `opacity: 1`
              reveals both: the ground-coloured casing first, then the dash on top of it, same dash
              pattern, so the casing shows only under the dashes. */}
          {levelRules.map((r) => {
            const upright = r.x !== undefined;
            const geometry = upright
              ? { x1: r.x, x2: r.x, y1: 0, y2: FRAME.height }
              : { x1: 0, x2: FRAME.width, y1: r.y, y2: r.y };
            return (
              <g key={r.key}>
                <line
                  data-level-rule={r.key}
                  {...geometry}
                  stroke={casing}
                  strokeWidth={RULE_CASING_PX}
                  strokeDasharray={RULE_DASH}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  data-level-rule={r.key}
                  {...geometry}
                  stroke={yardstick}
                  strokeWidth={RULE_PX}
                  strokeDasharray={RULE_DASH}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{ ...regs.annot, color: label, ...noteAnchor(pct(x(threshold), FRAME.width)), top: "2%" }}
          >
            {thresholdNote}
          </span>
          <span
            className="note"
            style={{
              ...regs.annot,
              color: label,
              right: "0%",
              top: `${pct((y(band.low) + y(band.high)) / 2, FRAME.height)}%`,
              transform: "translateY(-50%)",
              maxWidth: "34%",
              whiteSpace: "normal",
            }}
          >
            {bandNote}
          </span>

          {/* THE CHOSEN CASE'S NAME, AT THE FOOT OF ITS OWN INCOME RULE — the other half of "the
              reader's own row is named and ringed among marks that are otherwise anonymous". Hidden
              by the same `data-level-rule` that hides the references, lit by the same `data-axis`
              rule that lights a chosen datum's name elsewhere in this vocabulary, and sitting on
              `.note`'s own ground chip so it never puts ink on a fill.

              AT THE FOOT AND NOT AT THE CROSSING, and that is a de-collision rather than a
              preference. Written at the crossing first and looked at: the band's own note is
              anchored to the right edge at the band's vertical centre, and the United States
              crossing (76,4 ans, 87 % across) landed on top of it — two sentences in one strip,
              one of them argument-bearing. The threshold note already labels its rule from the TOP
              of the plot; this one labels its rule from the BOTTOM, through the same `noteAnchor`,
              so the two never meet each other and neither can reach the band's note. What says
              WHICH POINT is the reader's is the ring on the mark, which is that treatment's own
              instrument. */}
          {levelPositions.map((position) => (
            <span
              key={position.slug}
              className="note"
              data-level-rule={levelRules.find((r) => r.slug === position.slug)!.key}
              data-axis={position.code}
              style={{
                ...annotRest,
                bottom: "2%",
                top: "auto",
                ...noteAnchor(pct(position.x, FRAME.width)),
              }}
            >
              {position.label}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t, i) => {
            const centre = pct(x(t.value), FRAME.width);
            const anchor =
              i === xTicks.length - 1
                ? { right: "0%", transform: "translateX(0)" }
                : i === 0
                  ? { left: "0%", transform: "translateX(0)" }
                  : { left: `${centre}%` };
            return (
              <span key={t.value} className="axis-label x" style={{ ...regs.axis, ...anchor }}>
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
