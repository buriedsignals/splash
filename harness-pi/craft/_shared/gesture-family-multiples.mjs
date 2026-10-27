// The MULTIPLES family (craft/gestures/GRAMMAR.md §4, misfits: "small-multiples, a wrapper over an inner family"): a
// grid of panels, every panel the same small chart on ONE shared scale. Here the inner family is Length — each panel
// draws bars from one zero baseline — so a mark is one BAR of one panel, named "panel · bar" (key = the bar, series =
// the panel): "Danemark · 2024". A panel name names its bars, a bar name names that bar in every panel. Positions and
// the scale are fixed (no reorder, rescale, zoom: one scale for every panel, every state). The bars of different
// panels are values of different entities (a share, a rate) that do not add up to a whole: `additive: false`.
//
// Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";
import { keyedHooks, noteItems, placeNotes, textBox } from "./gesture-keyed.mjs";

export const MULTIPLES = "multiples";
export const MULTIPLES_GESTURES = ["highlight", "name", "annotate", "compare", "filter", "reference", "reveal", "pull-back"];
FAMILIES[MULTIPLES] ??= { gestures: MULTIPLES_GESTURES, additive: false };

export const SEP = " · ";

/**
 * The beat's panels, in either shape the kits take: `{ name, bars: [{ name, value }] }`, or the per-type kit's
 * `{ name, from, to }` with `states: { from, to }` naming the two bars. A bar missing from a panel is drawn as a gap
 * (no bar, its label kept) — never refused. Bars keep the order of their first appearance.
 */
export function multiplesPanels({ panels, states = undefined }) {
  if (!Array.isArray(panels) || !panels.length) throw new Error("panels must be a non-empty array of { name, bars: [{ name, value }] }");
  const seen = new Set();
  const out = panels.map((p) => {
    const name = String(p.name ?? "");
    if (!name.trim()) throw new Error(`every panel has a name; got ${JSON.stringify(p).slice(0, 80)}`);
    if (seen.has(name)) throw new Error(`two panels are named ${name}: give each panel its bars once`);
    seen.add(name);
    const bars = Array.isArray(p.bars)
      ? p.bars.map((b) => ({ name: String(b.name), value: Number(b.value) }))
      : [
          { name: String(states?.from ?? "from"), value: Number(p.from) },
          { name: String(states?.to ?? "to"), value: Number(p.to) },
        ];
    return { name, bars: bars.filter((b) => Number.isFinite(b.value)) };
  });
  const keys = [...new Set(out.flatMap((p) => p.bars.map((b) => b.name)))];
  return { panels: out, keys };
}

export const multiplesMarks = ({ panels }) => panels.flatMap((p) => p.bars.map((b) => ({ name: `${p.name}${SEP}${b.name}`, value: b.value, key: b.name, series: p.name })));

/** A panel's own figures beside each bar's value: the change from each earlier bar to it (the gain a note states). */
export const multiplesDerived = ({ panels }) => {
  const by = new Map(panels.map((p) => [p.name, p]));
  return (m) => {
    const p = by.get(m.series);
    if (!p) return [];
    const at = p.bars.findIndex((b) => b.name === m.key);
    return p.bars.flatMap((b, i) => (i < at ? [m.value - b.value, b.value ? m.value / b.value : NaN] : i > at ? [b.value - m.value] : []));
  };
};

export function multiplesHooks({ panels, ceiling }) {
  const top = ceiling ?? Math.max(0, ...panels.flatMap((p) => p.bars.map((b) => b.value)));
  return keyedHooks({
    // A highlight or filter of a panel states its change, or how many panels it holds.
    figures(g, ctx) {
      if (!["highlight", "filter", "annotate", "name"].includes(g.do)) return [];
      const series = [...new Set(ctx.marks.map((m) => panels.find((p) => m.startsWith(`${p.name}${SEP}`))?.name).filter(Boolean))];
      const changes = series.flatMap((s) => {
        const bars = panels.find((p) => p.name === s).bars;
        return bars.length > 1 ? [bars.at(-1).value - bars[0].value] : [];
      });
      return [...changes, series.length];
    },
    refuse(g, ctx) {
      if (g.do === "reference") {
        const v = Number(g.value);
        if (!Number.isFinite(v) || v < Math.min(0, ...panels.flatMap((p) => p.bars.map((b) => b.value))) || v > top * 1.25)
          throw new GestureRefusal(`gestures[${ctx.index}].value`, `${g.value} is off the panels' one scale (0 to ${top}): a rule there would be drawn where no bar can reach`, { remove: ctx.index });
      }
    },
  });
}

/** A highlight of a panel's bar lights the whole panel: the panel is the unit a reader compares. */
export const multiplesUnit = (marks) => (m) => {
  const series = marks.find((x) => x.name === m)?.series;
  return series === undefined ? [m] : marks.filter((x) => x.series === series).map((x) => x.name);
};

/** The grid: as many columns as keep each panel near the plot's aspect, every panel on one value scale from zero. */
export function multiplesScene({ panels, keys, ceiling, plan, box, measure, lead, format = String }) {
  const n = panels.length;
  let best = { cols: 1, score: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const w = box.width / cols;
    const h = box.height / rows;
    const score = Math.abs(Math.log(w / h / 0.75)) + (rows * cols - n) * 0.05;
    if (score < best.score) best = { cols, score };
  }
  const cols = best.cols;
  const gridRows = Math.ceil(n / cols);
  const pw = box.width / cols;
  const ph = box.height / gridRows;
  const titleH = lead("axis") * 1.2;
  const valueH = lead("value") * 1.05;
  const keyH = lead("axis") * 1.15;
  const values = panels.flatMap((p) => p.bars.map((b) => b.value));
  const lo = Math.min(0, ...values);
  const hi = ceiling ?? (Math.max(0, ...values, ...plan.filter((p) => p.do === "reference").map((p) => p.value)) || 1);
  const inner = (i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x0 = c * pw + pw * 0.08;
    const x1 = (c + 1) * pw - pw * 0.08;
    const top = r * ph + titleH + valueH;
    const bottom = (r + 1) * ph - keyH - lead("axis") * 0.3;
    return { x0, x1, top, bottom, y: (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top), titleY: r * ph + lead("axis") * 0.9 };
  };
  const furniture = [];
  const texts = [];
  const marks = [];
  const at = new Map();
  panels.forEach((p, i) => {
    const g = inner(i);
    const slot = (g.x1 - g.x0) / keys.length;
    const bw = Math.min(slot * 0.62, 46);
    const zero = g.y(0);
    furniture.push({ tag: "line", role: "axis", attrs: { x1: g.x0, x2: g.x1, y1: zero, y2: zero } });
    const titleW = measure(p.name, "axis");
    texts.push({ text: p.name, x: g.x0, y: g.titleY, anchor: "start", reg: "axis", role: "name", mark: undefined, width: titleW, series: p.name });
    keys.forEach((key, k) => {
      const cx = g.x0 + slot * (k + 0.5);
      texts.push({ text: key, x: cx, y: g.bottom + lead("axis") * 1.05, anchor: "middle", reg: "axis", role: "tick", width: measure(key, "axis") });
      const bar = p.bars.find((b) => b.name === key);
      if (!bar) return;
      const name = `${p.name}${SEP}${key}`;
      const index = marks.length;
      at.set(name, index);
      const y0 = Math.min(zero, g.y(bar.value));
      const h = Math.max(1, Math.abs(g.y(bar.value) - zero));
      const label = format(bar.value);
      texts.push({ text: label, x: cx, y: (bar.value >= 0 ? y0 : y0 + h) + (bar.value >= 0 ? -lead("value") * 0.28 : lead("value") * 0.85), anchor: "middle", reg: "value", role: "value", mark: index, width: measure(label, "value") });
      marks.push({
        i: index,
        name,
        shapes: [{ tag: "rect", paint: "fill", attrs: { x: cx - bw / 2, y: y0, width: bw, height: h } }],
        ring: { tag: "rect", attrs: { x: cx - bw / 2 - 2.5, y: y0 - 2.5, width: bw + 5, height: h + 5, rx: 2 } },
        anchor: { x: cx + bw / 2, y: y0 },
        hit: { x: cx, y: y0 + h / 2, r: Math.max(4, Math.min(9, bw / 2)) },
        // What the plate prints nowhere: the change from the panel's first bar, and the rank among the panels' same bar.
        detail: [
          `${p.name} · ${key} · ${label}`,
          ...(k > 0 && p.bars[0] ? [`${bar.value - p.bars[0].value >= 0 ? "+" : "-"}${format(Math.abs(bar.value - p.bars[0].value))} / ${p.bars[0].name}`] : []),
          `${1 + panels.filter((q) => (q.bars.find((b) => b.name === key)?.value ?? -Infinity) > bar.value).length} / ${panels.filter((q) => q.bars.some((b) => b.name === key)).length}`,
        ].join(" · "),
        panel: i,
      });
    });
  });
  // A panel's title takes the accent with its bars: it is bound to the panel's first bar.
  for (const t of texts) if (t.series !== undefined) t.mark = at.get(`${t.series}${SEP}${panels.find((p) => p.name === t.series).bars[0]?.name}`);

  const overlays = [];
  for (const p of plan) {
    // A highlighted panel beside the subject: its frame drawn in the ink, once.
    if (p.do === "highlight" && p.ringed)
      overlays.push({
        k: p.k,
        shapes: p.ringed.map((g) => {
          const i = marks[at.get(g[0])].panel;
          const c = i % cols;
          const r = Math.floor(i / cols);
          return { tag: "rect", paint: "stroke", role: "ring", attrs: { x: c * pw + 2, y: r * ph + 2, width: pw - 4, height: ph - 4, rx: 3 } };
        }),
      });
    if (p.do === "compare") {
      const i = at.get(p.own[0]);
      const m = marks[i];
      const g = inner(m.panel);
      const level = g.y(p.b);
      const r = m.shapes[0].attrs;
      const text = p.label;
      const w = measure(text, "annot");
      const x = Math.min(Math.max(g.x0, r.x + r.width / 2 - w / 2), box.width - w);
      overlays.push({
        k: p.k,
        shapes: [{ tag: "line", role: "rule", attrs: { x1: r.x - 4, x2: r.x + r.width + 4, y1: level, y2: level, "stroke-dasharray": "3 2" } }],
        label: { text, x, y: Math.min(level, r.y) - lead("value") * 1.4, anchor: "start", reg: "annot", width: w },
      });
    } else if (p.do === "reference") {
      const shapes = panels.map((_, i) => {
        const g = inner(i);
        return { tag: "line", role: "rule", attrs: { x1: g.x0, x2: g.x1, y1: g.y(p.value), y2: g.y(p.value), "stroke-dasharray": "4 3" } };
      });
      const g = inner(0);
      const text = p.label;
      overlays.push({ k: p.k, shapes, label: { text, x: g.x1 + 2, y: g.y(p.value) - 3, anchor: "start", reg: "annot", width: measure(text, "annot") } });
    }
  }
  const taken = [...texts.map((t) => textBox(t, lead(t.reg))), ...overlays.filter((o) => o.label).map((o) => textBox(o.label, lead("annot")))];
  const soft = marks.map((m) => ({ x: m.shapes[0].attrs.x, y: m.shapes[0].attrs.y, w: m.shapes[0].attrs.width, h: m.shapes[0].attrs.height }));
  // A band above the grid for the notes, so a note never sits on a neighbouring panel's figures.
  const items = noteItems(plan, (name) => marks[at.get(name)]?.anchor ?? null);
  const topRoom = items.length ? lead("annot") * 1.4 : 0;
  const notes = placeNotes({ items, taken, soft, top: -topRoom, box, measure, lead, max: Math.min(0.42, 2.2 / cols) });
  return { width: box.width, height: box.height, furniture, marks, texts, overlays, notes, topRoom };
}

/** `model` is multiplesPanels' output plus the beat's optional `ceiling` (the shared scale's top). */
export const MULTIPLES_SPEC = {
  id: MULTIPLES,
  what: "bar",
  marks: (model) => multiplesMarks(model),
  hooks: (model) => multiplesHooks(model),
  derived: (model) => multiplesDerived(model),
  unitOf: (model) => multiplesUnit(multiplesMarks(model)),
  scene: (model, args) => multiplesScene({ ...model, ...args }),
};
