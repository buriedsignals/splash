// The scrolly scheduler (craft/gestures/GRAMMAR.md §5, §6.1; plan KTD4, KTD9): one card per composed gesture, the
// reader's scroll interpolating continuously from one card's state to the next, then a closing card carrying the
// limits, on which the whole chart returns (what was zoomed or filtered comes back, what was shown stays marked).
//
// A state is a flat record of finite numbers (`assertStates` in the scrolly skill's reveal.mjs): the value scale
// (`lo`, `hi`), per drawn row its slot in the order, accent, ring and step-back, per gesture its own progress
// `g<k>` (a bracket's spine running down, a copy growing, a count climbing), `ink` (a reveal), and `note` (which
// card's note the header reads). Every card sets its own `g<k>` and `note`, so every card changes the picture.
//
// Each card's prose is its gesture's `card`, written by the model in beat.mjs; it must state the figure its picture
// shows, every number in it is checked against the rows, and a ratio word ("twice", "half") against the ratio the
// card's picture draws. A card refusal is a gesture refusal: it names `gestures[i].card` and carries a fix, so
// SPLASH_GESTURE_REPAIR repairs it like any other.
//
// Nothing here reads the data's shape: any row count (the rows no gesture names and the frame has no room for are
// stated as a remainder), any leader, long names (they wrap in the name column), zero and negative values (one
// scale from a zero baseline). The drive (`applyGestureState`) is ONE self-contained function — no import, no
// reference to this module's scope — emitted as source and inlined by the scrolly skill's renderScrolly.
// Browser-safe: no Node module.
import { applyFix, figuresIn, GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";
import { createLength } from "./gesture-length.mjs";

/** The rows a page draws at most before the rest is stated as a remainder (every gesture's rows always drawn). */
export const CAPACITY = 12;

/** The name the scrolly skill calls to paint a state. */
export const APPLY = "applyGestureState";

/**
 * Which rows the page draws: every row a gesture acts on, then the largest of the others up to `capacity`, in the
 * rows' own order. The rest is stated in one line, never drawn as a bar (their sum may outrun the scale).
 */
export function selectRows({ rows, gestures, capacity = CAPACITY }) {
  const keep = new Set(gestures.flatMap((g) => g.marks ?? []));
  let drawn = rows;
  if (rows.length > capacity) {
    if (keep.size >= capacity) drawn = rows.filter((r) => keep.has(r.name));
    else {
      const fill = rows
        .filter((r) => !keep.has(r.name))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, capacity - keep.size);
      const chosen = new Set([...keep, ...fill.map((r) => r.name)]);
      drawn = rows.filter((r) => chosen.has(r.name));
    }
  }
  const left = rows.filter((r) => !drawn.includes(r));
  return { drawn, rest: { count: left.length, sum: left.reduce((s, r) => s + r.value, 0) } };
}

const prefixSums = (values) => {
  let sum = 0;
  return values.map((v) => (sum += v));
};

/**
 * @param gestures validateGestures' `gestures` (own marks first, then `of` rows, in `marks`)
 * @param rows     the rows the page draws, in the order it draws them: [{ name, value }]
 * @param rest     the rows it had no room for: { count, sum }
 * @returns        { states, plan, whole } — one state per gesture card, then the closing card's
 */
export function scheduleScrolly({ gestures, rows, rest = { count: 0, sum: 0 } }) {
  const names = rows.map((r) => r.name);
  const at = new Map(names.map((n, i) => [n, i]));
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const sum = (list) => list.reduce((s, n) => s + valueOf.get(n), 0);
  const whole = sum(names) + rest.sum;
  const split = (g) => {
    const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
    return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
  };
  const copyValue = (g) => {
    const { own, of } = split(g);
    return own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
  };

  // THE ONE SCALE: every value a gesture lays on it — the bars, a compare's copy, a reference rule — so no card has
  // to move it to show what it compares (no-float-baseline-rescale).
  const laid = [
    ...rows.map((r) => r.value),
    ...gestures.filter((g) => g.do === "compare").map(copyValue),
    ...gestures.filter((g) => g.do === "reference").map((g) => Number(g.value)),
  ];
  const lo = Math.min(0, ...laid);
  const hi = Math.max(0, ...laid) || 1;
  const length = createLength({ rows, frame: { x: 0, y: 0, width: 1, height: 1 }, orientation: "rows" });

  const base = { lo, hi, ink: gestures.some((g) => g.do === "reveal") ? 0 : 1, note: 0 };
  names.forEach((_, i) => Object.assign(base, { [`slot${i}`]: i, [`accent${i}`]: 0, [`ring${i}`]: 0, [`back${i}`]: 0 }));
  gestures.forEach((_, k) => (base[`g${k}`] = 0));
  const implicit = implicitAccent(gestures);
  if (at.has(implicit)) base[`accent${at.get(implicit)}`] = 1;

  let picture = { ...length.rest(), domain: [lo, hi] };
  const pictures = [picture];
  let wide = [lo, hi];
  let state = base;
  const states = [];
  const plan = [];

  gestures.forEach((g, k) => {
    const { own, of } = split(g);
    const next = { ...state, [`g${k}`]: 1, note: k };
    const order = () => [...names].sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
    const item = { k, do: g.do, own, of, note: g.note === undefined ? undefined : String(g.note), shown: [] };
    const unchanged = (what) => {
      throw new GestureRefusal(`gestures[${k}]`, `${g.do} ${what}, so card ${k + 1} would change nothing in the picture: drop it`, { remove: k });
    };

    switch (g.do) {
      case "highlight":
        own.forEach((m) => (next[`accent${at.get(m)}`] = 1));
        item.shown = own.map((m) => valueOf.get(m));
        break;
      case "name":
        next[`ring${at.get(own[0])}`] = 1;
        item.shown = [valueOf.get(own[0])];
        break;
      case "annotate":
        item.shown = [valueOf.get(own[0])];
        break;
      case "filter":
        names.forEach((n, i) => (next[`back${i}`] = own.includes(n) ? 0 : 1));
        picture = length.with(picture, { emphasis: Object.fromEntries(names.filter((n) => !own.includes(n)).map((n) => [n, "stepBack"])) });
        item.shown = own.map((m) => valueOf.get(m));
        break;
      case "zoom": {
        const zoomed = length.window(picture, own);
        const factor = (wide[1] - wide[0]) / (zoomed.domain[1] - zoomed.domain[0]);
        if (!(factor > 1.0001)) unchanged(`onto ${own.join(", ")} keeps the scale it had`);
        const printed = figuresIn(g.note);
        if (!printed.some((n) => Math.abs(n.value - factor) <= 0.5 * 10 ** -n.decimals + 1e-9)) {
          const n = printed[0];
          const fixed = factor.toFixed(n.decimals).replace(".", n.separator === "," ? "," : ".");
          const note = g.note.slice(0, n.index) + fixed + g.note.slice(n.index + n.raw.length);
          throw new GestureRefusal(
            `gestures[${k}].note`,
            `prints the factor ${n.raw}, but zooming onto ${own.join(", ")} enlarges the scale ×${factor.toFixed(2)}: write "${note}"`,
            { set: { index: k, field: "note", value: note } },
          );
        }
        picture = { ...zoomed, factorPrinted: true };
        [next.lo, next.hi] = zoomed.domain;
        item.factor = factor;
        item.shown = [factor, ...own.map((m) => valueOf.get(m))];
        break;
      }
      case "reorder": {
        const how = g.value === "ascending" || g.value === "descending" ? g.value : own.length ? [...own, ...order().filter((n) => !own.includes(n))] : "descending";
        const now = { ...picture, order: order() };
        const moved = length.order(now, how);
        if (length.equal(moved, now)) unchanged(`asks for the order the rows already hold (${now.order.join(", ")})`);
        moved.order.forEach((n, slot) => (next[`slot${at.get(n)}`] = slot));
        picture = moved;
        break;
      }
      case "rescale": {
        const top = Math.max(Number(g.value) || 0, ...rows.map((r) => Math.abs(r.value)));
        if (top === wide[1] && state.hi === wide[1]) unchanged(`to ${top} keeps the top the scale already has`);
        wide = [wide[0], top];
        [next.lo, next.hi] = wide;
        picture = { ...length.with(picture, { domain: [...wide] }), window: null };
        item.shown = [top];
        break;
      }
      case "reveal":
        next.ink = 1;
        break;
      case "compare": {
        item.value = copyValue(g);
        item.against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names.filter((n) => n !== own[0]) : of;
        const a = valueOf.get(own[0]);
        item.ratio = a / item.value;
        item.shown = [a, item.value, item.ratio, a - item.value, item.value - a];
        picture = length.with(picture, { compare: [own[0], ...item.against] });
        break;
      }
      case "bracket": {
        // One row of the whole: the spine runs down every drawn row and the remainder, climbing to the whole.
        const ofWhole = own.length === 1 && g.of === "whole";
        const members = (ofWhole ? names : own).slice().sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
        item.members = members;
        item.whole = ofWhole;
        item.steps = prefixSums([...members.map((n) => valueOf.get(n)), ...(ofWhole && rest.count ? [rest.sum] : [])]);
        const s = sum(own);
        item.shown = ofWhole ? [s, whole, (s / whole) * 100] : [s];
        if (ofWhole) item.ratio = s / whole;
        picture = length.with(picture, { bracket: members });
        break;
      }
      case "count": {
        const counted = (own.length ? own : names).slice().sort((a, b) => state[`slot${at.get(a)}`] - state[`slot${at.get(b)}`]);
        item.steps = prefixSums([...counted.map((n) => valueOf.get(n)), ...(!own.length && rest.count ? [rest.sum] : [])]);
        item.shown = [item.steps.at(-1), counted.length + (!own.length ? rest.count : 0)];
        break;
      }
      case "reference":
        item.value = Number(g.value);
        item.shown = [item.value];
        picture = length.with(picture, { reference: item.value });
        break;
      case "pull-back":
        // The frame returns to the whole chart; the closing card follows it (GRAMMAR.md §6.1).
        [next.lo, next.hi] = wide;
        names.forEach((_, i) => (next[`back${i}`] = 0));
        picture = { ...picture, domain: [...wide], emphasis: Object.fromEntries(Object.entries(picture.emphasis).filter(([, r]) => r !== "stepBack")) };
        break;
      default:
        throw new GestureRefusal(`gestures[${k}].do`, `"${g.do}" has no scrolly staging`, { remove: k });
    }
    pictures.push(picture);
    plan.push(item);
    states.push(next);
    state = next;
  });

  // The family's locks, held state by state so the refusal names the gesture that broke one (state k is gesture k-1).
  for (let k = 1; k < pictures.length; k++)
    try {
      length.invariants(pictures.slice(0, k + 1));
    } catch (error) {
      throw new GestureRefusal(`gestures[${k - 1}]`, `${error.message}: drop it`, { remove: k - 1 });
    }

  // THE CLOSING CARD: the whole chart, on its first scale, every row back, what was shown still marked.
  const closing = { ...state, lo: wide[0], hi: wide[1], note: gestures.length };
  names.forEach((_, i) => (closing[`back${i}`] = 0));
  states.push(closing);
  return { states, plan, whole };
}

// ── the cards' words ──────────────────────────────────────────────────────────────────────────────

const SCALES = [0, -3, -6, -9, -12, 3, 6, 9, 12, -1, -2, 1, 2];
// A number written without a sign may state a magnitude ("lost 12 points" over a drawn -12).
const matches = (n, f) =>
  [f, ...(n.sign ? [] : [Math.abs(f)])].some((x) => [x, ...(n.exp ? [x / 10 ** n.exp] : [])].some((y) => Math.abs(n.value - y) <= 0.5 * 10 ** -n.decimals + 1e-9));

// The same ratio words the core checks in a note (gesture-core.mjs `RATIO_WORDS`, not exported).
const RATIO_WORDS = [
  [/\b(twice|double|two times)\b/i, 2],
  [/\b(three times|triple|thrice)\b/i, 3],
  [/\bfour times\b/i, 4],
  [/\bfive times\b/i, 5],
  [/\bhalf\b/i, 0.5],
];

/** A figure written as the stated number is: its decimals, separator and grouping (as the core writes a fix). */
function formatLike(n, f) {
  const fixed = Math.abs(f).toFixed(n.decimals);
  const body = n.grouped ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, n.separator) : n.separator === "," ? fixed.replace(".", ",") : fixed;
  const sign = f < 0 ? (n.sign === "−" ? "−" : "-") : n.sign === "+" ? "+" : "";
  return sign + body;
}

const paragraphsOf = (card) => [card].flat().map((p) => (typeof p === "string" ? p : ""));

/** What a card's picture shows, in words a refusal can name. */
function pictureOf(item) {
  const marks = item.own.join(", ");
  switch (item.do) {
    case "bracket":
      return item.whole ? `${marks} bracketed against the whole` : `${marks} bracketed together`;
    case "compare":
      return `${item.own[0]} laid against ${item.against.join(", ")}`;
    case "count":
      return `a count climbing`;
    case "reference":
      return `a rule at ${item.value}`;
    case "zoom":
      return `the scale enlarged onto ${marks}`;
    default:
      return marks ? `${item.do} on ${marks}` : item.do;
  }
}

/**
 * Every gesture's card checked against its picture: present, stating one of the figures its picture shows, every
 * number one the rows give (at its own precision, one power-of-ten scale per card), every ratio word the ratio the
 * picture draws. Returns the cards' paragraphs; throws a GestureRefusal naming `gestures[i].card` and a fix.
 *
 * @param format the beat's value format, for a fix that adds the missing figure
 */
export function checkCards({ gestures, plan, rows, rest = { count: 0, sum: 0 }, drawn = rows, format = String, facts = {} }) {
  const whole = rows.reduce((s, r) => s + r.value, 0);
  const rankOf = new Map([...rows].sort((a, b) => b.value - a.value).map((r, i) => [r.name, i + 1]));
  const known = [
    whole,
    rows.length,
    drawn.length,
    rest.count,
    rest.sum,
    ...rows.map((r) => r.value),
    ...gestures.flatMap((g) => g.figures ?? []),
    ...plan.flatMap((p) => [...p.shown, ...(p.steps ?? [])]),
    ...gestures.flatMap((g) => g.marks.map((m) => rankOf.get(m))),
    ...gestures.flatMap((g) => g.marks.flatMap((m) => facts[m] ?? [])),
  ].filter((f) => Number.isFinite(f));
  // The row the staging is about, and the line a card with nothing of its own falls back on.
  const marked = new Set(gestures.flatMap((g) => g.marks));
  const subject = gestures.find((g) => g.marks?.length)?.marks[0];
  const subjectLine = subject === undefined ? format(whole) : `${subject}: ${format(rows.find((r) => r.name === subject)?.value)}`;

  return gestures.map((g, k) => {
    const item = plan[k];
    const where = `card ${k + 1} (${g.do}${item.own.length ? ` on ${item.own.join(", ")}` : ""})`;
    const primary = item.shown[0];
    const fallback = g.note ?? (primary !== undefined ? `${item.own[0] ?? ""}: ${format(primary)}`.replace(/^: /, "") : item.own.join(", ") || subjectLine);
    if (g.card === undefined || paragraphsOf(g.card).some((p) => !p.trim()) || !paragraphsOf(g.card).length)
      throw new GestureRefusal(
        `gestures[${k}].card`,
        `${where} has no prose: give the gesture a card, the sentence the reader reads while it plays, in the story's language`,
        { set: { index: k, field: "card", value: fallback } },
      );
    const paragraphs = paragraphsOf(g.card);
    const setParagraph = (p, text) => {
      if (!Array.isArray(g.card)) return text;
      const next = [...g.card];
      next[p] = text;
      return next;
    };

    // One power-of-ten scale for the whole card, as the core reads a note.
    const stated = paragraphs.flatMap((text, p) => figuresIn(text).map((n) => ({ ...n, p })));
    const scale = SCALES.map((s) => ({ s, hits: stated.filter((n) => known.some((f) => matches(n, f * 10 ** s))).length }))
      .reduce((best, c) => (c.hits > best.hits ? c : best), { s: 0, hits: -1 }).s;
    const figures = known.map((f) => f * 10 ** scale);
    for (const n of stated) {
      if (figures.some((f) => matches(n, f))) continue;
      const best = figures.reduce((p, f) => (Math.abs(f - n.value) < Math.abs(p - n.value) ? f : p), figures[0]);
      const text = paragraphs[n.p];
      const fixed = text.slice(0, n.index) + formatLike(n, best) + text.slice(n.index + n.raw.length);
      throw new GestureRefusal(
        `gestures[${k}].card`,
        `${where} states ${n.raw}, which no figure of the rows rounds to; the closest is ${formatLike(n, best)}: write "${fixed}"`,
        { set: { index: k, field: "card", value: setParagraph(n.p, fixed) } },
      );
    }

    // The figure the card's picture shows, stated (at the card's scale).
    const shown = item.shown.map((f) => f * 10 ** scale);
    if (shown.length && !stated.some((n) => shown.some((f) => matches(n, f))))
      throw new GestureRefusal(
        `gestures[${k}].card`,
        `${where} must state the figure its picture shows — ${format(primary)} — and states none of ${item.shown.map((f) => format(f)).join(", ")}`,
        { set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${format(primary)})`) } },
      );

    // A card whose picture shows no figure of its own (a reveal, a pull-back) still carries the takeaway: it names a
    // row the staging acts on or states a figure of the rows. A 12B pull-back card said only "The chart shows the
    // relative ridership across six major city networks".
    if (!shown.length && subject !== undefined && !stated.length && ![...marked].some((m) => paragraphs.some((p) => p.includes(m))))
      throw new GestureRefusal(
        `gestures[${k}].card`,
        `${where} shows no figure of its own, so its card must carry the takeaway: name ${subject} or state one of its figures`,
        { set: { index: k, field: "card", value: setParagraph(paragraphs.length - 1, `${paragraphs.at(-1).trim()} (${subjectLine})`) } },
      );

    // A ratio word holds for the ratio the picture draws, or the picture draws no ratio and the word goes.
    for (const [p, text] of paragraphs.entries())
      for (const [word, x] of RATIO_WORDS) {
        const said = text.match(word);
        if (!said) continue;
        const more = /\bmore than\b/i.test(text);
        const less = /\b(less|fewer) than\b/i.test(text);
        const ratio = item.ratio;
        if (ratio !== undefined && (more ? ratio > x : less ? ratio < x : Math.abs(ratio - x) <= x * 0.1)) continue;
        const replacement = ratio === undefined ? "" : `${ratio.toFixed(1)} times`;
        const fixed = text.replace(word, replacement).replace(/\s{2,}/g, " ").trim();
        throw new GestureRefusal(
          `gestures[${k}].card`,
          ratio === undefined
            ? `${where} says ${said[0]}, but its picture shows ${pictureOf(item)} and draws no ratio: say it on the card of a compare, or drop the word`
            : `${where} says ${said[0]}, but its picture shows ${pictureOf(item)}: ${ratio.toFixed(2)} of it — state the ratio its picture draws, or say ${said[0]} on the card whose picture shows it`,
          { set: { index: k, field: "card", value: setParagraph(p, fixed) } },
        );
      }
    return { id: `card-${k + 1}-${g.do}`, prose: paragraphs };
  });
}

/**
 * The whole staging: the core, the rows drawn, the scheduler, the cards. With `repair`, each refusal's fix is applied
 * to the model's own list until it is accepted (at most `steps` times), and every repair is returned so the run
 * reports it; without, the first refusal is thrown.
 */
export function stageScrolly({ gestures, rows, claim, format = String, capacity = CAPACITY, repair = false, steps = 12 }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid } = validateGestures({ gestures: list, rows, family: "length", format: "scrolly", claim });
      const { drawn, rest } = selectRows({ rows, gestures: valid, capacity });
      const scheduled = scheduleScrolly({ gestures: valid, rows: drawn, rest });
      const cards = checkCards({ gestures: valid, plan: scheduled.plan, rows, rest, drawn, format, facts: claim?.facts });
      return { gestures: list, valid, drawn, rest, scheduled, cards, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

// ── the drive ─────────────────────────────────────────────────────────────────────────────────────

/** The drive's source, as renderScrolly inlines it: this one function, nothing around it. */
export const driveSource = () => applyGestureState.toString();

/**
 * Paints one state. SELF-CONTAINED: everything it calls is declared inside it, because its source is inlined into
 * the page alone. Every mark is laid out in the reader's pixels on each paint: names in a left column (wrapping
 * when long), one value scale from a zero baseline shared by every card, a value written after its bar, a bracket's
 * spine and figure in a column of its own at the right, a compare's copy in the lower half of its subject's band.
 */
export function applyGestureState(root, state, context) {
  const carrier = root.querySelector("[data-gbar]");
  if (!carrier) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const set = (el, attrs) => {
    for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  };
  const place = (el, left, top, transform, opacity) =>
    Object.assign(el.style, { left: `${left}px`, top: `${top}px`, transform, opacity: String(opacity) });
  const width = (node) => node.getBoundingClientRect().width;
  // How many of a climbing figure's steps have landed: all of them once the card is reached (an eased scroll lands
  // a hair short of 1).
  const landedOf = (g, length) => (g >= 0.995 ? length : Math.min(length, Math.floor(g * length)));

  if (context.resized || !root.__gbar) {
    const data = root.__gbarData || (root.__gbarData = JSON.parse(carrier.getAttribute("data-gbar")));
    const stage = root.querySelector('[data-part="stage"]');
    const q = (sel) => stage.querySelector(sel);
    const rows = data.rows.map((r, i) => ({
      ...r,
      bar: q(`[data-bar="${i}"]`),
      accent: q(`[data-accent="${i}"]`),
      ring: q(`[data-ring="${i}"]`),
      cut: q(`[data-cut="${i}"]`),
      name: q(`[data-name="${i}"]`),
      value: q(`[data-value="${i}"]`),
    }));
    for (const r of rows) Object.assign(r.name.style, { width: "auto", whiteSpace: "nowrap" });
    const plan = data.plan.map((p) => ({
      ...p,
      copy: q(`[data-copy="${p.k}"]`),
      tick: q(`[data-tick="${p.k}"]`),
      label: q(`[data-label="${p.k}"]`),
      spine: q(`[data-spine="${p.k}"]`),
      ticks: Array.from(stage.querySelectorAll(`[data-mtick="${p.k}"]`)),
      rule: q(`[data-rule="${p.k}"]`),
    }));
    const notes = data.plan.map((p) => root.querySelector(`[data-note="${p.k}"]`));
    root.__gbar = {
      data,
      stage,
      svg: q('[data-part="field"]'),
      baseline: q('[data-part="baseline"]'),
      rest: q('[data-part="rest"]'),
      rows,
      plan,
      notes,
      nameNatural: Math.max(0, ...rows.map((r) => width(r.name))),
      lineH: Math.max(0, ...rows.map((r) => r.name.getBoundingClientRect().height)),
      valueW: Math.max(0, ...rows.map((r) => width(r.value))),
      bracketW: plan.filter((p) => p.do === "bracket").map((p) => width(p.label) * 1.15 + 18),
    };
  }
  const c = root.__gbar;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const gap = narrow ? 8 : 12;
  const n = c.rows.length;
  const negative = c.rows.some((r) => r.v < 0);
  const slots = n + (c.rest ? 1 : 0);
  const top = 4;
  const bottom = SH - 4;
  const pitch = (bottom - top) / slots;
  // NAMES: in a left column, wrapping when long; when the wrapped names would outgrow their rows (many rows, long
  // names, a phone), each name stands on its own line above its bar, across the whole width.
  const sideW = Math.min(c.nameNatural, SW * (narrow ? 0.34 : 0.3));
  const above = c.nameNatural > sideW && Math.ceil(c.nameNatural / Math.max(1, sideW)) * c.lineH > pitch * 0.9;
  const nameW = above ? 0 : sideW;
  const negW = negative ? c.valueW + 6 : 0;
  const bracketCols = c.bracketW;
  const x0 = (above ? 2 : nameW + gap) + negW;
  const x1 = Math.max(x0 + 20, SW - c.valueW - 6 - gap - bracketCols.reduce((s, w) => s + w, 0));
  for (const r of c.rows)
    Object.assign(r.name.style, above
      ? { width: "auto", maxWidth: `${SW - 4}px`, whiteSpace: "normal", textAlign: "left" }
      : { width: `${nameW}px`, maxWidth: "", whiteSpace: c.nameNatural > nameW ? "normal" : "nowrap", textAlign: "right" });
  const thick = above ? Math.max(2, Math.min(36, (pitch - c.lineH - 6) * 0.9)) : Math.max(2, Math.min(pitch * 0.62, 36));
  const shift = above ? (c.lineH + 2) / 2 : 0;
  const slotY = (s) => top + (s + 0.5) * pitch;
  const lo = state.lo;
  const hi = state.hi;
  const X = (v) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);
  const left = x0 - negW;
  const clip = (x) => Math.max(left, Math.min(x1, x));
  const zero = clip(X(0));
  set(c.baseline, { x1: zero, x2: zero, y1: top, y2: bottom });

  // Which rows are visible: all of them, or — once a reveal is composed — in rank order as it plays, a row a
  // gesture showed before the reveal already standing.
  const seenOf = (r) => (r.seen >= 0 ? clamp(state[`g${r.seen}`]) : 0);
  const shownOf = (r, i) => (c.data.reveal ? Math.max(clamp(state.ink * n - r.rank), seenOf(r)) : 1);
  const rowY = c.rows.map((_, i) => slotY(state[`slot${i}`]) + shift);
  const alpha = c.rows.map((r, i) => shownOf(r, i) * (1 - 0.72 * clamp(state[`back${i}`])));

  c.rows.forEach((r, i) => {
    const y = rowY[i];
    const a = clip(X(Math.min(0, r.v)));
    const b = clip(X(Math.max(0, r.v)));
    const geometry = { x: a, y: y - thick / 2, width: Math.max(0, b - a), height: thick };
    set(r.bar, { ...geometry, opacity: alpha[i] });
    set(r.accent, { ...geometry, opacity: alpha[i] * clamp(state[`accent${i}`]) });
    set(r.ring, { x: a - 3, y: y - thick / 2 - 3, width: Math.max(0, b - a) + 6, height: thick + 6, opacity: alpha[i] * clamp(state[`ring${i}`]) });
    const strong = state[`accent${i}`] > 0.5 || state[`ring${i}`] > 0.5;
    const colour = strong ? c.data.colours.accent : c.data.colours.ink;
    Object.assign(r.name.style, { color: colour, fontWeight: strong ? "700" : "" });
    r.value.style.color = colour;
    if (above) place(r.name, left, y - thick / 2 - 2, "translateY(-100%)", alpha[i]);
    else place(r.name, 0, y, "translateY(-50%)", alpha[i]);
    // A bar the scale cannot hold (a zoom) is cut where the plot ends, and the cut is drawn.
    const over = r.v >= 0 ? X(r.v) > x1 + 0.5 : X(r.v) < left - 0.5;
    const edge = r.v >= 0 ? x1 : left;
    const dir = r.v >= 0 ? -1 : 1;
    const h = thick / 2 + 1;
    set(r.cut, {
      d: `M${edge + dir * 12},${y + h} L${edge + dir * 6},${y - h} M${edge + dir * 7},${y + h} L${edge + dir * 1},${y - h}`,
      opacity: over ? alpha[i] : 0,
    });
    if (r.v < 0) place(r.value, a - 6, y, "translate(-100%, -50%)", alpha[i]);
    else place(r.value, b + 6, y, "translateY(-50%)", alpha[i]);
  });
  if (c.rest) place(c.rest, x0, slotY(n), "translateY(-50%)", c.data.reveal ? clamp(state.ink) : 1);

  let column = x1 + c.valueW + 6 + gap;
  c.plan.forEach((p, j) => {
    const g = clamp(state[`g${p.k}`]);
    if (p.do === "compare") {
      const i = p.own[0];
      const y = rowY[i];
      const end = clip(X(lerp(0, p.value, g)));
      const from = Math.min(zero, end);
      set(p.copy, { x: from, y, width: Math.abs(end - zero), height: thick / 2, opacity: Math.min(1, g * 3) * alpha[i] });
      set(p.tick, { x1: end, x2: end, y1: y - thick / 2 - 3, y2: y + thick / 2 + 3, opacity: g * alpha[i] });
      place(p.label, end + 4, y + thick / 2 + 2, "none", clamp((g - 0.6) / 0.4) * alpha[i]);
    } else if (p.do === "bracket") {
      const x = column + 4;
      column += bracketCols[c.plan.filter((q) => q.do === "bracket").indexOf(p)];
      const ys = p.members.map((i) => rowY[i]);
      if (p.whole && c.rest) ys.push(slotY(n));
      const y0 = Math.min(...ys) - thick / 2;
      const y1 = Math.max(...ys) + thick / 2;
      set(p.spine, { x1: x, x2: x, y1: y0, y2: lerp(y0, y1, g), opacity: Math.min(1, g * 4) });
      p.ticks.forEach((t, m) => {
        const ty = ys[m];
        set(t, { x1: x - 6, x2: x, y1: ty, y2: ty, opacity: clamp(g * ys.length - m) });
      });
      const landed = landedOf(g, p.steps.length);
      if (landed > 0 && p.label.textContent !== p.steps[landed - 1]) p.label.textContent = p.steps[landed - 1];
      place(p.label, x + 6, (y0 + y1) / 2, "translateY(-50%)", landed > 0 ? 1 : 0);
    } else if (p.do === "reference") {
      const x = X(p.value);
      const inside = x >= left - 0.5 && x <= x1 + 0.5 ? 1 : 0;
      set(p.rule, { x1: x, x2: x, y1: top, y2: bottom, opacity: g * inside });
      place(p.label, x + 4, top, "none", g * inside);
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
