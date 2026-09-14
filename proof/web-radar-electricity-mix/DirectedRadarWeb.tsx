/**
 * France against Germany, 2024 electricity, on eight axes -- drawn as a radar THROUGH the design base
 * and delivered as an interactive page whose one control DISCREDITS the drawing.
 *
 * `the-grid-is-circles-and-the-ceiling-is-drawn` -- the rings are drawn as CIRCLES, not as a polygon
 * joining the axes, and the outermost ring carries its own value. A polygonal grid makes a value near
 * an axis look larger than the same value between two, because the polygon's edge is closer to the
 * centre there; circles do not lie about that.
 *
 * TWO SHAPES, NEVER MORE. A radar is a shape-comparison instrument and it stops working at three: the
 * overlaps stop being readable and the fills stop being separable. Two is what this page draws, and
 * the reason is stated rather than left as a preference.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT A TOOLTIP. `chart-beat/references/types/radar.md` does not warn
 * about a decoration on this type; it says the type MISREPORTS -- "a polygon's AREA (the thing a
 * reader's eye actually judges at a glance) is sensitive to axis order and count in a way the
 * underlying numbers aren't ... this is the type's structural weak point, not a bug to be fixed in
 * code" -- and that the type ships with no mechanical guard at all behind that problem. A still can
 * answer that exactly one way: pick an ordering, state it on the plate, ask to be trusted. That is
 * what the static sibling does and it is the honest maximum of a still.
 *
 * So the gesture here is the lie itself, made operable: the reader hands the eight axes round the
 * circle and watches both polygons change size while not one of the sixteen numbers moves. Measured
 * over all 5 040 orderings of these axes, France's polygon spans 0,50 % to 3,45 % of the disc and the
 * ratio of Germany's area to France's spans 0,60 to 6,83 -- the eye's answer to "who covers more" can
 * be turned all the way round by nothing but where the spokes sit. The vocabulary is
 * `skills/chart-web/assets/reorder.ts`; the arithmetic that refuses an ordering which draws the same
 * polygon is there and not here.
 *
 * EVERY ORDERING IS A COMPLETE `<svg>` OF ITS OWN, and that is the one structural decision this
 * component makes on the control's behalf. `interaction.mjs` resolves the mark under a pointer from
 * `cx`/`cy` read once at init, which no CSS transform ever changes, and a `.pt` hidden by `opacity`
 * stays in that hit test and answers for a vertex the reader cannot see. `initAll` wires every
 * `svg.chart` separately, so four whole drawings stacked in one grid cell and revealed with `display`
 * give the unchosen three no pointer event, no tab stop and no probe. Nothing is transformed.
 *
 * AND THE SECOND CHANNEL IS UNCHANGED, on purpose: every vertex still answers with the country, the
 * source, its exact share, the TWh behind it and what the OTHER country has on the same axis. Those
 * sixteen strings are identical in every ordering -- they are the part of this page the reordering
 * cannot touch, which is the editorial point restated on a channel the reader can check.
 *
 * THE ONE PLACE THIS BASE SETS TYPE INSIDE AN SVG, and the reason is the radial geometry. The fluid
 * frame keeps every word in HTML because `preserveAspectRatio="none"` would stretch a `<text>` out of
 * shape. This beat does not stretch -- a radial geometry cannot: an ellipse would make the same share
 * read as two different distances depending on which axis it sat on. So it letterboxes, and that
 * broke the overlay: the `<svg>` shrinks inside its grid cell and centres, while an HTML label
 * positioned in percentages of that CELL does not. Inside the viewBox the labels follow the drawing
 * exactly. The stated cost is that they scale with the graphic instead of holding a fixed pixel size
 * -- the trade this format normally refuses, taken here because the alternative is labels that point
 * at nothing. It is also what makes the reorder drawable at all: the spoke NAMES are inside the
 * geometry, so an ordering is one more `<svg>` and never a second layout.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertReorderDeclaration,
  reorderChromeCss,
  reorderCss,
  reorderNotesForMarkup,
  reorderOptionsForMarkup,
  reorderPlatesForMarkup,
  reorderReadoutsForMarkup,
  type ReorderDeclaration,
} from "../../skills/chart-web/assets/reorder.ts";

export const FRAME = { width: 620, height: 440 };

/** This format's own scope selector, and the id prefix the reorder's radios take. The two arguments
 *  `reorder.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const REORDER_ID_PREFIX = "chart-reorder";

export type Axis = { key: string; name: string };
/** One country: its readings on every axis, and the sentence each of those readings answers with.
 *  Keyed by axis, never positional -- an ordering moves the positions and the readings must not
 *  follow them by accident. */
export type Shape = {
  code: string;
  name: string;
  tone: "a" | "b";
  values: Record<string, number>;
  details: Record<string, string>;
};
export type ReorderPlan = {
  label: string;
  noneLabel: string;
  options: { key: string; label: string; announce: string; note: string; readout: string; order: string[]; alt: string }[];
};

export function DirectedRadarWeb({
  axes,
  shapes,
  rings,
  ceiling,
  ceilingLabel,
  reorderPlan,
  plateReadout,
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
  axes: Axis[];
  shapes: Shape[];
  rings: number[];
  ceiling: number;
  ceilingLabel: string;
  reorderPlan: ReorderPlan;
  plateReadout: string;
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

  let second = mix(ground, ink, 0.5);
  if (contrast(second, ground) < NON_TEXT_CONTRAST_MIN)
    second = adjustToContrast(second, ground, NON_TEXT_CONTRAST_MIN) ?? second;
  const first = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const toneOf = (t: "a" | "b") => (t === "a" ? first : second);

  /**
   * WHAT A VERTEX BECOMES UNDER THE POINTER, TAKEN FROM ITS OWN FILL AND NEVER FROM THE TEXT INK.
   * Walked toward this direction's ink and required to clear two floors at once: far enough from the
   * dot's resting colour that a reader can see WHICH dot answered (the 1,12:1 step the mirrored beat
   * on this branch settled on), and still 3:1 against the ground so the lifted dot is a mark and not
   * a smudge. Thrown rather than shipped if no mix clears both, because a lift nobody can see is an
   * answer the page offers and does not deliver.
   */
  const liftOf = (tone: string) => {
    for (let t = 35; t <= 100; t += 5) {
      const lifted = mix(tone, ink, t / 100);
      if (contrast(lifted, tone) >= 1.12 && contrast(lifted, ground) >= NON_TEXT_CONTRAST_MIN)
        return lifted;
    }
    throw new Error(
      `${direction.id ?? "this direction"}: no mix of ${tone} toward ${ink} is both 1.12:1 away from ` +
        `the dot's own colour and ${NON_TEXT_CONTRAST_MIN}:1 against the ground ${ground} — a reader ` +
        "could not see which vertex answered",
    );
  };

  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;
  const R = Math.min(cx, cy) - 70;
  // THE SPOKES NEVER MOVE. `angle` is a function of the SLOT, not of the axis that happens to sit in
  // it -- which is the geometric fact the whole control rests on: the frame is fixed and evenly
  // spaced, and an ordering only changes which name is on which spoke.
  const angle = (slot: number) => (slot / axes.length) * Math.PI * 2 - Math.PI / 2;
  const at = (slot: number, v: number) => [
    cx + (v / ceiling) * R * Math.cos(angle(slot)),
    cy + (v / ceiling) * R * Math.sin(angle(slot)),
  ];

  // ── THE DECLARATION, REFUSED BEFORE ANYTHING IS DRAWN ────────────────────────────────────────
  // `assertReorderDeclaration` measures every ordering against the shapes it will really produce: an
  // ordering that is a rotation or a mirror of one already on the page draws the SAME polygon, and an
  // ordering that moves no series' area has rearranged the names and found nothing. Both are the
  // control the reader operates while the picture stands still.
  const declaration: ReorderDeclaration = {
    label: reorderPlan.label,
    noneLabel: reorderPlan.noneLabel,
    axes,
    options: reorderPlan.options.map((option) => ({
      key: option.key,
      label: option.label,
      announce: option.announce,
      note: option.note,
      readout: option.readout,
      order: option.order,
    })),
  };
  assertReorderDeclaration(
    declaration,
    shapes.map((s) => ({ key: s.name, values: s.values })),
  );

  const plates = reorderPlatesForMarkup(declaration);
  const options = reorderOptionsForMarkup(declaration, REORDER_ID_PREFIX);
  const notes = reorderNotesForMarkup(declaration);
  const readouts = reorderReadoutsForMarkup(declaration, plateReadout);
  const altOf = new Map<string, string>(reorderPlan.options.map((o) => [o.label, o.alt]));
  const labelOfSlug = new Map(options.map((o) => [o.slug, o.label]));

  const css = [
    // A SECOND LAYER OVER THE SAME GRID CELL, and the split is the point rather than a workaround.
    // `.overlay` is the PLATE's layer: `verify-web.mjs` reads every word in it and requires all of
    // them to be drawn unconditionally, which is exactly right for a plate's own annotation and
    // exactly wrong for a readout belonging to an ordering nobody has chosen yet.
    `${SCOPE} .chart-plot .option-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    reorderChromeCss({ scope: SCOPE }),
    reorderCss(declaration, { scope: SCOPE, idPrefix: REORDER_ID_PREFIX }),
  ].join("\n\n");

  /** One complete drawing of one ordering. Everything inside is at its own real coordinate; nothing
   *  is transformed and nothing is shared with another ordering but the numbers. */
  const plateSvg = (plate: { slug: string; isNone: boolean; axes: Axis[] }) => (
    <svg
      key={plate.slug}
      data-reorder-plate={plate.slug}
      role="group"
      aria-label={plate.isNone ? title : `${title} — ${labelOfSlug.get(plate.slug)}`}
      xmlns="http://www.w3.org/2000/svg"
      className="chart"
      data-hit="cell"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      // A radial geometry cannot be stretched: an ellipse would make the same share read as two
      // different distances depending on which axis it sits on.
      preserveAspectRatio="xMidYMid meet"
    >
      <desc>{plate.isNone ? alt : (altOf.get(labelOfSlug.get(plate.slug) ?? "") ?? alt)}</desc>
      <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

      {/* THE GRID IS CIRCLES. A polygonal grid joining the axes makes a value near an axis look
          larger than the same value between two. It is also the one part of this drawing an ordering
          cannot touch, which is why the rings are where the reader's anchor has to be. */}
      {rings.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={(r / ceiling) * R} fill="none" stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {plate.axes.map((a, i) => {
        const [ex, ey] = at(i, ceiling);
        return <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
      })}

      {shapes.map((s) => (
        <polygon
          key={s.code}
          points={plate.axes.map((a, i) => at(i, s.values[a.key]).join(",")).join(" ")}
          fill={toneOf(s.tone)}
          fillOpacity={0.16}
          stroke={toneOf(s.tone)}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* THE VERTEX ANSWERS, AND IT LIFTS FROM ITS OWN COUNTRY'S INK. Two circles and not one, which
          is the format's own `data-mark` / `data-mark-ref` mechanism rather than a local invention.
          A bare `.pt` takes `fill: var(--muted)` under the pointer — the shared stylesheet's default,
          and correct on a beat whose points are one series. Here it was a confident miscue: `--muted`
          is the furniture's neutral, the one this page draws GERMANY in, so hovering a French vertex
          repainted it in the other country's colour. Measured in creme, `--muted` is #61605a and
          Germany's own tone #807e77 — 1,32:1 apart, which is to say indistinguishable. So the
          visible dot carries `data-mark` and its own lifted colour, and a transparent twin on top
          carries the hit test, the tab stop and the reading. */}
      {shapes.flatMap((s) =>
        plate.axes.map((a, i) => {
          const [px, py] = at(i, s.values[a.key]);
          const mark = `${s.code}-${a.key}`;
          return (
            <g key={mark}>
              <circle
                data-mark={mark}
                style={{ "--mark-active": liftOf(toneOf(s.tone)) } as React.CSSProperties}
                cx={px}
                cy={py}
                r={4.5}
                fill={toneOf(s.tone)}
                stroke={ground}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                className="pt"
                data-mark-ref={mark}
                cx={px}
                cy={py}
                r={8}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={s.details[a.key]}
                data-detail={s.details[a.key]}
              />
            </g>
          );
        }),
      )}
      <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />

      {/* THE ONLY WORDS THIS BASE SETS INSIDE AN SVG -- see the component header for why, and for
          why that decision is what makes an ordering drawable as one more `<svg>`. */}
      {plate.axes.map((a, i) => {
        const [lx, ly] = at(i, ceiling * 1.14);
        const anchor = lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle";
        return (
          <text
            pointerEvents="none"
            key={`n-${a.key}`}
            x={lx}
            y={ly}
            fill={label}
            fontFamily={String(regs.axis.fontFamily)}
            fontSize={14}
            fontWeight={regs.axis.fontWeight as number}
            fontStyle={regs.axis.fontStyle as string}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {a.name}
          </text>
        );
      })}
      {/* The ceiling sits just INSIDE its own ring, not above it: above it is where the first axis
          name already is, and the two printed one on top of the other. */}
      <text
        pointerEvents="none"
        x={cx + 8}
        y={cy - R + 12}
        fill={label}
        fontFamily={String(regs.value.fontFamily)}
        fontSize={13}
        fontWeight={700}
        textAnchor="start"
      >
        {ceilingLabel}
      </text>
    </svg>
  );

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
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not --
          nothing leaves this picture. A reorder pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {shapes.map((s) => (
          <span key={s.code} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: toneOf(s.tone), display: "inline-block", borderRadius: 2 }} />
            {s.name}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one --
          `assertReorderDeclaration` refuses the declaration otherwise, because a name that does not
          is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-reorder">
        <legend>{reorderPlan.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-reorder"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER -- what this ordering produced, in words, for a
          reader who is not looking at the plot. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the plot underneath it. The untouched option reveals
          none: it is not a counterfactual, it is the claim the title states. */}
      <div className="reorder-notes" role="status">
        {notes.map((note) => (
          <p data-reorder-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
        }}
      >
        <div className="y-axis" />

        {plates.map(plateSvg)}

        <div className="overlay" aria-hidden="true" />

        {/* THE ORDERING'S OWN PRODUCT, PRINTED WHERE THE READER'S EYE IS. A reader comparing two
            polygons is asking which is bigger; the sentence under the control answers that for a
            reader who is not looking, and this answers it for the one who is. The plate's own
            readout is here too and is shown by default -- the numbers the options reveal have
            nothing to be read against otherwise. It sits in the plot's top-left, which the
            letterboxed circle never reaches at any width. */}
        <div className="option-layer" aria-hidden="true">
          {readouts.map((readout) => (
            <span
              key={readout.slug}
              data-reorder-readout={readout.slug}
              className="note"
              style={{
                ...regs.annot,
                color: label,
                left: 0,
                top: 0,
                // WIDE ENOUGH FOR ONE LINE ON A LAPTOP, and measured rather than guessed: two of
                // the three filed directions set the annotation register in tracked UPPERCASE, where
                // this sentence ran to three wrapped lines at 26em and read as a block of shouting.
                // 44em still broke it after "1,92" in nocturne; 58em holds it. The percentage is
                // what keeps it inside the plot on a phone, where it wraps and should.
                maxWidth: "min(96%, 58em)",
                whiteSpace: "normal",
              }}
            >
              {readout.text}
            </span>
          ))}
        </div>

        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
