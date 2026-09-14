/**
 * France's CO₂ per person by decade since 1950, drawn as box plots THROUGH the design base and
 * delivered as an interactive page. The `box plot` beat of this tree's web format.
 *
 * TWO CONTROLS, BOTH WRITTEN IN `BRIEF.md` BEFORE THIS FILE EXISTED.
 *
 * THE YARDSTICK (`level.ts`, unchanged — no fourth vocabulary). Eight falling medians is what the
 * headline asserts, and a still can print all eight. What a still cannot do is tell the reader
 * whether the decades SEPARATE: eight medians fall monotonically just as happily when the boxes
 * underneath them sit on top of each other, and nobody can see that in a row of rectangles at eight
 * different x. So the reader parks one decade's OWN THREE LEVELS — Q1, median, Q3 — flat across all
 * eight, and every other box is read against that band instead of against the axis. What comes back
 * is the fact the falling medians bury: the 1980s box and the 1960s box are the same box.
 *
 * ALL THREE LEVELS OR NONE, and `assertLevelDeclaration` is right to insist. A box plot's argument
 * is the SPREAD; a yardstick carrying only the median would measure this picture on the one channel
 * a plain line chart already has.
 *
 * ASK A YEAR (`the-sample-is-drawn-beside-its-own-summary`). A box is a five-number SUMMARY: it
 * hides the ten readings it was computed from, and a reader has no way to tell a decade that fell
 * steadily from one that swung and happened to land on the same median. So every year is drawn as
 * its own dot beside its box, and every dot answers: its year, its value, and where it sits inside
 * its own decade. The static plate could draw the dots; it could not name any of them.
 *
 * `every-band-names-its-own-statistic` — each box prints its own median and its own n under it, so
 * a partial decade cannot be read as a full one by mistake.
 *
 * THE WHISKERS ARE TUKEY'S, AND THE FENCE IS COMPUTED, NEVER DRAWN TO THE EXTREME. A whisker that
 * always reaches the minimum and maximum is a range plot wearing a box plot's clothes. Seven of the
 * eight decades have no reading outside their own fence, so for them the two rules give the same
 * number and neither the picture nor a check could tell them apart; the 1980s is the decade that
 * separates them, and the CAVEAT STATES THE RULE IN FULL because a box plot that does not say where
 * its whiskers stop is unreadable in principle.
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
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 880, height: 400, xAxisRowPx: 44 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** The three levels one decade's box is made of, in the order the eye meets them going down the
 *  page. `level.ts` calls them series; here they are the three edges of one shape, and an option
 *  laying only one of them is the half-answer that vocabulary already refuses. */
export const LEVEL_SERIES = ["q3", "median", "q1"] as const;
const RING_PX = 1.6;
const RING_INSET = 4;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4.5;
/** The band's edges are dotted and its median is dashed, so the three rules are told apart by shape
 *  rather than by an ink the yardstick is not allowed to spend. */
const RULE_DASH: Record<string, string> = { q1: "2 5", q3: "2 5", median: "9 5" };
/** WHAT EACH RULE SAYS ABOUT ITSELF, and it is the one thing the picture cannot. Three dashes in
 *  one ink are three references in one ink; which of them is the median is readable off their order
 *  only because this beat ASSERTS Q1 < median < Q3, and an assertion in a runner is not a label on a
 *  plot. NOT THE VALUE — the reader can read that off the y-axis the rule is level with, and the
 *  sentence under the control prints the band in full; a third copy would be ink spent saying what
 *  two other places already say. */
const RULE_WORD: Record<string, string> = { q1: "Q1", median: "médiane", q3: "Q3" };
const REVEAL_MS = 220;

export type Box = {
  key: string;
  label: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  medianLabel: string;
  outliers: { year: number; value: number; label: string }[];
  readings: { year: number; value: number; detail: string }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBoxplotWeb({
  boxes,
  peakKey,
  yTicks,
  levels,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  peakNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  boxes: Box[];
  peakKey: string;
  yTicks: number[];
  levels: LevelDeclaration;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  peakNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let sample = mix(ground, ink, 0.36);
  if (contrast(sample, ground) < NON_TEXT_CONTRAST_MIN)
    sample = adjustToContrast(sample, ground, NON_TEXT_CONTRAST_MIN) ?? sample;
  const boxFill = mix(accent, ground, 0.72);
  const boxStroke = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const baseline = mix(ground, ink, 0.7);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const subjectInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;

  /**
   * THE READER'S YARDSTICK IS NOT THE ACCENT. The accent on this plate already carries the peak —
   * which decade the page's own claim is about — and a hue that meant both would leave the reader no
   * way to tell the author's argument from their own question.
   */
  const yardstick = label;
  if (yardstick.toLowerCase() === accent.toLowerCase() || yardstick.toLowerCase() === boxFill.toLowerCase())
    throw new Error(
      `the reader's yardstick is drawn ${yardstick}, the ink this page already spends on the decade ` +
        `its claim is about — that is the accent spent twice, on two arguments that are not the same`,
    );
  const ruleCasing = ground;
  // EVERY FILL A REFERENCE CROSSES, MEASURED — not the ground alone. A level is laid FLAT across the
  // whole plot, so it crosses every box on it, including the peak's at full accent. A reference is
  // laid down to be read WHERE IT CROSSES.
  for (const fill of [
    { ink: ground, where: "the bare ground" },
    { ink: boxFill, where: "an ordinary decade's box" },
    { ink: accent, where: "the peak decade's box" },
    { ink: sample, where: "a year's own dot" },
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

  // A BOX PLOT IS A POSITION ENCODING, SO THE AXIS IS FITTED AND NOT ANCHORED AT ZERO — nothing
  // here is measured by its length from a baseline. What IS checked is that the fitted window
  // actually contains every mark drawn inside it, outliers included: an axis that clips a reading
  // is worse than one that wastes space, because the clipped mark is silently gone.
  const floor = yTicks[0];
  const top = yTicks[yTicks.length - 1];
  for (const b of boxes)
    for (const v of [b.min, b.max, ...b.outliers.map((o) => o.value)])
      if (v < floor || v > top)
        throw new Error(`${b.label} draws ${v}, outside the fitted axis ${floor}–${top}`);
  const y = fitY(floor, top, FRAME.height);
  const band = FRAME.width / boxes.length;
  const cx = (i: number) => band * i + band / 2;
  const boxW = band * 0.30;
  const stripX = (i: number) => cx(i) + boxW * 0.85;

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. `drawnKeys` is the eight decades the plate actually
   * carries, so an option reading its levels off a decade that is not on the plate is refused; and
   * `drawnSeries` is the three edges of a box, so an option that lays a rule at the median and
   * nowhere else is refused as the half-answer it is.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: boxes.map((b) => b.key),
    drawnSeries: [...LEVEL_SERIES],
    height: FRAME.height,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  for (const rule of levelRules)
    if (rule.y === undefined)
      throw new Error(
        `the yardstick's ${rule.key} is not laid flat — on this shape the value axis is vertical, ` +
          `and an upright would name a DECADE, not a level`,
      );

  // THE DEFAULT STATE AS RULES, NEVER AS INLINE STYLES. An inline `regs.*` spread beats every
  // generated rule, so an axis label carrying its own `color` could not be stepped back by the
  // yardstick — the correction the grouped bar, the scatter and the dumbbell all had to make.
  const { color: axisInk, fontWeight: axisWeight, ...axisRest } = regs.axis as any;
  const { fontWeight: annotWeight, ...annotRest } = regs.annot as any;

  const css = [
    `${SCOPE} .x-axis [data-axis] { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    `${SCOPE} .x-axis [data-axis="${peakKey}"] { color: var(--subject-ink); font-weight: 700; }`,
    // A BOX TAKES NO RING UNTIL A READER ASKS FOR ONE. Declared here rather than as a presentation
    // attribute so the yardstick's generated ring is the only thing that ever draws one — and
    // carried on a ring shape of its own rather than on the box, because `[data-col] { stroke: none }`
    // would otherwise strip the outline off all eight boxes the moment any option is chosen.
    `${SCOPE} [data-col] { stroke: none; }`,
    levelChromeCss({ scope: SCOPE }),
    // The vocabulary opens its fieldset with 10px above it, which is right on a plate carrying six
    // pills; nine of them wrap on a phone and this beat's plot is what pays for the row. Emitted
    // after the vocabulary's own block at the same specificity, so source order is the whole of it.
    `${SCOPE} .chart-level { margin-top: 2px; }`,
    // AND THE SENTENCE'S OWN GAP, FOR THE SAME REASON AND MEASURED THE SAME WAY. The vocabulary
    // opens its note row with 4 px above it; with the fieldset and the note both present this beat
    // stood 4 px outside an 812 px phone window in nocturne, whose display register alone takes
    // 351 px of it. Emitted after the vocabulary's own block at the same specificity.
    `${SCOPE} .level-notes { margin-top: 0; }`,
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--muted)", weight: String(axisWeight ?? 400) },
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
        ["--axis-ink" as string]: axisInk,
        ["--axis-weight" as string]: String(axisWeight ?? 400),
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

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "34px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 34} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
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

          {boxes.map((b, i) => {
            const isPeak = b.key === peakKey;
            return (
              <g key={b.key}>
                {/* whiskers — each end is the FURTHEST READING STILL INSIDE THE FENCE, computed in
                    the runner, never the decade's own extreme */}
                <line x1={cx(i)} x2={cx(i)} y1={y(b.min)} y2={y(b.q1)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i)} x2={cx(i)} y1={y(b.q3)} y2={y(b.max)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i) - boxW / 3} x2={cx(i) + boxW / 3} y1={y(b.min)} y2={y(b.min)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={cx(i) - boxW / 3} x2={cx(i) + boxW / 3} y1={y(b.max)} y2={y(b.max)} stroke={boxStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                {/* the box */}
                <rect
                  x={cx(i) - boxW / 2}
                  y={y(b.q3)}
                  width={boxW}
                  height={Math.max(1, y(b.q1) - y(b.q3))}
                  fill={isPeak ? accent : boxFill}
                  stroke={boxStroke}
                  strokeWidth={direction.stroke?.rule ?? 0.8}
                  vectorEffect="non-scaling-stroke"
                />
                {/* the median, in ink — never the box's own fill or stroke colour. On the peak, the
                    box is at full accent and the median is knocked out in the GROUND instead: two
                    inks clamped independently to the same floor on the same ground come out
                    identical by construction, and a box's fill against its own median line is
                    exactly that shape. */}
                <line
                  x1={cx(i) - boxW / 2}
                  x2={cx(i) + boxW / 2}
                  y1={y(b.median)}
                  y2={y(b.median)}
                  stroke={isPeak ? ground : ink}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                {/* the sample the box hides */}
                {b.readings.map((r, k) => (
                  <circle
                    key={r.year}
                    data-mark={`${b.key}-${r.year}`}
                    cx={stripX(i) + ((k % 3) - 1) * 3.2}
                    cy={y(r.value)}
                    r={2.1}
                    fill={sample}
                  />
                ))}
                {/* THE READING OUTSIDE THE FENCE, DRAWN HOLLOW AND NOT AS A LONGER WHISKER. */}
                {b.outliers.map((o) => (
                  <circle key={o.year} cx={cx(i)} cy={y(o.value)} r={3} fill={ground} stroke={boxStroke} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            );
          })}

          {/* EVERY OPTION'S THREE REFERENCES, DRAWN ONCE AT THEIR OWN HEIGHT AND HIDDEN. The
              stylesheet only reveals them; nothing here emits a transform, which is what keeps
              `interaction.mjs`'s resolution honest — it reads `cx`/`cy` once at init and a CSS
              transform never changes them.

              ON TOP OF THE BOXES, not behind them, and that is the opposite of what the dumbbell
              does for a reason this shape owns: a level is read at the moment it CROSSES a box —
              "is the 1980s top edge above or below this line" is the whole question — and a rule
              hidden under the eight fills would disappear at each of the eight places it is needed.
              Each is TWO lines carrying the same `data-level-rule` at the same dash pattern, so the
              ground casing shows only under the dashes and the ink stays legible over ground, over
              a tinted box and over the peak's full accent alike. */}
          {levelRules.map((r) => (
            <g key={r.key}>
              <line
                data-level-rule={r.key}
                x1={0}
                x2={FRAME.width}
                y1={r.y}
                y2={r.y}
                stroke={ruleCasing}
                strokeWidth={RULE_CASING_PX}
                strokeDasharray={RULE_DASH[r.series]}
                vectorEffect="non-scaling-stroke"
              />
              <line
                data-level-rule={r.key}
                x1={0}
                x2={FRAME.width}
                y1={r.y}
                y2={r.y}
                stroke={yardstick}
                strokeWidth={RULE_PX}
                strokeDasharray={RULE_DASH[r.series]}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* THE RING THE YARDSTICK PUTS ON THE DECADE THE READER CHOSE — its own shape, carrying
              `data-col`, drawn with no stroke until an option is checked. It is not the box: a ring
              carried on the box's own outline would be stripped from all eight by the vocabulary's
              `[data-col] { stroke: none }` the moment any option is chosen, which is the picture
              where every box loses its edge and one gains a ring. */}
          {boxes.map((b, i) => (
            <rect
              key={b.key}
              data-col={b.key}
              x={cx(i) - boxW / 2 - RING_INSET}
              y={y(b.q3) - RING_INSET}
              width={boxW + RING_INSET * 2}
              height={Math.max(1, y(b.q1) - y(b.q3)) + RING_INSET * 2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The axis floor, drawn as a rule and NOT as a baseline: it is where the window starts,
              not where the quantity starts, and the caveat says so in words. */}
          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* Every reading is reachable: 75 years, each answering with its own decade's position.
              `data-mark-ref` names the dot the format lights, so the SHAPE THE POINT NAMES takes
              `--mark-active` rather than the hit target being filled. */}
          {boxes.flatMap((b, i) =>
            b.readings.map((r, k) => (
              <circle
                key={`${b.key}-${r.year}`}
                className="pt"
                data-mark-ref={`${b.key}-${r.year}`}
                cx={stripX(i) + ((k % 3) - 1) * 3.2}
                cy={y(r.value)}
                r={4.5}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={`${r.year} : ${r.detail}`}
                data-detail={`${r.year} · ${r.detail}`}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {boxes.map((b, i) => (
            <span
              key={b.key}
              className="end-label"
              style={{
                ...regs.value,
                color: b.key === peakKey ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(cx(i), FRAME.width)}%`,
                top: `${pct(y(b.max), FRAME.height)}%`,
                transform: "translate(-50%, -100%) translateY(-6px)",
              }}
            >
              {b.medianLabel}
            </span>
          ))}
          <span
            className="note"
            style={{
              ...regs.annot,
              // Anchored at the LEFT EDGE, not over the peak: the peak's own box already carries
              // its median as a printed value, and a note centred on it landed on that number.
              // The accent, and the accented decade label under the axis, are what point at it.
              ...noteAnchor(0),
              top: "1%",
            }}
          >
            {peakNote}
          </span>

          {/* EACH RULE SAYS WHICH LEVEL IT IS, AND THE THREE SIT IN THREE DIFFERENT GAPS.

              Stacked at one x they collide, and not occasionally: the 1970s box is 0,03 t from its
              own Q3 to its own median and the 2010s is 0,09 t from its median to its Q1 — 2 px and
              6 px at 1400, under a 17 px line. A de-collision would have to be expressed in geometry
              units, and a geometry unit is 1,3 reader px at 1400 and 0,4 at 375, so any threshold
              typed here is wrong at one of the two ends — this family's own production failure.

              So they are separated on the axis that does not stretch against them: each word sits in
              the MIDPOINT of a different inter-band gap, at its own rule's height. Three words at
              three x can never meet whatever the band does, the gaps are free ground at every
              height by construction (nothing is drawn between one band's dot strip and the next
              band's ring), and each gap is a fixed share of the plot, so the arrangement survives
              every width the same way the geometry does.

              They carry the same `data-level-rule` as the rules they name, so one generated
              `opacity: 1` reveals both, and `.note`'s own ground casing interrupts the rule where
              the word sits rather than letting the two overprint. */}
          {levelRules.map((r) => {
            const slot = LEVEL_SERIES.indexOf(r.series as (typeof LEVEL_SERIES)[number]);
            return (
              <span
                key={`${r.key}-word`}
                className="note"
                data-level-rule={r.key}
                style={{
                  ...annotRest,
                  fontWeight: annotWeight,
                  left: `${pct(cx(slot) + band / 2, FRAME.width)}%`,
                  top: `${pct(r.y as number, FRAME.height)}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {RULE_WORD[r.series]}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {boxes.map((b, i) => (
            <span
              key={b.key}
              className="axis-label x"
              data-axis={b.key}
              style={{
                ...axisRest,
                left: `${pct(cx(i), FRAME.width)}%`,
                textAlign: "center",
              }}
            >
              {b.label}
              <br />
              <span style={{ opacity: 0.75 }}>{`n=${b.n}`}</span>
            </span>
          ))}
        </div>
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the band in tonnes, how the other seven boxes
          sit against it, and how many years belonging to OTHER decades fall inside it. None of the
          four is printed anywhere on the plate, and none of them is a rule the picture could draw.
          Its row is reserved whether or not an option is chosen, so choosing one never moves the
          plot underneath it. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
