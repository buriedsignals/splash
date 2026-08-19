// The frame of the rebuilt route beat: a baked basemap plate, the route drawn as far as this step's
// own stop, and five stops of which the ones reached so far are at full strength.
//
// THREE RULES ARE STRUCTURAL HERE, and each is a defect the delivered file shipped (see BRIEF.md):
//
//   1. ONE PLATE. Step 1's frame defines the `<image>`; every other frame `<use>`s it. The delivered
//      file inlined the same 340 KiB five times — 1.33 MB of a 1.80 MB page.
//   2. ONE PROJECTION. The plate is an `<image>` INSIDE the marks' own SVG, filling the same
//      viewBox. There is no `object-fit` anywhere in this beat, so a plate that crops under an
//      overlay that letterboxes is not a state this markup can reach.
//   3. THE DASH MEASURES IN THE PATH'S OWN UNITS. `pathLength={1}` and a fractional offset, and no
//      `vector-effect` on it — which computes a dash in screen space, where a pattern one path long
//      repeats as soon as the camera scales up.
//
// There is no runtime script. Each step is a finished picture, so nothing has to find its own copy
// of the visual at read time and nothing can bind the wrong one.

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
  index,
  ground,
  accent,
  ink,
  muted,
}: {
  geometry: RouteGeometry;
  /** The plate's own data URI — passed on the DEFINING frame only; the others reference it by id. */
  plate?: string;
  index: number;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}): ReactNode {
  const [width, height] = geometry.viewBox;
  const reached = geometry.stops[index].reachedAt;

  return createElement(
    "div",
    { style: { position: "absolute", inset: 0, background: ground } },
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
      plate
        ? createElement("image", {
            id: PLATE_ID,
            href: plate,
            x: 0,
            y: 0,
            width,
            height,
          })
        : createElement("use", { href: `#${PLATE_ID}` }),
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
        const arrived = i <= index;
        return createElement(
          "g",
          {
            key: stop.name,
            "data-stop": String(i + 1),
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
            fill: arrived ? accent : muted,
          }),
          createElement("circle", {
            cx: stop.x,
            cy: stop.y + stop.badgeDy,
            r: 16,
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
