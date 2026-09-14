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
 * THE CONTROL SAYS WHAT IT WILL DO BEFORE IT IS PRESSED, and that sentence is not decoration either.
 * The owner read this page and asked *"pourquoi les labels changent d'ordre au filtre ?"* -- the
 * gesture working exactly as designed, and nothing on the page warning him it was about to. A legend
 * names what the reader is CHOOSING; every other sentence this control owns is a counterfactual that
 * does not exist until an option has been taken. So the reserved row under the pills is no longer
 * empty at rest: it carries the warning, one line, between the control and the circle it changes.
 *
 * THE DRAWING TRAVELS AND THE THINGS THAT ANSWER DO NOT -- the structural decision this component
 * makes on the control's behalf, and it is the second one it has made. The owner's other reading was
 * that the graph "pourrait changer en lerp smooth au lieu de saccader en changement direct". It could
 * not, because every ordering was a whole `<svg>` revealed with `display`, and `display` cannot be
 * transitioned. What CAN be transitioned is a property changing on an element that is ALWAYS
 * rendered, which is the only one of the three triggers CSS has that survived being driven (the other
 * two, and what each measured, are in `reorder.ts`'s own "THE TRAVEL"). So there is now ONE drawing:
 * the rings, the spokes, both areas, sixteen dots and eight names, `aria-hidden` and
 * `pointer-events: none`, whose dots and names move on `transform` and whose areas morph on `d`, both
 * on one clock.
 *
 * And the defect that forced four whole `<svg>`s in the first place has NOT gone away, so it is
 * answered rather than forgotten: `interaction.mjs` resolves the mark under a pointer from `cx`/`cy`
 * read once at init, which no CSS transform ever changes, and a `.pt` hidden by `opacity` stays in
 * that hit test and answers for a vertex the reader cannot see. A mark that moves must not be the
 * mark that answers. So every ordering still gets an `<svg>` of its own -- transparent now, holding
 * only the sixteen points that answer and the overlay that resolves them, baked at that ordering's
 * own coordinates, swapped with `display`, out of the hit test and out of the tab order when
 * unchosen. The drawing moves; the answers jump.
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
 * at nothing. It is also what lets a spoke's NAME travel with its own vertex: the names are inside
 * the geometry, so they move under the rule that moves the dots and never under a second layout.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  REORDER_NONE_SLUG,
  assertReorderDeclaration,
  assertReorderMotion,
  reorderChromeCss,
  reorderCss,
  reorderMarkLiftCss,
  reorderMotionCss,
  reorderNotesForMarkup,
  reorderOptionsForMarkup,
  reorderPlatesForMarkup,
  reorderAreaPaths,
  reorderReadoutsForMarkup,
  type ReorderDeclaration,
  type ReorderMotion,
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
  /** What pressing a pill will DO, said in the state the page ships in. */
  noneNote: string;
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
  /** Where a spoke's NAME sits: just outside the ceiling ring, hung off its spoke on the side the
   *  spoke points to, so a name on the left of the circle does not run back across the drawing. */
  const NAME_RADIUS = ceiling * 1.14;
  const anchorAt = (x: number) => (x > cx + 4 ? "start" : x < cx - 4 ? "end" : "middle");

  // ── THE DECLARATION, REFUSED BEFORE ANYTHING IS DRAWN ────────────────────────────────────────
  // `assertReorderDeclaration` measures every ordering against the shapes it will really produce: an
  // ordering that is a rotation or a mirror of one already on the page draws the SAME polygon, and an
  // ordering that moves no series' area has rearranged the names and found nothing. Both are the
  // control the reader operates while the picture stands still.
  const declaration: ReorderDeclaration = {
    label: reorderPlan.label,
    noneLabel: reorderPlan.noneLabel,
    noneNote: reorderPlan.noneNote,
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

  // ── WHERE EVERYTHING TRAVELS ─────────────────────────────────────────────────────────────────
  // The one drawing is BAKED in the plate's own ordering, so every other ordering is an OFFSET from
  // it and the plate's own offsets are exactly zero. `reorder.ts` refuses the motion if they are not,
  // and refuses an ordering missing from this table at all -- a missing entry is not a state that
  // fails to move, it is a state that silently draws the plate while its words say otherwise.
  // A DOT IS NAMED BY ITS SPOKE AND NOT BY ITS SOURCE, and that is not a detail — it is what keeps
  // the drawing coherent while it moves. The two things that travel here travel along DIFFERENT
  // paths: a `<path>`'s `d` interpolates its point i to the other path's point i, and point i is
  // SLOT i, so every corner slides along its own spoke as the reading landing on that spoke changes.
  // A dot named by its SOURCE would fly across the circle to its new spoke instead, and the first
  // version of this component did exactly that: measured mid-flight, the dots stood up to 5,5 user
  // units clear of the outline they belong to, and the frame read as a broken drawing. So a dot is
  // the vertex AT A SPOKE. It interpolates between the same two points its corner does, along the
  // same line, on the same clock, and the two are never more than rounding apart.
  const markOf = (code: string, slot: number) => `${code}-slot${slot}`;
  const nameMoveOf = (key: string) => `axis-${key}`;
  const slotIn = (order: Axis[], key: string) => order.findIndex((a) => a.key === key);
  const home: Record<string, [number, number]> = {};
  for (const shape of shapes)
    axes.forEach((axis, slot) => {
      home[markOf(shape.code, slot)] = at(slot, shape.values[axis.key]) as [number, number];
    });
  for (const axis of axes)
    home[nameMoveOf(axis.key)] = at(slotIn(axes, axis.key), NAME_RADIUS) as [number, number];

  const motion: ReorderMotion = {
    home,
    moves: {},
    // Each country's outline is walked spoke by spoke through its OWN vertices. `reorder.ts` builds
    // the two paths out of these, in every state, so a corner and the dot on it are one arithmetic
    // done once rather than twice.
    corners: Object.fromEntries(
      shapes.map((shape) => [shape.code, axes.map((_, slot) => markOf(shape.code, slot))]),
    ),
    anchors: {},
  };
  for (const plate of plates) {
    const moves: Record<string, [number, number]> = {};
    const anchors: Record<string, string> = {};
    for (const shape of shapes)
      plate.axes.forEach((axis, slot) => {
        const id = markOf(shape.code, slot);
        const [x, y] = at(slot, shape.values[axis.key]);
        const [hx, hy] = home[id];
        moves[id] = [x - hx, y - hy];
      });
    for (const axis of axes) {
      const id = nameMoveOf(axis.key);
      const [x, y] = at(slotIn(plate.axes, axis.key), NAME_RADIUS);
      const [hx, hy] = home[id];
      moves[id] = [x - hx, y - hy];
      anchors[id] = anchorAt(x);
    }
    motion.moves[plate.slug] = moves;
    motion.anchors![plate.slug] = anchors;
  }
  assertReorderMotion(declaration, motion);
  const areaPaths = reorderAreaPaths(motion);

  /** Every vertex the drawing shows and a hit plate speaks for -- the keys the lift's generated
   *  `:has()` rules are written against, since the class can no longer cross between the two. Named
   *  by spoke, so the rules need no state: the point that is pointed at lives in the CHOSEN plate,
   *  and in that plate its spoke is the one the reader has their pointer on. */
  const marks = shapes.flatMap((shape) => axes.map((_, slot) => markOf(shape.code, slot)));

  const css = [
    // A SECOND LAYER OVER THE SAME GRID CELL, and the split is the point rather than a workaround.
    // `.overlay` is the PLATE's layer: `verify-web.mjs` reads every word in it and requires all of
    // them to be drawn unconditionally, which is exactly right for a plate's own annotation and
    // exactly wrong for a readout belonging to an ordering nobody has chosen yet.
    `${SCOPE} .chart-plot .option-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    reorderChromeCss({ scope: SCOPE }),
    reorderCss(declaration, { scope: SCOPE, idPrefix: REORDER_ID_PREFIX }),
    reorderMotionCss(declaration, { scope: SCOPE, idPrefix: REORDER_ID_PREFIX }, motion),
    reorderMarkLiftCss({ scope: SCOPE, marks }),
  ].join("\n\n");

  /**
   * THE DRAWING, AND THERE IS ONLY ONE. Everything a reader looks at is here, baked at the plate's
   * own coordinates; the stylesheet moves the dots and the names and morphs the two areas. It is
   * `aria-hidden` and takes no pointer event: it is a picture of the data and not a way to ask it
   * anything, which is what lets it move at all.
   */
  const motionSvg = (
    <svg
      data-reorder-motion=""
      role="presentation"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      className="chart"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      // A radial geometry cannot be stretched: an ellipse would make the same share read as two
      // different distances depending on which axis it sits on.
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

      {/* THE GRID IS CIRCLES. A polygonal grid joining the axes makes a value near an axis look
          larger than the same value between two. It is also the one part of this drawing an ordering
          cannot touch, which is why the rings are where the reader's anchor has to be. */}
      {rings.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={(r / ceiling) * R} fill="none" stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {/* The spokes are a function of the SLOT and of nothing else, so they are the same eight lines
          in every ordering and they are the one thing here that never travels. */}
      {axes.map((a, i) => {
        const [ex, ey] = at(i, ceiling);
        return <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
      })}

      {/* THE AREA THAT TRAVELS -- one path per country, whose `d` the stylesheet sets per ordering
          and transitions. Its `d` attribute is the plate's own, which is what an engine that ignores
          the CSS property would draw; `reorderMotionCss`'s `@supports` pair hides one of the two. */}
      {shapes.map((s) => (
        <path
          key={`area-${s.code}`}
          data-reorder-area={s.code}
          d={areaPaths[REORDER_NONE_SLUG][s.code]}
          fill={toneOf(s.tone)}
          fillOpacity={0.16}
          stroke={toneOf(s.tone)}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* THE AREA THAT DOES NOT -- one baked path per ordering per country, swapped with `display`.
          Dead weight in every engine with a CSS `d` property, and the difference between a correct
          picture and a wrong one in any that has none. */}
      {plates.flatMap((plate) =>
        shapes.map((s) => (
          <path
            key={`still-${plate.slug}-${s.code}`}
            data-reorder-still={plate.slug}
            d={areaPaths[plate.slug][s.code]}
            fill={toneOf(s.tone)}
            fillOpacity={0.16}
            stroke={toneOf(s.tone)}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}

      {/* THE VISIBLE VERTEX, AND IT IS NOT THE ONE THAT ANSWERS. It carries `data-mark` and the
          colour it takes when the point that speaks for it is pointed at -- `--mark-active`, measured
          on the dot's own fill and never on the text ink. A bare `.pt` takes `fill: var(--muted)`
          under the pointer, the shared stylesheet's default, and `--muted` is the furniture's
          neutral -- the one this page draws GERMANY in, so hovering a French vertex repainted it in
          the other country's colour (measured in creme: #61605a against #807e77, 1,32:1 apart, which
          is to say indistinguishable). The class that used to carry the lift came from
          `interaction.mjs` and cannot cross into another `<svg>`, so it is a generated `:has()` rule
          now -- `reorderMarkLiftCss` -- which also makes the lift work with the script absent. */}
      {shapes.flatMap((s) =>
        axes.map((a, slot) => {
          const id = markOf(s.code, slot);
          const [hx, hy] = home[id];
          return (
            <circle
              key={id}
              data-mark={id}
              data-reorder-move={id}
              style={{ "--mark-active": liftOf(toneOf(s.tone)) } as React.CSSProperties}
              cx={hx}
              cy={hy}
              r={4.5}
              fill={toneOf(s.tone)}
              stroke={ground}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        }),
      )}

      {/* THE ONLY WORDS THIS BASE SETS INSIDE AN SVG -- see the component header for why. Each name
          travels with its own vertex, on the same clock, and takes the anchor its destination spoke
          needs: a name crossing to the other side of the circle has to hang off its spoke the other
          way or it runs back across the drawing. */}
      {axes.map((a) => {
        const id = nameMoveOf(a.key);
        const [lx, ly] = home[id];
        return (
          <text
            pointerEvents="none"
            key={`n-${a.key}`}
            data-reorder-move={id}
            x={lx}
            y={ly}
            fill={label}
            fontFamily={String(regs.axis.fontFamily)}
            fontSize={14}
            fontWeight={regs.axis.fontWeight as number}
            fontStyle={regs.axis.fontStyle as string}
            textAnchor={anchorAt(lx)}
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

  /**
   * ONE ORDERING'S ANSWERS. Transparent, so it draws nothing over the picture underneath; complete,
   * so `initChart` wires it on its own and the unchosen ones -- `display: none` -- hold no pointer
   * event, no tab stop and no probe. Every point sits at ITS OWN ordering's real coordinate and never
   * moves, which is exactly what the travelling drawing could not promise.
   */
  const hitPlate = (plate: { slug: string; isNone: boolean; axes: Axis[] }) => (
    <svg
      key={plate.slug}
      data-reorder-plate={plate.slug}
      role="group"
      aria-label={plate.isNone ? title : `${title} — ${labelOfSlug.get(plate.slug)}`}
      xmlns="http://www.w3.org/2000/svg"
      className="chart"
      data-hit="cell"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <desc>{plate.isNone ? alt : (altOf.get(labelOfSlug.get(plate.slug) ?? "") ?? alt)}</desc>
      {shapes.flatMap((s) =>
        plate.axes.map((a, i) => {
          const [px, py] = at(i, s.values[a.key]);
          const mark = markOf(s.code, i);
          return (
            <circle
              key={mark}
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
          );
        }),
      )}
      <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
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

      {/* THE SENTENCE THE CONTROL OWES THE READER, AND THE ROW IS NO LONGER EMPTY AT REST. At rest it
          says what pressing a pill will DO, which is the one thing the legend, the pills and the
          counterfactuals between them never said until it had already happened -- the owner read this
          page and had to ask. Choosing an option replaces it with what THAT ordering produced. Every
          sentence is stacked in one grid cell, so the row is always as tall as the longest of them
          and the plot underneath never moves. */}
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

        {/* The drawing FIRST and the answers on top of it: paint order is hit order in SVG, and the
            chosen plate's own `.hit-area` has to be the thing a pointer lands on. */}
        {motionSvg}
        {plates.map(hitPlate)}

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
