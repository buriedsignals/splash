/**
 * Beat 1 of "CO₂ suisse, retour au niveau de 1967", drawn through the design base.
 *
 * This supersedes the beat's former `EmissionsLine.tsx`, which it replaced entirely and which is
 * gone: same geometry, typography taken out. Where that file declared
 * `TITLE = { fontSize: 26, fontWeight: 700 }` and five siblings — constants copied from beat to
 * beat until the whole tree used one family, four weights, and zero italic, tracking or case across
 * 122 components — this one asks a DIRECTION what each register looks like, and never learns the
 * answer. `registerOf` returns the attributes; `applyCase` decides whether the direction
 * shouts; `deriveFurniture` turns an ink ROLE into a colour against the real ground.
 *
 * Its treatment labels go through the ARBITER rather than being placed one by one. That is the
 * whole reason the arbiter exists: five treatments once put three labels in the same corner of this
 * exact beat, each correctly placed by a treatment that could not see the others.
 *
 * The frame, the scales, the crossing and the peak all come from `crossing-geometry.ts`, unchanged
 * and shared with the video beat.
 */

import { scaleLinear } from "d3-scale";
import { tickStep } from "d3-array";
import { area, line } from "d3-shape";
import {
  crossingGeometry,
  fr,
  yTickValues,
  type Reading,
} from "./crossing-geometry";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";
import { inkThatReadsOver } from "#shared/chart-beat/annotation-ink.mjs";
import { NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { leadOf, registerOf } from "#shared/design-base/register.mjs";

const FRAME = { width: 900, height: 560 };
const UNIT = "Mt";
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;
const MIN_GRIDLINE_GAP_PX = 20;

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedLine({
  data,
  title,
  source,
  alt,
  limits,
  eyebrow,
  reference,
  referenceLabel,
  peakLabel,
  direction,
  treatments,
  eras = [],
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  limits: string;
  eyebrow: string;
  reference: number;
  referenceLabel: string;
  peakLabel: string;
  direction: any;
  /** The ids `applicableTreatments` returned for this beat. A treatment absent from this list is
   *  not drawn — the data shape decides, never the component. */
  treatments: string[];
  eras?: Array<{ from: number; to: number; label: string }>;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;

  /** A register, resolved once, with its ink already turned from a role into a colour. */
  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  /** Every text this component draws goes through here, so no call site decides case for itself. */
  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
  }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && measureText(trial, sizeOf(r)) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    return current ? [...lines, current] : lines;
  }

  // ── the header, composed as the direction says ────────────────────────────
  const split = direction.header === "split";
  const centred = direction.header === "centre";
  const titleWidth = split ? (width - PAD * 2) * 0.62 : width - PAD * 2;
  const titleLines = wrap(set(title, display), titleWidth, display);
  const lead = leadOf(display);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleBaseline = eyebrowBaseline + 20 + display.fontSize;
  const titleBottom = titleBaseline + (titleLines.length - 1) * lead;

  const limitsWidth = split ? (width - PAD * 2) * 0.33 : width - PAD * 2;
  const limitsLines = wrap(limits, limitsWidth, body);
  const bodyLead = leadOf(body);
  const limitsBaseline = split ? titleBaseline : titleBottom + 26;
  const limitsBottom = limitsBaseline + (limitsLines.length - 1) * bodyLead;

  const ruleY = Math.max(titleBottom, limitsBottom) + 20;
  const sourceBaseline = height - PAD;

  // ── the plot ──────────────────────────────────────────────────────────────
  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fr(last.mt)} ${UNIT}`;
  const [floor, , ceiling] = yTickValues(data, reference);
  const plotTop = ruleY + (direction.headRule ? 34 : 26);
  const plotBottom = height - (PAD + 26 + body.fontSize + 10);
  const gridScale = scaleLinear()
    .domain([floor, ceiling])
    .range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(reference);
  const regularTicks = gridScale
    .ticks(Y_TICK_HINT)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >= MIN_GRIDLINE_GAP_PX,
    );
  const yTicks = [...regularTicks, reference].sort((a, b) => a - b);
  const topValue = Math.max(...yTicks);
  const tickLabels = yTicks.map((v) =>
    v === topValue ? `${fr(v, 0)} ${UNIT}` : fr(v, v === reference ? 1 : 0),
  );
  const padding = {
    top: plotTop,
    right: PAD + 12 + measureText(endLabel, sizeOf(value)),
    bottom: PAD + 26 + body.fontSize + 10,
    left:
      PAD +
      12 +
      Math.max(...tickLabels.map((l) => measureText(l, sizeOf(axis)))),
  };

  /** RUNS ON ONE LINE SHARE A BASELINE, NOT AN INK-BOX EDGE — and the difference is visible.
   *
   *  MEASURED on this tree's own delivered SVGs: six country names under six groups came out on six
   *  different baselines, 1.5px apart at 960px, 3px in the delivered file. The cause is that
   *  `measureTextBand` answers per STRING — "Suède" carries an accent, "France" does not — so each
   *  label got a box of its own height, the arbiter aligned the boxes, and the baselines fell where
   *  they fell.
   *
   *  The COLLISION box stays the string's own ink, because inflating it to a common band costs real
   *  labels: doing that dropped this corpus's end-value label in all three directions. What changes
   *  is where the run is DRAWN inside the box the arbiter granted it — against the band of its
   *  REGISTER, measured once on a probe carrying an ascender, a descender and a comma, from
   *  whichever edge the chosen anchor holds fixed. Runs sharing an anchor and a y then share a
   *  baseline, whatever glyphs they happen to carry. */
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
  const baselineOf = (p: any, r: any) => {
    const band = bandOf(r);
    // `above` holds the box's bottom edge, `below` its top, and the side anchors centre it.
    if (p.anchor === "above") return p.box.y + p.box.height - band.descent;
    if (p.anchor === "below") return p.box.y + band.ascent;
    return p.box.y + p.box.height / 2 + (band.ascent - band.descent) / 2;
  };

  const g = crossingGeometry(data, { width, height, padding, reference });
  const path = line<(typeof g.points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)
    .digits(1)(g.points)!;

  const on = (id: string) => treatments.includes(id);
  const xOfYear = (year: number) => g.points.find((p) => p.year === year)?.x ?? null;

  /** A centred mean, defined only where the whole window exists: a smoothed path must never be
   *  drawn past the readings that support it. */
  const SMOOTH_WINDOW = 5;
  const half = Math.floor(SMOOTH_WINDOW / 2);
  const smoothed = on("raw-under-smoothed")
    ? g.points.slice(half, g.points.length - half).map((_, i) => {
        const at = i + half;
        let sum = 0;
        for (let k = at - half; k <= at + half; k += 1) sum += data[k].mt;
        return { x: g.points[at].x, y: gridScale(sum / SMOOTH_WINDOW) };
      })
    : [];
  const smoothPath = smoothed.length
    ? line<{ x: number; y: number }>().x((p) => p.x).y((p) => p.y).digits(1)(smoothed)!
    : null;

  const bandPath = on("area-to-reference")
    ? area<(typeof g.points)[number]>()
        .x((p) => p.x)
        .y0(g.referenceY)
        .y1((p) => p.y)
        .digits(1)(g.points)!
    : null;

  const drawnEras = on("era-bands")
    ? eras
        .map((e) => ({ ...e, x1: xOfYear(e.from), x2: xOfYear(e.to) }))
        .filter((e): e is typeof e & { x1: number; x2: number } => e.x1 !== null && e.x2 !== null)
    : [];

  const years = data.map((d) => d.year);
  const xStep = tickStep(Math.min(...years), Math.max(...years), X_TICK_HINT);
  const xTicks: number[] = [];
  for (
    let y = Math.ceil(Math.min(...years) / xStep) * xStep;
    y <= Math.max(...years);
    y += xStep
  )
    xTicks.push(y);
  const ticksX = xTicks
    .map((year) => ({ year, point: g.points.find((p) => p.year === year) }))
    .filter(
      (t): t is { year: number; point: (typeof g.points)[number] } =>
        t.point !== undefined,
    )
    .map(({ year, point }) => ({ year, x: point.x }));

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  // Each request names its register; the arbiter decides where — and whether — it lands. Nothing
  // here places its own label, which is exactly the coupling the three-stacked-labels defect came
  // from.
  const requests = [
    {
      id: "end-value",
      treatment: "direct-end-label-in-the-series-colour",
      text: set(endLabel, value),
      at: { x: g.end.x, y: g.end.y },
      priority: 7,
      register: value,
      anchorPreference: "right",
    },
    {
      id: "reference",
      treatment: "accent-marks-the-thread",
      text: set(referenceLabel, annot),
      at: { x: g.plot.left + 60, y: g.referenceY },
      priority: 5,
      register: annot,
    },
    ...(on("crossing-marked") && g.crossing
      ? [
          {
            id: "crossing",
            treatment: "crossing-marked",
            text: set(`sous le niveau dès ${g.crossing.year}`, annot),
            at: { x: g.crossing.x, y: g.crossing.y },
            priority: 8,
            register: annot,
          },
        ]
      : []),
    ...drawnEras.map((e, i) => ({
      id: `era-${i}`,
      treatment: "era-bands",
      text: set(e.label, eyebrowReg),
      at: { x: (e.x1 + e.x2) / 2, y: g.plot.top + 6 },
      priority: 1,
      register: eyebrowReg,
    })),
    {
      id: "peak",
      treatment: "accent-marks-the-thread",
      text: set(peakLabel, annot),
      at: { x: g.peak.x, y: g.peak.y },
      priority: 4,
      register: annot,
    },
  ];

  // THE MARKS THE ARBITER MUST NOT SIT ON. The series is a path; what a label has to clear is the
  // band of pixels it occupies, so each reading contributes a small box around its own point and
  // the two marked points contribute their discs. Without this the end value lands on its own
  // line — measured on the first render of this beat, in all three directions at once.
  const HALF = Math.max(3, direction.stroke.series);
  const marks = [
    ...g.points.map((p) => ({
      x: p.x - HALF,
      y: p.y - HALF,
      width: HALF * 2,
      height: HALF * 2,
    })),
    { x: g.peak.x - 4, y: g.peak.y - 4, width: 8, height: 8 },
    { x: g.end.x - 5, y: g.end.y - 5, width: 10, height: 10 },
  ];

  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, anchors, priority }) => ({
      id,
      treatment,
      text,
      at,
      anchors,
      priority,
    })),
    {
      frame: {
        left: PAD,
        top: plotTop - 24,
        right: width - PAD,
        bottom: plotBottom + 30,
      },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const band = measureTextBand(text, sizeOf(request.register));
        return {
          width: measureText(text, sizeOf(request.register)),
          height: band.ascent + band.descent,
        };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(
      `  arbiter dropped ${dropped.length}: ` +
        dropped.map((d) => `${d.id} (${d.why})`).join("; "),
    );
  const byId = new Map(placed.map((p) => [p.id, p]));
  const registerById = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerById.get(id)!;
    return (
      <text
        x={p.box.x}
        y={baselineOf(p, r)}
        fill={r.fill}
        fontFamily={r.fontFamily}
        fontSize={r.fontSize}
        fontWeight={r.fontWeight}
        fontStyle={r.fontStyle}
        letterSpacing={r.letterSpacing}
      >
        {p.text}
      </text>
    );
  };

  const headerAnchor = centred ? "middle" : "start";
  const headerX = centred ? width / 2 : PAD;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
    >
      <desc>{alt}</desc>
      <defs>
        <clipPath id="above-ref">
          <rect
            x={g.plot.left}
            y={g.plot.top}
            width={g.plot.right - g.plot.left}
            height={Math.max(0, g.referenceY - g.plot.top)}
          />
        </clipPath>
        <clipPath id="below-ref">
          <rect
            x={g.plot.left}
            y={g.referenceY}
            width={g.plot.right - g.plot.left}
            height={Math.max(0, g.plot.bottom - g.referenceY)}
          />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      {/* THE REFERENCE LEVEL IS DRAWN BEHIND THE DATA, and that is a decision about PLACE.
          Drawn over the marks it read 1.08:1 against the accent it crossed on `creme`, 1.14:1 on
          `rapport`, 1.48:1 on `nocturne` — every one under the 3:1 a non-text mark owes (SC
          1.4.11). Recolouring could not save it: on `rapport` black reached only 2.96:1 against the
          accent and white 1.00:1 against the ground, so `inkThatReadsOver` threw, which is
          `visual-system.md`'s third outcome — "when NEITHER pole clears, the annotation is in the
          wrong PLACE, not the wrong colour." A level is what the data is measured against; it
          belongs under it.

          AND IT STOPS AT THE CROSSING. Run to the plot's right edge it passed straight through the
          two accented discs sitting on the level — the crossing's own mark and 2024's — and
          `backgroundAt` reports the topmost shape under each sample, so those two discs were what
          it crossed. Stopping the rule where the series meets it removes the overlap and states the
          finding at the same time: the level holds until 2023, and the rule ends where that stops
          being true. */}
      <line
        x1={g.plot.left}
        x2={g.crossing ? g.crossing.x - 10 : g.plot.right}
        y1={g.referenceY}
        y2={g.referenceY}
        stroke={inkThatReadsOver([direction.ground], NON_TEXT_CONTRAST_MIN)}
        strokeWidth={direction.stroke.rule}
        strokeDasharray="5 4"
        opacity={0.55}
      />

      <text
        x={headerX}
        y={eyebrowBaseline}
        fill={eyebrowReg.fill}
        fontFamily={eyebrowReg.fontFamily}
        fontSize={eyebrowReg.fontSize}
        fontWeight={eyebrowReg.fontWeight}
        letterSpacing={eyebrowReg.letterSpacing}
        textAnchor={headerAnchor}
      >
        {set(eyebrow, eyebrowReg)}
      </text>

      {titleLines.map((l, i) => (
        <text
          key={l}
          x={headerX}
          y={titleBaseline + i * lead}
          fill={display.fill}
          fontFamily={display.fontFamily}
          fontSize={display.fontSize}
          fontWeight={display.fontWeight}
          fontStyle={display.fontStyle}
          letterSpacing={display.letterSpacing}
          textAnchor={headerAnchor}
        >
          {l}
        </text>
      ))}

      {limitsLines.map((l, i) => (
        <text
          key={l}
          x={split ? PAD + (width - PAD * 2) * 0.67 : headerX}
          y={limitsBaseline + i * bodyLead}
          fill={body.fill}
          fontFamily={body.fontFamily}
          fontSize={body.fontSize}
          fontWeight={body.fontWeight}
          fontStyle={body.fontStyle}
          textAnchor={centred ? "middle" : "start"}
        >
          {l}
        </text>
      ))}

      {direction.headRule ? (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={ruleY}
          y2={ruleY}
          stroke={grid}
          strokeWidth={direction.stroke.rule}
        />
      ) : null}

      <text
        x={centred ? width / 2 : PAD}
        y={sourceBaseline}
        fill={body.fill}
        fontFamily={body.fontFamily}
        fontSize={body.fontSize - 1}
        fontWeight={body.fontWeight}
        fontStyle={body.fontStyle}
        textAnchor={centred ? "middle" : "start"}
      >
        {source}
      </text>

      {drawnEras.map((e) => (
        <rect
          key={e.label}
          x={e.x1}
          y={g.plot.top}
          width={e.x2 - e.x1}
          height={g.plot.bottom - g.plot.top}
          fill={muted}
          opacity={0.09}
        />
      ))}

      {bandPath ? (
        <g>
          <path d={bandPath} fill={direction.accent} opacity={0.15} clipPath="url(#above-ref)" />
          <path d={bandPath} fill={muted} opacity={0.1} clipPath="url(#below-ref)" />
        </g>
      ) : null}

      {yTicks.map((v, i) => (
        <g key={v}>
          {v === reference ? null : (
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={gridScale(v)}
              y2={gridScale(v)}
              stroke={grid}
              strokeWidth={direction.stroke.rule}
            />
          )}
          <text
            x={g.plot.left - 12}
            y={gridScale(v) + 4}
            fill={axis.fill}
            fontFamily={axis.fontFamily}
            fontSize={axis.fontSize}
            fontWeight={axis.fontWeight}
            letterSpacing={axis.letterSpacing}
            textAnchor="end"
          >
            {set(tickLabels[i], axis)}
          </text>
        </g>
      ))}
      {ticksX.map((t) => (
        <text
          key={t.year}
          x={t.x}
          y={g.plot.bottom + 24}
          fill={axis.fill}
          fontFamily={axis.fontFamily}
          fontSize={axis.fontSize}
          fontWeight={axis.fontWeight}
          letterSpacing={axis.letterSpacing}
          textAnchor="middle"
        >
          {t.year}
        </text>
      ))}


      {smoothPath ? (
        <g>
          {g.points.map((p) => (
            <circle key={p.year} cx={p.x} cy={p.y} r={1.7} fill={direction.accent} opacity={0.3} />
          ))}
          <path
            d={smoothPath}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.series * 1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <path
          d={path}
          fill="none"
          stroke={direction.accent}
          strokeWidth={direction.stroke.series}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      <circle cx={g.peak.x} cy={g.peak.y} r={3} fill={muted} />
      <circle cx={g.end.x} cy={g.end.y} r={4} fill={direction.accent} />

      {on("crossing-marked") && g.crossing ? (
        <circle cx={g.crossing.x} cy={g.crossing.y} r={3.5} fill={ink} />
      ) : null}

      {drawnEras.map((_, i) => textAt(`era-${i}`))}
      {textAt("crossing")}
      {textAt("reference")}
      {textAt("peak")}
      {textAt("end-value")}
    </svg>
  );
}
