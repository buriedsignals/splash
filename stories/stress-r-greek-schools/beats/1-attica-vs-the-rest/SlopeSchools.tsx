/**
 * Written fresh from chart-beat's ChartSeed shape (pure geometry -> furniture from the ground ->
 * direct annotation -> one accent), not imported from it -- this is a slope, the seed is a line.
 *
 * One line per Greek region: left dot at its 2020 school count, right dot at its 2026 count. The
 * one region whose 2026 figure is a corrupted cell in the frozen source keeps its left dot and
 * label but carries no line and no right dot -- see BRIEF.md.
 */
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { deriveFurniture, measureText, FONT_FAMILY } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-beat/sizes.mjs";

export type Region = {
  name: string;
  y2020: number;
  y2026: number | null; // null == the corrupted cell, declared, never guessed at
  isSubject: boolean;
};

const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  LABEL_LEAD: 18,
  VALUE: { fontSize: 15, fontWeight: 700 },
  CAPTION: { fontSize: 14, fontWeight: 600 },
  HEADER_TO_PLOT: 40,
  PLOT_TOP_PAD: 30,
  PLOT_BOTTOM_PAD: 20,
  LABEL_GAP: 16, // air between a dot's column and its label
  DOT_R: 4,
  MIN_LABEL_GAP: 8, // clear vertical air required between two labels' own ink boxes
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    TITLE: { ...BASE.TITLE, fontSize: sp(BASE.TITLE.fontSize), lead: sp(BASE.TITLE.lead) },
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize), lead: sp(BASE.SOURCE.lead) },
    LABEL: { ...BASE.LABEL, fontSize: sp(BASE.LABEL.fontSize) },
    LABEL_LEAD: sp(BASE.LABEL_LEAD),
    VALUE: { ...BASE.VALUE, fontSize: sp(BASE.VALUE.fontSize) },
    CAPTION: { ...BASE.CAPTION, fontSize: sp(BASE.CAPTION.fontSize) },
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    PLOT_TOP_PAD: sp(BASE.PLOT_TOP_PAD),
    PLOT_BOTTOM_PAD: sp(BASE.PLOT_BOTTOM_PAD),
    LABEL_GAP: sp(BASE.LABEL_GAP),
    DOT_R: sp(BASE.DOT_R),
    MIN_LABEL_GAP: sp(BASE.MIN_LABEL_GAP),
  };
}

/** Wrap on the measured width of the real string, never on a character count -- carried from
 *  ChartSeed.tsx's own `wrap`, unchanged in shape: break on spaces, never truncate. */
function wrap(text: string, maxWidth: number, font: { fontSize: number; fontWeight: number }): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Vertical de-collision for one column of labels, clamped to [top, bottom]: sort by the value's
 * true y, then space every label EQUALLY across the available [top, bottom] band whenever the
 * band is too short to hold them all at the requested `minGap` -- and hug the true positions
 * exactly when it is not.
 *
 * A first version of this file did the opposite: a forward push-down pass followed by a backward
 * pull-up pass, on the reasoning that it would "pull the group back up" once it overflowed the
 * plot floor. On a 13-region field where the honest minimum gap needed more height than the frame
 * had, that backward pass subtracted `minGap` from EVERY item in turn without ever checking
 * whether doing so pushed an item above the one before it -- and it did: the render it produced
 * placed "Κεντρική Μακεδονία" (1104 schools) ABOVE "Αττική" (1802 schools) even though Αττική's
 * true position is the topmost point on the whole chart. The bug was not overlap, which is what
 * this function was written to prevent -- it was two labels swapping apparent RANK, which is a
 * worse defect on a chart whose entire point is relative position. Caught by looking at the
 * rendered PNG and checking the printed order against the data, not by any assertion.
 *
 * The fix: when the naive required span ((n-1) x minGap) exceeds the band, distribute all n
 * points at the largest EQUAL gap the band allows, in true-y order -- never letting a smaller
 * gap in one region of the stack borrow room from a larger one, which is what let the previous
 * version invert two items' order. A leader line (drawn by the caller when `moved` is true)
 * keeps the label connected to its own true position, so evenly spacing a crowded cluster reads
 * as a labelling compromise, not as invented data.
 */
function deconflict<T extends { y: number }>(items: T[], minGap: number, top: number, bottom: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  if (sorted.length <= 1) return sorted;
  const naiveSpan = (sorted.length - 1) * minGap;
  const available = Math.max(0, bottom - top);
  if (naiveSpan <= available) {
    // Room for every label at its own true position plus the full requested gap: push down only
    // where two true positions actually collide, exactly as before.
    for (let i = 1; i < sorted.length; i++) {
      const need = sorted[i - 1].y + minGap;
      if (sorted[i].y < need) sorted[i] = { ...sorted[i], y: need };
    }
    return sorted;
  }
  // Not enough room: fall back to the largest EQUAL gap the band allows, anchored at `top` --
  // monotonic by construction, so no two labels can ever swap apparent rank.
  const gap = available / (sorted.length - 1);
  return sorted.map((s, i) => ({ ...s, y: top + i * gap }));
}

export function SlopeSchools({
  regions,
  title,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  regions: Region[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const { TITLE, SOURCE, LABEL, LABEL_LEAD, VALUE, CAPTION, HEADER_TO_PLOT, PLOT_TOP_PAD, PLOT_BOTTOM_PAD, LABEL_GAP, DOT_R, MIN_LABEL_GAP } =
    tokens(typeScale);
  const INSET = frameInsetFor(size);

  const titleLines = wrap(title, width - INSET * 2, TITLE);
  const titleBaseline = INSET + TITLE.fontSize;
  const sourceBaseline = height - INSET;
  const sourceLines = wrap(source, width - INSET * 2, SOURCE);

  // LEFT LABEL TEXT: "region -- value". Measured at full width first; if the widest one would eat
  // more than 34% of the frame, wrap it onto a second line instead of truncating anything.
  const leftText = (r: Region) => `${r.name} — ${r.y2020}`;
  const maxLeftGutter = Math.round(width * 0.34);
  const leftWraps = regions.map((r) => wrap(leftText(r), maxLeftGutter, LABEL));
  const leftGutter = Math.max(...leftWraps.map((ls) => Math.max(...ls.map((l) => measureText(l, LABEL)))));

  // RIGHT LABEL TEXT: the bare 2026 value, or the declared-missing note for the corrupt cell --
  // one unified column, so the note is de-conflicted against real value labels exactly like any
  // other row rather than drawn on top of whichever one happens to sit nearby.
  const rightText = (r: Region) => (r.y2026 === null ? "2026 unavailable" : String(r.y2026));
  const rightWraps = regions.map((r) => wrap(rightText(r), Math.round(width * 0.22), VALUE));
  const rightGutter = Math.max(...rightWraps.map((ls) => Math.max(...ls.map((l) => measureText(l, VALUE)))));

  const plot = {
    left: INSET + leftGutter + LABEL_GAP,
    right: width - INSET - rightGutter - LABEL_GAP,
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + HEADER_TO_PLOT + PLOT_TOP_PAD,
    bottom:
      sourceBaseline -
      SOURCE.fontSize -
      (sourceLines.length - 1) * SOURCE.lead -
      HEADER_TO_PLOT -
      PLOT_BOTTOM_PAD,
  };

  // ONE SHARED, POSITION-ENCODED SCALE -- a slope's axis does not need zero (`references/types/
  // slope.md`, "What the drawing actually needs"): it is position, not length, that carries the
  // value here. Fitted to every value actually drawn, 2020 and 2026 together, so a line's tilt is
  // comparable left to right. The corrupted region's missing 2026 reading is excluded from the
  // domain fit -- it draws no right-hand point at all, so it must not stretch the axis either.
  const values = regions.flatMap((r) => [r.y2020, r.y2026].filter((v): v is number => v !== null));
  const y = scaleLinear().domain(extent(values) as [number, number]).nice().range([plot.bottom, plot.top]);

  const leftPoints = regions.map((r) => ({ region: r, y: y(r.y2020) }));
  // Every region gets a right-side label -- a real value's true y, or the missing region's own
  // 2020 y (there is no 2026 y to place it at), so its note sits level with its one known dot.
  const rightPoints = regions.map((r) => ({
    region: r,
    y: r.y2026 === null ? y(r.y2020) : y(r.y2026),
  }));

  const leftLabelRowHeight = Math.max(...leftWraps.map((ls) => ls.length)) * LABEL_LEAD + MIN_LABEL_GAP;
  const rightLabelRowHeight = VALUE.fontSize + MIN_LABEL_GAP;
  const leftLabels = deconflict(leftPoints, leftLabelRowHeight, plot.top, plot.bottom);
  const rightLabels = deconflict(rightPoints, rightLabelRowHeight, plot.top, plot.bottom);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text key={line} x={INSET} y={titleBaseline + i * TITLE.lead} fill={ink} fontSize={TITLE.fontSize} fontWeight={TITLE.fontWeight}>
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={INSET}
          y={sourceBaseline - (sourceLines.length - 1 - i) * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* period captions -- "a slope chart with unlabelled ends is a chart of direction with no
          stated 'from when to when'" (references/types/slope.md) */}
      <text x={plot.left} y={plot.top - 14} fill={muted} fontSize={CAPTION.fontSize} fontWeight={CAPTION.fontWeight}>
        2020
      </text>
      <text x={plot.right} y={plot.top - 14} fill={muted} fontSize={CAPTION.fontSize} fontWeight={CAPTION.fontWeight} textAnchor="end">
        2026
      </text>
      <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} stroke={grid} strokeWidth={1} />
      <line x1={plot.right} x2={plot.right} y1={plot.top} y2={plot.bottom} stroke={grid} strokeWidth={1} />

      {regions.map((r) => {
        const isAccent = r.isSubject;
        const lineColour = isAccent ? accent : muted;
        const x0 = plot.left;
        const y0 = y(r.y2020);
        if (r.y2026 === null) {
          // THE CORRUPT CELL, DECLARED ON THE CHART -- no line, no right dot, no guessed number.
          return <circle key={r.name} cx={x0} cy={y0} r={DOT_R} fill={lineColour} />;
        }
        const x1 = plot.right;
        const y1 = y(r.y2026);
        return (
          <g key={r.name}>
            <line x1={x0} x2={x1} y1={y0} y2={y1} stroke={lineColour} strokeWidth={isAccent ? 3 : 1.5} strokeLinecap="round" opacity={isAccent ? 1 : 0.85} />
            <circle cx={x0} cy={y0} r={DOT_R} fill={lineColour} />
            <circle cx={x1} cy={y1} r={DOT_R} fill={lineColour} />
          </g>
        );
      })}

      {/* LEFT LABELS -- region name and its 2020 value, de-conflicted vertically, never truncated */}
      {leftLabels.map(({ region: r, y: ly }) => {
        const trueY = y(r.y2020);
        const moved = Math.abs(ly - trueY) > 2;
        const lines = leftWraps[regions.indexOf(r)];
        const colour = r.isSubject ? accent : ink;
        return (
          <g key={r.name}>
            {/* the connector stops short of the text's own anchor point (LABEL_GAP away from
                plot.left) by a fixed buffer, so it never runs UNDER the glyphs it leads to --
                that overlap was a real defect (`inspect-render.mjs`'s own contrast check found
                the note text below reading 4.22:1 against this line, under the text's own 4.5:1
                floor, before the buffer existed). */}
            {moved && (
              <line x1={plot.left - 6} x2={plot.left - LABEL_GAP + 4} y1={trueY} y2={ly} stroke={grid} strokeWidth={1} />
            )}
            {lines.map((line, li) => (
              <text
                key={line}
                x={plot.left - LABEL_GAP}
                y={ly + (li - (lines.length - 1) / 2) * LABEL_LEAD + LABEL.fontSize / 3}
                fill={colour}
                fontSize={LABEL.fontSize}
                fontWeight={r.isSubject ? 700 : LABEL.fontWeight}
                textAnchor="end"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* RIGHT LABELS -- the 2026 value, or the declared-missing note for the corrupt cell; the
          region is already named on the left, so a real value never repeats it. */}
      {rightLabels.map(({ region: r, y: ly }) => {
        const trueY = r.y2026 === null ? y(r.y2020) : y(r.y2026);
        const moved = Math.abs(ly - trueY) > 2;
        const missing = r.y2026 === null;
        const colour = missing ? muted : r.isSubject ? accent : ink;
        return (
          <g key={r.name}>
            {/* same buffer as the left column's connector, mirrored: stop short of the
                text's own x (plot.right + LABEL_GAP) rather than starting exactly on it. */}
            {moved && (
              <line x1={plot.right + 2} x2={plot.right + LABEL_GAP - 4} y1={trueY} y2={ly} stroke={grid} strokeWidth={1} />
            )}
            <text
              x={plot.right + LABEL_GAP}
              y={ly + VALUE.fontSize / 3}
              fill={colour}
              fontSize={missing ? CAPTION.fontSize : VALUE.fontSize}
              fontWeight={missing ? CAPTION.fontWeight : r.isSubject ? 700 : VALUE.fontWeight}
            >
              {missing ? "2026 unavailable" : r.y2026}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
