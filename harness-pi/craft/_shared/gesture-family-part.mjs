// The Part-to-whole family adapter (craft/gestures/GRAMMAR.md §4 F6, §4.2): tiles or arcs from a layout, a part's
// AREA or ANGLE is its share of one drawn whole. Three types draw it, as variants of one family:
//   treemap                one mark per part, squarified rectangles
//   marimekko-mosaic-plot  one mark per cell: key = the column, series = the segment ("Germany · Coal")
//   pie-and-donut          one mark per part, arcs of one ring from twelve o'clock, clockwise
// It answers what the family is (marks, the drawn parts and their remainder, where each part sits, a copy laid
// against another part with its area or angle kept) and what a picture holds after a run of gestures (`foldPart`);
// the format schedulers decide when each picture shows. It registers the family at import. Pure geometry,
// browser-safe (the video bundle and the scrolly drive import it): no Node module, no native code.
//
// Members (GRAMMAR §4.2 F6): cell(id) — a part's shape in the layout; share(id) — its share of the drawn whole;
// whole; relayout(subset) — the layout with a set laid as one block (a treemap bracket), area kept; remainder(ids)
// — the parts the frame has no room for, folded into one part that carries its own figure; moveConserving(id,
// value) — a copy of `value` laid against a part with the same area (rect) or angle (arc) per unit.
import { applyFix, figuresIn, GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

/**
 * What the family draws in all four formats. Left out, with the reason: `zoom` (a part-to-whole has no value axis
 * to enlarge; a re-layout is not a zoom), `reorder` (a layout's order is the data's — largest first, segments
 * locked: no-change-segment-order), `rescale` (one whole, one area per unit, every state), `reference` (no value
 * axis to rule), `trace` (no path).
 */
export const PART_GESTURES = ["highlight", "name", "annotate", "bracket", "compare", "filter", "count", "reveal", "pull-back"];
FAMILIES.part ??= { gestures: PART_GESTURES, additive: true };

export const FAMILY = "part";
export const VARIANTS = ["treemap", "marimekko-mosaic-plot", "pie-and-donut"];
/** A marimekko cell's mark name: its column, then its segment. */
export const SEP = " · ";
/** The parts a frame draws at most before the rest is folded into one remainder part (every named part kept). */
export const CAPACITY = { treemap: 14, "pie-and-donut": 8, "marimekko-mosaic-plot": 10 };
export const REST = "__rest__";

const fold = (s) => String(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const sumOf = (list) => list.reduce((s, m) => s + m.value, 0);

/**
 * The marks from the beat's rows. treemap / pie-and-donut: { name, value }. marimekko: { column, segment, value }.
 * A part cannot be negative (an area or an angle has no sign): refused naming the row, the one shape refusal this
 * family has, because no layout can draw it truthfully. A zero part is kept as a mark and draws no area.
 */
export function partMarks(variant, rows) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of ${VARIANTS.join(", ")}, not "${variant}"`);
  if (!Array.isArray(rows) || !rows.length) throw new Error(`rows must be a non-empty array (see CONTRACT.md)`);
  const marks =
    variant === "marimekko-mosaic-plot"
      ? rows.map((r) => {
          if (r.column === undefined || r.segment === undefined) throw new Error(`rows: a marimekko row is { column, segment, value }, got ${JSON.stringify(r)}`);
          return { name: `${r.column}${SEP}${r.segment}`, value: Number(r.value), key: String(r.column), series: String(r.segment) };
        })
      : rows.map((r) => ({ name: String(r.name), value: Number(r.value) }));
  const bad = marks.filter((m) => !Number.isFinite(m.value));
  if (bad.length) throw new Error(`rows: ${bad.slice(0, 3).map((m) => m.name).join(", ")} ${bad.length > 1 ? "have" : "has"} no number: give every row a numeric value`);
  const negative = marks.filter((m) => m.value < 0);
  if (negative.length)
    throw new Error(`rows: ${negative.slice(0, 3).map((m) => `${m.name} = ${m.value}`).join(", ")}: a part of a whole cannot be negative — leave those rows out and say so in limits, or draw the beat as a diverging bar`);
  const seen = new Set();
  for (const m of marks) {
    if (seen.has(m.name)) throw new Error(`rows: two parts are named ${JSON.stringify(m.name)}: add the rows of one part up into one`);
    seen.add(m.name);
  }
  if (!(sumOf(marks) > 0)) throw new Error(`rows: the parts add up to 0, so there is no whole to draw a share of`);
  return marks;
}

// ── the parts drawn ───────────────────────────────────────────────────────────────────────────────

/**
 * Which parts a frame draws: every part a gesture names, then the largest of the others up to the variant's
 * capacity; the rest are folded into ONE remainder part (name REST, the beat's restLabel printed on it) that carries
 * its own figure, so the drawn whole is always the whole. A marimekko folds whole COLUMNS (their segments summed per
 * segment into a remainder column) and keeps every segment.
 * Returns parts (in layout order (largest first, the remainder last)) and rest { count, sum, members }
 */
export function selectParts({ variant, marks, gestures = /** @type {any[]} */ ([]), capacity = CAPACITY[variant] }) {
  const named = new Set(gestures.flatMap((g) => g.marks ?? []));
  if (variant === "marimekko-mosaic-plot") {
    const columns = [...new Set(marks.map((m) => m.key))];
    const total = (k) => sumOf(marks.filter((m) => m.key === k));
    const keepCols = new Set(columns.filter((k) => marks.some((m) => m.key === k && named.has(m.name))));
    for (const k of [...columns].sort((a, b) => total(b) - total(a))) if (keepCols.size < capacity) keepCols.add(k);
    const kept = marks.filter((m) => keepCols.has(m.key));
    const left = marks.filter((m) => !keepCols.has(m.key));
    const restCols = [...new Set(left.map((m) => m.key))];
    const series = [...new Set(marks.map((m) => m.series))];
    const restCells = restCols.length
      ? series.map((s) => ({ name: `${REST}${SEP}${s}`, value: sumOf(left.filter((m) => m.series === s)), key: REST, series: s, rest: true }))
      : [];
    return { parts: [...kept, ...restCells], rest: { count: restCols.length, sum: sumOf(left), members: restCols } };
  }
  const sorted = [...marks].sort((a, b) => b.value - a.value);
  let kept = sorted;
  if (sorted.length > capacity) {
    const fill = sorted.filter((m) => !named.has(m.name)).slice(0, Math.max(0, capacity - named.size));
    const chosen = new Set([...named, ...fill.map((m) => m.name)]);
    kept = sorted.filter((m) => chosen.has(m.name));
  }
  const left = sorted.filter((m) => !kept.includes(m));
  const parts = left.length ? [...kept, { name: REST, value: sumOf(left), rest: true }] : kept;
  return { parts, rest: { count: left.length, sum: sumOf(left), members: left.map((m) => m.name) } };
}

// ── the layout ────────────────────────────────────────────────────────────────────────────────────

/** Squarified treemap (Bruls, Huizing & van Wijk) of `values` (descending) into `box`, areas proportional. */
export function squarify(values, box) {
  const total = values.reduce((s, v) => s + v, 0);
  if (!(total > 0) || box.w <= 0 || box.h <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }));
  const scale = (box.w * box.h) / total;
  const areas = values.map((v) => v * scale);
  const out = [];
  let free = { ...box };
  const worst = (row, side) => {
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const lay = (row) => {
    const s = row.reduce((a, b) => a + b, 0);
    const horizontal = free.w >= free.h;
    const thick = s / (horizontal ? free.h : free.w);
    let cursor = horizontal ? free.y : free.x;
    for (const a of row) {
      const len = thick > 0 ? a / thick : 0;
      out.push(horizontal ? { x: free.x, y: cursor, w: thick, h: len } : { x: cursor, y: free.y, w: len, h: thick });
      cursor += len;
    }
    free = horizontal ? { x: free.x + thick, y: free.y, w: free.w - thick, h: free.h } : { x: free.x, y: free.y + thick, w: free.w, h: free.h - thick };
  };
  let row = [];
  let i = 0;
  // Zero areas are laid as zero-size rects at the free corner (a zero part draws no area, nothing refuses it).
  const positive = areas.map((a, k) => [a, k]).filter(([a]) => a > 0);
  const zero = areas.map((a, k) => [a, k]).filter(([a]) => !(a > 0));
  const laid = [];
  while (i < positive.length) {
    const side = Math.min(free.w, free.h);
    const next = positive[i][0];
    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      i++;
    } else {
      lay(row);
      row = [];
    }
  }
  if (row.length) lay(row);
  positive.forEach(([, k], j) => (laid[k] = out[j]));
  zero.forEach(([, k]) => (laid[k] = { x: free.x, y: free.y, w: 0, h: 0 }));
  return laid;
}

/**
 * Where every drawn part sits. `groups` are sets that must lie together (a bracket's members): a treemap lays each
 * as one block of its summed area and squarifies its members inside it (area kept); a donut keeps them in adjacent
 * arcs; a marimekko never moves a cell (column and segment order are data) and draws the group as an outline.
 * @returns Map name → shape: { kind: "rect", x, y, w, h } or { kind: "arc", cx, cy, r0, r1, a0, a1 } (radians,
 *          0 = twelve o'clock, clockwise)
 */
export function layoutPart({ variant, parts, box, groups = /** @type {string[][]} */ ([]) }) {
  const shapes = new Map();
  const total = sumOf(parts);
  const valueOf = new Map(parts.map((p) => [p.name, p.value]));
  // Only disjoint groups of drawn parts: the first wins, an overlapping later one is drawn as an outline only.
  const taken = new Set();
  const blocks = [];
  for (const g of groups) {
    const members = g.filter((n) => valueOf.has(n));
    if (members.length < 2 || members.some((n) => taken.has(n))) continue;
    members.forEach((n) => taken.add(n));
    blocks.push(members);
  }
  const rest = parts.filter((p) => p.rest);
  const units = [
    ...blocks.map((members) => ({ members: [...members].sort((a, b) => valueOf.get(b) - valueOf.get(a)), value: members.reduce((s, n) => s + valueOf.get(n), 0) })),
    ...parts.filter((p) => !taken.has(p.name) && !p.rest).map((p) => ({ members: [p.name], value: p.value })),
  ].sort((a, b) => b.value - a.value);
  // The remainder is laid last: it is what the frame had no room to name, not a part of the argument.
  units.push(...rest.map((p) => ({ members: [p.name], value: p.value })));

  if (variant === "treemap") {
    const rects = squarify(units.map((u) => u.value), box);
    units.forEach((u, i) => {
      const r = rects[i];
      if (u.members.length === 1) shapes.set(u.members[0], { kind: "rect", ...r });
      else squarify(u.members.map((n) => valueOf.get(n)), r).forEach((sub, j) => shapes.set(u.members[j], { kind: "rect", ...sub, group: true }));
    });
  } else if (variant === "pie-and-donut") {
    const r1 = Math.max(0, Math.min(box.w, box.h) / 2);
    const r0 = r1 * 0.58;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    let a = 0;
    for (const u of units)
      for (const n of u.members) {
        const span = total > 0 ? (valueOf.get(n) / total) * Math.PI * 2 : 0;
        shapes.set(n, { kind: "arc", cx, cy, r0, r1, a0: a, a1: a + span });
        a += span;
      }
  } else {
    // Marimekko: columns in the rows' own order (the remainder column last), widths ∝ the column's total; inside a
    // column the segments stack from the baseline in the one segment order (first appearance), heights ∝ the
    // segment's share of its column. A cell's AREA is then its value at one area per unit on the whole plate.
    const columns = [...new Set(parts.filter((p) => !p.rest).map((p) => p.key)), ...new Set(rest.map((p) => p.key))];
    const series = [...new Set(parts.map((p) => p.series))];
    const gap = columns.length > 1 ? Math.min(3, (box.w * 0.04) / (columns.length - 1)) : 0;
    const usable = box.w - gap * (columns.length - 1);
    let x = box.x;
    for (const k of columns) {
      const cells = parts.filter((p) => p.key === k);
      const colTotal = sumOf(cells);
      const w = total > 0 ? (colTotal / total) * usable : 0;
      let y = box.y + box.h;
      for (const s of series) {
        const cell = cells.find((c) => c.series === s);
        if (!cell) continue;
        const h = colTotal > 0 ? (cell.value / colTotal) * box.h : 0;
        y -= h;
        shapes.set(cell.name, { kind: "rect", x, y, w, h, column: k });
      }
      x += w + gap;
    }
  }
  return shapes;
}

/** A shape's area in px² (a rect) or its angle in radians (an arc): the quantity that must stay ∝ the value. */
export const measureOf = (s) => (s.kind === "arc" ? s.a1 - s.a0 : s.w * s.h);

/** Where a word, ring or leader attaches: a rect's centre (or its top-left inset), an arc's mid-angle on its rim. */
export function anchorOf(s) {
  if (!s) return null;
  if (s.kind === "arc") {
    const mid = (s.a0 + s.a1) / 2;
    const at = (r) => ({ x: s.cx + r * Math.sin(mid), y: s.cy - r * Math.cos(mid) });
    return { ...at((s.r0 + s.r1) / 2), outer: at(s.r1), angle: mid, bbox: null };
  }
  return { x: s.x + s.w / 2, y: s.y + s.h / 2, outer: { x: s.x + s.w, y: s.y }, bbox: { x: s.x, y: s.y, w: s.w, h: s.h } };
}

/**
 * The compare gesture's mark: a copy of `value` laid against the part `onto`, with the area (rect) or angle (arc)
 * per unit of the plate, so the copy is the compared quantity at the subject's own scale (no-move-cell-conserving,
 * no-change-arc-angle). A treemap copy keeps the subject's aspect from its top-left corner, held inside the box; a
 * marimekko copy keeps the subject's width from its baseline; an arc copy runs on an inner track from the subject's
 * start angle.
 */
export function copyShape({ variant, shapes, onto, value, ontoValue, box }) {
  const s = shapes.get(onto);
  if (!s || !(ontoValue > 0)) return null;
  const k = value / ontoValue;
  if (s.kind === "arc") {
    const track = (s.r1 - s.r0) * 0.32;
    return { kind: "arc", cx: s.cx, cy: s.cy, r1: s.r0 - 4, r0: Math.max(0, s.r0 - 4 - track), a0: s.a0, a1: s.a0 + (s.a1 - s.a0) * k };
  }
  const area = s.w * s.h * k;
  if (variant === "marimekko-mosaic-plot") {
    const h = s.w > 0 ? area / s.w : 0;
    return { kind: "rect", x: s.x, y: s.y + s.h - h, w: s.w, h };
  }
  let w = s.w * Math.sqrt(k);
  let h = s.h * Math.sqrt(k);
  if (w > box.w) [w, h] = [box.w, area / box.w];
  if (h > box.h) [h, w] = [box.h, area / box.h];
  const x = Math.min(Math.max(s.x, box.x), box.x + box.w - w);
  const y = Math.min(Math.max(s.y, box.y), box.y + box.h - h);
  return { kind: "rect", x, y, w, h };
}

/** SVG path of an annular sector (or a full ring when it spans the whole turn). */
export function arcPath(s) {
  const span = Math.min(s.a1 - s.a0, Math.PI * 2 - 1e-4);
  if (!(span > 0)) return "";
  const pt = (r, a) => [s.cx + r * Math.sin(a), s.cy - r * Math.cos(a)];
  const a1 = s.a0 + span;
  const large = span > Math.PI ? 1 : 0;
  const [x0, y0] = pt(s.r1, s.a0);
  const [x1, y1] = pt(s.r1, a1);
  const [x2, y2] = pt(s.r0, a1);
  const [x3, y3] = pt(s.r0, s.a0);
  const f = (n) => n.toFixed(2);
  return `M ${f(x0)} ${f(y0)} A ${f(s.r1)} ${f(s.r1)} 0 ${large} 1 ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} A ${f(s.r0)} ${f(s.r0)} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`;
}

/**
 * The family adapter over one frame (GRAMMAR §4.1, §4.2 F6): cell, share, whole, relayout, remainder,
 * moveConserving, anchor, derive, invariants.
 */
export function createPart({ variant, marks, box, gestures = /** @type {any[]} */ ([]), capacity = undefined }) {
  const { parts, rest } = selectParts({ variant, marks, gestures, capacity });
  const whole = sumOf(marks);
  const valueOf = new Map(parts.map((p) => [p.name, p.value]));
  const layout = (groups = []) => layoutPart({ variant, parts, box, groups });
  const shapes = layout();
  return {
    family: FAMILY,
    variant,
    parts,
    rest,
    whole,
    cell: (id, at = shapes) => at.get(id),
    share: (id) => (valueOf.get(id) ?? 0) / whole,
    relayout: (subset) => layout([subset]),
    remainder: () => rest,
    moveConserving: (id, value, at = shapes) => copyShape({ variant, shapes: at, onto: id, value, ontoValue: valueOf.get(id), box }),
    anchor: (id, at = shapes) => anchorOf(at.get(id)),
    derive(op, ids) {
      const v = ids.map((id) => valueOf.get(id) ?? marks.find((m) => m.name === id)?.value ?? 0);
      if (op === "sum") return v.reduce((s, x) => s + x, 0);
      if (op === "share") return v.reduce((s, x) => s + x, 0) / whole;
      if (op === "diff") return v[0] - v[1];
      if (op === "ratio") return v[0] / v[1];
      if (op === "count") return ids.length;
      if (op === "rank") return [...marks].sort((a, b) => b.value - a.value).findIndex((m) => m.name === ids[0]) + 1;
      throw new Error(`no ${op} on the part-to-whole family`);
    },
    /** Area or angle conserved: in every layout each drawn part's measure is its value at ONE measure per unit. */
    invariants(at = shapes) {
      const per = [...at].map(([n, s]) => ({ n, k: valueOf.get(n) > 0 ? measureOf(s) / valueOf.get(n) : null })).filter((x) => x.k !== null);
      const k0 = per[0]?.k ?? 0;
      const off = per.find((x) => Math.abs(x.k - k0) > Math.max(1e-6, k0 * 1e-3));
      if (off) throw new Error(`${off.n} is drawn at a different area per unit than ${per[0].n} (no-move-cell-conserving)`);
    },
  };
}

// ── the core, with the family's own figures and refusals ─────────────────────────────────────────

const pct = (part, of) => (of > 0 ? (part / of) * 100 : NaN);

/** The shares a part-to-whole note may state for its marks: of the whole, and (marimekko) of the column, the
 *  column's and the segment's own shares. Fed to the core as row facts, so a stated "12,3 %" is a share it draws. */
export function shareFacts(variant, marks) {
  const whole = sumOf(marks);
  const facts = {};
  const byKey = new Map();
  const bySeries = new Map();
  for (const m of marks) {
    if (m.key !== undefined) byKey.set(m.key, (byKey.get(m.key) ?? 0) + m.value);
    if (m.series !== undefined) bySeries.set(m.series, (bySeries.get(m.series) ?? 0) + m.value);
  }
  for (const m of marks) {
    const own = [pct(m.value, whole)];
    if (variant === "marimekko-mosaic-plot") own.push(pct(m.value, byKey.get(m.key)), pct(byKey.get(m.key), whole), pct(m.value, bySeries.get(m.series)), pct(bySeries.get(m.series), whole), byKey.get(m.key), bySeries.get(m.series));
    facts[m.name] = own.filter(Number.isFinite);
  }
  return facts;
}

/**
 * The family's hooks for validateGestures.
 *   figures: a single part's share of the whole; a whole column's or segment's total and share (marimekko).
 *   refuse:  a treemap's accent never goes on its largest part (thread ≠ max: the colour would read as a highlight on
 *            the maximum, which the area already says) — fixed to a `name`, which rings it; a compare against a set
 *            that contains its own subject (the subject would be laid against itself).
 */
export function partHooks(variant, marks) {
  const whole = sumOf(marks);
  const largest = [...marks].sort((a, b) => b.value - a.value)[0]?.name;
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  return {
    figures(g, ctx) {
      const own = ctx.marks;
      const out = [];
      if (own.length === 1) out.push(pct(valueOf.get(own[0]), whole));
      // A set's sum and share of the whole: what makes a highlight of "the ten tipped countries" serve a takeaway
      // that states their 14 %. Its share is written by a bracket (refuse, below), never in this gesture's note.
      if (own.length > 1) {
        const s = own.reduce((t, n) => t + valueOf.get(n), 0);
        out.push(s, pct(s, whole));
      }
      if (variant === "marimekko-mosaic-plot" && own.length > 1) {
        const of = (field) => {
          const v = marks.find((m) => m.name === own[0])?.[field];
          const all = marks.filter((m) => m[field] === v).map((m) => m.name);
          return all.length === own.length && all.every((n) => own.includes(n)) ? all : null;
        };
        const set = of("key") ?? of("series");
        if (set) {
          const s = set.reduce((t, n) => t + valueOf.get(n), 0);
          out.push(s, pct(s, whole));
        }
      }
      return out;
    },
    refuse(g, ctx) {
      // A set's share stated on a gesture that prints no share: the core admits percents a gesture draws, and only a
      // bracket draws a set's share. The note goes (the fix always converges); the refusal says where it belongs.
      if (["highlight", "filter", "count"].includes(g.do) && ctx.marks.length > 1 && g.note !== undefined) {
        const s = pct(ctx.marks.reduce((t, n) => t + valueOf.get(n), 0), whole);
        const said = figuresIn(g.note).find((n) => n.percent && Math.abs(n.value - s) <= 0.5 * 10 ** -n.decimals + 1e-9);
        if (said)
          throw new GestureRefusal(
            `gestures[${ctx.index}].note`,
            `states ${said.raw} %, the share these ${ctx.marks.length} parts hold together, and a ${g.do} prints no share: drop the note here and write it on a bracket of the same parts ({ do: "bracket", marks: [...], of: "whole", note: "${g.note}" })`,
            { set: { index: ctx.index, field: "note", value: undefined } },
          );
      }
      if (variant === "treemap" && g.do === "highlight" && ctx.marks.includes(largest)) {
        const others = ctx.marks.filter((m) => m !== largest);
        const rest = Object.fromEntries(Object.entries(g).filter(([k]) => k !== "mark" && k !== "marks"));
        throw new GestureRefusal(
          `gestures[${ctx.index}]`,
          `${largest} is the largest part, and a treemap's accent marks a thread, never the maximum (the area already says it is largest): ring it with name instead${others.length ? `, or highlight ${others.join(", ")} alone` : ""}`,
          { set: { index: ctx.index, value: others.length ? { ...rest, marks: others } : { ...rest, do: "name", mark: largest } } },
        );
      }
      if (g.do === "compare") {
        const against = ctx.marks.length > 1 ? ctx.marks.slice(1) : ctx.of;
        if (against.includes(ctx.marks[0]))
          throw new GestureRefusal(
            `gestures[${ctx.index}]`,
            `compares ${ctx.marks[0]} with a set that holds ${ctx.marks[0]} itself, so the part would be laid against itself: measure it against the whole with bracket (of: "whole")`,
            { set: { index: ctx.index, value: { do: "bracket", mark: ctx.marks[0], of: "whole" } } },
          );
      }
    },
  };
}

/** Names a gesture writes, loosely resolved (a key, a series, a list): only to keep a bracket's set together. */
function looseNames(g, marks) {
  const named = (x) => {
    const f = fold(x);
    const exact = marks.filter((m) => fold(m.name) === f);
    if (exact.length) return exact.map((m) => m.name);
    return marks.filter((m) => (m.key !== undefined && fold(m.key) === f) || (m.series !== undefined && fold(m.series) === f)).map((m) => m.name);
  };
  return [g.mark, g.marks].flat().filter((x) => typeof x === "string").flatMap(named);
}

/**
 * The marks in the order the core reads a bracket's contiguity in: largest first (a marimekko keeps its rows'
 * order), each bracket's members brought together where its largest member sits. A part-to-whole's layout
 * keeps a set together by itself (a treemap block, adjacent arcs, a marimekko outline), so a set is never "scattered".
 */
export function orderForBrackets(variant, marks, gestures) {
  let order = variant === "marimekko-mosaic-plot" ? [...marks] : [...marks].sort((a, b) => b.value - a.value);
  for (const g of Array.isArray(gestures) ? gestures : []) {
    if (g?.do !== "bracket") continue;
    const names = new Set(looseNames(g, marks));
    if (names.size < 2) continue;
    const at = order.findIndex((m) => names.has(m.name));
    const members = order.filter((m) => names.has(m.name));
    const others = order.filter((m) => !names.has(m.name));
    order = [...others.slice(0, at), ...members, ...others.slice(at)];
  }
  return order;
}

/** A part-to-whole bracket always measures its parts against the drawn whole: one with no `of` is given `of: "whole"`. */
export function normalizeGestures(gestures) {
  return Array.isArray(gestures) ? gestures.map((g) => (g && g.do === "bracket" && g.of === undefined ? { ...g, of: "whole" } : g)) : gestures;
}

/**
 * The core on this family: marks in bracket order, the share facts, the family's hooks. With `repair`, each
 * refusal's fix is applied to the model's own list until it is accepted; every repair is returned.
 * Returns (gestures (the list accepted), valid, entities, whole, repairs )
 */
/**
 * A marimekko's claim names columns and segments ("Coal", "Germany"), never a cell ("Germany · Coal"), and the core
 * reads a claim's entities from mark names only. So the claim is given, as entity, the cells where a named column
 * meets a named segment (else the cells of what is named), and as versus every cell of a named column or segment:
 * the subject is the first of the first set, and a gesture on any coal cell serves a takeaway about coal.
 */
export function marimekkoClaim(claim, marks) {
  const text = ` ${fold([claim?.takeaway, claim?.subject, claim?.comparison, claim?.entity, claim?.versus].filter(Boolean).join(" ")).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  const said = (x) => text.includes(` ${fold(x).replace(/[^\p{L}\p{N}]+/gu, " ")} `);
  const keys = new Set(marks.map((m) => m.key).filter(said));
  const series = new Set(marks.map((m) => m.series).filter(said));
  const both = marks.filter((m) => keys.has(m.key) && series.has(m.series));
  const either = marks.filter((m) => keys.has(m.key) || series.has(m.series));
  const narrow = both.length ? both : series.size ? marks.filter((m) => series.has(m.series)) : either;
  if (!either.length) return claim;
  // The core reads a claim's named columns and segments itself (every cell of a named holder serves it); only the
  // subject cell is given, so the accent falls where a named column meets a named segment.
  return { ...claim, entity: [claim?.entity, ...narrow.map((m) => m.name)].filter(Boolean).join(", ") };
}

export function validatePart({ variant, gestures, marks, claim: given, format, repair = false, steps = 12, extra = undefined }) {
  const claim = variant === "marimekko-mosaic-plot" ? marimekkoClaim(given, marks) : given;
  const facts = { ...(claim?.facts ?? {}) };
  for (const [name, shares] of Object.entries(shareFacts(variant, marks))) facts[name] = [...(facts[name] ?? []), ...shares];
  const hooks = partHooks(variant, marks);
  let list = normalizeGestures(gestures);
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const rows = orderForBrackets(variant, marks, list);
      const { gestures: valid, entities, whole } = validateGestures({ gestures: list, rows, family: FAMILY, format, claim: { ...claim, facts }, hooks });
      const more = extra?.(valid, entities);
      return { gestures: list, valid, entities, whole, repairs, ...(more ?? {}) };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix, message: error.message });
      list = applyFix(list, error.fix);
    }
  }
}

// ── the picture after a run of gestures ──────────────────────────────────────────────────────────

const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/**
 * The picture after gestures[0..upto) (format-neutral; each scheduler decides which run each state shows):
 *   accent  parts in the accent (the subject or a highlight's set; never a treemap's largest part — it is ringed)
 *   rings   parts ringed (name, a highlight off the subject, a treemap's largest)
 *   stepBack parts a filter stepped back (cleared by a later pull-back)
 *   notes   [{ index, do, marks, text, value? }] — `value` marks a note the gesture did not write (its figure)
 *   brackets [{ index, members, sum, share, column, note }] — share is of the whole, or of `of` when given
 *   copies  [{ index, onto, of, value }] — a compare's copy, laid against `onto` with its area or angle kept
 *   count   { index, marks, value, text } | null — the figure a count ends on
 *   reveal  whether a reveal drew the parts in (its end state: every part drawn)
 * `oneNote`: a still plate draws every note at once, so a second note on one part is refused (the later one).
 * Parts are named as the marks are; a mark folded into the remainder is never named by a gesture (selectParts keeps
 * every named part drawn).
 */
export function foldPart({ variant, gestures, marks, upto = gestures.length, format = (v) => String(v), oneNote = false }) {
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const whole = sumOf(marks);
  const all = marks.map((m) => m.name);
  const largest = [...marks].sort((a, b) => b.value - a.value)[0]?.name;
  const accentable = (n) => !(variant === "treemap" && n === largest);
  const pic = /** @type {any} */ ({ accent: [], rings: [], stepBack: [], notes: [], brackets: [], copies: [], count: null, reveal: false });
  const add = (list, n) => {
    if (!list.includes(n)) list.push(n);
  };
  const implicit = implicitAccent(gestures);
  if (valueOf.has(implicit)) add(accentable(implicit) ? pic.accent : pic.rings, implicit);
  const noted = new Set();
  const note = (i, g, on, text, value = false) => {
    if (text === undefined) return;
    if (oneNote && on.length === 1) {
      if (noted.has(on[0]))
        throw new GestureRefusal(`gestures[${i}].note`, `${on[0]} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
          set: { index: i, field: "note", value: undefined },
        });
      noted.add(on[0]);
    }
    pic.notes.push({ index: i, do: g.do, marks: on, text: String(text), value });
  };
  const sum = (list) => list.reduce((s, n) => s + (valueOf.get(n) ?? 0), 0);

  gestures.slice(0, upto).forEach((g, i) => {
    const { own, of } = splitMarks(g);
    const text = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    switch (g.do) {
      case "highlight": {
        // The subject's set carries the accent; a highlight that leaves the subject out rings its parts.
        const accent = g.subject === undefined || own.includes(g.subject);
        for (const m of own) add(accent && accentable(m) ? pic.accent : pic.rings, m);
        note(i, g, own, text);
        break;
      }
      case "name":
        add(pic.rings, own[0]);
        note(i, g, own, text ?? `${own[0]} ${format(valueOf.get(own[0]))}`, text === undefined);
        break;
      case "annotate":
        note(i, g, own, text ?? format(valueOf.get(own[0])), text === undefined);
        break;
      case "filter":
        pic.stepBack = all.filter((n) => !own.includes(n));
        note(i, g, own, text);
        break;
      case "bracket": {
        const ofWhole = g.of === "whole";
        const s = sum(own);
        const against = ofWhole ? whole : s + sum(of);
        const keys = new Set(own.map((m) => marks.find((x) => x.name === m)?.key));
        const column = variant === "marimekko-mosaic-plot" && keys.size === 1 && marks.filter((m) => m.key === [...keys][0]).every((m) => own.includes(m.name)) ? [...keys][0] : null;
        pic.brackets.push({ index: i, members: own, of: ofWhole ? "whole" : of, sum: s, share: against > 0 ? s / against : 0, column, note: text });
        break;
      }
      case "compare": {
        const subject = own[0];
        const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? all.filter((n) => n !== subject) : of;
        const value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
        pic.copies.push({ index: i, onto: subject, of: against, value });
        note(i, g, [subject], text);
        break;
      }
      case "count": {
        const on = own.length ? own : all;
        pic.count = { index: i, marks: own, value: sum(on), n: on.length, text: text ?? format(sum(on)), written: text !== undefined };
        break;
      }
      case "pull-back":
        // The whole returns; what was shown stays marked.
        pic.stepBack = [];
        if (text) note(i, g, [], text);
        break;
      case "reveal":
        pic.reveal = true;
        if (text) note(i, g, [], text);
        break;
    }
  });
  pic.stepBack = pic.stepBack.filter((n) => !pic.accent.includes(n));
  return pic;
}

/** The groups a layout keeps together: every bracket's members, in story order. */
export const groupsOf = (pic) => pic.brackets.map((b) => b.members);

/** The marks every gesture names (selectParts keeps them drawn). */
export const namedMarks = (valid) => [...new Set(valid.flatMap((g) => g.marks ?? []))];

/** A share in the format's own decimal mark, at one decimal: "12,3 %" when `format` writes "1,5". */
export function shareText(format, share) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return `${(share * 100).toFixed(1).replace(".", comma ? "," : ".")} %`;
}

/** A remainder part's printed name: the beat's restLabel with the count it folds ("31 autres pays"). */
export const restName = (restLabel, rest) => (rest.count > 0 ? `${rest.count} ${restLabel}` : restLabel);
