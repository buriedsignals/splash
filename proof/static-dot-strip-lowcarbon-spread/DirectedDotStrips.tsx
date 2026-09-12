/**
 * Sixteen European countries pinned on two strips — the low-carbon share of their own electricity in
 * 2000 and in 2024 — drawn THROUGH the design base. The first `dot strip` component in this tree.
 *
 * WHAT A STRIP IS FOR. One axis, every unit on it, and the reading is the SHAPE OF THE FIELD: where
 * it starts, where it ends, where it bunches. The lollipop draws levels from zero, the connected
 * scatter draws two variables, the slope draws two rails; none of them lets a reader see a
 * distribution move. This one does, and the claim is that movement.
 *
 * THE RULES TAKEN FROM THE REFERENCE (Ferdio's #85), harvested for this form and read at its own
 * chart card rather than at the page:
 *
 *   **The strip is a ruled axis, not a bare line** — ticks cut into a light band, numbers under it.
 *   A position converts to a number without a field of gridlines behind the marks, which is the
 *   whole reason to spend a strip rather than a scatter.
 *
 *   **The mark is a pin with its name in a chip on top.** The chip is what makes a mark findable;
 *   the STEM is what keeps it honest, because a chip is wider than the value it stands for and would
 *   otherwise blur the reading by its own width. Identity is on the mark; there is no legend.
 *
 *   **The change rides on the leader, not on either mark** — a derived figure belongs to the pair.
 *
 *   **Time reads downward**, and the two date labels are the only thing that says so.
 *
 * `colour-belongs-to-the-entity-not-to-the-state` — nothing about a mark's colour changes between the
 * two strips. `PALETTE.md` records why the reference's per-entity hues cannot be taken at sixteen
 * entities and what survives of the rule.
 *
 * AND THE GUARANTEE THE REFERENCE'S OWN RECORD ASKS FOR. Its `What was not verified` ends: *"whether
 * the two strips share one scale … a reader who assumed it on a plate where it was false would be
 * misled. A beat drawing this form owes the guarantee explicitly."* Both strips here are built from
 * one scale object, the plate prints that they are, and the component throws if they ever differ.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast } from "#shared/chart-beat/colour.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Mark = { code: string; name: string; before: number; after: number };

export function DirectedDotStrips({
  marks,
  subject,
  from,
  to,
  unit,
  scaleNote,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
}: {
  marks: Mark[];
  subject: string;
  from: string;
  to: string;
  unit: string;
  scaleNote: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<string, string>;
  const PAD = direction.pad;

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
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    return out;
  }

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
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);
  const valueBand = bandOf(value);

  const rail = mix(direction.ground, ink, 0.12);
  const tickInk = mix(direction.ground, ink, 0.3);
  const chipFill = mix(direction.ground, ink, 0.13);
  const leader = mix(direction.ground, ink, 0.3);
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill) ? ink : direction.ground;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;

  const CHIP_PAD = 5;
  const chipH = axisBand.ascent + axisBand.descent + 5;
  const chipLead = chipH + 3;
  const STEM = 9;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const top = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.6;
    const bottom =
      (readingLines.length ? readingTop - annotBand.ascent - annot.fontSize * 0.9 : sourceTop - bodyLead * 1.2) -
      axisBand.ascent -
      axisBand.descent -
      6;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      top,
      bottom,
      room: bottom - top,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }

  /** ONE SCALE, BUILT ONCE, USED BY BOTH STRIPS. The reference's own record asks a beat drawing this
   *  form to guarantee it rather than to appear to. */
  /** The two date labels sit in a gutter the scale leaves for them. Drawn at the plate's padding
   *  instead, they lay on the rail's own left end — the gutter belongs to the label, exactly as the
   *  connected scatter's gutter belongs to its axis. */
  const dateGutter = Math.max(widthOf(set(from, axis), axis), widthOf(set(to, axis), axis)) + 10;
  const x = scaleLinear().domain([0, 100]).range([PAD + dateGutter, width - PAD - 10]);
  const ticks = [0, 20, 40, 60, 80, 100];

  /** CHIPS STACK INTO ROWS, and the stem grows with the row. A strip's whole promise is that the
   *  position is the value; a chip is wider than the value it stands for, so where two chips would
   *  touch the later one goes UP a row rather than sideways. Nothing ever moves along the axis. */
  const stack = (values: Array<{ code: string; at: number }>) => {
    const w = (code: string) => widthOf(set(code, axis), axis) + CHIP_PAD * 2;
    const rows: number[][] = [];
    const placed = [...values]
      .sort((a, b) => a.at - b.at)
      .map((v) => {
        const half = w(v.code) / 2;
        let row = 0;
        for (;;) {
          const taken = rows[row] ?? [];
          const last = taken.length ? taken[taken.length - 1] : -Infinity;
          if (v.at - half >= last + 2) {
            (rows[row] ??= []).push(v.at + half);
            break;
          }
          row++;
        }
        return { ...v, row, width: w(v.code) };
      });
    return { placed, rows: rows.length };
  };

  const beforeStack = stack(marks.map((m) => ({ code: m.code, at: x(m.before) })));
  const afterStack = stack(marks.map((m) => ({ code: m.code, at: x(m.after) })));

  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let best = -Infinity;
  /** THE PLATE OWES BOTH STACKS THEIR ROWS, both rails, both tick rows, and a corridor between them
   *  wide enough for a leader to be read as a leader. Under that the chips overlap the axis they
   *  belong to, which is the one thing this form may not do. */
  const CORRIDOR = valueBand.ascent + valueBand.descent + 26;
  const stripRoom = (rows: number) =>
    rows * chipLead + STEM + 6 + axisBand.ascent + axisBand.descent + 4;
  const owed = stripRoom(beforeStack.rows) + stripRoom(afterStack.rows) + CORRIDOR;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.room > best) best = l.room;
    if (l.room >= owed) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves ${best.toFixed(0)}px for two strips that owe ${owed.toFixed(0)}px — ` +
        `${beforeStack.rows} and ${afterStack.rows} rows of chips, two rails, two tick rows and a ` +
        `corridor. Below that the chips sit on the axis they are pinned to.`,
    );
  const layout = fits.layout;

  const railBefore = layout.top + beforeStack.rows * chipLead + STEM;
  const ticksBeforeY = railBefore + 4 + axisBand.ascent;
  const railAfter = layout.bottom - axisBand.ascent - axisBand.descent - 4;
  const ticksAfterY = railAfter + 4 + axisBand.ascent;
  const chipTopAfter = railAfter - STEM - afterStack.rows * chipLead;
  if (chipTopAfter <= ticksBeforeY + 6)
    throw new Error(
      `the two strips' furniture overlaps: the lower strip's chips would start at ` +
        `${chipTopAfter.toFixed(0)} and the upper strip's numbers end at ${ticksBeforeY.toFixed(0)}.`,
    );

  const seatOf = (s: ReturnType<typeof stack>, code: string) => s.placed.find((p) => p.code === code)!;

  /** THE CHANGE RIDES ON THE LEADER — AND ONLY WHERE IT CAN BE ATTRIBUTED. At three entities the
   *  reference labels every leader and each number plainly belongs to the one line under it. At
   *  sixteen the leaders cross, and a number floating in the corridor belongs to whichever line the
   *  reader guesses: eleven of them were written that way and not one could be traced to its
   *  country. So the rule is kept for the mark it can serve — the subject's, on its own accented
   *  leader — and refused for the rest, where the leaders themselves carry the movement. */
  const subjectMark = marks.find((m) => m.code === subject);
  if (!subjectMark) throw new Error(`the subject ${subject} is not among the marks`);
  const midY = (railBefore + chipTopAfter) / 2;
  const changes = [
    {
      code: subjectMark.code,
      x: (x(subjectMark.before) + x(subjectMark.after)) / 2,
      y: midY + valueBand.ascent / 2,
      text: `+${Math.round(subjectMark.after - subjectMark.before)}`,
      isSubject: true,
    },
  ];

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · room ${layout.room.toFixed(0)}px, owed ${owed.toFixed(0)}px · chips ${beforeStack.rows}/` +
      `${afterStack.rows} rows · only the subject's change is written, ${marks.length - 1} refused as ` +
      `unattributable`,
  );

  const strip = (
    railY: number,
    ticksY: number,
    s: ReturnType<typeof stack>,
    up: boolean,
    label: string,
  ) => (
    <g>
      <rect x={x(0)} y={railY - 3} width={x(100) - x(0)} height={6} fill={rail} />
      {Array.from({ length: 21 }, (_, i) => i * 5).map((t) => (
        <line
          key={`t${t}`}
          x1={x(t)}
          x2={x(t)}
          y1={railY - 3}
          y2={railY + (t % 20 === 0 ? 3 : 0)}
          stroke={tickInk}
          strokeWidth={t % 20 === 0 ? direction.stroke.rule : direction.stroke.hairline}
        />
      ))}
      {ticks.map((t) => (
        <text
          key={`n${t}`}
          x={x(t)}
          y={ticksY}
          textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(t), axis)}
        </text>
      ))}
      <text
        x={x(0) - 7}
        y={railY + (axisBand.ascent - axisBand.descent) / 2}
        textAnchor="end"
        {...line(axis)}
        fontWeight={700}
        fill={mutedInk}
      >
        {set(label, axis)}
      </text>
      {s.placed.map((p) => {
        const isSubject = p.code === subject;
        const fill = isSubject ? direction.accent : chipFill;
        const chipY = up
          ? railY - STEM - (p.row + 1) * chipLead + 3
          : railY - STEM - (p.row + 1) * chipLead + 3;
        return (
          <g key={p.code}>
            <line
              x1={p.at}
              x2={p.at}
              y1={railY}
              y2={chipY + chipH}
              stroke={isSubject ? accentInk : leader}
              strokeWidth={isSubject ? direction.stroke.rule : direction.stroke.hairline}
            />
            <rect
              x={p.at - p.width / 2}
              y={chipY}
              width={p.width}
              height={chipH}
              rx={3}
              fill={fill}
            />
            {/* The code is haloed in its own chip's fill: a stem or a neighbour's leader crossing a
                three-letter code makes it a two-letter code. */}
            <text
              x={p.at}
              y={chipY + chipH / 2 + (axisBand.ascent - axisBand.descent) / 2}
              textAnchor="middle"
              {...line(axis)}
              fill="none"
              stroke={fill}
              strokeWidth={3}
              strokeLinejoin="round"
              fontWeight={isSubject ? 700 : axis.fontWeight}
            >
              {set(p.code, axis)}
            </text>
            <text
              x={p.at}
              y={chipY + chipH / 2 + (axisBand.ascent - axisBand.descent) / 2}
              textAnchor="middle"
              {...line(axis)}
              fill={legibleOn(fill)}
              fontWeight={isSubject ? 700 : axis.fontWeight}
            >
              {set(p.code, axis)}
            </text>
          </g>
        );
      })}
    </g>
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

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* THE LEADERS, drawn under everything: they are furniture, not marks. They start BELOW the
          upper strip's own numbers rather than at its rail — begun at the rail they ran straight
          through `20` and `60`, and a leader crossing the axis it leaves is the plate cutting its
          own scale. */}
      {marks.map((m) => {
        const a = seatOf(beforeStack, m.code);
        const b = seatOf(afterStack, m.code);
        const isSubject = m.code === subject;
        return (
          <line
            key={`lead-${m.code}`}
            x1={a.at}
            y1={ticksBeforeY + axisBand.descent + 3}
            x2={b.at}
            y2={chipTopAfter - 3}
            stroke={isSubject ? accentInk : leader}
            strokeWidth={isSubject ? direction.stroke.rule : direction.stroke.hairline}
            strokeDasharray={isSubject ? "4 3" : "2 3"}
          />
        );
      })}

      {changes.map((c) => (
        <g key={`chg-${c.code}`}>
          <text
            x={c.x}
            y={c.y}
            textAnchor="middle"
            {...line(value)}
            fill="none"
            stroke={direction.ground}
            strokeWidth={3.4}
            strokeLinejoin="round"
            fontWeight={c.isSubject ? 700 : value.fontWeight}
          >
            {set(c.text, value)}
          </text>
          <text
            x={c.x}
            y={c.y}
            textAnchor="middle"
            {...line(value)}
            fill={c.isSubject ? accentInk : mutedInk}
            fontWeight={c.isSubject ? 700 : value.fontWeight}
          >
            {set(c.text, value)}
          </text>
        </g>
      ))}

      {strip(railBefore, ticksBeforeY, beforeStack, true, from)}
      {strip(railAfter, ticksAfterY, afterStack, true, to)}

      <text x={PAD} y={layout.bottom + axisBand.ascent + 2} {...line(axis)} fill={mutedInk}>
        {set(`${unit} · ${scaleNote}`, axis)}
      </text>

      {layout.readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={layout.readingTop + i * annotLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
    </svg>
  );
}
