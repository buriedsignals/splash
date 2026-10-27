// The scrolly scheduler of the Part-to-whole family (craft/gestures/GRAMMAR.md §5, §6): one card per composed gesture,
// the reader's scroll interpolating continuously from one card's state to the next, then a closing card carrying the
// limits, on which the whole returns (a filter released, what was shown still marked).
//
// A state is a flat record of finite numbers (`assertStates` in the scrolly skill's reveal.mjs): per drawn part i its
// accent `a<i>`, ring `r<i>` and step-back `b<i>`; per gesture its own progress `g<k>` (a bracket's outline drawing in,
// a compare's copy growing at the plate's own area or angle per unit, a count climbing); `ink` (a reveal: parts appear
// largest first); `note` (which card's note the header reads). The layout never moves between cards: one whole, one
// area (or angle) per unit, every bracket's set laid together from the first card (no-move-cell-conserving).
//
// Each card's prose is its gesture's `card`, written by the model in beat.mjs, checked by the Length scrolly's
// `checkCards` (every number one the parts give, the figure the card's picture shows stated, a ratio word the ratio
// the picture draws), fed this family's figures (shares of the whole). A card refusal names `gestures[i].card` and
// carries a fix, so SPLASH_GESTURE_REPAIR repairs it like any other.
//
// The drive (`applyPartState`) is ONE self-contained function — no import, no reference to this module's scope —
// emitted as source and inlined by the scrolly skill's renderScrolly. Browser-safe: no Node module.
import { checkCards } from "./gesture-scrolly.mjs";
import { foldPart, groupsOf, REST, selectParts, shareFacts } from "./gesture-family-part.mjs";

/** The name the scrolly skill calls to paint a state. */
export const APPLY = "applyPartState";

const prefixSums = (values) => {
  let s = 0;
  return values.map((v) => (s += v));
};

/**
 * @param variant  treemap | marimekko-mosaic-plot | pie-and-donut
 * @param gestures validatePart's `valid`
 * @param marks    every mark (the whole)
 * Returns        (parts, rest, groups, states, plan, whole ) — one state per gesture card, then the closing card's
 */
export function schedulePartScrolly({ variant, gestures, marks, capacity = undefined }) {
  const { parts, rest } = selectParts({ variant, marks, gestures, capacity });
  const at = new Map(parts.map((p, i) => [p.name, i]));
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const whole = marks.reduce((s, m) => s + m.value, 0);
  const sum = (list) => list.reduce((s, n) => s + (valueOf.get(n) ?? 0), 0);
  const groups = groupsOf(foldPart({ variant, gestures, marks }));

  const picture = (upto) => foldPart({ variant, gestures, marks, upto });
  const encode = (pic, extra) => {
    const s = { ...extra };
    parts.forEach((p, i) => {
      s[`a${i}`] = pic.accent.includes(p.name) ? 1 : 0;
      s[`r${i}`] = pic.rings.includes(p.name) ? 1 : 0;
      s[`b${i}`] = pic.stepBack.includes(p.name) || (p.rest && pic.stepBack.length) ? 1 : 0;
    });
    return s;
  };
  const hasReveal = gestures.some((g) => g.do === "reveal");
  const base = { ink: hasReveal ? 0 : 1, note: 0 };
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const states = [];
  const plan = [];
  let progress = base;
  gestures.forEach((g, k) => {
    const own = g.marks.slice(0, g.marks.length - (Array.isArray(g.of) ? g.of.length : 0));
    const of = g.marks.slice(own.length);
    progress = { ...progress, [`g${k}`]: 1, note: k, ...(g.do === "reveal" ? { ink: 1 } : {}) };
    const item = { k, do: g.do, own, of, note: g.note === undefined ? undefined : String(g.note), shown: [] };
    switch (g.do) {
      case "highlight":
      case "name":
      case "annotate":
      case "filter":
        item.shown = own.length === 1 ? [valueOf.get(own[0]), (valueOf.get(own[0]) / whole) * 100] : [sum(own), (sum(own) / whole) * 100];
        break;
      case "bracket": {
        const s = sum(own);
        const against = g.of === "whole" ? whole : s + sum(of);
        item.members = own;
        item.whole = g.of === "whole";
        item.steps = prefixSums(own.map((n) => valueOf.get(n)));
        item.shown = [s, (s / against) * 100];
        item.ratio = s / against;
        break;
      }
      case "compare": {
        const subject = own[0];
        item.against = own.length > 1 ? own.slice(1) : g.of === "whole" ? marks.map((m) => m.name).filter((n) => n !== subject) : of;
        item.value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
        const a = valueOf.get(subject);
        item.ratio = a / item.value;
        item.shown = [a, item.value, item.ratio, a - item.value, item.value - a, (a / whole) * 100];
        break;
      }
      case "count": {
        const counted = own.length ? own : marks.map((m) => m.name);
        item.steps = prefixSums([...counted].sort((x, y) => valueOf.get(y) - valueOf.get(x)).map((n) => valueOf.get(n)));
        item.shown = [item.steps.at(-1), counted.length];
        break;
      }
      default:
        break;
    }
    plan.push(item);
    states.push(encode(picture(k + 1), progress));
  });
  // THE CLOSING CARD: the whole, every part back, what was shown still marked.
  const closing = encode({ ...picture(gestures.length), stepBack: [] }, { ...progress, ink: 1, note: gestures.length });
  states.push(closing);
  return { parts, rest, groups, states, plan, whole, at };
}

/**
 * The cards' words, checked by the Length scrolly's rules on this family's figures: the drawn whole is every mark,
 * a part's share of it (and a marimekko cell's share of its column) is a figure a card may state.
 */
export function checkPartCards({ variant, gestures, plan, marks, format = (v) => String(v), facts = {} }) {
  const shares = shareFacts(variant, marks);
  const all = { ...facts };
  for (const [n, s] of Object.entries(shares)) all[n] = [...(all[n] ?? []), ...s];
  return checkCards({ gestures, plan, rows: marks, rest: { count: 0, sum: 0 }, drawn: marks, format, facts: all });
}

/** The data the drive reads, embedded in the page: parts by index, the bracket groups, the plan. */
export function driveData({ variant, parts, groups, plan, format, restText, colours = undefined }) {
  const at = new Map(parts.map((p, i) => [p.name, i]));
  const idx = (list) => (list ?? []).map((n) => at.get(n)).filter((i) => i !== undefined);
  const rank = [...parts.keys()].sort((a, b) => parts[b].value - parts[a].value);
  const named = new Set(plan.flatMap((p) => [...(p.own ?? []), ...(p.of ?? [])]));
  const columns = variant === "marimekko-mosaic-plot" ? [...new Set(parts.map((p) => p.key))] : [];
  const series = variant === "marimekko-mosaic-plot" ? [...new Set(parts.map((p) => p.series))] : [];
  return {
    variant,
    parts: parts.map((p, i) => ({
      v: Math.round(p.value * 1e6) / 1e6,
      rank: rank.indexOf(i),
      rest: p.rest ? 1 : 0,
      named: named.has(p.name) ? 1 : 0,
      col: variant === "marimekko-mosaic-plot" ? columns.indexOf(p.key) : -1,
      ser: variant === "marimekko-mosaic-plot" ? series.indexOf(p.series) : -1,
    })),
    columns: columns.map((k) => ({ rest: k === REST ? 1 : 0 })),
    series: series.length,
    groups: groups.map(idx).filter((g) => g.length > 1),
    plan: plan.map((p) => ({
      k: p.k,
      do: p.do,
      own: idx(p.own),
      ...(p.do === "bracket" ? { members: idx(p.members) } : {}),
      ...(p.do === "compare" ? { onto: at.get(p.own[0]), value: p.value } : {}),
      ...(p.do === "count" || p.do === "bracket" ? { steps: (p.steps ?? []).map(format) } : {}),
    })),
    restText,
    colours,
  };
}

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyPartState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it, because its source is inlined into the
 * page alone. The layout is computed in the reader's pixels on a resize only (it never moves between cards): a
 * squarified treemap with each bracket's set laid as one block, a marimekko's columns, a donut's arcs; then each paint
 * sets every part's emphasis, each gesture's outline or copy at its progress, and the header's note.
 */
export function applyPartState(root, state, context) {
  const carrier = root.querySelector("[data-gpart]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const TAU = Math.PI * 2;
  const rectD = (r) => (r && r.w > 0 && r.h > 0 ? `M${r.x},${r.y}h${r.w}v${r.h}h${-r.w}Z` : "");
  const arcD = (s) => {
    const span = Math.min(s.a1 - s.a0, TAU - 1e-4);
    if (!(span > 0)) return "";
    const pt = (r, a) => `${s.cx + r * Math.sin(a)},${s.cy - r * Math.cos(a)}`;
    const large = span > Math.PI ? 1 : 0;
    const a1 = s.a0 + span;
    return `M${pt(s.r1, s.a0)}A${s.r1},${s.r1} 0 ${large} 1 ${pt(s.r1, a1)}L${pt(s.r0, a1)}A${s.r0},${s.r0} 0 ${large} 0 ${pt(s.r0, s.a0)}Z`;
  };
  const shapeD = (s) => (!s ? "" : s.kind === "arc" ? arcD(s) : rectD(s));
  const squarify = (values, box) => {
    const total = values.reduce((a, b) => a + b, 0);
    const out = values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }));
    if (!(total > 0) || box.w <= 0 || box.h <= 0) return out;
    const scale = (box.w * box.h) / total;
    const items = values.map((v, k) => [v * scale, k]).filter(([a]) => a > 0);
    let free = { ...box };
    const worst = (row, side) => {
      const s = row.reduce((a, b) => a + b[0], 0);
      const max = Math.max(...row.map((r) => r[0]));
      const min = Math.min(...row.map((r) => r[0]));
      return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
    };
    const lay = (row) => {
      const s = row.reduce((a, b) => a + b[0], 0);
      const horizontal = free.w >= free.h;
      const thick = s / (horizontal ? free.h : free.w);
      let cursor = horizontal ? free.y : free.x;
      for (const [a, k] of row) {
        const len = thick > 0 ? a / thick : 0;
        out[k] = horizontal ? { x: free.x, y: cursor, w: thick, h: len } : { x: cursor, y: free.y, w: len, h: thick };
        cursor += len;
      }
      free = horizontal ? { x: free.x + thick, y: free.y, w: free.w - thick, h: free.h } : { x: free.x, y: free.y + thick, w: free.w, h: free.h - thick };
    };
    let row = [];
    let i = 0;
    while (i < items.length) {
      const side = Math.min(free.w, free.h);
      if (!row.length || worst([...row, items[i]], side) <= worst(row, side)) row.push(items[i++]);
      else {
        lay(row);
        row = [];
      }
    }
    if (row.length) lay(row);
    return out;
  };

  if (context.resized || !root.__gpart) {
    const data = root.__gpartData || (root.__gpartData = JSON.parse(carrier.getAttribute("data-gpart")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const qa = (sel) => Array.from(stage.querySelectorAll(sel));
    const SW = stage.clientWidth;
    const SH = stage.clientHeight;
    if (!(SW > 0 && SH > 0)) return;
    q('[data-part="field"]').setAttribute("viewBox", `0 0 ${SW} ${SH}`);
    const parts = data.parts;
    const n = parts.length;
    const total = parts.reduce((s, p) => s + p.v, 0);
    const labelV = parts.map((_, i) => q(`[data-v="${i}"]`));
    const labelN = parts.map((_, i) => q(`[data-n="${i}"]`));
    const shapes = [];
    let box;
    if (data.variant === "pie-and-donut") {
      // The ring is centred; its radius leaves room for the widest label on either side.
      const widest = Math.max(0, ...parts.map((_, i) => Math.max(labelV[i] ? labelV[i].getBoundingClientRect().width : 0, labelN[i] ? labelN[i].getBoundingClientRect().width : 0)));
      const r1 = Math.max(30, Math.min(SH / 2 - 6, (SW - 2 * (widest + 24)) / 2));
      const cx = SW / 2;
      const cy = SH / 2;
      box = { x: cx - r1, y: cy - r1, w: 2 * r1, h: 2 * r1 };
      const order = [];
      const taken = new Set();
      const units = [];
      for (const g of data.groups) {
        if (g.some((i) => taken.has(i))) continue;
        g.forEach((i) => taken.add(i));
        units.push({ members: [...g].sort((a, b) => parts[b].v - parts[a].v), v: g.reduce((s, i) => s + parts[i].v, 0) });
      }
      parts.forEach((p, i) => {
        if (!taken.has(i) && !p.rest) units.push({ members: [i], v: p.v });
      });
      units.sort((a, b) => b.v - a.v);
      parts.forEach((p, i) => p.rest && units.push({ members: [i], v: p.v }));
      units.forEach((u) => order.push(...u.members));
      let a = 0;
      for (const i of order) {
        const span = total > 0 ? (parts[i].v / total) * TAU : 0;
        shapes[i] = { kind: "arc", cx, cy, r1, r0: r1 * 0.58, a0: a, a1: a + span };
        a += span;
      }
    } else if (data.variant === "treemap") {
      box = { x: 0, y: 0, w: SW, h: SH };
      const taken = new Set();
      const units = [];
      for (const g of data.groups) {
        if (g.some((i) => taken.has(i))) continue;
        g.forEach((i) => taken.add(i));
        units.push({ members: [...g].sort((a, b) => parts[b].v - parts[a].v), v: g.reduce((s, i) => s + parts[i].v, 0) });
      }
      parts.forEach((p, i) => {
        if (!taken.has(i) && !p.rest) units.push({ members: [i], v: p.v });
      });
      units.sort((a, b) => b.v - a.v);
      parts.forEach((p, i) => p.rest && units.push({ members: [i], v: p.v }));
      const rects = squarify(units.map((u) => u.v), box);
      units.forEach((u, k) => {
        if (u.members.length === 1) shapes[u.members[0]] = { kind: "rect", ...rects[k] };
        else {
          const sub = squarify(u.members.map((i) => parts[i].v), rects[k]);
          u.members.forEach((i, j) => (shapes[i] = { kind: "rect", ...sub[j], group: 1 }));
        }
      });
    } else {
      // Marimekko: column labels under the plot, a key of the segments at the right of the last column.
      const keyW = Math.max(0, ...qa("[data-key]").map((el) => el.getBoundingClientRect().width)) + 18;
      const colH = Math.max(0, ...qa("[data-colname]").map((el) => el.getBoundingClientRect().height)) * 2 + 8;
      box = { x: 0, y: 0, w: Math.max(40, SW - keyW), h: Math.max(40, SH - colH) };
      const cols = data.columns.length;
      const gap = cols > 1 ? Math.min(3, (box.w * 0.04) / (cols - 1)) : 0;
      const usable = box.w - gap * (cols - 1);
      let x = box.x;
      for (let c = 0; c < cols; c++) {
        const cells = parts.map((p, i) => [p, i]).filter(([p]) => p.col === c).sort((a, b) => a[0].ser - b[0].ser);
        const colTotal = cells.reduce((s, [p]) => s + p.v, 0);
        const w = total > 0 ? (colTotal / total) * usable : 0;
        let y = box.y + box.h;
        for (const [p, i] of cells) {
          const h = colTotal > 0 ? (p.v / colTotal) * box.h : 0;
          y -= h;
          shapes[i] = { kind: "rect", x, y, w, h, col: c };
        }
        x += w + gap;
      }
    }
    root.__gpart = {
      data,
      stage,
      shapes,
      box,
      base: parts.map((_, i) => q(`[data-p="${i}"]`)),
      accent: parts.map((_, i) => q(`[data-a="${i}"]`)),
      ring: parts.map((_, i) => q(`[data-r="${i}"]`)),
      labelV,
      labelN,
      plan: data.plan.map((p) => ({ ...p, outline: q(`[data-bk="${p.k}"]`), copy: q(`[data-cp="${p.k}"]`) })),
      notes: data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`)),
      colNames: qa("[data-colname]"),
      keys: qa("[data-key]"),
    };
    const c = root.__gpart;
    // Static geometry: every part's shapes, its ring, its labels (shown only where they fit, or outside a donut).
    parts.forEach((p, i) => {
      const s = shapes[i];
      const d = shapeD(s);
      c.base[i].setAttribute("d", d);
      c.accent[i].setAttribute("d", d);
      const ring = !s ? "" : s.kind === "arc" ? arcD({ ...s, r0: s.r0 - 3, r1: s.r1 + 3 }) : rectD({ x: s.x + 1.5, y: s.y + 1.5, w: s.w - 4, h: s.h - 4 });
      c.ring[i].setAttribute("d", ring);
    });
    const sides = { left: [], right: [] };
    parts.forEach((p, i) => {
      const s = shapes[i];
      const v = c.labelV[i];
      const nm = c.labelN[i];
      if (!v || !nm || !s) return;
      const vw = v.getBoundingClientRect().width;
      const vh = v.getBoundingClientRect().height;
      const nw = nm.getBoundingClientRect().width;
      const nh = nm.getBoundingClientRect().height;
      if (s.kind === "arc") {
        const span = (s.a1 - s.a0) * s.r1;
        const mid = (s.a0 + s.a1) / 2;
        const side = Math.sin(mid) >= 0 ? "right" : "left";
        if (span < 12 && !p.named) {
          v.style.opacity = "0";
          nm.style.opacity = "0";
          return;
        }
        sides[side].push({ i, y: s.cy - (s.r1 + 10) * Math.cos(mid), side, h: vh + nh, vh, s });
        return;
      }
      const inset = 4;
      const fitsV = vw <= s.w - inset * 2 && vh <= s.h - inset * 2;
      const fitsN = fitsV && nw <= s.w - inset * 2 && vh + nh <= s.h - inset * 2;
      Object.assign(v.style, { left: `${s.x + inset}px`, top: `${s.y + inset}px`, opacity: fitsV ? "1" : "0" });
      Object.assign(nm.style, { left: `${s.x + inset}px`, top: `${s.y + inset + vh}px`, opacity: fitsN ? "1" : "0" });
    });
    for (const side of ["left", "right"]) {
      const list = sides[side].sort((a, b) => a.y - b.y);
      let y = 0;
      for (const l of list) {
        l.y = Math.max(l.y - l.h / 2, y);
        y = l.y + l.h + 2;
      }
      let bottom = SH;
      for (let k = list.length - 1; k >= 0; k--) {
        list[k].y = Math.min(list[k].y, bottom - list[k].h);
        bottom = list[k].y - 2;
      }
      for (const l of list) {
        const x = l.s.cx + (side === "right" ? 1 : -1) * (l.s.r1 + 14);
        const tf = side === "right" ? "none" : "translateX(-100%)";
        const align = side === "right" ? "left" : "right";
        const mid = (l.s.a0 + l.s.a1) / 2;
        const leader = stage.querySelector(`[data-ld="${l.i}"]`);
        if (leader) leader.setAttribute("d", `M${l.s.cx + l.s.r1 * Math.sin(mid)},${l.s.cy - l.s.r1 * Math.cos(mid)}L${x + (side === "right" ? -4 : 4)},${l.y + l.vh / 2}`);
        Object.assign(c.labelV[l.i].style, { left: `${x}px`, top: `${l.y}px`, transform: tf, textAlign: align, opacity: "1" });
        Object.assign(c.labelN[l.i].style, { left: `${x}px`, top: `${l.y + l.vh}px`, transform: tf, textAlign: align, opacity: "1" });
      }
    }
    // Brackets: a treemap block's one outline, a marimekko's member cells, a donut's band over its arcs.
    for (const p of c.plan) {
      if (p.do === "bracket" && p.outline) {
        const list = p.members.map((i) => shapes[i]).filter(Boolean);
        let d = "";
        if (list.length && list[0].kind === "arc") {
          const a0 = Math.min(...list.map((s) => s.a0));
          const a1 = Math.max(...list.map((s) => s.a1));
          d = arcD({ ...list[0], a0, a1, r0: list[0].r1 + 5, r1: list[0].r1 + 9 });
        } else if (data.variant === "treemap" && list.length > 1) {
          const x0 = Math.min(...list.map((s) => s.x));
          const y0 = Math.min(...list.map((s) => s.y));
          const x1 = Math.max(...list.map((s) => s.x + s.w));
          const y1 = Math.max(...list.map((s) => s.y + s.h));
          d = rectD({ x: x0 + 1, y: y0 + 1, w: x1 - x0 - 3, h: y1 - y0 - 3 });
        } else d = list.map((s) => rectD({ x: s.x + 0.5, y: s.y + 0.5, w: s.w - 2, h: s.h - 2 })).join("");
        p.outline.setAttribute("d", d);
      }
    }
    // Marimekko furniture: column names under their columns (left out where they would overlap), the key.
    if (data.variant === "marimekko-mosaic-plot") {
      const placed = [];
      c.colNames.forEach((el) => {
        const col = Number(el.getAttribute("data-colname"));
        const cell = shapes.find((s) => s && s.col === col);
        if (!cell) return;
        const w = el.getBoundingClientRect().width;
        const clash = placed.some(([a, b]) => cell.x < b + 8 && a < cell.x + w + 8);
        Object.assign(el.style, { left: `${cell.x}px`, top: `${box.y + box.h + 4}px`, opacity: clash ? "0" : "1" });
        if (!clash) placed.push([cell.x, cell.x + w]);
      });
      const lastCol = data.columns.length - 1;
      const keyed = c.keys
        .map((el) => {
          const ser = Number(el.getAttribute("data-key"));
          const i = parts.findIndex((p) => p.col === lastCol && p.ser === ser);
          const s = shapes[i];
          return s ? { el, y: s.y + s.h / 2, h: el.getBoundingClientRect().height } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);
      let y = 0;
      for (const k of keyed) {
        k.y = Math.max(k.y - k.h / 2, y);
        y = k.y + k.h;
      }
      let bottom = box.h;
      for (let i = keyed.length - 1; i >= 0; i--) {
        keyed[i].y = Math.min(keyed[i].y, bottom - keyed[i].h);
        bottom = keyed[i].y;
      }
      for (const k of keyed) Object.assign(k.el.style, { left: `${box.x + box.w + 10}px`, top: `${k.y}px` });
    }
  }
  const c = root.__gpart;
  if (!c) return;
  const parts = c.data.parts;
  const n = parts.length;
  // Which parts are visible: all, or — once a reveal is composed — largest first as it plays.
  const shown = parts.map((p) => (c.data.plan.some((q) => q.do === "reveal") ? clamp(state.ink * n - p.rank) : 1));
  parts.forEach((p, i) => {
    const back = clamp(state[`b${i}`]);
    const alpha = shown[i] * (1 - 0.7 * back);
    c.base[i].style.opacity = String(alpha);
    c.accent[i].style.opacity = String(alpha * clamp(state[`a${i}`]));
    c.ring[i].style.opacity = String(shown[i] * clamp(state[`r${i}`]));
    const strong = state[`a${i}`] > 0.5;
    if (c.labelV[i]) {
      c.labelV[i].style.color = strong ? c.data.colours.onAccent : c.data.colours.ink;
      if (c.labelV[i].style.opacity !== "0") c.labelV[i].style.visibility = shown[i] > 0.5 ? "visible" : "hidden";
    }
    if (c.labelN[i]) {
      c.labelN[i].style.color = strong ? c.data.colours.onAccent : c.data.colours.muted;
      if (c.labelN[i].style.opacity !== "0") c.labelN[i].style.visibility = shown[i] > 0.5 ? "visible" : "hidden";
    }
  });
  if (c.data.variant === "pie-and-donut")
    parts.forEach((p, i) => {
      // Outside a donut a label sits on the ground: accent text would be the accent's own ink, kept ink.
      if (c.labelV[i]) c.labelV[i].style.color = state[`a${i}`] > 0.5 ? c.data.colours.accentInk : c.data.colours.ink;
      if (c.labelN[i]) c.labelN[i].style.color = c.data.colours.muted;
    });
  c.plan.forEach((p) => {
    const g = clamp(state[`g${p.k}`]);
    if (p.outline) p.outline.style.opacity = String(g);
    if (p.copy && p.do === "compare") {
      // The copy grows to the compared quantity at the plate's own measure per unit: area (rect) or angle (arc).
      const s = c.shapes[p.onto];
      const ontoV = parts[p.onto] ? parts[p.onto].v : 0;
      if (!s || !(ontoV > 0) || g <= 0) {
        p.copy.setAttribute("d", "");
        return;
      }
      const k = (p.value / ontoV) * g;
      let d = "";
      if (s.kind === "arc") d = arcD({ ...s, r1: s.r0 - 4, r0: Math.max(0, s.r0 - 4 - (s.r1 - s.r0) * 0.32), a1: s.a0 + (s.a1 - s.a0) * k });
      else if (c.data.variant === "marimekko-mosaic-plot") {
        const h = s.h * k;
        d = rectD({ x: s.x, y: s.y + s.h - h, w: s.w, h });
      } else {
        let w = s.w * Math.sqrt(k);
        let h = s.h * Math.sqrt(k);
        const area = w * h;
        if (w > c.box.w) [w, h] = [c.box.w, area / c.box.w];
        if (h > c.box.h) [h, w] = [c.box.h, area / c.box.h];
        d = rectD({ x: Math.min(Math.max(s.x, c.box.x), c.box.x + c.box.w - w), y: Math.min(Math.max(s.y, c.box.y), c.box.y + c.box.h - h), w, h });
      }
      p.copy.setAttribute("d", d);
      p.copy.style.opacity = "1";
    }
  });
  // The header reads the note of the card being read; a count's figure climbs there, then its note replaces it.
  c.plan.forEach((p, j) => {
    const node = c.notes[j];
    if (!node) return;
    if (p.do === "count" && p.steps && p.steps.length) {
      const g = clamp(state[`g${p.k}`]);
      const landed = g >= 0.995 ? p.steps.length : Math.min(p.steps.length, Math.floor(g * p.steps.length));
      const text = g >= 0.995 ? node.getAttribute("data-final") : landed > 0 ? p.steps[landed - 1] : "";
      if (node.textContent !== text) node.textContent = text;
    }
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - p.k)));
  });
}

/** The whole staging on this family: the core is the caller's (validatePart); this schedules and checks the cards. */
export function stagePartScrolly({ variant, valid, marks, format = (v) => String(v), facts = {}, capacity = undefined }) {
  const scheduled = schedulePartScrolly({ variant, gestures: valid, marks, capacity });
  const cards = checkPartCards({ variant, gestures: valid, plan: scheduled.plan, marks, format, facts });
  return { scheduled, cards };
}
