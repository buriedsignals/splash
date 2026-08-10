/**
 * "More than half of this map's population lives in five countries" — 920 × 1140, one frame, no
 * order. A DOT-DENSITY beat: one dot per fixed number of people, scattered inside each country's own
 * polygon, so density reads as texture rather than one flat colour per region (which is what a
 * choropleth would draw instead). See `twin-map-beat/references/types/dot-density.md`.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";

const FRAME_WIDTH = 920;
const PAD = 30;
const MAP_X = 30;
const MAP_Y = 108;
/** The air between the plate's bottom edge and the dot-value key. */
const KEY_GAP = 34;
/** Between the dot-value key and the study-area key. */
const STUDY_KEY_GAP = 26;
/** Between the study-area key and the caveat block — the one piece of air that used to be 400px
 *  of nothing. */
const CAVEAT_GAP = 30;
/** Between the caveat block and the credit at the frame's foot. */
const SOURCE_GAP = 12;

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
  /** The shade of `accent` that survives the study-area wash — see `dotInkThatReadsOn`. */
  dotInk: string;
  ink: string;
  muted: string;
  landTint: string;
  landTintOpacity: number;
  studySwatch: string;
  studyCount: number;
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

/**
 * How tall the frame must be for THIS plate, THIS pair of keys and THIS caveat — derived, where it
 * used to be a typed `height: 1140` (B6.13's second half). The two disagreed even with each other:
 * this file's own docstring said 920 x 1010. Measured on the committed still before this existed,
 * **about 400 px of the 1140 — 18% of the whole graphic — was bare ground between the study-area
 * key and the caveat**, which is what the owner read as "such a large empty space at the bottom".
 *
 * Same shape and the same reason as `map-quake-density/HexGridStill.tsx`'s `stillFrameHeight`: the
 * plate is drawn 1:1 and never scaled, so the frame follows the plate rather than the other way
 * round, and the render asks for the height this function returns so the SVG it rasterises and the
 * SVG this component draws are the same size.
 */
export function stillFrameHeight({
  plateHeight,
  dotKeyLineCount,
  caveat,
  source,
  basemapCredit,
}: {
  plateHeight: number;
  dotKeyLineCount: number;
  caveat: string;
  source: string;
  basemapCredit: string;
}): number {
  const caveatLines = wrap(caveat, FRAME_WIDTH - PAD * 2, NOTE).length;
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME_WIDTH - PAD * 2,
    SOURCE,
  ).length;
  return (
    MAP_Y +
    plateHeight +
    KEY_GAP +
    (dotKeyLineCount - 1) * 20 +
    STUDY_KEY_GAP +
    NOTE.fontSize +
    CAVEAT_GAP +
    NOTE.fontSize +
    (caveatLines - 1) * NOTE.lead +
    SOURCE_GAP +
    SOURCE.fontSize +
    (sourceLines - 1) * SOURCE.lead +
    PAD
  );
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
  dotInk,
  ink,
  muted,
  landTint,
  landTintOpacity,
  studySwatch,
  studyCount,
}: DotDensityStillProps) {
  const dotKeyText = `● 1 dot = ${dotValue.toLocaleString("en-US")} people  —  ${totalDots.toLocaleString("en-US")} dots drawn for ${totalPopulation.toLocaleString("en-US")} people`;
  const dotKeyLines = wrap(dotKeyText, FRAME_WIDTH - PAD * 2, DOT_KEY);
  const FRAME = {
    width: FRAME_WIDTH,
    height: stillFrameHeight({
      plateHeight: geometry.frame.height,
      dotKeyLineCount: dotKeyLines.length,
      caveat,
      source,
      basemapCredit,
    }),
  };
  // A dot drawn in a colour nobody derived is the defect this prop exists to prevent: the accent
  // straight off the palette measures 3.33:1 on this map's own study area (B6.13).
  if (!dotInk)
    throw new Error(
      "no dotInk was supplied — render.mjs derives it with dotInkThatReadsOn against the study " +
        "area's composited ground, and a dot map's dots cannot be drawn in an unmeasured colour",
    );
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);

  const titleTop = PAD + TITLE.fontSize;
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. This column is laid out from BOTH
  // ends, so the source joining the bottom half pushes the whole bottom stack up by exactly the
  // source block's own height; the plate is a fixed square and does not move. See
  // twin-map-beat/assets/Co2MapStill.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;

  const MAP = {
    x: MAP_X,
    y: MAP_Y,
    width: geometry.frame.width,
    height: geometry.frame.height,
  };

  const dotKeyY = MAP.y + MAP.height + KEY_GAP;
  const studyKeyText = `Shaded: the ${studyCount} countries counted in that total. Unshaded land is outside this map — see the note below.`;

  const studyKeyY = dotKeyY + (dotKeyLines.length - 1) * 20 + STUDY_KEY_GAP;
  if (studyKeyY + 6 > caveatTop - NOTE.fontSize - 10)
    throw new Error(
      "the column does not fit: the dot-value key collides with the caveat.",
    );
  if (measureText(studyKeyText, NOTE) > FRAME.width - PAD * 2 - 22)
    throw new Error(
      `the study-area key does not fit on its line: "${studyKeyText}" measures ${measureText(studyKeyText, NOTE).toFixed(1)}px in a ${FRAME.width - PAD * 2 - 22}px row.`,
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

        {/* Every study country: a light neutral TINT and an outline, so a reader sees the region even
            where its own dot count is too small to read as texture (dot-density.md: distribution
            WITHIN a region, which needs the region's own edge to be visible in the first place).
            A tint, not an opaque fill, for two reasons measured in `geo-dot.ts`: it has to be far
            enough from the plate's unpainted land that "counted here" and "not in this map" are
            different colours, and it has to let the basemap's own water through, or every inland
            lake inside a study country is painted over as land. */}
        {shapes.map((s) => (
          <path
            key={s.key}
            d={ringPath(s.parts.flat())}
            fill={landTint}
            fillOpacity={landTintOpacity}
            stroke={muted}
            strokeWidth={0.6}
          />
        ))}

        {/* One dot colour for every dot — this is a univariate map (dot-density.md: "A single-value
            map uses one dot colour for every dot"). */}
        {dots.map((d) => (
          <Fragment key={d.key}>
            {d.points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={1.15} fill={dotInk} />
            ))}
          </Fragment>
        ))}

        {/* The five countries the title's own claim names, labelled directly on their own dot
            cluster — never a value the scale does not contain, just the country's own name. */}
        {labelled.map((l) => {
          const w = measureText(l.name, COUNTRY_LABEL);
          return (
            <g key={l.key}>
              {/* THE NAME PLATE IS OPAQUE. It used to be `opacity={0.82}`, which let 18% of whatever
                  it covered bleed through the words: measured, black on the dot ink showing through
                  a plate is 2.98:1, against the 4.5:1 a 12.5px bold label owes. A plate exists to
                  give a name one background — a plate you can see the data through has not given it
                  one. It also made the label unmeasurable: `annotation-reads-over-what-it-crosses`
                  skips any fill under `opacity: 1` rather than guessing at a composite (its own
                  blind spot 5), so it read straight past this rect to the dots and reported the
                  label as illegible. Opaque, the same scan reads 21:1 and it is true. */}
              <rect
                x={l.anchor[0] - w / 2 - 4}
                y={l.anchor[1] - 14}
                width={w + 8}
                height={16}
                fill={ground}
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

      {/* ── What the shading itself means. `geo-discipline.md` rule 7 asks a no-data colour to be
           NAMED in the legend rather than left to be inferred; the mirror of that rule is that a
           study-area shading has to be named too, or a reader is left to guess whether an unshaded
           country holds no people or was simply never counted. ── */}
      <rect
        x={PAD}
        y={studyKeyY - 10}
        width={14}
        height={12}
        fill={studySwatch}
        stroke={muted}
        strokeWidth={0.6}
      />
      <text x={PAD + 22} y={studyKeyY} fill={muted} fontSize={NOTE.fontSize}>
        {studyKeyText}
      </text>

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
