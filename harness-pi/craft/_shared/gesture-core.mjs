// The gesture core (craft/gestures/GRAMMAR.md §7): validates a beat's `gestures` against the registry, resolves
// every mark on the rows the beat draws, derives every figure, checks every note's numbers, checks that every
// gesture serves the confirmed takeaway, refuses conflicts and the format's limits. A refusal names the field and
// carries a fix that, applied, moves toward an accepted list — the 12B is told what works, never only what failed.
// Browser-safe: no Node module.
import { admissible, FAMILY_GESTURES, HIDES_THE_WHOLE, VOCABULARY, WEB_RESTING, WHOLE_CHART } from "./gesture-registry.mjs";

export class GestureRefusal extends Error {
  /**
   * @param field   the beat.mjs field to change ("gestures", "gestures[1].note")
   * @param message what is wrong and the value that works
   * @param fix     { remove: i } | { set: { index, field, value } } | { add: { at, gesture } }
   */
  constructor(field, message, fix) {
    super(`${field}: ${message}`);
    this.field = field;
    this.fix = fix;
  }
}

/** The list with one refusal's fix applied. */
export function applyFix(list, fix) {
  const next = structuredClone(list);
  if ("remove" in fix) next.splice(fix.remove, 1);
  else if ("set" in fix) next[fix.set.index] = fix.set.field ? { ...next[fix.set.index], [fix.set.field]: fix.set.value } : fix.set.value;
  else if ("add" in fix) next.splice(fix.add.at, 0, fix.add.gesture);
  return next;
}

// ── names ─────────────────────────────────────────────────────────────────────────────────────────

const fold = (s) => String(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function closest(name, rows) {
  return rows.map((r) => r.name).sort((a, b) => distance(fold(name), fold(a)) - distance(fold(name), fold(b)))[0];
}

/** Rows named in a text, by whole word, case- and accent-insensitive. */
function rowsNamedIn(text, rows) {
  const hay = ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return rows.filter((r) => hay.includes(` ${fold(r.name).replace(/[^\p{L}\p{N}]+/gu, " ")} `)).map((r) => r.name);
}

// ── numbers ───────────────────────────────────────────────────────────────────────────────────────

// The unit may be glued to the figure ("12.29Gt", the China video run); an ordinal ("2nd") is not a figure.
const NUMBER = /(?<![\p{L}\d])([-−+](?=\d))?(\d{1,3}(?:[ ,  ]\d{3})+(?![.,]?\d)|\d+(?:[.,]\d+)?)(?!\d|(?:st|nd|rd|th)\b)/gu;

/** Every number a text states, with its sign and precision; years and unit bases (100, 1,000, 100,000…) are not figures. */
export function figuresIn(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(NUMBER)) {
    // A sign written right before the digits belongs to the figure ("-12", "+3.4"); a dash between words does not.
    const sign = m[1] ?? "";
    const digits = m[2];
    const raw = sign + digits;
    const grouped = /^\d{1,3}(?:[ ,\u00a0\u202f]\d{3})+$/.test(digits);
    const magnitude = Number(grouped ? digits.replace(/[ ,\u00a0\u202f]/g, "") : digits.replace(",", "."));
    const value = sign === "-" || sign === "\u2212" ? -magnitude : magnitude;
    const decimals = grouped ? 0 : (digits.split(/[.,]/)[1] ?? "").length;
    if (Number.isInteger(value) && value >= 1700 && value <= 2100) continue;
    if (value >= 100 && /^10+$/.test(String(value))) continue;
    const separator = grouped ? digits.match(/[ ,\u00a0\u202f]/)[0] : digits.includes(",") ? "," : ".";
    // A percent sign or word after the figure: it may only be a percentage the gesture draws, never a gap in the unit.
    const percent = /^\s?(%|per ?cent\b|procent|pour ?cent)/i.test(String(text).slice(m.index + m[0].length));
    // A magnitude suffix glued on ("12B", "4.9bn", "250k"): the figure is read at that power of ten as well. A 12B card
    // wrote "(12B)" for China's 12,289,000,000 tonnes, it was read as 12 against tonnes, and repair appended it again.
    const suffix = String(text).slice(m.index + m[0].length).match(/^\s?(k|K|M|B|bn|mn|mln|mld|mrd)(?![\p{L}])/u)?.[1];
    const exp = suffix ? ({ k: 3, K: 3, M: 6, mn: 6, mln: 6 })[suffix] ?? 9 : 0;
    out.push({ raw, value, decimals, sign, separator, grouped, index: m.index, percent, exp });
  }
  return out;
}

const SCALES = [0, -3, -6, -9, -12, 3, 6, 9, 12, -1, -2, 1, 2];

const matches = (n, f) => [f, ...(n.exp ? [f / 10 ** n.exp] : [])].some((x) => Math.abs(n.value - x) <= 0.5 * 10 ** -n.decimals + 1e-9);

function formatLike(n, f) {
  const fixed = Math.abs(f).toFixed(n.decimals);
  const body = n.grouped ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, n.separator) : n.separator === "," ? fixed.replace(".", ",") : fixed;
  const sign = f < 0 ? (n.sign === "\u2212" ? "\u2212" : "-") : n.sign === "+" ? "+" : "";
  return sign + body;
}

/** "twice", "three times", "half" — a ratio a compare note states in words. */
const RATIO_WORDS = [
  [/\b(twice|double|two times)\b/i, 2],
  [/\b(three times|triple|thrice)\b/i, 3],
  [/\bfour times\b/i, 4],
  [/\bfive times\b/i, 5],
  [/\bhalf\b/i, 0.5],
];

/** Rank words a note may state about its row (English). The probe saw "Highest rate (205)" on the second row. */
const RANK_WORDS = [
  [/\b(highest|largest|biggest|greatest|most|top|first)\b/i, (rank, n) => rank === 1, "the highest"],
  [/\b(lowest|smallest|least|fewest|bottom|last)\b/i, (rank, n) => rank === n, "the lowest"],
  [/\bsecond\b/i, (rank) => rank === 2, "second"],
  [/\bthird\b/i, (rank) => rank === 3, "third"],
  [/\bfourth\b/i, (rank) => rank === 4, "fourth"],
];

// ── the core ──────────────────────────────────────────────────────────────────────────────────────

/**
 * @param gestures the beat's list
 * @param rows     the rows the beat draws: [{ name, value }], values in the unit the plate prints
 * @param family   "length" (phase 1)
 * @param format   static | web | video | scrolly
 * @param claim    { takeaway, subject?, comparison?, entity?, versus?, facts? } from STORYBOARD.md; facts maps a row's name
 *                 to every number data.json holds for it (guards.mjs rowFacts), figures a note may state beside the drawn one
 * @returns        { gestures: [{ ...gesture, marks, figures }], whole, entities }
 */
export function validateGestures({ gestures, rows, family, format, claim }) {
  const allowed = admissible(family, format).map((a) => a.do);
  if (!Array.isArray(gestures) || !gestures.length)
    throw new GestureRefusal("gestures", `give a list of gestures, in story order, from: ${allowed.join(", ")}`, {
      add: { at: 0, gesture: { do: "highlight", mark: rows[0]?.name } },
    });
  const whole = rows.reduce((s, r) => s + r.value, 0);
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const rankOf = new Map([...rows].sort((a, b) => b.value - a.value).map((r, i) => [r.name, i + 1]));
  const entities = new Set([
    ...rowsNamedIn(`${claim.takeaway ?? ""} ${claim.subject ?? ""} ${claim.comparison ?? ""}`, rows),
    ...[claim.entity, claim.versus].filter(Boolean).flatMap((e) => rowsNamedIn(e, rows)),
  ]);
  const takeawayFigures = figuresIn(claim.takeaway).map((n) => n.value);

  const resolve = (name, i, field) => {
    if (valueOf.has(name)) return name;
    const folded = rows.find((r) => fold(r.name) === fold(name));
    if (folded) return folded.name;
    const best = closest(name, rows);
    throw new GestureRefusal(`gestures[${i}].${field}`, `"${name}" is not a drawn row; the closest is "${best}"`, {
      set: { index: i, field: field.replace(/\[\d+\]$/, ""), value: field.endsWith("]") ? undefined : best },
    });
  };

  // Several rows written as one string ("United States,India,Russia,Japan,Indonesia", a 12B China scrolly) are those
  // rows: the fix offered was the closest single row, "United States", and every later fix followed it into falsehood.
  // A string that is itself a row's name (one with a comma in it) stays one row.
  const named = (name) => valueOf.has(name) || rows.some((r) => fold(r.name) === fold(name));
  const listed = (value) => {
    if (typeof value !== "string" || named(value)) return null;
    const parts = value.split(/\s*(?:,|;|&|\band\b|\bet\b|\bund\b|\bi\b|\be\b|\by\b)\s*/i).filter(Boolean);
    return parts.length > 1 && parts.every(named) ? parts : null;
  };
  const out = [];
  const seen = new Map();
  let compared = false;
  let rescaled = false;
  const noted = new Set();

  gestures.forEach((g, i) => {
    // vocabulary, family, format
    if (!allowed.includes(g?.do)) {
      const known = g?.do in VOCABULARY;
      throw new GestureRefusal(
        `gestures[${i}].do`,
        `${known ? `"${g.do}" is not available for the ${family} family` : `"${g?.do}" is not a gesture`}; admissible: ${allowed.join(", ")}`,
        { remove: i },
      );
    }

    // marks
    let marks = [];
    if (g.mark !== undefined) marks = (listed(g.mark) ?? [g.mark]).map((m) => resolve(m, i, "mark"));
    if (g.marks !== undefined) {
      const given = (Array.isArray(g.marks) ? g.marks : [g.marks]).flatMap((m) => listed(m) ?? [m]);
      marks = given.map((m, k) => {
        try {
          return resolve(m, i, `marks[${k}]`);
        } catch (error) {
          if (!(error instanceof GestureRefusal)) throw error;
          const fixed = [...given];
          fixed[k] = closest(m, rows);
          throw new GestureRefusal(error.field, error.message.slice(error.field.length + 2), { set: { index: i, field: "marks", value: fixed } });
        }
      });
    }
    let of = [];
    if (Array.isArray(g.of)) of = g.of.flatMap((m) => listed(m) ?? [m]).map((m) => resolve(m, i, "of"));
    else if (listed(g.of)) of = listed(g.of).map((m) => resolve(m, i, "of"));
    const ofWhole = g.of === "whole";
    const needsMark = ["highlight", "name", "annotate", "compare", "bracket", "zoom"];
    if (needsMark.includes(g.do) && !marks.length)
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} needs the row it acts on: give mark`, {
        set: { index: i, field: "mark", value: [...entities][0] ?? rows[0].name },
      });

    // per-gesture shape
    if (g.do === "bracket" && marks.length === 1 && !ofWhole && !of.length)
      throw new GestureRefusal(`gestures[${i}].of`, `a bracket on one row measures it against something: give of: "whole"`, {
        set: { index: i, field: "of", value: "whole" },
      });
    if (g.do === "bracket" && marks.length > 1 && format === "static") {
      const at = marks.map((m) => rows.findIndex((r) => r.name === m)).sort((a, b) => a - b);
      if (at.at(-1) - at[0] !== at.length - 1) {
        const run = rows.slice(at[0], at.at(-1) + 1).map((r) => r.name);
        throw new GestureRefusal(`gestures[${i}].marks`, `a static bracket spans rows that sit together; the run is ${run.join(", ")}`, {
          set: { index: i, field: "marks", value: run },
        });
      }
    }
    if (g.do === "compare" && marks.length === 1 && !ofWhole && !of.length)
      throw new GestureRefusal(`gestures[${i}].marks`, `a compare needs a second row: marks: [subject, other], or of: [rows]`, {
        set: { index: i, field: "of", value: "whole" },
      });
    if (g.do === "zoom" && !figuresIn(g.note).length)
      throw new GestureRefusal(`gestures[${i}].note`, `a zoom prints its factor (no-let-camera-magnification): write it in the note, e.g. "×3"`, {
        remove: i,
      });

    // derived figures: own (what this gesture states) and context
    const sumOf = (names) => names.reduce((s, n) => s + valueOf.get(n), 0);
    const own = [];
    // The percentages this gesture draws: a stated "n %" is checked against these and the rows' own values only.
    const percents = [];
    if (["highlight", "name", "annotate", "filter", "zoom", "count"].includes(g.do)) own.push(...marks.map((m) => valueOf.get(m)));
    if (g.do === "count") own.push(marks.length || rows.length, sumOf(marks.length ? marks : rows.map((r) => r.name)));
    if (g.do === "bracket") {
      const s = sumOf(marks);
      own.push(s, ...marks.map((m) => valueOf.get(m)));
      if (ofWhole) own.push((s / whole) * 100, s / whole);
      if (ofWhole) percents.push((s / whole) * 100);
    }
    let ratio;
    if (g.do === "compare") {
      const a = valueOf.get(marks[0]);
      const b = marks.length > 1 ? sumOf(marks.slice(1)) : ofWhole ? whole : sumOf(of);
      ratio = a / b;
      // A compare states the two lengths, their gap, their ratio, or the gap as a percent of either. Its share of the
      // whole was admitted once, and "13% fewer beds per resident than Łódzkie" passed on Mazowieckie's 12.8 % share
      // when the gap is 3.5 %.
      const gaps = [(a / b - 1) * 100, (1 - a / b) * 100, (b / a - 1) * 100, (1 - b / a) * 100];
      own.push(a, b, a - b, b - a, ratio, 1 / ratio, ...gaps);
      percents.push(...gaps);
      if (ofWhole) own.push((a / whole) * 100);
      if (ofWhole) percents.push((a / whole) * 100);
    }
    if (g.do === "reference") own.push(Number(g.value));
    if (g.do === "rescale") own.push(Number(g.value));
    const context = [whole, ...marks.map((m) => rankOf.get(m)), ...marks.flatMap((m) => claim.facts?.[m] ?? [])];

    // notes: every number is one of the gesture's figures, at the note's precision
    if (g.note !== undefined && g.do !== "zoom") {
      const stated = figuresIn(g.note);
      const asPercent = [...percents, ...marks.map((m) => valueOf.get(m)), ...marks.flatMap((m) => claim.facts?.[m] ?? [])];
      // One power-of-ten scale for the whole note: the rows may be in tonnes and the note in Gt.
      const scale = SCALES.map((k) => ({ k, hits: stated.filter((n) => !n.percent && [...own, ...context].some((f) => matches(n, f * 10 ** k))).length }))
        .reduce((best, c) => (c.hits > best.hits ? c : best), { k: 0, hits: -1 }).k;
      const figures = [...own, ...context].map((f) => f * 10 ** scale);
      for (const n of stated) {
        const pool = n.percent && asPercent.length ? asPercent : figures;
        if (pool.some((f) => matches(n, f))) continue;
        const best = pool.reduce((p, f) => (Math.abs(f - n.value) < Math.abs(p - n.value) ? f : p), pool[0]);
        const fixed = g.note.slice(0, n.index) + formatLike(n, best) + g.note.slice(n.index + n.raw.length);
        throw new GestureRefusal(
          `gestures[${i}].note`,
          `states ${n.raw}, but the drawn rows give ${formatLike(n, best)} for this ${g.do}: write "${fixed}"`,
          { set: { index: i, field: "note", value: fixed } },
        );
      }
      if (marks.length === 1 && ["name", "annotate", "highlight"].includes(g.do))
        for (const [word, holds, said] of RANK_WORDS) {
          if (!word.test(g.note) || holds(rankOf.get(marks[0]), rows.length)) continue;
          const actual = [...rankOf].find(([, r]) => (said === "the highest" ? r === 1 : said === "the lowest" ? r === rows.length : r === ["second", "third", "fourth"].indexOf(said) + 2));
          throw new GestureRefusal(
            `gestures[${i}].note`,
            `calls ${marks[0]} ${said}, but ${marks[0]} ranks ${rankOf.get(marks[0])} of ${rows.length}${actual ? ` and ${actual[0]} is ${said}` : ""}: drop the word, or write the note on ${actual ? actual[0] : "that row"}`,
            { set: { index: i, field: "note", value: g.note.replace(word, "").replace(/\s{2,}/g, " ").trim() } },
          );
        }
      if (ratio !== undefined)
        for (const [word, x] of RATIO_WORDS) {
          if (!word.test(g.note)) continue;
          const more = /\bmore than\b/i.test(g.note);
          const less = /\b(less|fewer) than\b/i.test(g.note);
          const holds = more ? ratio > x : less ? ratio < x : Math.abs(ratio - x) <= x * 0.1;
          if (!holds)
            throw new GestureRefusal(
              `gestures[${i}].note`,
              `says ${g.note.match(word)[0]}, but ${marks[0]} is ${ratio.toFixed(2)} times the other: state the ratio as a number`,
              { set: { index: i, field: "note", value: `${ratio.toFixed(1)} times` } },
            );
        }
    }

    // claim: the gesture touches the takeaway's entity or comparison, or states one of its figures
    const touches = [...marks, ...of].some((m) => entities.has(m));
    const statesFigure = own.some((f) => takeawayFigures.some((t) => Math.abs(t - f) <= Math.max(0.5, Math.abs(t) * 0.005)));
    const wholeChart = WHOLE_CHART.has(g.do) || (g.do === "count" && !marks.length);
    if (!touches && !statesFigure && !(wholeChart && entities.size))
      throw new GestureRefusal(
        `gestures[${i}]`,
        `${g.do} on ${[...marks, ...of].join(", ") || "nothing"} does not serve the takeaway, which is about ${[...entities].join(", ") || "no drawn row"}: drop it, or act on those rows`,
        { remove: i },
      );

    // change and conflicts
    const signature = JSON.stringify([g.do, [...marks].sort(), g.of === "whole" ? "whole" : [...of].sort(), g.value ?? null]);
    if (seen.has(signature))
      throw new GestureRefusal(`gestures[${i}]`, `repeats gestures[${seen.get(signature)}] and changes nothing in the picture: drop it`, { remove: i });
    seen.set(signature, i);
    if (g.do === "rescale" && rescaled)
      throw new GestureRefusal(`gestures[${i}]`, `a second rescale moves the one scale twice: drop it`, { remove: i });
    if (g.do === "rescale" && compared)
      throw new GestureRefusal(
        `gestures[${i}]`,
        `rescales after a comparison, so the shots being compared stand on two scales (no-float-baseline-rescale): drop it, or move it before the comparison`,
        { remove: i },
      );
    if (g.do === "rescale") rescaled = true;
    if (g.do === "compare" || g.do === "bracket") compared = true;
    if ((g.do === "name" || g.do === "annotate") && g.note !== undefined) {
      if (noted.has(marks[0]))
        throw new GestureRefusal(`gestures[${i}]`, `${marks[0]} already carries a note; two notes on one row collide: drop this one`, { remove: i });
      noted.add(marks[0]);
    }

    // `of` resolved to its rows, so a scheduler splitting marks into own and of counts the rows a listed string named.
    out.push({ ...g, marks: [...marks, ...of], ...(of.length ? { of } : {}), figures: own });
  });

  // format limits on the whole list
  if (format === "video") {
    if (gestures.length < 3) {
      const has = (d) => gestures.some((g) => g.do === d);
      const gesture = !has("pull-back") ? { do: "pull-back" } : !has("reveal") ? { do: "reveal" } : { do: "count" };
      const at = gesture.do === "pull-back" ? gestures.length : 0;
      throw new GestureRefusal(
        "gestures",
        `a video takes exactly three gestures (reveal, subject, conclusion); this list has ${gestures.length}: add ${3 - gestures.length}, e.g. ${gesture.do}`,
        { add: { at, gesture } },
      );
    }
    if (gestures.length > 3)
      throw new GestureRefusal(`gestures[3]`, `a video takes exactly three gestures; drop this fourth one`, { remove: 3 });
    if (HIDES_THE_WHOLE.has(gestures[2].do))
      throw new GestureRefusal(
        `gestures[2]`,
        `a video's conclusion shows the whole chart, and ${gestures[2].do} hides part of it: make the third gesture pull-back`,
        { set: { index: 2, value: { do: "pull-back" } } },
      );
  }
  if (format === "web" && gestures.every((g) => WEB_RESTING.has(g.do))) {
    const subject = [...entities][0] ?? rows[0].name;
    const v = valueOf.get(subject);
    throw new GestureRefusal(
      "gestures",
      `a web page needs at least one gesture a reader asks for (bracket, compare, filter, zoom, reorder or rescale); every gesture here rests on the page`,
      { add: { at: gestures.length, gesture: { do: "bracket", mark: subject, of: "whole", note: `${v} of ${whole}` } } },
    );
  }
  return { gestures: out, whole, entities: [...entities] };
}

export { FAMILY_GESTURES };

/**
 * The model's list with every refusal's fix applied until the core accepts it: the gesture kit never fails on its
 * staging. The composition stays the model's — a fix corrects a figure, a mark or a format count, or drops the
 * gesture the refusal names; it never proposes a sequence. Each repair is returned so a run can report what code
 * corrected. Refuses only when no accepted list is reached within `steps` (never seen on the eval rows).
 */
export function repairGestures({ gestures, steps = 12, ...input }) {
  let list = structuredClone(gestures ?? []);
  const repairs = [];
  for (let step = 0; step <= steps; step++) {
    try {
      validateGestures({ ...input, gestures: list });
      return { gestures: list, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      repairs.push(error.message);
      list = applyFix(list, error.fix);
    }
  }
  throw new GestureRefusal("gestures", `no accepted list within ${steps} repairs: ${repairs.at(-1)}`, { remove: 0 });
}

/**
 * The row that takes the accent when no gesture highlights one: the first row a gesture acts on (a compare or
 * bracket names its subject first). A 12B scrolly bracketed and compared Lisboa with no highlight, and every bar
 * stayed grey: doctrine's one accent carries the argument, so the subject is never left without it.
 */
export function implicitAccent(gestures) {
  if (gestures.some((g) => g.do === "highlight")) return undefined;
  return gestures.find((g) => g.marks?.length)?.marks[0];
}
