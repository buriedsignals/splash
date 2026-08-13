/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a scrollytelling framework. It is the wiring of one
 * scroll-driven beat, written out once so the next one can be written from scratch in the same
 * shape. A scrolly is a VEHICLE, not a fourth format of chart — and, just as importantly, not a
 * second copy of a format that already exists: a single chart stepped through several reveal states
 * is not what earns this vehicle its keep, because a single beat that only ever shows one chart
 * should animate instead (see this skill's own `SKILL.md`, "When to use"). What a scrolly earns its
 * existence by doing is ASSEMBLING DIFFERENT MEDIA behind one narrative — which is exactly what a
 * single beat, of any one format, cannot do on its own.
 *
 * **This seed carries FOUR TRACKS, and that is the point of the file.** An IMAGE track (a raster
 * scene), a DRAWN track (a schematic), a MAP track (a baked basemap plate with the gauge marked on
 * it) and a CHART track (a year of that gauge's own real readings). Two of them are new: a vehicle
 * whose seed only ever assembled a picture and a diagram never demonstrated the thing it exists
 * for, because neither of those is a medium another skill in this project already produces. A map
 * and a chart are, and carrying them BOTH, behind one narrative, is what no single beat can do.
 *
 * This file is deliberately split in two:
 *
 *   - `STEPS_META` + the four frame components are this SEED's own worked beat — a real one, not a
 *     mechanics demo. A real beat replaces all of it.
 *   - The GENERIC scaffold that assembles whatever frame a step is handed — `renderScrolly` in
 *     `scripts/render-scrolly.mjs`, `pickActiveStep`/`initScrolly` in `assets/interaction.mjs` — is
 *     this format's own machinery and knows nothing written here. It never reads `frameKind`, never
 *     asks whether a step's frame is a photo, a diagram, a chart or a map; it only ever renders the
 *     `ReactElement` a step hands it and toggles which one is on screen.
 *     `scripts/render-scrolly.mjs`'s own seed runner (behind its labelled CONFIG seam) is the ONE
 *     place that reads `frameKind` and turns each `STEPS_META` entry into that finished element.
 *
 * Three things this format needs that neither the static nor the web format does:
 *
 *   1. Every step's own frame is SSR'd once, as a complete, self-contained fragment (an `<img>`, an
 *      `<svg>`, or a `<div>` holding both) — never a live DOM node the browser mutates. The
 *      scaffold stacks all of them in the same box and only ever toggles which one is visible.
 *   2. Every step's own PROSE is plain server-rendered text, in ordinary document flow, present
 *      unconditionally in the markup. A reader with JavaScript off, or a screen reader user tabbing
 *      straight through the page, reaches every step's own words exactly the way a sighted reader
 *      who scrolls does. Only the GRAPHIC steps; the argument never does.
 *   3. Exactly one frame is marked `active` in the SSR'd markup itself (the first step, wired by
 *      `scripts/render-scrolly.mjs`'s own loop) — not assigned by the inline script after the page
 *      loads. That is what makes "JavaScript disabled" a real, provable state rather than a blank
 *      graphic waiting for a script that never runs.
 *
 * **Every number this beat says out loud is computed, never typed.** `prose` is a FUNCTION of the
 * facts `assets/gauge-data.ts` derives from the two frozen files under `sample-data/` — see that
 * file's own doc-comment for why (one beat in four in this project once carried a hand-typed figure
 * its own data contradicted).
 *
 * No frame component below imports the rasteriser (`deriveFurniture`/`measureText`), the same
 * invariant the other formats' seeds keep: `ink`/`muted`/`grid` are props, derived once in node by
 * whatever runner calls these components.
 */

import type { CSSProperties } from "react";
import type { GaugeFacts, Reading, Station } from "./gauge-data.ts";
import { dayAndMonth, group } from "./gauge-data.ts";

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below.

/** The facts every step's own prose is written against — this beat's, not the format's. */
export type SeedFacts = { station: Station; gauge: GaugeFacts };

export type ScrollyStepMeta = {
  /** Also this step's `data-step` attribute, matching its frame and its prose panel — the one
   *  string `assets/interaction.mjs` uses to keep the two in sync as the reader scrolls. */
  id: string;
  /** Which kind of frame this step hands the scaffold. The scaffold itself never reads this field —
   *  only `scripts/render-scrolly.mjs`'s own seed runner does, to decide which component to build.
   *  A real beat's own steps can mix any frame kinds it has components for; nothing about the
   *  scaffold assumes a closed set. */
  frameKind: "image" | "drawn" | "map" | "chart";
  /** This step's own words, as a FUNCTION of the beat's own derived facts — see this file's own
   *  doc-comment. Rendered as plain `<p>` text in ordinary document flow, never gated behind the
   *  graphic or the inline script. Keep each paragraph short: the card travels OVER the visual, so
   *  its own height is the share of the frame it hides while it passes — measured at 16-22% of the
   *  graphic's height on a desktop and 25-31% on a phone for the beats on disk. A paragraph twice
   *  that long is a card that never gets out of the visual's way. */
  prose: (facts: SeedFacts) => string[];
};

/**
 * The beat's own four-step arc — four DIFFERENT MEDIA, one narrative, in the order a reader would
 * actually be shown them: the thing itself, how it is read, where it is, what it recorded. Not four
 * states of one chart (which belongs to `chart-web`, and `SKILL.md`'s own "When to use" says
 * so in as many words).
 */
export const STEPS_META: ScrollyStepMeta[] = [
  {
    id: "site",
    frameKind: "image",
    prose: () => [
      "A river gauge is a modest thing: a post in the water, a shelter on the bank, a reading taken every day. Every flood warning and every drought figure starts at one of these.",
    ],
  },
  {
    id: "instrument",
    frameKind: "drawn",
    prose: () => [
      "What the gauge records is a height — water against a staff marked in centimetres. A rating curve, built from measurements made in the channel itself, turns that height into a flow.",
    ],
  },
  {
    id: "where",
    frameKind: "map",
    prose: ({ station }) => [
      `This one is USGS ${station.id} — the ${station.name}. Everything that falls on ${group(station.drainageSqMi)} square miles of upstream country passes it.`,
    ],
  },
  {
    id: "record",
    frameKind: "chart",
    prose: ({ gauge }) => [
      `${group(gauge.count)} readings, one a day, through ${gauge.year}. The highest, ${dayAndMonth(gauge.peak.date)}, was ${group(gauge.peak.value)} cubic feet per second; the lowest, ${dayAndMonth(gauge.low.date)}, was ${gauge.ratio} times smaller. The median day sat at ${group(gauge.median)}.`,
    ],
  },
];
// =========================================

/**
 * **THE LANE IS GONE, and this note is what stands where it was.** Three rounds of this seed
 * reserved `PROSE_LANE` — 28% of every frame's own height, at the bottom — for a prose panel to
 * park in. The ninth correction puts the card back over the graphic and lets it TRAVEL, so:
 *
 *   - it crosses the whole height of the frame once per step, at the reader's own uniform rate, and
 *     rests nowhere. Measured on a continuous scroll at three widths, no band is preferred;
 *   - at the one position that IS editorially load-bearing — `data-progress = i`, the moment step
 *     `i`'s own sentence sits on the lane's centre line — the card is DEAD CENTRE of the frame, the
 *     furthest possible point from the band the frames used to reserve.
 *
 * So the reservation protected the one place the card never dwells, and cost this seed's own chart
 * roughly 230px of its 821px box at 1600x900 — visible as bare ground under the plot. It is
 * reclaimed here: `safeBand` no longer takes a lane, `CONTENT_TOP` is gone, and `CHART_LAYOUT` uses
 * the frame's full height. What replaces it is not another band but a COMPOSITION RULE, stated in
 * `references/scrolly-discipline.md`: nothing whose only copy a reader needs may sit alone in the
 * card's own stripe down the middle of the frame.
 *
 * `renderScrolly` still ACCEPTS a `proseLane` and still emits it as `--prose-lane`/`data-prose-lane`
 * — beats whose own camera or plot box is derived from their own copy of the constant still pass
 * one, and the number stays readable off the delivered file. This seed passes none.
 */

/**
 * The box-aspect-ratio range a full-bleed graphic is guaranteed to be readable across. A frame
 * pinned to the viewport meets everything from a tall phone to an ultrawide desktop, and
 * COVER-cropping (`preserveAspectRatio="xMidYMid slice"`) crops HARDEST at those two extremes, not
 * at the ones in between.
 */
export const ASPECT_ENVELOPE = { min: 0.42, max: 2.4 } as const; // tall phone .. 21:9 ultrawide

/**
 * The sub-rectangle of a COVER-cropped frame's own viewBox that is guaranteed to be on screen —
 * never cropped away, at any aspect in `ASPECT_ENVELOPE`.
 *
 * The math. For a box `W × H`, COVER's scale is `s = max(W/fw, H/fh)`, and the slice of the viewBox
 * that stays visible is `W/s` wide by `H/s` tall, centred on the viewBox's own centre. Substituting
 * `a = W/H` gives `W/s = min(fw, a·fh)` and `H/s = min(fw/a, fh)` — so the NARROWEST aspect sets
 * how narrow the visible width ever gets, and the WIDEST sets how short the visible height ever
 * gets. `margin` is slack for text metrics: these are anchor points, not measured glyph boxes.
 *
 * It used to take a third argument, the prose lane, and shave that off the bottom. The card travels
 * the whole frame now and no band survives it — see the note where `PROSE_LANE` used to be.
 */
export function safeBand(
  frame: { width: number; height: number },
  envelope: { min: number; max: number } = ASPECT_ENVELOPE,
  margin = 12,
): { x: [number, number]; y: [number, number] } {
  const visibleWidth = Math.min(frame.width, envelope.min * frame.height);
  const visibleHeight = Math.min(frame.width / envelope.max, frame.height);
  const cx = frame.width / 2;
  const cy = frame.height / 2;
  return {
    x: [cx - visibleWidth / 2 + margin, cx + visibleWidth / 2 - margin],
    y: [cy - visibleHeight / 2 + margin, cy + visibleHeight / 2 - margin],
  };
}

/** The DRAWN frame's own design canvas — not the size it renders at in the page, where it fills
 *  whatever box the sticky graphic gives it. */
export const FRAME = { width: 640, height: 900 };

/** The drawn frame's own safe band, derived — never a pair of literals that can drift from the
 *  envelope and the lane they are supposed to come from. */
export const SAFE_AREA = safeBand(FRAME);

/** The CHART frame's own layout, in fractions of the frame box it fills. `bottom` is 0.90, not the
 *  0.63 three rounds of this seed carried: that was `CONTENT_TOP - 0.09`, the plot stopping short so
 *  a parked panel could have the bottom 28% of the frame. Nothing parks there any more, and the band
 *  it left was bare ground — 230px of an 821px box at 1600x900. The 0.10 that remains below the plot
 *  is the strip the x-axis labels actually occupy (8px under `plot.bottom`, at 15px), and it is
 *  measured by `test/seed-tracks.test.ts` rather than reserved by a constant. */
export const CHART_LAYOUT = {
  plot: { left: 0.13, right: 0.96, top: 0.17, bottom: 0.9 },
  /** The geometry-only viewBox the plot's own SVG stretches across (`preserveAspectRatio="none"`):
   *  geometry stretches with the box, type does not — every word on this frame is HTML at a fixed
   *  pixel size, the separation the web formats in this project already ship. */
  viewBox: { width: 1000, height: 500 },
} as const;

/**
 * The IMAGE track. This seed's own illustrated scene of a gauge station, authored from flat shapes
 * by `scripts/build-sample-photo.mjs` (nothing in this toolchain fetches photographs, so there is
 * nothing to credit and nothing that pretends to be a photograph of the station this beat names).
 *
 * **CONTAINED, NEVER COVER-CROPPED — the owner's ruling of 2026-08-10:** *"Pour les scrolly images
 * respecte le ratio mais remplis au max en largeur ou hauteur."* This track used to be
 * `objectFit: "cover"`, on the argument recorded above it that "cropping scenery costs nothing,
 * cropping a label costs the reader the label". That argument is right about a DRAWN backdrop and
 * wrong about the thing this track exists to carry: a journalist's photograph is a document, and a
 * silent crop changes what it shows. Measured at 1600x900 on a portrait frame, cover shows the
 * middle 27% of its height — the reader compares four horizontal slices nobody chose.
 *
 * So the picture keeps its own ratio and is scaled up until it meets the frame on whichever axis
 * binds first. **What fills the other axis is the render's own `ground`** — the same value every
 * piece of this page's furniture is derived from (`deriveFurniture`), which is why it is the right
 * answer rather than merely an available one: a letterbox in any other colour would be a colour
 * nobody chose, and this project's first invariant is that nothing renders in a value nobody chose.
 * `.scrolly-frame`'s own background already paints it, so the letterbox needs no rule of its own.
 *
 * `alt=""` on purpose: the wrapper `renderScrolly` puts every frame in is `aria-hidden` regardless
 * of kind, so a meaningful `alt` here would never reach a screen reader anyway; the argument this
 * beat makes is carried by the prose.
 */
export function ImageFrame({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

/**
 * The DRAWN track. A schematic of the instrument — no axis, no plotted value, nothing a reader
 * could read a number off. It paints only with `ground`/`ink`/`muted`/`accent`, the closed-palette
 * rule every format in this project keeps, and every element that carries meaning sits inside
 * `SAFE_AREA` by construction, so COVER's own crop and the prose lane can both never reach it.
 * Only the bank and water fills — plain colour, no text — are free to bleed past it.
 */
export function DrawnGraphicFrame({
  ground,
  ink,
  muted,
  accent,
  waterLevelT = 0.5,
  dayLabel,
}: {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  /** Fraction of the staff's own safe run where the illustrated water sits, 0 highest, 1 lowest.
   *  Purely illustrative — it moves a fill and a dot inside a band every annotation already stays
   *  within, never a value plotted against a labelled scale. */
  waterLevelT?: number;
  /** Optional word naming which day this reading belongs to — the same register as the "cm" and
   *  "flow" labels already on the diagram, never a number a reader could mistake for a tick. */
  dayLabel?: string;
}) {
  const { width, height } = FRAME;
  const bankTop = height * 0.52;
  const staffX = 320; // SAFE_AREA.x's own centre.

  // The staff and every tick on it live inside SAFE_AREA.y, independent of `waterLevelT`, with room
  // left above for the "cm" label and below for the flow-direction group.
  const staffTop = 360;
  const staffBottom = 460;
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = i / (tickCount - 1);
    return staffTop + t * (staffBottom - staffTop);
  });

  // Clamped BY CONSTRUCTION, so no caller-supplied `waterLevelT` outside [0, 1] can push the
  // reading dot out of the safe band either.
  const clampedT = Math.max(0, Math.min(1, waterLevelT));
  const waterTop = staffTop + clampedT * (staffBottom - staffTop);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {/* The channel: a flat bank, a flat body of water — no gradient wash. Plain colour, no text
          on either edge, so both are free to bleed past SAFE_AREA and past FRAME itself. */}
      <rect
        x={0}
        y={bankTop}
        width={width}
        height={height - bankTop}
        fill={muted}
        opacity={0.18}
      />
      <rect
        x={0}
        y={waterTop}
        width={width}
        height={height - waterTop}
        fill={accent}
        opacity={0.35}
      />

      {/* The staff gauge itself: a post, six ticks, one reading marked against it. */}
      <line
        x1={staffX}
        x2={staffX}
        y1={staffTop}
        y2={staffBottom}
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {ticks.map((y, i) => (
        <line
          key={i}
          x1={staffX - 14}
          x2={staffX + 14}
          y1={y}
          y2={y}
          stroke={ink}
          strokeWidth={2}
        />
      ))}
      <text x={staffX + 24} y={staffTop - 14} fill={muted} fontSize={18}>
        cm
      </text>

      {/* The day's reading: a dot on the staff, level with the water. */}
      <circle
        cx={staffX}
        cy={waterTop}
        r={7}
        fill={accent}
        stroke={ink}
        strokeWidth={1.5}
      />
      {dayLabel && (
        <text
          x={staffX - 24}
          y={waterTop + 5}
          fill={ink}
          fontSize={16}
          textAnchor="end"
        >
          {dayLabel}
        </text>
      )}

      {/* Flow direction — its label ABOVE the arrow rather than below it, and BOTH pulled in to
          x 286..400 by the ninth correction, which is this seed's own worked example of the one
          composition rule a card travelling over a frame imposes.

          The card is centred and 410px wide, so its own vertical edges cut a fixed pair of columns
          down the frame; a label straddling one of them is broken text for every animation frame
          the card spends at that row, and "the 'flood day' label reduced to 'flo…'" is the owner's
          own report of exactly that. At x 380 this label straddled the RIGHT edge at 1600x900 — 10
          consecutive frames of "flo", measured, and visible in a screenshot taken at the moment the
          step is narrated.

          There is NO placement that is outside the stripe at every width, and that is the finding
          rather than a limitation of this drawing: a COVER-cropped frame's scale changes with the
          viewport, so the stripe's footprint in viewBox units grows as the viewport narrows —
          410px is 164 units at 1600 and 437 at 600, nearly the whole canvas. So a label on a
          cropped frame is placed INSIDE the stripe, where the card hides it whole while it passes
          and leaves it whole the rest of the time — never across an edge. (A FITTED frame escapes
          this: `CHART_LAYOUT` keeps its y-axis furniture in the left gutter, which is outside the
          stripe at every width by construction.) The arrow itself is a plain line and could be cut
          without costing a reader anything; it moves with its label to stay a pair. */}
      <text x={286} y={474} fill={muted} fontSize={16}>
        flow
      </text>
      <line
        x1={330}
        x2={400}
        y1={490}
        y2={490}
        stroke={ink}
        strokeWidth={2.5}
        markerEnd="url(#scrolly-seed-arrow)"
      />

      <defs>
        <marker
          id="scrolly-seed-arrow"
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={ink} />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * The MAP track. A baked basemap plate with one marker on it — and no map: the plate is a JPEG
 * captured once by `scripts/bake-plate.mjs`, embedded as a data URI, so the delivered HTML makes no
 * network request and carries no MapTiler key (`references/scrolly-discipline.md`, "A map track
 * without a live map").
 *
 * COVER-cropped like the photograph, because a basemap is scenery and reads best full-bleed — but
 * unlike the photograph it carries a marker and a label, so both sit inside the plate's own
 * `safeBand`. The bake centres the camera on the station, which is what makes that guarantee
 * trivially true rather than a coincidence to re-check whenever the camera moves.
 *
 * The label is drawn with a ground-coloured halo (`paintOrder: stroke`) rather than a measured
 * chip: a chip needs a text measurement this component has no measurer for, and a halo is legible
 * over any part of a pale basemap without one.
 */
export function MapFrame({
  plate,
  frame,
  station,
  ground,
  ink,
  accent,
}: {
  /** The baked plate as a data URI — never a path: the delivered file is self-contained. */
  plate: string;
  /** The plate's own pixel size, read from the bake's own geometry file, never assumed. */
  frame: { width: number; height: number };
  /** The station's own projected pixel on that plate, and the name to print beside it. */
  station: { px: number; py: number; label: string };
  ground: string;
  ink: string;
  accent: string;
}) {
  const safe = safeBand(frame);
  const inSafe = (v: number, [lo, hi]: [number, number]) =>
    Math.max(lo, Math.min(hi, v));
  const cx = inSafe(station.px, safe.x);
  const cy = inSafe(station.py, safe.y);
  const labelY = inSafe(cy - 26, safe.y);
  const dotR = Math.max(7, Math.round(frame.width / 90));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <image
        href={plate}
        x={0}
        y={0}
        width={frame.width}
        height={frame.height}
      />
      <circle cx={cx} cy={cy} r={dotR + 5} fill={ground} opacity={0.85} />
      <circle
        cx={cx}
        cy={cy}
        r={dotR}
        fill={accent}
        stroke={ink}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={labelY}
        fill={ink}
        fontSize={22}
        fontWeight={600}
        textAnchor="middle"
        stroke={ground}
        strokeWidth={5}
        paintOrder="stroke"
      >
        {station.label}
      </text>
    </svg>
  );
}

/**
 * The CHART track. A year of the gauge's own daily readings — a real chart of real data, with an
 * axis and a scale, which is exactly what `DrawnGraphicFrame` above is forbidden from being.
 *
 * Two structural rules, both of them the reason this component looks the way it does:
 *
 *   1. **Fitted, never cropped.** The plot is an HTML box laid out in percentages; the SVG inside
 *      it carries GEOMETRY ONLY and stretches (`preserveAspectRatio="none"`). Every word is HTML at
 *      a fixed pixel size, positioned in percentages over the same box — so the line reflows with
 *      the viewport and the type never scales with it. Cropping an axis label would not be a
 *      cosmetic loss the way cropping scenery is; it would be a chart that reads wrong.
 *   2. **Everything sits inside the frame's own box** — the plot, its labels and its annotation.
 *      Nothing is reserved for the prose any more: the card travels over the whole frame, so a band
 *      kept clear at the bottom would only be bare ground (see the note where `PROSE_LANE` used to
 *      be). What the chart owes the card instead is a COMPOSITION rule — its y-axis furniture is on
 *      the LEFT, outside the card's own centred stripe, which is why the card never slices a tick
 *      label at any desktop width.
 *
 * A LINEAR y axis, deliberately, though hydrology usually reaches for a log one: the claim this
 * step makes is that the highest day is dozens of times the lowest, and a linear axis is the only
 * one that SHOWS that rather than flattening it into a comfortable curve.
 */
export function ChartFrame({
  readings,
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: {
  readings: Reading[];
  facts: GaugeFacts;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
}) {
  const { plot, viewBox } = CHART_LAYOUT;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  // The y domain is rounded UP to a round tick above the peak, so the peak sits inside the plot
  // rather than on its own top edge — and the ticks are derived from that domain, never listed.
  const step = 20000;
  const yMax = Math.ceil(facts.peak.value / step) * step;
  const yTicks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const x = (i: number) => (i / (readings.length - 1)) * viewBox.width;
  const y = (v: number) => viewBox.height - (v / yMax) * viewBox.height;
  const line = readings
    .map(
      (r, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`,
    )
    .join("");
  const area = `${line}L${viewBox.width} ${viewBox.height}L0 ${viewBox.height}Z`;

  // THE Y-AXIS GUTTER IS A `max()`, NOT A PERCENTAGE. A pure percentage gutter is a fixed-size
  // label in a shrinking box: `80,000` at 15px needs ~50px, and 13% of a 375px phone is 49px, so
  // the widest tick label runs off the left edge of the frame at exactly the width where it matters
  // most. Anchoring on `max(62px, 13%)` keeps the same proportion on a desktop and a readable floor
  // on a phone, and every horizontal position below is expressed against it — including the ones
  // that sit over a point drawn in the stretched SVG, which is why they are calc() strings rather
  // than numbers.
  const LEFT = `max(62px, ${pct(plot.left)})`;
  const RIGHT = pct(plot.right);
  const atX = (f: number) =>
    `calc(${LEFT} + ${f.toFixed(5)} * (${RIGHT} - ${LEFT}))`;
  const inFrameY = (fy: number) => plot.top + fy * (plot.bottom - plot.top);

  const peakIndex = readings.findIndex((r) => r.date === facts.peak.date);
  const peakX = atX(peakIndex / (readings.length - 1));
  const peakY = inFrameY(1 - facts.peak.value / yMax);
  const medianY = inFrameY(1 - facts.median / yMax);

  // Month starts, read off the frozen dates rather than assumed to be every 30 rows.
  const QUARTERS = ["01", "04", "07", "10"];
  const monthTicks = readings
    .map((r, i) => ({ i, month: r.date.slice(5, 7), day: r.date.slice(8, 10) }))
    .filter((r) => r.day === "01" && QUARTERS.includes(r.month))
    .map(({ i, month }) => ({
      at: atX(i / (readings.length - 1)),
      label: ["Jan", "Apr", "Jul", "Oct"][QUARTERS.indexOf(month)],
    }));

  const label = (style: CSSProperties, text: string, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        fontFamily: "Helvetica, Arial, sans-serif",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: pct(plot.top),
          width: `calc(${RIGHT} - ${LEFT})`,
          height: pct(plot.bottom - plot.top),
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            overflow: "visible",
          }}
        >
          {yTicks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={viewBox.width}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? ink : grid}
              strokeWidth={t === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={accent} opacity={0.18} />
          <path
            d={line}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            x2={viewBox.width}
            y1={y(facts.median)}
            y2={y(facts.median)}
            stroke={ink}
            strokeWidth={1}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Every word on this frame is HTML at a fixed pixel size — geometry stretches, type does not. */}
      {yTicks.map((t) =>
        label(
          {
            left: 0,
            top: `calc(${pct(inFrameY(1 - t / yMax))} - 9px)`,
            width: `calc(${LEFT} - 12px)`,
            textAlign: "right",
            fontSize: "15px",
            color: muted,
          },
          group(t),
          `y${t}`,
        ),
      )}
      {monthTicks.map((t) =>
        label(
          {
            left: t.at,
            top: `calc(${pct(plot.bottom)} + 8px)`,
            transform: "translateX(-50%)",
            fontSize: "15px",
            color: muted,
          },
          t.label,
          `x${t.label}`,
        ),
      )}
      {/* The unit sits at a fixed inset, never at `left: 0` — driving the render caught the "c" of
          "cubic" sliced by the frame's own left edge at 1600x900. */}
      {label(
        {
          left: "10px",
          top: pct(plot.top - 0.1),
          fontSize: "15px",
          color: muted,
        },
        "cubic feet per second",
        "unit",
      )}
      {label(
        {
          left: `calc(${peakX} + 14px)`,
          top: `calc(${pct(peakY)} - 10px)`,
          fontSize: "17px",
          fontWeight: 600,
          color: ink,
        },
        `${group(facts.peak.value)} on ${dayAndMonth(facts.peak.date)}`,
        "peak",
      )}
      {/* The median label carries its OWN ground chip: it sits inside the plot, on the dashed line
          it names, and without the chip the dashes strike straight through the words — visible in
          the render, invisible to every test that only checks where the label is. */}
      {label(
        {
          left: `calc(${LEFT} + 10px)`,
          top: `calc(${pct(medianY)} - 22px)`,
          fontSize: "15px",
          color: ink,
          background: ground,
          padding: "1px 5px",
        },
        `median day ${group(facts.median)}`,
        "median",
      )}
    </div>
  );
}
