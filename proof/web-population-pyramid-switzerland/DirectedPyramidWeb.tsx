/**
 * Switzerland's population by age band and sex in 2023, drawn as a pyramid THROUGH the design base
 * and delivered as an interactive page.
 *
 * `mirrored-halves-cross-at-a-named-band` — the two halves meet at a centre line, and the band where
 * the shape stops widening is NAMED, because that band is the whole reading: a pyramid that is
 * widest in the middle is an ageing population, not an expanding one, and nothing but the named band
 * says which.
 *
 * `name-each-half-in-words` — left and right are named above the halves. A mirrored chart with two
 * unlabelled sides is a Rorschach test.
 *
 * `the-neutral-straddles-the-centre` is NOT spent here, and the refusal is worth stating: the centre
 * of this chart is a boundary between two populations, not a category that belongs to neither. There
 * is nothing to straddle it with.
 *
 * WHAT THE WEB ADDS, AND IT IS THE FOLD. A pyramid's subject is a silhouette, and its silhouette is
 * made of two half-shapes drawn back to back from a shared centre — which is the worst arrangement
 * there is for the one comparison the shape keeps inviting: at a given band, which half is longer?
 * Two lengths measured in opposite directions from a shared zero cannot be subtracted by eye. So the
 * reader may FOLD one half onto the other: its profile is carried across and laid over the bars it is
 * being compared with, at its own measured values, and the difference stops being an inference and
 * becomes a shape. Where the outline juts past the bar, the folded sex is the more numerous; where it
 * falls inside, the host sex is. It crosses exactly once, and that crossing is the reading.
 *
 * THE CONTROL OFFERS THE FOLD BOTH WAYS ROUND, and `assertFoldDeclaration` refuses a declaration that
 * does not. On a mirrored type a one-way fold is not a convenience, it is a claim about which half is
 * the norm — and this type's two halves are peers by construction.
 *
 * THE OUTLINE IS SOLID, NOT DASHED, and that is a decision rather than a default. A dash is the right
 * costume for a RULE, a reference a reader reads a value off. This mark is a SHAPE, and its whole job
 * is to be read whole; dashing it would fragment the one thing it exists to deliver.
 *
 * AND THE SECOND CHANNEL IS UNCHANGED: every band still answers with both counts, the total, the
 * difference between the sexes and the band's share of the whole population — the SHARE is the
 * reading that turns a silhouette into a claim about how many people are where.
 *
 * THE TWO FILLS ARE CHOSEN SO THE OUTLINE CAN LIE OVER EITHER OF THEM. This page paints a line across
 * both halves, so "measure the mark against the ground" is not the whole obligation: the ink has to
 * clear every fill it crosses as well. Each half is therefore taken as far from the ground as the
 * line's own 3:1 floor against THAT FILL allows, and never nearer than its own 3:1 floor against the
 * ground — a window that is empty on some grounds, and the component throws rather than ship a line a
 * reader loses the moment it enters a bar.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import {
  assertFoldDeclaration,
  foldChromeCss,
  foldCrossingsForMarkup,
  foldCss,
  foldNotesForMarkup,
  foldOptionsForMarkup,
  foldPath,
  foldSlugOf,
  type FoldDeclaration,
} from "../../skills/chart-web/assets/fold.ts";

const ROW = 20;
export const FRAME = { width: 780, height: 0, xAxisRowPx: 28 };

/** This format's own scope selector, and the id prefix the fold's radios take. The two arguments
 *  `fold.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const FOLD_ID_PREFIX = "chart-fold";
/** How long the outline takes to arrive. Honoured only under `prefers-reduced-motion: no-preference`
 *  — `fold.ts` puts the whole transition inside the query rather than overriding it back. */
const REVEAL_MS = 220;

export type Band = {
  key: string;
  left: number;
  right: number;
  peak: boolean;
  detail: string;
};

/** The words the fold is offered in. The GEOMETRY is not here: where each profile's edges sit is a
 *  question only the thing that owns the scale can answer, which is this component. */
export type FoldPlan = {
  label: string;
  noneLabel: string;
  options: {
    /** The half carried across — one of the two side labels. */
    key: string;
    /** The half it is laid on — the other side label. */
    host: string;
    label: string;
    announce: string;
    note: string;
    crossing: { key: string; text: string };
  }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedPyramidWeb({
  bands,
  span,
  xTicks,
  sideLabels,
  foldPlan,
  peakNote,
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
  bands: Band[];
  span: number;
  xTicks: number[];
  sideLabels: { left: string; right: string };
  foldPlan: FoldPlan;
  peakNote: string;
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
  const height = bands.length * ROW;

  // ── THE OUTLINE'S OWN INK, AND THE TWO FILLS RECONCILED WITH IT ──────────────────────────────
  // The line is the strongest mark this page can draw and it is drawn over the bars, so it takes the
  // direction's own ink — the one colour `deriveFurniture` already resolved against this ground.
  const foldInk = adjustToContrast(ink, ground, NON_TEXT_CONTRAST_MIN) ?? ink;

  /**
   * The strongest tint of a fill that leaves the outline legible ON it while staying legible on the
   * ground itself. Walked from the fill the beat would otherwise have drawn, toward the ground, one
   * hundredth at a time, and the FIRST value that clears both floors is taken — so a half is never
   * washed out further than the line actually needs.
   *
   * The two halves are searched against DIFFERENT backgrounds (each against the ground AND against
   * itself under the line), which is why they cannot collapse onto one another the way two colours
   * clamped independently to the same floor on the same ground do.
   */
  const reconcile = (start: string, what: string) => {
    let base = start;
    if (contrast(base, ground) < NON_TEXT_CONTRAST_MIN)
      base = adjustToContrast(base, ground, NON_TEXT_CONTRAST_MIN) ?? base;
    for (let t = 100; t >= 0; t--) {
      const candidate = t === 100 ? base : mix(ground, base, t / 100);
      if (
        contrast(candidate, ground) >= NON_TEXT_CONTRAST_MIN &&
        contrast(foldInk, candidate) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `${direction.id ?? "this direction"}: no tint of the ${what} half clears ${NON_TEXT_CONTRAST_MIN}:1 ` +
        `on the ground ${ground} AND leaves the folded outline ${foldInk} ${NON_TEXT_CONTRAST_MIN}:1 over ` +
        "it. The fold lays a line across this half, so a half the line disappears into is a reading the " +
        "page would offer and not deliver",
    );
  };

  const left = reconcile(mix(ground, ink, 0.42), sideLabels.left);
  const right = reconcile(mix(accent, ground, 0.25), sideLabels.right);

  // WHAT A BAND TAKES UNDER THE POINTER. The two bars of one band share the BAND's key, so the
  // pointer lights the pair a reader is actually asking about — keyed by side, one key named every
  // left bar in the plate at once, and a point naming it would have lit eleven bands to answer for
  // one. Each side keeps its own lift, carried on the rect, because the two halves are drawn in two
  // different colours and a single lifted value would repaint one of them.
  const liftOf = (fill: string) => {
    const lifted = mix(fill, ink, 0.35);
    const step = contrast(lifted, fill);
    if (step < 1.12)
      throw new Error(
        `a bar lifts only ${step.toFixed(3)}:1 under the pointer, under the 1.12:1 floor — ` +
          `a reader cannot see which band answered`,
      );
    return lifted;
  };
  const liftLeft = liftOf(left);
  const liftRight = liftOf(right);

  const centreInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const centre = FRAME.width / 2;
  const x = (v: number) => centre + (v / span) * (FRAME.width / 2);
  const cy = (i: number) => height - ROW * i - ROW / 2;
  const barH = ROW * 0.72;

  // ── THE FOLD'S GEOMETRY, DERIVED FROM THIS COMPONENT'S OWN SCALE ─────────────────────────────
  // A row is the band's WHOLE share of the plot, walked in the data's own order — which on a pyramid
  // runs upward, youngest at the bottom. `fold.ts` takes `from`/`to` rather than top/bottom for
  // exactly that reason and checks the rows touch.
  const rows = bands.map((b, i) => ({ key: b.key, from: height - ROW * i, to: height - ROW * (i + 1) }));
  const valueOf = (band: Band, side: string) => (side === sideLabels.left ? band.left : band.right);
  const edgeOn = (value: number, host: string) => (host === sideLabels.left ? x(-value) : x(value));

  const declaration: FoldDeclaration = {
    label: foldPlan.label,
    noneLabel: foldPlan.noneLabel,
    options: foldPlan.options.map((option) => ({
      key: option.key,
      host: option.host,
      label: option.label,
      announce: option.announce,
      note: option.note,
      crossing: option.crossing,
      steps: bands.map((b) => ({ key: b.key, at: edgeOn(valueOf(b, option.key), option.host) })),
    })),
  };
  const drawn = [
    { side: sideLabels.left, steps: bands.map((b) => ({ key: b.key, at: x(-b.left) })) },
    { side: sideLabels.right, steps: bands.map((b) => ({ key: b.key, at: x(b.right) })) },
  ];
  assertFoldDeclaration(declaration, drawn, { extent: { min: 0, max: FRAME.width } });

  const foldOptions = foldOptionsForMarkup(declaration, FOLD_ID_PREFIX);
  const foldNotes = foldNotesForMarkup(declaration);
  const foldCrossings = foldCrossingsForMarkup(declaration);
  const profiles = declaration.options.map((option) => ({
    slug: foldSlugOf(option.key),
    host: option.host,
    d: foldPath(option.steps, rows),
  }));
  const hostOf = new Map(declaration.options.map((o) => [foldSlugOf(o.key), o.host]));

  /**
   * WHERE THE PEAK'S NAME GOES: LEVEL WITH ITS OWN BAND, IN A GUTTER OF ITS OWN.
   *
   * It used to be anchored at the widest bar's own end, and `noteAnchor` hands anything past 75 % of
   * the plot its RIGHT edge: so the note grew leftward, back over the bar it names. `.note` carries
   * an opaque ground chip, and it punched that chip into the 55-59 women's bar at every width, in all
   * three directions — 4 to 20 of 25 sample points of its own box inside the bar's fill.
   *
   * The widest band has no room beside itself INSIDE the plot; that is what makes it the widest. A
   * first repair seated the note on the nearest row whose bars cleared it, which cleared the mark
   * and lost the band: at 1400 px it sat beside 70-74, at 768 beside 85-89, naming a band three to
   * six rows away with nothing joining them. So the room is made OUTSIDE the drawing instead — the
   * format's own third grid column (`--end-gutter`, the bump's final ranks use it), as wide as the
   * note measured in the direction's own annot register, broken after its colon — and the note
   * sits in it at the 55-59 row's own height, a few pixels past the 350k edge its bar nearly reaches.
   *
   * THE GUTTER IS PAID FOR BY THE DRAWING, SO IT IS TAKEN ONLY WHILE THE DRAWING CAN AFFORD IT: while
   * a row stays at least one line of the axis register tall, so the band names on the y axis are
   * never squeezed into each other to make room for the note. Measured, not typed — the axis lead
   * over the row's share of the frame. Below that the gutter closes and the note moves to the
   * reserved row directly above the plot, the row the fold keeps for its sentence (which the
   * untouched option leaves empty); a chosen fold's own sentence replaces it there, and the band
   * stays named on its axis in the accent.
   */
  const annotReg = registerOf(direction, "annot", { family: "chart" });
  const cased = (t: string) => (annotReg.transform === "uppercase" ? t.toUpperCase() : t);
  const measure = (t: string) =>
    measureText(cased(t), {
      fontSize: annotReg.fontSize,
      fontWeight: annotReg.fontWeight as number,
      fontFamily: annotReg.fontFamily,
      fontStyle: annotReg.fontStyle,
    }) + annotReg.letterSpacing * t.length;
  const CHIP_X = 8; // `.note`'s own padding, 4 px a side, in the shared stylesheet
  const NOTE_GAP = 6;
  const Y_GUTTER = 56;
  const breakAt = peakNote.indexOf(" : ");
  const peakParts = breakAt > 0 ? [peakNote.slice(0, breakAt + 2), peakNote.slice(breakAt + 3)] : [peakNote];
  /** The note's widest line, on its chip — a 5 % margin because the page's face is rasterised by the
   *  browser and this measurement by resvg, and a line one pixel wider than its box wraps. */
  const noteWidth = Math.ceil((Math.max(...peakParts.map(measure)) + CHIP_X) * 1.05);
  const endGutter = noteWidth + NOTE_GAP;
  const peakIndex = bands.findIndex((b) => b.peak);
  const axisLead = leadOf(registerOf(direction, "axis", { family: "chart" }));
  /** The narrowest drawing whose rows are each one axis line tall, and the figure that holds it with
   *  both gutters. */
  const drawingFloor = Math.ceil((axisLead * FRAME.width) / ROW);
  const gutterFrom = drawingFloor + Y_GUTTER + endGutter;
  const axisOverhang = Math.ceil(axisLead / 2) + 2;
  const noneFold = foldOptions.find((o) => o.isNone)!.slug;
  const PEAK = `${SCOPE} .chart-plot .end-axis .note.peak-note`;
  const peakCss = [
    `${SCOPE} { container-type: inline-size; }`,
    `${SCOPE} .chart-plot .end-axis { pointer-events: none; }`,
    `${PEAK} { left: ${NOTE_GAP}px; top: ${pct(cy(peakIndex), height)}%; transform: translateY(-50%); width: ${noteWidth}px; white-space: normal; }`,
    // `!important` on the plot's two frame properties only: they are inline styles, which beat any
    // generated rule, and they are the ones this state has to take back.
    `@container not (min-width: ${gutterFrom}px) {`,
    `  ${SCOPE} .chart-plot { --end-gutter: 0px !important; aspect-ratio: ${FRAME.width + Y_GUTTER} / ${height + FRAME.xAxisRowPx} !important; }`,
    `  ${PEAK} {`,
    `    left: calc(var(--cell-slack-x, 0px) - 100cqw); width: 100cqw; box-sizing: border-box;`,
    `    top: auto; transform: none;`,
    `    bottom: calc(100% + var(--cell-slack-y, 0px) + ${axisOverhang}px);`,
    `    padding-left: 0; padding-right: 0; background: none;`,
    `  }`,
    `  ${SCOPE}:has(.chart-fold input:checked:not([value="${noneFold}"])) ${PEAK.slice(SCOPE.length + 1)} { visibility: hidden; }`,
    `}`,
  ].join("\n");

  const css = [
    peakCss,
    // A SECOND LAYER OVER THE SAME GRID CELL, and the split is the point rather than a workaround.
    // `.overlay` is the PLATE's layer: `verify-web.mjs` reads every word in it and requires all of
    // them to be drawn unconditionally, which is exactly wrong for a crossing that belongs to an
    // option nobody has chosen yet. (The peak's name left `.overlay` for the plot's third column,
    // `.end-axis` — see `peakCss`: it sits outside the drawing, and on a phone it gives its row to
    // a chosen fold's sentence.)
    `${SCOPE} .chart-plot .option-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    // What each half takes under the reader's pointer. One rule per half, off the mark's own fill —
    // the format lifts `--mark-active` from the mark and never from the text ink.
    `${SCOPE} [data-mark="${sideLabels.right}"] { --mark-active: ${adjustToContrast(mix(right, ink, 0.35), ground, NON_TEXT_CONTRAST_MIN) ?? right}; }`,
    foldChromeCss({ scope: SCOPE }),
    foldCss(declaration, { scope: SCOPE, idPrefix: FOLD_ID_PREFIX, revealMs: REVEAL_MS }),
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves this picture. A fold is a fifth mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {[{ c: left, t: sideLabels.left }, { c: right, t: sideLabels.right }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: k.c, display: "inline-block", borderRadius: 2 }} />
            {k.t}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertFoldDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-fold">
        <legend>{foldPlan.label}</legend>
        <div className="options">
          {foldOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-fold"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the fold shows, in words, for a reader who is
          not looking at the plot. Its row is reserved whether or not an option is chosen, so choosing
          one never moves the plot underneath it. The untouched option reveals none: it is not a
          counterfactual, it is the claim the title states. */}
      <div className="fold-notes" role="status">
        {foldNotes.map((note) => (
          <p data-fold-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${Y_GUTTER}px`,
          ["--end-gutter" as string]: `${endGutter}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + Y_GUTTER + endGutter} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {bands.map((b, i) => (
            <span
              key={b.key}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: b.peak ? accent : (regs.axis.color as string),
                fontWeight: b.peak ? 700 : regs.axis.fontWeight,
                top: `${pct(cy(i), height)}%`,
              }}
            >
              {b.key}
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

          {xTicks.filter((t) => t !== 0).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {bands.map((b, i) => (
            <g key={b.key}>
              <rect data-mark={b.key} style={{ "--mark-active": liftLeft } as React.CSSProperties} x={x(-b.left)} y={cy(i) - barH / 2} width={centre - x(-b.left)} height={barH} fill={left} opacity={b.peak ? 1 : 0.9} />
              <rect data-mark={b.key} style={{ "--mark-active": liftRight } as React.CSSProperties} x={centre} y={cy(i) - barH / 2} width={x(b.right) - centre} height={barH} fill={right} opacity={b.peak ? 1 : 0.9} />
            </g>
          ))}

          <line x1={centre} x2={centre} y1={0} y2={height} stroke={centreInk} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

          {/* THE FOLDED PROFILES. Both are drawn, once, at their own places; the stylesheet reveals
              one. Nothing here is transformed — `interaction.mjs` resolves the mark under a pointer
              off attributes it read at init, and a moved shape would answer as the shape whose slot it
              landed in. `vector-effect` keeps the staircase one reader-pixel wide on its vertical and
              horizontal runs alike, which `preserveAspectRatio="none"` would otherwise make impossible.
              `pointer-events: none` keeps it out of the hit test entirely: the outline is a reading,
              not a mark that answers. */}
          {profiles.map((profile) => (
            <path
              key={profile.slug}
              data-fold-profile={profile.slug}
              d={profile.d}
              fill="none"
              stroke={foldInk}
              strokeWidth={2}
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}

          {bands.map((b, i) => (
            <circle
              key={b.key}
              className="pt"
              data-mark-ref={b.key}
              cx={centre}
              cy={cy(i)}
              r={ROW / 2}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE PEAK'S NAME, IN THE PLOT'S THIRD COLUMN — see `peakCss` for why it is not on the plate. */}
        <div className="end-axis" aria-hidden="true">
          {bands.filter((b) => b.peak).map((b) => {
            const i = bands.indexOf(b);
            return (
              <span
                key={b.key}
                className="note peak-note"
                data-band={bands[i].key}
                style={{ ...regs.annot, color: accent }}
              >
                {/* Two unbreakable runs, so the only place the note can wrap is the one the
                    placement above measured: after its colon. */}
                {peakParts.length === 2 ? (
                  <>
                    <span style={{ whiteSpace: "nowrap" }}>{peakParts[0]}</span>{" "}
                    <span style={{ whiteSpace: "nowrap" }}>{peakParts[1]}</span>
                  </>
                ) : (
                  <span style={{ whiteSpace: "nowrap" }}>{peakNote}</span>
                )}
              </span>
            );
          })}
        </div>

        {/* THE CROSSING, NAMED ON THE PLOT, IN THE OPTION'S OWN LAYER. Anchored just off the centre
            line on the half being read, so it sits over the inner end of a long bar where nothing is
            happening — the bar's own end and the outline's edge are both far outside it — and reads
            outward toward them. `.note` paints its own ground behind its words, which is what lets it
            sit over a fill at all. */}
        <div className="option-layer" aria-hidden="true">
          {foldCrossings.map((crossing) => {
            const i = bands.findIndex((b) => b.key === crossing.key);
            const host = hostOf.get(crossing.slug);
            const inward = host === sideLabels.left
              ? { right: `${100 - pct(centre - 14, FRAME.width)}%` }
              : { left: `${pct(centre + 14, FRAME.width)}%` };
            return (
              <span
                key={crossing.slug}
                data-fold-crossing={crossing.slug}
                className="note"
                style={{
                  ...regs.annot,
                  color: accent,
                  ...inward,
                  // WIDER THAN `noteAnchor`'s OWN 24em, and measured rather than guessed: at 24em
                  // this sentence wrapped to two lines and the second one sat across the row of the
                  // band the peak note already annotates. It is a one-line reading of one band; the
                  // percentage is what keeps it from overflowing the half it belongs to on a phone.
                  maxWidth: "min(46%, 40em)",
                  whiteSpace: "normal",
                  top: `${pct(cy(i), height)}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {crossing.text}
              </span>
            );
          })}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === 0 ? "0" : `${Math.abs(t) / 1000}k`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
