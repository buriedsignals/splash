/**
 * The web beat of "Applications fell every year from 2008 to 2011, then the registry went dark for
 * two years — and came back 73% higher than where it left off."
 *
 * THE TRAP THIS BEAT ANSWERS (see `BRIEF.md`, "The trap, and the decision"): the series has a real
 * hole. 2008–2012 are present, then 2013 and 2014 are simply MISSING (`article.md`: "the registry
 * was not published for 2013 or 2014"), then 2015–2017 resume. A line drawn straight from the 2012
 * reading to the 2015 reading — the ordinary consequence of feeding eight points to one `<path>` in
 * data order — would draw a smooth three-year rise across a span the registry never reported,
 * telling the reader something the data never said: that applications climbed steadily through
 * 2013 and 2014, when in truth nothing at all is known about those two years.
 *
 * DECISION: the x-axis is a genuinely continuous year scale (`Math.min`..`Math.max`, never
 * index-based), so 2012 and 2015 sit three units apart exactly as 2008 and 2009 sit one unit
 * apart — the temporal gap is already spatially honest before anything else is drawn. On top of
 * that true spacing, the geometry is split into TWO path segments (2008–2012, 2015–2017) with
 * NOTHING drawn between them — no connecting line, dashed or solid, real or implied — and the empty
 * space itself is annotated: a shaded band and a label stating plainly that the registry published
 * nothing for those two years. This is drawn UNCONDITIONALLY, in the same overlay layer as every
 * other argument-bearing label, never gated behind hover.
 *
 * THE WEB GENRE'S OWN REASON TO EXIST HERE: `article.md` asks that "readers should be able to
 * explore each year themselves." Every one of the eight real readings carries its own hoverable,
 * keyboard-focusable point with its exact count baked into `data-detail` at build time — the static
 * frame would have to choose which years get a printed label; this format gives every one of them
 * on demand, which is the whole reason this beat is a web beat and not a still.
 *
 * Written in the fluid-frame shape `chart-web/assets/ChartWebSeed.tsx` and
 * `proof/co2-suisse/EmissionsWeb.tsx` teach: the `<svg>` carries geometry only (no `<text>`), every
 * word is plain HTML positioned by `%` over the same box at a fixed pixel size. No filter — this
 * beat fails the skill's own filter test (`SKILL.md`, "When to use"): there is no reader-chosen
 * dimension to narrow to here, the gap is structural, not something to explore in or out of.
 *
 * `WebFrame`, `wrap`, `measure`-as-a-prop: duplicated from the seed/`EmissionsWeb.tsx`, not
 * imported — a story declares its own matching copy, the "duplicate, do not link" ruling this
 * project applies to anything with no `#shared/*` vendoring path.
 */

import { tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";

type Reading = { year: number; applications: number };
type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebFrame = {
  width: number;
  height: number;
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  xTickHint: number;
};

export const FRAME: WebFrame = {
  width: 900,
  height: 460,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  xTickHint: 8,
};

/** Wrap on the measured width of the real string. Kept and exported, unchanged from the
 *  `EmissionsWeb.tsx` copy, for the cross-skill parity guard's own reasoning — not called by
 *  `AsylumGapWeb` below, whose furniture is plain HTML the browser wraps itself. */
function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measure(word, font) <= maxWidth) {
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
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of breakLongTokens(
    text.split(/\s+/),
    maxWidth,
    font,
    measure,
  )) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

const POINT_INSET = 6;

/** Data to coordinates. Pure — no colour, no font, no label. The x domain is the real year span,
 *  never nicened and never index-based, so a multi-year gap in the data is already spatially
 *  honest: 2012 and 2015 sit three units apart, exactly as 2008 and 2009 sit one apart. */
export function applicationsGeometry(
  data: Reading[],
  {
    width,
    height,
    reference,
  }: { width: number; height: number; reference: number },
) {
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const x = scaleLinear()
    .domain([first, last])
    .range([POINT_INSET, width - POINT_INSET]);
  const y = scaleLinear()
    .domain(
      (() => {
        const [lo, hi] = [
          Math.min(...data.map((d) => d.applications), reference),
          Math.max(...data.map((d) => d.applications), reference),
        ];
        return [lo, hi];
      })(),
    )
    .nice()
    .range([height, 0]);

  const points = data.map((d) => ({
    ...d,
    x: x(d.year),
    y: y(d.applications),
  }));
  return { width, height, points, x, y, referenceY: y(reference) };
}

/** Consecutive-pair segments, split so that a pair spanning more than one calendar year (the
 *  registry's own gap) is marked `gap: true` and never drawn as a line. */
export function segments(
  points: ReturnType<typeof applicationsGeometry>["points"],
) {
  const segs: Array<{
    a: (typeof points)[number];
    b: (typeof points)[number];
    gap: boolean;
  }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    segs.push({ a, b, gap: b.year - a.year > 1 });
  }
  return segs;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function AsylumGapWeb({
  data,
  title,
  source,
  alt,
  caveat,
  ground,
  accent,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  lowYear,
  lowLabel,
  gapLabel,
  frame,
  measure,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  lowYear: number;
  lowLabel: string;
  gapLabel: string;
  frame: WebFrame;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const g = applicationsGeometry(data, {
    width: frame.width,
    height: frame.height,
    reference,
  });
  const segs = segments(g.points);

  // One <path> per real, unbroken run of consecutive years — never one path across the gap.
  const paths: string[] = [];
  let current = "";
  for (const seg of segs) {
    if (seg.gap) {
      if (current) {
        paths.push(current);
        current = "";
      }
      continue;
    }
    if (!current) current = `M ${seg.a.x.toFixed(1)} ${seg.a.y.toFixed(1)}`;
    current += ` L ${seg.b.x.toFixed(1)} ${seg.b.y.toFixed(1)}`;
  }
  if (current) paths.push(current);

  const gapSeg = segs.find((s) => s.gap);

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fmt(last.applications)}`;
  const low = g.points.find((p) => p.year === lowYear);
  if (!low) throw new Error(`no point for lowYear ${lowYear}`);

  const yTicks = g.y.ticks(5);
  const tickLabels = yTicks.map((v) => fmt(v));
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const years = data.map((d) => d.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const xStep = Math.max(1, tickStep(firstYear, lastYear, frame.xTickHint));
  const xTicks: Array<{ year: number; x: number }> = data.map((d) => ({
    year: d.year,
    x: g.points.find((p) => p.year === d.year)!.x,
  }));

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
      }}
    >
      <div className="chart-header" style={{ marginBottom: 22 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{caveat}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis">
          {yTicks.map((v, i) => (
            <span
              key={v}
              className="axis-label y"
              style={{ top: `${pct(g.y(v), frame.height)}%`, color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {yTicks.map((v) => (
            <line
              key={v}
              x1={0}
              x2={frame.width}
              y1={g.y(v)}
              y2={g.y(v)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The gap: shaded, never bridged by a line. Drawn unconditionally, like the reference
              rule — this is the argument, not an optional detail. */}
          {gapSeg ? (
            <rect
              x={gapSeg.a.x}
              y={0}
              width={gapSeg.b.x - gapSeg.a.x}
              height={frame.height}
              fill={muted}
              opacity={0.12}
            />
          ) : null}

          {/* The reference: the 2008 starting level, so a reader can see which years actually sit
              above or below where the decade began. */}
          <line
            x1={0}
            x2={frame.width}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <circle cx={low.x} cy={low.y} r={3} fill={muted} />
          <circle
            cx={g.points[g.points.length - 1].x}
            cy={g.points[g.points.length - 1].y}
            r={4}
            fill={accent}
          />

          {/* Interaction layer: every real reading gets its own hoverable, keyboard-focusable
              point — this is what "explore each year themselves" means in this format. Invisible
              at rest, `tabIndex={0}` and `data-detail` baked in at build time so the population of
              reachable marks is identical with the inline script absent entirely. */}
          {g.points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              cx={p.x}
              cy={p.y}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${p.year} : ${fmt(p.applications)} applications`}
              data-year={p.year}
              data-detail={`${p.year} · ${fmt(p.applications)} applications`}
            />
          ))}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note reference-label"
            style={{
              left: "0%",
              top: `${pct(g.referenceY, frame.height)}%`,
              color: muted,
            }}
          >
            {referenceLabel}
          </span>
          <span
            className="note peak-label above"
            style={{
              left: `${pct(low.x, frame.width)}%`,
              top: `${pct(low.y, frame.height)}%`,
              color: muted,
            }}
          >
            {lowLabel}
          </span>
          <span
            className="end-label"
            style={{
              left: `${pct(g.points[g.points.length - 1].x, frame.width)}%`,
              top: `${pct(g.points[g.points.length - 1].y, frame.height)}%`,
              color: accent,
            }}
          >
            {endLabel}
          </span>
          {gapSeg ? (
            <span
              className="note peak-label above"
              style={{
                left: `${pct((gapSeg.a.x + gapSeg.b.x) / 2, frame.width)}%`,
                // 20%, not nearer the top: the "above" class lifts the label by its own full
                // line-height via `translate(-50%, -100%)` — at the shortest plots this format
                // ships (a phone window clamps the plot to well under 200px, see
                // `web-discipline.md`, "A beat FITS the window; it does not FILL it"), a smaller
                // fraction left the lifted label's hit box spilling out of `.chart-plot` entirely,
                // into the 22px header gap above it — caught by `verify-web.mjs`'s driven hover
                // check at 375x812, not by looking at a single screenshot.
                top: `${pct(frame.height * 0.2, frame.height)}%`,
                color: ink,
              }}
            >
              {gapLabel}
            </span>
          ) : null}
        </div>

        <div className="x-axis">
          {xTicks.map((tick) => (
            <span
              key={tick.year}
              className="axis-label x"
              style={{ left: `${pct(tick.x, frame.width)}%`, color: muted }}
            >
              {tick.year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
