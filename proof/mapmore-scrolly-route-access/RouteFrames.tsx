// The frame of the rebuilt route beat: a baked basemap plate, the route drawn as far as this step's
// own stop, and five stops of which the ones reached so far are at full strength.
//
// THREE RULES ARE STRUCTURAL HERE, and each is a defect the delivered file shipped (see BRIEF.md):
//
//   1. ONE PICTURE. The visual is built once, on step 1's frame, and `route-drive.mjs` lifts it out
//      of the frame stack on boot so the step swap cannot fade it. The first rebuild here shipped
//      five SSR'd pictures instead — guard-clean, and a slideshow: "le dessin de la ligne n'est pas
//      progressif au scroll". The delivered file inlined the same 340 KiB plate five times.
//   2. ONE PROJECTION. The plate is an `<image>` INSIDE the marks' own SVG, filling the same
//      viewBox. There is no `object-fit` anywhere in this beat, so a plate that crops under an
//      overlay that letterboxes is not a state this markup can reach.
//   3. THE DASH MEASURES IN THE PATH'S OWN UNITS. `pathLength={1}` and a fractional offset, and no
//      `vector-effect` on it — which computes a dash in screen space, where a pattern one path long
//      repeats as soon as the camera scales up.
//
// This component renders the OPENING state; `route-drive.mjs` takes it from there, scrubbing the
// reveal off `data-progress` on every animation frame. A reader with no JavaScript keeps exactly
// what is SSR'd here.

import { createElement, type ReactNode } from "react";

export const PLATE_ID = "route-access-plate";

export type Stop = {
  name: string;
  context: string;
  x: number;
  y: number;
  /** The badge sits above the mark on some stops and below on others, as the original placed it. */
  badgeDy: number;
  /** Where this stop falls along the route, as a fraction of its whole length. */
  reachedAt: number;
};

export type RouteGeometry = {
  viewBox: [number, number];
  d: string;
  stops: Stop[];
};

/** A stop the route has not reached yet is present but held back — the map only ever gains ground. */
const DIM = 0.28;

export function RouteFrame({
  geometry,
  plate,
  reveal,
  ground,
  accent,
  ink,
  muted,
}: {
  geometry: RouteGeometry;
  /** The plate's own data URI. One picture, so one copy. */
  plate: string;
  /** The opening state this frame is SSR'd in — the picture a reader without JavaScript keeps. */
  reveal: number;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}): ReactNode {
  const [width, height] = geometry.viewBox;
  const reached = reveal;

  return createElement(
    "div",
    {
      "data-visual": "route-access",
      style: { position: "absolute", inset: 0, background: ground },
    },
    // THE FALLBACK, FIRST AND UNDERNEATH: the baked plate, in its own SVG at the same viewBox and
    // the same fit as the marks, so the two describe one place whatever the live layer does. A
    // reader with no network, no key or no JavaScript keeps this picture whole.
    createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "xMidYMid meet",
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" },
      },
      createElement("image", { id: PLATE_ID, href: plate, x: 0, y: 0, width, height }),
    ),
    // The LIVE layer's container: empty in the markup, filled by `live-map.mjs` at boot, and sized
    // to the letterboxed rectangle the marks are drawn in. It sits OVER the baked plate and UNDER
    // the marks, so a reader with no network, no key or no JavaScript still gets the whole picture
    // from the raster underneath.
    createElement("div", {
      "data-part": "live",
      style: { position: "absolute", left: 0, top: 0, width: 0, height: 0 },
    }),
    createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "xMidYMid meet",
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        },
      },
      // The halo first, then the line, both on the same `d` and the same fractional offset, so the
      // halo can never lag the line it is haloing.
      createElement("path", {
        d: geometry.d,
        fill: "none",
        stroke: ground,
        strokeWidth: 11,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: 0.9,
        pathLength: 1,
        "data-part": "route-halo",
        style: { strokeDasharray: 1, strokeDashoffset: 1 - reached },
      }),
      createElement("path", {
        d: geometry.d,
        fill: "none",
        stroke: accent,
        strokeWidth: 5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        pathLength: 1,
        "data-part": "route-line",
        style: { strokeDasharray: 1, strokeDashoffset: 1 - reached },
      }),
      ...geometry.stops.map((stop, i) => {
        const arrived = reached >= stop.reachedAt;
        return createElement(
          "g",
          {
            key: stop.name,
            "data-stop": String(i + 1),
            // DECLARED, not only drawn: the driver flips this to `reached` when the line gets here,
            // and `verify-scrolly.mjs` refuses a mark still pending when the scroll ends. A picture
            // that never registers the narrative arriving is the defect this attribute exists for.
            "data-state": arrived ? "reached" : "pending",
            opacity: arrived ? 1 : DIM,
          },
          createElement("circle", {
            cx: stop.x,
            cy: stop.y,
            r: 15,
            fill: ground,
            opacity: 0.9,
          }),
          createElement("circle", {
            cx: stop.x,
            cy: stop.y,
            r: 5,
            "data-fill": "stop",
            fill: arrived ? accent : muted,
          }),
          createElement("circle", {
            cx: stop.x,
            cy: stop.y + stop.badgeDy,
            r: 16,
            "data-fill": "stop",
            fill: arrived ? accent : muted,
          }),
          createElement(
            "text",
            {
              x: stop.x,
              y: stop.y + stop.badgeDy,
              textAnchor: "middle",
              dominantBaseline: "central",
              fontSize: 16,
              fontWeight: 700,
              fill: ground,
            },
            String(i + 1),
          ),
          // INK on a light plate, with the GROUND as the halo — the delivered file painted these
          // white with a dark halo, which is furniture derived from a dark ground, over a plate that
          // is light. A halo cannot rescue text whose own colour is wrong for what it sits on.
          createElement(
            "text",
            {
              x: stop.x,
              y: stop.y + stop.badgeDy + (stop.badgeDy < 0 ? 32 : 32),
              textAnchor: "middle",
              fontSize: 19,
              fontWeight: 700,
              fill: ink,
              stroke: ground,
              strokeWidth: 5,
              paintOrder: "stroke",
            },
            stop.name,
          ),
          createElement(
            "text",
            {
              x: stop.x,
              y: stop.y + stop.badgeDy + 52,
              textAnchor: "middle",
              fontSize: 14,
              fill: muted,
              stroke: ground,
              strokeWidth: 4,
              paintOrder: "stroke",
            },
            stop.context,
          ),
        );
      }),
    ),
  );
}
