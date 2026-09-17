/**
 * The ten largest CO2 emitters of 2024, as columns, drawn THROUGH the design base.
 *
 * The ninth component in this tree to do that, and the first RANKING of plain bars — which turned
 * out to be where two filed treatments were quietly wrong.
 *
 * WHAT THE HARVEST GAVE THIS FAMILY.
 *
 * `every-bar-labelled-lets-the-axis-go` (Ferdio, Pew) — the rule this plate was already following
 * without being able to claim it: ten columns, ten printed values, no axis, no gridline. Its
 * predicate asked for two or more GROUPS, because it was filed from the grouped-bar harvest; the
 * Ferdio plate under it is six bars and no groups. It counts bars now.
 *
 * `order-is-chosen-from-the-answer` (ONS, Datawrapper, with `100.datavizproject.com`'s viz47 as the
 * negative case — three columns in alphabetical order, and the record says it "reads flatter for
 * it") — same group-shaped predicate, same repair. This plate orders by value, which is the answer.
 *
 * `value-on-the-mark` and `context-in-neutral-at-the-subject-scale` — every value printed outside
 * its own column in page ink, and the nine columns that are not the subject drawn in the
 * furniture's own muted step rather than in a second hue.
 *
 * AND WHAT THE PLATE ITSELF ASKED FOR, filed as `the-set-a-claim-adds-up-is-drawn-as-a-set`. The
 * headline is an arithmetic claim about a SUBSET — "more than the next five put together" — and
 * `render.mjs` computes that subset by search. The undirected plate drew a rule at China's level
 * across all ten columns and named the five countries in a caption; nothing said WHICH five columns
 * they were, and the rule crossed four columns that are in no sum the headline makes. Here the set
 * is bracketed, its sum is printed on the bracket, and the rule stops where the set stops.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

export type Column = { name: string; value: number };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedColumns({
  rows,
  subject,
  comparison,
  comparisonSum,
  comparisonNote,
  format,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
}: {
  rows: Column[];
  subject: string;
  comparison: string[];
  comparisonSum: number;
  comparisonNote: string;
  format: (v: number) => string;
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  /** Tracking is width and `measureText` has nowhere to put it. */
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

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
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const limitLines = wrap(set(limits, body), column, body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // ── the plot ──────────────────────────────────────────────────────────────
  const band = scaleBand<string>()
    .domain(rows.map((r) => r.name))
    .range([PAD, width - PAD])
    .paddingInner(0.28)
    .paddingOuter(0.06);

  /** Category names sit under the baseline, wrapped on MEASURED width to at most two lines — never
   *  rotated, and never wider than the column they name. */
  const nameLines = new Map(
    rows.map((r) => [r.name, wrap(set(r.name, annot), band.bandwidth(), annot).slice(0, 2)]),
  );
  const nameLead = leadOf(annot);
  const deepestName = Math.max(...[...nameLines.values()].map((l) => l.length));

  const baseline =
    sourceTop -
    gapOf(body, 1.1034) -
    deepestName * nameLead -
    gapOf(annot, 0.4286);
  /** The value labels stand ABOVE their columns, so the tallest column needs a line of clearance
   *  under the standfirst, and the bracket needs a line under the rule. Both are measured. */
  const valueBand = measureTextBand(format(rows[0].value), sizeOf(value));
  const plotTop =
    limitsTop + limitLines.length * bodyLead + (valueBand.ascent + valueBand.descent) * 1.9;

  const magnitude = scaleLinear()
    .domain([0, Math.max(...rows.map((r) => r.value))])
    // Zero is the floor, non-negotiable for a length encoding.
    .range([baseline, plotTop]);

  const columns = rows.map((r) => ({
    ...r,
    x: band(r.name)!,
    w: band.bandwidth(),
    y: magnitude(r.value),
    h: baseline - magnitude(r.value),
    isSubject: r.name === subject,
    inComparison: comparison.includes(r.name),
  }));

  const subjectColumn = columns.find((c) => c.isSubject)!;
  const setColumns = columns.filter((c) => c.inComparison);
  const bracketed = on("the-set-a-claim-adds-up-is-drawn-as-a-set") && setColumns.length >= 2;
  const labelled = on("value-on-the-mark") || on("every-bar-labelled-lets-the-axis-go");

  /** The rule runs from the subject's own column to the END OF THE SET, and no further. Drawn to
   *  the frame edge it crosses four columns that are in no sum the headline makes, and a rule over
   *  a column says the column is being compared. */
  const ruleY = magnitude(subjectColumn.value);
  /** It LEAVES the subject's column rather than lying along its top. Drawn from `subjectColumn.x`
   *  the accent rule spent its first 13% inside the accent-filled column it levels from, measuring
   *  1.00:1 against it — an annotation invisible over precisely the mark it is drawn for, in all
   *  three directions, because the fault is the geometry and not the palette. The rule still starts
   *  at the subject and ends where the set ends; it just starts at the column's edge. */
  const ruleFrom = subjectColumn.x + subjectColumn.w;
  const ruleTo = bracketed
    ? Math.max(...setColumns.map((c) => c.x + c.w))
    : width - PAD;

  const bracketY = ruleY + (valueBand.ascent + valueBand.descent) * 1.1;
  const bracketFrom = setColumns.length ? Math.min(...setColumns.map((c) => c.x)) : 0;
  const bracketTo = setColumns.length ? Math.max(...setColumns.map((c) => c.x + c.w)) : 0;

  // ── the labels that compete for space, arbitrated ─────────────────────────
  const requests = [
    ...(labelled
      ? columns.map((c) => ({
          id: `value-${c.name}`,
          treatment: "value-on-the-mark",
          text: set(format(c.value), value),
          at: { x: c.x + c.w / 2, y: c.y },
          // A value belongs above its own column's tip and nowhere else: `below` would put it
          // inside the fill, which is this type's named accessibility trap.
          anchors: ["above"],
          priority: c.isSubject ? 9 : 6,
          register: value,
        }))
      : []),
    ...(bracketed
      ? [
          {
            id: "comparison-note",
            treatment: "the-set-a-claim-adds-up-is-drawn-as-a-set",
            text: set(comparisonNote, annot),
            at: { x: (bracketFrom + bracketTo) / 2, y: bracketY },
            anchors: ["below"],
            priority: 10,
            register: annot,
          },
        ]
      : []),
  ];

  const marks = columns.map((c) => ({ x: c.x, y: c.y, width: c.w, height: Math.max(c.h, 1) }));

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
      frame: { left: PAD, top: plotTop - value.fontSize * 1.6, right: width - PAD, bottom: baseline },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const b = measureTextBand(text, sizeOf(request.register));
        return {
          width: widthOf(text, request.register),
          height: b.ascent + b.descent,
        };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(`  arbiter dropped ${dropped.length}: ${dropped.map((d) => d.id).join(", ")}`);
  const byId = new Map(placed.map((p) => [p.id, p]));
  const registerById = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string, fill?: string, weight?: number) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerById.get(id)!;
    return (
      <text
        key={id}
        x={p.box.x}
        y={baselineOf(p, r)}
        fill={fill ?? r.fill}
        fontFamily={r.fontFamily}
        fontSize={r.fontSize}
        fontWeight={weight ?? r.fontWeight}
        fontStyle={r.fontStyle}
        letterSpacing={r.letterSpacing}
      >
        {p.text}
      </text>
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
      {sourceLines.map((l, i) => (
        <text key={l + i} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {columns.map((c) => (
        <rect
          key={c.name}
          x={c.x}
          y={c.y}
          width={c.w}
          height={Math.max(c.h, 1)}
          fill={c.isSubject ? direction.accent : muted}
        />
      ))}

      {/* The zero baseline: the floor the lengths are measured from, and the only rule this plate
          draws — every column carries its own number, so an axis would be the same decoding done
          twice. */}
      <line
        x1={PAD}
        x2={width - PAD}
        y1={baseline}
        y2={baseline}
        stroke={ink}
        strokeWidth={direction.stroke.rule}
      />

      {bracketed && (
        <>
          <line
            x1={ruleFrom}
            x2={ruleTo}
            y1={ruleY}
            y2={ruleY}
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
            strokeDasharray="6 5"
          />
          {/* The bracket: a rule under the set with a tick down at each end, so the five columns
              the headline adds together are a SET on the plate and not only in a caption. */}
          <path
            d={`M${bracketFrom} ${bracketY - 5} L${bracketFrom} ${bracketY} L${bracketTo} ${bracketY} L${bracketTo} ${bracketY - 5}`}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
          />
        </>
      )}

      {columns.map((c) =>
        textAt(`value-${c.name}`, c.isSubject ? accentInk : mutedInk, c.isSubject ? 700 : undefined),
      )}
      {textAt("comparison-note", accentInk)}

      {/* Category names under the baseline, in their own band. Furniture in a reserved gutter: the
          arbiter's four anchors would place a name wherever there was room, and a name that is not
          under its column names the wrong country. */}
      {columns.map((c) =>
        nameLines.get(c.name)!.map((l, i) => (
          <text
            key={`${c.name}-${i}`}
            x={c.x + c.w / 2}
            y={baseline + annot.fontSize * 1.5 + i * nameLead}
            textAnchor="middle"
            {...line(annot)}
            fill={c.isSubject ? ink : annot.fill}
            fontWeight={c.isSubject ? 700 : annot.fontWeight}
          >
            {l}
          </text>
        )),
      )}
    </svg>
  );
}
