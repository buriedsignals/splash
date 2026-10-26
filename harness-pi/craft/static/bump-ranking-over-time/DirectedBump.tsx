/**
 * World rank by annual CO₂ emissions, 1990–2024, drawn THROUGH the design base.
 *
 * The sixth component in this tree to do that, and the first whose vertical position is an ORDINAL:
 * a line's height here is a rank, not a quantity, so nothing on the plate says how far ahead anyone
 * is. Its sibling `EmitterRankBump.tsx` declares its own typography; this file declares none.
 *
 * WHAT THE HARVEST DECIDED, AND WHAT IT COST THE OLD PLATE.
 *
 * `exits-are-drawn` (derived) — sixteen countries held a top-ten place at some point in these
 * thirty-five years and SIX held one in every year. The old plate drew the six, admitted it in its
 * subtitle, and then carried a caption underneath naming in prose what it had discarded: *India had
 * already passed the United Kingdom in 1991 and Ukraine in 1992, which have since left the top 10.*
 * A graphic that has to say in words what it threw away is throwing away the wrong thing. Everyone
 * who was ever in the ranking is drawn; an entity that leaves is taken to where it left and dropped
 * to the furniture's quiet ink.
 *
 * `rank-is-printed-on-the-entry` (two publications) — the ordinal travels with the entity. ProPublica
 * sets the seed grey and small immediately before the school's name; ESPN sets it at display scale in
 * gold on the entry's own portrait. They agree on nothing except attachment, which is the rule: a
 * rank axis down the left edge is a lookup, and where the entity moves the lookup is done twice.
 *
 * THE ARBITER OWNS THE EDGES. Ten names at the left edge and ten at the right, on a plot whose lines
 * cross, is exactly the collision the arbiter exists for — and the exits' names land wherever they
 * left, in the middle of the plot, where the lines are.
 */

import { scaleLinear, scalePoint } from "d3-scale";
import { line as d3line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
// `mix` is NOT among the names `render-still.mjs` re-exports, and importing it from there made every
// render of this beat throw `SyntaxError: Export named 'mix' not found` — silently, because the
// runner's output was being piped to /dev/null while two mutation checks grepped the SVG the LAST
// successful render had left on disk and reported it green. A stale artifact read as a fresh one.
import { mix } from "#shared/chart-beat/colour.mjs";
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

export type Track = {
  entity: string;
  /** One point per year the entity held a place, in order. */
  points: Array<{ year: number; rank: number }>;
  /** True where the entity held a place in every year the beat covers. */
  throughout: boolean;
};

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedBump({
  tracks,
  years,
  slots,
  subject,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  frame,
}: {
  tracks: Track[];
  years: number[];
  slots: number;
  subject: string;
  /** The headline and the standfirst in FORMS, longest first — R3's rung. Landscape takes the
   *  first of each and has never needed another. */
  title: string[];
  limits: string[];
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
  /** THE FORM THE FRAME ASKS FOR, read off the frame rather than passed in, so one component serves
   *  the three export sizes without the runner having to tell it which it is drawing. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
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
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** An entry's label carries its rank where the treatment applies: `3 India`, not `India`. */
  const ranked = on("rank-is-printed-on-the-entry");
  const nameAt = (entity: string, rank: number) =>
    ranked ? `${rank} ${entity}` : entity;

  const firstYearOf = years[0];
  const lastYearOf = years[years.length - 1];

  /** WHICH ENTRIES ARE NAMED AT WHICH EDGE, AND WHY A NARROW FRAME NAMES ONLY ONE.
   *
   *  Both gutters are reserved for the widest name a track can carry — « 10 United States » — so at
   *  1920 wide the plot still gets 700px and the arbiter seats all twenty labels. At 1080 the same
   *  two gutters take 252px of 424 and leave the plot 172: thirty-five years in a box the width of
   *  a thumb, the year ticks printed into each other as « 19909 9250 000 0250 100 12502024 », and
   *  the arbiter dropping EIGHTEEN of the twenty names — measured in nocturne, 2026-09-23, with the
   *  render exiting 0.
   *
   *  So the left gutter stops being reserved for everybody. The entry the headline is about keeps
   *  its opening rank, because « du 8e au 3e » is a claim about two numbers and one of them lives
   *  there; every other entry is read at the right edge, where the ranking ends. That is R4 —
   *  annotations dropped, last first — applied to a set whose members are not equal: nine of these
   *  labels are context and one is the argument. */
  const namesBothEdges = SIZE === "landscape";
  const edgeWidth = (only: (t: Track) => boolean) => {
    const wanted = tracks.filter(only);
    if (!wanted.length) return 0;
    return Math.max(
      ...wanted.map((t) =>
        Math.max(
          widthOf(set(nameAt(t.entity, slots), value), value),
          widthOf(set(t.entity, value), value),
        ),
      ),
    );
  };
  const leftRoom = edgeWidth(
    (t) =>
      t.points[0].year === firstYearOf && (namesBothEdges || t.entity === subject),
  );
  /** The right gutter is owed only to the tracks that REACH the last year. An exit is named where it
   *  left, in the middle of the plot, so reserving an edge for it was buying margin nothing sits in. */
  const rightRoom = edgeWidth(
    (t) => namesBothEdges || t.points[t.points.length - 1].year === lastYearOf,
  );

  /** WHAT THE TEN RANK ROWS OWE. A rank is read off the row it sits on and every row may carry a
   *  name, so the rows cannot be closer together than the run that names them. */
  const rowOwes = bandOf(value).ascent + bandOf(value).descent + 3;
  const plotOwes = SIZE === "landscape" ? 0 : (slots - 1) * rowOwes;

  const layoutFor = (t: number, l: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const top = limitsTop + limitLines.length * bodyLead + gapOf(annot, 1.4286);
    const bottom = sourceTop - gapOf(body, 1.1034) - axis.fontSize * 2.4;
    return { titleLines, limitLines, limitsTop, top, bottom, plot: bottom - top };
  };
  const rungs: Array<{ title: number; limit: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) rungs.push({ title: t, limit: l });
  let taken = rungs[0];
  let layout = layoutFor(taken.title, taken.limit);
  let best = layout.plot;
  for (const rung of rungs) {
    const candidate = layoutFor(rung.title, rung.limit);
    best = Math.max(best, candidate.plot);
    taken = rung;
    layout = candidate;
    if (candidate.plot >= plotOwes) break;
  }
  if (layout.plot < plotOwes)
    throw new Error(
      `the copy leaves the ${slots} rank rows ${best.toFixed(0)}px at its most generous rung and ` +
        `they owe ${plotOwes.toFixed(0)}px at ${width}x${height} — ${rowOwes.toFixed(0)}px between ` +
        `rows, which is what a name printed on a rank needs not to sit on the rank above.`,
    );
  const { titleLines, limitLines, limitsTop } = layout;

  const plot = {
    left: PAD + leftRoom + 16,
    right: width - PAD - rightRoom - 16,
    top: layout.top,
    bottom: layout.bottom,
  };
  if (SIZE !== "landscape")
    console.log(
      `  ladder: headline ${taken.title + 1}, standfirst ${taken.limit + 1} · rows ` +
        `${layout.plot.toFixed(0)}px, floor ${plotOwes.toFixed(0)}px · plot ` +
        `${(plot.right - plot.left).toFixed(0)}px wide · names at ` +
        (namesBothEdges ? "both edges" : "the right edge, plus the subject's own start"),
    );

  const x = scaleLinear()
    .domain([years[0], years[years.length - 1]])
    .range([plot.left, plot.right]);
  const y = scalePoint<number>()
    .domain(Array.from({ length: slots }, (_, i) => i + 1))
    .range([plot.top, plot.bottom]);

  const path = d3line<{ year: number; rank: number }>()
    .x((p) => x(p.year))
    .y((p) => y(p.rank)!);

  const lastYear = years[years.length - 1];
  const firstYear = years[0];

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = tracks.flatMap((t) => {
    const first = t.points[0];
    const last = t.points[t.points.length - 1];
    const isSubject = t.entity === subject;
    const left =
      first.year === firstYear && (namesBothEdges || isSubject)
        ? [
            {
              id: `left-${t.entity}`,
              treatment: "rank-is-printed-on-the-entry",
              text: set(nameAt(t.entity, first.rank), value),
              at: { x: x(first.year) - 10, y: y(first.rank)! },
              priority: isSubject ? 9 : 5,
              register: value,
              anchors: ["left"],
            },
          ]
        : [];
    // An exit is named where it left — the treatment's whole point — and a survivor at the right
    // edge. Both go through the arbiter, because ten names at one edge on a plot whose lines cross
    // is exactly the collision it exists for.
    const right = [
      {
        id: `right-${t.entity}`,
        treatment: t.throughout
          ? "rank-is-printed-on-the-entry"
          : "exits-are-drawn",
        text: set(nameAt(t.entity, last.rank), value),
        at: { x: x(last.year) + 10, y: y(last.rank)! },
        priority: isSubject ? 9 : last.year === lastYear ? 6 : 3,
        register: value,
        // ONE honest position each. The arbiter's default is all four, `above` first, and a rank
        // label set above its point sits on the row above — see `labels-sit-on-their-rank.test.ts`.
        anchors: ["right"],
      },
    ];
    return [...left, ...right];
  });

  /** The lines are marks: a name must clear the tracks it would otherwise sit on. */
  const marks = tracks.flatMap((t) =>
    t.points.map((p) => ({
      x: x(p.year) - 2,
      y: y(p.rank)! - 3,
      width: 4,
      height: 6,
    })),
  );

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
        top: plot.top - value.fontSize,
        right: width - PAD,
        bottom: plot.bottom + value.fontSize,
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

  /** A YEAR-TICK LADDER, because a count tuned on a 700px plot is not a count that fits on a 250px
   *  one. Every fifth year plus both ends clears easily at 1920; at 1080 the eight runs ran
   *  together into « 19909 9250 000 0250 100 12502024 ». The two ends are placed first and never
   *  go — they say what the span IS — and a middle tick whose run would touch one already kept is
   *  dropped rather than printed through it. */
  const tickSpan = (v: number): [number, number] => {
    const w = widthOf(set(String(v), axis), axis);
    return [x(v) - w / 2, x(v) + w / 2];
  };
  const endYears = [firstYear, lastYear];
  const shownYears = [...endYears];
  for (const v of years.filter((yr) => yr % 5 === 0 && !endYears.includes(yr))) {
    const [l, r] = tickSpan(v);
    const clashes = shownYears.some((kept) => {
      const [kl, kr] = tickSpan(kept);
      return l < kr + 6 && r > kl - 6;
    });
    if (!clashes) shownYears.push(v);
  }
  shownYears.sort((a, b) => a - b);
  /**
   * Three inks, one rule each: the subject, a survivor, and something that left.
   *
   * The exit is NOT the gridline's ink. A first render used `grid`, and the ten transient countries
   * came back so pale they read as ruling rather than as data — which is exactly what `grid` is for.
   * An exit is a reading the beat carries; it is quietened, not turned into furniture. Half-way from
   * the ground to `muted` is quiet and still a line.
   */
  const exitInk = mix(direction.ground, muted, 0.55);
  const inkFor = (t: Track) =>
    t.entity === subject ? direction.accent : t.throughout ? muted : exitInk;
  const labelInk = (t: Track) =>
    t.entity === subject ? accentInk : t.throughout ? ink : muted;

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

      {y.domain().map((r) => (
        <line
          key={r}
          x1={plot.left}
          x2={plot.right}
          y1={y(r)}
          y2={y(r)}
          stroke={grid}
          strokeWidth={direction.stroke.rule}
        />
      ))}
      {shownYears.map((v) => (
          <text
            key={v}
            x={x(v)}
            y={plot.bottom + axis.fontSize * 1.8}
            textAnchor="middle"
            {...line(axis)}
          >
            {set(String(v), axis)}
          </text>
        ))}

      {/* Exits first, so a survivor's track is never drawn under one. */}
      {[...tracks]
        .sort((a, b) => Number(a.throughout) - Number(b.throughout))
        .map((t) => (
          <path
            key={t.entity}
            d={path(t.points)!}
            fill="none"
            stroke={inkFor(t)}
            strokeWidth={
              t.entity === subject
                ? direction.stroke.series * 1.5
                : direction.stroke.series
            }
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      {tracks.map((t) => {
        const last = t.points[t.points.length - 1];
        return (
          <circle
            key={`end-${t.entity}`}
            cx={x(last.year)}
            cy={y(last.rank)}
            r={t.entity === subject ? 4.5 : 3}
            fill={inkFor(t)}
          />
        );
      })}

      {tracks.flatMap((t) =>
        ["left", "right"].map((side) => {
          const p = byId.get(`${side}-${t.entity}`);
          if (!p) return null;
          return (
            <text
              key={`${side}-${t.entity}`}
              x={p.box.x}
              y={baselineOf(p, value)}
              fill={labelInk(t)}
              fontFamily={value.fontFamily}
              fontSize={value.fontSize}
              fontWeight={t.entity === subject ? 700 : value.fontWeight}
              fontStyle={value.fontStyle}
              letterSpacing={value.letterSpacing}
            >
              {p.text}
            </text>
          );
        }),
      )}
    </svg>
  );
}
