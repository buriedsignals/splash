/**
 * Europe's low-carbon electricity share, one equal TILE per country — drawn as a tile cartogram
 * THROUGH the design base, and delivered as an interactive page THE READER CAN PUT BACK.
 *
 * IT DRAWS THE SAME DATA AS THE CHOROPLETH, AND THE PAIR IS THE ARGUMENT. Weighted by the area each
 * country occupies on a map, Europe reads one way; weighted by COUNTRY, it reads another. Both
 * numbers are true, and a choropleth can only ever show one of them — the one nobody chose, because
 * area is not a decision a mapmaker makes, it is a fact about the earth.
 *
 * WHAT THE WEB ADDS, AND WHY IT IS THIS AND NOT A ZOOM.
 *
 * Seven of the eight map types in this tree promise that a place does not move. The cartogram is the
 * named exception — it deforms IN ORDER TO MEASURE — so it is also the one type for which the
 * owner's first ruling, *nothing moves without the reader seeing why*, is satisfied BY THE MOVEMENT
 * ITSELF, provided the movement is the reader's own gesture and never a side effect.
 *
 * What this type hides is the geography it sacrificed, and the sacrifice is in two separable pieces:
 * THE PLACE (where each country really is) and THE SIZE (what it really weighs on a map). The
 * control hands them back one at a time, and the order is the argument:
 *
 *   une case par pays          the beat as filed. 65,1 % by country.
 *   chaque case près de sa place   equal squares, RELAXED from their true centroids. STILL 65,1 % —
 *                            giving back the place does not move the average by a thousandth.
 *   chaque case à sa surface   each square at its country's true area, relaxed the same way. 44,9 %
 *                            — the choropleth's own figure, because this IS the choropleth, in
 *                            squares.
 *
 * THE RELAXATION, AND WHAT IT COSTS, IN PLAIN TERMS.
 *
 * Squares dropped on their true centroids overlap, and on this map they overlap catastrophically:
 * 125 pairs over 38 of the 41 cells at the true place, 40 pairs over 35 at the true area. The first
 * answer this beat shipped was to make that pile VISIBLE — a cased outline on every square, which
 * raised the worst readable boundary from 1,18:1 to 1,79:1 — and the owner read the result and
 * called it illegible a second time. He was right. A well-drawn pile is still a pile.
 *
 * So the squares are now RELAXED, which is what a cartogram of this family has always meant:
 * Dorling's method for circles, DEMERS' for squares. Each square keeps its area EXACTLY — the
 * quantity is never touched, and `assertRestoreDeclaration` still checks side²/Σside² against the
 * share the stage declares to 1e-9 — and only the centres move, by the smallest push that takes two
 * squares off each other, repeated until none overlap at all.
 *
 * THE PRICE IS THAT A SQUARE NO LONGER SITS EXACTLY ON ITS COUNTRY, and this page states it rather
 * than hiding it: every stage prints the gap it leaves, worst and median, as a share of the map's
 * width, and every cell answers with its own. The comparison that puts it in proportion is the
 * filed grid itself, which charges the same price silently and charges MORE of it — a hand-drawn
 * tile grid sits about two and a half times further from the true centroids than the relaxed stage
 * does. Nothing on this page is placed where it is for tidiness; every square is as close to its
 * country as zero overlap allows.
 *
 * WHAT THAT REMOVED. With no stage colliding, the separator layer this beat carried — two outlines
 * per cell, revealed by the collision census — has nothing to separate, so it is gone, and so is the
 * halo that kept names readable where those outlines crossed them. `restore.ts` keeps the census and
 * keeps the refusal: the moment any stage piles squares again, the outlines become compulsory and
 * the page is refused without them.
 *
 * A reader who does both, in that order, has proved with their own hand that a tile cartogram's
 * distortion is a distortion of WEIGHT and not of position. A still has to pick one weighting and
 * print the other in a caption; a video and a scrolly pick the ORDER as well, which is already
 * somebody's argument.
 *
 * THE CAMERA NEVER MOVES. The viewBox, the projection and the frame are identical in all three
 * stages — what travels is the marks inside them. That is what separates this from the lazy answer
 * the common brief rules out: a zoom spends the framing `camera.ts` argues for, and buys nothing
 * this beat is about.
 *
 * WHAT MOVES IS NOT WHAT ANSWERS. `interaction.mjs` resolves the mark under a pointer from `cx`/`cy`
 * read ONCE at init, which no CSS transform ever updates. So the drawing is `aria-hidden` and takes
 * no pointer event, and each stage has its own transparent hit plate whose points are baked at that
 * stage's coordinates. The honest cost, stated rather than hidden: mid-flight the plate is already
 * at the destination, so a reader who points while forty-one squares are in the air is answered
 * about the cell that is ARRIVING. Nothing is ever answered from a place no cell will occupy.
 *
 * A NAME TRAVELS WITH ITS CELL AND IS NEVER SCALED BY IT. The square may grow by a factor of five;
 * the word on it may not — that would be a typeface deformed by a datum. And a name goes out
 * exactly when its own square can no longer hold it, which `restore.ts` DERIVES rather than takes on
 * trust: the static sibling's rule "the tile has to hold its own name", made once per stage.
 *
 * `a-missing-cell-is-drawn-as-missing` — a tile with no reading is hollow and dashed, never dropped
 * into the lowest class. It therefore has no ink to darken under a pointer, so it answers on its
 * EDGE. That is a distinction only a map produces, and `restore.ts` carries it as `lift`.
 * `the-key-prints-its-breaks-in-the-data-s-units` — the classes are named in per cent, and the key
 * is the one thing on this page that does not move in any stage: colour is the invariant.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";
// THE BEAT WIRES THE CHROME, and it is the beat that is allowed to: a file under `proof/` may
// import from any skill, where `no-cross-skill-imports` stops a file INSIDE a skill from reaching
// out of it. That is what lets `restore.ts` live in `map-web` — where a newsroom installing the map
// skill actually receives it — and still be drawn in the same pill rail as every other control.
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  restoreCss,
  restoreMarkLiftCss,
  restoreStagesForMarkup,
  restoreNotesForMarkup,
  restoreDrawOrder,
  restoreSlugOf,
  restoreCellAttrs,
  restoreNameAttrs,
  restorePlateAttrs,
} from "../../skills/map-web/assets/restore.ts";

const SCOPE = ".chart-figure";
/** `interaction-plan.ts` discovers a control that MOVES the picture by this id stem — the format's
 *  own contract, shared with `side.ts`, `aim.ts` and `qualify.ts` rather than spelled afresh. */
const RESTORE_ID_PREFIX = "chart-stack";

/** How far a pointed cell has to move off its own fill before a reader can see that it answered.
 *  A dose is SOUGHT until this is met and never fixed: a fixed dose measured 1,104:1 on nocturne
 *  and was refused. */
const ACTIVE_MIN = 1.18;

export type Tile = {
  code: string;
  name: string;
  /** The class index, or `null` for a country with no published reading. */
  klass: number | null;
  label: string;
  value: string;
  /** One reading per stage, keyed by the stage's slug: what THIS stage just gave this country back. */
  detail: Record<string, string>;
};

export function DirectedCartogramWeb({
  restore,
  tiles,
  classes,
  missingLabel,
  frame,
  totals,
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
}: {
  restore: any;
  tiles: Tile[];
  classes: { label: string }[];
  missingLabel: string;
  frame: { width: number; height: number };
  /** The line of average, one per stage slug. Drawn on the plate, swapped by the same `:checked`. */
  totals: Record<string, string>;
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
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const ramp = classes.map((_, i) =>
    mix(ground, accent, 0.14 + (i / (classes.length - 1)) * 0.86),
  );
  const edge = mix(ground, ink, 0.32);

  /** The dose that moves a cell off its OWN painted fill far enough to be seen — sought, not fixed,
   *  which is the owner's second ruling taken literally. */
  const lifted = (paint: string) => {
    for (let dose = 0.08; dose <= 0.9; dose += 0.02) {
      const moved = mix(paint, ink, dose);
      if (contrast(moved, paint) >= ACTIVE_MIN) return moved;
    }
    for (let dose = 0.08; dose <= 0.9; dose += 0.02) {
      const moved = mix(paint, ground, dose);
      if (contrast(moved, paint) >= ACTIVE_MIN) return moved;
    }
    throw new Error(
      `no dose of ${ink} or ${ground} moves ${paint} ${ACTIVE_MIN}:1 off itself — a reader could ` +
        "not see which cell answered the pointer",
    );
  };

  const stages = restoreStagesForMarkup(restore, RESTORE_ID_PREFIX);
  const notes = restoreNotesForMarkup(restore);
  const order = restoreDrawOrder(restore);
  const byCode = new Map(tiles.map((tile) => [tile.code, tile]));
  const home = new Map(restore.stages[0].places.map((p: any) => [p.key, p]));
  const placesOf = (slug: string) => {
    const stage = restore.stages.find((s: any) => restoreSlugOf(s.key) === slug);
    if (!stage) throw new Error(`no stage slugs to ${JSON.stringify(slug)}`);
    return new Map(stage.places.map((p: any) => [p.key, p]));
  };

  const fillOf = (tile: Tile) => (tile.klass === null ? "none" : ramp[tile.klass]);
  const liftOf = (tile: Tile) =>
    tile.klass === null ? lifted(edge) : lifted(ramp[tile.klass]);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "restore",
      // THE ROW USED TO RESERVE 3em HERE, with `stacked: true` beside it, on the reasoning that the
      // tallest of this beat's two sentences is what the row should be. The reasoning was right and
      // the number was the wrong instrument: `control-chrome.ts` stacks unconditionally now and the
      // browser measures the depth, so choosing a stage never moves the plot down under the
      // reader's pointer at the frame's own width OR at any other.
    }),
    restoreCss(restore, { scope: SCOPE, idPrefix: RESTORE_ID_PREFIX }),
    // The cell the pointed point speaks for, lit ACROSS the split between the drawing and the hit
    // plate. The dose is not here: each cell carries its own `--mark-active`, sought against its own
    // painted fill, which is the format's contract and the owner's ruling that a mark darkens from
    // what it already is.
    restoreMarkLiftCss({
      scope: SCOPE,
      tiles: tiles.map((tile) => ({
        key: tile.code,
        lift: tile.klass === null ? ("stroke" as const) : ("fill" as const),
      })),
    }),
    `${SCOPE} p.average { text-align: center; }`,
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
          nothing ever leaves this picture, and a plate that hid a country would be answering a
          different question from the one its pills ask — the three stages measure a geometry of the
          WHOLE set (the overlaps, the share of the plate, the average). */}
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

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one —
          `assertRestoreDeclaration` refuses the declaration otherwise (WCAG 2.5.3). */}
      <fieldset className="chart-restore">
        <legend>{restore.label}</legend>
        <div className="options">
          {stages.map((stage) => (
            <label key={stage.id}>
              <input
                id={stage.id}
                type="radio"
                name={RESTORE_ID_PREFIX}
                value={stage.slug}
                aria-label={stage.announce}
                defaultChecked={stage.isDefault}
              />
              {stage.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the stage gave back, in words, for a reader
          who is not looking at the plot. The row is reserved and its sentences are stacked in one
          grid cell, so revealing one never pushes the plot down while forty-one cells are in the
          air. The default reveals none: it is the claim, not a counterfactual. */}
      <div className="restore-notes" role="status">
        {notes.map((note) => (
          <p
            key={note.slug}
            data-stack-note={note.slug}
            style={{ ...regs.annot, margin: 0 }}
          >
            {note.text}
          </p>
        ))}
      </div>

      {/* THE KEY. The one thing on this page that is identical in all three stages: the colour is
          the invariant, and the geometry is what the reader is moving. Its swatches are fixed CSS
          pixels outside the viewBox, so nothing here follows the plot's stretch. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 10px",
          margin: "6px 0 2px",
          flex: "0 0 auto",
        }}
      >
        {classes.map((k, i) => (
          <span
            key={k.label}
            style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                background: ramp[i],
                display: "inline-block",
                border: `1px solid ${edge}`,
              }}
            />
            {k.label}
          </span>
        ))}
        <span
          style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              background: "transparent",
              display: "inline-block",
              border: `1px dashed ${edge}`,
            }}
          />
          {missingLabel}
        </span>
      </div>

      {/* THE LINE OF AVERAGE, one per stage, revealed by the same `:checked` as its hit plate. It is
          the reading this control hands back, and it is the whole point that two of the three say
          the same number: giving a country back its PLACE does not change what Europe averages. */}
      <div style={{ flex: "0 0 auto", margin: "2px 0 4px" }}>
        {stages.map((stage) => (
          <p
            key={stage.slug}
            className="average"
            data-stack-total={stage.slug}
            style={{ ...regs.axis, margin: 0 }}
          >
            {totals[stage.slug]}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${frame.width} / ${frame.height}`,
        }}
      >
        <div className="y-axis" />

        {/* THE DRAWING, AND THERE IS ONLY ONE. Every square a reader looks at is here, written at the
            DEFAULT stage's coordinates, and the stylesheet TRANSLATES and SCALES each one to the
            stage that is chosen. It is `aria-hidden` and takes no pointer event: it is a picture of
            the data and not a way to ask it anything, which is exactly what lets it move at all.

            A tile cartogram's whole promise is that every cell is the SAME cell, so the box is never
            stretched to fill its frame: `xMidYMid meet`, not `none`. A stretched box would make all
            forty-one cells the same RECTANGLE, which is a different promise. */}
        <svg
          role="presentation"
          aria-hidden="true"
          focusable="false"
          pointerEvents="none"
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          {/* Largest behind, smallest in front — the only order under which the value-by-area stage
              is readable at all, since one square there is 455 units across and another is 1,9. The
              order is one order for the whole page: there is one drawing. */}
          {order.map((code) => {
            const tile = byCode.get(code) as Tile;
            const seat = home.get(code) as any;
            return (
              <rect
                key={code}
                {...restoreCellAttrs(code)}
                x={seat.cx - seat.side / 2}
                y={seat.cy - seat.side / 2}
                width={seat.side}
                height={seat.side}
                rx={3}
                fill={fillOf(tile)}
                stroke={edge}
                strokeWidth={tile.klass === null ? 1 : 0.6}
                strokeDasharray={tile.klass === null ? "3 3" : undefined}
                vectorEffect="non-scaling-stroke"
                style={{ ["--mark-active" as string]: liftOf(tile) }}
              />
            );
          })}


          {/* THE NAMES. One group per cell, TRANSLATED with its square and never scaled by it, and
              faded out exactly when the square can no longer hold the word — which `restore.ts`
              derives from the sides and the overlaps rather than taking on trust. `opacity` is a
              property on an element that is ALWAYS rendered, which is the only kind of change CSS
              can interpolate.

              NO HALO, AND THAT IS A CONSEQUENCE OF THE RELAXATION. The names used to be stroked in
              their own cell's fill, to survive the boundary lines that crossed behind any word near
              the edge of a crowded square. No stage crowds any more and there are no boundary lines
              left, so a name sits alone on its own fill — which is the exact condition its ink was
              measured against. A halo painting fill over fill is ink nobody can see, so it is gone
              with the layer it was answering. */}
          {order.map((code) => {
            const tile = byCode.get(code) as Tile;
            const seat = home.get(code) as any;
            const fill = tile.klass === null ? ground : ramp[tile.klass];
            const on = inkOnFill(
              fill,
              { ink, ground },
              contrast,
              adjustToContrast,
              TEXT_CONTRAST_MIN,
            );
            return (
              <g key={`n-${code}`} {...restoreNameAttrs(code)}>
                <text
                  pointerEvents="none"
                  x={seat.cx}
                  y={seat.cy - 9}
                  fill={on}
                  fontFamily={String(regs.axis.fontFamily)}
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tile.label}
                </text>
                <text
                  pointerEvents="none"
                  x={seat.cx}
                  y={seat.cy + 10}
                  fill={on}
                  fontFamily={String(regs.value.fontFamily)}
                  fontSize={13}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tile.value}
                </text>
              </g>
            );
          })}
        </svg>

        {/* THE HIT PLATES — one per stage, transparent, swapped by `display`, each holding the
            forty-one points baked at ITS OWN stage's coordinates. This is the split the whole
            mechanism exists for: nothing that answers ever moves. Every point is `tabindex=0` in
            every stage, which is this type sheet's accessibility trap answered head on — a name the
            plate can no longer draw is still reachable by keyboard, by name. */}
        {stages.map((stage) => {
          const places = placesOf(stage.slug);
          return (
            <svg
              key={stage.slug}
              role="group"
              aria-label={`${title} — ${stage.label}`}
              xmlns="http://www.w3.org/2000/svg"
              className="chart"
              data-hit="cell"
              viewBox={`0 0 ${frame.width} ${frame.height}`}
              preserveAspectRatio="xMidYMid meet"
              {...restorePlateAttrs(stage.slug)}
            >
              <desc>{alt}</desc>
              {order.map((code) => {
                const tile = byCode.get(code) as Tile;
                const place = places.get(code) as any;
                const detail = tile.detail[stage.slug];
                return (
                  <circle
                    key={code}
                    className="pt"
                    cx={place.cx}
                    cy={place.cy}
                    r={Math.max(4, Math.min(30, place.side / 2))}
                    fill="transparent"
                    stroke="none"
                    tabIndex={0}
                    role="img"
                    aria-label={detail}
                    data-mark-ref={code}
                    data-detail={detail}
                  />
                );
              })}
              <rect
                className="hit-area"
                x={0}
                y={0}
                width={frame.width}
                height={frame.height}
                fill="transparent"
                pointerEvents="all"
              />
            </svg>
          );
        })}

        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>
        {claimNote}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
