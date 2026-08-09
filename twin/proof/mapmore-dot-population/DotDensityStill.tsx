/**
 * "More than half of this map's population lives in five countries" — 920 × 1010, one frame, no
 * order. A DOT-DENSITY beat: one dot per fixed number of people, scattered inside each country's own
 * polygon, so density reads as texture rather than one flat colour per region (which is what a
 * choropleth would draw instead). See `twin-map-beat/references/types/dot-density.md`.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";

const FRAME = { width: 920, height: 1140 };
const PAD = 30;
const MAP_X = 30;
const MAP_Y = 108;

const TITLE = { fontSize: 21, fontWeight: 700, lead: 27 };
const SOURCE = { fontSize: 13, fontWeight: 400, lead: 17 };
const DOT_KEY = { fontSize: 16, fontWeight: 700 };
const NOTE = { fontSize: 11.5, fontWeight: 400, lead: 15 };
const COUNTRY_LABEL = { fontSize: 12.5, fontWeight: 700 };

export type DotDensityStillProps = {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  shapes: { key: string; parts: [number, number][][][] }[];
  dots: { key: string; points: [number, number][] }[];
  labelled: { key: string; name: string; anchor: [number, number] }[];
  dotValue: number;
  totalPopulation: number;
  totalDots: number;
  title: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  landFill: string;
};

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

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

export function DotDensityStill({
  geometry,
  plate,
  shapes,
  dots,
  labelled,
  dotValue,
  totalPopulation,
  totalDots,
  title,
  source,
  basemapCredit,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  landFill,
}: DotDensityStillProps) {
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);

  const titleTop = PAD + TITLE.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 24;

  const MAP = {
    x: MAP_X,
    y: MAP_Y,
    width: geometry.frame.width,
    height: geometry.frame.height,
  };

  const dotKeyY = MAP.y + MAP.height + 34;
  const dotKeyText = `● 1 dot = ${dotValue.toLocaleString("en-US")} people  —  ${totalDots.toLocaleString("en-US")} dots drawn for ${totalPopulation.toLocaleString("en-US")} people`;
  const dotKeyLines = wrap(dotKeyText, FRAME.width - PAD * 2, DOT_KEY);

  const caveatTop = FRAME.height - PAD - (caveatLines.length - 1) * NOTE.lead;

  if (
    dotKeyY + (dotKeyLines.length - 1) * 20 + 16 >
    caveatTop - NOTE.fontSize - 10
  )
    throw new Error(
      "the column does not fit: the dot-value key collides with the caveat.",
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      fontFamily={FONT_FAMILY}
      role="img"
    >
      <desc>{alt}</desc>
      <defs>
        <clipPath id="dot-plate-clip">
          <rect x={0} y={0} width={MAP.width} height={MAP.height} />
        </clipPath>
      </defs>

      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleTop + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceTop + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g
        transform={`translate(${MAP.x},${MAP.y})`}
        clipPath="url(#dot-plate-clip)"
      >
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />

        {/* Every study country: a light neutral fill and outline, so a reader sees the region even
            where its own dot count is too small to read as texture (dot-density.md: distribution
            WITHIN a region, which needs the region's own edge to be visible in the first place). */}
        {shapes.map((s) => (
          <path
            key={s.key}
            d={ringPath(s.parts.flat())}
            fill={landFill}
            stroke={muted}
            strokeWidth={0.6}
          />
        ))}

        {/* One dot colour for every dot — this is a univariate map (dot-density.md: "A single-value
            map uses one dot colour for every dot"). */}
        {dots.map((d) => (
          <Fragment key={d.key}>
            {d.points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={1.15} fill={accent} />
            ))}
          </Fragment>
        ))}

        {/* The five countries the title's own claim names, labelled directly on their own dot
            cluster — never a value the scale does not contain, just the country's own name. */}
        {labelled.map((l) => {
          const w = measureText(l.name, COUNTRY_LABEL);
          return (
            <g key={l.key}>
              <rect
                x={l.anchor[0] - w / 2 - 4}
                y={l.anchor[1] - 14}
                width={w + 8}
                height={16}
                fill={ground}
                opacity={0.82}
              />
              <text
                x={l.anchor[0]}
                y={l.anchor[1] - 2}
                fill={ink}
                fontSize={COUNTRY_LABEL.fontSize}
                fontWeight={COUNTRY_LABEL.fontWeight}
                textAnchor="middle"
              >
                {l.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── The dot-value key — headline-level legibility, not a footer line (dot-density.md's own
           accessibility trap: this is the ONE piece of text that turns a texture into a number). ── */}
      {dotKeyLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={dotKeyY + i * 20}
          fill={ink}
          fontSize={DOT_KEY.fontSize}
          fontWeight={DOT_KEY.fontWeight}
        >
          {line}
        </text>
      ))}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={caveatTop + i * NOTE.lead}
          fill={muted}
          fontSize={NOTE.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
