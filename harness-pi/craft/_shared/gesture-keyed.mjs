// The engine the "misfit" families share (craft/gestures/GRAMMAR.md §4, row "misfits"): interval (gantt), multiples
// (small multiples over Length bars), flow (sankey) and profile (parallel coordinates, radar). Their geometries differ,
// their staging does not: a mark is one drawn reading `{ name, value, key?, series? }` — a gantt row, "panel · bar",
// "source → target", "entity · axis" — and every gesture they admit acts on marks by emphasis (accent, ring, step back,
// appear) or lays an overlay (a note, a compare's copy or link, a bracket's figure, a reference rule). Nothing moves
// position: none of these families admits zoom, rescale or reorder, so "one scale for everything compared, every state"
// and "order of parts fixed" (GRAMMAR §8) hold by construction, and are checked anyway (`assertLocks`).
//
// ONE STATE SHAPE FOR EVERY FORMAT: a flat record of finite numbers, per drawn mark i `a<i>` (accent), `r<i>` (ring),
// `b<i>` (stepped back), `s<i>` (shown), per gesture k `n<k>` (its note shown), `o<k>` (its overlay shown). The static
// plate draws the last state, the web page one state per plate, the video interpolates between event states, the
// scrolly page between card states (the drive below). Each family file supplies the marks, its admissible gestures,
// its figures (hooks) and how a gesture's emphasis spreads (`unitOf`: a radar's entity is all its spokes).
//
// Browser-safe: no Node module. The drive (`applyKeyedState`) is one self-contained function, inlined by toString().
import { applyFix, figuresIn, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { checkCards } from "./gesture-scrolly.mjs";

const fold = (s) => String(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const words = (s) => ` ${fold(s).replace(/[^\p{L}\p{N}]+/gu, " ")} `;

/**
 * The claim the core reads, with every series and key the journalist's words name expanded to the marks it holds. The
 * core finds the takeaway's entities among mark NAMES ("Germany · Coal"); a takeaway says "Germany". Without this a
 * keyed family had no entity and every gesture was refused as serving nothing (core change requested in the report).
 */
export function keyedClaim(claim = {}, marks = []) {
  const groups = new Map();
  for (const m of marks)
    for (const g of [m.series, m.key]) if (g !== undefined && g !== null && String(g).trim()) (groups.get(String(g)) ?? groups.set(String(g), []).get(String(g))).push(m.name);
  const named = (text) => {
    const hay = words(text ?? "");
    return [...groups.keys()]
      .map((g) => ({ g, at: hay.indexOf(words(g)) }))
      .filter((x) => x.at >= 0)
      .sort((p, q) => p.at - q.at)
      .map((x) => x.g);
  };
  const expand = (text) => named(text).flatMap((g) => groups.get(g));
  const out = { ...claim };
  const extra = [...new Set([...expand(claim.takeaway), ...expand(claim.subject), ...expand(claim.comparison)])];
  if (extra.length) out.subject = [claim.subject, ...extra].filter(Boolean).join(" ; ");
  // The entity: the recorded claim entity, else the first group the takeaway (then the subject) names.
  const first = named(claim.entity)[0] ?? named(claim.takeaway)[0] ?? named(claim.subject)[0];
  if (first !== undefined && !marks.some((m) => fold(m.name) === fold(claim.entity ?? ""))) out.entity = groups.get(first).join(" ; ");
  if (claim.versus && named(claim.versus).length) out.versus = expand(claim.versus).join(" ; ");
  return out;
}

/** Facts per mark: the data's own (rowFacts, by the row's name) plus the family's derived figures (a flow's share). */
export function keyedFacts(facts = {}, marks = [], derived = () => [], shared = []) {
  const out = { ...facts };
  for (const m of marks) out[m.name] = [...(facts[m.name] ?? []), ...(m.series !== undefined ? facts[m.series] ?? [] : []), ...derived(m), ...shared].filter(Number.isFinite);
  return out;
}

/** The marks a gesture's name stands for, the way the core resolves them (a mark, a key, a series). */
export function groupOf(marks, name) {
  const exact = marks.filter((m) => fold(m.name) === fold(name));
  if (exact.length) return exact.map((m) => m.name);
  return marks.filter((m) => (m.series !== undefined && fold(m.series) === fold(name)) || (m.key !== undefined && fold(m.key) === fold(name))).map((m) => m.name);
}

const split = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/**
 * The family's own refusals every keyed family shares: a compare needs two distinct readings on one scale.
 * `sameScale(a, b)` says whether two marks are drawn on one value scale (a parallel coordinate's axes are not).
 */
export function keyedHooks({ figures, refuse, sameScale } = {}) {
  return {
    figures: (g, ctx) => [...(figures?.(g, ctx) ?? [])],
    refuse(g, ctx) {
      if (g.do === "compare" && sameScale) {
        const [a, ...rest] = ctx.marks;
        const off = rest.find((b) => !sameScale(a, b));
        if (off !== undefined)
          throw new GestureRefusal(`gestures[${ctx.index}].marks`, `${a} and ${off} are not drawn on one scale, so laying one against the other draws a false gap: compare ${a} with a reading on its own axis`, {
            remove: ctx.index,
          });
      }
      refuse?.(g, ctx);
    },
  };
}

/**
 * Validates the list against the family's marks: the core (with the keyed claim and facts), then the keyed checks every
 * format shares. `coreFormat` lets a format whose geometry has no rows-in-a-run (a sankey's bracket gathers links at a
 * node) skip the core's static contiguity rule; every other check is the format's own.
 */
export function validateKeyed({ gestures, marks, family, format, claim, hooks = {}, derived, coreFormat = format }) {
  // The takeaway's own figures (the "10" of a top ten, a threshold) are the journalist's, held to the data by check():
  // a note or card may state them beside any mark. Years are not figures (figuresIn).
  const facts = keyedFacts(claim?.facts, marks, derived, figuresIn(claim?.takeaway ?? "").map((n) => n.value));
  const expanded = { ...keyedClaim(claim, marks), facts };
  // A web page with nothing to ask for: the core's own fix adds a bracket, which a family whose values do not add up
  // refuses again; this one adds a filter onto the claim's own marks, which every keyed family draws.
  if (format === "web" && Array.isArray(gestures) && gestures.length && gestures.every((g) => WEB_RESTING.has(g?.do))) {
    const named = gestures.flatMap((g) => [g.mark, ...(Array.isArray(g.marks) ? g.marks : [g.marks])]).filter((m) => typeof m === "string");
    const keep = [...new Set(named.flatMap((m) => groupOf(marks, m)))];
    const fixMarks = keep.length && keep.length < marks.length ? [...new Set(named)] : [marks[0].name];
    throw new GestureRefusal("gestures", `a web page needs at least one gesture a reader asks for (${["filter", "compare", "bracket"].join(", ")}); every gesture here rests on the page`, {
      add: { at: gestures.length, gesture: { do: "filter", marks: fixMarks } },
    });
  }
  const result = validateGestures({ gestures, rows: marks, family, format: coreFormat === format ? format : coreFormat, claim: expanded, hooks });
  if (coreFormat !== format && format === "video") throw new Error("video is validated as video");
  return { ...result, claim: expanded };
}

/** The repair loop every format runs: refuse, or with `repair` apply each fix to the model's own list (≤ steps). */
export function stageKeyed({ gestures, repair = false, steps = 12, run }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      return { ...run(list), gestures: list, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

/**
 * Folds the validated list into states. Returns the base state (before any gesture), the state after each gesture,
 * and one plan item per gesture: what its overlay draws, in words the components can print.
 *
 * @param unitOf   (markName) → the marks a highlight of it lights (a radar entity's spokes); default the mark itself
 * @param entities the takeaway's marks (validateGestures' `entities`): a highlight on them takes the accent, on any
 *                 other mark a ring — one accent carries the subject
 */
export function foldKeyed({ gestures, marks, entities = [], format = String, unitOf = (m) => [m] }) {
  const names = marks.map((m) => m.name);
  const at = new Map(names.map((n, i) => [n, i]));
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const sum = (list) => list.reduce((s, n) => s + valueOf.get(n), 0);
  const whole = sum(names);
  const entity = new Set(entities);
  const reveal = gestures.some((g) => g.do === "reveal");

  const base = {};
  names.forEach((_, i) => Object.assign(base, { [`a${i}`]: 0, [`r${i}`]: 0, [`b${i}`]: 0, [`s${i}`]: reveal ? 0 : 1 }));
  gestures.forEach((_, k) => Object.assign(base, { [`n${k}`]: 0, [`o${k}`]: 0 }));
  // The subject carries the accent from the start: the first entity a gesture acts on, else the first mark acted on.
  const subject = gestures.flatMap((g) => g.marks).find((m) => entity.has(m)) ?? gestures.find((g) => g.marks.length)?.marks[0];
  const accented = new Set(subject === undefined ? [] : unitOf(subject));
  for (const m of accented) base[`a${at.get(m)}`] = 1;

  let state = base;
  const after = [];
  const plan = [];
  gestures.forEach((g, k) => {
    const { own, of } = split(g);
    const next = { ...state, [`n${k}`]: g.note === undefined ? 0 : 1, [`o${k}`]: 1 };
    // A gesture shows what it acts on, even before a reveal reaches it.
    for (const m of g.marks) next[`s${at.get(m)}`] = 1;
    const note = g.note === undefined || !String(g.note).trim() ? undefined : String(g.note);
    // A note on a set (a highlight or filter of several marks) sits at its last mark, clear of the set's own marks.
    const item = { k, do: g.do, own, of, note, anchor: ["highlight", "filter"].includes(g.do) ? own.at(-1) : own[0], shown: [] };
    switch (g.do) {
      case "highlight": {
        // One accent carries the subject: a highlight whose set holds the subject lights every claim mark of that set
        // (the six rows that never left); a highlight of another entity alone rings it (the comparison, never a second
        // accent).
        const lit = own.some((m) => accented.has(m));
        // A whole group (a radar's profile, a panel) highlighted beside the subject is ringed as ONE outline — the
        // family draws it as this gesture's overlay — not as a ring on each of its marks.
        const groups = lit ? [] : [...new Set(own.map((m) => unitOf(m).join("\u0000")))].map((g) => g.split("\u0000")).filter((g) => g.length > 1 && g.every((m) => own.includes(m)));
        const outlined = new Set(groups.flat());
        if (groups.length) item.ringed = groups;
        for (const m of own) {
          const accent = accented.has(m) || (lit && entity.has(m));
          if (!accent && outlined.has(m)) continue;
          for (const u of accent ? unitOf(m) : [m]) next[`${accent ? "a" : "r"}${at.get(u)}`] = 1;
        }
        item.shown = own.map((m) => valueOf.get(m));
        break;
      }
      case "name":
        next[`r${at.get(own[0])}`] = 1;
        next[`n${k}`] = 1;
        item.note = note ?? `${own[0]} ${format(valueOf.get(own[0]))}`;
        item.shown = [valueOf.get(own[0])];
        break;
      case "annotate":
        next[`n${k}`] = 1;
        item.note = note ?? format(valueOf.get(own[0]));
        item.shown = [valueOf.get(own[0])];
        break;
      case "filter":
        names.forEach((n, i) => (next[`b${i}`] = own.includes(n) ? 0 : 1));
        item.shown = own.map((m) => valueOf.get(m));
        break;
      case "compare": {
        const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names.filter((n) => n !== own[0]) : of;
        const a = valueOf.get(own[0]);
        const b = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
        for (const m of against) next[`s${at.get(m)}`] = 1;
        Object.assign(item, { against, a, b, ratio: b ? a / b : undefined, shown: [a, b], label: note ?? `${format(a)} / ${format(b)}` });
        break;
      }
      case "bracket": {
        const ofWhole = own.length === 1 && g.of === "whole";
        const members = ofWhole ? own : [...own, ...of];
        const s = sum(own);
        const total = ofWhole ? whole : of.length ? sum(of) : s;
        Object.assign(item, { members, whole: ofWhole, sum: s, total, shown: [s], label: note ?? (ofWhole || of.length ? `${format(s)} / ${format(total)}` : `= ${format(s)}`) });
        for (const m of own) if (!accented.has(m) && !entity.has(m)) next[`r${at.get(m)}`] = 1;
        break;
      }
      case "reference":
        Object.assign(item, { value: Number(g.value), label: note ?? format(Number(g.value)), shown: [] });
        break;
      case "reveal":
        names.forEach((_, i) => (next[`s${i}`] = 1));
        break;
      case "pull-back":
        names.forEach((_, i) => Object.assign(next, { [`b${i}`]: 0, [`s${i}`]: 1 }));
        break;
      default:
        break;
    }
    // A compare's, bracket's or rule's words are its overlay's label, drawn with it: never a note on a mark.
    if (["compare", "bracket", "reference"].includes(g.do)) next[`n${k}`] = 0;
    plan.push(item);
    after.push(next);
    state = next;
  });
  return { base, after, plan, names, subject, whole };
}

/** The family's locks (GRAMMAR §8): no state moves a mark or a scale, so only emphasis and overlays may differ. */
export function assertLocks(states) {
  const allowed = /^[abrsno]\d+$/;
  for (const s of states)
    for (const [key, v] of Object.entries(s)) {
      if (!allowed.test(key)) throw new Error(`state field ${key} is not one a keyed family draws (a mark or a scale would move)`);
      if (!Number.isFinite(v)) throw new Error(`state field ${key} is ${v}, not a finite number`);
    }
}

// ── static ────────────────────────────────────────────────────────────────────────────────────────

/**
 * Every gesture on one plate: the last state, every note at once. A mark carries one note on a still plate (the
 * earlier gesture keeps it, the later note goes — the gesture stays), a note that only repeats the value printed on
 * its mark is not a second note.
 */
export function composeKeyedStatic({ gestures, marks, entities, format = String, unitOf, printsValue = () => false }) {
  const folded = foldKeyed({ gestures, marks, entities, format, unitOf });
  const noted = new Set();
  folded.plan.forEach((p, k) => {
    if (p.note === undefined || ["compare", "bracket", "reference"].includes(p.do)) return;
    // A whole-chart gesture's note is a caption line, not a mark's.
    const on = p.anchor ?? `#${k}`;
    if (printsValue(p.anchor) && p.do !== "highlight" && String(p.note).trim() === format(marks.find((m) => m.name === p.anchor)?.value)) return;
    if (noted.has(on))
      throw new GestureRefusal(`gestures[${k}].note`, `${on} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
        set: { index: k, field: "note", value: undefined },
      });
    noted.add(on);
  });
  const state = { ...(folded.after.at(-1) ?? folded.base) };
  // The plate shows every mark: a reveal or a pull-back ends on the whole chart, a filter's step-back stays drawn.
  folded.names.forEach((_, i) => (state[`s${i}`] = 1));
  gestures.forEach((g, k) => {
    const p = folded.plan[k];
    state[`o${k}`] = 1;
    state[`n${k}`] = p.note !== undefined && !["compare", "bracket", "reference"].includes(p.do) ? 1 : 0;
  });
  assertLocks([folded.base, ...folded.after, state]);
  return { ...folded, state };
}

// ── web ───────────────────────────────────────────────────────────────────────────────────────────

/** What each control-gesture becomes on the page (the chart-web atoms, interaction-plan.ts). */
export const KEYED_CONTROLS = {
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  bracket: { atom: "toggle-a-comparison", mechanism: "stack" },
};

function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * The resting state (every resting gesture at once, as the static plate draws them) and one control per further
 * gesture: its plate is the resting state plus that one gesture, never folded from another control.
 */
export function scheduleKeyedWeb({ gestures, marks, entities, format = String, unitOf }) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || KEYED_CONTROLS[g.do]) return;
    throw new GestureRefusal(`gestures[${i}].do`, `"${g.do}" has no web control on this page: stage it with ${Object.keys(KEYED_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: i });
  });
  const restingIdx = gestures.map((g, i) => (WEB_RESTING.has(g.do) ? i : -1)).filter((i) => i >= 0);
  const restingList = restingIdx.map((i) => gestures[i]);
  const rest = composeKeyedStatic({ gestures: restingList, marks, entities, format, unitOf });
  // The resting state, re-keyed to the whole list's gesture indices.
  const blank = foldKeyed({ gestures, marks, entities, format, unitOf });
  const resting = { ...blank.base };
  for (const [key, v] of Object.entries(rest.state)) {
    const m = key.match(/^([no])(\d+)$/);
    if (m) resting[`${m[1]}${restingIdx[Number(m[2])]}`] = v;
    else resting[key] = v;
  }
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));
  const at = new Map(marks.map((m, i) => [m.name, i]));
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);
  // A set of marks said in the reader's units: a whole key or series by its name ("Nucléaire"), else the marks.
  const say = (list) => {
    for (const field of ["key", "series"]) {
      const groups = [...new Set(marks.map((m) => m[field]).filter((x) => x !== undefined))];
      const whole = groups.filter((x) => marks.filter((m) => m[field] === x).every((m) => list.includes(m.name)));
      if (whole.length && list.every((n) => whole.includes(marks.find((m) => m.name === n)[field]))) return short(whole.map(String));
    }
    return short(list);
  };
  const controls = [];
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) return;
    const p = blank.plan[i];
    const state = { ...resting, [`o${i}`]: 1, [`n${i}`]: p.note !== undefined && g.do === "filter" ? 1 : 0 };
    const control = { index: i, do: g.do, ...KEYED_CONTROLS[g.do], note: p.note, state, plan: p };
    if (g.do === "filter") {
      const kept = marks.map((m) => m.name).filter((n) => p.own.includes(n));
      if (kept.length === marks.length)
        throw new GestureRefusal(`gestures[${i}]`, `filter keeps every drawn mark, so its control would change nothing in the picture: drop it`, { remove: i });
      marks.forEach((m, j) => (state[`b${j}`] = kept.includes(m.name) ? 0 : 1));
      // Said in the reader's units: whole groups (a panel, an entity) by their names, else the marks themselves.
      const series = [...new Set(marks.map((m) => m.series).filter((x) => x !== undefined))];
      const whole = series.filter((x) => marks.filter((m) => m.series === x).every((m) => kept.includes(m.name)));
      const grouped = series.length && whole.length && kept.every((n) => whole.includes(marks.find((m) => m.name === n).series));
      const said = grouped ? whole : kept;
      const of = grouped ? series.length : marks.length;
      Object.assign(control, {
        legend: grouped ? short(said) : say(kept),
        chip: `${said.length} / ${of}`,
        pieces: [`${said.length} / ${of}`, kept.map((n) => `${n} ${F(valueOf.get(n))}`).join(", ")],
        question: `What do ${short(said)} look like with the others stepped back?`,
        changes: "The marks outside the set step back to a faint trace; nothing moves and the scale stays.",
        parameter: `whether gestures[${i}] keeps only ${short(said)}`,
      });
    } else if (g.do === "compare") {
      for (const m of p.against) state[`s${at.get(m)}`] = 1;
      const label = say(p.against);
      Object.assign(control, {
        legend: `${p.own[0]} / ${label}`,
        chip: `${F(p.a)} / ${F(p.b)}`,
        pieces: [...(p.b ? [`${F(p.a)} / ${F(p.b)} = ${fx(p.a / p.b)} ×`] : []), `${F(p.a)} - ${F(p.b)} = ${F(p.a - p.b)}`],
        question: `How does ${p.own[0]} measure against ${label}?`,
        changes: `${label} is laid against ${p.own[0]} on the same scale, both figures printed.`,
        parameter: `whether gestures[${i}] lays ${label} against ${p.own[0]}`,
      });
    } else if (g.do === "bracket") {
      const pct = p.total ? `${fx((p.sum / p.total) * 100)} %` : null;
      Object.assign(control, {
        legend: p.whole ? `${p.own[0]} / ${F(p.total)}` : say(p.own),
        chip: p.whole || p.of.length ? `${F(p.sum)} / ${F(p.total)}` : `= ${F(p.sum)}`,
        pieces: [`${p.own.map((m) => F(valueOf.get(m))).join(" + ")} = ${F(p.sum)}`, ...(pct && (p.whole || p.of.length) ? [pct] : [])],
        question: `What do ${say(p.own)} add up to?`,
        changes: `The bracketed marks are picked out together and their sum is printed beside them.`,
        parameter: `whether the bracket of gestures[${i}] is drawn`,
      });
    }
    controls.push(control);
  });
  if (!controls.length)
    throw new GestureRefusal("gestures", "a web page needs at least one gesture a reader asks for (filter, compare or bracket)", { add: { at: gestures.length, gesture: { do: "filter", marks: [entities[0] ?? marks[0].name] } } });
  assertLocks([resting, ...controls.map((c) => c.state)]);
  return { resting, controls, plan: blank.plan, names: blank.names, restingIdx };
}

/** The interaction declaration renderWeb holds the page against (generated, never the model's). */
export function keyedInteractionPlan({ scheduled, marks, subject, what = "mark" }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: `What is this ${what} worth, and where does it rank?`,
    gesture: "ask-a-mark",
    changes: `The ${what} steps one shade toward the ink and the answer prints its value.`,
    parameter: `which ${what} is asked about`,
    authorPicked: subject ?? marks[0].name,
    readerPicks: "every mark",
    heldStill: HELD,
  };
  const controls = scheduled.controls.map((c) => ({
    question: c.question,
    gesture: c.atom,
    changes: c.changes,
    parameter: c.parameter,
    authorPicked: "on",
    readerPicks: ["rest", "on"],
    heldStill: HELD,
  }));
  return {
    earns: `A still of these ${marks.length} readings must draw every gesture at once and print a fixed set of figures. Here the reader lands on the resting picture and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every ${what} answers with its own value.`,
    controls: [ask, ...controls],
  };
}

// ── video ─────────────────────────────────────────────────────────────────────────────────────────

export const KEYED_EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

/**
 * Three gestures into the six events: establish (title card) and reference (the chart arriving) are the scheduler's,
 * then one gesture per event; the conclusion returns to the whole chart (a filter released, every mark shown) with
 * what was shown still marked. Each event's state is the end of its gesture; the frame eases between them.
 */
export function scheduleKeyedVideo({ gestures, marks, entities, format = String, unitOf }) {
  if (gestures.length !== 3) throw new GestureRefusal("gestures", `a video takes exactly 3 gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const folded = foldKeyed({ gestures, marks, entities, format, unitOf });
  const title = { ...folded.base, title: 1, chart: 0, credit: 0 };
  const reference = { ...folded.base, title: 0, chart: 1, credit: 0 };
  const steps = folded.after.map((s) => ({ ...s, title: 0, chart: 1, credit: 0 }));
  // A note shows during its own event only (one reading at a time); overlays, once laid, stay.
  const only = (s, k) => ({ ...s, n0: k === 0 ? s.n0 : 0, n1: k === 1 ? s.n1 : 0, n2: k === 2 ? s.n2 : 0 });
  const reveal = only(steps[0], 0);
  const subject = only(steps[1], 1);
  const conclusion = { ...only(steps[2], 2), credit: 1 };
  folded.names.forEach((_, i) => Object.assign(conclusion, { [`b${i}`]: 0, [`s${i}`]: 1 }));
  const states = [title, reference, reveal, subject, conclusion, { ...conclusion }];
  const strip = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !["title", "chart", "credit"].includes(k)));
  assertLocks(states.map(strip));
  return { states, plan: folded.plan, names: folded.names, events: KEYED_EVENTS };
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The state at a frame: eased between the previous event's end and this event's, a reveal staggered mark by mark. */
export function keyedStateAt({ states, timing, frame, events = KEYED_EVENTS }) {
  let i = 0;
  for (let e = 0; e < events.length; e++) if (frame >= timing[events[e]].start) i = e;
  const ev = timing[events[i]];
  const t = clamp01((frame - ev.start) / Math.max(1, ev.duration * 0.8));
  const from = i === 0 ? states[0] : states[i - 1];
  const to = states[i];
  const out = {};
  const shownKeys = Object.keys(to).filter((k) => /^s\d+$/.test(k));
  const rising = shownKeys.filter((k) => (from[k] ?? 0) < to[k]);
  for (const key of Object.keys(to)) {
    const a = from[key] ?? 0;
    const b = to[key];
    if (/^s\d+$/.test(key) && rising.length > 1 && rising.includes(key)) {
      // Marks appear one by one in their natural order (the order the marks are drawn in).
      const local = clamp01(t * (rising.length + 1) - rising.indexOf(key));
      out[key] = a + (b - a) * ease(local);
    } else out[key] = a + (b - a) * ease(t);
  }
  return out;
}

// ── scrolly ───────────────────────────────────────────────────────────────────────────────────────

/**
 * One card per gesture, then the closing card: the whole chart back (a filter released, every mark shown), every
 * overlay kept, no card's note. A card shows its own note only, so two cards' words never sit on one mark at once.
 */
export function scheduleKeyedScrolly({ gestures, marks, entities, format = String, unitOf }) {
  const folded = foldKeyed({ gestures, marks, entities, format, unitOf });
  const states = folded.after.map((s, k) => {
    const out = { ...s, card: k };
    gestures.forEach((_, j) => (out[`n${j}`] = j === k ? s[`n${j}`] : 0));
    return out;
  });
  const closing = { ...(folded.after.at(-1) ?? folded.base), card: gestures.length };
  folded.names.forEach((_, i) => Object.assign(closing, { [`b${i}`]: 0, [`s${i}`]: 1 }));
  gestures.forEach((_, j) => (closing[`n${j}`] = 0));
  states.push(closing);
  // Every card changes the picture: a card whose state equals the one before (a highlight on the already-lit subject
  // with no note) is refused, as the core refuses a gesture that changes nothing.
  states.slice(0, -1).forEach((s, k) => {
    const before = k === 0 ? { ...folded.base, card: -1 } : states[k - 1];
    const differs = Object.keys(s).some((key) => key !== "card" && Math.abs((before[key] ?? 0) - s[key]) > 1e-9);
    if (!differs)
      throw new GestureRefusal(`gestures[${k}]`, `${gestures[k].do} leaves the picture as card ${k} left it, so card ${k + 1} would change nothing: drop it, or give it a note`, { remove: k });
  });
  assertLocks(states.map((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== "card"))));
  return { states, plan: folded.plan, names: folded.names };
}

/**
 * Paints one state onto the visual. SELF-CONTAINED (inlined by toString): every mark element carries `data-ki` (its
 * index) and `data-kfill` (its neutral fill) / `data-kaccent` (its accent fill); a ring `data-kr`; an overlay
 * `data-ko` (gesture index); a note `data-kn`. Fills are blended in the reader's browser, continuously with the scroll.
 */
export function applyKeyedState(root, state) {
  const hex = (c) => {
    const m = String(c).replace("#", "");
    const v = m.length === 3 ? m.split("").map((x) => x + x).join("") : m;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const mixOf = (a, b, t) => {
    const [p, q] = [hex(a), hex(b)];
    return `rgb(${p.map((x, i) => Math.round(x + (q[i] - x) * t)).join(",")})`;
  };
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const num = (k) => (Number.isFinite(state[k]) ? state[k] : 0);
  for (const el of root.querySelectorAll("[data-ki]")) {
    const i = el.getAttribute("data-ki");
    const a = clamp(num(`a${i}`));
    const shown = clamp(num(`s${i}`));
    const back = clamp(num(`b${i}`));
    const op = shown * (1 - 0.78 * back);
    const paint = el.getAttribute("data-kpaint") || "fill";
    const neutral = el.getAttribute("data-kfill");
    const accent = el.getAttribute("data-kaccent");
    if (neutral && accent) el.setAttribute(paint, mixOf(neutral, accent, a));
    const base = Number(el.getAttribute("data-kbase") || 1);
    el.setAttribute("opacity", String(op * (base + (1 - base) * a * 0.7)));
  }
  for (const el of root.querySelectorAll("[data-kr]")) {
    const i = el.getAttribute("data-kr");
    el.setAttribute("opacity", String(clamp(num(`r${i}`)) * clamp(num(`s${i}`)) * (1 - 0.78 * clamp(num(`b${i}`)))));
  }
  for (const el of root.querySelectorAll("[data-kl]")) {
    const i = el.getAttribute("data-kl");
    const strong = clamp(num(`a${i}`)) > 0.5 || clamp(num(`r${i}`)) > 0.5;
    const ink = el.getAttribute(strong ? "data-kink-strong" : "data-kink");
    if (ink) el.setAttribute("fill", ink);
    el.setAttribute("opacity", String(clamp(num(`s${i}`)) * (1 - 0.7 * clamp(num(`b${i}`)))));
  }
  for (const el of root.querySelectorAll("[data-ko]")) el.setAttribute("opacity", String(clamp(num(`o${el.getAttribute("data-ko")}`))));
  for (const el of root.querySelectorAll("[data-kn]")) el.setAttribute("opacity", String(clamp(num(`n${el.getAttribute("data-kn")}`))));
}

export const keyedDriveSource = () => applyKeyedState.toString();
export const KEYED_APPLY = "applyKeyedState";

/** The figure-bearing words of a card, checked like a note: every number a figure its picture or the marks give. */
export { figuresIn };

// ── layout helpers every family's geometry shares ─────────────────────────────────────────────────

/** Words broken into lines no wider than `max` (a single word longer than `max` keeps its own line). */
export function wrapText(text, max, measure, reg) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, reg) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** The box a scene text occupies (baseline y, ascent ~0.78 of the lead). */
export const textBox = (t, lead) => {
  const h = (t.lines?.length ?? 1) * lead;
  const w = t.width;
  const x = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
  return { x, y: t.y - lead * 0.78, w, h };
};

/**
 * Places each note beside its anchor where it covers no other word and no earlier note, inside the plot: right of
 * the anchor, left, above, below, then further out. Notes are the gestures' words; the marks' own words were placed by
 * the family. A note that finds no free place takes the least-covered one (never refused: the plate adapts).
 *
 * @param items   [{ k, text, at: { x, y } | null (a caption: the plot's top) }]
 * @param taken   boxes already on the plate (names, ticks, labels)
 */
export function placeNotes({ items, taken = [], soft = [], top = 0, box, measure, lead, reg = "annot", max = 0.42 }) {
  const L = lead(reg);
  const boxes = [...taken];
  const out = [];
  let caption = 0;
  for (const it of items) {
    const lines = wrapText(it.text, Math.max(80, box.width * max), measure, reg);
    const w = Math.max(...lines.map((l) => measure(l, reg)));
    const h = lines.length * L;
    let cands;
    if (!it.at) {
      cands = [{ x: 0, y: caption * L + L * 0.78, anchor: "start" }];
      caption += lines.length;
    } else {
      const { x, y } = it.at;
      const gap = 8;
      cands = [];
      for (const d of [1, 2.5, 4.5])
        cands.push(
          { x: x + gap * d, y: y + L * 0.3, anchor: "start" },
          { x: x - gap * d, y: y + L * 0.3, anchor: "end" },
          { x: x - w / 2, y: y - gap * d - (h - L), anchor: "start" },
          { x: x - w / 2, y: y + gap * d + L * 0.78, anchor: "start" },
          { x: x + gap * d, y: y - gap * d - (h - L), anchor: "start" },
          { x: x + gap * d, y: y + gap * d + L, anchor: "start" },
        );
      // A band reserved above the plot: the note stands in it, a leader down to its mark.
      if (top < 0) cands.push({ x, y: top + L * 0.78, anchor: "start" }, { x: x - w / 2, y: top + L * 0.78, anchor: "start" }, { x, y: top + L * 0.78, anchor: "end" });
    }
    const boxOf = (c) => ({ x: c.anchor === "end" ? c.x - w : c.x, y: c.y - L * 0.78, w, h });
    const inside = (b) => b.x >= -2 && b.y >= top - 2 && b.x + b.w <= box.width + 2 && b.y + b.h <= box.height + 2;
    const scored = cands.map((c, order) => {
      const b = boxOf(c);
      const cover = boxes.reduce((s, o) => s + overlap(b, o), 0) + soft.reduce((s, o) => s + overlap(b, o) * 0.2, 0);
      return { c, b, score: (inside(b) ? 0 : 1e9) + cover * 10 + order };
    });
    const best = scored.reduce((p, q) => (q.score < p.score ? q : p), scored[0]);
    // A note that would leave the plot is pulled back inside it.
    const b = { ...best.b, x: Math.min(Math.max(best.b.x, 0), Math.max(0, box.width - w)), y: Math.min(Math.max(best.b.y, top), Math.max(top, box.height - h)) };
    boxes.push(b);
    const at = it.at;
    const leader = at && Math.hypot(Math.max(b.x - at.x, 0, at.x - (b.x + b.w)), Math.max(b.y - at.y, 0, at.y - (b.y + b.h))) > 10
      ? { x1: at.x, y1: at.y, x2: Math.min(Math.max(at.x, b.x), b.x + b.w), y2: Math.min(Math.max(at.y, b.y), b.y + b.h) }
      : null;
    out.push({ k: it.k, lines, widths: lines.map((l) => measure(l, reg)), text: it.text, x: b.x, y: b.y + L * 0.78, anchor: "start", reg, width: w, lead: L, leader });
  }
  return out;
}

/** The plan items whose words are notes on a mark (or a caption line): every gesture but compare, bracket, reference. */
export function noteItems(plan, anchorOf) {
  return plan
    .filter((p) => p.note !== undefined && !["compare", "bracket", "reference"].includes(p.do))
    .map((p) => ({ k: p.k, text: p.note, at: ["reveal", "pull-back"].includes(p.do) || p.anchor === undefined ? null : anchorOf(p.anchor) }));
}

// ── one stager for every format ───────────────────────────────────────────────────────────────────

/**
 * The whole staging of one format for one family: the core and the keyed checks, then the format's scheduler (and, on
 * a scrolly page, every card's words). `spec` is the family's: { id, marks(model), hooks(model), derived?(model),
 * unitOf?(model), coreFormat?: { [format]: format } }. With `repair`, each refusal's fix is applied to the model's own
 * list until it is accepted (at most `steps`), and every repair is returned.
 */
export function stageKeyedFormat({ spec, model, format, gestures, claim = {}, valueFormat = String, repair = false, steps = 12 }) {
  const marks = spec.marks(model);
  const hooks = spec.hooks(model);
  const derived = spec.derived?.(model);
  const unitOf = spec.unitOf?.(model) ?? ((m) => [m]);
  return stageKeyed({
    gestures,
    repair,
    steps,
    run(list) {
      const { gestures: valid, entities, claim: expanded } = validateKeyed({ gestures: list, marks, family: spec.id, format, claim, hooks, derived, coreFormat: spec.coreFormat?.[format] ?? format });
      const args = { gestures: valid, marks, entities, format: valueFormat, unitOf };
      let scheduled;
      let cards;
      if (format === "static") scheduled = composeKeyedStatic(args);
      else if (format === "web") scheduled = scheduleKeyedWeb(args);
      else if (format === "video") scheduled = scheduleKeyedVideo(args);
      else if (format === "scrolly") {
        scheduled = scheduleKeyedScrolly(args);
        cards = checkCards({ gestures: valid, plan: scheduled.plan, rows: marks, drawn: marks, format: valueFormat, facts: expanded.facts });
      } else throw new Error(`format must be static, web, video or scrolly, not ${format}`);
      return { valid, entities, scheduled, cards, marks, claim: expanded, unitOf };
    },
  });
}
