/**
 * Sixteen European countries across seven electricity sources, drawn as parallel coordinates THROUGH
 * the design base and delivered as an interactive page.
 *
 * `each-rail-is-headed-by-what-it-is` — every axis carries its own name and its own ceiling in its
 * own units. A parallel-coordinates plate with one shared scale is a lie about seven different
 * quantities; a plate with seven unlabelled scales is a picture.
 *
 * ON A PLATE, ONLY ADJACENT AXES SHOW A RELATIONSHIP. A crossing between two neighbours is a real
 * inverse; a line that rises three axes later is nothing. So the axis ORDER is the argument — and it
 * means a still of this type can carry EXACTLY ONE relationship, the pair the author put side by
 * side. Seven rails make twenty-one pairs; the plate draws six of them and the fifteen others are
 * unreadable by construction. That is not a defect of the drawing, it is what the form IS.
 *
 * WHAT THE WEB ADDS, ON TWO CHANNELS, AND THE SECOND ONE IS THE POINT.
 *
 * 1. EVERY VERTEX ANSWERS. Sixteen lines over seven axes is a tangle and the plate cannot isolate
 *    one: a reader following Finland has to trace it by eye through fifteen crossings. Here every
 *    vertex answers with its country and all seven of its shares at once.
 *
 *    THE HIT TARGET IS THE VERTEX, NOT THE LINE, and that is a decision the format's own verifier
 *    forced. `.line-hit` exists in the shared stylesheet and `initLines` wires it, but every check
 *    `verify-web.mjs` makes probes a mark at the CENTRE OF ITS BOUNDING BOX — which for a path
 *    spanning seven axes is empty space, so a page built that way reports 47 failures that are not
 *    defects and no failure that is one. A vertex is a mark with a centre. Each carries its whole
 *    country's row, so hitting any of the seven answers the same thing, and `data-hit="cell"`
 *    resolves in both axes because sixteen vertices share every x.
 *
 * 2. THE READER BRUSHES A BAND ON A RAIL — `assets/brush.ts`, and the corpus ships this gesture
 *    nowhere else. Five named bands over three of the seven axes; the chosen one is drawn ON the
 *    rail it cuts, every line crossing it steps forward, and one sentence appears with the
 *    CROSS-AXIS reading that selection produces. Two of the five bands ask about a NON-ADJACENT pair
 *    (hydro against gas, coal against hydro) — readings that do not exist on the plate at all.
 *
 *    Named bands and not a drag, because a drag costs a script and this format's promise is that the
 *    reader without one still gets the complete plate. Radios plus generated CSS: the control works
 *    with JavaScript off exactly as it works with it on.
 *
 * THE INSIDE STEPS FORWARD; THE OUTSIDE DOES NOT STEP BACK. The fourteen context lines are already
 * drawn at the non-text contrast floor against the direction's ground, so there is no step back
 * available that leaves them legible — and a line receding must still be measured where it crosses
 * what it crosses. Which is also why nothing on this plate is painted through an `opacity` any more:
 * the previous build drew its context lines at `strokeOpacity={0.75}` over a colour that had just
 * been clamped to 3:1, which is the exact defect that reached readers at 1,75:1 and 2,19:1 on two
 * other beats — a contrast measured before the opacity that destroyed it.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import {
  assertBrushDeclaration,
  brushAttrsFor,
  brushBandsForMarkup,
  brushChromeCss,
  brushCss,
  brushNotesForMarkup,
  brushOptionsForMarkup,
  buildBrushIndex,
  type BrushDeclaration,
} from "../../skills/chart-web/assets/brush.ts";

export const FRAME = { width: 880, height: 340, xAxisRowPx: 40 };

/** This format's own scope selector, and the id prefix the brush's radios take. The two arguments
 *  `brush.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const BRUSH_ID_PREFIX = "chart-brush";

/** How long a selection takes to come forward. Inside `prefers-reduced-motion: no-preference` only —
 *  `brush.ts` puts the whole transition inside the query rather than overriding it back. */
const MOVE_MS = 180;

/** What a selected line and a selected rail are drawn at. The plate's own widths are 1.2 (context)
 *  and 2.2 (the two subjects), so 3.4 is a step both of them can be read against. */
const SELECTED_LINE_WIDTH = 3.4;
const SELECTED_RAIL_WIDTH = 2;
const RING_WIDTH = 1.8;

/** THE PLOT INSETS BY THE ROOM ITS OWN LARGEST MARK NEEDS, on all four sides.
 *
 *  The first rail sat ON the frame's left edge, the last ON its right, and a vertex sits ON its
 *  rail — so thirty-two of this page's hundred and twelve vertices were drawn half outside the
 *  `<svg>` and cut in half by it, measured at 1400x900 on the committed page. The floor did the
 *  same to every country at 0 % on a rail and the ceiling to every country at one. A mark
 *  half-drawn at the frame's edge reads as a rendering fault, and on this type the outermost rails
 *  carry the two variables the axis order makes most prominent. The remedy is ROOM, never a smaller
 *  mark: the drawing area insets and the marks keep their size.
 *
 *  HOW MUCH ROOM, MEASURED AT BOTH ENDS OF THE RANGE. A vertex is `MARK_R` in the geometry's own
 *  units and scales with the viewBox, so `MARK_R` of inset would hold it at every width. Its brush
 *  RING does not: that stroke is `non-scaling`, a constant 1,8 px however squeezed the box is, so
 *  its half-width costs MORE of the geometry's units the narrower the page gets. At 1400 px this
 *  880x340 box is drawn 1352x544, and the ring's 0,9 px is 0,6 units across and 0,6 down; at
 *  375 px it is drawn 327x99, and the same 0,9 px is 2,4 units across and 3,1 down. So the inset a
 *  ringed vertex needs is 6,4 units at the narrow end, not 4,6 — and 8 holds it at both. Eight is
 *  also half `BAND_WIDTH`, which is what lets every band centre on its own rail instead of being
 *  pushed off it to stay inside the frame. */
const MARK_R = 4;
const MARK_INSET = 8;

export type Axis = { key: string; name: string; ceiling: number; ceilingLabel: string };
export type Line = { code: string; name: string; values: number[]; highlight: boolean; detail: string };

/** What the beat asks for, before the geometry exists. The bounds are in the axis's OWN units
 *  (percent of that country's mix); the rectangle they become is computed below, from this
 *  component's own scale, because the scale is the component's and nothing else may guess it. */
export type BrushPlan = {
  label: string;
  noneLabel: string;
  options: {
    key: string;
    axis: string;
    label: string;
    announce: string;
    note: string;
    /** The band's bounds, in the axis's OWN units. */
    lo: number;
    hi: number;
    /** What the RUNNER measured falls inside those bounds, from the frozen file. Checked here
     *  against the geometry this component is about to draw — the same division `stack.ts` draws
     *  when it takes a formatted total and a numeric one and makes the component check one against
     *  what it draws. The runner owns the arithmetic (its note's numbers come from the same pass);
     *  this component owns the scale, and the two must agree or the sentence under the control
     *  describes a set the picture does not show. */
    keys: string[];
  }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedParallelWeb({
  axes,
  lines,
  brushPlan,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  axes: Axis[];
  lines: Line[];
  brushPlan: BrushPlan;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // ── the colours, and every one of them measured against the ground it is painted on ──────────
  let thread = mix(ground, ink, 0.32);
  if (contrast(thread, ground) < NON_TEXT_CONTRAST_MIN)
    thread = adjustToContrast(thread, ground, NON_TEXT_CONTRAST_MIN) ?? thread;
  // WHAT A SELECTED LINE STEPS TO. It is a step in VALUE on one neutral, never a second hue: hue on
  // this plate is already carrying "is this line the claim's subject", and spending it again is the
  // thing `the-subject-is-ringed-not-recoloured` refuses. The step is measured twice — against the
  // ground, so a selected line is still a legible mark, and against `thread`, because two colours
  // can each clear 3:1 on the ground and be indistinguishable from EACH OTHER, which is the only
  // comparison a reader operating this control is making. `assertBrushDeclaration` is handed both.
  let deep = mix(ground, ink, 0.92);
  if (contrast(deep, ground) < NON_TEXT_CONTRAST_MIN)
    deep = adjustToContrast(deep, ground, NON_TEXT_CONTRAST_MIN) ?? deep;
  const rail = mix(ground, ink, 0.45);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  // The band's own paint: a wash of the selected ink over the ground, outlined in the same ink so
  // its two BOUNDS are readable as edges rather than as a fade. The wash is a mixed colour, not an
  // opacity, for the reason this file's header gives.
  const bandFill = mix(ground, ink, 0.2);
  const bandStroke = deep;
  // WHAT THE CONTROL ITSELF IS DRAWN IN, and it is measured here for the reason every other colour
  // on this page is: `brush.ts` may not import a colour module. The pills used to carry no edge at
  // all — the shared chrome frames the GROUP and leaves each option bare — so five of the six
  // reached the reader as `muted` words on the ground and only the chosen one looked pressable.
  // `--grid`, the obvious candidate for a hairline, measures 1,52:1 against the cream ground and
  // 1,70:1 against the midnight one: a border a reader cannot see is not an affordance. So the
  // outline is mixed from the direction's own ink and held to the non-text floor, the same way
  // `thread` and `deep` are, and every state's reading goes to `assertBrushDeclaration` below.
  let pillOutline = mix(ground, ink, 0.45);
  if (contrast(pillOutline, ground) < NON_TEXT_CONTRAST_MIN)
    pillOutline = adjustToContrast(pillOutline, ground, NON_TEXT_CONTRAST_MIN) ?? pillOutline;

  // Both scales run edge to edge of the INSET drawing area, never of the frame — see `MARK_INSET`.
  const x = (i: number) =>
    MARK_INSET + (i / (axes.length - 1)) * (FRAME.width - 2 * MARK_INSET);
  // THE CEILING LABEL NEEDS ITS OWN BAND, AND THE RAIL HAS TO GIVE IT ONE. The label names the top
  // of the rail, so it is seated at the top of the rail — which is exactly where the vertex of a
  // country AT the ceiling is drawn. Measured on the shipped page: four vertices sat UNDER a
  // ceiling label, overlapping it by 4,1 to 6,3 px, and a disc half-covered by a word reads as a
  // disc that has been cut off. Nothing was clipped — the frame was fine — the label was simply
  // standing on the mark. So the rail stops a label's own height short of the frame and the label
  // sits in the band that opens above it: neither moves onto the other, at any width.
  const CEILING_BAND = MARK_INSET + 16;
  const y = (axisIndex: number, value: number) =>
    FRAME.height -
    MARK_INSET -
    (value / axes[axisIndex].ceiling) * (FRAME.height - MARK_INSET - CEILING_BAND);
  const path = (l: Line) => l.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(i, v)}`).join(" ");

  // NO MARK IS DRAWN ACROSS THE FRAME'S OWN EDGE, and it is checked rather than reasoned about.
  // `MARK_INSET` is a number, and a number can be lowered by somebody who has not measured what it
  // holds; the defect that produces is thirty-two half-vertices at the two ends of the plot, which
  // is not something any guard in this format looks for — `verify-web.mjs` reads text, geometry,
  // opacity and colour, and says in its own header that a clipped mark is not reachable from there.
  // So the beat looks, in its own units, at the marks it is about to write. What this CANNOT see is
  // the brush ring's overhang: that stroke is non-scaling, so its cost is in reader pixels and this
  // check is in geometry units. The ring is why the inset is 8 and not 4, measured at 375 px in a
  // real browser with a band selected, and it stays a measurement rather than a guard.
  for (const line of lines)
    line.values.forEach((value, i) => {
      const cx = x(i);
      const cy = y(i, value);
      if (
        cx - MARK_R < 0 ||
        cx + MARK_R > FRAME.width ||
        cy - MARK_R < 0 ||
        cy + MARK_R > FRAME.height
      )
        throw new Error(
          `${line.name}'s vertex on ${axes[i].name} is centred at ${cx.toFixed(1)},` +
            `${cy.toFixed(1)} with r=${MARK_R} on a ${FRAME.width}x${FRAME.height} plot, so the ` +
            "frame would cut it in half. The drawing area insets by the room its own marks need — " +
            "raise MARK_INSET, never the mark's own size.",
        );
    });

  // ── the brush, turned from bounds in the axis's units into geometry this component owns ──────
  const BAND_WIDTH = 12;
  const axisIndexOf = (key: string) => axes.findIndex((a) => a.key === key);
  const declaration: BrushDeclaration = {
    label: brushPlan.label,
    noneLabel: brushPlan.noneLabel,
    // The two lines the claim names are drawn in the accent, and `web-discipline.md` says no control
    // on the page may take that away. They take the brush's WEIGHT step and never its value step.
    held: lines.filter((l) => l.highlight).map((l) => l.code),
    options: brushPlan.options.map((option) => {
      const i = axisIndexOf(option.axis);
      if (i < 0)
        throw new Error(`the band ${option.label} cuts ${option.axis}, which this beat does not draw`);
      const top = y(i, option.hi);
      const bottom = y(i, option.lo);
      const drawn = lines
        .filter((l) => l.values[i] >= option.lo && l.values[i] <= option.hi)
        .map((l) => l.code);
      if (drawn.join(" ") !== option.keys.join(" "))
        throw new Error(
          `the band ${option.label} says it holds ${option.keys.join(", ")} and the geometry this ` +
            `component is about to draw puts ${drawn.join(", ")} inside it — the sentence under the ` +
            "control would describe a set the picture does not show",
        );
      return {
        key: option.key,
        axis: option.axis,
        label: option.label,
        announce: option.announce,
        note: option.note,
        keys: drawn,
        band: {
          // CENTRED ON ITS RAIL, at every rail, and no longer clamped. A rail used to sit ON the
          // frame's own edge, so the outermost bands had to be pushed inside it to stay drawable —
          // which put the band beside its rail rather than on it. `MARK_INSET` is half this width,
          // so there is now room for the band the reader is actually being shown.
          // `assertBrushDeclaration` still refuses one the viewBox would cut.
          x: x(i) - BAND_WIDTH / 2,
          width: BAND_WIDTH,
          top,
          height: bottom - top,
        },
      };
    }),
  };
  assertBrushDeclaration(
    declaration,
    lines.map((l) => l.code),
    axes.map((a) => a.key),
    {
      frame: { width: FRAME.width, height: FRAME.height },
      // MEASURED HERE AND HANDED OVER, never measured there: `brush.ts` may not import this module —
      // no import may leave a skill directory — and re-deriving the contrast arithmetic inside it
      // would be a second derivation of one number.
      tone: {
        baseOnGround: contrast(thread, ground),
        deepOnGround: contrast(deep, ground),
        deepOnBase: contrast(deep, thread),
        // The four states of the control, each against the ground it ACTUALLY sits on — which for
        // the chosen option's words is the ink fill under them, not the page.
        pillRestOnGround: contrast(muted, ground),
        pillOutlineOnGround: contrast(pillOutline, ground),
        pillActiveOnGround: contrast(ink, ground),
        pillSelectedTextOnFill: contrast(ground, ink),
      },
    },
  );

  const brushIndex = buildBrushIndex(declaration, lines.map((l) => l.code));
  const brushOptions = brushOptionsForMarkup(declaration, BRUSH_ID_PREFIX);
  const brushNotes = brushNotesForMarkup(declaration);
  const brushBands = brushBandsForMarkup(declaration);

  const css = [
    brushChromeCss({ scope: SCOPE, pill: { outline: pillOutline } }),
    brushCss(declaration, {
      scope: SCOPE,
      idPrefix: BRUSH_ID_PREFIX,
      deep,
      ring: { stroke: deep, width: RING_WIDTH },
      band: { fill: bandFill, stroke: bandStroke },
      weight: { line: SELECTED_LINE_WIDTH, rail: SELECTED_RAIL_WIDTH },
      moveMs: MOVE_MS,
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
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing leaves this picture. A brush selects ON the encoded variable, so the set it selects
          is only legible while the set it is read against is still drawn beside it. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the count a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertBrushDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-brush">
        <legend>{brushPlan.label}</legend>
        <div className="options">
          {brushOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-brush"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER, and on this vocabulary it is not a count: a
          reader who chose "nuclear above 25 %" already knows they asked for the high-nuclear
          countries. What they cannot see is what that same set does on a rail the plate could not
          put next to this one. Its row is reserved whether or not a band is chosen, so the plot
          underneath never jumps. The untouched option reveals none, because it is the claim. */}
      <div className="brush-notes" role="status">
        {brushNotes.map((note) => (
          <p data-brush-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
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

          {/* THE BANDS, DRAWN IN EVERY STATE AND REVEALED IN ONE. Under the plot's own lines, so a
              selected line is never read through the wash that says where it was selected. */}
          {brushBands.map((b) => (
            <rect
              key={`band-${b.slug}`}
              data-brush-band={b.slug}
              x={b.band.x}
              y={b.band.top}
              width={b.band.width}
              height={b.band.height}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {axes.map((a, i) => (
            <line
              key={a.key}
              data-brush-axis={a.key}
              x1={x(i)}
              x2={x(i)}
              y1={MARK_INSET}
              y2={FRAME.height - MARK_INSET}
              stroke={rail}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {lines.map((l) => (
            <path
              key={l.code}
              {...brushAttrsFor(brushIndex, declaration, l.code, "line")}
              d={path(l)}
              fill="none"
              stroke={l.highlight ? lit : thread}
              strokeWidth={l.highlight ? 2.2 : 1.2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Every vertex carries its whole country's row, so hitting any of the seven answers the
              same thing. Under a brush it is RINGED and never refilled: the format's own
              `.pt:hover { fill: … }` owns a vertex's fill, and a generated rule setting `fill` here
              would score (1,3,0) against that rule's (0,1,0) and silently kill hover on exactly the
              marks the reader had just selected. */}
          {lines.flatMap((l) =>
            l.values.map((v, i) => (
              <circle
                key={`v-${l.code}-${i}`}
                className="pt"
                {...brushAttrsFor(brushIndex, declaration, l.code, "vertex")}
                cx={x(i)}
                cy={y(i, v)}
                r={MARK_R}
                fill={l.highlight ? lit : thread}
                stroke="none"
                vectorEffect="non-scaling-stroke"
                tabIndex={0}
                role="img"
                aria-label={l.detail}
                data-detail={l.detail}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {axes.map((a, i) => (
            <span
              key={a.key}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                color: label,
                // INSIDE the plot's own rectangle. At 375px the geometry has shrunk and the type
                // has not, so a ceiling label seated at the very top edge sits over the figure's
                // padding, where the hit area cannot answer for it.
                ...noteAnchor(pct(x(i), FRAME.width)),
                // At the rail's own top, which is `MARK_INSET` down from the frame now rather than
                // flush with it — the label names the ceiling, so it follows the rail that carries
                // it rather than staying at a percentage nothing on the plot is drawn at any more.
                top: `${pct(MARK_INSET, FRAME.height)}%`,
              }}
            >
              {a.ceilingLabel}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {axes.map((a, i) => {
            const centre = pct(x(i), FRAME.width);
            const anchor =
              centre > 75
                ? { right: `${100 - centre}%`, transform: "translateX(0)" }
                : centre < 8
                  ? { left: `${centre}%`, transform: "translateX(0)" }
                  : { left: `${centre}%` };
            return (
              <span
                key={a.key}
                className="axis-label x"
                style={{ ...regs.axis, ...anchor, whiteSpace: "normal", textAlign: "center", lineHeight: 1.05 }}
              >
                {a.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* The note naming the two lines that clear both thresholds sits UNDER the plot: inside it
          there is no empty band at any width, and at 375px an overlay note at the foot of the frame
          lands in the axis row, where the hit area cannot answer for it. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
