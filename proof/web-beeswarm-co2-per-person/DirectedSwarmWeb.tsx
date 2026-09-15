/**
 * Every country's CO₂ per person in 2023, drawn as a beeswarm THROUGH the design base and delivered
 * as an interactive page. The `beeswarm` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS, AND WHY IT IS THIS AND NOT A TOOLTIP.
 *
 * A beeswarm has exactly one axis of data. The other one is NOT AN AXIS: it is the room the
 * collision-avoidance layout needs, and a mark's distance from the baseline is an artefact of the
 * packing order and encodes nothing at all. Every other chart type in this catalogue has both
 * dimensions committed; this one spends a whole dimension on not overlapping. What it buys with that
 * spend is the swarm's WIDTH at each value — the type's only aggregate statement, and its entire
 * reason to stand next to a histogram.
 *
 * AND THAT WIDTH IS NOT A COUNT. It is a count of whatever the marks are sized by. The static
 * sibling sizes a circle's area by population, so its swarm is thick where the PEOPLE are and not
 * where the COUNTRIES are — and nothing on that plate says which of the two a reader is looking at.
 * It cannot say it: one plate is one packing, and one packing is one weighting. So the gesture this
 * page ships is the one a still is structurally unable to make — THE READER CHOOSES THE UNIT THE
 * SWARM IS THICK IN, and the same 213 marks at the same 213 positions re-pack around the answer:
 *
 *   les habitants  (default, and the static plate)  half the weight sits at  2,60 t
 *   les pays       (one country, one circle)                                 3,14 t
 *   le CO₂         (area is the country's own tonnes)                        8,56 t
 *
 * The half-way point swings 3,3x along a fixed axis while not one mark changes its value — which is
 * the climate-equity argument itself, since the world average of 4,58 t (a rule this page draws
 * unconditionally, in every state) sits above 63,8 % of humanity and above only 25,1 % of the CO₂.
 * A video or a scrolly could morph through the three, but on the author's clock, in the author's
 * order, once; this comparison is a back-and-forth, not a sequence.
 *
 * `weigh.ts` is the vocabulary, written for this beat and argued in `BRIEF.md` against the nine that
 * already exist. Native radios plus CSS generated at build time: no script, no listener, and the
 * complete plate WITH a working control when JavaScript is off.
 *
 * WHAT CUTS AND WHAT TRAVELS, WHICH IS A MECHANICAL DECISION AND NOT A TASTE ONE. The three swarms
 * cut: `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at init, so a
 * mark animated into a new place would keep answering for the place it left — the worst answer an
 * interactive chart can give. Each weighting is therefore its own `<svg class="chart">`, drawn once
 * at its own packing and revealed by the stylesheet; a hidden `<svg>` has no CTM and no focusable
 * content, so pointer and keyboard only ever reach the swarm on screen. What DOES travel is the one
 * element whose movement is the argument: the caret under the axis at the swarm's centre of mass,
 * always rendered, its `left` transitioned. No TEXT moves anywhere on this page.
 *
 * THE PACKING IS DETERMINISTIC AND STATED. Within a weighting, marks are placed in descending order
 * of radius, each at the y closest to the axis that clears every circle already placed. No force
 * simulation, no random seed: the same file produces the same three swarms on every machine, which
 * is what makes the picture a measurement rather than a rendering.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` — the swarm is drawn quietly in all three
 * weightings, and the accent is spent on the two derived cases and nowhere else. It does NOT follow
 * each view's own largest mark, and that refusal is the type's filed trap met in a new form: see
 * `BRIEF.md`, "The type's own trap".
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
  assertWeighDeclaration,
  weighChromeCss,
  weighCss,
  weighLayerAttrs,
  weighMarkAttrs,
  weighNotesForMarkup,
  weighOptionsForMarkup,
  weighSlugOf,
} from "../../skills/chart-web/assets/weigh.ts";

/** The frame, and the top band is part of the contract rather than a margin that happened.
 *  `TOP_BAND` units are reserved above every packing for four staggered rows of annotation — the two
 *  reference levels' labels and the two derived callouts — so that NO text on this page has to move
 *  when the swarm re-packs. The ladder in the runner refuses any rung that packs into it. */
export const FRAME = { width: 900, height: 360, xAxisRowPx: 42, topBand: 70 };

const WEIGH_ID_PREFIX = "chart-weigh";
const SCOPE = ".chart-figure";
/** How long the centre of mass takes to slide to its new value. The one transition on this page. */
const CENTRE_MS = 420;

export type PlateMark = {
  key: string;
  name: string;
  cx: number;
  cy: number;
  r: number;
  /** One of the two derived cases the page names unconditionally. */
  lit: boolean;
  /** The reading this mark answers with UNDER THIS WEIGHTING — a different question per view. */
  detail: string;
};

export type Plate = {
  slug: string;
  marks: PlateMark[];
  /** Where each callout's hairline stops: the top edge of the circle it names, in this packing. */
  leaders: { key: string; cx: number; y: number }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedSwarmWeb({
  plates,
  weigh,
  centreLabel,
  xTicks,
  xMax,
  median,
  average,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  notes,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  plates: Plate[];
  weigh: any;
  centreLabel: string;
  xTicks: number[];
  xMax: number;
  median: { value: number; label: string };
  average: { value: number; label: string };
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  notes: { key: string; text: string }[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // THE FIELD AND THE TWO CASES. One hue is what this type has to spend when it draws a single
  // undivided distribution, and the catalogue's filed defect is spending it on nothing — a default
  // hue that says nothing about the subject. It is spent here on the two derived cases and the field
  // is left achromatic, which is `the-distribution-is-furniture-and-the-case-is-ink` read literally.
  // NO OPACITY ANYWHERE ON A MARK, and that is a measurement rather than a preference. This page
  // ships a calibrated fill and then used to paint it at `fill-opacity: 0.8`, which means the colour
  // a reader actually receives is that fill composited onto the ground — a different colour, never
  // measured, and the exact shape of a defect this branch has already paid for twice (1,75:1 and
  // 2,19:1 on two beats whose accent was calibrated and then faded). A packed field has no overlaps
  // by construction — the packer guarantees a positive gap between every pair — so the opacity was
  // buying nothing at all in exchange for making every number in `PALETTE.md` wrong.
  let field = mix(ground, ink, 0.34);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN)
    field = adjustToContrast(field, ground, NON_TEXT_CONTRAST_MIN) ?? field;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const rule = mix(ground, ink, 0.55);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // WHAT A CIRCLE BECOMES UNDER THE POINTER, AND THE DOSE IS SEARCHED RATHER THAN TYPED. The owner
  // refused a fixed dose that measured 1,104:1 on nocturne, and refused three times over a dot
  // plastered on top of a mark. So the mark itself darkens, off ITS OWN fill, by the smallest step
  // of the direction's ink that clears a measured gap — and there are two fills, so there are two
  // rules and neither is an inline style, which would beat every selector.
  const darken = (fill: string) => {
    for (let dose = 0.14; dose <= 0.7; dose += 0.02) {
      const moved = mix(fill, ink, dose);
      if (contrast(moved, fill) >= 1.14) return moved;
    }
    throw new Error(
      `no dose of the direction's ink moves ${fill} 1.14:1 off itself — a reader could not see ` +
        "which circle answered the pointer",
    );
  };

  const x = (value: number) => (value / xMax) * FRAME.width;
  const axisY = FRAME.height - 8;

  // Refused before anything is drawn, against what this component is actually handed: the seats and
  // the radii the runner's own packer produced, weighting by weighting.
  const seats = new Map(
    plates.map((p) => [p.slug, new Map(p.marks.map((m) => [m.key, { cx: m.cx, cy: m.cy, r: m.r }]))]),
  );
  const radii = new Map(plates.map((p) => [p.slug, p.marks.map((m) => m.r)]));
  assertWeighDeclaration(weigh, {
    marks: plates[0].marks.map((m) => ({ key: m.key, value: (m.cx / FRAME.width) * xMax })),
    seats,
    radii,
    floorRadius: weigh.floorRadius,
    rhoCeiling: 0.95,
    flooredWeightCeiling: 0.08,
    movedFloor: 0.5,
  });

  const weighOptions = weighOptionsForMarkup(weigh, WEIGH_ID_PREFIX);
  const weighNotes = weighNotesForMarkup(weigh);
  const byKey = new Map(plates[0].marks.map((m) => [m.key, m]));

  const css = [
    `${SCOPE} .chart-plot { --y-gutter: 0px; }`,
    weighChromeCss({ scope: SCOPE }),
    weighCss(weigh, {
      scope: SCOPE,
      idPrefix: WEIGH_ID_PREFIX,
      width: FRAME.width,
      centreMs: CENTRE_MS,
    }),
    // The two fills' answers. Emitted neutral first, case second: the second selector is one
    // attribute heavier and would win on specificity anyway, but this file does not rely on that —
    // `stack.ts` and `floor.ts` both record what happens when a generated stylesheet does.
    `${SCOPE} circle.mark-active { fill: ${darken(field)}; }`,
    `${SCOPE} circle.mark-active[data-lit="1"] { fill: ${darken(lit)}; }`,
    // THE CENTRE OF MASS. A caret ON the axis, not a third dashed rule: the plate already carries
    // two, and a third would be the reflex rather than the reading. The two rules are reference
    // LEVELS the swarm is read against and never move; this is a property OF the swarm, so it moves
    // when the swarm does, which is exactly what makes the movement legible.
    `${SCOPE} .weigh-centre { position: absolute; top: 20px; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; transform: translateX(-7px); color: ${labelInk}; }`,
    `${SCOPE} .weigh-centre .caret { width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 8px solid currentColor; }`,
    // The answer is four or five readings long and the format's box is 220px wide, which put a
    // five-line box over the control the reader had just used on the sibling treemap beat. Bare
    // `#tooltip`: the element is the page's, not this figure's.
    `#tooltip { max-width: min(430px, 100vw - 32px); }`,
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
          nothing leaves this picture in any state, and a swarm that hid marks would re-pack every
          other mark around the hole. A weighing pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertWeighDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-weigh">
        <legend>{weigh.label}</legend>
        <div className="options">
          {weighOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={WEIGH_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the re-weighing bought, in words, for a
          reader who is not looking at the plot. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the plot underneath it. The default reveals none: it is
          not a counterfactual, it is the claim the title states. */}
      <div className="weigh-notes" role="status">
        {weighNotes.map((note) => (
          <p key={note.slug} data-weigh-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
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

        {/* ONE SVG PER WEIGHTING, stacked in the same grid cell, and only the chosen one displayed.
            Not one svg whose circles are re-sized: `interaction.mjs` reads every point's coordinates
            once at init, so marks from two hidden packings sitting in the same node list would
            answer for a picture nobody is looking at — and a `display: none` element's rect is 0x0,
            which would anchor the answer at the top-left corner of the window. A hidden svg is
            initialised on its own, has no CTM, and is never reached. */}
        {plates.map((plate) => (
          <svg
            key={plate.slug}
            {...weighLayerAttrs(plate.slug)}
            role="group"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            data-hit="cell"
            viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
            preserveAspectRatio="none"
          >
            {plate.slug === plates[0].slug ? <desc>{alt}</desc> : null}
            <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

            {xTicks.map((t) => (
              <line
                key={t}
                x1={x(t)}
                x2={x(t)}
                y1={0}
                y2={axisY}
                stroke={grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* The two levels a reader is owed before any single country: the median of the 213
                countries and the world's own average. They are furniture, drawn in EVERY weighting
                and never removed by the control — `web-discipline.md`'s rule that the reference a
                claim argues about cannot sit behind a gesture. The average is also what makes the
                three swarms comparable at a glance: it does not move, and the mass around it does. */}
            {[median, average].map((level, i) => (
              <line
                key={level.label}
                x1={x(level.value)}
                x2={x(level.value)}
                y1={0}
                y2={axisY}
                stroke={rule}
                strokeWidth={direction.stroke?.rule ?? 0.8}
                strokeDasharray={i === 0 ? "5 4" : "2 3"}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <line x1={0} x2={FRAME.width} y1={axisY} y2={axisY} stroke={rule} strokeWidth={1} vectorEffect="non-scaling-stroke" />

            {/* The hairline from each callout's reserved row down to the circle it names, IN THIS
                packing. The card itself never moves — its x is the mark's own value and no weighting
                touches x — so this line is the only thing that follows a circle when it re-sizes,
                and it is a line rather than a word for exactly that reason. */}
            {plate.leaders.map((leader) => (
              <line
                key={leader.key}
                x1={leader.cx}
                x2={leader.cx}
                y1={FRAME.topBand}
                y2={leader.y}
                stroke={lit}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {plate.marks.map((m) => (
              <circle
                key={m.key}
                {...weighMarkAttrs(plate.slug, m.key)}
                data-mark={`${plate.slug}:${m.key}`}
                data-lit={m.lit ? "1" : undefined}
                cx={m.cx}
                cy={m.cy}
                r={m.r}
                fill={m.lit ? lit : field}
                stroke={m.lit ? ground : "none"}
                strokeWidth={m.lit ? 1.2 : 0}
              />
            ))}

            {/* THE HIT TARGETS, AND WHY A BIG CIRCLE GETS SEVERAL. `nearestCell` resolves a pointer
                to the nearest mark CENTRE, which is a Voronoi over the centres — a fine
                approximation for a field of near-equal circles and a bad one the moment one circle
                is forty times another's area: the rim of China's carbon circle is nearer the centre
                of a dozen of its neighbours than it is to China's own. So a circle past a measured
                radius is sampled at four more points inside itself, every one answering with the
                same reading and naming the same mark. Only the first is in the tab order; the others
                carry `tabIndex={-1}` and no accessible name, so the keyboard still walks one stop per
                country while the pointer lands where the reader is actually pointing.
                The first point takes the mark's OWN radius, so `:focus-visible`'s outline rings the
                circle the reader is on rather than a dot in the middle of it. It is invisible and it
                never swallows an event: the `.hit-area` below is last in document order and
                therefore on top of everything. */}
            {plate.marks.flatMap((m) => {
              const spots: { dx: number; dy: number; r: number; lead: boolean }[] = [
                { dx: 0, dy: 0, r: m.r, lead: true },
              ];
              if (m.r > 20)
                for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
                  spots.push({ dx: dx * m.r * 0.45, dy: dy * m.r * 0.45, r: 3, lead: false });
              return spots.map((spot, i) => (
                <circle
                  key={`hit-${m.key}-${i}`}
                  className="pt"
                  {...weighMarkAttrs(plate.slug, m.key)}
                  data-mark-ref={`${plate.slug}:${m.key}`}
                  cx={m.cx + spot.dx}
                  cy={m.cy + spot.dy}
                  r={spot.r}
                  fill="transparent"
                  stroke="none"
                  tabIndex={spot.lead ? 0 : -1}
                  role={spot.lead ? "img" : undefined}
                  aria-label={spot.lead ? `${m.name} : ${m.detail}` : undefined}
                  aria-hidden={spot.lead ? undefined : true}
                  data-detail={`${m.name} · ${m.detail}`}
                />
              ));
            })}

            <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
          </svg>
        ))}

        {/* THE WORDS, AND NOT ONE OF THEM MOVES. Four staggered rows inside the band the ladder keeps
            empty in every packing (`FRAME.topBand`), each anchored on an x no weighting can touch.
            The owner refused, twice, a control that shifted labels for no reason the eye could see;
            here the reason a word would have moved is a packing the reader did not ask about, which
            is the worst version of it. The two levels were also measured colliding on the first
            render — 3,14 and 4,58 are 1,44 t apart on a 45 t axis, 29 px, and the first label read
            "médi" — so a level's label belongs to its own row and the rules stay where they are. */}
        <div className="overlay" aria-hidden="true">
          {[median, average].map((level, i) => (
            <span
              key={level.label}
              className="note"
              style={{
                ...regs.annot,
                color: labelInk,
                ...noteAnchor(pct(x(level.value), FRAME.width)),
                top: i === 0 ? "1%" : "6%",
              }}
            >
              {level.label}
            </span>
          ))}
          {notes.map((n, i) => {
            const m = byKey.get(n.key);
            if (!m) throw new Error(`${n.key} is called out and never drawn`);
            const at = pct(m.cx, FRAME.width);
            return (
              <span
                key={n.key}
                className="note"
                style={{
                  ...regs.annot,
                  color: labelInk,
                  ...noteAnchor(at),
                  top: at > 75 ? "1%" : "11.5%",
                }}
              >
                {n.text}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === xTicks[xTicks.length - 1] ? `${t} ${unit}` : t}
            </span>
          ))}
          {/* The one thing on this page that travels. Always rendered — `display` does not
              interpolate, and a property that changes on an element which is always there does. */}
          <span className="weigh-centre" data-weigh-centre="" style={{ ...regs.axis }}>
            <span className="caret" aria-hidden="true" />
            {centreLabel}
          </span>
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
