/**
 * The video beat of "Four regions emptied in 2025 — and one of them did most of it."
 * 11 seconds, 30fps, drawn at whichever of the three export sizes the BRIEF pins. This beat's
 * canonical size is PORTRAIT (1080 × 1920); the same composition also draws SQUARE (1080 × 1080),
 * which is the second form the journalist asked for ("a version for the feed as well").
 *
 * WHY A DIVERGING BAR. `net_migration_2025` is signed: four of the seven regions are negative,
 * three positive. The type sheet's own sentence — "who gained and who lost, and by how much, for a
 * set of categories whose values are SIGNED" — is this beat's question verbatim. A plain bar of
 * absolute magnitudes would draw Ouest's +15,600 and a hypothetical -15,600 identically, which is
 * the one distinction the story is about.
 *
 * WHY EVERY BAR STAYS ON THE SAME SCALE. Montagne's -780 is 3.6% of Centre's -21,800, so at a
 * shared scale it is a sliver about thirteen pixels long. That is the honest picture and it is kept:
 * the reference for this beat (Republik, "Die Emissionen des Zulieferers…") is a chart whose named
 * subject has a bar too short to hold its own number, and the lesson lifted from it is that the
 * number moves OUTSIDE the bar while the bar keeps its true length. Rescaling, breaking the axis or
 * plotting magnitudes on a log scale would each hide the finding the frozen data actually carries.
 *
 * WHY NO TICK AXIS. At portrait's 36px type floor a tick label reading "−20 000" is about 150px
 * wide, and four of them across a 614px plot band collide with each other and with the bars. Every
 * bar therefore carries its own value directly, which is what the doctrine prefers anyway, and the
 * only furniture left on the value dimension is the zero line and the axis title naming the unit.
 * That is a removal decided here and recorded in BRIEF.md, not a token quietly left out.
 *
 * COLOUR. One accent, doing one job. Sign is carried by GEOMETRY — which side of the zero line a bar
 * sits on — so spending the accent on losses-versus-gains would mark a distinction the layout
 * already makes unambiguously and leave nothing for the region the beat is about. Every bar is drawn
 * in the furniture's own ink; the accent is Centre's alone, and it arrives at `subject`.
 *
 * `measureText`, `wrap` and `people` are this beat's own copies — duplicate, do not link: nothing
 * under a story imports another story's or a skill's own files.
 */

import { scaleLinear } from "d3-scale";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import { progressOf, type BeatTiming } from "#shared/chart-video/timing.ts";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-video/sizes.mjs";
import { MIGRATION_TIMING } from "./timing-contract";

/**
 * Every type token this beat draws, in frame pixels. Both sizes it ships at are 1080 wide and both
 * carry a 36px floor (`sizes.mjs`, `minTypePx`), so one set of tokens serves both and every one of
 * them clears that floor — `assertTypeFloor` measures the rendered markup and refuses otherwise.
 */
const TITLE = { fontSize: 54, fontWeight: 700, lead: 66 };
const CAVEAT = { fontSize: 36, fontWeight: 400, lead: 44 };
const AXIS_TITLE = { fontSize: 36, fontWeight: 500 };
const ROW_LABEL = { fontSize: 36, fontWeight: 500 };
const ROW_LABEL_SUBJECT = { fontSize: 36, fontWeight: 700 };
const VALUE_LABEL = { fontSize: 38, fontWeight: 600 };
const CONCLUSION = { fontSize: 42, fontWeight: 600, lead: 52 };
const SOURCE = { fontSize: 36, fontWeight: 400 };
/** How much further from its own bar end the SUBJECT's number sits than every other row's — the
 *  one row carrying a wash needs its number a little clear of it. Also the share of the value
 *  gutter that keeps that number out of the frame's side reserve. */
const RING_R = 16;

export type Row = {
  region: string;
  /** Net migration for 2025, in people. Negative means the region lost people on balance. */
  net: number;
};

let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  {
    fontSize,
    fontWeight = 400,
    fontFamily,
  }: { fontSize: number; fontWeight?: number; fontFamily: string },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  fontFamily: string,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, { ...font, fontFamily }) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/**
 * A count of people, signed with U+2212 (not a hyphen) when negative and with a real "+" when
 * positive — this IS a change, and a gain that does not say so reads as a level. Thousands are
 * grouped with a narrow no-break space (U+202F) rather than a comma, so the sign, the digits and
 * the grouping can never be mistaken for a decimal.
 */
export function people(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : "+";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The domain contains zero rather than starting at it, and is NOT made symmetric: mirroring the
 * -21,800 side with a +21,800 half nobody occupies would spend a third of a narrow portrait frame
 * on empty space. Equal people-per-pixel either side of zero is what makes the seven bars
 * comparable; the visible asymmetry — four bars reaching left, three a shorter distance right — is
 * the data's own shape.
 */
export function divergingGeometry(
  rows: Row[],
  {
    width,
    padding,
    top,
    bottom,
  }: {
    width: number;
    padding: { right: number; left: number };
    top: number;
    bottom: number;
  },
) {
  const plot = {
    left: padding.left,
    top,
    right: width - padding.right,
    bottom,
  };
  const values = rows.map((r) => r.net);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const x = scaleLinear().domain([min, max]).range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xValue: x(r.net),
  }));

  return { plot, rowHeight, points, zeroX: x(0), x };
}

/**
 * EVERY BASELINE AND EVERY BOX THIS BEAT DRAWS, as one pure function of its inputs.
 *
 * WHY IT IS EXPORTED, AND WHY THAT MATTERS AT PORTRAIT. `sizes.mjs` ships two refusals this beat
 * genuinely needs — `assertTypeFloor` (no type under 36px at portrait) and `assertWithinStage` (no
 * word outside Meta's 269–1248 safe band) — and both of them read RENDERED SVG MARKUP. A static
 * beat has that: its own rasteriser hands the markup back. A video beat does not: its marks exist
 * only inside Remotion's own browser render, and what comes out is a PNG and an mp4, artifacts with
 * no attributes in them. `chart-video/SKILL.md` states that limit for its dash guard in the same
 * words. So the layout is lifted out here, and `render.mjs` measures THESE numbers — the same ones
 * the component draws with, from the same call — instead of measuring nothing.
 */
export function layoutFor({
  data,
  size,
  title,
  caveat,
  source,
  conclusion,
  fontFamily,
}: {
  data: Row[];
  size: string;
  title: string;
  caveat: string;
  source: string;
  conclusion: string;
  fontFamily: string;
}) {
  const { width, height } = sizeFor(size);
  const PAD = frameInsetFor(size);

  // Everything is laid out inside the SAFE BAND rather than inside the frame. At portrait that band
  // is the 979px Meta reserves for content (269–1248); at square there is no reserve, so the band is
  // the frame less its own margin. One expression, no branch.
  const stage = stageFor(size);
  const bandTop = Math.max(stage.top, PAD);
  const bandBottom = Math.min(stage.bottom, height - PAD);
  const column = width - PAD * 2;

  const titleLines = wrap(title, column, TITLE, fontFamily);
  const titleBaseline = bandTop + TITLE.fontSize;
  const caveatLines = wrap(caveat, column, CAVEAT, fontFamily);
  const caveatBaseline = titleBaseline + (titleLines.length - 1) * TITLE.lead + 62;
  const axisTitleBaseline = caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + 56;

  const sourceLines = wrap(source, column, SOURCE, fontFamily);
  const sourceLead = SOURCE.fontSize * 1.35;
  const sourceBaseline = bandBottom - (sourceLines.length - 1) * sourceLead - 6;
  const conclusionLines = wrap(conclusion, column, CONCLUSION, fontFamily);
  const conclusionGap = 46;
  const conclusionBaseline =
    sourceBaseline -
    (sourceLines.length - 1) * sourceLead -
    44 -
    (conclusionLines.length - 1) * CONCLUSION.lead;

  // The widest value label, PLUS the extra offset the subject's own label takes to clear its ring.
  // Without the ring's share, the longest bar's label — which is the subject's, by construction —
  // reaches 16px past the frame margin and into Meta's 6%-per-side reserve, which `stageFor` does
  // not model: this size table records a stage as `{top, bottom}` only, so nothing measures the
  // sides. Found by looking at the portrait render, not by a guard.
  const valueGutter =
    Math.max(...data.map((r) => measureText(people(r.net), { ...VALUE_LABEL, fontFamily }))) +
    18 +
    RING_R +
    18;

  const geometry = divergingGeometry(data, {
    width,
    padding: { left: PAD + valueGutter, right: PAD + valueGutter },
    top: axisTitleBaseline + 46,
    bottom: conclusionBaseline - conclusionGap - CONCLUSION.fontSize,
  });

  return {
    width,
    height,
    PAD,
    stage,
    column,
    titleLines,
    titleBaseline,
    caveatLines,
    caveatBaseline,
    axisTitleBaseline,
    sourceLines,
    sourceLead,
    sourceBaseline,
    conclusionLines,
    conclusionBaseline,
    valueGutter,
    geometry,
    tokens: {
      TITLE,
      CAVEAT,
      AXIS_TITLE,
      ROW_LABEL,
      ROW_LABEL_SUBJECT,
      VALUE_LABEL,
      CONCLUSION,
      SOURCE,
    },
  };
}

/**
 * THE MARKUP THIS BEAT'S WORDS WOULD MAKE, for the two guards that can only read markup.
 *
 * Not a second renderer and not a claim about pixels: one `<text>` per run the component draws, with
 * that run's own baseline and font size, built from ONE `layoutFor` call so the measured layout and
 * the drawn layout physically cannot be different numbers. Feed it to `assertTypeFloor` and
 * `assertWithinStage`, exactly as a static beat feeds them its rasteriser's own output.
 */
export function textRunsMarkup(layout: ReturnType<typeof layoutFor>, subjectRegion: string): string {
  const runs: Array<{ y: number; size: number; text: string }> = [];
  for (const [i, text] of layout.titleLines.entries())
    runs.push({ y: layout.titleBaseline + i * TITLE.lead, size: TITLE.fontSize, text });
  for (const [i, text] of layout.caveatLines.entries())
    runs.push({ y: layout.caveatBaseline + i * CAVEAT.lead, size: CAVEAT.fontSize, text });
  runs.push({ y: layout.axisTitleBaseline, size: AXIS_TITLE.fontSize, text: "axis title" });
  for (const p of layout.geometry.points) {
    runs.push({ y: p.y + ROW_LABEL.fontSize * 0.34, size: ROW_LABEL.fontSize, text: p.region });
    runs.push({
      y: p.y + ROW_LABEL.fontSize * 0.34,
      size: VALUE_LABEL.fontSize,
      text: people(p.net),
    });
  }
  for (const [i, text] of layout.conclusionLines.entries())
    runs.push({ y: layout.conclusionBaseline + i * CONCLUSION.lead, size: CONCLUSION.fontSize, text });
  for (const [i, text] of layout.sourceLines.entries())
    runs.push({ y: layout.sourceBaseline + i * layout.sourceLead, size: SOURCE.fontSize, text });
  void subjectRegion;
  return runs
    .map((r) => `<text y="${r.y}" font-size="${r.size}">${r.text}</text>`)
    .join("\n");
}

/** How far through row `i`'s own growth window the master `reveal` progress is, 0..1. */
function rowWindow(i: number, rowCount: number) {
  const span = 1 / rowCount;
  const start = i * span;
  return { start, end: Math.min(1, start + span * 2.2) };
}

export type RegionalMigrationVideoProps = {
  /** Pre-sorted by net migration, descending — render.mjs's job, not this component's. */
  data: Row[];
  /** One of `landscape`, `square`, `portrait`; read from BRIEF.md by render.mjs. */
  size: string;
  title: string;
  source: string;
  caveat: string;
  axisTitle: string;
  subjectRegion: string;
  conclusion: string;
  fontFamily: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  timing?: BeatTiming;
};

export function RegionalMigrationVideo({
  data,
  size,
  title,
  source,
  caveat,
  axisTitle,
  subjectRegion,
  conclusion,
  fontFamily,
  ground,
  accent,
  ink,
  muted,
  timing = MIGRATION_TIMING,
}: RegionalMigrationVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = sizeFor(size);

  if (data.length < 3) throw new Error(`need at least three rows, got ${data.length}`);
  const straddles = data.some((r) => r.net > 0) && data.some((r) => r.net < 0);
  if (!straddles)
    throw new Error(
      `every value has the same sign — a diverging bar drawn on a domain that never crosses zero ` +
        `is a plain bar chart with a decorative complication, and the type sheet says so`,
    );
  const subjectIndex = data.findIndex((r) => r.region === subjectRegion);
  if (subjectIndex < 0) throw new Error(`no row for subject ${JSON.stringify(subjectRegion)}`);

  // ── Layout. Identical at every frame, so nothing shifts when a mark lands. Computed by the
  // exported pure function below, so this beat's own render script can measure the same baselines
  // and type sizes without a browser — see `layoutFor`'s own note on why that had to exist.
  const L = layoutFor({ data, size, title, caveat, source, conclusion, fontFamily });
  const {
    PAD,
    column,
    titleLines,
    titleBaseline,
    caveatLines,
    caveatBaseline,
    axisTitleBaseline,
    sourceLines,
    sourceLead,
    sourceBaseline,
    conclusionLines,
    conclusionBaseline,
    geometry: g,
  } = L;
  void column;

  const barHeight = Math.min(44, g.rowHeight * 0.55);

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  const referenceY2 = interpolate(referenceProgress, [0, 1], [g.plot.top, g.plot.bottom], {
    easing: Easing.out(Easing.cubic),
  });

  const growth = g.points.map((_, i) => {
    const w = rowWindow(i, g.points.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  const rowOpacity = growth.map((t) =>
    interpolate(t, [0, 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const valueOpacity = growth.map((t) =>
    interpolate(t, [0.05, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.16]);
  const emphasis = interpolate(subject, [0, 1], [0, 1], { easing: Easing.out(Easing.cubic) });

  const conclusionOpacity = interpolate(conclusionProgress, [0.2, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rowBaselineOffset = ROW_LABEL.fontSize * 0.34;
  const nameGap = 20;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={fontFamily}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((text, i) => (
        <text
          key={`title-${i}`}
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
          key={`caveat-${i}`}
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
          key={`source-${i}`}
          x={PAD}
          y={sourceBaseline + i * sourceLead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {text}
        </text>
      ))}

      <text
        x={PAD}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
        opacity={establish}
      >
        {axisTitle}
      </text>

      {highlightOpacity > 0 ? (
        <rect
          x={0}
          y={g.points[subjectIndex].y - g.rowHeight / 2}
          width={width}
          height={g.rowHeight}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The bars, growing out of zero, and each region's name on the OPPOSITE side of the line
          from its own bar — the diverging bar's own convention, and the only way seven names fit a
          1080px frame without a gutter that would halve the plot. */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const left = Math.min(g.zeroX, end);
        const isSubject = i === subjectIndex;
        return (
          <g key={p.region}>
            <rect
              x={left}
              y={p.y - barHeight / 2}
              width={Math.abs(end - g.zeroX)}
              height={barHeight}
              fill={isSubject && emphasis > 0 ? accent : ink}
              opacity={rowOpacity[i]}
            />
            <text
              x={p.net >= 0 ? g.zeroX - nameGap : g.zeroX + nameGap}
              y={p.y + rowBaselineOffset}
              fill={ink}
              fontSize={ROW_LABEL.fontSize}
              fontWeight={isSubject && emphasis > 0.5 ? ROW_LABEL_SUBJECT.fontWeight : ROW_LABEL.fontWeight}
              textAnchor={p.net >= 0 ? "end" : "start"}
              opacity={rowOpacity[i]}
            >
              {p.region}
            </text>
          </g>
        );
      })}

      {/* The reference: the zero line, drawn ON TOP of the bars so no fill can ever cover it. */}
      {referenceProgress > 0 ? (
        <line
          x1={g.zeroX}
          x2={g.zeroX}
          y1={g.plot.top}
          y2={referenceY2}
          stroke={ink}
          strokeWidth={4}
        />
      ) : null}

      {/* Value labels, drawn last so nothing can strike through them, each with a ground-coloured
          halo. They sit OUTSIDE the bar end — which is the whole reason Montagne's thirteen-pixel
          bar can still state its own 780. */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isSubject = i === subjectIndex;
        const labelX =
          p.net >= 0
            ? Math.max(end, g.zeroX) + (isSubject ? RING_R : 12)
            : Math.min(end, g.zeroX) - (isSubject ? RING_R : 12);
        return (
          <text
            key={`value-${p.region}`}
            x={labelX}
            y={p.y + rowBaselineOffset}
            fill={isSubject && emphasis > 0.5 ? accent : ink}
            stroke={ground}
            strokeWidth={9}
            paintOrder="stroke"
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor={p.net >= 0 ? "start" : "end"}
            opacity={valueOpacity[i]}
          >
            {/* The length currently drawn, not the value it is heading for. */}
            {people(p.net * growth[i])}
          </text>
        );
      })}

      {conclusionOpacity > 0
        ? conclusionLines.map((text, i) => (
            <text
              key={`conclusion-${i}`}
              x={PAD}
              y={conclusionBaseline + i * CONCLUSION.lead}
              fill={ink}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
              opacity={conclusionOpacity}
            >
              {text}
            </text>
          ))
        : null}
    </svg>
  );
}
