/**
 * THE SCROLLY'S OWN MAP FRAME — one persistent picture, in four layers, with a LIVE MapTiler
 * basemap under this beat's own drawing.
 *
 * The structure is what makes the ruling and the owner's two instructions the same object:
 *
 *   camera            TWO boxes the size of the PLATE (900 × 420), moved by the same single CSS
 *                     transform — the baked plate in the lower one, this beat's own shapes in the
 *                     upper one, with the LIVE MAP between them. They carry one `data-part` and the
 *                     driver writes both, so they cannot fall out of register.
 *     img             the baked plate — now the FALLBACK layer (ruling R1 extended to the scrolly,
 *                     2026-08-10), underneath the live tiles rather than instead of them. With no
 *                     script, no key, no network or a MapTiler failure, this is what a reader sees,
 *                     which is exactly the picture this beat shipped before the ruling.
 *   live              the LIVE MapTiler map, filling the whole frame — the owner's *"il faut tout
 *                     le temps utiliser MapTiler"* and *"la map doit prendre toute la largeur"*.
 *                     `interactive: false`: the scroll is the only thing that drives this piece.
 *     svg             the nine territory shapes and the route, once. VECTOR, in plate units, moved
 *                     by the camera transform — so they stay registered with the live tiles without
 *                     being re-projected, because both cameras are derived from one number in one
 *                     place (`live-scroll-map.mjs`'s `viewForCamera`).
 *   leaders           frame-pixel lines, outside the camera, drawn only for a badge the prose
 *                     card's own edge pushed off its anchor.
 *   badge             HTML, at a FIXED pixel size, positioned by the driver in frame pixels. Never
 *                     SVG text any more: a numeral inside the camera scales with it, and at 375px
 *                     the contain fit is 0.42, which drew a 12px numeral at 5px. The move also buys
 *                     the badges `avoidStripe`, which an in-camera mark cannot have.
 *   credit            the basemap attribution, at the BOTTOM of the visual. It is not decoration:
 *                     `attributionControl: false` takes MapLibre's own credit off, so the beat owes
 *                     it here.
 *
 * WHAT THE CAMERA IS AND WHY IT IS WRITTEN DOWN. This frame used to be a single
 * `<svg preserveAspectRatio="xMidYMid meet">` at `width:100%;height:100%` — a contain fit performed
 * by the browser, with no scale and no offset anywhere in the code. That is fine for a plate and
 * impossible for live tiles: a map under an implicit fit lands wherever it lands. The same fit is
 * now computed by `route-drive.mjs`'s `containCamera`, and the SSR'd transform below is that
 * function called with a NOMINAL frame — the driver recomputes against the real box on its first
 * paint, so this only decides what a reader with no JavaScript sees.
 *
 * It stays a CONTAIN fit, and the reason is a defect this beat has already had: `slice` (cover)
 * cropped the plate's own right edge away and the last badge — 9, Ukraine, the delta — never
 * rendered at all. Cropping is not available to this frame.
 */

import {
  MAX_SCALE,
  arrivalOpacity,
  containCamera,
  drawnSoFar,
  lengthFractionAt,
  routePath,
  project,
  revealAt,
  strokeWidthsFor,
} from "./route-drive.mjs";
import { TERRITORY_FILL_OPACITY, numeralInk } from "./geo-flow.ts";

export type ScrollyCrossing = {
  key: string;
  colour: string;
  order: number;
  rings: [number, number][][];
  anchor: [number, number];
  /** Route index where the river first reaches this territory, and where it finishes arriving. */
  from: number;
  to: number;
};

export type MapFrameProps = {
  frame: { width: number; height: number };
  plate: string;
  crossings: ScrollyCrossing[];
  /** The WHOLE route, always. What is DRAWN is the part reached — see `drawnSoFar`. */
  route: [number, number][];
  routeLength: number;
  cum: number[];
  stops: number[];
  accent: string;
  ground: string;
  ink: string;
  muted: string;
  credit: string;
};

const FONT = "Helvetica, Arial, sans-serif";

/** The SSR frame. The driver recomputes against the real box on its first paint, so this only ever
 *  decides the no-JavaScript picture — at roughly the shape this beat is verified widest at. */
const NOMINAL = { width: 1600, height: 820 };

function ringPath(rings: [number, number][][]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
        "Z",
    )
    .join("");
}

export function MapFrame({
  frame,
  plate,
  crossings,
  route,
  routeLength,
  cum,
  stops,
  accent,
  ground,
  ink,
  muted,
  credit,
}: MapFrameProps) {
  // `frame` is the PLATE's own size — the name the bake's `geometry.json` gives it, kept. The box
  // it is fitted INTO is the reader's, and at SSR time that is only ever the nominal one.
  const plateSize = frame;
  const camera = containCamera(NOMINAL, plateSize, MAX_SCALE);
  const transform = `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`;
  // The line weights, in the SVG's own user units, for THIS camera — the same function the driver
  // calls on every paint. SSR'd at the nominal camera only, exactly like the transform above and
  // the badge positions below: what a reader with JavaScript gets is recomputed against their own
  // box on the first paint.
  const strokes = strokeWidthsFor(camera);
  const boxStyle = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: `${frame.width}px`,
    height: `${frame.height}px`,
    transformOrigin: "0 0",
    transform,
  };
  // The opening state, SSR'd: the reveal at progress 0, which is the first step's own picture and
  // the one a reader with no JavaScript keeps.
  const reveal0 = revealAt(stops, 0, false);
  // WHAT IS DRAWN AT THE OPENING STEP — the points the river has reached, not the whole line under
  // a dash. `lengthFractionAt` is kept: it is the measurement, and it is now what selects the
  // points instead of what sizes an offset.
  const d = routePath(drawnSoFar(route, cum, lengthFractionAt(cum, reveal0)));

  return (
    <div
      data-visual="danube-route"
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      {/* THE CREDIT'S WIDTH IS THE CARD'S GUTTER, and it needs a media query because the card has
          two width regimes and an inline style cannot ask which one is in force. Below 600px the
          card is edge to edge and has no interior edge at all, so the credit may use the width it
          always had; at or above 600px the card is `min(46ch, 100%)` centred, so the free gutter
          beside it is `50% - 205px` and the credit is capped inside that. Covered whole by a card
          is allowed; sliced down the side by one of its vertical edges is not. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            '[data-visual="danube-route"] [data-part=credit]{max-width:60%}' +
            '@media (min-width:600px){[data-visual="danube-route"] [data-part=credit]{max-width:calc(50% - 250px)}}',
        }}
      />

      {/* LAYER 1 — the baked plate, the fallback. Kept UNDER the live map rather than replaced by
          it: a rotated key, a spending limit, a CMS that refuses api.maptiler.com or a reader with
          no network gets this, at the right camera, with every shape and badge still on it. */}
      <div data-part="camera" data-layer="plate" style={boxStyle}>
        <img
          src={plate}
          width={frame.width}
          height={frame.height}
          alt=""
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>

      {/* LAYER 2 — the live MapTiler map, the full width and the full height of the frame. Empty
          until `live-scroll-map.mjs` fills it, and revealed only once the camera has been warmed,
          so the first thing the reader meets is not a tile fetch. */}
      <div
        data-part="live"
        style={{ position: "absolute", inset: 0, opacity: 0 }}
      />

      {/* LAYER 3 — this beat's own drawing, in the SAME plate units under the SAME transform. */}
      <div
        data-part="camera"
        data-layer="marks"
        style={{ ...boxStyle, pointerEvents: "none" }}
      >
        <svg
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          width={frame.width}
          height={frame.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {crossings.map((c) => (
            <path
              key={c.key}
              data-territory={c.key}
              d={ringPath(c.rings)}
              fill={c.colour}
              fillOpacity={TERRITORY_FILL_OPACITY}
              stroke={c.colour}
              // 1.4 SCREEN pixels, divided back out of the camera's CSS scale — `STROKE_SCREEN_PX`
              // carries the number and the measurement. `vectorEffect` is KEPT and is not what
              // holds this: it neutralises the viewBox transform, which is the identity here, and
              // it does nothing about the CSS `scale()` on the ancestor camera box. Believing
              // otherwise is what drew this outline at 0.58px on a phone.
              strokeWidth={strokes.territory}
              vectorEffect="non-scaling-stroke"
              // The SAME arrival rule the driver uses, not a second reading of it: `from <=
              // reveal` and `arrivalOpacity` disagree at exactly the boundary, and the boundary is
              // where every authored state sits. Measured before this was one function: the no-JS
              // page showed FOUR badges at the opening step where the driven page shows three.
              style={{ opacity: arrivalOpacity(reveal0, c.from, c.to) }}
            />
          ))}

          {/* THE ROUTE, DRAWN FROM THE POINTS IT HAS REACHED. Two paths, one halo and one accent,
              carrying the SAME `d` — so the halo can never lag the line it is haloing — rebuilt on
              every paint from `drawnSoFar(route, cum, fraction)`.

              THIS USED TO BE A DASH, and the dash is why this comment is long. The whole line was
              drawn and hidden by a `stroke-dasharray` one path long whose offset ran to zero. It
              works only while the pattern is measured in the space the path's length lives in, and
              the camera scales the plate to the reader's frame: with `vector-effect:
              non-scaling-stroke` on these paths the pattern was computed in SCREEN space, came out
              shorter than the line, and REPEATED — head, hole and tail, all sliding together. That
              cost six hours and five wrong diagnoses, and it never reproduced in this tree's own
              headless runs because their scale sat near 1. The fix was `pathLength={1}` plus
              `vector-effect` removed from these two paths only — a discipline every future author
              of a route beat had to remember, in a file where the same attribute is CORRECT one
              element up, on the territory outlines.

              Re-generating the path cannot have the defect: there is no pattern to compute in the
              wrong space, no `pathLength` to normalise, and nothing to remember. It is
              `chart-video`'s own mechanism — eleven beats there reveal a line this way and needed no
              doctrine — carried back here, which is the direction the traffic had never run.
              `drawnSoFar` walks by LENGTH rather than by index, because these 911 samples are not
              evenly spaced; see its own header. */}
          <path
            data-part="route"
            data-layer="halo"
            d={d}
            fill="none"
            stroke={ground}
            strokeWidth={strokes.halo}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          <path
            data-part="route"
            data-layer="line"
            d={d}
            fill="none"
            stroke={accent}
            strokeWidth={strokes.route}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Leader lines, in FRAME pixels — outside the camera, so they are never scaled. Empty until
          the prose card pushes a badge off its own anchor. */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          data-part="leaders"
          d=""
          fill="none"
          stroke={ink}
          strokeWidth={1}
        />
      </svg>

      {/* THE BADGES, at a fixed pixel size. SSR'd at the nominal camera so a no-JavaScript reader
          gets the opening step's own numbering; the driver repositions them against the real box
          and moves any that the prose card's edge would slice. */}
      {crossings.map((c) => {
        const [x, y] = project(c.anchor, camera);
        return (
          <div
            key={`badge-${c.key}`}
            data-badge={c.key}
            style={{
              position: "absolute",
              left: `${x.toFixed(1)}px`,
              top: `${y.toFixed(1)}px`,
              transform: "translate(-50%, -50%)",
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: c.colour,
              border: `2px solid ${ground}`,
              color: numeralInk(c.colour),
              fontFamily: FONT,
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              opacity: arrivalOpacity(reveal0, c.from, c.to),
              pointerEvents: "none",
            }}
          >
            {c.order}
          </div>
        );
      })}

      {/* THE BASEMAP CREDIT, anchored to the frame's own floor. `attributionControl: false` removes
          MapLibre's own, so the obligation lands here — and at the BOTTOM of the visual rather than
          under the header (owner feedback B1.1), where a `top` percentage of a frame whose height
          changes with the header's wrap put it in the middle of the map at one width and over a
          badge at another. */}
      <div
        data-part="credit"
        style={{
          position: "absolute",
          left: "2%",
          bottom: "8px",
          fontFamily: FONT,
          fontSize: "12px",
          color: muted,
          background: ground,
          padding: "3px 6px",
          borderRadius: "2px",
        }}
      >
        {credit}
      </div>
    </div>
  );
}
