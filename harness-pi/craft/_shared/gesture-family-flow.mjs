// The FLOW family (craft/gestures/GRAMMAR.md §4, misfits: "sankey"): a bipartite sankey — sources on a left rail,
// targets on a right rail, one ribbon per pair whose width is its value, every node as tall as the sum of its own
// ribbons. A mark is one RIBBON, named "source – target" (key = the source, series = the target): "Nucléaire – France".
// A source's name names its ribbons, a target's name names its ribbons. Flows add up (every node is the sum of its
// ribbons): `additive: true`, so a bracket gathers ribbons and prints their sum or share. Positions are fixed: the
// node order is the beat's, no reorder, rescale or zoom.
//
// Browser-safe: no Node module.
import { FAMILIES } from "./gesture-registry.mjs";
import { keyedHooks, noteItems, placeNotes, textBox } from "./gesture-keyed.mjs";

export const FLOW = "flow";
export const FLOW_GESTURES = ["highlight", "name", "annotate", "compare", "bracket", "filter", "reveal", "pull-back"];
FAMILIES[FLOW] ??= { gestures: FLOW_GESTURES, additive: true };

export const ARROW = " – ";

/**
 * The beat's flows `{ from, to, value }` (from/to are the names the plate prints). A zero or missing flow has no ribbon
 * and is left out (said in the count, never refused); a pair given twice is summed into one ribbon.
 */
export function flowModel({ flows, sources = undefined, targets = undefined }) {
  if (!Array.isArray(flows) || !flows.length) throw new Error("flows must be a non-empty array of { from, to, value }");
  const pairs = new Map();
  let dropped = 0;
  for (const f of flows) {
    const from = String(f.from ?? "");
    const to = String(f.to ?? "");
    const value = Number(f.value);
    if (!from.trim() || !to.trim()) throw new Error(`every flow names its from and to; got ${JSON.stringify(f).slice(0, 80)}`);
    if (!(value > 0)) {
      dropped++;
      continue;
    }
    const key = `${from}${ARROW}${to}`;
    pairs.set(key, { from, to, value: (pairs.get(key)?.value ?? 0) + value });
  }
  const links = [...pairs.values()];
  const order = (side, given) => {
    const seen = [...new Set(links.map((l) => l[side]))];
    const named = (given ?? []).map((g) => String(g.label ?? g.name ?? g)).filter((n) => seen.includes(n));
    return [...named, ...seen.filter((n) => !named.includes(n))];
  };
  const left = order("from", sources);
  const right = order("to", targets);
  // Ribbons drawn source by source, in rail order: a source's ribbons sit together.
  links.sort((a, b) => left.indexOf(a.from) - left.indexOf(b.from) || right.indexOf(a.to) - right.indexOf(b.to));
  return { links, left, right, dropped };
}

export const flowMarks = ({ links }) => links.map((l) => ({ name: `${l.from}${ARROW}${l.to}`, value: l.value, key: l.from, series: l.to }));

const totals = (links, side) => links.reduce((m, l) => m.set(l[side], (m.get(l[side]) ?? 0) + l.value), new Map());

/** A ribbon's own figures: its share of its source and of its target (×100), and both nodes' totals. */
export const flowDerived = ({ links }) => {
  const out = totals(links, "from");
  const inn = totals(links, "to");
  const grand = links.reduce((s, l) => s + l.value, 0);
  return (m) => {
    const l = links.find((x) => `${x.from}${ARROW}${x.to}` === m.name);
    if (!l) return [];
    return [(l.value / out.get(l.from)) * 100, (l.value / inn.get(l.to)) * 100, out.get(l.from), inn.get(l.to), (l.value / grand) * 100, (out.get(l.from) / grand) * 100, (inn.get(l.to) / grand) * 100];
  };
};

export function flowHooks({ links }) {
  const grand = links.reduce((s, l) => s + l.value, 0);
  return keyedHooks({
    // A gesture over a set of ribbons states their sum, its share of the whole, or how many ribbons it holds.
    figures(g, ctx) {
      if (!["highlight", "filter", "bracket"].includes(g.do)) return [];
      const sum = ctx.marks.reduce((s, m) => s + (ctx.valueOf.get(m) ?? 0), 0);
      return [sum, (sum / grand) * 100, ctx.marks.length];
    },
  });
}

export const flowUnit = () => (m) => [m];

/** The two rails, node heights from their totals, ribbons as bands; node words outside the rails. */
export function flowScene({ links, left, right, plan, box, measure, lead, format = String }) {
  const out = totals(links, "from");
  const inn = totals(links, "to");
  const grand = links.reduce((s, l) => s + l.value, 0);
  const label = (name, total) => `${name} ${format(total)}`;
  const leftW = Math.max(...left.map((n) => measure(label(n, out.get(n)), "axis"))) + 10;
  const rightW = Math.max(...right.map((n) => measure(label(n, inn.get(n)), "axis"))) + 10;
  const nodeW = 10;
  const x0 = leftW;
  const x1 = box.width - rightW - nodeW;
  const gapOf = (n) => Math.min(14, (box.height * 0.25) / Math.max(1, n - 1));
  const rail = (names, totalOf) => {
    const gap = gapOf(names.length);
    const k = (box.height - gap * (names.length - 1)) / grand;
    let y = 0;
    return new Map(names.map((n) => {
      const h = Math.max(1, totalOf.get(n) * k);
      const node = { y, h, k };
      y += h + gap;
      return [n, node];
    }));
  };
  const L = rail(left, out);
  const R = rail(right, inn);
  const furniture = [];
  const texts = [];
  for (const [n, node] of L) {
    furniture.push({ tag: "rect", role: "node", attrs: { x: x0, y: node.y, width: nodeW, height: node.h } });
    const t = label(n, out.get(n));
    texts.push({ text: t, x: x0 - 6, y: node.y + node.h / 2 + lead("axis") * 0.3, anchor: "end", reg: "axis", role: "name", width: measure(t, "axis") });
  }
  for (const [n, node] of R) {
    furniture.push({ tag: "rect", role: "node", attrs: { x: x1, y: node.y, width: nodeW, height: node.h } });
    const t = label(n, inn.get(n));
    texts.push({ text: t, x: x1 + nodeW + 6, y: node.y + node.h / 2 + lead("axis") * 0.3, anchor: "start", reg: "axis", role: "name", width: measure(t, "axis") });
  }
  const usedL = new Map(left.map((n) => [n, 0]));
  // A target's ribbons stack in the source order, so a target reads its sources top to bottom.
  const usedR = new Map(right.map((n) => [n, 0]));
  const byTarget = [...links].sort((a, b) => left.indexOf(a.from) - left.indexOf(b.from));
  const rightAt = new Map();
  for (const l of byTarget) {
    const node = R.get(l.to);
    const h = l.value * node.k;
    rightAt.set(`${l.from}${ARROW}${l.to}`, node.y + usedR.get(l.to));
    usedR.set(l.to, usedR.get(l.to) + h);
  }
  const at = new Map();
  const marks = links.map((l, i) => {
    const name = `${l.from}${ARROW}${l.to}`;
    at.set(name, i);
    const s = L.get(l.from);
    const h = l.value * s.k;
    const ya = s.y + usedL.get(l.from);
    usedL.set(l.from, usedL.get(l.from) + h);
    const yb = rightAt.get(name);
    const xa = x0 + nodeW;
    const xb = x1;
    const mx = (xa + xb) / 2;
    const d = `M${xa},${ya} C${mx},${ya} ${mx},${yb} ${xb},${yb} L${xb},${yb + h} C${mx},${yb + h} ${mx},${ya + h} ${xa},${ya + h} Z`;
    const share = (v, t) => `${((v / t) * 100).toFixed(1)} %`;
    return {
      i,
      name,
      shapes: [{ tag: "path", paint: "fill", attrs: { d, "data-base": 0.62 } }],
      ring: { tag: "path", attrs: { d } },
      anchor: { x: mx, y: (ya + yb) / 2 + h / 2 },
      hit: { x: mx + (xb - xa) * 0.18, y: ya + (yb - ya) * 0.68 + h / 2, r: Math.max(3, Math.min(9, h / 2)) },
      detail: `${l.from}${ARROW}${l.to} · ${format(l.value)} · ${share(l.value, out.get(l.from))} / ${l.from} · ${share(l.value, inn.get(l.to))} / ${l.to}`,
    };
  });

  const overlays = [];
  for (const p of plan) {
    if (p.do !== "compare" && p.do !== "bracket") continue;
    const members = p.do === "compare" ? [p.own[0], ...p.against] : p.members;
    const shapes = members.filter((m) => at.has(m)).map((m) => ({ tag: "path", paint: "stroke", role: "accent", attrs: { d: marks[at.get(m)].ring.attrs.d } }));
    // The label sits at the node the members share, inside the rails; else at the first member's middle.
    const ls = links.filter((l) => members.includes(`${l.from}${ARROW}${l.to}`));
    const fromAll = ls.every((l) => l.from === ls[0].from);
    const toAll = ls.every((l) => l.to === ls[0].to);
    const text = p.label;
    const w = measure(text, "annot");
    let label;
    if (p.do === "bracket" && fromAll) {
      const n = L.get(ls[0].from);
      label = { text, x: x0 + nodeW + 6, y: n.y + n.h / 2 + lead("annot") * 0.3, anchor: "start", reg: "annot", width: w };
    } else if (p.do === "bracket" && toAll) {
      const n = R.get(ls[0].to);
      label = { text, x: x1 - 6, y: n.y + n.h / 2 + lead("annot") * 0.3, anchor: "end", reg: "annot", width: w };
    } else {
      const a = marks[at.get(members[0])].anchor;
      label = { text, x: Math.min(a.x + 8, box.width - w), y: a.y - lead("annot") * 0.6, anchor: "start", reg: "annot", width: w };
    }
    overlays.push({ k: p.k, shapes, label });
  }
  const taken = [...texts.map((t) => textBox(t, lead(t.reg))), ...overlays.filter((o) => o.label).map((o) => textBox(o.label, lead("annot")))];
  const notes = placeNotes({ items: noteItems(plan, (name) => marks[at.get(name)]?.anchor ?? null), taken, box, measure, lead, max: 0.3 });
  return { width: box.width, height: box.height, furniture, marks, texts, overlays, notes, topRoom: 0 };
}

/** `model` is flowModel's output. */
export const FLOW_SPEC = {
  id: FLOW,
  what: "ribbon",
  marks: (model) => flowMarks(model),
  hooks: (model) => flowHooks(model),
  derived: (model) => flowDerived(model),
  unitOf: () => flowUnit(),
  // A bracket gathers ribbons at the node they share, which need not sit together in the ribbons' order: the
  // static check that a bracket spans contiguous rows is the Length family's, not this one's.
  coreFormat: { static: "scrolly" },
  scene: (model, args) => flowScene({ ...model, ...args }),
};
