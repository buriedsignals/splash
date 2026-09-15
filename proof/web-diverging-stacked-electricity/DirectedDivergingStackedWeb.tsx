/**
 * Six countries' 2024 electricity mix drawn as a LEAN on a five-barreau ordered scale — THROUGH the
 * design base, delivered as an interactive page WHOSE CUT IS THE THING THE READER OPERATES.
 *
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO OTHER'S.
 *
 * A diverging stacked bar is the only type in this catalogue whose premise is a JUDGEMENT rather
 * than a measurement. A bar has a length, a dot a position, an interval two ends — all readings of
 * the data. This type has a CENTRE, and the centre is where somebody decided the scale stops meaning
 * one thing and starts meaning its opposite. `types/diverging-stacked-bar.md` says so twice: the
 * neutral has to be NAMED rather than defaulted to the middle of the array, and the split "only
 * means something when there's a real neutral response to straddle". Both sentences are about a
 * decision.
 *
 * On a Likert form that decision is printed on the questionnaire. On an electricity mix it is the
 * argument itself, and Europe has been having it for a decade: the renewable directive counts
 * biomass and not nuclear, the climate taxonomy counts nuclear and argues about biomass, and carbon
 * accounting looks at neither but at what leaves the stack. Three definitions, three cuts, one
 * frozen file.
 *
 * So the reader moves the cut — `../../skills/chart-web/assets/side.ts`, written for this beat. Four
 * positions on ONE ordered scale, and NOTHING IS ADDED, REMOVED OR RE-MEASURED: every barreau keeps
 * the exact share it had, every row still sums to its own 100 %, the axis keeps its five graduations
 * and its words, the six rows keep their alphabetical order and their labels. One thing changes —
 * which side of the centre a band is drawn on — and the page hands back what that costs:
 *
 *   FRANCE MOVES FROM +89,8 POINTS OF RIGHT LEAN TO −45,6 POINTS OF LEFT LEAN, and under two of the
 *   four cuts it is the country of the six leaning FURTHEST LEFT — ahead of Poland, which takes 57 %
 *   of its electricity from coal and oil. Not one number changed.
 *
 * A still has to pick one of the four and ask to be trusted. A video and a scrolly pick the ORDER
 * the four are seen in, which is somebody's argument about which is the honest one. This format is
 * the only one of the three that can hand the decision over and stand back.
 *
 * WHY THE COLOUR IS A LADDER AND NOT A RAMP PER SIDE, WHICH IS THIS TYPE SHEET'S RULE SPENT AS A
 * REFUSAL RATHER THAN OBEYED LITERALLY.
 *
 * The sheet asks for "one colour ramp per side, never a single ramp spanning both directions, which
 * would erase the neutral break the whole type exists to show". Read for its REASON, that rule is
 * about a reader being able to tell which camp a segment near the centre belongs to. Here the camp
 * is what the reader just chose, so a colour that encoded it would REPAINT EVERY BAND the moment the
 * boundary moved, and the one thing that has to stay recognisable across the four plates — the
 * barreau itself — would be the one thing that did not. So colour belongs to the barreau, side
 * belongs to position, and the ramp is fixed along the ladder.
 *
 * And the rule is still met where it is checkable: UNDER THE DEFAULT CUT — the picture the page
 * ships in, and the picture a reader with no script never leaves — the two ink tones are the whole
 * of the left camp, the two accent tones the whole of the right, and the neutral sits between them
 * on the centre. That is a ramp per side, deepening outward, with the neutral break intact.
 *
 * WHAT DOES NOT MOVE, AND EACH ONE IS A DECISION RATHER THAN A DEFAULT.
 *
 * THE SIX NAMES. Alphabetical — Allemagne, France, Norvège, Pologne, Suède, Suisse — an order of the
 * world and not an order of result, which is `types/diverging-stacked-bar.md`'s own rule ("rows keep
 * their own natural order … never re-sorted by result"). Sorting them by lean was the obvious move
 * and is refused three times over: the sheet forbids it, `interaction.mjs` resolves a pointer from
 * `cx`/`cy` read ONCE at init so a re-sorted row would answer for the country whose slot it landed
 * in, and six labels rearranging themselves at every click is the owner's first ruling at six times
 * the scale.
 *
 * THE GRADUATIONS. Five positions, the same five words, in all four cuts. The axis is never
 * recomputed, so a band that moves has moved for exactly one reason.
 *
 * THE CENTRE. At the same place on the plate in every cut, by construction — `sideAt` is the one
 * mapping and it has no cut in it.
 *
 * WHAT ANSWERS THE POINTER IS THE BAND ITSELF, darkened off ITS OWN painted fill by a dose SOUGHT
 * until a measured gap is cleared, never a fixed one — the owner refused a fixed dose at 1,104:1 on
 * nocturne, and refused three times over a ring plastered on top of a mark. The `.pt` circles are
 * invisible and exist only to name the band they speak for (`data-mark-ref` -> `data-mark`), which
 * is the format's own contract.
 *
 * AND ONE THING TRAVELS, because the owner asked for interpolation where it is possible. The plates
 * themselves cut — they MUST, because `interaction.mjs` reads coordinates once at init and a band
 * animated across the centre would go on answering for the side it left. What travels is the NET
 * MARKER: a thin HTML tick per row, ALWAYS rendered, whose `left` is generated per cut and
 * transitioned. `display` does not interpolate; a property on an element that is always there does.
 * It is also the one movement whose reason a reader can see, because the movement IS the reading —
 * the net lean is what this control hands back, and the tick is that net drawn.
 *
 * THE TYPE SHEET'S ACCESSIBILITY TRAP, ANSWERED BY REFUSING THE THING THAT SPRINGS IT. The sheet
 * asks that every IN-SEGMENT label's ink be measured against that exact segment's own fill, because
 * one light-or-dark threshold fails on a mid-tone two segments over. This beat prints no in-segment
 * label at all: the two camp totals sit OUTSIDE the bar in the two gutters, on the ground, which is
 * the unfiled rule the static sibling already follows and cites ("the totals belong outside the bar,
 * at the ends"). One measurement against the ground replaces five against five fills — and those
 * totals are also the only figures the cut actually changes. The five individual shares are answered
 * by the pointer, which has room to write them.
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
  assertSideDeclaration,
  sideAt,
  sideBandAttrs,
  sideBandsOf,
  sideChromeCss,
  sideCss,
  sideCutsForMarkup,
  sideLayerAttrs,
  sideNotesForMarkup,
  sideSlugOf,
} from "../../skills/chart-web/assets/side.ts";

/** The frame. `row` is the room one country owns, `barTop`/`barH` where its bar sits inside that
 *  room, `netTop`/`netH` where its net marker does. Geometry units, none of them a function of any
 *  cut: the composition is fixed and the values move through it. */
export const FRAME = {
  width: 880,
  row: 62,
  barTop: 24,
  barH: 26,
  netTop: 6,
  netH: 13,
  xAxisRowPx: 26,
  yGutterPx: 110,
  endGutterPx: 64,
};

/** `chart-stack-` ON PURPOSE, like `aim.ts` and `qualify.ts`: it is the format's own discovery
 *  prefix for a control that moves the picture, owes the reader a sentence and prints a figure on
 *  the plot. A third grammar with its own spellings would be invisible to the guards written to hold
 *  it. See `side.ts`, "IT EMITS `data-stack-total`". */
const SIDE_ID_PREFIX = "chart-stack";
const SCOPE = ".chart-figure";
/** How long a net marker takes to reach its new position. The one transition on this page. */
const NET_MS = 420;
/** THE FLOOR BETWEEN TWO NEIGHBOURING BARREAUX, and it is the beat's own declared number because
 *  WCAG has none for one fill against another. Five levels is the type sheet's written ceiling and
 *  this branch has already measured what happens past four or five: a ramp built inside
 *  `contrast(accent, ground) / 3` gave seven steps at 1,007:1 — indistinguishable, silently. So the
 *  two tones of each family are pushed apart until they clear this, and the render is REFUSED if no
 *  pair does. Taken here: see the report. */
const NEIGHBOUR_MIN = 1.45;
/** What a band becomes under the pointer, as a gap against its own painted fill. */
const ACTIVE_MIN = 1.14;

export type SideRow = { key: string; name: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDivergingStackedWeb({
  side,
  rows,
  subject,
  details,
  totals,
  camps,
  xTicks,
  netLegend,
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
  side: any;
  rows: SideRow[];
  subject: string;
  /** The pointer's answer for one band of one cut, keyed `<cut>:<row>:<level>`. Every figure in it
   *  was derived in the runner from the frozen file; the browser formats nothing. */
  details: Record<string, string>;
  /** The two camp totals for one row under one cut, keyed `<cut>:<row>`. */
  totals: Record<string, { left: string; right: string }>;
  /** The two camps named in words, per cut, keyed by slug. `name-each-half-in-words` is the control
   *  here: the names are the half of the plate the boundary changes. */
  camps: Record<string, string>;
  xTicks: number[];
  netLegend: string;
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
  const height = rows.length * FRAME.row;

  // Refused before anything is drawn, against what this component is actually handed: a
  // non-contiguous camp, a neutral off the seam, a row that does not total 100 % under some cut, a
  // sixth barreau, a declared lean that is not the lean of the shares, a cut whose picture is the
  // default's.
  assertSideDeclaration(side, { netFloor: 0.5 });

  // ── THE LADDER OF FILLS, BUILT OUTWARD FROM THE CENTRE ────────────────────────────────────────
  // `types/diverging-stacked-bar.md`: "lighter shades near the centre and deeper shades toward the
  // strong-opinion ends so the strength of response reads as intensity as well as position." That is
  // an ORDER, so the ramp is built in that order and not in five independent calibrations: the
  // neutral first, as the LIGHTEST tone that still clears the non-text floor against the ground, and
  // then one rung at a time outward, each pushed away from the rung it sits beside until it stands
  // `NEIGHBOUR_MIN` off it. Two colours calibrated independently against the same floor on the same
  // ground come out IDENTICAL by construction — 1,023:1 measured on one beat of this branch, 1,000:1
  // on another — which is exactly what building outward from a neighbour avoids.
  //
  // The first version of this file built the neutral from the full ink/accent blend and it came out
  // at 13,4:1 against the ground: the heaviest object on the page was the band that means "neither",
  // and France's plate was a black slab 67,7 % wide. Measured, seen, and turned around.
  //
  // Bands are always laid in LADDER ORDER left to right, under every cut (`sideBandsOf` walks the
  // left camp outward from the seam and the right camp outward from it), so two bands are adjacent
  // on the plate exactly when they are adjacent on the ladder. Checking adjacent pairs is therefore
  // checking every pair a reader ever sees touching.
  const step = 0.02;
  /** The lightest tone of `colour`, at or past `from`, that clears the ground and stands `floor` off
   *  `against`. `mix(ground, colour, t)` is monotone in contrast against the ground in BOTH a light
   *  and a dark direction, which is why one search serves creme and nocturne alike. */
  const rung = (colour: string, from: number, against: string | null, floor: number) => {
    for (let t = from; t <= 1.0001; t += step) {
      const candidate = mix(ground, colour, t);
      if (contrast(candidate, ground) < NON_TEXT_CONTRAST_MIN) continue;
      if (against && contrast(candidate, against) < floor) continue;
      return { fill: candidate, t };
    }
    return null;
  };
  /** Past the colour itself, if the colour itself is not deep enough to stand off its neighbour. */
  const beyond = (colour: string, against: string, floor: number) => {
    for (let dose = step; dose <= 0.9; dose += step) {
      const candidate = mix(colour, ink, dose);
      if (contrast(candidate, ground) < NON_TEXT_CONTRAST_MIN) continue;
      if (contrast(candidate, against) >= floor) return { fill: candidate, t: 1 };
    }
    return null;
  };
  const refuse = (what: string, against: string) => {
    throw new Error(
      `no tone of this direction stands ${NEIGHBOUR_MIN}:1 off ${against} while clearing ` +
        `${NON_TEXT_CONTRAST_MIN}:1 against ${ground}, so ${what} and its neighbour would read as ` +
        "one band and the scale would have fewer rungs than the data has",
    );
  };

  // THE NEUTRAL BELONGS TO NEITHER FAMILY, which is `the-neutral-straddles-the-centre` expressed in
  // colour: half ink, half accent. A neutral drawn in either family's own hue would be saying that
  // nuclear is a third fossil tone or a third renewable one, which is the classification the reader
  // has not made yet. Lightest first, because it sits at the centre.
  const blend = mix(ink, accent, 0.5);
  const neutral = rung(blend, 0.1, null, 0);
  if (!neutral)
    throw new Error(
      `no blend of ${ink} and ${accent} clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground} — the ` +
        "band that means 'neither' would be invisible",
    );
  const gas = rung(ink, 0.1, neutral.fill, NEIGHBOUR_MIN);
  if (!gas) refuse("the gas band", "the neutral");
  const coal =
    rung(ink, (gas as { t: number }).t + step, (gas as { fill: string }).fill, NEIGHBOUR_MIN) ??
    beyond(ink, (gas as { fill: string }).fill, NEIGHBOUR_MIN);
  if (!coal) refuse("the coal-and-oil band", "the gas band");
  const bio = rung(accent, 0.1, neutral.fill, NEIGHBOUR_MIN);
  if (!bio) refuse("the biomass band", "the neutral");
  const renew =
    rung(accent, (bio as { t: number }).t + step, (bio as { fill: string }).fill, NEIGHBOUR_MIN) ??
    beyond(accent, (bio as { fill: string }).fill, NEIGHBOUR_MIN);
  if (!renew) refuse("the renewables band", "the biomass band");

  const FILLS: Record<string, string> = {
    "charbon-petrole": (coal as { fill: string }).fill,
    gaz: (gas as { fill: string }).fill,
    nucleaire: neutral.fill,
    biomasse: (bio as { fill: string }).fill,
    renouvelables: (renew as { fill: string }).fill,
  };

  const clears = (colour: string) => contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN;
  const floored = (colour: string) =>
    clears(colour) ? colour : (adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN) ?? colour);

  // WHAT A BAND BECOMES UNDER THE POINTER. The owner refused a fixed dose (1,104:1 on nocturne) and
  // refused three times over a ring laid on top of a mark. So the band darkens off its OWN fill by
  // the smallest step of the direction's ink that clears a measured gap.
  const darken = (fill: string) => {
    for (let dose = 0.08; dose <= 0.9; dose += 0.02) {
      const moved = mix(fill, ink, dose);
      if (contrast(moved, fill) >= ACTIVE_MIN) return moved;
    }
    for (let dose = 0.08; dose <= 0.9; dose += 0.02) {
      const moved = mix(fill, ground, dose);
      if (contrast(moved, fill) >= ACTIVE_MIN) return moved;
    }
    throw new Error(
      `no dose of ${ink} or ${ground} moves ${fill} ${ACTIVE_MIN}:1 off itself — a reader could not ` +
        "see which band answered the pointer",
    );
  };

  const zeroInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const netInk = floored(mix(ground, ink, 0.72));

  const x = (value: number) => (sideAt(value, { axisMax: side.axisMax }) / 100) * FRAME.width;
  const cuts = sideCutsForMarkup(side, SIDE_ID_PREFIX);
  const notes = sideNotesForMarkup(side);
  const levelLabel = (slug: string) =>
    side.levels.find((level: any) => sideSlugOf(level.key) === slug)?.label ?? slug;

  const css = [
    sideChromeCss({ scope: SCOPE }),
    sideCss(side, { scope: SCOPE, idPrefix: SIDE_ID_PREFIX, netMs: NET_MS }),
    // One rule per barreau: what its band becomes under the pointer, lifted off its own fill. The
    // attribute is the band's LEVEL and not its row, because a reader asking "what is this?" is
    // asking about the barreau, and a key per row would light six bands to name one.
    ...Object.entries(FILLS).map(
      ([slug, fill]) => `${SCOPE} rect.band[data-level="${slug}"].mark-active { fill: ${darken(fill)}; }`,
    ),
    // THE NET MARKER: the reading this control hands back, drawn as a place. Always rendered, which
    // is the shape a transition needs. Its `left` comes from the generated stylesheet and never from
    // an inline style, for the defect `floor.ts` and `weigh.ts` both record: an inline `left` wins
    // against every rule below it, so the tick would sit still while the row under it changed camp.
    `${SCOPE} [data-side-net] { position: absolute; width: 3px; background: ${netInk}; border-radius: 2px; transform: translateX(-50%); }`,
    // The per-cut layers that live in the two gutters and above the plot. They are revealed by the
    // same `:checked` that reveals their plate.
    `${SCOPE} .gutter-totals { position: absolute; inset: 0; }`,
    `${SCOPE} p.camps { text-align: center; }`,
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
          nothing leaves this picture under any cut, and a plate that hid a country would be
          answering a different question from the one its pills ask. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertSideDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-side">
        <legend>{side.label}</legend>
        <div className="options">
          {cuts.map((cut) => (
            <label key={cut.id}>
              <input
                id={cut.id}
                type="radio"
                name={SIDE_ID_PREFIX}
                value={cut.slug}
                aria-label={cut.announce}
                defaultChecked={cut.isDefault}
              />
              {cut.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what moving the boundary cost, in words, for a
          reader who is not looking at the plot. The row is reserved and its sentences are stacked in
          one grid cell, so revealing one never pushes the plot down. The default reveals none: it is
          not a counterfactual, it is the claim the title states. */}
      <div className="side-notes" role="status">
        {notes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>
            {note.text}
          </p>
        ))}
      </div>

      {/* `name-each-half-in-words`, AND IT IS THE CONTROL. Which way is which cannot be recovered
          from the bars, and under a movable boundary the two names are exactly what changes. One
          line per cut, revealed by the same `:checked` as its plate. */}
      <div style={{ flex: "0 0 auto", margin: "6px 0 2px" }}>
        {cuts.map((cut) => (
          <p
            key={cut.slug}
            className="camps"
            data-stack-total={cut.slug}
            style={{ ...regs.axis, margin: 0 }}
          >
            {camps[cut.slug]}
          </p>
        ))}
      </div>

      {/* The five barreaux, named once, in ladder order — the shared legend the type sheet asks for,
          below the control and above the bars rather than per row. The sixth entry names the tick,
          because a mark that moves and is not named is the owner's first ruling waiting to happen. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2px 16px",
          margin: "0 0 6px",
          flex: "0 0 auto",
        }}
      >
        {side.levels.map((level: any) => (
          <span
            key={level.key}
            style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                background: FILLS[sideSlugOf(level.key)],
                display: "inline-block",
                borderRadius: 2,
              }}
            />
            {level.label}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 3, height: 13, background: netInk, display: "inline-block", borderRadius: 2 }} />
          {netLegend}
        </span>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${FRAME.yGutterPx}px`,
          ["--end-gutter" as string]: `${FRAME.endGutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + FRAME.yGutterPx + FRAME.endGutterPx} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {/* The six names, drawn UNCONDITIONALLY and in alphabetical order. No cut touches them. */}
          {rows.map((row, i) => (
            <span
              key={row.key}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: row.key === subject ? accent : (regs.axis.color as string),
                fontWeight: row.key === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(FRAME.row * i + FRAME.barTop, height)}%`,
              }}
            >
              {row.name}
            </span>
          ))}
          {/* The LEFT camp's total, per cut. It changes in place rather than sliding: a number that
              slides reads as a bug, a number that changes in place reads as a relabelling. */}
          {cuts.map((cut) => (
            <div key={cut.slug} className="gutter-totals" data-stack-total={cut.slug}>
              {rows.map((row, i) => (
                <span
                  key={row.key}
                  className="axis-label y"
                  style={{
                    ...regs.value,
                    // INK AND NEVER THE ACCENT. A full-strength accent on this page means, and only
                    // means, the argument; a left-camp total wearing it would say the left camp is
                    // the argument. Measured against the ground at the text floor.
                    color: zeroInk,
                    top: `${pct(FRAME.row * i + FRAME.barTop + 18, height)}%`,
                  }}
                >
                  {totals[`${cut.slug}:${row.key}`].left}
                </span>
              ))}
            </div>
          ))}
        </div>

        {side.cuts.map((cut: any) => {
          const slug = sideSlugOf(cut.key);
          return (
            <svg
              key={slug}
              role="group"
              aria-label={`${title} — ${cut.label}`}
              xmlns="http://www.w3.org/2000/svg"
              className="chart"
              data-hit="cell"
              viewBox={`0 0 ${FRAME.width} ${height}`}
              preserveAspectRatio="none"
              {...sideLayerAttrs(slug)}
            >
              <desc>{alt}</desc>
              <rect x={0} y={0} width={FRAME.width} height={height} fill={ground} />

              {xTicks
                .filter((tick) => tick !== 0)
                .map((tick) => (
                  <line
                    key={tick}
                    x1={x(tick)}
                    x2={x(tick)}
                    y1={0}
                    y2={height}
                    stroke={grid}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

              {rows.map((row, i) => {
                const top = FRAME.row * i + FRAME.barTop;
                return (
                  <g key={row.key}>
                    {sideBandsOf(side, slug, row.key)
                      .filter((band) => band.share > 0)
                      .map((band) => (
                        <rect
                          key={band.level}
                          className="band"
                          data-level={band.level}
                          data-mark={`${slug}:${row.key}:${band.level}`}
                          x={x(band.from)}
                          y={top}
                          width={Math.max(0, x(band.to) - x(band.from))}
                          height={FRAME.barH}
                          fill={FILLS[band.level]}
                          {...sideBandAttrs(slug, row.key, band.level)}
                        />
                      ))}
                  </g>
                );
              })}

              {/* The centre, drawn ON TOP of the bands so the straddling barreau reads as straddling
                  rather than as two bands that happen to meet. It never moves. */}
              <line
                x1={x(0)}
                x2={x(0)}
                y1={0}
                y2={height}
                stroke={zeroInk}
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />

              {/* One invisible point per drawn band, naming the band it speaks for. A band with no
                  width gets none: a mark of zero extent is not a mark, and a point sitting on it
                  would take a pointer aimed at its neighbour. */}
              {rows.map((row, i) =>
                sideBandsOf(side, slug, row.key)
                  .filter((band) => band.share > 0)
                  .map((band) => (
                    <circle
                      key={`${row.key}-${band.level}`}
                      className="pt"
                      cx={x((band.from + band.to) / 2)}
                      cy={FRAME.row * i + FRAME.barTop + FRAME.barH / 2}
                      r={5}
                      fill="transparent"
                      stroke="none"
                      tabIndex={0}
                      role="img"
                      aria-label={details[`${slug}:${row.key}:${band.level}`]}
                      data-mark-ref={`${slug}:${row.key}:${band.level}`}
                      data-detail={details[`${slug}:${row.key}:${band.level}`]}
                    />
                  )),
              )}
              <rect
                className="hit-area"
                x={0}
                y={0}
                width={FRAME.width}
                height={height}
                fill="transparent"
                pointerEvents="all"
              />
            </svg>
          );
        })}

        {/* THE NET MARKERS. Always rendered, one per row, `left` generated per cut and transitioned
            — the only thing on this page that travels, and the only movement whose reason a reader
            can see, because the movement IS the reading. Their WIDTH is a fixed 3 CSS px and never a
            fraction of the cell: a length in the plane may follow the stretch, a SHAPE may not. */}
        <div className="overlay" aria-hidden="true">
          {rows.map((row, i) => (
            <span
              key={row.key}
              data-side-net={row.key}
              style={{
                top: `${pct(FRAME.row * i + FRAME.netTop, height)}%`,
                height: `${pct(FRAME.netH, height)}%`,
              }}
            />
          ))}
        </div>

        <div className="end-axis">
          {/* The RIGHT camp's total, per cut, outside the bar — the static sibling's own cited rule
              ("the totals belong outside the bar, at the ends"), which is also what keeps this beat
              clear of the type sheet's in-segment-ink trap. */}
          {cuts.map((cut) => (
            <div key={cut.slug} className="gutter-totals" data-stack-total={cut.slug}>
              {rows.map((row, i) => (
                <span
                  key={row.key}
                  className="axis-label"
                  style={{
                    ...regs.value,
                    color: zeroInk,
                    position: "absolute",
                    left: 10,
                    top: `${pct(FRAME.row * i + FRAME.barTop + 9, height)}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  {totals[`${cut.slug}:${row.key}`].right}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="x-axis">
          {xTicks.map((tick) => (
            <span
              key={tick}
              className="axis-label x"
              style={{ ...regs.axis, left: `${sideAt(tick, { axisMax: side.axisMax })}%` }}
            >
              {tick === 0 ? "0" : `${Math.abs(tick)} %`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
