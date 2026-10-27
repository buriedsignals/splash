/**
 * The Part-to-whole family on one still plate, every type a variant: `treemap` (squarified tiles), `marimekko-mosaic-plot`
 * (variable-width 100 % columns, a cell's AREA its value), `pie-and-donut` (arcs of one ring from twelve o'clock).
 * Forked from the per-type components (static/treemap/DirectedTreemap.tsx, static/marimekko-mosaic-plot/
 * DirectedMarimekko.tsx, static/pie-and-donut/DirectedDonuts.tsx), with their fixed staging replaced by the plate the
 * static scheduler composed from the beat's gestures (_shared/gesture-part-static.mjs).
 *
 * Kept from the per-type doctrine:
 * - ONE whole, ONE area (or angle) per unit on the whole plate: a part's shape is its share, and a copy a compare lays
 *   is drawn at that same measure per unit (gesture-family-part.mjs copyShape).
 * - Every drawn part carries its own figure, or the plate draws fewer parts: the count is a ladder, and what does not
 *   fit is folded into ONE remainder part that carries its own figure too (a treemap's area does not compare across
 *   distance; the figure is the repair).
 * - The field is quiet and the thread is not: neutral fills stepped off the ground, the one accent on what the
 *   gestures mark, furniture derived from the ground, text inked on whichever of ink and ground clears the floor.
 * - Direct labels: a gesture's words are written in a notes column beside the plot, each tied to its part by a leader.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import {
  anchorOf,
  arcPath,
  copyShape,
  layoutPart,
  REST,
  restName,
  selectParts,
  SEP,
  shareText,
} from "./gesture-family-part.mjs";

const FRAME = { width: 960, height: 540 };

type Mark = {
  name: string;
  value: number;
  key?: string;
  series?: string;
  rest?: boolean;
};
type Shape = any;
type Plate = {
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: {
    index: number;
    do: string;
    marks: string[];
    text: string;
    value?: boolean;
  }[];
  brackets: {
    index: number;
    members: string[];
    sum: number;
    share: number;
    column: string | null;
    note?: string;
    of: any;
  }[];
  copies: { index: number; onto: string; of: string[]; value: number }[];
  count: {
    index: number;
    marks: string[];
    value: number;
    n: number;
    text: string;
    written: boolean;
  } | null;
  groups: string[][];
  keep: string[];
};

export function GesturePartStatic({
  variant,
  marks,
  plate,
  format,
  unit,
  restLabel,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  frame,
  onLadder,
}: {
  variant: "treemap" | "marimekko-mosaic-plot" | "pie-and-donut";
  marks: Mark[];
  plate: Plate;
  format: (v: number) => string;
  unit: string;
  restLabel: string;
  title: string[];
  limits: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  frame?: { width: number; height: number };
  onLadder?: (note: string) => void;
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const reg = (name: string) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");
  const set = (text: string, r: any) => applyCase(String(text), r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(set(text, r), sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, String(text).length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));
  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    return out;
  }
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);
  const valueBand = bandOf(value);
  const bodyBand = bandOf(body);
  const nameLead = annotBand.ascent + annotBand.descent;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  const field = [
    mix(direction.ground, ink, 0.1),
    mix(direction.ground, ink, 0.17),
    mix(direction.ground, ink, 0.24),
  ];
  const quietFill = mix(direction.ground, ink, 0.045);
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill)
      ? ink
      : direction.ground;

  const whole = marks.reduce((s, m) => s + m.value, 0);
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const keyOf = new Map(marks.map((m) => [m.name, m.key]));
  const shortName = (n: string) =>
    n === REST
      ? restLabel
      : n.startsWith(`${REST}${SEP}`)
        ? `${restLabel}${SEP}${n.slice(REST.length + SEP.length)}`
        : n;
  const share = (v: number) => shareText(format, v / whole);

  // ── the gestures' words: one item each, in story order, written in the notes column ───────────────
  type Item = {
    index: number;
    text: string;
    on: string[];
    kind: "note" | "bracket" | "copy" | "count";
  };
  const items: Item[] = [];
  for (const n of plate.notes) {
    const named =
      n.marks.length === 1 && !n.text.includes(shortName(n.marks[0]));
    items.push({
      index: n.index,
      text: named ? `${shortName(n.marks[0])}: ${n.text}` : n.text,
      on: n.marks,
      kind: "note",
    });
  }
  for (const b of plate.brackets) {
    const who =
      b.column ??
      (b.members.length <= 3
        ? b.members.map(shortName).join(" + ")
        : `${b.members.length}`);
    // The gesture's own words when it wrote some (the core checked them); its derived sum and share otherwise.
    // A set of more than three parts is named by its outline; its words are its sum and share.
    const derived = b.members.length > 3 && !b.column ? `${format(b.sum)} · ${shareText(format, b.share)}` : `${who} = ${format(b.sum)} · ${shareText(format, b.share)}`;
    items.push({
      index: b.index,
      text: b.note ?? derived,
      on: b.members,
      kind: "bracket",
    });
  }
  for (const c of plate.copies)
    if (!plate.notes.some((n) => n.index === c.index))
      items.push({
        index: c.index,
        text: `${shortName(c.onto)} / ${c.of.length <= 2 ? c.of.map(shortName).join(" + ") : `${c.of.length}`}: ${format(valueOf.get(c.onto) ?? 0)} / ${format(c.value)}`,
        on: [c.onto],
        kind: "copy",
      });
  if (plate.count && variant !== "pie-and-donut")
    items.push({
      index: plate.count.index,
      text: plate.count.text,
      on: [],
      kind: "count",
    });
  items.sort((a, b) => a.index - b.index);

  // ── the ladder: headline form, standfirst form, notes beside or under the plot, then the part count ──────
  const column = width - PAD * 2;
  const beside = width >= height * 1.2;
  const notesW = items.length
    ? beside
      ? Math.min(column * 0.34, 300)
      : column
    : 0;
  const head = (t: number, l: number) => {
    const titleLines = wrap(title[t], column, display);
    const limitLines = wrap(limits[l], column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline +
      gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) +
      display.fontSize;
    const limitsTop =
      titleTop +
      (titleLines.length - 1) * titleLead +
      gapOf(body, 0.5517) +
      body.fontSize;
    const captionY =
      limitsTop +
      (limitLines.length - 1) * bodyLead +
      bodyBand.descent +
      10 +
      axisBand.ascent;
    const sourceLines = wrap(source, column, body);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const boxTop = captionY + axisBand.descent + 8;
    const boxBottom = sourceTop - bodyBand.ascent - 12;
    return {
      titleLines,
      limitLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      captionY,
      sourceTop,
      boxTop,
      boxBottom,
    };
  };
  const noteLines = (w: number) => items.map((it) => wrap(it.text, w, annot));
  const notesHeight = (w: number) =>
    noteLines(w).reduce((s, l) => s + l.length * annotLead + 8, 0);

  // The ladder counts the parts drawn BESIDE the ones the gestures name (those are always drawn).
  const named = new Set(plate.keep);
  const namedCount = variant === "marimekko-mosaic-plot" ? new Set(plate.keep.map((n) => keyOf.get(n))).size : named.size;
  const capacities = (variant === "treemap" ? [12, 10, 8, 6, 5, 4, 3, 2, 0] : variant === "pie-and-donut" ? [7, 6, 5, 4, 3, 2, 0] : [10, 8, 6, 5, 4, 3, 0]).map((c) => c + namedCount);
  const INSET = 4;

  type Attempt = {
    shapes: Map<string, Shape>;
    parts: Mark[];
    rest: any;
    box: any;
    labels: Map<string, any>;
    outside: any[];
  };
  const seriesNames = [...new Set(marks.map((m) => m.series).filter(Boolean))] as string[];
  const tryLayout = (
    box: any,
    capacity: number,
    strict: boolean,
  ): Attempt | null => {
    if (box.w < 80 || box.h < 80) return null;
    const { parts, rest } = selectParts({
      variant,
      marks,
      gestures: plate.keep.map((n) => ({ marks: [n] })),
      capacity,
    });
    // A donut is a square centred in the box, its radius leaving room for the widest label on either side.
    const widestLabel = Math.max(
      0,
      ...parts.map((p) =>
        Math.max(
          widthOf(
            p.rest ? restName(restLabel, rest) : shortName(p.name),
            annot,
          ),
          widthOf(format(p.value), value),
        ),
      ),
    );
    const r = Math.min(box.h / 2 - 4, (box.w - 2 * (widestLabel + 26)) / 2);
    // A marimekko names its segments once, in a key at the right of its last column (bands stack in one order).
    const keyW = variant === "marimekko-mosaic-plot" ? Math.max(0, ...seriesNames.map((n) => widthOf(n, annot))) + 22 : 0;
    const plot =
      variant === "marimekko-mosaic-plot"
        ? { ...box, w: box.w - keyW, h: box.h - (axisBand.ascent + axisBand.descent) * 4 - 16 }
        : variant === "pie-and-donut"
          ? {
              x: box.x + box.w / 2 - r,
              y: box.y + box.h / 2 - r,
              w: 2 * r,
              h: 2 * r,
            }
          : box;
    if (plot.w < 60 || plot.h < 60) return null;
    const shapes = layoutPart({
      variant,
      parts,
      box: plot,
      groups: plate.groups,
    });
    const labels = new Map<string, any>();
    const outside: any[] = [];
    if (variant === "pie-and-donut") {
      // Labels outside the ring, on the side the arc faces, stacked so no two overlap; an arc too thin for a line
      // of its own is labelled only when a gesture names it (its words are in the notes column).
      const sides: Record<string, any[]> = { left: [], right: [] };
      for (const p of parts) {
        const s = shapes.get(p.name);
        const a = anchorOf(s);
        const span = (s.a1 - s.a0) * s.r1;
        if (!(p.value > 0)) continue;
        if (span < nameLead * 0.55 && !named.has(p.name)) {
          if (strict) return null;
          continue;
        }
        const side = Math.sin(a.angle) >= 0 ? "right" : "left";
        sides[side].push({ name: p.name, y: a.outer.y, side, a });
      }
      const lineH = nameLead + valueBand.ascent + valueBand.descent;
      for (const side of ["left", "right"]) {
        const list = sides[side].sort((x, y) => x.y - y.y);
        let y = box.y + valueBand.ascent;
        for (const l of list) {
          l.y = Math.max(l.y, y);
          y = l.y + lineH + 2;
        }
        if (list.length && list.at(-1).y + lineH > box.y + box.h + 4) {
          // pull up from the bottom
          let bottom = box.y + box.h - lineH;
          for (let k = list.length - 1; k >= 0; k--) {
            list[k].y = Math.min(list[k].y, bottom);
            bottom = list[k].y - lineH - 2;
          }
          if (list[0].y < box.y - 2) return null;
        }
        // A label pushed far from its arc reads as another arc's: in the strict pass the ladder draws fewer parts.
        if (strict && list.some((l) => Math.abs(l.y - l.a.outer.y) > lineH * 1.6)) return null;
        for (const l of list) {
          const rx =
            s0(shapes).cx + (side === "right" ? 1 : -1) * (s0(shapes).r1 + 18);
          outside.push({ ...l, x: rx, from: l.a.outer });
        }
      }
      // The labels must stay inside the plot box.
      const widest = Math.max(
        0,
        ...outside.map((o) =>
          Math.max(
            widthOf(shortName(o.name), annot),
            widthOf(
              format(valueOf.get(o.name) ?? partValue(parts, o.name)),
              value,
            ),
          ),
        ),
      );
      const s = s0(shapes);
      if (
        s.cx - s.r1 - 18 - widest < box.x - 1 ||
        s.cx + s.r1 + 18 + widest > box.x + box.w + 1
      )
        return null;
      return { shapes, parts, rest, box, labels, outside };
    }
    for (const p of parts) {
      const s = shapes.get(p.name);
      if (!s || !(p.value > 0)) continue;
      const v = format(p.value);
      const inner = { w: s.w - INSET * 2, h: s.h - INSET * 2 };
      const fitsValue =
        inner.w >= widthOf(v, value) &&
        inner.h >= valueBand.ascent + valueBand.descent;
      const name =
        variant === "marimekko-mosaic-plot"
          ? (p.series ?? p.name)
          : shortName(p.name === REST ? restName(restLabel, rest) : p.name);
      const lines = wrap(name, inner.w, annot).slice(0, 2);
      const fitsName =
        fitsValue &&
        lines.every((l) => widthOf(l, annot) <= inner.w) &&
        wrap(name, inner.w, annot).length <= 2 &&
        inner.h >=
          valueBand.ascent + valueBand.descent + lines.length * nameLead + 2;
      // A marimekko's thin bands carry no figure (the column's own total and the notes do); a tile must.
      if (!fitsValue && variant === "treemap" && strict && !p.rest && !named.has(p.name)) return null;
      labels.set(p.name, { v, lines, fitsValue, fitsName });
    }
    if (variant === "marimekko-mosaic-plot") {
      const lastKey = [...new Set(parts.map((p) => p.key))].at(-1);
      const keyed = seriesNames
        .map((n) => ({ n, s: shapes.get(parts.find((p) => p.key === lastKey && p.series === n)?.name ?? "") }))
        .filter((k) => k.s)
        .map((k) => ({ name: k.n, from: { x: k.s.x + k.s.w, y: k.s.y + k.s.h / 2 }, y: k.s.y + k.s.h / 2 }));
      // Stacked bottom-up in the column, so the key runs top-down by y; pushed apart to one line each.
      keyed.sort((a, b) => a.y - b.y);
      let y = plot.y + annotBand.ascent / 2;
      for (const k of keyed) {
        k.y = Math.max(k.y, y);
        y = k.y + nameLead;
      }
      let bottom = plot.y + plot.h;
      for (let i = keyed.length - 1; i >= 0; i--) {
        keyed[i].y = Math.min(keyed[i].y, bottom);
        bottom = keyed[i].y - nameLead;
      }
      if (keyed.length && keyed[0].y < plot.y - nameLead) return null;
      outside.push(...keyed.map((k) => ({ ...k, x: plot.x + plot.w + 14, key: true })));
    }
    return { shapes, parts, rest, box: plot, labels, outside };
  };
  function s0(shapes: Map<string, Shape>) {
    return shapes.values().next().value;
  }
  function partValue(parts: Mark[], n: string) {
    return parts.find((p) => p.name === n)?.value ?? 0;
  }

  let chosen: any = null;
  outer: for (const strict of [true, false])
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        const h = head(t, l);
        const notesBelow = beside
          ? 0
          : items.length
            ? notesHeight(notesW) + 10
            : 0;
        const box = {
          x: PAD,
          y: h.boxTop,
          w: column - (beside && items.length ? notesW + 24 : 0),
          h: h.boxBottom - h.boxTop - notesBelow,
        };
        if (
          beside &&
          items.length &&
          notesHeight(notesW) > h.boxBottom - h.boxTop
        )
          continue;
        for (const capacity of capacities) {
          const got = tryLayout(box, capacity, strict);
          if (got) {
            chosen = { h, got, t, l, capacity, strict, notesBelow };
            break outer;
          }
        }
      }
  if (!chosen)
    throw new Error(
      `no headline form, standfirst form and part count leave the plot room for its parts and the gestures' words in this direction: shorten the title's last form or the notes`,
    );
  const { h, got } = chosen;
  onLadder?.(
    `ladder: headline ${chosen.t + 1}, standfirst ${chosen.l + 1}, ${got.parts.length} parts drawn (capacity ${chosen.capacity})${got.rest.count ? `, ${got.rest.count} folded into "${restLabel}"` : ""}${chosen.strict ? "" : ", some parts unlabelled"}`,
  );

  const accent = new Set(plate.accent);
  const rings = new Set(plate.rings);
  const stepBack = new Set(plate.stepBack);
  const seriesOrder = [...new Set(marks.map((m) => m.series).filter(Boolean))];
  const fillOf = (p: Mark) => {
    if (accent.has(p.name)) return direction.accent;
    if (stepBack.has(p.name) || (p.rest && stepBack.size)) return quietFill;
    if (variant === "marimekko-mosaic-plot")
      return field[seriesOrder.indexOf(p.series as string) % field.length];
    return field[0];
  };
  const shapes = got.shapes;
  const box = got.box;

  // ── where each item's leader lands ─────────────────────────────────────────────────────────────
  const anchorOfSet = (on: string[]) => {
    const list = on.map((n) => shapes.get(n)).filter(Boolean);
    if (!list.length) return null;
    if (list[0].kind === "arc") {
      // A leader lands on the ring's outer rim, where it crosses no other arc.
      const a = anchorOf({ ...list[0], a0: Math.min(...list.map((s: any) => s.a0)), a1: Math.max(...list.map((s: any) => s.a1)) });
      return { ...a, x: a.outer.x, y: a.outer.y };
    }
    const x0 = Math.min(...list.map((s: any) => s.x));
    const y0 = Math.min(...list.map((s: any) => s.y));
    const x1 = Math.max(...list.map((s: any) => s.x + s.w));
    const y1 = Math.max(...list.map((s: any) => s.y + s.h));
    // One part: its centre. A treemap block: its right edge. Cells spread over a marimekko: the largest one's centre.
    const biggest = list.reduce((a: any, b: any) => (b.w * b.h > a.w * a.h ? b : a), list[0]);
    const block = variant === "treemap" && list.length > 1;
    return {
      x: list.length === 1 ? (x0 + x1) / 2 : block ? x1 - 4 : biggest.x + biggest.w / 2,
      y: list.length === 1 || block ? (y0 + y1) / 2 : biggest.y + biggest.h / 2,
      outer: { x: x1, y: y0 },
      bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    };
  };
  const notesX = beside ? width - PAD - notesW : PAD;
  let notesY = beside
    ? box.y + annotBand.ascent
    : box.y +
      box.h +
      (variant === "marimekko-mosaic-plot"
        ? (axisBand.ascent + axisBand.descent) * 4 + 16
        : 0) +
      14 +
      annotBand.ascent;
  const placedItems = items.map((it, k) => {
    const lines = noteLines(notesW)[k];
    const at = { x: notesX, y: notesY, lines };
    notesY += lines.length * annotLead + 8;
    return {
      ...it,
      ...at,
      target: it.kind === "count" ? null : anchorOfSet(it.on),
    };
  });

  const ring = (s: Shape, key: string) =>
    s.kind === "arc" ? (
      <path
        key={key}
        d={arcPath({ ...s, r0: s.r0 - 3, r1: s.r1 + 3 })}
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
      />
    ) : (
      <rect
        key={key}
        x={s.x + 1.5}
        y={s.y + 1.5}
        width={Math.max(0, s.w - 4)}
        height={Math.max(0, s.h - 4)}
        fill="none"
        stroke={ink}
        strokeWidth={2}
      />
    );

  // Column labels: a name (and its total, on the line under) may run past a narrow column into its neighbour's
  // room; a label that would overlap one already placed is left out. The columns the gestures name are placed
  // first, then the widest.
  // Each column's label takes the first of two staggered rows where neither its name nor its total overlaps one
  // already placed (a name may run past a narrow column); a column with no room on either row is left unlabelled.
  const labelRow = new Map<string, number>();
  if (variant === "marimekko-mosaic-plot") {
    const placed: [number, number][][] = [[], []];
    // How often the gestures name a column's cells: the column the story is about is labelled before its neighbours.
    const mentions = new Map<string, number>();
    for (const n of [...plate.brackets.flatMap((b) => b.members), ...plate.notes.flatMap((x) => x.marks), ...plate.copies.flatMap((c) => [c.onto, ...c.of]), ...plate.accent, ...plate.rings]) {
      const k = keyOf.get(n);
      if (k !== undefined) mentions.set(k, (mentions.get(k) ?? 0) + 1);
    }
    const cols = [...new Set(got.parts.map((p: Mark) => p.key as string))].map((k) => {
      const cells = got.parts.filter((p: Mark) => p.key === k);
      return { k, cell: shapes.get(cells[0]?.name as string), texts: { name: k === REST ? restName(restLabel, got.rest) : k, total: format(cells.reduce((t: number, p: Mark) => t + p.value, 0)) } };
    });
    cols.sort((a, b) => (mentions.get(b.k) ?? 0) - (mentions.get(a.k) ?? 0) || (b.cell?.w ?? 0) - (a.cell?.w ?? 0));
    for (const c of cols) {
      if (!c.cell) continue;
      const span: [number, number] = [c.cell.x, c.cell.x + Math.max(widthOf(c.texts.name, axis), widthOf(c.texts.total, axis))];
      if (span[1] > box.x + box.w + 120) continue;
      const row = placed.findIndex((list) => !list.some(([x0, x1]) => span[0] < x1 + 8 && x0 < span[1] + 8));
      if (row < 0) continue;
      placed[row].push(span);
      labelRow.set(c.k, row);
    }
  }
  const donut = variant === "pie-and-donut" ? s0(shapes) : null;

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
      <text x={PAD} y={h.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {h.titleLines.map((l: string, i: number) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={h.titleTop + i * titleLead}
          {...line(display)}
        >
          {set(l, display)}
        </text>
      ))}
      {h.limitLines.map((l: string, i: number) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={h.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {set(l, body)}
        </text>
      ))}
      <text
        x={PAD}
        y={h.captionY}
        {...line(axis)}
        fontWeight={700}
        fill={mutedInk}
      >
        {set(`${unit} · ${format(whole)}`, axis)}
      </text>

      {/* the parts */}
      {got.parts.map((p: Mark) => {
        const s = shapes.get(p.name);
        if (!s || !(p.value > 0)) return null;
        const fill = fillOf(p);
        if (s.kind === "arc")
          return (
            <path
              key={p.name}
              d={arcPath(s)}
              fill={fill}
              stroke={direction.ground}
              strokeWidth={1.2}
            />
          );
        return (
          <rect
            key={p.name}
            x={s.x}
            y={s.y}
            width={Math.max(s.w - 1, 0.5)}
            height={Math.max(s.h - 1, 0.5)}
            fill={fill}
            stroke={direction.ground}
            strokeWidth={1}
          />
        );
      })}

      {/* the labels a part carries inside itself */}
      {variant !== "pie-and-donut" &&
        got.parts.map((p: Mark) => {
          const s = shapes.get(p.name);
          const lab = got.labels.get(p.name);
          if (!s || !lab || !lab.fitsValue) return null;
          const on = legibleOn(fillOf(p));
          const top = s.y + INSET + valueBand.ascent;
          return (
            <g key={`lab-${p.name}`}>
              <text x={s.x + INSET} y={top} {...line(value)} fill={on}>
                {set(lab.v, value)}
              </text>
              {lab.fitsName &&
                lab.lines.map((l: string, i: number) => (
                  <text
                    key={i}
                    x={s.x + INSET}
                    y={
                      top +
                      valueBand.descent +
                      annotBand.ascent +
                      2 +
                      i * nameLead
                    }
                    {...line(annot)}
                    fill={on}
                  >
                    {set(l, annot)}
                  </text>
                ))}
            </g>
          );
        })}

      {/* a marimekko's key: each segment named once, beside its band in the last column */}
      {variant === "marimekko-mosaic-plot" &&
        got.outside
          .filter((k: any) => k.key)
          .map((k: any) => (
            <g key={`key-${k.name}`}>
              <polyline points={`${k.from.x + 1},${k.from.y} ${k.x - 3},${k.y - annotBand.ascent / 3}`} fill="none" stroke={mutedInk} strokeWidth={0.6} />
              <text x={k.x} y={k.y} {...line(annot)} stroke={direction.ground} strokeWidth={3} paintOrder="stroke" fill={marks.some((m) => m.series === k.name && accent.has(m.name)) ? accentInk : mutedInk}>
                {set(k.name, annot)}
              </text>
            </g>
          ))}

      {/* a marimekko's columns: name and total under each column wide enough to carry them */}
      {variant === "marimekko-mosaic-plot" &&
        [...new Set(got.parts.map((p: Mark) => p.key))].map((k: any) => {
          const cells = got.parts
            .filter((p: Mark) => p.key === k)
            .map((p: Mark) => shapes.get(p.name))
            .filter(Boolean);
          if (!cells.length) return null;
          const x = cells[0].x;
          const w = cells[0].w;
          const total = got.parts
            .filter((p: Mark) => p.key === k)
            .reduce((s: number, p: Mark) => s + p.value, 0);
          const name = k === REST ? restName(restLabel, got.rest) : k;
          const fitsName = labelRow.has(k);
          const fitsTotal = labelRow.has(k);
          const y = box.y + box.h + 6 + axisBand.ascent + (labelRow.get(k) ?? 0) * 2 * (axisBand.ascent + axisBand.descent + 3);
          return (
            <g key={`col-${k}`}>
              {fitsName && (
                <text x={x} y={y} {...line(axis)} fontWeight={700} fill={ink}>
                  {set(name, axis)}
                </text>
              )}
              {fitsTotal && (
                <text
                  x={x}
                  y={y + axisBand.ascent + axisBand.descent + 3}
                  {...line(axis)}
                  fill={mutedInk}
                >
                  {set(format(total), axis)}
                </text>
              )}
            </g>
          );
        })}

      {/* a donut's labels, outside the ring, each tied to its arc */}
      {variant === "pie-and-donut" &&
        got.outside.map((o: any) => {
          const p = got.parts.find((x: Mark) => x.name === o.name) as Mark;
          const name = p.rest
            ? restName(restLabel, got.rest)
            : shortName(p.name);
          const anchor = o.side === "right" ? "start" : "end";
          return (
            <g key={`out-${o.name}`}>
              <polyline
                points={`${o.from.x},${o.from.y} ${o.x + (o.side === "right" ? -6 : 6)},${o.y - valueBand.ascent / 2}`}
                fill="none"
                stroke={mutedInk}
                strokeWidth={0.7}
              />
              <text
                x={o.x}
                y={o.y}
                {...line(value)}
                fill={accent.has(p.name) ? accentInk : ink}
                textAnchor={anchor}
              >
                {set(format(p.value), value)}
              </text>
              <text
                x={o.x}
                y={o.y + valueBand.descent + annotBand.ascent + 1}
                {...line(annot)}
                fill={mutedInk}
                textAnchor={anchor}
              >
                {set(name, annot)}
              </text>
            </g>
          );
        })}

      {/* the centre of a donut: the figure a count ends on, else the whole */}
      {donut && (
        <g>
          {wrap(
            plate.count ? plate.count.text : format(whole),
            donut.r0 * 1.6,
            value,
          )
            .slice(0, 3)
            .map((l: string, i: number, all: string[]) => (
              <text
                key={`c${i}`}
                x={donut.cx}
                y={
                  donut.cy +
                  (i - (all.length - 1) / 2) *
                    (valueBand.ascent + valueBand.descent + 2) +
                  valueBand.ascent / 2
                }
                {...line(value)}
                fill={plate.count ? accentInk : ink}
                textAnchor="middle"
              >
                {set(l, value)}
              </text>
            ))}
        </g>
      )}

      {/* brackets: a set laid together, outlined (a donut: an outer band over its arcs) */}
      {plate.brackets.map((b) => {
        const list = b.members.map((n) => shapes.get(n)).filter(Boolean);
        if (!list.length) return null;
        if (list[0].kind === "arc") {
          const a0 = Math.min(...list.map((s: any) => s.a0));
          const a1 = Math.max(...list.map((s: any) => s.a1));
          return (
            <path
              key={`b${b.index}`}
              d={arcPath({
                ...list[0],
                a0,
                a1,
                r0: list[0].r1 + 5,
                r1: list[0].r1 + 8,
              })}
              fill={ink}
            />
          );
        }
        // A treemap lays the set as one block: ONE outline around it.
        if (variant === "treemap" && list.length > 1 && list.every((s: any) => s.group)) {
          const x0 = Math.min(...list.map((s: any) => s.x));
          const y0 = Math.min(...list.map((s: any) => s.y));
          const x1 = Math.max(...list.map((s: any) => s.x + s.w));
          const y1 = Math.max(...list.map((s: any) => s.y + s.h));
          return <rect key={`b${b.index}`} x={x0 + 1} y={y0 + 1} width={Math.max(0, x1 - x0 - 3)} height={Math.max(0, y1 - y0 - 3)} fill="none" stroke={ink} strokeWidth={2.2} />;
        }
        return list.map((s: any, j: number) => (
          <rect
            key={`b${b.index}-${j}`}
            x={s.x + 0.5}
            y={s.y + 0.5}
            width={Math.max(0, s.w - 2)}
            height={Math.max(0, s.h - 2)}
            fill="none"
            stroke={ink}
            strokeWidth={1.4}
            strokeDasharray={b.members.length > 1 ? undefined : "4 2"}
          />
        ));
      })}

      {/* rings */}
      {[...rings].map((n) =>
        shapes.get(n) ? ring(shapes.get(n), `ring-${n}`) : null,
      )}

      {/* compare copies: the compared quantity laid against the subject at the plate's own measure per unit */}
      {plate.copies.map((c) => {
        const s = copyShape({
          variant,
          shapes,
          onto: c.onto,
          value: c.value,
          ontoValue: valueOf.get(c.onto) ?? 0,
          box,
        });
        if (!s) return null;
        return s.kind === "arc" ? (
          <path
            key={`copy${c.index}`}
            d={arcPath(s)}
            fill="none"
            stroke={ink}
            strokeWidth={1.4}
            strokeDasharray="5 3"
          />
        ) : (
          <rect
            key={`copy${c.index}`}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill="none"
            stroke={ink}
            strokeWidth={1.6}
            strokeDasharray="5 3"
          />
        );
      })}

      {/* the gestures' words, each tied to its part */}
      {placedItems.map((it) => (
        <g key={`it${it.index}-${it.kind}`}>
          {beside && it.target && (
            <>
              <polyline
                points={`${it.x - 6},${it.y - annotBand.ascent / 2} ${it.target.x},${it.target.y}`}
                fill="none"
                stroke={mutedInk}
                strokeWidth={0.7}
              />
              <circle cx={it.target.x} cy={it.target.y} r={2.2} fill={ink} />
            </>
          )}
          {it.lines.map((l: string, i: number) => (
            <text
              key={i}
              x={it.x}
              y={it.y + i * annotLead}
              {...line(annot)}
              fill={it.kind === "count" ? accentInk : ink}
              stroke={direction.ground}
              strokeWidth={3}
              paintOrder="stroke"
              fontWeight={it.kind === "count" ? 700 : annot.fontWeight}
            >
              {set(l, annot)}
            </text>
          ))}
        </g>
      ))}

      {h.sourceLines.map((l: string, i: number) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={h.sourceTop + i * bodyLead}
          {...line(body)}
          fill={mutedInk}
        >
          {set(l, body)}
        </text>
      ))}
    </svg>
  );
}
