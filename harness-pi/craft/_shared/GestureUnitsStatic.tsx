/**
 * THE UNITS FAMILY'S PLATE (craft/gestures/GRAMMAR.md F5): one row per group of the beat's fixed partition — a
 * histogram's bins, a pictogram's blocks — each row's mark after a name gutter: a histogram's bar, its length the
 * group's COUNT on one count scale, or a pictogram's squares, one square per real thing, ONE square size for every
 * block (`no-scale-icon-carry`). Every row prints its count after its mark. The staging is the beat's own gestures
 * as `composeUnitsStatic` composed them onto one plate: the accent on a group (a block head), rings, rows stepping
 * back, brackets with their sums in a right-hand column, a compare's copy laid in its subject's band, rules at the
 * partition's edges, every note on its row (or, short of room, on a caption line above the rows).
 *
 * Forked from the per-type plates (`static/histogram/DirectedHistogram.tsx`, `static/pictogram-isotype/
 * DirectedUnitGrid.tsx`): registers from the direction, furniture derived from the ground, one accent, direct labels,
 * bins named by both edges with an open top. The fixed staging those plates carried (the threshold callout, the
 * thread blocks) is gone: a gesture draws it or nothing does.
 */

import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  deriveFurniture,
  measureText,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { layoutRows } from "./gesture-family-units.mjs";

const FRAME = { width: 960, height: 540 };

export type Group = {
  name: string;
  count: number;
  lo: number;
  hi: number;
  units: { name: string; value: number }[];
};
export type UnitsPlate = {
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: { index: number; do: string; group: string; text: string }[];
  captions: { index: number; do: string; text: string }[];
  brackets: {
    index: number;
    span: string[];
    whole: boolean;
    sum: number;
    total: number;
    text: string;
  }[];
  copies: { index: number; onto: string; value: number }[];
  references: {
    index: number;
    at: number;
    between: [number, number];
    text?: string;
  }[];
};

type Reg = any;

export function GestureUnitsStatic({
  variant,
  groups,
  plate,
  title,
  limits,
  unit,
  unitIs,
  source,
  alt,
  eyebrow,
  direction,
  frame,
  format = (v: number) => String(v),
}: {
  variant: "histogram" | "pictogram-isotype";
  groups: Group[];
  plate: UnitsPlate;
  title: string | string[];
  limits: string | string[];
  unit: string;
  unitIs?: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  frame?: { width: number; height: number };
  format?: (v: number) => string;
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const ground = direction.ground;
  const PAD = direction.pad ?? 40;
  const reg = (name: string): Reg => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");
  const set = (text: string, r: Reg) => applyCase(text, r.transform);
  const widthOf = (text: string, r: Reg) =>
    measureText(text, {
      fontSize: r.fontSize,
      fontWeight: r.fontWeight,
      fontFamily: r.fontFamily,
    }) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const wrap = (text: string, max: number, r: Reg): string[] => {
    const lines: string[] = [];
    let current = "";
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > max) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  };
  const line = (r: Reg, fill?: string) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: fill ?? r.fill,
  });

  // ── colours: one accent, one neutral at the non-text floor, every word at the text floor ──────────
  const accent = direction.accent;
  const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? ink;
  const neutral =
    adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
    muted;
  const inkText = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedText = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const accentSet = new Set(plate.accent);
  const ringSet = new Set(plate.rings);
  const backSet = new Set(plate.stepBack);

  // ── header and footer ────────────────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLines = wrap(set([title].flat()[0], display), column, display);
  const limitForms = [limits].flat();
  const limitText =
    limitForms.find((f) => wrap(set(f, body), column, body).length <= 2) ??
    limitForms.at(-1)!;
  const limitLines = wrap(set(limitText, body), column, body);
  const sourceLines = wrap(set(source, body), column, body);
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + (titleLines.length - 1) * leadOf(display) + gapOf(body, 1.2);
  const sourceTop = height - PAD - (sourceLines.length - 1) * leadOf(body);
  const unitText = [unit, unitIs].filter(Boolean).join(" · ");
  const unitLines = wrap(set(unitText, axis), column, axis);
  const unitTop =
    sourceTop - gapOf(body, 1.4) - (unitLines.length - 1) * leadOf(axis);

  // ── the gutter, the right column, the count reserve ────────────────────────────────────────────────
  const gutterMax = column * 0.3;
  const nameLines = groups.map((g) => wrap(set(g.name, axis), gutterMax, axis));
  const gutter =
    Math.min(
      gutterMax,
      Math.max(...nameLines.flat().map((l) => widthOf(l, axis))),
    ) + 12;
  const sideMax = Math.min(180, column * 0.22);
  const sideTexts = [
    ...plate.brackets.map((b) => b.text),
    ...plate.references.map((r) => r.text ?? format(r.at)),
  ];
  const sideLines = sideTexts.map((t) => wrap(set(t, annot), sideMax, annot));
  const sideW = sideTexts.length
    ? Math.max(...sideLines.flat().map((l) => widthOf(l, annot))) +
      18 +
      (plate.brackets.length > 1 ? 14 * (plate.brackets.length - 1) : 0)
    : 0;
  const countReserve =
    Math.max(
      ...groups.map((g) => widthOf(set(format(g.count), value), value)),
    ) + 10;

  // Notes that fit after their row's count stay there; the others move to caption lines above the rows.
  const captions = plate.captions.map((c) => c.text);
  const rowNotes = new Map<string, string>();
  for (const n of plate.notes) rowNotes.set(n.group, n.text);
  for (const c of plate.copies)
    if (!rowNotes.has(c.onto))
      rowNotes.set(
        c.onto,
        `${format(groups.find((g) => g.name === c.onto)!.count)} / ${format(c.value)}`,
      );
  const plotRight = width - PAD - sideW;
  const top0 =
    limitsTop + (limitLines.length - 1) * leadOf(body) + gapOf(annot, 1.6);

  const build = (moved: Set<string>) => {
    const capLines = [
      ...captions,
      ...[...moved].map((g) => `${g}: ${rowNotes.get(g)}`),
    ].flatMap((t) => wrap(set(t, annot), column, annot));
    const plotTop =
      top0 +
      (capLines.length
        ? capLines.length * leadOf(annot) + gapOf(annot, 0.5)
        : 0);
    const plotBottom = unitTop - leadOf(axis) * 1.2;
    const box = {
      x: PAD,
      y: plotTop,
      width: plotRight - PAD - countReserve,
      height: Math.max(20, plotBottom - plotTop),
    };
    const laid = plate.copies.map((c) => c.value);
    const geo = layoutRows({ groups, variant, box, gutter, laid });
    return { capLines, plotTop, plotBottom, geo };
  };
  let moved = new Set<string>();
  let built = build(moved);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Set(moved);
    built.geo.rows.forEach((r, i) => {
      const text = rowNotes.get(groups[i].name);
      if (!text || next.has(groups[i].name)) return;
      const end = r.end(
        Math.max(
          groups[i].count,
          ...plate.copies
            .filter((c) => c.onto === groups[i].name)
            .map((c) => c.value),
        ),
      );
      const room = plotRight - (end + countReserve + 8);
      const lines = wrap(set(text, annot), Math.max(40, room), annot);
      const tall = lines.length * leadOf(annot);
      if (room < 90 || tall > Math.max(built.geo.pitch, leadOf(annot)))
        next.add(groups[i].name);
    });
    if (next.size === moved.size) break;
    moved = next;
    built = build(moved);
  }
  const { capLines, plotTop, geo } = built;
  // Names, counts and notes print where a row is tall enough for one line of them; under that, every other row.
  const rowText = Math.max(leadOf(axis), leadOf(value));
  const every = Math.max(1, Math.ceil(rowText / geo.pitch));
  const printed = (i: number) =>
    i % every === 0 ||
    accentSet.has(groups[i].name) ||
    ringSet.has(groups[i].name) ||
    rowNotes.has(groups[i].name);

  const midY = (r: { mid: number }, reg_: Reg) => r.mid + reg_.fontSize * 0.35;
  const fillOf = (name: string) => (accentSet.has(name) ? accent : neutral);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />
      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={titleTop + i * leadOf(display)}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={limitsTop + i * leadOf(body)}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {capLines.map((l, i) => (
        <text
          key={`c${i}`}
          x={PAD}
          y={top0 + i * leadOf(annot)}
          {...line(annot, inkText)}
        >
          {l}
        </text>
      ))}

      {geo.rows.map((r, i) => {
        const g = groups[i];
        const back = backSet.has(g.name) ? 0.3 : 1;
        const strong = accentSet.has(g.name) || ringSet.has(g.name);
        const lines = nameLines[i];
        const nameColour = accentSet.has(g.name) ? accentInk : inkText;
        const end = r.end(g.count);
        const copy = plate.copies.find((c) => c.onto === g.name);
        const after = Math.max(end, copy ? r.end(copy.value) : end);
        const note = rowNotes.get(g.name);
        return (
          <g key={g.name} opacity={back}>
            {printed(i) &&
              lines.map((l, k) => (
                <text
                  key={k}
                  x={geo.x0 - 10}
                  y={
                    midY(r, axis) + (k - (lines.length - 1) / 2) * leadOf(axis)
                  }
                  textAnchor="end"
                  {...line(axis, nameColour)}
                  fontWeight={strong ? 700 : axis.fontWeight}
                >
                  {l}
                </text>
              ))}
            {variant === "histogram" ? (
              <rect
                x={geo.x0}
                y={r.top}
                width={Math.max(0, end - geo.x0)}
                height={r.band}
                fill={fillOf(g.name)}
              />
            ) : (
              g.units.map((u, k) => {
                const c = r.cellAt(k);
                return (
                  <rect
                    key={k}
                    x={c.x + c.size * 0.07}
                    y={c.y + c.size * 0.07}
                    width={c.size * 0.86}
                    height={c.size * 0.86}
                    fill={fillOf(g.name)}
                  />
                );
              })
            )}
            {copy &&
              (variant === "histogram" ? (
                <rect
                  x={geo.x0}
                  y={r.top + r.band * 0.55}
                  width={Math.max(0, r.end(copy.value) - geo.x0)}
                  height={r.band * 0.45}
                  fill={mix(ground, ink, 0.18)}
                  stroke={inkText}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
              ) : (
                Array.from({ length: copy.value }, (_, k) => {
                  const c = r.cellAt(k);
                  return (
                    <rect
                      key={`cp${k}`}
                      x={c.x + c.size * 0.2}
                      y={c.y + c.size * 0.2}
                      width={c.size * 0.6}
                      height={c.size * 0.6}
                      fill="none"
                      stroke={inkText}
                      strokeWidth={0.8}
                    />
                  );
                })
              ))}
            {ringSet.has(g.name) && (
              <rect
                x={geo.x0 - 3}
                y={r.bandTop - 3}
                width={Math.max(6, after - geo.x0 + 6)}
                height={r.bandHeight + 6}
                fill="none"
                stroke={accentInk}
                strokeWidth={1.5}
                rx={3}
              />
            )}
            {printed(i) && (
              <text
                x={after + 6}
                y={midY(r, value)}
                {...line(value, accentSet.has(g.name) ? accentInk : inkText)}
              >
                {set(format(g.count), value)}
              </text>
            )}
            {note &&
              !moved.has(g.name) &&
              wrap(
                set(note, annot),
                Math.max(40, plotRight - (after + countReserve + 8)),
                annot,
              ).map((l, k, all) => (
                <text
                  key={`n${k}`}
                  x={after + countReserve + 2}
                  y={
                    midY(r, annot) + (k - (all.length - 1) / 2) * leadOf(annot)
                  }
                  {...line(annot, accentSet.has(g.name) ? accentInk : inkText)}
                >
                  {l}
                </text>
              ))}
          </g>
        );
      })}

      {/* the baseline every mark starts from */}
      <line
        x1={geo.x0}
        x2={geo.x0}
        y1={plotTop - 2}
        y2={plotTop + geo.rows.length * geo.pitch + 2}
        stroke={muted}
        strokeWidth={direction.stroke?.rule ?? 1}
      />

      {plate.references.map((ref, j) => {
        const a = geo.rows[ref.between[0]];
        const b = geo.rows[ref.between[1]];
        const y = (a.top + a.band + b.top) / 2;
        const lines = sideLines[plate.brackets.length + j];
        return (
          <g key={`ref${j}`}>
            <line
              x1={geo.x0 - 8}
              x2={plotRight - 2}
              y1={y}
              y2={y}
              stroke={accentInk}
              strokeWidth={1.2}
              strokeDasharray="5 3"
            />
            {lines.map((l, k) => (
              <text
                key={k}
                x={plotRight + 10}
                y={
                  y +
                  annot.fontSize * 0.35 +
                  (k - (lines.length - 1) / 2) * leadOf(annot)
                }
                {...line(annot, accentInk)}
              >
                {l}
              </text>
            ))}
          </g>
        );
      })}

      {plate.brackets.map((br, j) => {
        const rowsOf = br.span.map(
          (n) => geo.rows[groups.findIndex((g) => g.name === n)],
        );
        const y0 = Math.min(...rowsOf.map((r) => r.top));
        const y1 = Math.max(...rowsOf.map((r) => r.top + r.band));
        const x = plotRight + 4 + j * 14;
        const lines = sideLines[j];
        return (
          <g key={`br${j}`}>
            <path
              d={`M${x - 5},${y0} H${x} V${y1} H${x - 5}`}
              fill="none"
              stroke={inkText}
              strokeWidth={1.4}
            />
            {lines.map((l, k) => (
              <text
                key={k}
                x={x + 6}
                y={
                  (y0 + y1) / 2 +
                  value.fontSize * 0.35 +
                  (k - (lines.length - 1) / 2) * leadOf(annot)
                }
                {...line(annot, inkText)}
                fontWeight={700}
              >
                {l}
              </text>
            ))}
          </g>
        );
      })}

      {unitLines.map((l, i) => (
        <text
          key={`u${i}`}
          x={PAD}
          y={unitTop + i * leadOf(axis)}
          {...line(axis, mutedText)}
        >
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={sourceTop + i * leadOf(body)}
          {...line(body)}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
