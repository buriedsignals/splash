// The Units scrolly scheduler (craft/gestures/GRAMMAR.md §5): one card per composed gesture, the reader's scroll
// interpolating continuously from one card's state to the next, then a closing card carrying the limits, on which the
// whole chart returns (a filter released, what was shown still marked).
//
// A state is a flat record of finite numbers: `fill` (how far every group's units have landed, at ONE pace — the j-th
// unit of every group together, `no-let-blocks-count`), per group its accent, ring and step-back, per gesture its own
// progress `g<k>` (a bracket's spine running down, a copy growing, a rule drawing, a count climbing), and `note`
// (which card's note the header reads). Every card sets its own `g<k>` and `note`, so every card changes the picture.
//
// Each card's prose is its gesture's `card`, checked by the Length kit's `checkCards` against what the card's picture
// shows (gesture-scrolly.mjs). The drive (`applyUnitsState`) is ONE self-contained function — no import, no reference
// to this module's scope — emitted as source and inlined by the scrolly skill's renderScrolly. Browser-safe.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { edgeOf, splitMarks } from "./gesture-family-units.mjs";

export const APPLY_UNITS = "applyUnitsState";

const prefixSums = (values) => {
  let s = 0;
  return values.map((v) => (s += v));
};

/**
 * @param gestures validateGestures' gestures
 * @param groups   the partition's groups, in drawing order
 * @returns        { states, plan, total } — one state per gesture card, then the closing card's
 */
export function scheduleUnitsScrolly({ gestures, groups }) {
  const names = groups.map((g) => g.name);
  const at = new Map(names.map((n, i) => [n, i]));
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const sum = (list) => list.reduce((s, n) => s + (countOf.get(n) ?? 0), 0);
  const total = sum(names);
  const base = { fill: gestures.some((g) => g.do === "reveal") ? 0 : 1, note: 0 };
  names.forEach((_, i) => Object.assign(base, { [`accent${i}`]: 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const implicit = implicitAccent(gestures);
  if (at.has(implicit)) base[`accent${at.get(implicit)}`] = 1;

  let state = base;
  const states = [];
  const plan = [];
  gestures.forEach((g, k) => {
    const { own, of } = splitMarks(g);
    const next = { ...state, [`g${k}`]: 1, note: k };
    const item = { k, do: g.do, own, of, note: g.note === undefined ? undefined : String(g.note), shown: [] };
    switch (g.do) {
      case "highlight":
        own.forEach((m) => (next[`${g.subject === undefined || m === g.subject ? "accent" : "ring"}${at.get(m)}`] = 1));
        item.shown = own.map((m) => countOf.get(m));
        break;
      case "name":
        next[`ring${at.get(own[0])}`] = 1;
        item.shown = [countOf.get(own[0])];
        break;
      case "annotate":
        item.shown = [countOf.get(own[0])];
        break;
      case "filter":
        names.forEach((n, i) => (next[`back${i}`] = own.includes(n) ? 0 : 1));
        item.shown = own.map((m) => countOf.get(m));
        break;
      case "reveal":
        next.fill = 1;
        break;
      case "compare": {
        item.value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? total : sum(of);
        item.against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names : of;
        const a = countOf.get(own[0]);
        item.ratio = a / item.value;
        item.shown = [a, item.value, item.ratio, a - item.value, item.value - a];
        break;
      }
      case "bracket": {
        const whole = own.length === 1 && g.of === "whole";
        item.members = whole ? names : own;
        item.whole = whole;
        // Against the whole the figure states the group's own count, then the whole it is measured against.
        item.steps = whole ? [countOf.get(own[0]), total] : prefixSums(item.members.map((n) => countOf.get(n)));
        const s = sum(own);
        item.shown = whole ? [s, total, (s / total) * 100, (s / total) * 10] : [s];
        if (whole) item.ratio = s / total;
        break;
      }
      case "count": {
        const counted = own.length ? own : names;
        item.steps = prefixSums(counted.map((n) => countOf.get(n)));
        item.shown = [item.steps.at(-1)];
        break;
      }
      case "reference": {
        item.value = edgeOf(g);
        const above = groups.findIndex((x) => x.lo === item.value);
        const below = groups.findIndex((x) => x.hi === item.value);
        item.between = [Math.min(above, below), Math.max(above, below)];
        const under = groups.filter((x) => x.hi <= item.value).reduce((s, x) => s + x.count, 0);
        item.shown = [item.value, under, total - under, (under / total) * 100, (under / total) * 10];
        break;
      }
      case "pull-back":
        names.forEach((_, i) => (next[`back${i}`] = 0));
        break;
      default:
        throw new GestureRefusal(`gestures[${k}].do`, `"${g.do}" has no scrolly staging on a units chart`, { remove: k });
    }
    plan.push(item);
    states.push(next);
    state = next;
  });
  const closing = { ...state, fill: 1, note: gestures.length };
  names.forEach((_, i) => (closing[`back${i}`] = 0));
  states.push(closing);
  return { states, plan, total };
}

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const unitsDriveSource = () => applyUnitsState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it. Every mark is laid out in the reader's
 * pixels on each paint: names in a left column, one row per group, a histogram's bar (length ∝ count on one scale)
 * or a pictogram's squares (one size for every block, lines of the same length), the count after the mark, a
 * bracket's spine and figure in a right-hand column, a rule between two rows at its edge, a compare's copy in its
 * subject's row.
 */
export function applyUnitsState(root, state, context) {
  const carrier = root.querySelector("[data-ugrp]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const set = (el, attrs) => {
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  };
  const place = (el, left, top, transform, opacity) => Object.assign(el.style, { left: `${left}px`, top: `${top}px`, transform, opacity: String(opacity) });
  const width = (node) => node.getBoundingClientRect().width;
  const landedOf = (g, length) => (g >= 0.995 ? length : Math.min(length, Math.floor(g * length)));

  if (context.resized || !root.__ugrp) {
    const data = root.__ugrpData || (root.__ugrpData = JSON.parse(carrier.getAttribute("data-ugrp")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const groups = data.groups.map((g, i) => ({
      ...g,
      bar: q(`[data-bar="${i}"]`),
      units: Array.from(stage.querySelectorAll(`[data-unit="${i}"]`)),
      ring: q(`[data-ring="${i}"]`),
      name: q(`[data-name="${i}"]`),
      value: q(`[data-value="${i}"]`),
    }));
    for (const g of groups) Object.assign(g.name.style, { width: "auto", whiteSpace: "nowrap" });
    const plan = data.plan.map((p) => ({
      ...p,
      copy: q(`[data-copy="${p.k}"]`),
      copies: Array.from(stage.querySelectorAll(`[data-copyu="${p.k}"]`)),
      spine: q(`[data-spine="${p.k}"]`),
      rule: q(`[data-rule="${p.k}"]`),
      label: q(`[data-label="${p.k}"]`),
    }));
    root.__ugrp = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      baseline: q('[data-part="baseline"]'),
      groups,
      plan,
      notes: data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`)),
      nameNatural: Math.max(0, ...groups.map((g) => width(g.name))),
      valueW: Math.max(0, ...groups.map((g) => width(g.value))),
      sideW: Math.max(0, ...plan.filter((p) => p.label).map((p) => width(p.label))),
    };
  }
  const c = root.__ugrp;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  const narrow = SW < 560;
  const gap = narrow ? 8 : 12;
  const n = c.groups.length;
  const top = 4;
  const pitch = (SH - 8) / n;
  const band = pitch * 0.74;
  const nameW = Math.min(c.nameNatural, SW * (narrow ? 0.34 : 0.28));
  for (const g of c.groups) Object.assign(g.name.style, { width: `${nameW}px`, whiteSpace: c.nameNatural > nameW ? "normal" : "nowrap", textAlign: "right" });
  const spines = c.plan.filter((p) => p.do === "bracket").length;
  const side = c.sideW ? Math.min(c.sideW + 18 + 14 * spines, SW * 0.34) : 0;
  const x0 = nameW + gap;
  const span = Math.max(20, SW - x0 - c.valueW - 6 - gap - side);
  const max = Math.max(1, c.data.max);
  // The pictogram's one cell size: the largest square for which the largest count fits in a row's band.
  let cell = 0;
  let perLine = max;
  if (c.data.variant !== "histogram") {
    for (let s = Math.min(band, 36); s >= 1.5; s -= 0.25) {
      const per = Math.max(1, Math.floor(span / s));
      if (Math.ceil(max / per) * s <= band + 1e-9) {
        cell = s;
        perLine = per;
        break;
      }
    }
    if (!cell) {
      cell = 1.5;
      perLine = Math.max(1, Math.floor(span / cell));
    }
  }
  const lines = c.data.variant === "histogram" ? 1 : Math.ceil(max / perLine);
  const rowTop = (i) => top + i * pitch + (pitch - band) / 2;
  const bandTop = (i) => (c.data.variant === "histogram" ? rowTop(i) : rowTop(i) + (band - lines * cell) / 2);
  const bandH = c.data.variant === "histogram" ? band : lines * cell;
  const endAt = (k) => (c.data.variant === "histogram" ? x0 + (k / max) * span : x0 + Math.min(k, perLine) * cell);
  const cellAt = (i, k) => ({ x: x0 + (k % perLine) * cell, y: bandTop(i) + Math.floor(k / perLine) * cell });
  set(c.baseline, { x1: x0, x2: x0, y1: top, y2: SH - 4 });
  const fill = clamp(state.fill);

  c.groups.forEach((g, i) => {
    const back = 1 - 0.72 * clamp(state[`back${i}`]);
    const accent = clamp(state[`accent${i}`]);
    const colour = accent > 0.5 ? c.data.colours.accent : c.data.colours.neutral;
    const landed = c.data.variant === "histogram" ? Math.min(g.count, fill * max) : Math.min(g.count, Math.floor(fill * max + 1e-9));
    if (g.bar) set(g.bar, { x: x0, y: rowTop(i), width: Math.max(0, endAt(landed) - x0), height: band, fill: colour, opacity: back });
    g.units.forEach((u, k) => {
      const p = cellAt(i, k);
      set(u, { x: p.x + cell * 0.07, y: p.y + cell * 0.07, width: cell * 0.86, height: cell * 0.86, fill: colour, opacity: k < landed ? back : 0 });
    });
    set(g.ring, { x: x0 - 3, y: bandTop(i) - 3, width: Math.max(6, endAt(g.count) - x0 + 6), height: bandH + 6, opacity: clamp(state[`ring${i}`]) * back });
    const strong = accent > 0.5 || state[`ring${i}`] > 0.5;
    const ink = strong ? c.data.colours.accentInk : c.data.colours.ink;
    Object.assign(g.name.style, { color: ink, fontWeight: strong ? "700" : "" });
    g.value.style.color = ink;
    place(g.name, 0, rowTop(i) + band / 2, "translateY(-50%)", back);
    const copy = c.plan.find((p) => p.do === "compare" && p.own[0] === i);
    const after = Math.max(endAt(g.count), copy ? endAt(copy.value) : 0);
    place(g.value, after + 6, rowTop(i) + band / 2, "translateY(-50%)", landed >= g.count ? back : 0);
  });

  let column = SW - side + 6;
  c.plan.forEach((p) => {
    const g = clamp(state[`g${p.k}`]);
    if (p.do === "compare") {
      const i = p.own[0];
      const shown = p.value * g;
      if (p.copy) set(p.copy, { x: x0, y: rowTop(i) + band * 0.55, width: Math.max(0, endAt(shown) - x0), height: band * 0.45, opacity: Math.min(1, g * 3) });
      p.copies.forEach((u, k) => {
        const q = cellAt(i, k);
        set(u, { x: q.x + cell * 0.2, y: q.y + cell * 0.2, width: cell * 0.6, height: cell * 0.6, opacity: k < Math.floor(shown + 1e-9) ? 1 : 0 });
      });
    } else if (p.do === "bracket") {
      const x = column;
      column += 14;
      const ys = p.members.map((i) => rowTop(i));
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys) + band;
      const reach = y0 + (y1 - y0) * g;
      set(p.spine, { d: `M${x - 6},${y0} H${x} V${reach}${g >= 0.995 ? ` H${x - 6}` : ""}`, opacity: Math.min(1, g * 4) });
      const landed = landedOf(g, p.steps.length);
      const text = g >= 0.995 && p.noteText ? p.noteText : landed > 0 ? p.steps[landed - 1] : "";
      if (p.label.textContent !== text) p.label.textContent = text;
      place(p.label, x + 6, (y0 + y1) / 2, "translateY(-50%)", landed > 0 ? 1 : 0);
    } else if (p.do === "reference") {
      const y = (rowTop(p.between[0]) + band + rowTop(p.between[1])) / 2;
      set(p.rule, { x1: x0 - 6, x2: x0 + (SW - side - x0) * g, y1: y, y2: y, opacity: g });
      // A rule's words stand past every bracket's spine.
      place(p.label, SW - side + 10 + 14 * spines, y, "translateY(-50%)", g);
    }
  });

  // The header reads the note of the card being read; a count's figure climbs there, then its note replaces it.
  c.plan.forEach((p, j) => {
    const node = c.notes[j];
    if (!node) return;
    if (p.do === "count") {
      const g = clamp(state[`g${p.k}`]);
      const landed = landedOf(g, p.steps.length);
      const text = g >= 0.995 ? p.noteText : landed > 0 ? p.steps[landed - 1] : "";
      if (node.textContent !== text) node.textContent = text;
    }
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - p.k)));
  });
}
