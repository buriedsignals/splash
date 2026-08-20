/**
 * "Forest loss in 2025" — 900 × 560, one frame, no order (the static rung of the render ladder;
 * `ForestMapVideo.tsx` carries the ordered build the article asks for).
 *
 * The plate is a WIDE SHORT band, not a square: the seven declared countries span 228° of
 * longitude (Peru to Indonesia) and sit within 37°S-15°N of the equator, so `bake-plate.mjs`
 * bakes a band rather than a square (geo-discipline.md rule 12 — the camera follows the
 * geography). A ranked list carries the exact numbers below the map, because at this camera's own
 * scale South Sudan and Somalia draw at only a few pixels wide — too small for a legible in-map
 * label (see BRIEF.md's own note on this).
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "#shared/chart-beat/render-still.mjs";
import { bboxCenter, boundingBoxOf, en, pathFromRings, scalePosition, type BakedShape, type JoinedRow } from "./geo-forest";

const FRAME = { width: 900, height: 560 };
const PAD = 32;

const OVERLINE = { fontSize: 12.5, fontWeight: 700 };
const TITLE = { fontSize: 21, fontWeight: 700, lead: 27 };
const SUBTITLE = { fontSize: 13, fontWeight: 400, lead: 17 };
const ROW_LABEL = { fontSize: 13, fontWeight: 600 };
const ROW_VALUE = { fontSize: 13, fontWeight: 700 };
const SOURCE = { fontSize: 12, fontWeight: 400, lead: 15 };
const CAVEAT = { fontSize: 12, fontWeight: 600, lead: 15 };

function breakLongTokens(words: string[], maxWidth: number, font: { fontSize: number; fontWeight: number }): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) => out.push(i < pieces.length - 1 ? `${piece}-` : piece));
  }
  return out;
}

export function wrap(text: string, maxWidth: number, font: { fontSize: number; fontWeight: number }): string[] {
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

export type ForestMapStillProps = {
  geometry: { frame: { width: number; height: number }; shapes: BakedShape[] };
  plate: string;
  rows: JoinedRow[];
  namesByCode: Record<string, string>;
  breaks: number[];
  ramp: string[];
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
  subject: string;
};

export function ForestMapStill(props: ForestMapStillProps) {
  const { geometry, plate, rows, namesByCode, breaks, ramp, title, overline, subtitle, source, basemapCredit, caveat, alt, ground, accent, ink, muted, subject } = props;
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const subtitleLines = wrap(subtitle, FRAME.width - PAD * 2, SUBTITLE);
  const titleTop = PAD + 14 + 10;
  const subtitleTop = titleTop + titleLines.length * TITLE.lead + 6;
  const mapY = subtitleTop + subtitleLines.length * SUBTITLE.lead + 14;

  const byKey = new Map(geometry.shapes.map((s) => [s.key, s]));
  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));
  const maxValue = Math.max(...rows.map((r) => r.value ?? 0));

  const ranked = [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const rowsTop = mapY + geometry.frame.height + 26;
  const rowHeight = 19;
  const barX = 200;
  const barMaxWidth = FRAME.width - PAD - barX - 90;

  return (
    <svg width={FRAME.width} height={FRAME.height} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={alt}>
      <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />
      <text x={PAD} y={PAD + 10} fontFamily={FONT_FAMILY} fontSize={OVERLINE.fontSize} fontWeight={OVERLINE.fontWeight} fill={accent} letterSpacing="0.06em">
        {overline.toUpperCase()}
      </text>
      {titleLines.map((line, i) => (
        <text key={i} x={PAD} y={titleTop + i * TITLE.lead} fontFamily={FONT_FAMILY} fontSize={TITLE.fontSize} fontWeight={TITLE.fontWeight} fill={ink}>
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text key={i} x={PAD} y={subtitleTop + i * SUBTITLE.lead} fontFamily={FONT_FAMILY} fontSize={SUBTITLE.fontSize} fontWeight={SUBTITLE.fontWeight} fill={muted}>
          {line}
        </text>
      ))}

      <g transform={`translate(${PAD}, ${mapY})`}>
        <image href={plate} width={geometry.frame.width} height={geometry.frame.height} />
        {geometry.shapes.map((shape) => {
          const value = valueByKey.get(shape.key);
          const fill = value != null ? ramp[Math.min(ramp.length - 1, Math.floor(scalePosition(value, breaks) * (breaks.length + 1)))] : "#B9B9B9";
          const isSubject = shape.key === subject;
          return <path key={shape.key} d={pathFromRings(shape.rings)} fill={fill} stroke={isSubject ? accent : ground} strokeWidth={isSubject ? 2.5 : 0.75} />;
        })}
      </g>

      {/* Ranked list — the exact numbers, since two of these seven countries draw only a few pixels
          wide on this camera's own band and cannot carry a legible in-map label. */}
      {ranked.map((row, i) => {
        const value = row.value ?? 0;
        const isSubject = row.key === subject;
        const y = rowsTop + i * rowHeight;
        const barWidth = (value / maxValue) * barMaxWidth;
        const colour = ramp[Math.min(ramp.length - 1, Math.floor(scalePosition(value, breaks) * (breaks.length + 1)))];
        return (
          <g key={row.key}>
            <text x={PAD} y={y} fontFamily={FONT_FAMILY} fontSize={ROW_LABEL.fontSize} fontWeight={isSubject ? 800 : ROW_LABEL.fontWeight} fill={isSubject ? accent : ink}>
              {namesByCode[row.key] ?? row.key}
            </text>
            <rect x={barX} y={y - 11} width={barWidth} height={12} fill={isSubject ? accent : colour} />
            <text x={barX + barWidth + 8} y={y} fontFamily={FONT_FAMILY} fontSize={ROW_VALUE.fontSize} fontWeight={ROW_VALUE.fontWeight} fill={ink}>
              {en(value)} ha
            </text>
          </g>
        );
      })}

      <text x={PAD} y={FRAME.height - PAD - 16} fontFamily={FONT_FAMILY} fontSize={CAVEAT.fontSize} fontWeight={CAVEAT.fontWeight} fill={accent}>
        {caveat}
      </text>
      <text x={PAD} y={FRAME.height - PAD} fontFamily={FONT_FAMILY} fontSize={SOURCE.fontSize} fontWeight={SOURCE.fontWeight} fill={muted}>
        {source} · {basemapCredit}
      </text>
    </svg>
  );
}
