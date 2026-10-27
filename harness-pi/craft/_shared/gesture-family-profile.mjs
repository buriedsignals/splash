// The PROFILE family (craft/gestures/GRAMMAR.md §4, misfits: "parallel-coordinates + radar"): each entity is a
// profile of several readings, one per axis — a polygon on a radar's spokes, a line across parallel axes. A mark is one
// READING, named "entity · axis" (key = the axis, series = the entity): "France · Nucléaire". An entity's name names its
// whole profile, an axis's name every entity's reading on it. Positions are data: nothing moves, the axis order is the
// beat's (`no-reorder-spokes-nicer`, `no-reorder-rails-mid`), so no reorder, rescale or zoom. Readings of a profile are
// values on axes, not parts of one whole: `additive: false`.
//
// Two variants, one difference that matters to truth: a radar draws every spoke on ONE radial scale, so any two readings
// may be compared; parallel coordinates give each axis its OWN scale, so only two readings on one axis may be laid
// against each other (a compare across axes is refused — it would draw a false gap).
//
// Browser-safe: no Node module.
import { FAMILIES } from "./gesture-registry.mjs";
import { keyedHooks, noteItems, placeNotes, textBox } from "./gesture-keyed.mjs";

export const PROFILE = "profile";
export const PROFILE_GESTURES = ["highlight", "name", "annotate", "compare", "filter", "reveal", "pull-back"];
FAMILIES[PROFILE] ??= { gestures: PROFILE_GESTURES, additive: false };

export const SEP = " · ";

/**
 * The beat's `axes` (names, in the order drawn) and `entities` ([{ name, values: { axisName: number } }]). A reading
 * missing on an axis is a gap in that profile (its line breaks there; never refused).
 */
export function profileModel({ axes, entities, ceiling = undefined }) {
  if (!Array.isArray(axes) || axes.length < 3) throw new Error("axes must list at least three axis names, in the order they are drawn");
  if (!Array.isArray(entities) || !entities.length) throw new Error("entities must be a non-empty array of { name, values: { <axis>: number } }");
  const names = axes.map((a) => String(a.name ?? a.label ?? a));
  const seen = new Set();
  const ents = entities.map((e) => {
    const name = String(e.name ?? "");
    if (!name.trim()) throw new Error(`every entity has a name; got ${JSON.stringify(e).slice(0, 80)}`);
    if (seen.has(name)) throw new Error(`two entities are named ${name}`);
    seen.add(name);
    const values = Array.isArray(e.values) ? Object.fromEntries(names.map((a, i) => [a, e.values[i]])) : e.values ?? {};
    return { name, values: Object.fromEntries(names.map((a) => [a, Number(values[a])]).filter(([, v]) => Number.isFinite(v))) };
  });
  return { axes: names, entities: ents, ceiling: Number.isFinite(ceiling) ? ceiling : undefined };
}

export const profileMarks = ({ axes, entities }) => entities.flatMap((e) => axes.filter((a) => a in e.values).map((a) => ({ name: `${e.name}${SEP}${a}`, value: e.values[a], key: a, series: e.name })));

/** A reading's own figures: its share of the entity's sum (×100), the entity's sum, its rank on its axis. */
export const profileDerived = ({ axes, entities }) => (m) => {
  const e = entities.find((x) => x.name === m.series);
  if (!e) return [];
  const sum = Object.values(e.values).reduce((s, v) => s + v, 0);
  const rank = 1 + entities.filter((x) => (x.values[m.key] ?? -Infinity) > m.value).length;
  return [sum ? (m.value / sum) * 100 : NaN, sum, rank];
};

export function profileHooks({ entities }, variant) {
  return keyedHooks({
    // A highlight or filter of whole profiles may state how many it holds, or a profile's sum of readings.
    figures(g, ctx) {
      if (!["highlight", "filter"].includes(g.do)) return [];
      const series = [...new Set(ctx.marks.map((m) => entities.find((e) => m.startsWith(`${e.name}${SEP}`))?.name).filter(Boolean))];
      return [series.length, ...series.map((s) => Object.values(entities.find((e) => e.name === s).values).reduce((a, b) => a + b, 0))];
    },
    // Parallel coordinates: each axis its own scale; a reading is laid against another on its own axis only.
    sameScale: variant === "parallel-coordinates" ? (a, b) => a.split(SEP).at(-1) === b.split(SEP).at(-1) : undefined,
  });
}

/** A highlight of one reading lights the whole profile: the entity is the unit a reader follows. */
export const profileUnit = (marks) => (m) => {
  const series = marks.find((x) => x.name === m)?.series;
  return series === undefined ? [m] : marks.filter((x) => x.series === series).map((x) => x.name);
};

const nice = (v) => {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= v) ?? 10 * p;
};

function entityLabels({ entities, named, place }) {
  return entities.filter((e) => named.has(e.name)).map((e) => place(e));
}

export function profileScene({ axes, entities, ceiling, plan, box, measure, lead, format = String, variant = "radar-spider" }) {
  const marks = [];
  const at = new Map();
  const furniture = [];
  const texts = [];
  const named = new Set(plan.flatMap((p) => [...p.own, ...(p.against ?? [])]).map((m) => m.split(SEP)[0]));
  const firstOf = new Map();
  const add = (e, a, x, y, extra = {}) => {
    const name = `${e.name}${SEP}${a}`;
    const i = marks.length;
    at.set(name, i);
    if (!firstOf.has(e.name)) firstOf.set(e.name, i);
    marks.push({
      i,
      name,
      shapes: [{ tag: "circle", paint: "fill", attrs: { cx: x, cy: y, r: 3.2 } }],
      ring: { tag: "circle", attrs: { cx: x, cy: y, r: 7 } },
      anchor: { x, y },
      hit: { x, y, r: 6 },
      detail: `${e.name} · ${a} · ${format(e.values[a])} · ${1 + entities.filter((o) => (o.values[a] ?? -Infinity) > e.values[a]).length} / ${entities.filter((o) => a in o.values).length}`,
      ...extra,
    });
    return i;
  };

  if (variant === "radar-spider") {
    const labelW = Math.max(...axes.map((a) => measure(a, "axis")));
    const R = Math.max(40, Math.min(box.height / 2 - lead("axis") * 1.6, box.width / 2 - labelW - 12));
    const cx = box.width / 2;
    const cy = box.height / 2;
    const top = ceiling ?? nice(Math.max(...entities.flatMap((e) => Object.values(e.values))));
    const ang = (k) => -Math.PI / 2 + (k / axes.length) * Math.PI * 2;
    const pt = (k, v) => [cx + Math.cos(ang(k)) * R * (v / top), cy + Math.sin(ang(k)) * R * (v / top)];
    for (const f of [0.25, 0.5, 0.75, 1]) furniture.push({ tag: "circle", role: "grid", paint: "stroke", attrs: { cx, cy, r: R * f } });
    axes.forEach((a, k) => {
      const [x, y] = pt(k, top);
      furniture.push({ tag: "line", role: "grid", attrs: { x1: cx, y1: cy, x2: x, y2: y } });
      const c = Math.cos(ang(k));
      const lx = cx + Math.cos(ang(k)) * (R + 8);
      const ly = cy + Math.sin(ang(k)) * (R + 8) + lead("axis") * (Math.sin(ang(k)) > 0.3 ? 0.8 : Math.sin(ang(k)) < -0.3 ? 0 : 0.3);
      texts.push({ text: a, x: lx, y: ly, anchor: c > 0.3 ? "start" : c < -0.3 ? "end" : "middle", reg: "axis", role: "tick", width: measure(a, "axis") });
    });
    const topLabel = format(top);
    texts.push({ text: topLabel, x: cx + 4, y: cy - R + lead("axis") * 0.9, anchor: "start", reg: "axis", role: "tick", width: measure(topLabel, "axis") });
    for (const e of entities) {
      const pts = axes.map((a, k) => (a in e.values ? pt(k, Math.max(0, e.values[a])) : null));
      const ks = axes.map((a, k) => (a in e.values ? k : -1)).filter((k) => k >= 0);
      ks.forEach((k) => add(e, axes[k], pts[k][0], pts[k][1]));
      const d = `M${pts.filter(Boolean).map((p) => p.join(",")).join(" L")} Z`;
      // The polygon is bound to the profile's first reading: it takes the profile's accent and step-back.
      marks[firstOf.get(e.name)].shapes.unshift({ tag: "path", paint: "stroke", attrs: { d, "stroke-width": 1.8 } });
    }
    for (const t of entityLabels({
      entities,
      named,
      place: (e) => {
        const best = axes.reduce((b, a, k) => ((e.values[a] ?? -1) > (e.values[axes[b]] ?? -1) ? k : b), 0);
        const [x, y] = pt(best, e.values[axes[best]]);
        const right = Math.cos(ang(best)) >= 0;
        return { text: e.name, x: x + (right ? 10 : -10), y: y - 6, anchor: right ? "start" : "end", reg: "axis", role: "name", mark: firstOf.get(e.name), width: measure(e.name, "axis") };
      },
    }))
      texts.push(t);
    return finish();
  }

  // Parallel coordinates: one vertical axis per column, each with its own scale from zero to its own top.
  const nameW = Math.max(...entities.filter((e) => named.has(e.name)).map((e) => measure(e.name, "axis")), 0);
  const x0 = 6;
  const x1 = box.width - nameW - 14;
  const yTop = lead("axis") * 2;
  const yBot = box.height - lead("axis") * 1.4;
  const xs = axes.map((_, k) => x0 + (k / (axes.length - 1)) * (x1 - x0));
  const tops = axes.map((a) => nice(Math.max(...entities.map((e) => e.values[a] ?? 0))));
  const y = (k, v) => yBot - (Math.max(0, v) / tops[k]) * (yBot - yTop);
  axes.forEach((a, k) => {
    furniture.push({ tag: "line", role: "axis", attrs: { x1: xs[k], x2: xs[k], y1: yTop, y2: yBot } });
    const anchor = k === 0 ? "start" : k === axes.length - 1 ? "end" : "middle";
    texts.push({ text: a, x: xs[k], y: lead("axis") * 0.8, anchor, reg: "axis", role: "tick", width: measure(a, "axis") });
    const tl = format(tops[k]);
    texts.push({ text: tl, x: xs[k] + (k === axes.length - 1 ? -4 : 4), y: yTop + lead("axis") * 0.1, anchor: k === axes.length - 1 ? "end" : "start", reg: "axis", role: "tick", width: measure(tl, "axis") });
    texts.push({ text: "0", x: xs[k] + (k === axes.length - 1 ? -4 : 4), y: yBot + lead("axis") * 0.9, anchor: k === axes.length - 1 ? "end" : "start", reg: "axis", role: "tick", width: measure("0", "axis") });
  });
  for (const e of entities) {
    const pts = axes.map((a, k) => (a in e.values ? [xs[k], y(k, e.values[a])] : null));
    pts.forEach((p, k) => p && add(e, axes[k], p[0], p[1]));
    // A gap in the readings breaks the line there rather than bridging it.
    let d = "";
    pts.forEach((p, k) => {
      if (!p) return;
      d += `${k && pts[k - 1] ? "L" : "M"}${p[0]},${p[1]} `;
    });
    marks[firstOf.get(e.name)].shapes.unshift({ tag: "path", paint: "stroke", attrs: { d: d.trim(), "stroke-width": 1.6 } });
  }
  // Names of the profiles a gesture acts on, at the line's right end, nudged apart.
  const ends = entities
    .filter((e) => named.has(e.name))
    .map((e) => ({ e, y: y(axes.length - 1, e.values[axes.at(-1)] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  const L = lead("axis");
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < L) ends[i].y = ends[i - 1].y + L;
  // Names nudged past the plot's foot are lifted back together, so the last one is never cut.
  const over = ends.length ? ends.at(-1).y + L * 0.5 - box.height : 0;
  if (over > 0) for (const e of ends) e.y -= over;
  for (const { e, y: yy } of ends) texts.push({ text: e.name, x: x1 + 8, y: yy + L * 0.3, anchor: "start", reg: "axis", role: "name", mark: firstOf.get(e.name), width: measure(e.name, "axis") });
  return finish(tops, y);

  function finish() {
    const overlays = [];
    const taken = texts.map((t) => textBox(t, lead(t.reg)));
    for (const p of plan) {
      // A highlighted profile beside the subject: its polygon or line outlined in the ink, once.
      if (p.do === "highlight" && p.ringed)
        overlays.push({ k: p.k, shapes: p.ringed.map((g) => ({ tag: "path", paint: "stroke", role: "ring", attrs: { d: marks[at.get(g[0])].shapes[0].attrs.d } })) });
      if (p.do !== "compare") continue;
      const a = marks[at.get(p.own[0])];
      const bs = p.against.filter((m) => at.has(m)).map((m) => marks[at.get(m)]);
      // The compare's words placed like a note: beside the subject's reading, clear of every word already drawn.
      const [placed] = placeNotes({ items: [{ k: p.k, text: p.label, at: a.anchor }], taken, box, measure, lead, max: 0.34 });
      taken.push(textBox({ ...placed, anchor: "start" }, lead("annot")));
      overlays.push({
        k: p.k,
        shapes: bs.flatMap((b) => [
          { tag: "line", role: "accent", attrs: { x1: a.anchor.x, y1: a.anchor.y, x2: b.anchor.x, y2: b.anchor.y, "stroke-dasharray": "3 2" } },
          { tag: "circle", role: "rule", paint: "stroke", attrs: { cx: b.anchor.x, cy: b.anchor.y, r: 7 } },
        ]),
        label: { text: placed.lines.join(" "), x: placed.x, y: placed.y, anchor: "start", reg: "annot", width: placed.width },
      });
    }
    // A note on a whole profile sits by the profile's name, at its farthest reading; a note on one reading, by it.
    const whole = (p) => p.do === "highlight" && entities.some((e) => p.own.length > 1 && p.own.every((m) => m.startsWith(`${e.name}${SEP}`)));
    const items = noteItems(plan, (name) => marks[at.get(name)]?.anchor ?? null).map((it) => {
      const p = plan.find((q) => q.k === it.k);
      if (!whole(p)) return it;
      const e = entities.find((x) => p.own[0].startsWith(`${x.name}${SEP}`));
      const best = axes.reduce((b, ax) => ((e.values[ax] ?? -1) > (e.values[b] ?? -1) ? ax : b), axes[0]);
      return { ...it, at: marks[at.get(`${e.name}${SEP}${best}`)].anchor };
    });
    const notes = placeNotes({ items, taken, box, measure, lead, max: 0.3 });
    return { width: box.width, height: box.height, furniture, marks, texts, overlays, notes, topRoom: 0 };
  }
}

/** `model` is profileModel's output; the variant (radar-spider | parallel-coordinates) rides with the scene args. */
export const PROFILE_SPEC = {
  id: PROFILE,
  what: "reading",
  marks: (model) => profileMarks(model),
  hooks: (model) => profileHooks(model, model.variant),
  derived: (model) => profileDerived(model),
  unitOf: (model) => profileUnit(profileMarks(model)),
  scene: (model, args) => profileScene({ ...model, ...args, variant: args.variant ?? model.variant }),
};
