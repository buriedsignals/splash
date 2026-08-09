/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a scrollytelling framework. It is the wiring of one
 * scroll-driven beat, written out once so the next one can be written from scratch in the same
 * shape. A scrolly is a VEHICLE, not a fourth genre of chart — and, just as importantly, not a
 * second copy of a genre that already exists: a single chart stepped through several reveal states
 * is not what earns this vehicle its keep, because a single beat that only ever shows one chart
 * should animate instead (see this skill's own `SKILL.md`, "When to use"). What a scrolly earns its
 * existence by doing is ASSEMBLING DIFFERENT MEDIA behind one narrative — a photograph, then a
 * drawn diagram, then (a real beat might add) a chart or a map — which is exactly what a single
 * beat, of any one genre, cannot do on its own.
 *
 * This file is deliberately split in two:
 *
 *   - `STEPS_META` + the two frame components (`ImageFrame`, `DrawnGraphicFrame`) are this SEED's
 *     own worked beat — a real one, not a mechanics demo: a photograph of the gauge station, then a
 *     schematic of the instrument itself, two visibly different kinds of frame carrying one small
 *     narrative. A real beat replaces all of it.
 *   - The GENERIC scaffold that assembles whatever frame a step is handed — `renderScrolly` in
 *     `scripts/render-scrolly.mjs`, `pickActiveStep`/`initScrolly` in `assets/interaction.mjs` — is
 *     this genre's own machinery and knows nothing written here. It never imports this file's own
 *     `frameKind` field, never asks whether a step's frame is a photo, a diagram, a chart or a map;
 *     it only ever renders the `ReactElement` a step hands it and toggles which one is on screen.
 *     `scripts/render-scrolly.mjs`'s own seed runner (behind its labelled CONFIG seam) is the ONE
 *     place that reads `frameKind` and turns each `STEPS_META` entry into that finished element —
 *     the same division of labour the other two chart genres keep between their own seed and their
 *     own runner, just drawn one layer earlier here because this genre's steps are not all the same
 *     shape of thing.
 *
 * Three things this genre needs that neither the static nor the web genre does:
 *
 *   1. Every step's own frame is SSR'd once, as a complete, self-contained fragment (an `<img>` or
 *      an `<svg>`, never a live DOM node the browser mutates) — the scaffold stacks all of them in
 *      the same box and only ever toggles which one is visible.
 *   2. Every step's own PROSE is plain server-rendered text, in ordinary document flow, gated by
 *      nothing — not a class, not a script, not scroll position. A reader with JavaScript off, or a
 *      screen reader user tabbing straight through the page, reaches every step's own words exactly
 *      the way a sighted reader who scrolls does. Only the GRAPHIC steps; the argument never does.
 *   3. Exactly one frame is marked `active` in the SSR'd markup itself (the first step, wired by
 *      `scripts/render-scrolly.mjs`'s own loop) — not assigned by the inline script after the page
 *      loads. That is what makes "JavaScript disabled" a real, provable state rather than a blank
 *      graphic waiting for a script that never runs.
 *
 * A seed is a real beat, not a mechanics demo (`references/scrolly-discipline.md` was written
 * against exactly this file's own first build, and rewritten against its second). This one draws a
 * real claim — the daily reading behind every "mm of flow" figure this project's other beats report
 * comes from one particular instrument, at one particular place — told across the two kinds of
 * evidence a reader would actually be shown: a photograph of the place, then a diagram of the
 * instrument. The overall claim is never withheld — see this file's own `SKILL.md`, "Architecture",
 * on why the title and source sit in their own panel, unconditional and ahead of every step's own
 * reveal, the same "the argument is never gated behind interaction" rule
 * `twin-chart-web/references/web-discipline.md` states for hover.
 *
 * Neither frame component below imports the rasteriser (`deriveFurniture`/`measureText`), the same
 * invariant the other two genres' seeds keep: `ink`/`muted`/`grid` are props, derived once in node
 * by whatever runner calls these components (`scripts/render-preview.mjs` for this skill's own
 * preview, `scripts/render-scrolly.mjs`'s own seed runner for a real beat) — never derived in here,
 * and never a second implementation of the colour rule per beat.
 */

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below. `FRAME` aside (this genre's own tuned design
// aspect, not a story's number), nothing beneath the marker is specific to the gauge station.

export type ScrollyStepMeta = {
  /** Also this step's `data-step` attribute, matching its frame and its prose section — the one
   *  string `assets/interaction.mjs` uses to keep the two in sync as the reader scrolls. */
  id: string;
  /** Which kind of frame this step hands the scaffold. The scaffold itself never reads this field —
   *  only `scripts/render-scrolly.mjs`'s own seed runner does, to decide which component to build.
   *  A real beat's own steps can mix any frame kinds it has components for; nothing about the
   *  scaffold assumes a closed set of two. */
  frameKind: "image" | "drawn";
  /** This step's own words. One or more paragraphs, rendered as plain `<p>` text in ordinary
   *  document flow — never gated behind the graphic, a class, or the inline script. See this file's
   *  own doc-comment, item 2. */
  prose: string[];
};

/** The four-step narrative this beat carries — deliberately not four states of one chart (see
 *  `frameKind` on each entry: one `"image"`, three `"drawn"`, never a repeated plot of a value
 *  against a domain). A single chart stepped through several reveals belongs to `twin-chart-web`
 *  (it animates on its own, `SKILL.md`'s own "When to use" names this explicitly); this seed exists
 *  to prove the OTHER thing a scrolly is for — carrying frames that no single chart or map
 *  component could ever be, one after the other, under one narrative. Four steps, not two, is
 *  itself a correction: a mechanism whose whole purpose is a SEQUENCE is only proven generic once
 *  it has run past the smallest case that could accidentally still be special-cased — see
 *  `references/scrolly-discipline.md`, "More than two steps." The three `"drawn"` entries share one
 *  component (`DrawnGraphicFrame`) parameterised by `waterLevelT`/`dayLabel` — a narrated water
 *  level for three different days, never a value plotted against an axis (the prohibition
 *  `DrawnGraphicFrame`'s own doc-comment states stays true: nothing here reads a domain or draws a
 *  scale, it only moves where the illustrated water sits). */
export const STEPS_META: ScrollyStepMeta[] = [
  {
    id: "photograph",
    frameKind: "image",
    prose: [
      "Every reading in this project's other beats — the mm of flow, the year-over-year rise or fall — comes from one physical place: a gauge station where two feeder streams meet, photographed here from the ridge above it.",
    ],
  },
  {
    id: "instrument",
    frameKind: "drawn",
    prose: [
      "The instrument itself is simpler than the numbers suggest: water rises against a staff marked in centimetres, and a reading is taken once a day by hand — the raw measurement behind every figure this project reports.",
    ],
  },
  {
    id: "flood",
    frameKind: "drawn",
    prose: [
      "On a flood day the same staff tells a different story: the water climbs well past its ordinary mark, and the reading taken that morning is the one that ends up flagged in every downstream report.",
    ],
  },
  {
    id: "drought",
    frameKind: "drawn",
    prose: [
      "In a dry spell the staff shows almost nothing at all — the water drops close to the base of the post, and a reading that low is exactly what a decade of these daily numbers exists to catch early.",
    ],
  },
];
// =========================================

/** This genre's own design aspect — the box `DrawnGraphicFrame`'s own `viewBox` is drawn against
 *  and the size `scripts/render-preview.mjs` rasterises at. It is NOT the size any frame actually
 *  renders at in the real page: there, both `ImageFrame` and `DrawnGraphicFrame` fill whatever box
 *  the scaffold's full-bleed sticky graphic gives them (`object-fit: cover` / `preserveAspectRatio:
 *  xMidYMid slice`), because the graphic is the ground now — full-bleed behind the reader's own
 *  scroll, not a fixed card beside it. See `references/scrolly-discipline.md`, "The one gotcha," for
 *  why full-bleed-behind is the shape this genre ships instead of a two-column layout. */
export const FRAME = { width: 640, height: 900 };

/**
 * A plain, full-bleed image frame — the stand-in this toolchain uses for a photograph. Nothing in
 * this project generates or fetches images yet (`SKILL.md`'s own "When to use" names the gap
 * explicitly), so a step whose evidence is a photograph embeds one directly, exactly the way a
 * step whose evidence is a chart embeds an SVG. The scaffold that stacks this alongside
 * `DrawnGraphicFrame` never has to know that: both are just a `ReactElement` it renders once and
 * shows or hides.
 *
 * Marked `alt=""` on purpose, not with a caption — the wrapper `renderScrolly` puts every frame in
 * is `aria-hidden` regardless of kind (see that file's own header note), so a meaningful `alt` here
 * would never reach a screen reader anyway; the argument this beat makes is carried by the prose,
 * not by any one frame's own description. See `references/scrolly-discipline.md`, "What the graphic
 * is allowed to be silent about."
 */
export function ImageFrame({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

/**
 * A drawn, full-bleed schematic — this genre's own minimal graphic, the one thing under this skill
 * that still needs to render standalone with nothing else on disk (the constraint `test/canon.test.ts`
 * enforces: `render-preview.mjs` rasterises exactly this component, from this file alone). It is a
 * diagram of the instrument, not a chart of a series: no axis, no data-driven reveal, nothing that
 * plots a value against a domain — the shape this rule needs to stay clear of is a second copy of
 * `twin-chart-beat`'s or `twin-chart-web`'s own "line traced against a scale" geometry, and this
 * component draws neither. `waterLevelT`/`dayLabel` do not change that: they move where the
 * illustrated water sits and name which day is shown, the same way three different photographs
 * would — there is still no scale drawn, no tick mapped to a number, nothing a reader could read a
 * value off of. This is what lets three of `STEPS_META`'s own four steps share this one component
 * (`instrument`/`flood`/`drought`) without becoming three states of one chart: they are three
 * illustrations, not three samples of a series.
 *
 * Paints only with `ground`/`ink`/`muted`/`accent`, the same closed-palette rule every chart genre
 * in this twin keeps — nothing here is a hard-coded hex. `preserveAspectRatio="xMidYMid slice"` is
 * what lets this same SVG fill an arbitrary full-bleed box in the real page without distorting the
 * drawing, the vector equivalent of `ImageFrame`'s own `object-fit: cover`.
 */
export function DrawnGraphicFrame({
  ground,
  ink,
  muted,
  accent,
  waterLevelT = 0.58,
  dayLabel,
}: {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  /** Fraction of `FRAME.height` where the illustrated water sits — smaller means higher water
   *  (closer to the top of the frame). Purely illustrative: it moves a fill and a dot, never a
   *  value plotted against a labelled scale. Defaults to this seed's own original reading. */
  waterLevelT?: number;
  /** Optional word naming which day this reading belongs to ("today", "flood day", "dry spell") —
   *  drawn as plain text next to the reading dot, the same register as the existing "flow"/"cm"
   *  labels already on this diagram, never a number a reader could mistake for an axis tick. */
  dayLabel?: string;
}) {
  const { width, height } = FRAME;
  const bankTop = height * 0.52;
  const waterTop = height * waterLevelT;
  const staffX = width * 0.46;
  const staffTop = height * 0.24;
  const staffBottom = height * 0.74;
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = i / (tickCount - 1);
    return staffTop + t * (staffBottom - staffTop);
  });

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

      {/* The channel: a flat bank, a flat body of water — no gradient wash, the same "the field is
          flat" rule every chart and map ground in this twin keeps. */}
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
      <text x={staffX + 24} y={staffTop + 6} fill={muted} fontSize={18}>
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

      {/* Flow direction. */}
      <line
        x1={width * 0.66}
        x2={width * 0.86}
        y1={waterTop + 30}
        y2={waterTop + 30}
        stroke={ink}
        strokeWidth={2.5}
        markerEnd="url(#scrolly-seed-arrow)"
      />
      <text x={width * 0.66} y={waterTop + 56} fill={muted} fontSize={16}>
        flow
      </text>

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
