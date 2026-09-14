/**
 * Switzerland's annual CO₂ since 1858, drawn as a filled area THROUGH the design base and delivered
 * as an interactive page. The first `area` beat in this tree's WEB format, and the first web beat of
 * any type that a filed direction governs.
 *
 * WHAT THE WEB ADDS TO THIS FORM, AND IT IS THE CLAIM ITSELF RATHER THAN A DECORATION ON IT. An area
 * chart's claim is that the SURFACE is a quantity — the stock a rate accumulates to — and the plate
 * states that claim by CUTTING the surface at one year and printing the two shares either side. The
 * cut is the author's: 1986, where the running total crosses its own half. A plate holds one cut.
 *
 * So the cut becomes the reader's. `chart-web/assets/level.ts` stands a reference UP at a year the
 * reader chooses, and the surface re-partitions on it: the tint/accent seam leaves 1986 and travels
 * to the year the reader was born, so the accent block IS their own lifetime. The sentence that
 * comes back carries the integral on both sides — a reading no eye can take off an area, which is
 * the single-series form of the type sheet's own trap (`BRIEF.md`, "The type sheet's trap").
 *
 * NOTHING HERE EMITS A TRANSFORM, and that is deliberate. Every option's surface, its rule and its
 * name are drawn ONCE at their own coordinate and hidden; the stylesheet only reveals them. The
 * option surfaces are opaque and their union is the whole silhouette, so a chosen one occludes the
 * default rather than displacing it. `interaction.mjs` resolves the mark under a pointer off the
 * `cx`/`cy` attributes read once at init, which a CSS transform never changes — a control that
 * moved a mark would make the 167 readings answer for the slot they landed in (`stack.ts`, "the
 * defect that driving found"), and the readings here never move.
 *
 * THE FLUID FRAME (`chart-web/references/web-discipline.md`, "Responsive behaviour"). The `<svg>`
 * holds GEOMETRY ONLY — not one `<text>` — and stretches with its container under
 * `preserveAspectRatio="none"`. Every word is HTML positioned by percentage over the same box and
 * sized in fixed CSS pixels that never track the viewBox. Those pixel sizes are not this file's to
 * choose: they are the DIRECTION's own register table, translated by `#shared/design-base/web.mjs`.
 *
 * THE ZERO BASELINE IS CHECKED, NOT COMMENTED. The moment a series is filled, every clipped tonne
 * becomes surface a reader integrates, so this component throws rather than draw one pixel over a
 * non-zero base. The static sibling makes the same refusal for the same reason; a comment does not
 * fail.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the surface is partitioned at ONE year,
 * the plate's own by default and the reader's while they hold it, and the two halves are ONE hue at
 * two chromas, never two hues. They are two states of one quantity; two hues would make them two
 * categories, and the partition moving does not change which of the two it is.
 */

import {
  mix,
  contrast,
  adjustToContrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelNotesForMarkup,
  levelOptionsForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

/** The canonical geometry the plot's `aspect-ratio` is derived from — proportions only. Never a
 *  rendered pixel cap: the delivered `<svg>` has no width or height of its own. */
export const FRAME = { width: 860, height: 380, xAxisRowPx: 30 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** The one series this beat draws. `level.ts` calls a mark's axis-holder a series; here there is
 *  one, and every option lays its single reference on it or the declaration is refused. */
export const SERIES = "co2";
/** Reader pixels, drawn `non-scaling-stroke`, so a ring is the same hairline at 320 px and 1600. */
const RING_PX = 1.6;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "2 5";
const REVEAL_MS = 220;

export type Reading = {
  year: number;
  mt: number;
  /** The same figure written the way the page prints it — the component never formats a number. */
  label: string;
  share: string;
};

/** Where one yardstick option cuts the surface. The runner derives `x` from `xOf` below, which is
 *  the beat's ONE horizontal scale, so a reference can never stand where the seam is not. */
export type Split = { slug: string; year: number; x: number; label: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

/** THE BEAT'S ONE HORIZONTAL SCALE, exported because the runner has to place every option's
 *  reference in the geometry's own units before the component is called. Two callers, one
 *  derivation — the same reason `filter.ts` states for deriving an identity once. */
export const xOf = (year: number, firstYear: number, lastYear: number) =>
  ((year - firstYear) / (lastYear - firstYear)) * FRAME.width;

export function DirectedAreaWeb({
  readings,
  midYear,
  totalMt,
  shareAfter,
  yTicks,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  midNote,
  reading,
  levels,
  splits,
  direction,
  treatments,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  readings: Reading[];
  midYear: number;
  totalMt: number;
  shareAfter: number;
  yTicks: number[];
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  midNote: string;
  reading: string;
  levels: LevelDeclaration;
  splits: Split[];
  direction: any;
  treatments: string[];
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, style: Record<string, unknown>) => number;
}) {
  const on = (id: string) => treatments.includes(id);
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // ── the colour rule, and it is the direction's own accent or nothing ──────────────────────────
  let tint = mix(accent, ground, 0.62);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the tinted half of the surface cannot be told from the ground: nothing between ` +
          `${accent} and the direction's poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`,
      );
    tint = lifted;
  }
  const baseline = mix(ground, ink, 0.75);
  const rule = mix(ground, ink, 0.5);
  const noteInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  /**
   * THE ACCENT IS SPENT ONCE, AND THE BEAT REFUSES RATHER THAN REMEMBERS.
   *
   * The accent on this page carries the SURFACE, which is the subject. The reader's yardstick is a
   * different argument — "the year you asked about" — so it is drawn in ink. A hue that meant both
   * would be the accent spent twice and the reader would have no way to tell the claim from their
   * own question (`PALETTE.md`).
   */
  const yardstick = noteInk;
  if (yardstick.toLowerCase() === accent.toLowerCase())
    throw new Error(
      `the reader's yardstick is drawn ${yardstick}, the same ink as the surface the page asserts ` +
        `— that is the accent spent twice, on two arguments that are not the same argument`,
    );
  const casing = ground;

  /**
   * EVERY FILL THE YARDSTICK CROSSES, MEASURED — not the ground alone.
   *
   * A reference stands the full height of the plot, so it crosses everything drawn there, and on
   * THIS shape it always crosses the two chromas of the surface: it stands exactly on the seam
   * between them. Ink over an accent fill is under the non-text floor in most directions (measured
   * on the scatter beat: 2,979 / 1,627 / 2,873:1), so the rule is drawn twice — a wider ground
   * casing under the dash on the same dash pattern — and the floor below is the honest general
   * form: the rule is legible over a fill when EITHER the dash or its casing separates from that
   * fill, and the dash must always separate from its own casing or it vanishes into its own halo.
   */
  const crossed: { ink: string; where: string }[] = [
    { ink: ground, where: "the bare ground above the curve" },
    { ink: accent, where: "the later half of the surface" },
    { ink: tint, where: "the earlier half of the surface" },
    { ink: grid, where: "a gridline" },
    { ink: rule, where: "the midpoint rule the page asserts" },
  ];
  for (const fill of crossed) {
    const best = Math.max(contrast(yardstick, fill.ink), contrast(casing, fill.ink));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `the reader's yardstick crosses ${fill.where} (${fill.ink}) and neither its dash ` +
          `${yardstick} (${contrast(yardstick, fill.ink).toFixed(3)}:1) nor its casing ${casing} ` +
          `(${contrast(casing, fill.ink).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a reference is laid down to be read WHERE IT CROSSES, and ` +
          `one the picture swallows is offered as though the reader could follow it`,
      );
  }
  const inside = contrast(yardstick, casing);
  if (inside < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the yardstick is drawn ${yardstick} on a casing of ${casing}, which measure ` +
        `${inside.toFixed(3)}:1 against each other — a rule that cannot be told from its own halo ` +
        `is a rule the reader cannot follow across the plot`,
    );

  // ── scales ────────────────────────────────────────────────────────────────────────────────────
  const firstYear = readings[0].year;
  const lastYear = readings[readings.length - 1].year;
  // HEADROOM, and it is not taste. The top tick's own label is positioned at its own height and
  // centred on it, so a scale whose maximum IS the top tick puts half that label above the plot's
  // own cell — measured on the first render of this beat, where `50` sat on top of the caveat line.
  // 6 % of the frame is enough to seat it and small enough that the surface still fills the box.
  const HEADROOM = 1.06;
  const top = yTicks[yTicks.length - 1] * HEADROOM;
  if (yTicks[0] !== 0)
    throw new Error(
      `an area is a QUANTITY: its value axis starts at zero or the surface lies. The ticks handed ` +
        `in start at ${yTicks[0]}`,
    );
  const x = (year: number) => xOf(year, firstYear, lastYear);
  const y = (mt: number) => FRAME.height - (mt / top) * FRAME.height;

  const points = readings.map((r) => ({ ...r, cx: x(r.year), cy: y(r.mt) }));
  const surface = (slice: typeof points) =>
    slice.length < 2
      ? ""
      : `M ${slice[0].cx} ${FRAME.height} ` +
        slice.map((p) => `L ${p.cx} ${p.cy}`).join(" ") +
        ` L ${slice[slice.length - 1].cx} ${FRAME.height} Z`;

  const cutAt = (year: number) => {
    const at = points.findIndex((p) => p.year === year);
    if (at < 1 || at > points.length - 2)
      throw new Error(
        `${year} cannot cut this surface into two halves: it is not an interior reading of the ` +
          `${points.length} this series carries`,
      );
    // The two halves SHARE the cut year's point, so their union is the whole silhouette to the
    // pixel — which is what lets a chosen option's opaque pair occlude the default pair beneath it
    // instead of leaving a seam of the old partition showing through.
    return { earlier: surface(points.slice(0, at + 1)), later: surface(points.slice(at)) };
  };

  const defaultCut = cutAt(midYear);

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed what the beat actually DRAWS — all 167 years
   * and its one series — so an option reading its reference off a year that is not on the plate is
   * caught here and not by a reader. `width` is passed because every reference on this shape is
   * stood UP: the x axis is the one that carries the cut.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: points.map((p) => String(p.year)),
    drawnSeries: [SERIES],
    height: FRAME.height,
    width: FRAME.width,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  const ruleKeyOf = new Map(levelRules.map((r) => [r.slug, r.key]));
  const cuts = splits.map((split) => {
    const key = ruleKeyOf.get(split.slug);
    if (!key)
      throw new Error(
        `the surface is cut for ${split.slug}, which declares no reference — a repaint no control ` +
          `can reveal is a partition nobody ever sees`,
      );
    const drawnX = x(split.year);
    if (Math.abs(drawnX - split.x) > 0.01)
      throw new Error(
        `${split.year}'s reference stands at x=${split.x} and its seam is drawn at x=${drawnX} — ` +
          `the rule and the repaint are two derivations of one cut and they have drifted`,
      );
    return { ...split, key, ...cutAt(split.year) };
  });
  if (cuts.length !== levels.options.length)
    throw new Error(
      `the yardstick offers ${levels.options.length} options and the surface is cut ` +
        `${cuts.length} times — an option that repaints nothing is the plate under a second name`,
    );

  // The ONE measurement this format still makes in node: how wide the y-label column must be. A
  // gutter guessed at one direction's axis size clips at another's.
  const yGutterPx =
    Math.ceil(
      Math.max(
        ...yTicks.map((t) =>
          measure(`${t}`, {
            fontSize: Number.parseFloat(regs.axis.fontSize as string),
            fontWeight: regs.axis.fontWeight,
            fontFamily: String(regs.axis.fontFamily).split(",")[0].replace(/"/g, ""),
          }),
        ),
      ),
    ) + 16;

  const last = points[points.length - 1];
  const midPoint = points.find((p) => p.year === midYear)!;

  // THE ANNOTATION REGISTER'S INK AND WEIGHT LEAVE THE INLINE STYLE for the year a chosen option
  // writes at the foot of its own rule: an inline `color` beats every generated selector, so with
  // `regs.annot` spread whole the option rules could not light it. Same correction the grouped bar
  // made on its axis names and the scatter on its case names.
  const { color: annotInk, fontWeight: annotWeight, ...annotRest } = regs.annot as any;

  const css = [
    // The default state as a rule and never as an inline style — see above.
    `${SCOPE} .overlay [data-axis] { color: var(--annot-ink); font-weight: var(--annot-weight); }`,
    // A reading takes no stroke until a reader asks for one. Declared here rather than inline so
    // the generated ring can win: an inline `stroke` beats every selector there is.
    `${SCOPE} [data-col] { stroke: none; }`,
    levelChromeCss({ scope: SCOPE }),
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      // FULL INK AND THE REGISTER'S OWN WEIGHT, not a bold: a bold would ask the page for a SECOND
      // FACE of the annotation family, which the build subsets per face — the defect the scatter
      // shipped once and `verify-web.mjs`'s revealed-text probe named character by character. The
      // emphasis is not needed anyway: a chosen year is the only year written on the plot.
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
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>
          {eyebrow}
        </p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it — and
          `aria-label` carries the reading a reader who is not looking at the picture would
          otherwise only get from the repaint. Each accessible name CONTAINS its visible one;
          `assertLevelDeclaration` refuses the declaration otherwise (WCAG 2.5.3). */}
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the integral on both sides of the reader's own
          cut, which is the reading no eye can take off an area. Its row is reserved whether or not
          an option is chosen, so choosing one never moves the plot underneath it. The untouched
          option reveals none, because it is not a comparison: it is the claim the title states. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + yGutterPx} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {yTicks.map((t) => (
            <span
              key={t}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}
            >
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
            <line
              key={t}
              x1={0}
              x2={FRAME.width}
              y1={y(t)}
              y2={y(t)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE SURFACE, in two chromas of one hue, cut at the year the cumulative total crosses
              its own half. The earlier half first, so the later half's own edge is the one that
              reads against it. This is the picture a reader who touches nothing is looking at, and
              the picture a reader with no script never leaves. */}
          <path d={defaultCut.earlier} fill={tint} />
          <path d={defaultCut.later} fill={accent} />

          {/* EVERY OPTION'S OWN PARTITION, DRAWN ONCE AND HIDDEN. Each pair shares its cut year's
              point, so the union is the whole silhouette and an opaque pair OCCLUDES the default
              rather than displacing it — no transform, nothing moves, and the 167 readings below
              keep the `cx`/`cy` `interaction.mjs` resolved them by at init. */}
          {cuts.map((cut) => (
            <g key={cut.slug}>
              <path data-level-rule={cut.key} d={cut.earlier} fill={tint} pointerEvents="none" />
              <path data-level-rule={cut.key} d={cut.later} fill={accent} pointerEvents="none" />
            </g>
          ))}

          <path
            d={`M ${points.map((p) => `${p.cx} ${p.cy}`).join(" L ")}`}
            fill="none"
            stroke={adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent}
            strokeWidth={direction.stroke?.series ?? 1.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* The partition the PAGE asserts, drawn where the cumulative total crosses its own half.
              It is a LEVEL on the x axis, not a reading, so it is furniture — and it is drawn
              unconditionally: no option on this page removes it, because it is the claim the title
              states (`directed-interaction.md`, rule 5). */}
          <line
            x1={midPoint.cx}
            x2={midPoint.cx}
            y1={0}
            y2={FRAME.height}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            x2={FRAME.width}
            y1={FRAME.height}
            y2={FRAME.height}
            stroke={baseline}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* THE READER'S OWN RULE, standing on the seam its option repaints. Two lines carrying the
              same `data-level-rule`, so the generated `opacity: 1` reveals both: the ground casing
              first, then the dash on top of it on the same dash pattern, so the casing shows only
              under the dashes. A different dash and full ink tell it from the page's own midpoint
              rule, which is neutral and stays drawn beside it. */}
          {cuts.map((cut) => (
            <g key={`rule-${cut.slug}`}>
              <line
                data-level-rule={cut.key}
                x1={cut.x}
                x2={cut.x}
                y1={0}
                y2={FRAME.height}
                stroke={casing}
                strokeWidth={RULE_CASING_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              <line
                data-level-rule={cut.key}
                x1={cut.x}
                x2={cut.x}
                y1={0}
                y2={FRAME.height}
                stroke={yardstick}
                strokeWidth={RULE_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>
          ))}

          {/* Every reading, reachable by pointer, tap and keyboard, each carrying the detail the
              static plate had no room to print. Invisible at rest — the stylesheet paints them on
              hover and on focus, and `data-col` is what the chosen option rings. */}
          {points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              data-col={String(p.year)}
              cx={p.cx}
              cy={p.cy}
              r={4}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${p.year} : ${p.label} ${unit}, ${p.share} % du total cumulé`}
              data-detail={`${p.year} · ${p.label} ${unit} · ${p.share} % du total émis à cette date`}
            />
          ))}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={FRAME.width}
            height={FRAME.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{
              ...regs.annot,
              color: noteInk,
              ...noteAnchor(pct(midPoint.cx, FRAME.width)),
              top: "6%",
            }}
          >
            {midNote}
          </span>
          <span
            className="end-label"
            style={{
              ...regs.value,
              left: `${pct(last.cx, FRAME.width)}%`,
              top: `${pct(last.cy, FRAME.height)}%`,
            }}
          >
            {`${last.year} · ${last.label}`}
          </span>

          {/* THE CHOSEN YEAR, AT THE FOOT OF ITS OWN RULE — the other half of "the reader's own row
              is named and ringed among marks that are otherwise anonymous". Hidden by the same
              `data-level-rule` that hides the references, lit by the same `data-axis` rule that
              lights a chosen datum's name elsewhere in this vocabulary, and sitting on `.note`'s
              own ground chip so it never puts ink on a fill.

              AT THE FOOT and not at the top: the page's own midpoint note is anchored at 6 % from
              the top and every option's rule passes within a few percent of it in x, so a name
              written up there would land in the same strip as an argument-bearing sentence. */}
          {cuts.map((cut) => (
            <span
              key={`name-${cut.slug}`}
              className="note"
              data-level-rule={cut.key}
              data-axis={String(cut.year)}
              style={{
                ...annotRest,
                bottom: "2%",
                top: "auto",
                ...noteAnchor(pct(cut.x, FRAME.width)),
              }}
            >
              {cut.label}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {xTicks.map((year) => (
            <span
              key={year}
              className="axis-label x"
              style={{ ...regs.axis, left: `${pct(x(year), FRAME.width)}%` }}
            >
              {year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
      <p className="chart-total" style={{ ...regs.body, margin: "4px 0 0" }}>
        {`Total ${firstYear}–${lastYear} : ${totalMt} Mt. ${shareAfter} % de ce total a été émis à partir de ${midYear}.`}
      </p>
    </figure>
  );
}
