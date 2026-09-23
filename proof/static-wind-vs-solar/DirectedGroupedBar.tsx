/**
 * Wind against solar as a share of generation, six countries, drawn THROUGH the design base.
 *
 * The seventh component in this tree to do that. Its sibling `WindVsSolarBar.tsx` declares its own
 * typography — seven tokens, a size ladder, a legend geometry; this file declares none.
 *
 * WHAT THE HARVEST DECIDED.
 *
 * `every-bar-labelled-lets-the-axis-go` (two publications) — twelve bars carry twelve printed
 * numbers, so nothing has to be estimated and the ticks, the gridlines and the scale were spending
 * ink on a question nobody was asking. Ferdio keeps neither axis nor gridline nor baseline; Pew
 * keeps none and prints all sixteen of its values. A LICENCE, not an obligation: ONS keeps its axis
 * and prints nothing, having fifteen categories to label. Here the unit survives in the subtitle,
 * which already says these are shares.
 *
 * `the-group-boundary-is-drawn` (three publications, three different marks) — with two bars to a
 * group, whitespace alone does not distinguish two groups of two from one group of four; the reader
 * has to measure two gaps and compare them.
 *
 * `order-is-chosen-from-the-answer` (two publications, and it corrects the doctrine) — the six
 * countries have no sequence. Alphabetical is the order the data arrived in: it reads as neutrality
 * while being an arbitrary answer to a question nobody asked, and it buried the beat's own subject
 * in the sixth slot because its name begins with S. Ordered by the comparison the beat is about,
 * the outlier lands at an end and the reversal is a POSITION rather than a caption.
 *
 * WHAT IT REFUSED. `the-comparison-series-is-a-neutral` (two publications) does not apply: neither
 * wind nor solar is the other's reference here. Both are arguing, so both keep a hue, and
 * `same-hue-family-never-adjacent` is satisfied by a blue against an ochre.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the twin form. */
const TYPE = "grouped-bar";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

export type Group = { name: string; first: number; second: number };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

const oneDecimal = (v: number) =>
  v.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export function DirectedGroupedBar({
  groups,
  firstName,
  secondName,
  subject,
  callout,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  frame,
}: {
  groups: Group[];
  firstName: string;
  secondName: string;
  subject: string;
  callout: string;
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

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
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

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

  // ── header ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = leadOf(display);
  const limitLines = wrap(set(limits, body), column, body);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** The order the beat's own claim asks for, where the categories carry no sequence of their own. */
  const ordered = on("order-is-chosen-from-the-answer")
    ? [...groups].sort((a, b) => b.first - b.second - (a.first - a.second))
    : groups;

  const labelled = on("every-bar-labelled-lets-the-axis-go");
  const bounded = on("the-group-boundary-is-drawn");

  /**
   * THE TWIN FORM. A band scale has one, and at a tall frame it is not a refinement: six PAIRS of
   * columns in 428px of plot are twelve bars of 25px each, and the six country names under them —
   * « Allemagne », « Norvège », « Pologne » — have 71px apiece to sit in. Rows running down the
   * frame, each name horizontal on one line in a gutter of its own, is the drawing the frame asks
   * for; `type-at-size.mjs` has been answering `transpose` for `grouped-bar` all along and nothing
   * was carrying it out.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions. SQUARE is NOT rows
   * here: `MEASURED_HOLDS` records this beat's own `creme-square.png` as read and accepted, so
   * `formForSize` answers `as-is` there and only the tall frame transposes.
   */
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

  const plot = {
    left: labelled ? PAD : PAD + widthOf("00", axis) + 14,
    right: width - PAD,
    // In rows the two series are named one ABOVE the other, mirroring their order inside a group,
    // so the legend costs a second line and the plot starts one lead lower.
    top:
      limitsTop +
      limitLines.length * bodyLead +
      gapOf(annot, 2.1429) +
      (ROWS ? leadOf(annot) : 0),
    bottom: sourceTop - gapOf(body, 1.1034) - gapOf(annot, 1.5714),
  };

  const most = Math.max(...ordered.flatMap((g) => [g.first, g.second]));
  const scale = scaleLinear()
    .domain([0, most])
    .nice(5)
    .range([plot.bottom, plot.top]);
  const band = (plot.right - plot.left) / ordered.length;
  const barWidth = (band * 0.72) / 2;

  /** IN ROWS THE SAME TWO SCALES SWAP AXES: the band runs DOWN the plot and the magnitude runs
   *  across it from a left rule. Both gutters are MEASURED rather than guessed — the names need
   *  whatever their longest one takes, and the numbers need whatever their longest one takes plus
   *  the arbiter's own 8px gap, or a value placed `right` of a full-length bar would be refused for
   *  leaving the frame and the beat would ship a bar without its number. */
  const nameGutter = ROWS
    ? Math.max(...ordered.map((g) => widthOf(set(g.name, annot), annot))) +
      gapOf(annot, 0.5)
    : 0;
  const valueGutter = ROWS
    ? Math.max(
        ...ordered.flatMap((g) =>
          [g.first, g.second].map((v) =>
            widthOf(set(oneDecimal(v), value), value),
          ),
        ),
      ) + gapOf(value, 0.6)
    : 0;
  /** The zero the lengths grow from, and the only rule the rows form draws. */
  const zeroX = PAD + nameGutter;
  const rowBand = ROWS
    ? scaleBand<string>()
        .domain(ordered.map((g) => g.name))
        .range([plot.top, plot.bottom])
        .paddingInner(0.3)
        .paddingOuter(0.06)
    : null;
  /** A GROUPED bar has a second band INSIDE each row: the two series sit one above the other within
   *  the country they belong to, in the same order the legend names them, so the pair reads as a
   *  pair without a boundary having to say so. */
  const rowSeries = ROWS
    ? scaleBand<string>()
        .domain([firstName, secondName])
        .range([0, rowBand!.bandwidth()])
        .paddingInner(0.12)
    : null;
  const rowValue = ROWS
    ? scaleLinear()
        // The niced domain the columns already use, so rows and columns read the same numbers.
        .domain(scale.domain() as [number, number])
        .range([zeroX, width - PAD - valueGutter])
    : null;

  const bars = ordered.flatMap((g, i) => {
    const centre = plot.left + band * i + band / 2;
    const pair = [
      {
        group: g.name,
        series: firstName,
        v: g.first,
        x: centre - barWidth - 2,
        fill: direction.accent,
      },
      {
        group: g.name,
        series: secondName,
        v: g.second,
        x: centre + 2,
        fill: muted,
      },
    ];
    if (!ROWS)
      return pair.map((b) => ({
        ...b,
        y: scale(b.v),
        h: plot.bottom - scale(b.v),
        w: barWidth,
        centre,
      }));
    const top = rowBand!(g.name)!;
    return pair.map((b) => ({
      ...b,
      x: zeroX,
      // A share of 0.2 % is 2px of bar. It still has to be a bar, or the row reads as missing.
      w: Math.max(rowValue!(b.v) - zeroX, 1),
      y: top + rowSeries!(b.series)!,
      h: rowSeries!.bandwidth(),
      // `centre` is the axis the group's own furniture hangs off — its x in columns, its y in rows.
      centre: top + rowBand!.bandwidth() / 2,
    }));
  });

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const subjectRow = ROWS ? (rowBand!(subject) ?? plot.top) : 0;
  const requests = [
    ...(labelled
      ? bars.map((b, i) => ({
          id: `value-${i}`,
          treatment: "every-bar-labelled-lets-the-axis-go",
          text: set(oneDecimal(b.v), value),
          // A value belongs beyond its own bar's tip and nowhere else. In rows that is ONE position,
          // not four: `above` would put Germany's number on Sweden's row, which is not a collision
          // and is still the wrong number against the wrong country.
          at: ROWS
            ? { x: b.x + b.w, y: b.y + b.h / 2 }
            : { x: b.x + b.w / 2, y: b.y - 8 },
          anchors: ROWS ? ["right"] : undefined,
          priority: 6,
          register: value,
        }))
      : []),
    // In rows the names are FURNITURE in a reserved gutter, drawn below rather than arbitrated: the
    // arbiter's four anchors would place a name wherever there was room, and a name that is not
    // beside its own row names the wrong country.
    ...(ROWS
      ? []
      : ordered.map((g, i) => ({
          id: `name-${i}`,
          treatment: "accent-marks-the-thread",
          text: set(g.name, annot),
          at: {
            x: plot.left + band * i + band / 2,
            y: plot.bottom + annot.fontSize * 1.5,
          },
          priority: g.name === subject ? 7 : 3,
          register: annot,
        }))),
    {
      id: "callout",
      treatment: "accent-marks-the-thread",
      text: set(callout, annot),
      // In columns the callout stands over the subject's pair. In rows it takes the band the names
      // have vacated, under the subject's own row — the subject is LAST once the order is chosen
      // from the answer, so `below` lands in open ground rather than on the next country. `right`
      // is the honest fallback if that ever stops being true; the bars are in `avoid`, so a callout
      // that would cross a row is dropped rather than drawn through it.
      at: ROWS
        ? { x: (zeroX + width - PAD) / 2, y: subjectRow + rowBand!.bandwidth() }
        : {
            x:
              plot.left +
              band * (ordered.findIndex((g) => g.name === subject) + 0.5),
            y: plot.top - annot.fontSize,
          },
      anchors: ROWS ? ["below", "right"] : undefined,
      priority: 8,
      register: annot,
    },
  ];

  const marks = bars.map((b) => ({
    x: b.x,
    y: b.y,
    width: b.w,
    height: Math.max(b.h, 1),
  }));

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
      frame: ROWS
        ? {
            // The left edge is the zero rule, not the page margin: nothing arbitrated may reach into
            // the name gutter, which is furniture and is not in `avoid`.
            left: zeroX,
            top: plot.top,
            right: width - PAD,
            bottom: plot.bottom + annot.fontSize * 2.2,
          }
        : {
            left: PAD,
            top: plot.top - annot.fontSize * 2,
            right: width - PAD,
            bottom: plot.bottom + annot.fontSize * 2.2,
          },
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
    console.log(
      `  arbiter dropped ${dropped.length}: ` +
        dropped.map((d) => d.id).join(", "),
    );
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
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );

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
        <text
          key={l + i}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
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

      {/* The two series named in words, in their own inks, where a swatch key used to be. IN ROWS
          THEY STACK, in the order they sit in inside every group: a key running left to right
          beside bars running top to bottom names the pair without saying which is which. */}
      {[
        { name: firstName, fill: accentInk },
        {
          name: secondName,
          fill: adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN),
        },
      ].map((s, i) => (
        <text
          key={s.name}
          x={
            ROWS ? PAD : PAD + i * (widthOf(set(firstName, annot), annot) + 24)
          }
          y={
            plot.top -
            annot.fontSize * 2.4 -
            (ROWS ? leadOf(annot) * (1 - i) : 0)
          }
          {...line(annot)}
          fill={s.fill}
        >
          {set(s.name, annot)}
        </text>
      ))}

      {/* Where every bar is labelled the axis goes; the baseline stays, because a bar grows from
          something. */}
      {!labelled &&
        scale.ticks(5).map((t) =>
          ROWS ? (
            <g key={t}>
              <line
                x1={rowValue!(t)}
                x2={rowValue!(t)}
                y1={plot.top}
                y2={plot.bottom}
                stroke={grid}
                strokeWidth={direction.stroke.rule}
              />
              <text
                x={rowValue!(t)}
                y={plot.bottom + axis.fontSize * 1.5}
                textAnchor="middle"
                {...line(axis)}
              >
                {set(String(t), axis)}
              </text>
            </g>
          ) : (
            <g key={t}>
              <line
                x1={plot.left}
                x2={plot.right}
                y1={scale(t)}
                y2={scale(t)}
                stroke={grid}
                strokeWidth={direction.stroke.rule}
              />
              <text
                x={plot.left - 8}
                y={scale(t) + axis.fontSize * 0.35}
                textAnchor="end"
                {...line(axis)}
              >
                {set(String(t), axis)}
              </text>
            </g>
          ),
        )}
      {/* The zero the lengths are measured from. It turns with the geometry: the floor under the
          columns becomes a left-hand rule the rows grow out of. */}
      {ROWS ? (
        <line
          x1={zeroX}
          x2={zeroX}
          y1={plot.top}
          y2={plot.bottom}
          stroke={muted}
          strokeWidth={direction.stroke.rule}
        />
      ) : (
        <line
          x1={plot.left}
          x2={plot.right}
          y1={plot.bottom}
          y2={plot.bottom}
          stroke={muted}
          strokeWidth={direction.stroke.rule}
        />
      )}

      {/* The boundary between one country's pair and the next, stated rather than left to a gap. */}
      {bounded &&
        ordered.slice(1).map((g, i) => {
          if (ROWS) {
            // Halfway between the pair above and the pair below, so the line belongs to neither.
            const at =
              (rowBand!(ordered[i].name)! +
                rowBand!.bandwidth() +
                rowBand!(g.name)!) /
              2;
            return (
              <line
                key={`boundary-${g.name}`}
                x1={zeroX}
                x2={plot.right}
                y1={at}
                y2={at}
                stroke={grid}
                strokeWidth={direction.stroke.rule}
              />
            );
          }
          const at = plot.left + band * (i + 1);
          return (
            <line
              key={`boundary-${g.name}`}
              x1={at}
              x2={at}
              y1={plot.top}
              y2={plot.bottom}
              stroke={grid}
              strokeWidth={direction.stroke.rule}
            />
          );
        })}

      {bars.map((b, i) => (
        <rect
          key={`${b.group}-${b.series}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={Math.max(b.h, 0)}
          fill={b.fill}
        />
      ))}

      {/* EACH VALUE TAKES ITS OWN BAR'S INK, held to the text floor. The `value` register's ink ROLE
          is `accent`, so reading it straight painted the solar numbers blue over grey bars — a
          label claiming a series it does not belong to, which is worse than no colour at all. The
          register still decides the family, size, weight, tracking and case; only the ink comes from
          the mark. Same rule as `signed-label-outside-the-bar` on the bridge. */}
      {bars.map((b, i) =>
        textAt(
          `value-${i}`,
          adjustToContrast(b.fill, direction.ground, TEXT_CONTRAST_MIN),
        ),
      )}
      {/* In rows the country names live in the gutter measured for them, right-aligned against the
          zero rule and centred on their own GROUP rather than on either of its two bars. */}
      {ROWS
        ? ordered.map((g) => (
            <text
              key={`name-${g.name}`}
              x={zeroX - gapOf(annot, 0.5)}
              y={
                rowBand!(g.name)! +
                rowBand!.bandwidth() / 2 +
                annot.fontSize * 0.34
              }
              textAnchor="end"
              {...line(annot)}
              fill={g.name === subject ? ink : annot.fill}
              fontWeight={g.name === subject ? 700 : annot.fontWeight}
            >
              {set(g.name, annot)}
            </text>
          ))
        : ordered.map((g, i) =>
            textAt(
              `name-${i}`,
              g.name === subject ? ink : undefined,
              g.name === subject ? 700 : undefined,
            ),
          )}
      {textAt("callout", accentInk, 700)}
    </svg>
  );
}
