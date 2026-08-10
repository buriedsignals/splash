/**
 * Beat 2: la même repartition, sur les emissions elles-memes (stacked bar, one bar).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for the type the storyboard pinned
 * (`references/types/stacked-bar.md`): a single mark carrying BOTH the total (the bar's full
 * length) and the composition (each segment's own length). One accent — the Games' own share, the
 * subject the title names — with the three sponsors held in one muted tone, because distinguishing
 * them from each other is a different story than the one this beat proves.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Part = { actor: string; value: number; isSubject: boolean };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 25, fontWeight: 700, lead: 32 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const SEGMENT_LABEL = { fontSize: 15, fontWeight: 700 };
const ACTOR_LABEL = { fontSize: 13, fontWeight: 400 };
const BAR_HEIGHT = 96;

function wrap(text: string, maxWidth: number, font: { fontSize: number; fontWeight: number }) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** Pure geometry: parts to segments along one zero-anchored length. Numbers only. */
export function stackGeometry(
  parts: Part[],
  { left, right, top }: { left: number; right: number; top: number },
) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const x = scaleLinear().domain([0, total]).range([left, right]);
  let cursor = 0;
  const segments = parts.map((p) => {
    const start = cursor;
    cursor += p.value;
    return {
      ...p,
      share: p.value / total,
      x: x(start),
      width: x(cursor) - x(start),
      y: top,
      height: BAR_HEIGHT,
    };
  });
  return { total, segments, x };
}

export function RepartitionEmissions({
  parts,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
}: {
  parts: Part[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
}) {
  if (parts.length < 2)
    throw new Error(`a stacked bar needs at least two parts to compose a total, got ${parts.length}`);
  if (parts.filter((p) => p.isSubject).length !== 1)
    throw new Error("exactly one part is the subject the title names — one accent, never two");

  const { ink, muted } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline = titleBaseline + (titleLines.length - 1) * TITLE.lead + 28;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;

  // The bar block is CENTRED in the band the header and the credit leave it, not hung at a fixed
  // offset below the header. The first render put it at a constant 96px below the subtitle and left
  // ~200px of dead frame under the actor labels — visible the moment the PNG was opened, invisible
  // to every assertion, which is why the discipline says open the render.
  const BLOCK = 34 + BAR_HEIGHT + 26; // the total line above, the bar, the actor labels below
  const headerBottom = limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead;
  const creditTop = sourceBaseline - SOURCE.fontSize - 24;
  const barTop = Math.round(headerBottom + (creditTop - headerBottom - BLOCK) / 2) + 34;
  const { total, segments } = stackGeometry(parts, {
    left: PAD,
    right: width - PAD,
    top: barTop,
  });

  const gamesShare = segments.find((s) => s.isSubject)!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={alt}
      style={{ fontFamily: FONT_FAMILY }}
    >
      <title>{alt}</title>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {limitsLines.map((line, i) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={limitsBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
          fontWeight={SUBTITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {/* The bar. One mark, the total is its full length. */}
      {segments.map((s) => (
        <rect
          key={s.actor}
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          fill={s.isSubject ? accent : muted}
          stroke={ground}
          strokeWidth={2}
        />
      ))}

      {/* Direct annotation inside each segment, never a legend to decode. */}
      {segments.map((s) => {
        const label = `${Math.round(s.value)} kt`;
        const fits = measureText(label, SEGMENT_LABEL) + 20 < s.width;
        if (!fits) return null;
        return (
          <text
            key={`v${s.actor}`}
            x={s.x + s.width / 2}
            y={s.y + BAR_HEIGHT / 2 + SEGMENT_LABEL.fontSize / 2 - 2}
            fill={ground}
            fontSize={SEGMENT_LABEL.fontSize}
            fontWeight={SEGMENT_LABEL.fontWeight}
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}

      {/* Who each segment is, under the bar it belongs to. */}
      {segments.map((s) => {
        const label = s.actor;
        const fits = measureText(label, ACTOR_LABEL) < s.width - 8;
        return (
          <text
            key={`a${s.actor}`}
            x={s.x + s.width / 2}
            y={s.y + BAR_HEIGHT + 26}
            fill={s.isSubject ? ink : muted}
            fontSize={ACTOR_LABEL.fontSize}
            fontWeight={s.isSubject ? 700 : ACTOR_LABEL.fontWeight}
            textAnchor="middle"
          >
            {fits ? label : label.split(" ")[0]}
          </text>
        );
      })}

      {/* The total, on the bar's own scale, above it. */}
      <text x={PAD} y={barTop - 18} fill={ink} fontSize={17} fontWeight={700}>
        {Math.round(total)} milliers de tonnes équivalent CO2 au total
      </text>
      <text
        x={width - PAD}
        y={barTop - 18}
        fill={muted}
        fontSize={15}
        fontWeight={400}
        textAnchor="end"
      >
        {`part des Jeux eux-mêmes : ${Math.round(gamesShare.share * 100)} %`}
      </text>

      {sourceLines.map((line, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={sourceBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
          fontWeight={SOURCE.fontWeight}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
