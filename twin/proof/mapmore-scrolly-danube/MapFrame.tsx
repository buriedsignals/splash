/**
 * The scrolly's own MAP frame — full-bleed, no chrome of its own (no title, no legend: the scrolly
 * scaffold's header and step prose carry those, per `twin-scrolly/references/scrolly-discipline.md`,
 * "What the graphic is allowed to be silent about" — a step's own frame never states a claim its
 * paragraph does not already state).
 *
 * Reuses the SAME bake (one fixed plate) as `mapmore-flow-danube`'s own beat — geo-discipline.md
 * rule 2: a moving "camera" here is not a re-baked tile set per step, it is the SAME plate with a
 * growing subset of territories filled and a growing slice of the route drawn, which is exactly
 * "move within the plate" (this step never moves the plate itself, only what is drawn on top of it).
 */

export type ScrollyCrossing = {
  key: string;
  colour: string;
  order: number;
  rings: [number, number][][];
  anchor: [number, number];
};

export type MapFrameProps = {
  frame: { width: number; height: number };
  plate: string;
  crossings: ScrollyCrossing[];
  route: [number, number][];
  accent: string;
  ground: string;
};

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

function routePath(route: [number, number][]): string {
  if (route.length < 2) return "";
  return (
    "M" + route.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")
  );
}

export function MapFrame({
  frame,
  plate,
  crossings,
  route,
  accent,
  ground,
}: MapFrameProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      // "meet" (contain), not "slice" (cover): the baked plate is a wide 900x420-ish frame, but the
      // scrolly scaffold's own sticky graphic box (`--graphic-h: min(70vh, 640px)` wide, capped
      // short and tall) is a much closer-to-square box at typical article widths — "slice" fills
      // that box by cropping the plate's own left/right edges away, which is where this beat's own
      // route ends: the last step's badge (9, Ukraine, the delta) sat past the crop line and never
      // rendered at all, confirmed by screenshotting the live page rather than trusting the SVG
      // markup alone. "meet" never crops real content — it letterboxes into the surrounding
      // `ground` instead, guaranteeing every badge this beat promises in prose is actually visible.
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <image
        href={plate}
        x={0}
        y={0}
        width={frame.width}
        height={frame.height}
      />

      {crossings.map((c) => (
        <path
          key={c.key}
          d={ringPath(c.rings)}
          fill={c.colour}
          fillOpacity={0.42}
          stroke={c.colour}
          strokeWidth={1.4}
        />
      ))}

      <path
        d={routePath(route)}
        fill="none"
        stroke={ground}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <path
        d={routePath(route)}
        fill="none"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {crossings.map((c) => (
        <g key={`badge-${c.key}`}>
          <circle
            cx={c.anchor[0]}
            cy={c.anchor[1]}
            r={11}
            fill={c.colour}
            stroke={ground}
            strokeWidth={2}
          />
          <text
            x={c.anchor[0]}
            y={c.anchor[1] + 4}
            fill={ground}
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
          >
            {c.order}
          </text>
        </g>
      ))}
    </svg>
  );
}
