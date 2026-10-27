// The Units → groups family adapter (craft/gestures/GRAMMAR.md §4, F5): one mark per counted thing, gathered into
// groups by a partition fixed for the whole beat (histogram bins, pictogram blocks); a group's value is the COUNT of
// its units. The gesture core sees one mark per group — { name, value: count, key } — and the units are drawing
// detail (a bar's length, a block's squares). Pure arithmetic, browser-safe: no Node module.
//
// What this module owns:
//   - the partition, built once from beat.mjs (`partitionOf`), adapting to the data's shape and never refusing it:
//     a first edge above the smallest reading moves down, an open tail holding a quarter of the readings gains bins,
//     a reading no block holds is counted in a stated remainder;
//   - the marks the core validates (`unitMarks`), the claim it reads (`unitsClaim`), and the family's own checks
//     (`unitHooks`: figures a gesture draws — edges, a threshold's counts and shares — and refusals);
//   - the picture state (`createUnits`) with the family's locks (`no-change-bin-edge`, conservation);
//   - the row geometry every format draws (`layoutRows`): one row per group, its mark after a name gutter, a
//     histogram's bar of length ∝ count or a pictogram's squares, ONE cell size for every block (`no-scale-icon-carry`);
//   - `stageUnits`: the core + hooks + repair loop every format runner calls.
//
// A `reference` here is a rule at an EDGE of the partition (a bin edge, a block boundary): its value lives on the
// readings' axis, not on the count axis. It is handed to the core as `at` (its `value` a label), so the core's
// count-axis checks never read it as a count; the family checks its note itself (a core hook would be cleaner).
import { applyFix, figuresIn, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

/** The gestures the family draws in all four formats (GRAMMAR.md §6, F5 column; zoom and reorder are refused). */
export const UNIT_GESTURES = ["highlight", "name", "annotate", "bracket", "compare", "reference", "filter", "count", "reveal", "pull-back"];

FAMILIES.units ??= { gestures: UNIT_GESTURES, additive: true };

export const FAMILY = "units";
export const VARIANTS = ["histogram", "pictogram-isotype"];

const round9 = (v) => Math.round(v * 1e9) / 1e9;

// ── the partition ─────────────────────────────────────────────────────────────────────────────────

/** The readings beat.mjs gives: `units` ({ name | label, value }), or a histogram's `observations`. */
export function readingsOf(beat) {
  const list = beat.units ?? beat.observations ?? [];
  return list
    .map((u, i) => ({ name: String(u.name ?? u.label ?? u.key ?? `#${i + 1}`), key: u.key, value: Number(u.value) }))
    .filter((u) => Number.isFinite(u.value));
}

/**
 * The groups, fixed for the beat. Histogram: `binStart`, `binWidth`, `binCount` (the last bin open), `formatEdge`.
 * Pictogram: `blocks` [{ key, name, min?, max? }] in drawing order (a unit goes to the first block whose
 * `min <= value < max`). Returns { groups, total, edges, adapted } — `adapted` lists every adaptation, said aloud.
 */
export function partitionOf(beat, variant) {
  const units = readingsOf(beat);
  const adapted = [];
  if (variant === "histogram") {
    const values = units.map((u) => u.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    let width = Number(beat.binWidth);
    if (!(width > 0)) {
      width = niceWidth((max - min) / 8 || 1);
      adapted.push(`binWidth ${beat.binWidth} is not a positive number: bins ${width} wide`);
    }
    let start = Number.isFinite(Number(beat.binStart)) ? Number(beat.binStart) : Math.floor(min / width) * width;
    if (start > min) {
      const lower = round9(Math.floor(min / width) * width);
      adapted.push(`the first edge ${start} sat above the smallest reading ${min}: it moves to ${lower}`);
      start = lower;
    }
    let count = Math.round(Number(beat.binCount));
    if (!(count >= 1)) {
      count = Math.max(1, Math.ceil((max - start) / width + 1e-9));
      adapted.push(`binCount was not a whole number: ${count} bins`);
    }
    count = Math.min(count, 40);
    const edge = (i) => round9(start + i * width);
    const tailOf = (n) => values.filter((v) => v >= edge(n - 1)).length;
    while (count < 40 && tailOf(count) > values.length * 0.25 && edge(count) <= max) {
      count += 1;
      adapted.push(`the open last bin held more than a quarter of the readings: ${count} bins`);
    }
    const fe = typeof beat.formatEdge === "function" ? (v) => String(beat.formatEdge(v)) : (v) => String(round9(v));
    let names = Array.from({ length: count }, (_, i) => (i === count - 1 ? `${fe(edge(i))}+` : `${fe(edge(i))}–${fe(edge(i + 1))}`));
    if (new Set(names).size < names.length) {
      names = names.map((_, i) => (i === count - 1 ? `${round9(edge(i))}+` : `${round9(edge(i))}–${round9(edge(i + 1))}`));
      adapted.push("formatEdge printed two bins alike: their edges print in full");
    }
    const groups = names.map((name, i) => {
      const lo = edge(i);
      const hi = i === count - 1 ? Infinity : edge(i + 1);
      const members = units.filter((u) => u.value >= lo && (i === count - 1 || u.value < hi)).sort((a, b) => b.value - a.value);
      return { name, key: name.replace(/–/g, "-"), lo, hi, open: i === count - 1, count: members.length, units: members };
    });
    return { groups, total: units.length, edges: groups.slice(1).map((g) => g.lo), adapted, format: fe };
  }

  const blocks = Array.isArray(beat.blocks) && beat.blocks.length ? beat.blocks : [{ key: "all", name: beat.unitThing ?? "all" }];
  const lo = (b) => (Number.isFinite(Number(b.min)) && b.min !== null && b.min !== undefined ? Number(b.min) : -Infinity);
  const hi = (b) => (Number.isFinite(Number(b.max)) && b.max !== null && b.max !== undefined ? Number(b.max) : Infinity);
  const placed = new Set();
  const groups = blocks.map((b, i) => {
    const members = units.filter((u) => !placed.has(u) && u.value >= lo(b) && u.value < hi(b)).sort((a, b2) => b2.value - a.value);
    members.forEach((u) => placed.add(u));
    const name = String(b.name ?? b.key ?? `block ${i + 1}`);
    return { name, key: String(b.key ?? name), lo: lo(b), hi: hi(b), open: false, count: members.length, units: members };
  });
  const overlap = units.filter((u) => blocks.filter((b) => u.value >= lo(b) && u.value < hi(b)).length > 1);
  if (overlap.length) adapted.push(`${overlap.length} unit(s) fall in two blocks' ranges: each is counted once, in the first`);
  const homeless = units.filter((u) => !placed.has(u));
  if (homeless.length) {
    const name = String(beat.restName ?? "other");
    groups.push({ name, key: "rest", lo: -Infinity, hi: Infinity, open: false, count: homeless.length, units: homeless.sort((a, b) => b.value - a.value), rest: true });
    adapted.push(`${homeless.length} unit(s) fall in no block's range: counted in a stated "${name}" group`);
  }
  // A block boundary is an edge when one block ends exactly where another begins.
  const edges = [...new Set(groups.flatMap((g) => [g.lo, g.hi]).filter(Number.isFinite))].filter(
    (e) => groups.some((g) => g.lo === e) && groups.some((g) => g.hi === e),
  );
  return { groups, total: units.length, edges, adapted, format: (v) => String(round9(v)) };
}

function niceWidth(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((w) => w >= raw) ?? 10 * p;
}

/** The marks the core validates: one per group, its value the count of its units. */
export const unitMarks = (groups) => groups.map((g) => ({ name: g.name, value: g.count, key: g.key }));

// ── the claim ─────────────────────────────────────────────────────────────────────────────────────

// The core's rate test (gesture-core.mjs `RATE`, not exported). A histogram of a rate per person still COUNTS
// countries, and counts add up: the core would refuse every bracket and count on "tonnes per person".
const RATE = /(?<![\p{L}])(per|pour|par|na|pro|je|por)(?![\p{L}])\s+(\d[\d ,. ]*\s*)?(resident|inhabitant|capita|person|people|head|habitant|mieszkań|einwohner|kopf|habitante|\d)\p{L}*|per capita|przeliczeniu|par habitant|pro kopf|\brate\b|wskaźnik/giu;

/**
 * The claim the core reads, for a family whose marks are counts: the readings' rate words are masked (the marks are
 * counts of units, which add up), and every group's edges are its facts (so a note naming a bin's edge, "under 4
 * tonnes", "above 75 %", states a figure of that group).
 */
export function unitsClaim(claim, groups) {
  const mask = (t) => (t === undefined ? t : String(t).replace(RATE, " "));
  const facts = { ...(claim.facts ?? {}) };
  for (const g of groups) facts[g.name] = [g.lo, g.hi].filter(Number.isFinite);
  // A takeaway rarely names a bin or a block ("6 countries in 10 emit under 4 tonnes"): the group whose count, or
  // whose share of the whole in per cent or in tenths, is a figure the takeaway states is the group it is about.
  const total = groups.reduce((s, g) => s + g.count, 0) || 1;
  const stated = figuresIn(mask(claim.takeaway)).map((n) => n.value);
  const near = (t, f) => Math.abs(t - f) <= Math.max(0.5, Math.abs(t) * 0.005);
  const about = groups.filter((g) => g.count > 0 && stated.some((t) => near(t, g.count) || near(t, (g.count / total) * 100) || near(t, (g.count / total) * 10))).map((g) => g.name);
  const entity = [claim.entity, ...about].filter(Boolean).join(" · ") || undefined;
  return { ...claim, takeaway: mask(claim.takeaway), subject: mask(claim.subject), comparison: mask(claim.comparison), unit: undefined, facts, entity };
}

// ── the family's own checks (validateGestures hooks) ──────────────────────────────────────────────

const RANK_WORDS = [
  [/(?<![\p{L}])(highest|largest|biggest|greatest|most|top|first|le plus|la plus|premier|première)(?![\p{L}])/iu, (r) => r === 1],
  [/(?<![\p{L}])(lowest|smallest|least|fewest|bottom|last|le moins|la moins|dernier|dernière)(?![\p{L}])/iu, (r, n) => r === n],
  [/(?<![\p{L}])(second|deuxième)(?![\p{L}])/iu, (r) => r === 2],
  [/(?<![\p{L}])(third|troisième)(?![\p{L}])/iu, (r) => r === 3],
];

/** A "6 in 10" / "6 sur 10" / "6 of 10" reading: the 10 is the base of a share stated in tenths. */
const TENTHS = /\d+\s+(?:[\p{L}'’]+\s+){0,3}(in|of|out of|sur|de|na|von|em|en|z)\s+10(?!\d)/iu;

/**
 * The hooks validateGestures runs on each gesture. `figures` adds what a units gesture draws beyond the core's:
 * the edges of every group it acts on, and for a reference the counts on each side of its edge and their shares.
 * `refuse` holds the family's rules: a reference sits on an edge of the partition (`no-change-bin-edge`), a count
 * counts units — never the number of groups —, a rank word holds by count, and a pictogram rule falls between two
 * blocks that sit together.
 */
export function unitHooks({ groups, edges, total, units }) {
  const byName = new Map(groups.map((g) => [g.name, g]));
  const values = units ?? groups.flatMap((g) => g.units.map((u) => u.value));
  const sideOf = (at) => {
    const below = values.filter((v) => v < at).length;
    return { below, above: total - below };
  };
  const nearestEdge = (v) => edges.reduce((p, e) => (Math.abs(e - v) < Math.abs(p - v) ? e : p), edges[0]);
  return {
    figures(g, ctx) {
      const out = [];
      for (const m of ctx.marks) {
        const grp = byName.get(m);
        if (grp) out.push(...[grp.lo, grp.hi].filter(Number.isFinite));
      }
      const tenths = TENTHS.test(String(g.note ?? ""));
      if (g.do === "reference" && Number.isFinite(Number(g.at))) {
        const { below, above } = sideOf(Number(g.at));
        out.push(Number(g.at), below, above, total, (below / total) * 100, (above / total) * 100, (below / total) * 10, (above / total) * 10);
        if (tenths) out.push(10);
      }
      if (g.do === "bracket" && g.of === "whole") {
        const s = ctx.marks.reduce((t, m) => t + (ctx.valueOf.get(m) ?? 0), 0);
        out.push((s / total) * 10, total);
        if (tenths) out.push(10);
      }
      if (g.do === "count") {
        const s = (ctx.marks.length ? ctx.marks : groups.map((x) => x.name)).reduce((t, m) => t + (ctx.valueOf.get(m) ?? 0), 0);
        out.push((s / total) * 100, (s / total) * 10);
        if (tenths) out.push(10);
      }
      return out;
    },
    refuse(g, ctx) {
      const i = ctx.index;
      if (g.do === "reference") {
        const at = Number(g.at);
        if (!edges.length)
          throw new GestureRefusal(`gestures[${i}]`, `this partition has no edge between two groups to rule a line at: drop the reference`, { remove: i });
        if (!Number.isFinite(at) || !edges.some((e) => Math.abs(e - at) < 1e-9)) {
          const best = nearestEdge(Number.isFinite(at) ? at : edges[Math.floor(edges.length / 2)]);
          throw new GestureRefusal(
            `gestures[${i}].value`,
            `${g.at ?? "no value"} is not an edge of the groups (no-change-bin-edge: a rule between edges would re-bin the readings); the edges are ${edges.join(", ")}: give value ${best}, or choose binWidth / blocks so the takeaway's cut is an edge`,
            { set: { index: i, field: "value", value: best } },
          );
        }
        const order = groups.map((x) => x.name);
        const above = groups.findIndex((x) => x.lo === at);
        const below = groups.findIndex((x) => x.hi === at);
        if (Math.abs(above - below) !== 1)
          throw new GestureRefusal(
            `gestures[${i}]`,
            `the blocks on either side of ${at} (${order[below]}, ${order[above]}) do not sit together, so no rule can fall between them: drop the reference, or order the blocks by their ranges`,
            { remove: i },
          );
        // The rule's words: every number is the edge, a count on one side of it, the whole, or a share of it. Checked
        // here because the core reads a rule's level on the count axis, where an edge is no figure.
        if (g.note !== undefined) {
          const { below: b, above: a } = sideOf(at);
          const own = [at, b, a, total, (b / total) * 100, (a / total) * 100, (b / total) * 10, (a / total) * 10, ...(TENTHS.test(g.note) ? [10] : [])];
          for (const n of figuresIn(g.note)) {
            if (own.some((f) => Math.abs(n.value - f) <= 0.5 * 10 ** -n.decimals + 1e-9)) continue;
            const best = own.reduce((p, f) => (Math.abs(f - n.value) < Math.abs(p - n.value) ? f : p), own[0]);
            if (Math.abs(best - n.value) > Math.abs(n.value) * 0.5)
              throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, which the rule at ${at} does not draw (${b} below, ${a} at or above, of ${total}): drop the note`, {
                set: { index: i, field: "note", value: undefined },
              });
            const text = best.toFixed(n.decimals).replace(".", n.separator === "," ? "," : ".");
            const fixed = g.note.slice(0, n.index) + text + g.note.slice(n.index + n.raw.length);
            throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, but the rule at ${at} gives ${text}: write "${fixed}"`, { set: { index: i, field: "note", value: fixed } });
          }
        }
      }
      if (g.do === "count" && g.note !== undefined) {
        const counted = ctx.marks.length ? ctx.marks : groups.map((x) => x.name);
        const units_ = counted.reduce((t, m) => t + (ctx.valueOf.get(m) ?? 0), 0);
        for (const n of figuresIn(g.note)) {
          if (n.percent) continue;
          const groupsCount = counted.length;
          const near = (f) => Math.abs(n.value - f) <= 0.5 * 10 ** -n.decimals + 1e-9;
          if (near(groupsCount) && !near(units_) && !near(total) && !counted.some((m) => [byName.get(m)?.lo, byName.get(m)?.hi].some((e) => Number.isFinite(e) && near(e))))
            throw new GestureRefusal(
              `gestures[${i}].note`,
              `states ${n.raw}, the number of groups counted, but a count counts the units in them (${units_}): drop the note, or state ${units_}`,
              { set: { index: i, field: "note", value: undefined } },
            );
        }
      }
      if (["name", "annotate", "highlight"].includes(g.do) && ctx.marks.length === 1 && g.note !== undefined) {
        const ranked = [...groups].sort((a, b) => b.count - a.count).map((x) => x.name);
        const rank = ranked.indexOf(ctx.marks[0]) + 1;
        for (const [word, holds] of RANK_WORDS) {
          if (!word.test(g.note) || holds(rank, groups.length)) continue;
          throw new GestureRefusal(
            `gestures[${i}].note`,
            `calls ${ctx.marks[0]} ${g.note.match(word)[0]}, but it holds the ${rank}${["st", "nd", "rd"][rank - 1] ?? "th"} largest count of ${groups.length} groups: drop the word`,
            { set: { index: i, field: "note", value: g.note.replace(word, "").replace(/\s{2,}/g, " ").trim() } },
          );
        }
      }
    },
  };
}

/**
 * The list the core sees: a reference's `value` (an edge on the readings' axis) travels as `at`. Indexes are kept,
 * so every fix applies to the model's own list.
 */
export function forCore(gestures, groups) {
  if (!Array.isArray(gestures)) return gestures;
  return gestures.map((g) => {
    if (!g || g.do !== "reference") return g;
    // `value` becomes a label the core cannot read as a count (two rules at two edges stay two gestures).
    return { ...g, at: g.value, value: `edge ${g.value}` };
  });
}

/**
 * The core, the family hooks and the format's own scheduler, with the repair loop (SPLASH_GESTURE_REPAIR): each
 * refusal's fix is applied to the model's own list and the list staged again, at most `steps` times.
 *
 * @param schedule (valid, entities) → the format's scheduled picture (may throw a GestureRefusal)
 */
export function stageUnits({ gestures, partition, claim, format, schedule, repair = false, steps = 12 }) {
  const { groups, edges, total } = partition;
  const rows = unitMarks(groups);
  const hooks = unitHooks({ groups, edges, total });
  const told = unitsClaim(claim, groups);
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid, entities } = validateGestures({ gestures: forCore(list, groups), rows, family: FAMILY, format, claim: told, hooks });
      return { gestures: list, valid, entities, rows, scheduled: schedule(valid, entities), repairs, claim: told };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix, message: error.message });
      list = applyFix(list, error.fix);
    }
  }
}

/** A refusal as the runners print it: the field, what is wrong, and a value that works. */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

// ── the picture state and the family's locks ──────────────────────────────────────────────────────

/** A reference gesture's edge (the core's copy carries it as `at`). */
export const edgeOf = (g) => Number(g.at ?? g.value);

/** validateGestures merged `of` rows into `marks`: the gesture's own rows first. */
export function splitMarks(g) {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
}

/**
 * The Units picture: { emphasis, shown, bracket, compare, reference, partition }. `shown` maps a group to the units
 * of it drawn (a reveal or a count fills groups at ONE pace — `no-let-blocks-count`); `partition` is the edges'
 * signature, which no state may change (`no-change-bin-edge`).
 */
export function createUnits({ groups }) {
  const signature = JSON.stringify(groups.map((g) => [g.name, g.lo, g.hi, g.count]));
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const total = groups.reduce((s, g) => s + g.count, 0);
  const rest = () => ({ emphasis: {}, shown: Object.fromEntries(groups.map((g) => [g.name, g.count])), bracket: null, compare: null, reference: null, partition: signature });
  const with_ = (state, patch) => ({ ...state, ...patch, emphasis: { ...state.emphasis, ...(patch.emphasis ?? {}) }, shown: { ...state.shown, ...(patch.shown ?? {}) } });
  /** Every group filled to `t` of the largest group's count: the j-th unit of every group lands together. */
  const filled = (t) => {
    const max = Math.max(1, ...groups.map((g) => g.count));
    return Object.fromEntries(groups.map((g) => [g.name, Math.min(g.count, Math.floor(t * max + 1e-9))]));
  };
  function invariants(states) {
    states.forEach((s, i) => {
      if (s.partition !== signature) throw new Error(`state ${i} draws other groups than the beat's partition (no-change-bin-edge)`);
      for (const [name, n] of Object.entries(s.shown)) if (!(n >= 0 && n <= countOf.get(name))) throw new Error(`state ${i} draws ${n} units in ${name}, which holds ${countOf.get(name)} (conservation)`);
    });
  }
  function derive(op, ids) {
    const v = ids.map((id) => countOf.get(id));
    switch (op) {
      case "sum":
      case "count":
        return v.reduce((t, x) => t + x, 0);
      case "diff":
        return v[0] - v[1];
      case "ratio":
        return v[0] / v[1];
      case "share":
        return v.reduce((t, x) => t + x, 0) / total;
      case "rank":
        return [...groups].sort((a, b) => b.count - a.count).findIndex((g) => g.name === ids[0]) + 1;
      default:
        throw new Error(`no ${op} on the Units family`);
    }
  }
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return { family: FAMILY, rest, with: with_, filled, invariants, derive, equal, total, units: () => groups.flatMap((g) => g.units), count: (id) => countOf.get(id) };
}

// ── the geometry every format draws ───────────────────────────────────────────────────────────────

/**
 * One row per group, top to bottom in the partition's order: a name gutter, then the group's mark — a histogram's bar
 * of length ∝ count on one count scale, or a pictogram's squares in lines of `perLine`, ONE cell size for every block
 * — then whatever the caller prints after it. `laid` is every count a gesture lays (a compare's copy), so the scale
 * or the lines hold the longest.
 *
 * @returns { pitch, band, x0, span, cell, perLine, lines, rows: [{ name, top, mid, band, end(n) , cells(n) }] }
 */
export function layoutRows({ groups, variant, box, gutter, laid = [], gap = 0.22 }) {
  const n = Math.max(1, groups.length);
  const pitch = box.height / n;
  const band = Math.max(1, pitch * (1 - gap));
  const x0 = box.x + gutter;
  const span = Math.max(1, box.width - gutter);
  const max = Math.max(1, ...groups.map((g) => g.count), ...laid);
  let cell = 0;
  let perLine = max;
  let lines = 1;
  if (variant !== "histogram") {
    // The largest square for which the largest count fits in the band: lines of `perLine`, square cells.
    for (let s = Math.min(band, 40); s >= 1.5; s -= 0.25) {
      const per = Math.max(1, Math.floor(span / s));
      const l = Math.ceil(max / per);
      if (l * s <= band + 1e-9) {
        cell = s;
        perLine = per;
        lines = l;
        break;
      }
    }
    if (!cell) {
      cell = 1.5;
      perLine = Math.max(1, Math.floor(span / cell));
      lines = Math.ceil(max / perLine);
    }
  }
  const rows = groups.map((g, i) => {
    const top = box.y + i * pitch + (pitch - band) / 2;
    const bandTop = variant === "histogram" ? top : top + (band - lines * cell) / 2;
    return {
      name: g.name,
      top,
      mid: top + band / 2,
      band,
      /** where a run of `k` units ends, along the row */
      end: (k) => (variant === "histogram" ? x0 + (k / max) * span : x0 + Math.min(k, perLine) * cell),
      /** the k-th unit's square (pictogram) */
      cellAt: (k) => ({ x: x0 + (k % perLine) * cell, y: bandTop + Math.floor(k / perLine) * cell, size: cell }),
      bandTop,
      bandHeight: variant === "histogram" ? band : lines * cell,
    };
  });
  return { pitch, band, x0, span, cell, perLine, lines, max, rows };
}

/** The readings on each side of an edge, for a rule's words. */
export function sidesOf(partition, at) {
  const values = partition.groups.flatMap((g) => g.units.map((u) => u.value));
  const below = values.filter((v) => v < at).length;
  return { below, above: partition.total - below };
}

// ── what the runners check before drawing ─────────────────────────────────────────────────────────

/** What check() is handed: the counted groups, each group's count by its key, the number of units. */
export function checkContext(partition) {
  const counts = Object.fromEntries(partition.groups.map((g) => [g.key, g.count]));
  for (const g of partition.groups) counts[g.name] ??= g.count;
  return { groups: partition.groups, bins: partition.groups, counts, total: partition.total };
}

/** beat.check({ groups, counts, total }), its refusal saying which side may be wrong (guards.mjs `runCheck`). */
export function runUnitsCheck(beat, partition) {
  try {
    beat.check(checkContext(partition));
  } catch (error) {
    throw new Error(`check() threw: ${error?.message ?? error}. If that is what the takeaway says, check() is inverted: it must throw only when the data contradicts the takeaway — fix its condition, not the data`);
  }
}

/**
 * Every figure the plate can state about its groups: each count, the total, the edges, and every run of groups
 * that sit together added up, with its share in per cent and in tenths ("6 in 10").
 */
export function headlineFigures(partition) {
  const { groups, total } = partition;
  const out = [total, ...groups.map((g) => g.count), ...partition.edges];
  for (let i = 0; i < groups.length; i++)
    for (let j = i, run = 0; j < groups.length; j++) {
      run += groups[j].count;
      out.push(run, (run / total) * 100, (run / total) * 10);
    }
  return out;
}
