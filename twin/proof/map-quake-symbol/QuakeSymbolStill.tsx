/**
 * The static genre of "the western Pacific's most powerful earthquake, 2005–2017" — 900 × 560,
 * one frame, no order. A PROPORTIONAL SYMBOL beat: circles sized by magnitude at each epicentre,
 * not a choropleth — there is no polygon, no join, no ramp. See
 * `twin-map-beat/references/types/proportional-symbol.md`.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import {
  declutterLabels,
  drawOrder,
  labelPlacement,
  niceReferenceValues,
  radiusScale,
  type QuakeRow,
} from "./geo-symbol";

const FRAME = { width: 900, height: 560 };
const PAD = 32;
const GUTTER = 32;
const MAP = FRAME.height - PAD * 2;
const MAP_X = FRAME.width - PAD - MAP;
const COLUMN = { x: PAD, width: MAP_X - GUTTER - PAD };
const MAX_RADIUS = 30;

const TITLE = { fontSize: 20, fontWeight: 700, lead: 26 };
const SOURCE = { fontSize: 13, fontWeight: 400, lead: 17 };
const CAPTION = { fontSize: 12, fontWeight: 600, lead: 16 };
const NOTE = { fontSize: 11.5, fontWeight: 400, lead: 15 };
const POINT_LABEL = { fontSize: 11, fontWeight: 600 };
const LEGEND_LABEL = { fontSize: 11.5, fontWeight: 400 };

export type QuakeSymbolStillProps = {
  geometry: {
    frame: { width: number; height: number };
    points: (QuakeRow & { px: number; py: number })[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subjectKey: string;
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

export function QuakeSymbolStill({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  subjectKey,
}: QuakeSymbolStillProps) {
  const scale = MAP / geometry.frame.width;
  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  const radiusOf = radiusScale(maxMag, MAX_RADIUS);
  const drawn = drawOrder(geometry.points); // largest first, so smaller circles paint on top

  const titleLines = wrap(title, COLUMN.width, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    COLUMN.width,
    SOURCE,
  );
  const caveatLines = wrap(caveat, COLUMN.width, NOTE);

  const titleTop = PAD + TITLE.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 30;
  const sourceBottom = sourceTop + (sourceLines.length - 1) * SOURCE.lead;
  const caveatTop = FRAME.height - PAD - (caveatLines.length - 1) * NOTE.lead;

  const legend = niceReferenceValues(maxMag);
  const legendTop =
    caveatTop -
    NOTE.fontSize -
    34 -
    Math.max(...legend.map((v) => radiusOf(v))) * 2 -
    24;
  // The legend caption WRAPS to the column, exactly like the title, the source and the caveat. It
  // was the one string in this frame drawn as a single unbreakable line, and the column is 308 wide:
  // measured in Chrome, "Magnitude (radius scaled to √magnitude, not to energy released)" ran 367.98
  // wide from x 32, so its right edge landed at 399.98 against a map plate that begins at x 372 — a
  // 27.98px overrun, and on the rendered PNG the closing ")" of "released)" sits on the ocean. The
  // block grows UPWARD, keeping its last baseline (and therefore the reference circles below it)
  // exactly where they were; the fit check that follows now measures the block's real top.
  const captionLines = wrap(legendCaption, COLUMN.width, CAPTION);
  const captionTop = legendTop - (captionLines.length - 1) * CAPTION.lead;
  if (captionTop - 16 < sourceBottom)
    throw new Error(
      `the column does not fit: source ends at ${sourceBottom}, the legend caption starts at ${captionTop}. Shorten the title, the source or the legend caption.`,
    );

  const subject = geometry.points.find((p) => p.key === subjectKey);
  if (!subject) throw new Error(`no point for the subject ${subjectKey}`);

  // Label declutter: the subject always wins (priority 0, it already carries the accent colour and
  // bold weight — the one label this beat cannot afford to lose), the rest fall in behind it by
  // descending magnitude, so where two circles' labels would collide, the bigger event's own number
  // is the one a reader keeps. Same box math as the drawn label below (side/dy from `labelPlacement`,
  // width from the same `measureText` call), or the declutter would be deciding against a box it
  // never actually draws.
  const shownLabels = declutterLabels(
    geometry.points.map((p) => ({
      ...p,
      priority: p.key === subjectKey ? -1 : -p.mag,
    })),
    (p) => {
      const { side, dy } = labelPlacement(p.px, p.py, geometry.frame);
      const cx = p.px * scale;
      const cy = p.py * scale;
      const text = `M${p.mag}`;
      const w = measureText(text, POINT_LABEL) + 4;
      const dx =
        side === "right"
          ? radiusOf(p.mag) * scale + 6
          : -(radiusOf(p.mag) * scale + 6);
      return {
        x: side === "right" ? cx + dx : cx + dx - w,
        y: cy + dy - POINT_LABEL.fontSize,
        width: w,
        height: POINT_LABEL.fontSize + 4,
      };
    },
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
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={MAP} height={MAP} />
        </clipPath>
      </defs>

      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${PAD})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP} height={MAP} />
        {drawn.map((point) => {
          const isSubject = point.key === subjectKey;
          const r = radiusOf(point.mag) * scale;
          const cx = point.px * scale;
          const cy = point.py * scale;
          const { side, dy } = labelPlacement(
            point.px,
            point.py,
            geometry.frame,
          );
          const dx = side === "right" ? r + 6 : -(r + 6);
          const anchor = side === "right" ? "start" : "end";
          const fill = isSubject ? accent : muted;
          return (
            <Fragment key={point.key}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                fillOpacity={isSubject ? 0.55 : 0.38}
                stroke={fill}
                strokeWidth={1.4}
              />
              {shownLabels.has(point.key) && (
                <>
                  <text
                    x={cx + dx}
                    y={cy + dy}
                    textAnchor={anchor}
                    fontSize={POINT_LABEL.fontSize}
                    fontWeight={isSubject ? 700 : POINT_LABEL.fontWeight}
                    stroke={ground}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {`M${point.mag}`}
                  </text>
                  <text
                    x={cx + dx}
                    y={cy + dy}
                    textAnchor={anchor}
                    fontSize={POINT_LABEL.fontSize}
                    fontWeight={isSubject ? 700 : POINT_LABEL.fontWeight}
                    fill={isSubject ? accent : ink}
                  >
                    {`M${point.mag}`}
                  </text>
                </>
              )}
            </Fragment>
          );
        })}
      </g>

      {/* ── The column ──────────────────────────────────────────────────────────────────── */}
      {titleLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
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
          x={COLUMN.x}
          y={sourceTop + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {captionLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={captionTop + i * CAPTION.lead}
          fill={muted}
          fontSize={CAPTION.fontSize}
          fontWeight={CAPTION.fontWeight}
        >
          {line}
        </text>
      ))}

      {/* Reference circles: smallest to largest, left to right, sharing one baseline, each
          labelled directly above its own crown — a nested legend (all circles sharing one centre)
          reads well for 2 sizes but at 3 its two smaller circles hide inside the largest, which is
          exactly the "decoration that encodes nothing" a reader cannot use as a ruler. */}
      {(() => {
        const maxR = Math.max(...legend.map((v) => radiusOf(v)));
        const baseline = legendTop + maxR * 2 + 22;
        const ordered = [...legend].reverse(); // smallest first
        let cx = COLUMN.x + radiusOf(ordered[0]!);
        return ordered.map((v) => {
          const r = radiusOf(v);
          const mark = (
            <Fragment key={v}>
              <circle
                cx={cx}
                cy={baseline - r}
                r={r}
                fill="none"
                stroke={muted}
                strokeWidth={1}
              />
              <text
                x={cx}
                y={baseline - r * 2 - 8}
                textAnchor="middle"
                fill={muted}
                fontSize={LEGEND_LABEL.fontSize}
              >
                {`M${v.toFixed(1)}`}
              </text>
            </Fragment>
          );
          cx += r + Math.max(...legend.map((val) => radiusOf(val))) * 0.55 + 20;
          return mark;
        });
      })()}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
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
