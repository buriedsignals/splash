/**
 * France's per-person CO2 by decade, drawn THROUGH the design base.
 *
 * The tenth component in this tree to do that, and the first of the nine forms the harvest reached
 * that had no directed component at all. What its five references gave it is unusually specific,
 * because two of them are a methods journal and a cryosphere data tool rather than newsrooms — and
 * both are drawing distributions for readers who will be asked to trust them.
 *
 * `the-sample-is-drawn-beside-its-own-summary` (Nature, NSIDC) — and it is the one that changes this
 * plate. `references/types/boxplot.md` names the failure outright: a box built from five readings
 * draws the same confident rectangle as one built from five thousand. This beat has SEVEN decades of
 * ten annual readings and one of FIVE, because 2020–24 is a partial decade, and the undirected plate
 * said so in a footnote while drawing all eight boxes identically. Here every reading is a dot on
 * the same axis as its own box, so the thin decade is thin on the plate.
 *
 * `every-band-names-its-own-statistic` (Nature, NSIDC) — the anatomy named in words, once, on the
 * first box: the median, the interval the box spans, and the rule the whisker follows. `boxplot.md`
 * says this form is only ever as honest as its stated whisker rule, so `1,5 × IQR` is on the plate
 * rather than in a caption.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` (Nature, NSIDC) — the boxes are neutrals and
 * the accent is spent on the ONE decade the headline is about. Nature draws figure 1 without a
 * single chromatic pixel; NSIDC keeps its greys for the summary and its colour for the years under
 * discussion. The undirected plate gave every box the same blue, which is a decision this rule
 * simply takes back: eight boxes in one hue argue nothing.
 *
 * `value-on-the-mark` — the median of the peak decade and of the last one, printed, because those
 * two numbers are the headline's own.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Summary = {
  label: string;
  n: number;
  q1: number;
  median: number;
  q3: number;
  whiskerLo: number;
  whiskerHi: number;
  outliers: number[];
  values: number[];
};

export function DirectedBoxplot({
  summaries,
  subject,
  unit,
  whiskerRule,
  title,
  limits,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
}: {
  summaries: Summary[];
  subject: string;
  unit: string;
  whiskerRule: string;
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<string, string>;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

  /** One band per register, from a probe carrying an ascender, a descender and a comma, so runs on
   *  one line share a baseline whatever glyphs they carry. See METHOD correction 22. */
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
  const baselineOf = (p: any, r: any) => {
    const band = bandOf(r);
    if (p.anchor === "above") return p.box.y + p.box.height - band.descent;
    if (p.anchor === "below") return p.box.y + band.ascent;
    return p.box.y + p.box.height / 2 + (band.ascent - band.descent) / 2;
  };

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── header and footer ─────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const limitLines = wrap(set(limits, body), column, body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
  const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.6;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // ── the plot ──────────────────────────────────────────────────────────────
  const sampled = on("the-sample-is-drawn-beside-its-own-summary");
  const named = on("every-band-names-its-own-statistic");
  const labelled = on("value-on-the-mark");

  /** The reading line, in the annot register under the standfirst: the three statistics named in
   *  words where nothing can mistake them for data. See the note at `reading` below. */
  const reading = named
    ? `Lecture : la boîte contient 50 % des années de la décennie, le trait est la médiane, ` +
      `les moustaches vont jusqu’à ${whiskerRule} et les points isolés sont les années qui les dépassent.`
    : null;
  const readingLines = reading ? wrap(set(reading, annot), column, annot) : [];
  const readingTop = limitsTop + limitLines.length * bodyLead + annot.fontSize * 1.1;

  const plotTop =
    readingTop +
    readingLines.length * bodyLead +
    annot.fontSize * (readingLines.length ? 1.4 : 2.4);
  const nameLead = annot.fontSize * 1.5;
  const plotBottom = sourceTop - body.fontSize * 1.6 - nameLead;

  const everyValue = summaries.flatMap((s) => s.values);
  const y = scaleLinear()
    // A box plot is a POSITION encoding, so the axis is fitted to the readings rather than anchored
    // at zero — the opposite of what a bar owes. `.nice()` keeps the ticks readable.
    .domain([Math.min(...everyValue), Math.max(...everyValue)])
    .nice()
    .range([plotBottom, plotTop]);

  /** THE ANATOMY IS A READING LINE, and that is the FOURTH position tried — the three before it
   *  were each drawn and each looked at.
   *
   *  Nature names every part on the box itself, which works because that figure is ABOUT the form.
   *  Here the boxes are the subject and every one has its readings drawn beside it, so there is no
   *  room against any of them: the arbiter dropped `médiane` and `50 % des années` onto the sample
   *  dots, correctly. The empty top-left corner is 100px wide against a 146px legend — the 1960s,
   *  this beat's second-highest decade, is standing in it. The top-right corner is empty, and drawn
   *  there the glyph reads as the 2010s having a second, stranger summary. Its own gutter at the
   *  left costs 162px of panel AND still sits inside the value range, so it lines up with the 7,0
   *  gridline and reads as a box at seven tonnes.
   *
   *  A legend that can be mistaken for data is not a legend. So the three statistics are named in
   *  the header, in words, in a `Lecture :` line — which is what NSIDC's own evidence is (a legend
   *  naming each band in words, `Interquartile Range`, never an unlabelled swatch) rather than
   *  Nature's on-figure anatomy. The whisker's rule is in it, because `boxplot.md` says this form is
   *  only ever as honest as its stated whisker rule. */
  const band = scaleBand<string>()
    .domain(summaries.map((s) => s.label))
    .range([PAD + 46, width - PAD])
    .paddingInner(0.34)
    .paddingOuter(0.2);

  /** The sample takes the LEFT half of each slot and the box the right, so a reading is never drawn
   *  on top of the rectangle it is evidence for. */
  const slot = band.bandwidth();
  const boxWidth = slot * (sampled ? 0.42 : 0.68);
  const boxes = summaries.map((s) => {
    const left = band(s.label)!;
    const cx = sampled ? left + slot * 0.72 : left + slot / 2;
    return {
      ...s,
      cx,
      sampleX: left + slot * 0.22,
      boxLeft: cx - boxWidth / 2,
      boxRight: cx + boxWidth / 2,
      yQ1: y(s.q1),
      yQ3: y(s.q3),
      yMedian: y(s.median),
      yLo: y(s.whiskerLo),
      yHi: y(s.whiskerHi),
      isSubject: s.label === subject,
    };
  });

  const dotR = Math.max(1.6, Math.min(2.6, slot * 0.045));

  // ── the labels that compete for space, arbitrated ─────────────────────────
  const first = boxes[0];
  const requests = [
    ...(labelled
      ? boxes
          .filter((b) => b.isSubject || b === boxes[boxes.length - 1])
          .map((b) => ({
            id: `median-${b.label}`,
            treatment: "value-on-the-mark",
            text: set(format(b.median), value),
            // From the box's own RIGHT EDGE: anchored at the centre, the label's box lands on the
            // rectangle it names, which is a mark, and the arbiter drops it — correctly.
            at: { x: b.boxRight + 2, y: b.yMedian },
            // Right of the box, or left of it where the frame's edge is closer than the label is
            // wide — the last decade sits against the right margin and lost its number to it. Both
            // positions are beside the box's own median, so neither can name the wrong decade.
            anchors: ["right", "left", "above"],
            priority: b.isSubject ? 9 : 7,
            register: value,
          }))
      : []),
  ];

  /** Every box, every whisker and every sample dot is a mark: a label placed over one of them is a
   *  label placed on the data. */
  const marks = boxes.flatMap((b) => [
    { x: b.boxLeft, y: b.yQ3, width: boxWidth, height: Math.max(b.yQ1 - b.yQ3, 1) },
    { x: b.cx - 1, y: b.yHi, width: 2, height: Math.max(b.yLo - b.yHi, 1) },
    ...(sampled
      ? b.values.map((v) => ({
          x: b.sampleX - dotR,
          y: y(v) - dotR,
          width: dotR * 2,
          height: dotR * 2,
        }))
      : []),
  ]);

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
      frame: { left: PAD, top: plotTop - annot.fontSize * 2.4, right: width - PAD, bottom: plotBottom },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const b = measureTextBand(text, sizeOf(request.register));
        return { width: widthOf(text, request.register), height: b.ascent + b.descent };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(`  arbiter dropped ${dropped.length}: ${dropped.map((d) => d.id).join(", ")}`);
  const byId = new Map(placed.map((p) => [p.id, p]));
  const registerOf = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string, fill?: string, weight?: number) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerOf.get(id)!;
    /** EVERY ARBITRATED LABEL BREAKS THE LINES IT CROSSES. The arbiter keeps a label off other
     *  labels and off the marks; it knows nothing about the whiskers, the median rules and the
     *  connectors that run across the plate, and a stroke through a printed number is not an overlap
     *  of two boxes, so no guard here could see it. The run is drawn twice: once as a halo in the
     *  ground it sits on, once as itself. */
    const glyphs = {
      x: p.box.x,
      y: baselineOf(p, r),
      fontFamily: r.fontFamily,
      fontSize: r.fontSize,
      fontWeight: weight ?? r.fontWeight,
      fontStyle: r.fontStyle,
      letterSpacing: r.letterSpacing,
    };
    return (
      <g key={id}>
        <text
          {...glyphs}
          fill="none"
          stroke={direction.ground}
          strokeWidth={3.4}
          strokeLinejoin="round"
        >
          {p.text}
        </text>
        <text {...glyphs} fill={fill ?? r.fill}>
          {p.text}
        </text>
      </g>
    );
  };

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {readingLines.map((l, i) => (
        <text
          key={`reading-${i}`}
          x={PAD}
          y={readingTop + i * bodyLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={l + i} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* The value axis: ticks and hairlines, the unit on the top tick. A position encoding needs a
          scale — nothing here is a length measured from zero. */}
      {y.ticks(5).map((t, i, all) => (
        <g key={t}>
          <line
            x1={PAD + 40}
            x2={width - PAD}
            y1={y(t)}
            y2={y(t)}
            stroke={grid}
            strokeWidth={direction.stroke.hairline}
          />
          <text
            x={PAD + 34}
            y={y(t) + (axisBand.ascent - axisBand.descent) / 2}
            textAnchor="end"
            {...line(axis)}
            fill={mutedInk}
          >
            {set(i === all.length - 1 ? `${format(t)} ${unit}` : format(t), axis)}
          </text>
        </g>
      ))}

      {boxes.map((b) => {
        // THE SUMMARY IS FURNITURE AND THE CASE IS INK. Every box is a neutral; the accent lands on
        // the one decade the headline names, and on nothing else.
        const stroke = b.isSubject ? direction.accent : mutedInk;
        const fill = b.isSubject ? direction.accent : muted;
        return (
          <g key={b.label}>
            {sampled &&
              b.values.map((v, i) => (
                <circle
                  key={`${b.label}-${i}`}
                  cx={b.sampleX}
                  cy={y(v)}
                  r={dotR}
                  fill="none"
                  stroke={b.isSubject ? accentInk : mutedInk}
                  strokeWidth={direction.stroke.hairline}
                  opacity={0.85}
                />
              ))}
            <line
              x1={b.cx}
              x2={b.cx}
              y1={b.yHi}
              y2={b.yLo}
              stroke={stroke}
              strokeWidth={direction.stroke.rule}
            />
            {[b.yHi, b.yLo].map((yy) => (
              <line
                key={yy}
                x1={b.cx - boxWidth * 0.3}
                x2={b.cx + boxWidth * 0.3}
                y1={yy}
                y2={yy}
                stroke={stroke}
                strokeWidth={direction.stroke.rule}
              />
            ))}
            <rect
              x={b.boxLeft}
              y={b.yQ3}
              width={boxWidth}
              height={Math.max(b.yQ1 - b.yQ3, 1)}
              fill={fill}
              fillOpacity={b.isSubject ? 0.22 : 0.5}
              stroke={stroke}
              strokeWidth={direction.stroke.rule}
            />
            {/* The median in ink, never in the box's own fill: it is the statistic the box is built
                on, and this family's references all give it the heaviest mark on the summary. */}
            <line
              x1={b.boxLeft}
              x2={b.boxRight}
              y1={b.yMedian}
              y2={b.yMedian}
              stroke={b.isSubject ? accentInk : ink}
              strokeWidth={direction.stroke.rule * 2}
            />
            {b.outliers.map((v) => (
              <circle
                key={`out-${b.label}-${v}`}
                cx={b.cx}
                cy={y(v)}
                r={dotR + 0.4}
                fill="none"
                stroke={ink}
                strokeWidth={direction.stroke.rule}
              />
            ))}
          </g>
        );
      })}

      {boxes.map((b) => (
        <text
          key={`name-${b.label}`}
          x={b.sampleX + (b.cx - b.sampleX) / 2}
          y={plotBottom + nameLead * 0.8}
          textAnchor="middle"
          {...line(annot)}
          fill={b.isSubject ? ink : annot.fill}
          fontWeight={b.isSubject ? 700 : annot.fontWeight}
        >
          {set(`${b.label} · n=${b.n}`, annot)}
        </text>
      ))}

      {boxes.map((b) =>
        textAt(`median-${b.label}`, b.isSubject ? accentInk : mutedInk, b.isSubject ? 700 : undefined),
      )}

    </svg>
  );
}
