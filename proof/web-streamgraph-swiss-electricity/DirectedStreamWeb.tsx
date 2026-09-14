/**
 * Switzerland's electricity by source, 2000 to 2025, drawn as a streamgraph THROUGH the design base
 * and delivered as an interactive page.
 *
 * THE READER'S QUESTION IS "IS THIS BAND GROWING, AND BY HOW MUCH", AND A STREAM IS THE WORST PLACE
 * IN THIS CATALOGUE TO ASK IT. Every band floats between two wavy edges, and with a centred offset
 * not one of the nine rests on a straight line — so judging growth is subtracting two curves by eye.
 * Measured on this plate: seven of the nine bands move their own FLOOR further, across the record,
 * than they ever move their own THICKNESS. Solar, the band the headline is about, wanders 53,7 units
 * of ground under a 36,2-unit rise.
 *
 * SO THE READER CHOOSES WHICH BAND IS LAID FLAT (`assets/floor.ts`, a new vocabulary). The plate
 * shears vertically until that band's own bottom edge is a straight rule; every band keeps its exact
 * shape and its exact place in the order, and nothing is repainted, because the ramp encodes stack
 * position and stack position is what a shear preserves.
 *
 * AND THEN THE PAGE HANDS BACK THE THING THIS TYPE FORBIDS. `a-free-baseline-forbids-a-value-axis`
 * is spent in the default state, where the page carries no value axis and prints the total at both
 * ends instead. Under a chosen option it is SUSPENDED and not broken: that band's floor IS a fixed
 * zero, so a real TWh axis opens in the gutter, graduated across the plot, and closes again when the
 * reader leaves. Which bands are offered is arithmetic — an option must hold two graduations at the
 * axis register's own leading, which admits three of the nine and refuses five as too thin.
 *
 * `a-band-is-named-inside-itself-or-it-is-texture` — the three bands thick enough carry their names
 * where they are thickest, clamped away from both edges. Those names are CARRIED by the control, not
 * hidden by it: they move with their bands and stay drawn in every state of the page.
 *
 * THE READING HAD TO CHANGE WITH THE CONTROL. This page shipped 234 hit points, one per band-year,
 * each at the centre of its band; a shear moves every one of them and `interaction.mjs` resolves a
 * pointer off `cx`/`cy` read once at init. So the reading is one point per YEAR, at an x no option
 * ever moves, wired to a full-height guide that slices the stream — and its answer is the whole
 * year, all nine sources in rank order, which is where the claim itself lives.
 */

import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { figureVars, inkOnFill, noteAnchor, webRegisters } from "#shared/design-base/web.mjs";
import {
  assertFloorDeclaration,
  floorChromeCss,
  floorCss,
  floorNotesForMarkup,
  floorOptionsForMarkup,
  type FloorDeclaration,
  type FloorGeometry,
} from "../../skills/chart-web/assets/floor.ts";

export const FRAME = { width: 900, height: 400, xAxisRowPx: 28 };

/** The scope every generated rule is written inside, and the prefix every radio id carries. */
const SCOPE = ".chart-figure";
const FLOOR_ID_PREFIX = "chart-floor";
/** How wide the gutter opens for the axis an option earns. Nothing in the default state. */
const GUTTER_PX = 46;
/** How long a carried name takes to reach its band. The plates themselves cut — a shear is not an
 *  interpolation — and a name that jumped while its band cut would read as a third thing happening. */
const CARRY_MS = 260;

/** One band of one plate: which series it is, its `d` at this option's shear, its step on the ramp. */
export type PlateBand = { key: string; d: string; tone: number };
/** One drawn state of the whole picture: the untouched silhouette, or one laid-flat option. */
export type Plate = {
  slug: string;
  bands: PlateBand[];
  /** The straight floor, in geometry units. `null` on the untouched plate, which has none. */
  ruleY: number | null;
  /** Where the graduations cross the plot, in geometry units. Empty on the untouched plate. */
  grid: number[];
  crossing: { x: number; y: number } | null;
};
/** The axis one option earns, and the band it measures. */
export type PlateAxis = { slug: string; name: string; ticks: { text: string; y: number }[] };
/** One year's hit point: an x no option moves, and the whole year's reading. */
export type Mark = { key: string; year: number; x: number; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedStreamWeb({
  plates,
  axes,
  floor,
  geometry,
  marks,
  xTicks,
  tones,
  toneLabels,
  bandNames,
  totals,
  crossingText,
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
  plates: Plate[];
  axes: PlateAxis[];
  floor: FloorDeclaration;
  geometry: FloorGeometry;
  marks: Mark[];
  xTicks: { year: number; x: number }[];
  tones: number;
  toneLabels: string[];
  bandNames: { key: string; x: number; text: string }[];
  totals: { left: string; right: string };
  crossingText: string;
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

  // THE RAMP, AND IT IS ORDINAL RATHER THAN CATEGORICAL. The bands are stacked in a stated order —
  // largest through the middle, thin ones tapering outward — so their positions are ORDERED, and an
  // ordered set takes a sequential ramp of the direction's own accent. Every step is measured
  // against the ground and lifted to the non-text floor if it falls under it, which is also what
  // makes the ground-coloured seams, graduations and hover guide below readable on every one of
  // them without measuring nine more pairs.
  const ramp = Array.from({ length: tones }, (_, i) => {
    const c = mix(ground, accent, 0.2 + ((tones - 1 - i) / (tones - 1)) * 0.8);
    return contrast(c, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const toneOf = new Map(plates[0].bands.map((b) => [b.key, b.tone]));

  // Refused before anything is drawn, against what this component is actually handed.
  assertFloorDeclaration(floor, geometry, { height: FRAME.height });

  const floorOptions = floorOptionsForMarkup(floor, FLOOR_ID_PREFIX);
  const floorNotes = floorNotesForMarkup(floor);

  const css = [
    // The default gutter, and it is a GENERATED rule rather than an inline style on purpose: an
    // inline `--y-gutter` would beat every rule this file emits, and the gutter is exactly what an
    // option has to open. Zero here, because a gutter reserved beside a plate whose own confession
    // is that it has no value axis would be a promise the picture cannot keep.
    `${SCOPE} .chart-plot { --y-gutter: 0px; }`,
    floorChromeCss({ scope: SCOPE }),
    floorCss(floor, {
      scope: SCOPE,
      idPrefix: FLOOR_ID_PREFIX,
      height: FRAME.height,
      gutterPx: GUTTER_PX,
      carryMs: CARRY_MS,
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
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves this picture, and a stream that hid a band would change every other band's
          place. A floor is an eighth mechanism and pays its own way. */}
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
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertFloorDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-floor">
        <legend>{floor.label}</legend>
        <div className="options">
          {floorOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-floor"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the flattening bought, in words, for a
          reader who is not looking at the plot. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the plot underneath it. The untouched option reveals
          none: it is not a counterfactual, it is the claim the title states. */}
      <div className="floor-notes" role="status">
        {floorNotes.map((note) => (
          <p data-floor-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        {/* THE AXIS AN OPTION EARNS. Drawn once per option, at its own graduations, and revealed by
            the same `:checked` that shears the plate. It lives in the y-gutter and NOT in
            `.overlay`, which is the plate's own layer: every word there is required to be drawn
            unconditionally, and these belong to an option nobody has chosen yet. */}
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {axes.map((axis) => (
            <div key={axis.slug} data-floor-axis={axis.slug} role="group" aria-label={`Valeurs en TWh, ${axis.name}`}>
              {axis.ticks.map((tick) => (
                <span
                  key={tick.text}
                  className="axis-label y"
                  style={{ ...regs.axis, color: label, top: `${pct(tick.y, FRAME.height)}%` }}
                >
                  {tick.text}
                </span>
              ))}
            </div>
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

          {xTicks.map((t) => (
            <line key={t.year} x1={t.x} x2={t.x} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* EVERY STATE OF THE PICTURE, DRAWN ONCE AT ITS OWN PLACE. A shear is a different amount
              at every step, so it is not a transform and there is nothing to interpolate: the
              stylesheet reveals one plate and hides the rest. That is `fold.ts`'s own discipline,
              and it keeps this control clear of the hole `stack.ts` records — a mark moved by CSS
              still answers for the `cx` it was born with. */}
          {plates.map((plate) => (
            <g key={plate.slug} data-floor-plate={plate.slug}>
              {plate.bands.map((b) => (
                <path key={b.key} d={b.d} fill={ramp[b.tone]} stroke={ground} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
              ))}
              {/* The graduations. Ground-coloured, so they read as gaps cut in the stream rather
                  than as a second set of marks — and their contrast is the ramp's own, since every
                  step of it was lifted to the non-text floor against this exact ground above. */}
              {plate.grid.map((y) => (
                <line
                  key={`g${y}`}
                  x1={0}
                  x2={FRAME.width}
                  y1={y}
                  y2={y}
                  stroke={ground}
                  strokeWidth={1.4}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* THE FLOOR ITSELF, CASED. A rule laid over nine different fills cannot be measured
                  against all of them, so it is not asked to be: the casing is the ground, which
                  every ramp step already clears the non-text floor against, and the rule is the
                  direction's ink at the TEXT floor against that same ground. Two measured pairs
                  instead of eighteen, and neither of them is an opacity. */}
              {plate.ruleY === null ? null : (
                <g>
                  <line x1={0} x2={FRAME.width} y1={plate.ruleY} y2={plate.ruleY} stroke={ground} strokeWidth={4.5} vectorEffect="non-scaling-stroke" />
                  <line x1={0} x2={FRAME.width} y1={plate.ruleY} y2={plate.ruleY} stroke={label} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                </g>
              )}
              {plate.crossing === null ? null : (
                <circle cx={plate.crossing.x} cy={plate.crossing.y} r={6} fill="none" stroke={label} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              )}
            </g>
          ))}

          {/* THE GUIDE THE READING LIGHTS, and it is a full-height slice at the year's own x —
              the one coordinate no option moves. Ground-coloured for the reason the graduations
              are: it cuts the stream rather than drawing over it, and it is invisible outside the
              stream, where there is nothing to point at. */}
          {marks.map((m) => (
            <rect
              key={`guide-${m.key}`}
              data-mark={m.key}
              style={{ "--mark-active": ground } as React.CSSProperties}
              x={Math.min(Math.max(m.x - 1.25, 0), FRAME.width - 2.5)}
              y={0}
              width={2.5}
              height={FRAME.height}
              fill="none"
            />
          ))}

          {/* ONE POINT PER YEAR, and the point itself never shows: `data-mark-ref` names the guide
              that answers for it, and the format keeps such a point transparent. Its `cy` is the
              middle of the frame and is an ANCHOR, never a reading — the reading is the whole
              year, and the year is an x. */}
          {marks.map((m) => (
            <circle
              key={m.key}
              className="pt"
              cx={m.x}
              cy={FRAME.height / 2}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={m.key}
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* THE BAND NAMES ARE CARRIED, NOT HIDDEN. Their `left` is inline because a shear never
              touches x; their `top` comes from the generated stylesheet in EVERY state, the default
              included, because an inline `top` would beat every rule the control emits. So each
              name stays drawn whatever the reader chooses, and `assertFloorDeclaration` refuses an
              option that forgets one — a forgotten name does not vanish, it sits on the wrong band. */}
          {bandNames.map((b) => (
            <span
              key={`l-${b.key}`}
              className="end-label"
              data-floor-carry={b.key}
              style={{
                ...regs.value,
                fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                color: inkOnFill(ramp[toneOf.get(b.key) ?? 0], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
                left: `${pct(b.x, FRAME.width)}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
              }}
            >
              {b.text}
            </span>
          ))}
          <span
            className="note"
            data-floor-carry="crossing"
            style={{
              ...regs.annot,
              color: label,
              ...noteAnchor(pct(plates[0].crossing!.x, FRAME.width)),
              // THE SENTENCE HANGS BELOW ITS OWN POINT AND IS NOT LIFTED ABOVE IT, and the reason is
              // a measurement. A lift stated as a percentage of the note's OWN height doubles the
              // moment the note wraps: `translateY(-160%)` is 30 px on one line at 1280 and 61 px on
              // two at 375, which put the whole sentence 35 px ABOVE the plot — outside the hit area
              // it annotates, where the format's own probe pointed at it and reached `.floor-notes`
              // instead of the chart. A fixed downward offset cannot do that, because the note grows
              // into the plot rather than out of it, and `.note` already carries a ground chip so it
              // stays readable over whichever band it lands on.
              transform: `${noteAnchor(pct(plates[0].crossing!.x, FRAME.width)).transform} translateY(10px)`,
            }}
          >
            {crossingText}
          </span>
          {/* A FREE BASELINE FORBIDS A VALUE AXIS, so the total is printed at both ends instead —
              in every state, including the ones that earn an axis, because the axis an option earns
              measures ONE band and never the stack. */}
          <span className="note" style={{ ...regs.annot, color: label, left: "0%", top: "1%", background: "transparent", padding: 0 }}>
            {totals.left}
          </span>
          <span className="note" style={{ ...regs.annot, color: label, right: "0%", top: "1%", background: "transparent", padding: 0 }}>
            {totals.right}
          </span>
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t.year} className="axis-label x" style={{ ...regs.axis, left: `${pct(t.x, FRAME.width)}%` }}>
              {t.year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
