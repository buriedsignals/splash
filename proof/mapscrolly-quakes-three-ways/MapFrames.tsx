/**
 * The FOUR map frames this beat steps through — the same 14,057 earthquakes and the same baked
 * camera, drawn four different ways: raw dots, hexagons shaded by COUNT, proportional symbols for
 * the largest events, and the same hexagons shaded by their STRONGEST event.
 *
 * Two decisions here depart from the vehicle's own seed, and both are deliberate.
 *
 * **1. The MARKS are FITTED, not COVER-cropped — and since 2026-08-10 the BASEMAP under them is
 * live and fills the frame.** `scrolly-discipline.md` says scenery is cropped and evidence is
 * fitted, and files a basemap under scenery. That is right for a locator, whose plate is a backdrop
 * for one marked point. It is wrong for the marks here: this plate carries 14,057 of them spread
 * from Chile to Kamchatka, and COVER at a phone's aspect (0.46 against the plate's 1.61) would show
 * about a quarter of the world's width — cropping away most of the events the beat counts. So the
 * mark layer is fitted (`preserveAspectRatio="xMidYMid meet"`), which is also what
 * `mapmore-scrolly-danube` chose, for the same reason, after its own last badge was cropped off.
 * The live MapTiler tiles under it fill the container edge to edge, which is what the owner asked
 * for (*"la map doit prendre toute la largeur"*); `BRIEF.md` records exactly what fills what.
 *
 * **1b. The plate and the marks are now TWO layers, not one SVG.** They were one `<svg>` with the
 * basemap `<image>` and the marks inside it. They are split so the live layer can hide the plate
 * and keep the marks: `[data-part=plate]` is the FALLBACK (with the ground it letterboxes against),
 * `[data-part=marks]` is this beat's own drawing. Both carry the SAME viewBox and the SAME
 * `preserveAspectRatio`, so the browser resolves ONE fit for both and they cannot drift from each
 * other — and a reader with no JavaScript still gets a correctly fitted map at every width, which a
 * script-written CSS transform would have cost. `live-scroll-map.mjs`'s `fitCamera` restates that
 * same fit in numbers for the live camera and MEASURES the two against each other.
 *
 * **2. It is fitted into the WHOLE frame.** It used to be fitted into the top `CONTENT_TOP` of the
 * graphic, so that every dot, hexagon and symbol sat above a band reserved for a prose panel parked
 * at the bottom. The ninth correction of the vehicle puts the prose card back OVER the visual and
 * lets it travel the whole height, so no band can be reserved from it (see
 * `scrolly/references/scrolly-discipline.md`, "What the card covers") — and a band reserved
 * from nothing is 28% of every frame spent on bare ground. Fitted into the frame, the plate is
 * larger at every viewport and still whole, because FIT never crops.
 *
 * **No text is drawn on the map.** Type inside the SVG would scale with the plate — 15px on a
 * desktop is 6px on a phone — so every word on these frames is HTML at a fixed pixel size, and the
 * only HTML that can be placed without knowing where the fitted plate landed is the legend, which
 * sits in the frame's own corner. Everything the reader needs to name is named in the step's prose,
 * and the cells the prose names are RINGED in the accent, which is the rule that closes the gap
 * this project logged against a sibling beat: a highlighted hexagon with nothing said about it.
 */

import type { ReactNode } from "react";
import { hexCorners } from "./geo-hex.ts";
import type { QuakeCell, QuakeFacts } from "./quake-encodings.ts";
import { classOf, energyRadius } from "./quake-encodings.ts";

const FONT = "Helvetica, Arial, sans-serif";
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export type Furniture = {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

type Frame = { width: number; height: number };

function hexPath(cell: { cx: number; cy: number }, size: number) {
  return (
    hexCorners(cell.cx, cell.cy, size)
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join("") + "Z"
  );
}

/** The one CSS rule this beat owns, emitted once (it is a document-level stylesheet, so where in
 *  the stack it sits does not matter). When `live-scroll-map.mjs` has warmed its camera and
 *  revealed the tiles, it puts `qm-live` on the document element and every frame's fallback plate —
 *  the baked basemap AND the ground it letterboxes against — goes to zero, in ONE place rather than
 *  four kept in step. Without the script, without a key, without a network or with a MapTiler
 *  failure, the class is never added and the plate is what a reader sees. */
const LIVE_STYLE = "html.qm-live [data-part=plate]{opacity:0}";

/**
 * The shell every frame shares: the fallback plate, this beat's own mark layer over it, and a
 * legend in the corner. `children` is the mark layer's contents, in PLATE coordinates.
 *
 * `live` is passed on the FIRST frame only, and it carries two things into the delivered file: the
 * empty container the live map is constructed in (moved out of the frame stack at boot — see
 * `live-scroll-map.mjs`, "the live layer lives OUTSIDE the frame stack"), and the stylesheet above.
 */
function PlateFrame({
  plate,
  frame,
  ground,
  legend,
  live,
  annotations,
  children,
}: {
  plate: string;
  frame: Frame;
  ground: string;
  legend?: ReactNode;
  live?: boolean;
  annotations?: ReactNode;
  children: ReactNode;
}) {
  const fit = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block" as const,
  };
  return (
    <div
      data-frame="quakes"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      {live ? (
        <>
          {/* This beat's two document-level rules, emitted once. The second has nothing to do with
              the live map — it is the legend's answer to the vehicle's travelling card — and rides
              here because a frame component has one place to put a stylesheet. */}
          <style
            dangerouslySetInnerHTML={{
              __html: LIVE_STYLE + LEGEND_STRIPE_STYLE,
            }}
          />
          {/* The live MapTiler map's own container. Empty here, and empty in the committed file:
              the map is constructed into it at boot, and only once the plan's key placeholder has
              been substituted by `deliver`.

              ITS BOX IS AN INLINE STYLE, and that is a defect this beat shipped for one render.
              maplibre-gl puts its own `.maplibregl-map { position: relative }` on this element, and
              that rule has the same specificity as a `[data-part=live]` rule in a stylesheet — so
              whichever the page carries LAST wins, and the library's own CSS is inlined after this
              beat's. Measured: the container computed `position: relative; height: 0`, and MapLibre
              fell back to a 300px canvas inside an 806px graphic. An inline style outranks both. */}
          <div
            data-part="live"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
          />
        </>
      ) : null}

      {/* LAYER 1 — the FALLBACK: the baked plate and the ground it letterboxes against. Under the
          live tiles rather than replaced by them, so a rotated key, a spending limit, a CMS that
          refuses api.maptiler.com or a reader with no network gets exactly the picture this beat
          shipped before the ruling, with every mark still registered on it. */}
      <div data-part="plate" style={{ ...fit, background: ground }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={fit}
        >
          <image
            href={plate}
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
          />
        </svg>
      </div>

      {/* LAYER 2 — this beat's own drawing, in the SAME plate units under the SAME declared fit, so
          it stays registered with the live tiles without being re-projected.

          THE SURFACE AND THE ANNOTATION ARE TWO GROUPS, and the split earns its keep exactly once a
          world can be on screen twice. `[data-part=surface]` is the DATA — 14,057 dots, 156
          hexagons, 28 circles — and `live-scroll-map.mjs` draws it again in every world copy
          MapLibre paints beside the middle one, because a repeated coast with no events on it
          contradicts a paragraph counting them. The ANNOTATION — the one ring the step's own
          sentence names — is NOT repeated: this beat's rule is "exactly one cell is ringed on
          exactly the frame whose paragraph names it" (BRIEF, craft decision 3, earned from a defect
          logged against `map-quake-density`), and driven at 1600×900 the repeat put a second ringed
          hexagon in the right-hand band, 1,296px from the first, with nothing said about it. */}
      <svg
        data-part="marks"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={fit}
      >
        <g data-part="surface">{children}</g>
        {annotations}
      </svg>
      {legend}
    </div>
  );
}

/**
 * The legend: HTML at a fixed pixel size, anchored to the FRAME's own TOP-left corner — never to
 * the plate, whose position inside the band depends on the viewport's aspect and is not knowable at
 * render time.
 *
 * **Top-left, because bottom-left collided.** Sitting just above what used to be the prose lane, it
 * was inside the pinned panel's own box at 375×812 — measured, 36 collisions across the sampled
 * positions. Top-left is bare ground at narrow widths (the fitted plate is letterboxed vertically)
 * and the Bering Sea and the Arctic at wide ones, which is the emptiest corner this camera has.
 *
 * **AND IT IS NOT OUTSIDE THE CARD'S STRIPE AT EVERY WIDTH, which this file used to claim.** The
 * claim was checked at 1600, 1280 and 375 and is true at all three; it is false in the band
 * between. Above 600px the vehicle's card is a 410px reading measure CENTRED, so its left edge sits
 * at `W/2 − 205`, which is inside a legend running 14px…208px whenever `438 < W < 826`. Driven at
 * 768×1024, both directions: the card's left edge landed at x=179, inside the legend's 14…208, on
 * 7 frames going down and 8 coming back — the exact defect the ninth correction names, a legend
 * SLICED down its side rather than covered whole.
 *
 * The answer is the vehicle's own rule rather than a new one: a thing the card can reach belongs
 * either comfortably outside the stripe or WHOLLY INSIDE it, never straddling an edge. Below 826px
 * the legend cannot be outside — there is not room — so it moves to the middle, where the card is
 * 410px wide and the legend is 194px, and a crossing card covers it whole. Written as a media
 * query rather than as script, because it has to hold with no JavaScript too, and centred with a
 * transform rather than an offset so it stays true if the legend's own width ever changes.
 *
 * `!important` IS LOAD-BEARING and is not a shortcut. The legend's own box is an INLINE style (it
 * has to be: it is the placement the frame ships with, and it must hold if this stylesheet is ever
 * absent), and a normal declaration in a stylesheet loses to a style attribute however specific its
 * selector. Written without it, the first attempt applied the TRANSFORM and not the `left`, so the
 * legend was pulled half its own width off the frame's left edge and clipped — photographed at
 * 768×1024 with "…per hexagon" cut mid-word, which is the same broken furniture in a different
 * costume. An important author declaration is the one thing in the cascade that outranks a normal
 * inline one.
 */
export const LEGEND_STRIPE_STYLE =
  "@media (min-width:600px) and (max-width:829px){" +
  "[data-frame=quakes] [data-part=legend]{left:50%!important;transform:translateX(-50%)}}";

function Legend({
  title,
  ramp,
  labels,
  ink,
  muted,
  ground,
}: {
  title: string;
  ramp: string[];
  labels: string[];
  ink: string;
  muted: string;
  ground: string;
}) {
  return (
    <div
      data-part="legend"
      style={{
        position: "absolute",
        left: "14px",
        top: "12px",
        fontFamily: FONT,
        background: ground,
        padding: "6px 8px",
        borderRadius: "3px",
      }}
    >
      <div style={{ fontSize: "13px", color: ink, marginBottom: "4px" }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {ramp.map((c, i) => (
          <div
            key={i}
            style={{ width: "34px", height: "11px", background: c }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {labels.map((l, i) => (
          <div
            key={i}
            style={{
              width: "34px",
              fontSize: "11px",
              color: muted,
              textAlign: "center",
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The one ring a step's own paragraph names, drawn twice — a ground-coloured halo under an accent
 *  stroke — so it reads against the darkest cell in the ramp as well as the lightest. Passed to
 *  `PlateFrame` as the ANNOTATION rather than as part of the surface, so it is never repeated into
 *  a world copy: see `PlateFrame`'s own note on the split. */
function Rings({
  cells,
  size,
  ground,
  accent,
}: {
  cells: QuakeCell[];
  size: number;
  ground: string;
  accent: string;
}) {
  return (
    <g data-part="annotation">
      {cells.map((c) => (
        <g key={`ring-${c.key}`}>
          <path
            d={hexPath(c, size)}
            fill="none"
            stroke={ground}
            strokeWidth={7}
          />
          <path
            d={hexPath(c, size)}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
          />
        </g>
      ))}
    </g>
  );
}

// ===== 1. Every event, one dot. =====

/**
 * All 14,057 projected events, as one `<path>`.
 *
 * **Why one path and not 14,057 `<circle>`s.** This file is delivered inline in a self-contained
 * HTML, so the mark layer's own byte weight is the reader's download. Written as circles it is
 * about 480 kB; written as zero-length subpaths (`M x y h0`) with a round line cap it is about
 * 240 kB, and every mark is still a perfect ROUND dot exactly `strokeWidth` across — a zero-length
 * subpath with `stroke-linecap: round` renders as a dot, which is what that cap is specified to do.
 *
 * Overplotting is not hidden: at this scale the dense rims saturate into a solid shape, and that is
 * exactly the limitation the step's own prose states before the next step fixes it.
 */
export function DotFrame({
  plate,
  frame,
  points,
  ground,
  accent,
  live,
}: Furniture & {
  plate: string;
  frame: Frame;
  points: { px: number; py: number }[];
  live?: boolean;
}) {
  const d = points
    .map((p) => `M${p.px.toFixed(1)} ${p.py.toFixed(1)}h0`)
    .join("");
  return (
    <PlateFrame plate={plate} frame={frame} ground={ground} live={live}>
      <path
        d={d}
        stroke={accent}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeOpacity={0.55}
        fill="none"
      />
    </PlateFrame>
  );
}

// ===== 2. The same events, binned — shaded by COUNT. =====

export function HexCountFrame({
  plate,
  frame,
  facts,
  ramp,
  legendLabels,
  ringed,
  ground,
  ink,
  muted,
  accent,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  ramp: string[];
  legendLabels: string[];
  ringed: QuakeCell[];
}) {
  return (
    <PlateFrame
      plate={plate}
      frame={frame}
      ground={ground}
      legend={
        <Legend
          title="earthquakes per hexagon"
          ramp={ramp}
          labels={legendLabels}
          ink={ink}
          muted={muted}
          ground={ground}
        />
      }
      annotations={
        <Rings
          cells={ringed}
          size={facts.hexSize}
          ground={ground}
          accent={accent}
        />
      }
    >
      {facts.cells.map((c) => (
        <path
          key={c.key}
          d={hexPath(c, facts.hexSize)}
          fill={ramp[classOf(c.count, facts.countBreaks)]}
          fillOpacity={0.85}
          stroke={ground}
          strokeWidth={0.4}
        />
      ))}
    </PlateFrame>
  );
}

// ===== 3. Only the largest events, sized by the energy their magnitude implies. =====

export function SymbolFrame({
  plate,
  frame,
  facts,
  maxRadius,
  ground,
  accent,
  ink,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  maxRadius: number;
}) {
  // Largest drawn LAST would bury the small ones under it; smallest last keeps every circle's own
  // outline visible where two overlap, which is the readability complaint this project has already
  // logged against a proportional-symbol beat.
  const drawn = [...facts.bigEvents].sort((a, b) => b.point.mag - a.point.mag);
  return (
    <PlateFrame plate={plate} frame={frame} ground={ground}>
      {drawn.map((e, i) => (
        <circle
          key={`${e.px}-${e.py}-${i}`}
          cx={e.px}
          cy={e.py}
          r={energyRadius(e.point.mag, facts.maxMag, maxRadius)}
          fill={accent}
          fillOpacity={0.55}
          stroke={ink}
          strokeWidth={0.9}
        />
      ))}
    </PlateFrame>
  );
}

// ===== 4. The same hexagons, shaded by their STRONGEST event. =====

export function HexStrengthFrame({
  plate,
  frame,
  facts,
  ramp,
  legendLabels,
  ringed,
  ground,
  ink,
  muted,
  accent,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  ramp: string[];
  legendLabels: string[];
  ringed: QuakeCell[];
}) {
  return (
    <PlateFrame
      plate={plate}
      frame={frame}
      ground={ground}
      legend={
        <Legend
          title="strongest event in the hexagon"
          ramp={ramp}
          labels={legendLabels}
          ink={ink}
          muted={muted}
          ground={ground}
        />
      }
      annotations={
        <Rings
          cells={ringed}
          size={facts.hexSize}
          ground={ground}
          accent={accent}
        />
      }
    >
      {facts.cells.map((c) => (
        <path
          key={c.key}
          d={hexPath(c, facts.hexSize)}
          fill={ramp[classOf(c.maxMag, facts.magBreaks)]}
          fillOpacity={0.85}
          stroke={ground}
          strokeWidth={0.4}
        />
      ))}
    </PlateFrame>
  );
}
