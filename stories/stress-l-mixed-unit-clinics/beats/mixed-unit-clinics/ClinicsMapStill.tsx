/**
 * "Clinics across Europe" — 900 × 560, one frame, TWO panels, never one merged scale.
 *
 * The trap: `source/data.csv`'s `value` column mixes a COUNT (France, Germany, Spain, Italy;
 * 910–1880 clinics) and a RATE per 100,000 people (Poland, Sweden, the Netherlands, Belgium;
 * 17.2–21.9). `source/profile.json` ranges the whole column as one measure — a single choropleth
 * ramp over the raw `value` column would paint Germany's 1880 and the Netherlands' 17.2 at
 * opposite ends of the SAME scale, which says nothing true about the world. This beat draws the
 * SAME baked plate TWICE and gives each unit its own ramp, its own legend, its own top class —
 * never combined into one number or one bar.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "#shared/chart-beat/render-still.mjs";
import {
  bboxCenter,
  boundingBoxOf,
  en,
  pathFromRings,
  placeValueLabels,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo-clinics";

const FRAME = { width: 900, height: 560 };
const PAD = 32;
const PLATE = 240;
const GAP = 40;
const PANEL_TOTAL = PLATE * 2 + GAP;
const PANELS_X = PAD + (FRAME.width - PAD * 2 - PANEL_TOTAL) / 2;
const PANEL_Y = 200;

const OVERLINE = { fontSize: 12.5, fontWeight: 700 };
const TITLE = { fontSize: 21, fontWeight: 700, lead: 27 };
const SUBTITLE = { fontSize: 13, fontWeight: 400, lead: 17 };
const PANEL_LABEL = { fontSize: 13, fontWeight: 700 };
const TICK = { fontSize: 11, fontWeight: 400 };
const MARKER = { fontSize: 11.5, fontWeight: 700 };
const SOURCE = { fontSize: 12, fontWeight: 400, lead: 15 };
const CAVEAT = { fontSize: 12, fontWeight: 600, lead: 15 };

export type Panel = {
  key: "count" | "rate";
  label: string;
  unitLabel: string;
  study: readonly string[];
  breaks: number[];
  rows: JoinedRow[];
  ramp: string[];
  topCode: string;
};

export type ClinicsMapStillProps = {
  geometry: { frame: { width: number; height: number }; shapes: BakedShape[] };
  plate: string;
  title: string;
  overline: string;
  subtitle: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  panels: [Panel, Panel];
};

function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = current.endsWith("-") ? "" : " ";
    const trial = current ? `${current}${joiner}${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** One panel: the same plate image, drawn once, coloured by this panel's own ramp — every OTHER
 *  declared country (the other unit's own four) painted a flat neutral, never the ramp, never the
 *  no-data grey (which would falsely say the source is silent about them). */
function ChoroplethPanel({
  panel,
  x,
  y,
  geometry,
  plate,
  ground,
  accent,
  ink,
  muted,
}: {
  panel: Panel;
  x: number;
  y: number;
  geometry: ClinicsMapStillProps["geometry"];
  plate: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const scale = PLATE / geometry.frame.width;
  const byKey = new Map(geometry.shapes.map((s) => [s.key, s]));
  const valueByKey = new Map(panel.rows.map((r) => [r.key, r.value]));
  const OTHER_UNIT_FILL = "#EDEDED";

  return (
    <g>
      <text
        x={x}
        y={y - 8}
        fontFamily={FONT_FAMILY}
        fontSize={PANEL_LABEL.fontSize}
        fontWeight={PANEL_LABEL.fontWeight}
        fill={ink}
      >
        {panel.label}
      </text>
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <image
          href={plate}
          width={geometry.frame.width}
          height={geometry.frame.height}
        />
        {geometry.shapes.map((shape) => {
          const value = valueByKey.get(shape.key);
          const inThisPanel = panel.study.includes(shape.key);
          const fill =
            inThisPanel && value != null
              ? panel.ramp[
                  Math.min(
                    panel.ramp.length - 1,
                    Math.floor(
                      scalePosition(value, panel.breaks) *
                        (panel.breaks.length + 1),
                    ),
                  )
                ]
              : OTHER_UNIT_FILL;
          const isSubject = shape.key === panel.topCode;
          return (
            <path
              key={shape.key}
              d={pathFromRings(shape.rings)}
              fill={fill}
              stroke={isSubject ? accent : ground}
              strokeWidth={isSubject ? 3 / scale : 1 / scale}
            />
          );
        })}
      </g>
      {/* Value labels, one per country in this panel, placed automatically clear of every other
          label in this panel and of the shape each one names — never a per-beat hand nudge (see
          `placeValueLabels`, `map-beat/assets/geo.ts`: this beat used to carry three hand-picked
          offsets here, the exact defect the shared placement function now closes for every future
          multi-label choropleth, not just this one). Positions are computed in FRAME pixels (the
          space the labels are actually drawn and read in, not the plate's own unscaled space), so
          the placement sees the labels' real measured size. */}
      {(() => {
        const specs = panel.study
          .map((code) => {
            const shape = byKey.get(code);
            const value = valueByKey.get(code);
            if (!shape || value == null) return null;
            const [cx, cy] = bboxCenter(boundingBoxOf(shape.rings));
            const text = en(value, panel.key === "count" ? 0 : 1);
            return {
              key: code,
              x: x + cx * scale,
              y: y + cy * scale,
              width: measureText(text, {
                fontSize: MARKER.fontSize,
                fontWeight: 800,
              }),
              height: MARKER.fontSize,
              rings: shape.rings.map((ring) =>
                ring.map(([px, py]): [number, number] => [
                  x + px * scale,
                  y + py * scale,
                ]),
              ),
              text,
            };
          })
          .filter((spec): spec is NonNullable<typeof spec> => spec !== null);
        const placedByKey = new Map(
          placeValueLabels(specs).map((placed) => [placed.key, placed]),
        );
        return specs.map((spec) => {
          const placed = placedByKey.get(spec.key)!;
          const isSubject = spec.key === panel.topCode;
          return (
            <text
              key={spec.key}
              x={placed.x}
              y={placed.y}
              fontFamily={FONT_FAMILY}
              fontSize={MARKER.fontSize}
              fontWeight={isSubject ? 800 : 500}
              fill={isSubject ? accent : ink}
              textAnchor="middle"
            >
              {spec.text}
            </text>
          );
        });
      })()}
      {/* Legend: a horizontal class bar under the plate */}
      <g transform={`translate(${x}, ${y + PLATE + 20})`}>
        {panel.ramp.map((colour, i) => (
          <rect
            key={i}
            x={(i * PLATE) / panel.ramp.length}
            y={0}
            width={PLATE / panel.ramp.length}
            height={12}
            fill={colour}
          />
        ))}
        <text
          x={0}
          y={26}
          fontFamily={FONT_FAMILY}
          fontSize={TICK.fontSize}
          fontWeight={TICK.fontWeight}
          fill={muted}
        >
          lowest
        </text>
        <text
          x={PLATE}
          y={26}
          fontFamily={FONT_FAMILY}
          fontSize={TICK.fontSize}
          fontWeight={TICK.fontWeight}
          fill={muted}
          textAnchor="end"
        >
          {panel.unitLabel}
        </text>
      </g>
    </g>
  );
}

export function ClinicsMapStill(props: ClinicsMapStillProps) {
  const {
    geometry,
    plate,
    title,
    overline,
    subtitle,
    source,
    basemapCredit,
    caveat,
    alt,
    ground,
    accent,
    ink,
    muted,
    panels,
  } = props;
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const subtitleLines = wrap(subtitle, FRAME.width - PAD * 2, SUBTITLE);
  const titleTop = PAD + 14 + 10;
  const subtitleTop = titleTop + titleLines.length * TITLE.lead + 6;

  return (
    <svg
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={alt}
    >
      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />
      <text
        x={PAD}
        y={PAD + 10}
        fontFamily={FONT_FAMILY}
        fontSize={OVERLINE.fontSize}
        fontWeight={OVERLINE.fontWeight}
        fill={accent}
        letterSpacing="0.06em"
      >
        {overline.toUpperCase()}
      </text>
      {titleLines.map((line, i) => (
        <text
          key={i}
          x={PAD}
          y={titleTop + i * TITLE.lead}
          fontFamily={FONT_FAMILY}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
          fill={ink}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={i}
          x={PAD}
          y={subtitleTop + i * SUBTITLE.lead}
          fontFamily={FONT_FAMILY}
          fontSize={SUBTITLE.fontSize}
          fontWeight={SUBTITLE.fontWeight}
          fill={muted}
        >
          {line}
        </text>
      ))}

      <ChoroplethPanel
        panel={panels[0]}
        x={PANELS_X}
        y={PANEL_Y}
        geometry={geometry}
        plate={plate}
        ground={ground}
        accent={accent}
        ink={ink}
        muted={muted}
      />
      <ChoroplethPanel
        panel={panels[1]}
        x={PANELS_X + PLATE + GAP}
        y={PANEL_Y}
        geometry={geometry}
        plate={plate}
        ground={ground}
        accent={accent}
        ink={ink}
        muted={muted}
      />

      <text
        x={PAD}
        y={FRAME.height - PAD - 16}
        fontFamily={FONT_FAMILY}
        fontSize={CAVEAT.fontSize}
        fontWeight={CAVEAT.fontWeight}
        fill={accent}
      >
        {caveat}
      </text>
      <text
        x={PAD}
        y={FRAME.height - PAD}
        fontFamily={FONT_FAMILY}
        fontSize={SOURCE.fontSize}
        fontWeight={SOURCE.fontWeight}
        fill={muted}
      >
        {source} · {basemapCredit}
      </text>
    </svg>
  );
}
