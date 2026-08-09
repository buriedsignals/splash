/**
 * The STATIC beat of "India has risen from eighth to third among the world's biggest CO₂ emitters"
 * — one frame, no motion, no interaction.
 *
 * The video sibling (`proof/vidz-bump-emitter-rank/`) draws the same claim from the same frozen
 * file. It is not this beat with the clock removed, and this is not that beat with the clock
 * stopped. `references/types/bump.md`: the argument of a bump chart IS the crossings, and "the
 * type's whole reason to exist is that a reader can follow one line through them." A video gets
 * that for free — the lines advance on one clock and the reader watches the swap happen. **A still
 * frame has no such moment**, so everything the reveal did for the video has to be drawn:
 *
 *   1. **Both ends carry a name.** The video labels the six lines at the finish, because the reveal
 *      already showed the reader where each one began. A still has no reveal, so the 1990 column
 *      gets its own label column too. This is free of collisions BY CONSTRUCTION and not by luck:
 *      in any one year the ranks of the drawn countries are distinct integers, so no two labels in
 *      the same column can ever land on the same row. `assertLabelRowsAreDistinct` proves it on the
 *      real data rather than asserting it in this comment.
 *   2. **Every crossing that carries the argument is named where it happens.** The video marks its
 *      three crossings with rings and then says who was passed in a sentence, because a viewer has
 *      just watched each one occur. A still reader has not, so each ring carries "passed <country> ·
 *      <year>" set in the corridor BETWEEN the two lines that just swapped — the one strip of the
 *      frame that is empty by construction after a crossing, since the two ranks either side of it
 *      are exactly the two the crossing produced.
 *   3. **Nothing that is not the argument is annotated.** China took first place from the United
 *      States in 2006 and that swap is visible at the top of the frame; it is not ringed and not
 *      captioned, because the beat's claim is India's climb and a second marked crossing would read
 *      as a second subject. It is named in the alt text, which is not a place a reader's eye can be
 *      pulled by.
 *
 * COLOUR AND CONTRAST, from `references/types/bump.md`: one accent line only (the palette records
 * one), everything else a single neutral. Every label on this frame — end labels, start labels and
 * the crossing captions — is drawn in page `ink` or `muted`, NEVER in a line's own hue. That is the
 * sheet's named, previously-shipped accessibility failure for this exact type, and it applies to
 * the accented line's own label too.
 *
 * GUTTERS ARE MEASURED, never constants (`static-discipline.md`): the rank column, both name
 * columns and the crossing captions are all sized from the real strings in the real font, and the
 * component THROWS if a caption would run past the plot rather than shipping a clipped one.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Track = {
  country: string;
  /** One rank per year, same order and length as `years`. Rank 1 is the largest emitter. */
  ranks: number[];
};

export type Crossing = {
  /** The country the subject passed. */
  country: string;
  /** The first year the subject ranked above it and stayed there. */
  year: number;
  /** Whether that country is one of the lines this chart draws. */
  drawn: boolean;
};

const FRAME = { width: 900, height: 720 };
const PAD = 40;

const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const CAVEAT = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400, lead: 19 };
const AXIS_TITLE = { fontSize: 13, fontWeight: 500 };
const RANK_TICK = { fontSize: 13, fontWeight: 500 };
const NAME = { fontSize: 13, fontWeight: 500 };
const NAME_ACCENT = { fontSize: 13, fontWeight: 700 };
const CROSSING = { fontSize: 12, fontWeight: 500 };
const CONCLUSION = { fontSize: 14, fontWeight: 400, lead: 19 };
const DOT_R = 4;

/** Air between a terminal dot and the name beside it, and between the rank column and the plot. */
const GAP = 10;

/** Wrap on the measured width of the real string, never on a character count. This story's own copy
 *  of the static family's `wrap` — duplicated, not linked, per this project's rule for anything with
 *  no `#shared/*` vendoring path. */
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
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

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * Rank rows are evenly spaced from `plot.top` (rank 1) to `plot.bottom` (`rankRows`), and years are
 * evenly spaced across the width. There is no scale to fit and no domain to nice: both axes are
 * ordinal, which is precisely what makes this type unable to show magnitude — and precisely why
 * `static-discipline.md`'s zero rule has nothing to say about it. Position here is rank, not length.
 */
export function bumpGeometry(
  tracks: Track[],
  years: number[],
  rankRows: number,
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const rowHeight = (plot.bottom - plot.top) / (rankRows - 1);
  const columnWidth = (plot.right - plot.left) / (years.length - 1);
  const yOfRank = (rank: number) => plot.top + (rank - 1) * rowHeight;
  const xOfIndex = (index: number) => plot.left + index * columnWidth;

  const lines = tracks.map((t) => ({
    ...t,
    points: t.ranks.map((rank, i) => ({ x: xOfIndex(i), y: yOfRank(rank) })),
  }));

  return { plot, rowHeight, columnWidth, yOfRank, xOfIndex, lines };
}

/**
 * The property that makes a name column safe at either end of a bump chart: in one year, the drawn
 * countries hold DISTINCT ranks, so two labels in the same column can never land on the same row.
 * Proven on the real ranks rather than assumed, because "labels survive without hover" is this
 * genre's whole job and a duplicated rank would silently stack two names on one line.
 */
export function assertLabelRowsAreDistinct(
  tracks: Track[],
  atIndex: number,
  where: string,
): void {
  const ranks = tracks.map((t) => t.ranks[atIndex]);
  const seen = new Set(ranks);
  if (seen.size !== ranks.length)
    throw new Error(
      `two drawn countries share a rank in the ${where} column (${ranks.join(", ")}) — ` +
        `their names would be drawn on top of each other`,
    );
}

export type EmitterRankBumpProps = {
  years: number[];
  /** One track per drawn country, ordered by final rank. `render.mjs`'s job. */
  data: Track[];
  /** How many rank rows the axis shows — the worst rank any drawn country reaches. */
  rankRows: number;
  title: string;
  caveat: string;
  source: string;
  axisTitle: string;
  alt: string;
  subjectCountry: string;
  /** Every crossing the subject made — computed in `render.mjs`, never typed. Only the `drawn` ones
   *  can be marked on this frame; the rest are what the conclusion sentence is for. */
  crossings: Crossing[];
  conclusion: string;
  ground: string;
  accent: string;
};

export function EmitterRankBump({
  years,
  data,
  rankRows,
  title,
  caveat,
  source,
  axisTitle,
  alt,
  subjectCountry,
  crossings,
  conclusion,
  ground,
  accent,
}: EmitterRankBumpProps) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(ground);

  if (years.length < 3)
    throw new Error(
      `a bump chart needs at least three periods; a two-point comparison is a slope chart's job, got ${years.length}`,
    );
  if (data.length < 2)
    throw new Error(`need at least two tracks, got ${data.length}`);
  for (const track of data)
    if (track.ranks.length !== years.length)
      throw new Error(
        `${track.country} has ${track.ranks.length} ranks for ${years.length} years — a bump chart never bridges a missing period`,
      );
  const subjectIndex = data.findIndex((t) => t.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(`no track for subject ${JSON.stringify(subjectCountry)}`);

  assertLabelRowsAreDistinct(data, 0, `${years[0]}`);
  assertLabelRowsAreDistinct(
    data,
    years.length - 1,
    `${years[years.length - 1]}`,
  );

  // ── The header block: title, then the caveat, then the source. `static-discipline.md`'s order,
  // anchored at the top of the frame.
  const textWidth = width - PAD * 2;
  const titleLines = wrap(title, textWidth, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const caveatLines = wrap(caveat, textWidth, CAVEAT);
  const caveatBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const sourceLines = wrap(source, textWidth, SOURCE);
  const sourceBaseline =
    caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + 22;
  const axisTitleBaseline =
    sourceBaseline + (sourceLines.length - 1) * SOURCE.lead + 30;

  // ── Gutters, every one measured against the strings that will actually sit in them.
  const rankColumn = Math.max(
    ...Array.from({ length: rankRows }, (_, i) =>
      measureText(String(i + 1), RANK_TICK),
    ),
  );
  const nameColumn = Math.max(
    ...data.map((t) =>
      Math.max(
        measureText(t.country, NAME),
        measureText(t.country, NAME_ACCENT),
      ),
    ),
  );

  const conclusionLines = wrap(conclusion, textWidth, CONCLUSION);
  const yearLabelBlock = RANK_TICK.fontSize + 18;
  const conclusionGap = 26;

  const padding = {
    top: axisTitleBaseline + 22,
    right: PAD + nameColumn + DOT_R + GAP,
    bottom:
      PAD +
      conclusionLines.length * CONCLUSION.lead +
      conclusionGap +
      yearLabelBlock,
    left: PAD + rankColumn + GAP + nameColumn + DOT_R + GAP,
  };

  const g = bumpGeometry(data, years, rankRows, { width, height, padding });

  // Year ticks: every fifth year, plus the last one when it is not already near a tick. Dense enough
  // that any year this frame names — the three crossing years — can be located on the axis, which is
  // `static-discipline.md`'s actual test for axis density.
  const yearTicks = years
    .map((year, i) => ({ year, i }))
    .filter(
      ({ year, i }) =>
        year % 5 === 0 ||
        (i === years.length - 1 && (years[years.length - 1] - 1) % 5 !== 0),
    );

  const subjectTrack = g.lines[subjectIndex];

  /**
   * A crossing's caption, placed in the corridor the crossing itself opened.
   *
   * After the subject passes a country, the two hold adjacent ranks — the subject one row above.
   * The strip halfway between them is therefore empty at that year by construction, which is what
   * lets a caption sit ON the chart, at the crossing, without a chip behind it and without covering
   * a line. Its own width is measured and checked against the plot's right edge, because a caption
   * that runs off the frame is exactly the clipped-label defect measured gutters exist to prevent.
   */
  const captions = crossings
    .filter((c) => c.drawn)
    .map((c) => {
      const at = years.indexOf(c.year);
      if (at < 0)
        throw new Error(
          `crossing year ${c.year} is not one of this chart's years`,
        );
      const passed = data.find((t) => t.country === c.country);
      if (!passed)
        throw new Error(
          `crossing names ${c.country}, which this chart does not draw`,
        );
      const text = `passed ${c.country} · ${c.year}`;
      const x = g.xOfIndex(at) + DOT_R + 6;
      const w = measureText(text, CROSSING);
      if (x + w > g.plot.right)
        throw new Error(
          `the caption "${text}" would run ${Math.ceil(x + w - g.plot.right)}px past the plot's right edge`,
        );
      return {
        key: c.country,
        text,
        x,
        y:
          g.yOfRank((subjectTrack.ranks[at] + passed.ranks[at]) / 2) +
          CROSSING.fontSize * 0.34,
        ringX: g.xOfIndex(at),
        ringY: g.yOfRank(subjectTrack.ranks[at]),
      };
    });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      {/* No root <title>: it becomes a cursor tooltip repeating what is already printed.
          role="img" + <desc> is the alt text (WCAG 1.1.1). */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((text, i) => (
        <text
          key={text}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {text}
        </text>
      ))}
      {caveatLines.map((text, i) => (
        <text
          key={text}
          x={PAD}
          y={caveatBaseline + i * CAVEAT.lead}
          fill={muted}
          fontSize={CAVEAT.fontSize}
        >
          {text}
        </text>
      ))}
      {sourceLines.map((text, i) => (
        <text
          key={text}
          x={PAD}
          y={sourceBaseline + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {text}
        </text>
      ))}

      {/* The rank axis. Row 1 at the top, one evenly-spaced row per rank. */}
      <text
        x={PAD}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
      >
        {axisTitle}
      </text>
      {Array.from({ length: rankRows }, (_, i) => i + 1).map((rank) => (
        <g key={`rank-${rank}`}>
          <line
            x1={g.plot.left}
            x2={g.plot.right}
            y1={g.yOfRank(rank)}
            y2={g.yOfRank(rank)}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={PAD + rankColumn}
            y={g.yOfRank(rank) + RANK_TICK.fontSize * 0.34}
            fill={muted}
            fontSize={RANK_TICK.fontSize}
            fontWeight={RANK_TICK.fontWeight}
            textAnchor="end"
          >
            {rank}
          </text>
        </g>
      ))}
      {yearTicks.map(({ year, i }) => (
        <text
          key={`year-${year}`}
          x={g.xOfIndex(i)}
          y={g.plot.bottom + 18 + RANK_TICK.fontSize}
          fill={muted}
          fontSize={RANK_TICK.fontSize}
          fontWeight={RANK_TICK.fontWeight}
          textAnchor={
            i === 0 ? "start" : i === years.length - 1 ? "end" : "middle"
          }
        >
          {year}
        </text>
      ))}

      {/* The five background lines, in one neutral, drawn first so the accent sits above them. */}
      {g.lines.map((l, i) =>
        i === subjectIndex ? null : (
          <path
            key={`line-${l.country}`}
            d={l.points
              .map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ")}
            fill="none"
            stroke={muted}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ),
      )}

      {/* The subject's line: on top, and heavier, so a crossing between it and a background line
          reads as the accent line's crossing rather than a tangle. */}
      <path
        d={subjectTrack.points
          .map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")}
        fill="none"
        stroke={accent}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Terminal dots at both ends of every line — the anchor each name label is read against. */}
      {g.lines.map((l, i) =>
        [l.points[0], l.points[l.points.length - 1]].map((p, end) => (
          <circle
            key={`dot-${l.country}-${end}`}
            cx={p.x}
            cy={p.y}
            r={DOT_R}
            fill={i === subjectIndex ? accent : muted}
          />
        )),
      )}

      {/* The crossings, ringed on the subject's own line and captioned in the corridor each one
          opened. Ring and caption are both in muted ink, never in the line's own hue. */}
      {captions.map((c) => (
        <g key={`crossing-${c.key}`}>
          <circle
            cx={c.ringX}
            cy={c.ringY}
            r={DOT_R + 4}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
          />
          <text
            x={c.x}
            y={c.y}
            fill={muted}
            fontSize={CROSSING.fontSize}
            fontWeight={CROSSING.fontWeight}
          >
            {c.text}
          </text>
        </g>
      ))}

      {/* Both ends named — the still frame's answer to a reveal it does not have. */}
      {g.lines.map((l, i) => {
        const isSubject = i === subjectIndex;
        const font = isSubject ? NAME_ACCENT : NAME;
        const first = l.points[0];
        const last = l.points[l.points.length - 1];
        return (
          <g key={`name-${l.country}`}>
            <text
              x={first.x - DOT_R - GAP}
              y={first.y + NAME.fontSize * 0.34}
              fill={ink}
              fontSize={font.fontSize}
              fontWeight={font.fontWeight}
              textAnchor="end"
            >
              {l.country}
            </text>
            <text
              x={last.x + DOT_R + GAP}
              y={last.y + NAME.fontSize * 0.34}
              fill={ink}
              fontSize={font.fontSize}
              fontWeight={font.fontWeight}
            >
              {l.country}
            </text>
          </g>
        );
      })}

      {/* The two crossings this frame cannot draw: against countries that have since left the band,
          so they have no line to cross. */}
      {conclusionLines.map((text, i) => (
        <text
          key={text}
          x={PAD}
          y={
            g.plot.bottom + yearLabelBlock + conclusionGap + i * CONCLUSION.lead
          }
          fill={ink}
          fontSize={CONCLUSION.fontSize}
          fontWeight={CONCLUSION.fontWeight}
        >
          {text}
        </text>
      ))}
    </svg>
  );
}

export { FRAME };
