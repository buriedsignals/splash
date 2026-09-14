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
 * reader's eye actually judges at a glance) is sensitive to axis order AND COUNT in a way the
 * underlying numbers aren't ... this is the type's structural weak point, not a bug to be fixed in
 * code" -- and that the type ships with no mechanical guard at all behind that problem. A still can
 * answer that exactly one way: pick a set of axes, state it on the plate, ask to be trusted. That is
 * what the static sibling does and it is the honest maximum of a still.
 *
 * THE GESTURE IS THE COUNT, AND IT IS THE OWNER'S SECOND VERDICT MADE STRUCTURAL. This page used to
 * demonstrate the same finding through the ORDER half: the reader handed the eight axes round the
 * circle and watched both areas move. He read the result twice and wrote the same sentence twice, the
 * second time with a warning already on the page: *"Les labels nucleaire, eolien, etc bougent avec les
 * filtres alors qu'il n'y a pas lieu d'etre."* A row of pills over a chart reads as a FILTER whatever
 * its legend says, and under a filter a label that moves is a bug, not a finding. So the ordering
 * gesture is gone from this beat and NOT ONE INTITULE MOVES IN ANY STATE: the eight spokes keep their
 * angle and their name for good.
 *
 * What the reader chooses instead is WHICH SOURCES ARE COUNTED IN THE SHAPE -- which is the half of
 * the catalogue's warning a newsroom actually decides. Nobody shuffles axes at random; everybody
 * chooses which sources go into a comparison. A source set aside stays drawn, stays named and keeps
 * both of its vertices exactly where they were -- it did not stop being true -- and the two outlines
 * simply stop passing through it and close over the rest. On the plate's own eight, Germany's polygon
 * covers 1,45 times France's. Count only the low-carbon sources and France covers MORE, at 0,83; count
 * only the dispatchable ones and it covers 1,56 times Germany's. Sixteen numbers, none of them
 * touched. The vocabulary is `skills/chart-web/assets/count.ts`; the arithmetic that refuses a subset
 * drawing a shape already on the page is there and not here.
 *
 * THE CONTROL SAYS WHAT IT WILL DO BEFORE IT IS PRESSED, and that sentence is the one thing kept from
 * the version this replaces. A legend names what the reader is CHOOSING; every other sentence this
 * control owns is a counterfactual that does not exist until an option has been taken. So the reserved
 * row under the pills is not empty at rest: it carries the warning, one line, between the control and
 * the circle it changes.
 *
 * THE OUTLINE TRAVELS AND NOTHING ELSE MOVES AT ALL. `count.ts` builds each state's outline with ONE
 * POINT PER SPOKE -- a counted spoke contributes its own vertex, a set-aside one contributes the point
 * where the closing chord crosses it -- so every state's path has the same segments in the same order
 * and a CSS `d` interpolates it. The reader sees the edge peel off the vertex it stops counting while
 * the vertex stands still. `display` cannot be transitioned, which is why the outline is a property on
 * an element that is always rendered and not a swap between four drawings.
 *
 * AND THE DEFECT THAT FORCED FOUR WHOLE `<svg>`s ON THE PREVIOUS GESTURE IS SIMPLY GONE, which is
 * worth saying rather than quietly enjoying: `interaction.mjs` resolves the mark under a pointer from
 * `cx`/`cy` read once at init, and no CSS transform ever changes those. The previous gesture moved its
 * vertices, so its answers had to be baked per state. This one moves NO vertex -- every dot is at the
 * same coordinate in every state. What still differs per state is what a vertex SAYS: a set-aside
 * vertex must not answer as though it counted. So there is still one transparent hit layer per state,
 * holding the sixteen points that answer, swapped with `display` and therefore out of the hit test and
 * out of the tab order when unchosen -- but every point in every layer sits at the same place, and the
 * only thing that changes is the sentence it carries.
 *
 * AN AXIS IS DRAWN TWICE AND ONE OF THE TWO IS SHOWN. Being set aside changes a spoke's line, its
 * name's ink and the fill of its two vertices at once, in three properties on three kinds of element.
 * `count.ts` refuses to name a colour or a dash, so it swaps between two registers with `display` and
 * THIS file says -- and measures -- what each register is: the spoke goes dashed, the name goes to a
 * fade that is still over the text floor against this direction's real ground, and each vertex becomes
 * an open ring in its own country's colour. The ring is the load-bearing one: a set-aside vertex must
 * read as PRESENT AND UNCOUNTED, never as removed, because the whole argument is that the number is
 * still true.
 *
 * AND THE SECOND CHANNEL IS UNCHANGED, on purpose: every vertex still answers with the country, the
 * source, its exact share, the TWh behind it and what the OTHER country has on the same axis. Those
 * sixteen readings are identical in every state -- they are the part of this page the count cannot
 * touch, which is the editorial point restated on a channel the reader can check. What a set-aside
 * vertex adds is one clause saying it is out of the count.
 *
 * THE ONE PLACE THIS BASE SETS TYPE INSIDE AN SVG, and the reason is the radial geometry. The fluid
 * frame keeps every word in HTML because `preserveAspectRatio="none"` would stretch a `<text>` out of
 * shape. This beat does not stretch -- a radial geometry cannot: an ellipse would make the same share
 * read as two different distances depending on which axis it sat on. So it letterboxes, and that broke
 * the overlay: the `<svg>` shrinks inside its grid cell and centres, while an HTML label positioned in
 * percentages of that CELL does not. Inside the viewBox the labels follow the drawing exactly. The
 * stated cost is that they scale with the graphic instead of holding a fixed pixel size -- the trade
 * this format normally refuses, taken here because the alternative is labels that point at nothing.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  COUNT_NONE_SLUG,
  assertCountDeclaration,
  countChromeCss,
  countCss,
  countMarkLiftCss,
  countNotesForMarkup,
  countOptionsForMarkup,
  countOutlineCss,
  countOutlines,
  countReadoutsForMarkup,
  countSlugOf,
  countStatesForMarkup,
  type CountDeclaration,
  type CountGeometry,
} from "../../skills/chart-web/assets/count.ts";

export const FRAME = { width: 620, height: 440 };

/** This format's own scope selector, and the id prefix the count's radios take. The two arguments
 *  `count.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const COUNT_ID_PREFIX = "chart-count";

export type Axis = { key: string; name: string };
/** One country: its readings on every axis, and the sentence each of those readings answers with --
 *  once for the states that count it, once for the states that do not. Keyed by axis, never
 *  positional. */
export type Shape = {
  code: string;
  name: string;
  tone: "a" | "b";
  values: Record<string, number>;
  details: Record<string, string>;
  asideDetails: Record<string, string>;
};
export type CountPlan = {
  label: string;
  noneLabel: string;
  /** What pressing a pill will DO, said in the state the page ships in. */
  noneNote: string;
  options: {
    key: string;
    label: string;
    announce: string;
    note: string;
    readout: string;
    counts: string[];
    alt: string;
  }[];
};

export function DirectedRadarWeb({
  axes,
  shapes,
  rings,
  ceiling,
  ceilingLabel,
  countPlan,
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
  countPlan: CountPlan;
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

  /**
   * THE SET-ASIDE REGISTER FOR A WORD, MEASURED TWICE AGAINST THE GROUND THIS DIRECTION REALLY PAINTS.
   *
   * A spoke out of the count must READ as out of the count and must still be READABLE: it names the
   * source whose number the page is insisting is still true. So the name is walked toward the ground
   * and stopped at the LAST step that still clears the text floor — the furthest a fade can honestly
   * go — and then the step it actually achieved against the counted ink is measured and refused if it
   * is under 1,4:1. Two independent clamps onto one floor come out identical by construction (1,023:1
   * was measured that way on this branch); this is one clamp and one measured gap, which cannot.
   */
  const fadeOf = (colour: string) => {
    let faded: string | null = null;
    for (let t = 5; t <= 90; t += 5) {
      const step = mix(colour, ground, t / 100);
      if (contrast(step, ground) < TEXT_CONTRAST_MIN) break;
      faded = step;
    }
    if (!faded || contrast(faded, colour) < 1.4)
      throw new Error(
        `${direction.id ?? "this direction"}: no fade of ${colour} toward the ground ${ground} is ` +
          `both over ${TEXT_CONTRAST_MIN}:1 against that ground and 1.4:1 away from the counted ink ` +
          `(best ${faded ?? "none"}) — a spoke set aside would either be unreadable or look counted`,
      );
    return faded;
  };
  const labelAside = fadeOf(label);

  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;
  const R = Math.min(cx, cy) - 70;
  // THE SPOKES NEVER MOVE AND NEITHER DO THE VERTICES. `angle` is a function of the axis's place in
  // the declared frame and of nothing else, in every state this page can reach — which is the whole
  // point of the gesture and the owner's verdict made geometric.
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
  // `assertCountDeclaration` measures every subset against the outlines it will really produce: a
  // subset that counts what the plate counts, or what another option counts, draws the same shape; a
  // subset under three spokes encloses nothing; a subset that moves neither area has set a source
  // aside and found nothing. All three are the control the reader operates while the picture stands
  // still.
  const declaration: CountDeclaration = {
    label: countPlan.label,
    noneLabel: countPlan.noneLabel,
    noneNote: countPlan.noneNote,
    axes,
    options: countPlan.options.map((option) => ({
      key: option.key,
      label: option.label,
      announce: option.announce,
      note: option.note,
      readout: option.readout,
      counts: option.counts,
    })),
  };
  const geometry: CountGeometry = {
    shapes: shapes.map((shape) => ({
      key: shape.code,
      vertices: Object.fromEntries(
        axes.map((axis, slot) => [axis.key, at(slot, shape.values[axis.key]) as [number, number]]),
      ),
    })),
  };
  assertCountDeclaration(declaration, geometry);

  const states = countStatesForMarkup(declaration);
  const options = countOptionsForMarkup(declaration, COUNT_ID_PREFIX);
  const notes = countNotesForMarkup(declaration);
  const readouts = countReadoutsForMarkup(declaration, plateReadout);
  const outlines = countOutlines(declaration, geometry);
  const altOf = new Map<string, string>(
    countPlan.options.map((o) => [countSlugOf(o.key), o.alt]),
  );
  const labelOfSlug = new Map(states.map((s) => [s.slug, s.label]));
  const vertexOf = (code: string, key: string) =>
    geometry.shapes.find((s) => s.key === code)!.vertices[key];

  /** Every vertex the drawing shows and a hit layer speaks for — the keys the lift's generated
   *  `:has()` rules are written against, since the class can no longer cross between the two. Named
   *  by COUNTRY AND AXIS, which is possible here and was not before: a vertex is at one coordinate in
   *  every state, so one key names one point on the page for good. */
  const markOf = (code: string, key: string) => `${code}-${countSlugOf(key)}`;
  const marks = shapes.flatMap((shape) => axes.map((axis) => markOf(shape.code, axis.key)));

  const css = [
    // A SECOND LAYER OVER THE SAME GRID CELL, and the split is the point rather than a workaround.
    // `.overlay` is the PLATE's layer: `verify-web.mjs` reads every word in it and requires all of
    // them to be drawn unconditionally, which is exactly right for a plate's own annotation and
    // exactly wrong for a readout belonging to a count nobody has chosen yet.
    `${SCOPE} .chart-plot .option-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    countChromeCss({ scope: SCOPE }),
    countCss(declaration, { scope: SCOPE, idPrefix: COUNT_ID_PREFIX }),
    countOutlineCss(declaration, { scope: SCOPE, idPrefix: COUNT_ID_PREFIX }, geometry),
    countMarkLiftCss({ scope: SCOPE, marks }),
  ].join("\n\n");

  /**
   * THE DRAWING, AND THERE IS ONLY ONE. Everything a reader looks at is here, at coordinates that do
   * not depend on the state; the stylesheet swaps each axis's two registers and morphs the two
   * outlines. It is `aria-hidden` and takes no pointer event: it is a picture of the data and not a
   * way to ask it anything, which is what lets its outline move at all.
   */
  const drawing = (
    <svg
      role="presentation"
      aria-hidden="true"
      focusable="false"
      pointerEvents="none"
      xmlns="http://www.w3.org/2000/svg"
      className="chart"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      // A radial geometry cannot be stretched: an ellipse would make the same share read as two
      // different distances depending on which axis it sits on.
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

      {/* THE GRID IS CIRCLES. A polygonal grid joining the axes makes a value near an axis look
          larger than the same value between two. It is also the one part of this drawing the count
          cannot touch, which is why the rings are where the reader's anchor has to be. */}
      {rings.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={(r / ceiling) * R} fill="none" stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}

      {/* EVERY SPOKE TWICE: solid while it is counted, dashed while it is set aside. The line itself
          never moves and its name never moves — what changes is the register it is drawn in, and the
          dash costs no contrast at all, which matters because this furniture is already at the
          grid's own weight and had nowhere to fade to. */}
      {axes.flatMap((a, i) => {
        const [ex, ey] = at(i, ceiling);
        const slug = countSlugOf(a.key);
        return [
          <line key={`spoke-in-${a.key}`} data-count-in={slug} x1={cx} y1={cy} x2={ex} y2={ey} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />,
          <line key={`spoke-out-${a.key}`} data-count-out={slug} x1={cx} y1={cy} x2={ex} y2={ey} stroke={grid} strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />,
        ];
      })}

      {/* THE OUTLINE THAT TRAVELS — one path per country, whose `d` the stylesheet sets per state and
          transitions. Its `d` attribute is the full count's, which is what an engine that ignores the
          CSS property would draw; `countOutlineCss`'s `@supports` pair hides one of the two. */}
      {shapes.map((s) => (
        <path
          key={`area-${s.code}`}
          data-count-area={s.code}
          d={outlines[COUNT_NONE_SLUG][s.code]}
          fill={toneOf(s.tone)}
          fillOpacity={0.16}
          stroke={toneOf(s.tone)}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* THE OUTLINE THAT DOES NOT — one baked path per state per country, swapped with `display`.
          Dead weight in every engine with a CSS `d` property, and the difference between a correct
          picture and a wrong one in any that has none. */}
      {states.flatMap((state) =>
        shapes.map((s) => (
          <path
            key={`still-${state.slug}-${s.code}`}
            data-count-still={state.slug}
            d={outlines[state.slug][s.code]}
            fill={toneOf(s.tone)}
            fillOpacity={0.16}
            stroke={toneOf(s.tone)}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}

      {/* THE VERTEX, DRAWN TWICE AT ONE COORDINATE, AND NEITHER OF THE TWO IS WHAT ANSWERS. Counted
          it is a filled disc with a ground halo; set aside it is an OPEN RING in the same country's
          colour, at the same place, on the same reading. The ring is the load-bearing decision on
          this page: a source out of the count has not stopped being true, so its vertex must read as
          present and uncounted rather than as removed, and the outline visibly leaves it behind
          instead of taking it with it.

          The lift is a generated `:has()` rule — `countMarkLiftCss` — on the fill of one and the
          stroke of the other, because filling the ring would make it look counted. The class that
          used to carry it came from `interaction.mjs` and cannot cross into another `<svg>`; as a
          rule it also works with the script absent. `--mark-active` is measured on the dot's own
          fill and never on the text ink: a bare `.pt` takes `fill: var(--muted)` under the pointer,
          the shared stylesheet's default, and `--muted` is the neutral this page draws GERMANY in. */}
      {shapes.flatMap((s) =>
        axes.map((a) => {
          const mark = markOf(s.code, a.key);
          const slug = countSlugOf(a.key);
          const [vx, vy] = vertexOf(s.code, a.key);
          const lift = { "--mark-active": liftOf(toneOf(s.tone)) } as React.CSSProperties;
          return (
            <g key={mark}>
              <circle
                data-count-in={slug}
                data-mark={mark}
                style={lift}
                cx={vx}
                cy={vy}
                r={4.5}
                fill={toneOf(s.tone)}
                stroke={ground}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                data-count-out={slug}
                data-mark-edge={mark}
                style={lift}
                cx={vx}
                cy={vy}
                r={4.5}
                fill={ground}
                stroke={toneOf(s.tone)}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        }),
      )}

      {/* THE ONLY WORDS THIS BASE SETS INSIDE AN SVG -- see the component header for why. Each name is
          drawn twice at ONE place: in the counted ink, and in the measured fade a set-aside spoke
          takes. The coordinates and the anchor are computed once and shared by both, so there is no
          arithmetic in which the two could land differently -- which is the whole promise this beat
          now makes to the reader who rejected the last one. */}
      {axes.flatMap((a, i) => {
        const [lx, ly] = at(i, NAME_RADIUS);
        const slug = countSlugOf(a.key);
        const common = {
          pointerEvents: "none" as const,
          x: lx,
          y: ly,
          fontFamily: String(regs.axis.fontFamily),
          fontSize: 14,
          fontWeight: regs.axis.fontWeight as number,
          fontStyle: regs.axis.fontStyle as string,
          textAnchor: anchorAt(lx),
          dominantBaseline: "middle" as const,
        };
        return [
          <text key={`name-in-${a.key}`} data-count-in={slug} fill={label} {...common}>
            {a.name}
          </text>,
          <text key={`name-out-${a.key}`} data-count-out={slug} fill={labelAside} {...common}>
            {a.name}
          </text>,
        ];
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
   * ONE STATE'S ANSWERS. Transparent, so it draws nothing over the picture underneath; complete, so
   * `initChart` wires it on its own and the unchosen ones -- `display: none` -- hold no pointer event,
   * no tab stop and no probe. Every point sits at the vertex's one and only coordinate; what differs
   * between layers is the SENTENCE, because a vertex out of the count must not answer as though it
   * counted.
   */
  const hitLayer = (state: { slug: string; isNone: boolean; counted: string[] }) => {
    const counted = new Set(state.counted);
    return (
      <svg
        key={state.slug}
        data-count-plate={state.slug}
        role="group"
        aria-label={state.isNone ? title : `${title} — ${labelOfSlug.get(state.slug)}`}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <desc>{state.isNone ? alt : (altOf.get(state.slug) ?? alt)}</desc>
        {shapes.flatMap((s) =>
          axes.map((a) => {
            const mark = markOf(s.code, a.key);
            const [vx, vy] = vertexOf(s.code, a.key);
            const says = counted.has(a.key) ? s.details[a.key] : s.asideDetails[a.key];
            return (
              <circle
                key={mark}
                className="pt"
                data-mark-ref={mark}
                cx={vx}
                cy={vy}
                r={8}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={says}
                data-detail={says}
              />
            );
          }),
        )}
        <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
      </svg>
    );
  };

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
          nothing leaves this picture, which is the distinction the whole gesture rests on. A count
          pays its own way. */}
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
          `assertCountDeclaration` refuses the declaration otherwise, because a name that does not is
          the WCAG 2.5.3 failure. */}
      <fieldset className="chart-count">
        <legend>{countPlan.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-count"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER, AND THE ROW IS NOT EMPTY AT REST. At rest it says
          what pressing a pill will DO, which is the one thing the legend, the pills and the
          counterfactuals between them never said until it had already happened. Choosing an option
          replaces it with what THAT count produced. Every sentence is stacked in one grid cell, so
          the row is always as tall as the longest of them and the plot underneath never moves. */}
      <div className="count-notes" role="status">
        {notes.map((note) => (
          <p data-count-note={note.slug} key={note.slug}>{note.text}</p>
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
            chosen layer's own `.hit-area` has to be the thing a pointer lands on. */}
        {drawing}
        {states.map(hitLayer)}

        <div className="overlay" aria-hidden="true" />

        {/* THE COUNT'S OWN PRODUCT, PRINTED WHERE THE READER'S EYE IS. A reader comparing two shapes
            is asking which is bigger; the sentence under the control answers that for a reader who is
            not looking, and this answers it for the one who is. The full count's own readout is here
            too and is shown by default -- the numbers the options reveal have nothing to be read
            against otherwise. It sits in the plot's top-left, which the letterboxed circle never
            reaches at any width. */}
        <div className="option-layer" aria-hidden="true">
          {readouts.map((readout) => (
            <span
              key={readout.slug}
              data-count-readout={readout.slug}
              className="note"
              style={{
                ...regs.annot,
                color: label,
                left: 0,
                top: 0,
                // WIDE ENOUGH FOR ONE LINE ON A LAPTOP, and measured rather than guessed: two of the
                // three filed directions set the annotation register in tracked UPPERCASE, where this
                // sentence ran to three wrapped lines and read as a block of shouting. The percentage
                // is what keeps it inside the plot on a phone, where it wraps and should.
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
