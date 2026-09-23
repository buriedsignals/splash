/**
 * Switzerland's 2023 age pyramid, drawn THROUGH the design base.
 *
 * The third component in this tree to do that, after `co2-suisse/DirectedLine.tsx` and
 * `static-germany-electricity-bridge/DirectedWaterfall.tsx`, and deliberately the least like either:
 * a line runs left to right, a bridge floats along one baseline, and this mirrors two halves about a
 * spine. If the chain held only for shapes that share a geometry it would not be a chain.
 *
 * Its sibling `SwissAgePyramid.tsx` declares its own typography — seven tokens, a size ladder, a
 * legend geometry, a gutter measured off the widest band label. This file declares none of them. It
 * asks a DIRECTION what each register looks like and never learns the answer.
 *
 * WHAT THE HARVEST DECIDED.
 *
 * `name-each-half-in-words` (three publications) — the halves are named in words on their own
 * halves, in their own ink, and there is no swatch key anywhere. Colour distinguishes the halves; it
 * does not have to identify them, because the mirrored position already does.
 *
 * `mirrored-halves-cross-at-a-named-band` (derived) — the band where the two halves change places is
 * drawn and named. Men lead every band to `55-59`, women every band from `60-64`; at the crossing the
 * two bars differ by 841 people out of 585 263, about a third of a pixel. The plate showed it and
 * never said it, and no reference in the family says it either, so there was nothing to import.
 *
 * `mirrored-axis-both-sides-positive` is not a treatment here because it is not optional: both tick
 * sets read as magnitudes because the left side is not a subtraction, it is the other group. Six
 * publications, no dissent. It is drawn unconditionally, like a floor.
 *
 * THE LABELS GO THROUGH THE ARBITER, and the bars are declared as marks — a crossing annotation
 * placed near the spine lands on twenty-one bars unless the arbiter is told they are there.
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
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080, read from `BRIEF.md`. */
const FRAME = { width: 960, height: 540 };
const X_TICK_HINT = 4;

export type Band = { band: string; male: number; female: number };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

const thousands = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));

export function DirectedPyramid({
  bands,
  title,
  limits,
  source,
  alt,
  eyebrow,
  leftName,
  rightName,
  direction,
  treatments,
  frame,
}: {
  /** Foot of the pyramid first, so `mirrored-halves-cross-at-a-named-band` reads up the scale. */
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  leftName: string;
  rightName: string;
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
  /** Tracking is width and `measureText` has nowhere to put it — see `DirectedWaterfall`. */
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
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // The centre channel is measured off the widest band label the ANNOT register actually sets,
  // never reserved at a constant: a direction that shouts in caps needs more room than one that
  // does not, and that is exactly the sort of thing a constant gets wrong.
  const gutter =
    Math.max(...bands.map((b) => widthOf(set(b.band, annot), annot))) + 18;

  /** Measured PAIR BY PAIR on the INK the band names actually set, which is what the overlap guard
   *  compares. Consecutive labels carry the same offset off their row's middle, so they sit exactly
   *  one step apart and what must fit in that step is the upper run's DESCENT plus the lower run's
   *  ASCENT. `bands` runs foot first and the row scale is reversed, so band i sits BELOW band i+1. */
  const inkRow = bands.map((b) =>
    measureTextBand(set(b.band, annot), sizeOf(annot)),
  );
  /** THE TWO LADDERS BELOW RUN AT THE SMALL FRAMES ONLY, and that is a decision, not an oversight.
   *
   *  960x540 is the frame this beat was composed at, looked at and accepted: its header takes the
   *  share it takes and all twenty-one bands are named at a 10.5px pitch, which is dense and which
   *  READS — the plate is in `renders/creme.png` and anyone can check. Nothing here is allowed to
   *  redraw it, so at that frame the header stays on its first rung and every band keeps its name.
   *
   *  Every attempt to write ONE rule covering both frames failed on the same wall: measured by ink
   *  alone the accepted landscape is already at the limit (10.74px of ink in a 10.51px pitch, two
   *  per cent shared) while the square render that looked identical by that measure — 7.16px of ink
   *  in a 6.71px pitch — came out a solid column of merged digits. A tolerance loose enough to
   *  admit the first admitted the second. So the small frames get their own rule and the accepted
   *  frame gets none. */
  const LADDERS = width < FRAME.width;
  /** A reading column needs LEADING, not merely non-overlap: a quarter of the type size between two
   *  runs is what separated the legible square from the merged one. */
  const stepNeededForEveryBand = !LADDERS
    ? 0
    : Math.max(
        ...inkRow
          .slice(0, -1)
          .map((box, i) => inkRow[i + 1].descent + box.ascent),
      ) +
      annot.fontSize * 0.25;

  /** THE HEADER IS A LADDER AND IT IS SPENT ON THE ROWS.
   *
   *  A pyramid has twenty-one rows and its argument is the SILHOUETTE those rows make. At 1920x1080
   *  the header takes 40% of the frame and the rows get 10.5px each, which is the drawing this beat
   *  was accepted as. At 1080x1080 the same header takes 72% and the rows get 5.2px: the bars become
   *  a four-pixel smear and the shape — the whole claim — is gone.
   *
   *  So the header climbs: the standfirst's shorter forms first (the removal ladder's R3, cheapest
   *  information per pixel), then the headline's, and it stops at the first rung where every age
   *  band can still carry its own name. When no rung reaches that, the shortest is taken and the
   *  band labels fall back to their own stride ladder — two ladders, spent in the right order.
   *  Landscape clears the test at rung one, so it never moves. */
  const titleRungs = Array.isArray(title) ? title : [title];
  const limitRungs = Array.isArray(limits) ? limits : [limits];
  const layoutFor = (t: number, l: number) => {
    const titleLines = wrap(set(titleRungs[t], display), column, display);
    const limitLines = wrap(set(limitRungs[l], body), column, body);
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const plot = {
      left: PAD,
      right: width - PAD,
      top: limitsTop + limitLines.length * bodyLead + gapOf(annot, 1.5714),
      bottom: sourceTop - gapOf(body, 0.9655) - axis.fontSize * 2,
    };
    const rows = scaleBand<string>()
      .domain([...bands].reverse().map((b) => b.band))
      .range([plot.top, plot.bottom])
      .paddingInner(0.22);
    return { titleLines, limitLines, titleTop, limitsTop, plot, rows };
  };

  const chosen = (() => {
    let best = layoutFor(0, 0);
    if (!LADDERS) return best;
    for (let t = 0; t < titleRungs.length; t++)
      for (let l = 0; l < limitRungs.length; l++) {
        const candidate = layoutFor(t, l);
        if (candidate.rows.step() > best.rows.step()) best = candidate;
        if (candidate.rows.step() >= stepNeededForEveryBand) return candidate;
      }
    return best;
  })();
  const { titleLines, limitLines, titleTop, limitsTop, plot, rows } = chosen;
  const centre = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left - gutter) / 2;
  const most = Math.max(...bands.flatMap((b) => [b.male, b.female]));
  const magnitude = scaleLinear()
    .domain([0, most])
    .nice(X_TICK_HINT)
    .range([0, halfWidth]);
  const ticks = magnitude.ticks(X_TICK_HINT).filter((t) => t > 0);

  const bars = bands.map((b) => {
    const y = rows(b.band)!;
    const h = rows.bandwidth();
    return {
      ...b,
      y,
      h,
      leftX: centre - gutter / 2 - magnitude(b.male),
      leftW: magnitude(b.male),
      rightX: centre + gutter / 2,
      rightW: magnitude(b.female),
      middle: y + h / 2,
    };
  });

  /** THE BAND LABELS ARE A LADDER TOO, and it is the one the header ladder above could not spare.
   *
   *  At 960x540 the twenty-one bands get 20.2px of pitch between them once the header has taken its
   *  share, and every name is drawn. At 1080x1080 the best rung of the header ladder still leaves
   *  less, and the first render printed « 0-4 » through « 5-9 » through « 10-14 » — twenty pairs of
   *  words through each other — and the beat threw rather than ship it. The rung is a STRIDE: label
   *  every band, then every other, then every third, until the step times the stride clears the ink.
   *  It is anchored at BOTH ENDS and the kept rows are distributed evenly between them, so « 0-4 »
   *  and « 100+ » — the two that say what the scale runs from and to — are never the ones dropped,
   *  and the gaps stay regular enough that a reader counts rows between two labels. */
  const labelStride = (() => {
    if (!LADDERS) return 1;
    for (let stride = 1; stride <= bands.length; stride++)
      if (rows.step() * stride >= stepNeededForEveryBand) return stride;
    return bands.length;
  })();
  const labelledBands = (() => {
    const last = bands.length - 1;
    const count = Math.max(2, Math.floor(last / labelStride) + 1);
    const kept = new Set<string>();
    for (let j = 0; j < count; j++)
      kept.add(bands[Math.round((j * last) / (count - 1))].band);
    return kept;
  })();
  /** The band the halves change places at, taken from the same rows the bars were built from. */
  const crossing = on("mirrored-halves-cross-at-a-named-band")
    ? (() => {
        const leads = (b: Band) => Math.sign(b.female - b.male);
        const first = leads(bands[0]);
        const found = bands.find(
          (b, i) => i > 0 && leads(b) !== 0 && leads(b) !== first,
        );
        return found ? bars.find((b) => b.band === found.band)! : null;
      })()
    : null;

  const halfInk = {
    left: adjustToContrast(
      direction.accent,
      direction.ground,
      TEXT_CONTRAST_MIN,
    ),
    right: adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN),
  };

  /** The crossing sentence, broken to as many lines as the half it is anchored in can hold. */
  const crossingLines = !crossing
    ? []
    : width >= FRAME.width
      ? [set(`${rightName} devant dès ${crossing.band}`, annot)]
      : wrap(
          set(`${rightName} devant dès ${crossing.band}`, annot),
          halfWidth * 0.7,
          annot,
        );

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = [
    ...(on("name-each-half-in-words")
      ? [
          {
            id: "left-name",
            treatment: "name-each-half-in-words",
            text: set(leftName, annot),
            at: {
              x: centre - gutter / 2 - halfWidth * 0.5,
              y: plot.top - annot.fontSize,
            },
            // THE TWO HALVES ARE NAMED ON ONE LINE OR NOT AT ALL. Left to itself the arbiter gave
            // `Femmes` its first anchor and `Hommes` the third, and the two words that name the two
            // sides of one plate came out 14px apart — measured on the delivered SVG, 234.1 against
            // 219.7. A pair that is read as a pair yields together: if this one cannot go above the
            // plot it is dropped and reported, which is visible, rather than sliding down a row.
            anchors: ["above"],
            priority: 6,
            register: annot,
          },
          {
            id: "right-name",
            treatment: "name-each-half-in-words",
            text: set(rightName, annot),
            at: {
              x: centre + gutter / 2 + halfWidth * 0.5,
              y: plot.top - annot.fontSize,
            },
            anchors: ["above"],
            priority: 6,
            register: annot,
          },
        ]
      : []),
    ...(crossing
      ? [
          {
            id: "crossing",
            treatment: "mirrored-halves-cross-at-a-named-band",
            /** IT WRAPS WHEN THE HALF IT SITS IN IS NARROWER THAN THE RUN. At 960 the empty quarter
             *  is 400px wide and « Femmes devant dès 60-64 » sets in 260; at 540 the half is 184px
             *  and the same run measures 210 in nocturne, so no anchor on the plate could hold it
             *  and the arbiter dropped the beat's own treatment — the sentence the headline makes.
             *  A dropped annotation is not a smaller annotation, it is a missing one. */
            text: crossingLines.join("\n"),
            // ANCHORED WHERE A PYRAMID HAS ROOM, NOT ON THE ROW IT NAMES.
            //
            // The first version put this at the crossing band's own outer end and the arbiter
            // dropped it in all three directions, correctly: at the crossing both bars are within a
            // few per cent of their maximum, so that row is the fullest on the plate and no anchor
            // clears it. A pyramid's empty quarter is its top — the oldest bands are its shortest —
            // and that is where the name goes. The RULE stays on the crossing band and does the
            // pointing; the words say which band it is, so mark and label are legible apart.
            at: {
              x: centre + gutter / 2 + halfWidth * 0.3,
              y: plot.top + rows.step() * 2.2,
            },
            priority: 8,
            register: annot,
          },
        ]
      : []),
  ];

  /** Every bar is a mark. A crossing annotation placed near the spine lands on twenty-one of them
   *  unless the arbiter is told they occupy those pixels. */
  const marks = bars.flatMap((b) => [
    { x: b.leftX, y: b.y, width: b.leftW, height: b.h },
    { x: b.rightX, y: b.y, width: b.rightW, height: b.h },
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
      frame: {
        left: PAD,
        // Three lines of the annot register above the plot, not two: a name anchored `above` a
        // point that already sits a line clear of the plot needs its own band plus the arbiter's
        // gap, and at two lines both half-names were refused for want of 8px.
        top: plot.top - annot.fontSize * 3.2,
        right: width - PAD,
        bottom: plot.bottom,
      },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const lines = text.split("\n");
        const band = measureTextBand(text.replace(/\n/g, ""), sizeOf(request.register));
        return {
          width: Math.max(...lines.map((l) => widthOf(l, request.register))),
          height:
            band.ascent +
            band.descent +
            (lines.length - 1) * leadOf(request.register),
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

  const textAt = (id: string, fill?: string) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerById.get(id)!;
    /** EVERY ARBITRATED LABEL BREAKS THE LINES IT CROSSES. The arbiter keeps a label off other
     *  labels and off the marks; it knows nothing about the rules, connectors and leaders that run
     *  across the plate, and a stroke through a word is not an overlap of two boxes, so no guard
     *  here could see it. The run is drawn twice: once as a halo in the ground it sits on, once as
     *  itself. */
    const lines = p.text.split("\n");
    // A wrapped run is laid from ONE baseline and stepped by its own register's lead — the same
    // rule the overlap guard states — so the box the arbiter granted holds every line of it.
    const first =
      lines.length > 1 ? p.box.y + bandOf(r).ascent : baselineOf(p, r);
    const glyphs = (i: number) => ({
      x: p.box.x,
      y: first + i * leadOf(r),
      fontFamily: r.fontFamily,
      fontSize: r.fontSize,
      fontWeight: r.fontWeight,
      fontStyle: r.fontStyle,
      letterSpacing: r.letterSpacing,
    });
    return (
      <g key={id}>
        {lines.map((l, i) => (
          <text
            key={`h${i}`}
            {...glyphs(i)}
            fill="none"
            stroke={direction.ground}
            strokeWidth={3.4}
            strokeLinejoin="round"
          >
            {l}
          </text>
        ))}
        {lines.map((l, i) => (
          <text key={`t${i}`} {...glyphs(i)} fill={fill ?? r.fill}>
            {l}
          </text>
        ))}
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

      {/* BOTH TICK SETS READ AS MAGNITUDES. Six publications, no dissent: the left side is not a
          subtraction, it is the other group, so it is never labelled negative. Drawn as a floor
          rather than offered as a treatment. */}
      {ticks.map((t) => (
        <g key={t}>
          {[-1, 1].map((side) => {
            const x = centre + side * (gutter / 2 + magnitude(t));
            return (
              <g key={side}>
                <line
                  x1={x}
                  x2={x}
                  y1={plot.top}
                  y2={plot.bottom}
                  stroke={grid}
                  strokeWidth={direction.stroke.rule}
                />
                <text
                  x={x}
                  y={plot.bottom + axis.fontSize * 1.6}
                  textAnchor="middle"
                  {...line(axis)}
                >
                  {set(thousands(t), axis)}
                </text>
              </g>
            );
          })}
        </g>
      ))}

      {bars.map((b) => (
        <g key={b.band}>
          <rect
            x={b.leftX}
            y={b.y}
            width={b.leftW}
            height={b.h}
            fill={direction.accent}
          />
          <rect
            x={b.rightX}
            y={b.y}
            width={b.rightW}
            height={b.h}
            fill={muted}
          />
          {/* The band label sits in the reserved centre channel, never printed over a bar — and
              only on the rows the ladder above kept, so two names can never share a row's worth of
              pixels. */}
          {labelledBands.has(b.band) && (
            <text
              x={centre}
              y={b.middle + annot.fontSize * 0.35}
              textAnchor="middle"
              {...line(annot)}
            >
              {set(b.band, annot)}
            </text>
          )}
        </g>
      ))}

      {/* THE BAND WHERE THE TWO HALVES CHANGE PLACES. A rule across its own row and the name beside
          it: the plate showed this and never said it. */}
      {crossing &&
        byId.get("crossing") &&
        (() => {
          const at = byId.get("crossing")!;
          const ruleY = crossing.y - rows.step() * 0.11;
          // The leader runs from the label's own baseline down to the rule, at the label's own left
          // edge. Without it the words hang in the empty quarter of the pyramid with nothing tying
          // them to the row they name — which is what the first render looked like, and a caption
          // about a band that does not point at the band is a caption about nothing.
          const leaderX = at.box.x + 2;
          return (
            <g>
              <line
                x1={crossing.leftX}
                x2={crossing.rightX + crossing.rightW}
                y1={ruleY}
                y2={ruleY}
                stroke={ink}
                strokeWidth={direction.stroke.rule * 1.6}
              />
              <line
                x1={leaderX}
                x2={leaderX}
                y1={at.box.y + annot.fontSize * 1.3}
                y2={ruleY}
                stroke={ink}
                strokeWidth={direction.stroke.rule}
              />
            </g>
          );
        })()}

      {textAt("left-name", halfInk.left)}
      {textAt("right-name", halfInk.right)}
      {textAt("crossing", ink)}
    </svg>
  );
}
