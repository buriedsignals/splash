// The gesture core (craft/gestures/GRAMMAR.md §7): validates a beat's `gestures` against the registry, resolves
// every mark on the rows the beat draws, derives every figure, checks every note's numbers, checks that every
// gesture serves the confirmed takeaway, refuses conflicts and the format's limits. A refusal names the field and
// carries a fix that, applied, moves toward an accepted list — the 12B is told what works, never only what failed.
// Browser-safe: no Node module.
import { admissible, FAMILIES, FAMILY_GESTURES, HIDES_THE_WHOLE, VOCABULARY, WEB_RESTING, WHOLE_CHART } from "./gesture-registry.mjs";

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
  // Trimmed: a name ending in punctuation ("Autres renouv.") left a double space and never matched.
  return rows.filter((r) => hay.includes(` ${fold(r.name).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `)).map((r) => r.name);
}

// ── numbers ───────────────────────────────────────────────────────────────────────────────────────

// The unit may be glued to the figure ("12.29Gt", the China video run); an ordinal ("2nd") is not a figure.
// Grouped thousands may carry a decimal part: "12,289.037" (a 12B card) was read as 12.289 and 37; "4 191,4" and
// "12.289,5" are the comma-decimal forms (points group only when a comma decimal follows: "1.234" stays 1.234).
const NUMBER = /(?<![\p{L}\d])([-\u2212+](?=\d))?(\d{1,3}(?:[ ,\u00a0\u202f]\d{3})+(?:\.\d+)?(?![.,]?\d)|\d{1,3}(?:[. \u00a0\u202f]\d{3})+,\d+(?![.,]?\d)|\d+(?:[.,]\d+)?)(?!\d|(?:st|nd|rd|th)\b)/gu;

/** Every number a text states, with its sign and precision; years and unit bases (100, 1,000, 100,000…) are not figures. */
export function figuresIn(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(NUMBER)) {
    // A sign written right before the digits belongs to the figure ("-12", "+3.4"); a dash between words does not.
    const sign = m[1] ?? "";
    const digits = m[2];
    const raw = sign + digits;
    const groupSep = digits.match(/^\d{1,3}([ ,.\u00a0\u202f])\d{3}/)?.[1];
    const grouped = groupSep !== undefined && /^\d{1,3}(?:[ ,.\u00a0\u202f]\d{3})+(?:[.,]\d+)?$/.test(digits) && (groupSep !== "." || digits.includes(","));
    const tail = grouped ? digits.match(/([.,])(\d+)$/) : null;
    const fraction = tail && tail[1] !== groupSep ? tail : null;
    const decimalMark = fraction?.[1];
    const magnitude = grouped
      ? Number(digits.slice(0, fraction ? -fraction[0].length : undefined).replace(/[ ,.\u00a0\u202f]/g, "") + (fraction ? `.${fraction[2]}` : ""))
      : Number(digits.replace(",", "."));
    const value = sign === "-" || sign === "\u2212" ? -magnitude : magnitude;
    const decimals = grouped ? (fraction?.[2].length ?? 0) : (digits.split(/[.,]/)[1] ?? "").length;
    if (Number.isInteger(value) && value >= 1700 && value <= 2100) continue;
    if (value >= 100 && /^10+$/.test(String(value))) continue;
    // A base after "per"/"na"/"pour"… is the unit, not a figure: "o 1,62 łóżka mniej na 10 tys." was refused for its 10.
    if (/(?<![\p{L}])(per|na|pour|par|je|pro|por)\s+$/iu.test(String(text).slice(Math.max(0, m.index - 8), m.index))) continue;
    const separator = grouped ? groupSep : digits.includes(",") ? "," : ".";
    // A percent sign or word after the figure: it may only be a percentage the gesture draws, never a gap in the unit.
    const percent = /^\s?(%|per ?cent\b|procent|pour ?cent)/i.test(String(text).slice(m.index + m[0].length));
    // A magnitude suffix glued on ("12B", "4.9bn", "250k"): the figure is read at that power of ten as well. A 12B card
    // wrote "(12B)" for China's 12,289,000,000 tonnes, it was read as 12 against tonnes, and repair appended it again.
    const suffix = String(text).slice(m.index + m[0].length).match(/^\s?(k|K|M|B|bn|mn|mln|mld|mrd)(?![\p{L}])/u)?.[1];
    const exp = suffix ? ({ k: 3, K: 3, M: 6, mn: 6, mln: 6 })[suffix] ?? 9 : 0;
    out.push({ raw, value, decimals, sign, separator, grouped, decimalMark, index: m.index, percent, exp });
  }
  return out;
}

// Units move by thousands (t → Gt) and shares by a hundred (0.54 → 54 %); a factor of ten is no unit: "Śląskie ma 40
// łóżek" passed on a drawn 4.
const SCALES = [0, -3, -6, -9, -12, 3, 6, 9, 12, -2, 2];

const matches = (n, f) => [f, ...(n.exp ? [f / 10 ** n.exp] : [])].some((x) => Math.abs(n.value - x) <= 0.5 * 10 ** -n.decimals + 1e-9);

function formatLike(n, f) {
  const [whole, part] = Math.abs(f).toFixed(n.decimals).split(".");
  const body = n.grouped
    ? whole.replace(/\B(?=(\d{3})+$)/g, n.separator) + (part ? (n.decimalMark ?? (n.separator === "," ? "." : ",")) + part : "")
    : part ? whole + n.separator + part : whole;
  const sign = f < 0 ? (n.sign === "\u2212" ? "\u2212" : "-") : n.sign === "+" ? "+" : "";
  return sign + body;
}

/** The words that run a compare's gap up or down from its subject, in the stories' languages. */
const MORE = /\b(more|higher|greater|larger|above|bigger|więcej|wyższ\p{L}*|większ\p{L}*|plus|mehr|höher|mais|maior|más|mayor)\b/iu;
const LESS = /\b(less|fewer|lower|smaller|below|mniej|niższ\p{L}*|mniejsz\p{L}*|moins|weniger|niedriger|menos|menor)\b/iu;

/**
 * The figures a text states as a gap: followed, before any comma or stop, by "more"/"less" (or their forms), and
 * not by "times" or "than twice". A 12B card said China's 12,289 was "12,289 more than the 11,652 from the next five":
 * every figure true, the sentence false.
 */
export function gapFigures(text) {
  const t = String(text ?? "");
  return figuresIn(t).filter((n) => {
    if (n.percent) return false;
    const after = t.slice(n.index + n.raw.length);
    const m = after.match(new RegExp(`^([^\\d.;,:]{0,30}?)(${MORE.source}|${LESS.source})([^.;]{0,24})`, "iu"));
    if (!m) return false;
    if (/(×|\btimes\b|\brazy\b|\bfois\b|\bmal\b|\bvezes\b|\bveces\b)/iu.test(m[1])) return false;
    return !/^\s*(than|niż|que|als|do que)\s+(twice|double|triple|half|dwa razy|deux fois|doppelt|\d+([.,]\d+)?\s*(×|times|razy|fois|mal|vezes|veces))/iu.test(m[m.length - 1]);
  });
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
// Superlatives and ordinals in the stories' languages (comparatives such as "maior que" are left out): "Najwięcej
// łóżek" sat on a per-resident value where its row is third.
const word = (alternatives) => new RegExp(`(?<![\\p{L}])(${alternatives})(?![\\p{L}])`, "iu");
const RANK_WORDS = [
  [word("highest|largest|biggest|greatest|most|top|first|najwięcej|największ\\p{L}*|najwyższ\\p{L}*|pierwsz\\p{L}*|le plus (?:élevé|grand|haut|gros|fort)|la plus (?:élevée|grande|haute|grosse|forte)|premier|première|o maior|a maior|primeir\\p{L}*|höchst\\p{L}*|größt\\p{L}*|meisten|el mayor|la mayor|primer\\p{L}*"), (rank, n) => rank === 1, "the highest"],
  [word("lowest|smallest|least|fewest|bottom|last|najmniej|najmniejsz\\p{L}*|najniższ\\p{L}*|ostatni\\p{L}*|le moins|la moins|le plus (?:faible|bas|petit)|la plus (?:faible|basse|petite)|dernier|dernière|o menor|a menor|últim\\p{L}*|niedrigst\\p{L}*|kleinst\\p{L}*|wenigsten|letzt\\p{L}*|el menor|la menor"), (rank, n) => rank === n, "the lowest"],
  [word("second|drug\\p{L}*|deuxième|segund\\p{L}*|zweit\\p{L}*"), (rank) => rank === 2, "second"],
  [word("third|trzeci\\p{L}*|troisième|terceir\\p{L}*|tercer\\p{L}*|dritt\\p{L}*"), (rank) => rank === 3, "third"],
  [word("fourth|czwart\\p{L}*|quatrième|quart\\p{L}*|viert\\p{L}*"), (rank) => rank === 4, "fourth"],
];

/** A measure per resident, per capita or per 1,000…: its rows do not add up to a whole. */
const RATE = /(?<![\p{L}])(per|pour|par|na|pro|je|por)(?![\p{L}])\s+(\d[\d ,.\u00a0]*\s*)?(resident|inhabitant|capita|person|people|head|habitant|mieszkań|einwohner|kopf|habitante|\d)|per capita|przeliczeniu|par habitant|pro kopf|\brate\b|wskaźnik/iu;

// ── the core ──────────────────────────────────────────────────────────────────────────────────────

/**
 * @param gestures the beat's list
 * @param rows     the rows the beat draws: [{ name, value }], values in the unit the plate prints
 * @param rows     the family's MARKS: [{ name, value, key?, series? }] — a bar is { name: "Lisboa", value }, a line point is
 *                 { name: "2015 · Lisboa", value, key: "2015", series: "Lisboa" }; a gesture may name a mark, a key or a series
 * @param family   a FAMILIES id ("length", "time", …)
 * @param hooks    the family kit's own checks: figures(g, ctx) → extra figures the gesture draws (a crossing, a slope),
 *                 refuse(g, ctx) → throws a GestureRefusal for a family-specific conflict; ctx = { marks, of, valueOf, rows }
 * @param format   static | web | video | scrolly
 * @param claim    { takeaway, subject?, comparison?, entity?, versus?, facts? } from STORYBOARD.md; facts maps a row's name
 *                 to every number data.json holds for it (guards.mjs rowFacts), figures a note may state beside the drawn one
 * @returns        { gestures: [{ ...gesture, marks, figures }], whole, entities }
 */
export function validateGestures({ gestures, rows, family, format, claim, hooks = {} }) {
  const additive = FAMILIES[family]?.additive !== false;
  // An empty note is no note: told to drop a note, a 12B wrote note: "" and was refused for it three times over.
  if (Array.isArray(gestures))
    gestures = gestures.map((g) => (g && typeof g.note === "string" && !g.note.trim() ? Object.fromEntries(Object.entries(g).filter(([k]) => k !== "note")) : g));
  const allowed = admissible(family, format).map((a) => a.do);
  if (!Array.isArray(gestures) || !gestures.length)
    throw new GestureRefusal("gestures", `give a list of gestures, in story order, from: ${allowed.join(", ")}`, {
      add: { at: 0, gesture: { do: "highlight", mark: rows[0]?.name } },
    });
  const whole = rows.reduce((s, r) => s + r.value, 0);
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const rankOf = new Map([...rows].sort((a, b) => b.value - a.value).map((r, i) => [r.name, i + 1]));
  // A takeaway may name a mark, or a series / key / group that holds marks ("Nuclear", "Lisboa" for its whole line).
  const claimText = `${claim.takeaway ?? ""} ${claim.subject ?? ""} ${claim.comparison ?? ""} ${[claim.entity, claim.versus].filter(Boolean).join(" ")}`;
  const holders = [...new Set(rows.flatMap((r) => [r.series, r.key, r.group].filter((v) => v !== undefined).map(String)))]
    .filter((name) => !/^[\d\s.,:–—\-+/%]+$/.test(name))
    .map((name) => ({ name }));
  const namedHolders = new Set(rowsNamedIn(claimText, holders).map(fold));
  const entities = new Set([
    ...rowsNamedIn(`${claim.takeaway ?? ""} ${claim.subject ?? ""} ${claim.comparison ?? ""}`, rows),
    ...[claim.entity, claim.versus].filter(Boolean).flatMap((e) => rowsNamedIn(e, rows)),
    ...rows.filter((r) => [r.series, r.key, r.group].some((v) => v !== undefined && namedHolders.has(fold(String(v))))).map((r) => r.name),
  ]);
  const takeawayFigures = figuresIn(claim.takeaway).map((n) => n.value);
  // The row the takeaway is about: the recorded claim entity, else the drawn row the takeaway names first. It always
  // carries the accent; a highlight on another row rings it instead (two highlights once left the subject grey).
  // By whole word: a row coded "ITA" once matched "habITAnts" and took the accent.
  const at = (name) => {
    const hay = ` ${fold(claim.takeaway ?? "").replace(/[^\p{L}\p{N}]+/gu, " ")} `;
    const i = hay.indexOf(` ${fold(name).replace(/[^\p{L}\p{N}]+/gu, " ")} `);
    return i < 0 ? -1 : i;
  };
  const subject = rowsNamedIn(claim.entity ?? "", rows)[0] ?? rows.map((r) => r.name).filter((n) => at(n) >= 0).sort((a, b) => at(a) - at(b))[0];
  // Every figure the drawn rows hold: each value, the whole, and every run of rows in rank order added up (the next
  // five, the top three). A stated figure among these that a gesture does not draw belongs to other rows: swapping it
  // for the gesture's nearest figure printed China's 12,289,037,000 as "the next five together".
  const ranked = [...rows].sort((a, b) => b.value - a.value).slice(0, 30).map((r) => r.value);
  const dataFigures = [whole, ...rows.map((r) => r.value)];
  if (additive) for (let i = 0; i < ranked.length; i++) for (let j = i + 2, run = ranked[i]; j <= ranked.length; j++) dataFigures.push((run += ranked[j - 1]));

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
  // A key or a series names every mark it holds: "Lisboa" is the whole line of a time series, "2015" every mark at 2015.
  const grouped = (name) => {
    if (typeof name !== "string" || named(name)) return null;
    const of = rows.filter((r) => (r.series !== undefined && fold(r.series) === fold(name)) || (r.key !== undefined && fold(String(r.key)) === fold(name)));
    return of.length ? of.map((r) => r.name) : null;
  };
  // A mark written as an object ({ t: 1988 }, { name: "…" }, a 12B area run) names the same thing as its string.
  // A name the 12B wrapped in its own quotes (`"${p.t} · ${p.series}"` in a template) is the name inside them.
  const unquoted = (m) => (typeof m === "string" ? m.replace(/^\s*["'«“](.*)["'»”]\s*$/s, "$1") : m);
  const asName = (m) => unquoted(m && typeof m === "object" && !Array.isArray(m) ? String(m.name ?? m.key ?? m.t ?? m.series ?? "") : typeof m === "number" ? String(m) : m);
  const listed = (value) => {
    value = asName(value);
    if (typeof value !== "string" || named(value)) return null;
    const whole = grouped(value);
    if (whole) return whole;
    const parts = value.split(/\s*(?:,|;|&|\band\b|\bet\b|\bund\b|\bi\b|\be\b|\by\b)\s*/i).filter(Boolean);
    return parts.length > 1 && parts.every((p) => named(p) || grouped(p)) ? parts.flatMap((p) => grouped(p) ?? [p]) : null;
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
    // A list given as `mark` is the gesture's marks (a 12B China scrolly wrote mark: [the next five]).
    if (g.mark !== undefined) marks = (Array.isArray(g.mark) ? g.mark.flatMap((m) => listed(m) ?? [asName(m)]) : listed(g.mark) ?? [asName(g.mark)]).map((m) => resolve(m, i, "mark"));
    if (g.marks !== undefined) {
      const given = (Array.isArray(g.marks) ? g.marks : [g.marks]).flatMap((m) => listed(m) ?? [asName(m)]);
      const drawn = (m) => named(m);
      const bad = given.findIndex((m) => !drawn(m));
      if (bad >= 0) {
        // Every wrong entry is fixed at once: one at a time, a 38-year run took 38 repairs and never converged.
        const fixed = given.map((m) => (drawn(m) ? m : closest(m, rows)));
        try {
          resolve(given[bad], i, `marks[${bad}]`);
        } catch (error) {
          if (!(error instanceof GestureRefusal)) throw error;
          throw new GestureRefusal(error.field, error.message.slice(error.field.length + 2), { set: { index: i, field: "marks", value: fixed } });
        }
      }
      marks = given.map((m, k) => resolve(m, i, `marks[${k}]`));
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
    // Rows of a rate do not add up: a bracket printed "Suma: 3023" for eight regions' beds per 100,000 residents.
    // A family whose marks do not add up (positions, time series) has no sum or share to bracket or count either.
    if ((g.do === "bracket" || g.do === "count") && !additive)
      throw new GestureRefusal(`gestures[${i}]`, `the ${family} family's values do not add up to a sum or a share: drop the ${g.do}, or compare the marks instead`, { remove: i });
    // A family whose marks count things (countries in bins) adds them up whatever the measure binned is.
    if ((g.do === "bracket" || g.do === "count") && !FAMILIES[family]?.counts && RATE.test([claim.takeaway, claim.subject, claim.unit].filter(Boolean).join(" ")))
      throw new GestureRefusal(`gestures[${i}]`, `the measure is a rate (per resident), and rates do not add up to a sum or a share: drop the ${g.do}, or compare the rows instead`, { remove: i });
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
    // A bracket whose own words name three or more drawn rows spans those rows: a 12B wrote mark "United States", of
    // "whole", and a card naming the next five, twice; the plate then bracketed one row against everything.
    if (g.do === "bracket" && marks.length === 1) {
      const words = rowsNamedIn([g.note, ...[g.card ?? []].flat()].filter(Boolean).join(" "), rows);
      // Three or more: two may be the subject and the row it is compared with ("214 … more than twice Porto").
      if (words.length > 2 && words.includes(marks[0]))
        throw new GestureRefusal(`gestures[${i}].marks`, `the bracket's words name ${words.join(", ")}, but it spans only ${marks[0]}: give marks: [${words.map((w) => JSON.stringify(w)).join(", ")}]`, {
          set: { index: i, value: { ...Object.fromEntries(Object.entries(g).filter(([k]) => k !== "mark" && k !== "of")), marks: words } },
        });
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
    const gapPercents = [];
    if (["highlight", "name", "annotate", "filter", "zoom", "count"].includes(g.do)) own.push(...marks.map((m) => valueOf.get(m)));
    if (g.do === "count") own.push(marks.length || rows.length, sumOf(marks.length ? marks : rows.map((r) => r.name)));
    if (g.do === "bracket") {
      const s = sumOf(marks);
      own.push(s, ...marks.map((m) => valueOf.get(m)));
      if (ofWhole) own.push((s / whole) * 100, s / whole);
      if (ofWhole) percents.push((s / whole) * 100);
      // Against a list of rows: their sum, the two together, and the marks' share of them.
      if (of.length) {
        const t = sumOf(of);
        own.push(t, s + t, s - t, t - s, (s / (s + t)) * 100);
        percents.push((s / (s + t)) * 100);
      }
    }
    let ratio;
    if (g.do === "compare") {
      const a = valueOf.get(marks[0]);
      const b = marks.length > 1 ? sumOf(marks.slice(1)) : ofWhole ? whole : sumOf(of);
      ratio = a / b;
      // A compare states the two lengths, their gap, their ratio, or the gap as a percent of either. Its share of the
      // whole was admitted once, and "13% fewer beds per resident than Łódzkie" passed on Mazowieckie's 12.8 % share
      // when the gap is 3.5 %.
      // The note's own word says which way the gap runs from the subject: "China emitted 60% more" was offered for
      // a subject 150 % above the United States (60 % is how far the United States falls short of China).
      const said = String(g.note ?? "");
      const more = MORE.test(said);
      const less = LESS.test(said);
      // A sentence that names the compared row before its direction word speaks of it ("the United States emitted
      // 60% less"); named after it, the row is the reference ("3,5% mniej niż Łódzkie").
      const at = (name) => said.toLowerCase().indexOf(String(name).toLowerCase());
      const other = marks.length > 1 ? marks[1] : of[0];
      const word = said.search(more ? MORE : LESS);
      const flipped = other !== undefined && at(other) >= 0 && word >= 0 && at(other) < word && (at(marks[0]) < 0 || at(other) < at(marks[0]));
      const [x, y] = flipped ? [b, a] : [a, b];
      const gaps = more && !less ? [(x / y - 1) * 100] : less && !more ? [(1 - x / y) * 100] : [(a / b - 1) * 100, (1 - a / b) * 100, (b / a - 1) * 100, (1 - b / a) * 100];
      own.push(a, b, a - b, b - a, ratio, 1 / ratio, ...gaps);
      percents.push(...gaps);
      gapPercents.push(...gaps);
      // A figure the note states as a gap is the gap.
      for (const n of gapFigures(said)) {
        const gap = Math.abs(a - b);
        const scaleOf = SCALES.find((k) => matches(n, gap * 10 ** k) || matches(n, a * 10 ** k) || matches(n, b * 10 ** k)) ?? 0;
        if (matches(n, gap * 10 ** scaleOf)) continue;
        const fixed = said.slice(0, n.index) + formatLike(n, gap * 10 ** scaleOf) + said.slice(n.index + n.raw.length);
        throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw} as a gap, but the gap between ${marks[0]} and what it is compared with is ${formatLike(n, gap * 10 ** scaleOf)}: write "${fixed}"`, {
          set: { index: i, field: "note", value: fixed },
        });
      }
      if (ofWhole) own.push((a / whole) * 100);
      if (ofWhole) percents.push((a / whole) * 100);
    }
    if (g.do === "reference") own.push(Number(g.value));
    // A rule sits on the drawn measure's axis: one placed at another column's figure draws it as if it were that
    // measure (a 12B ruled Centro's raw count, 412, across a per-100,000 axis). Said in a note it stays true.
    if (g.do === "reference" && g.axis !== "x" && !rows.some((r) => Math.abs(r.value - Number(g.value)) < 1e-9) && Object.values(claim.facts ?? {}).flat().some((f) => Math.abs(f - Number(g.value)) < 1e-9))
      throw new GestureRefusal(`gestures[${i}].value`, `${g.value} is a figure of another column, not of the measure the axis draws: write it in a note on its row (annotate) instead of a rule`, { remove: i });
    if (g.do === "rescale") own.push(Number(g.value));
    // The family's own figures (a crossing, a slope, a median) and conflicts, from its kit.
    const ctx = { marks, of, valueOf, rows, claim, index: i };
    // The family's figures may be percentages too (a share of the field): they join both pools.
    const familyFigures = hooks.figures ? hooks.figures(g, ctx).filter(Number.isFinite) : [];
    own.push(...familyFigures);
    percents.push(...familyFigures);
    hooks.refuse?.(g, ctx);
    // The whole only where values add up, and ranks only for a few marks: a highlighted series of thirty readings made
    // every integer up to thirty a "rank", and a sum of ranks at a power of ten passed for "rank 2".
    const context = [...(additive ? [whole] : []), ...(marks.length <= 3 ? marks.map((m) => rankOf.get(m)) : []), ...marks.flatMap((m) => claim.facts?.[m] ?? [])];

    // notes: every number is one of the gesture's figures, at the note's precision
    if (g.note !== undefined && g.do !== "zoom") {
      // The digits of a name the note writes ("60-64", "2023") are the name, not a figure: blanked at their place.
      const names = [...new Set(rows.flatMap((r) => [r.name, r.key, r.series, r.group]).filter((v) => v !== undefined).map(String))]
        .filter((n) => /\d/.test(n))
        .sort((a, b) => b.length - a.length);
      let read = String(g.note);
      for (const n of names) read = read.split(n).join(" ".repeat(n.length));
      const stated = figuresIn(read);
      const asPercent = [...percents, ...marks.map((m) => valueOf.get(m)), ...marks.flatMap((m) => claim.facts?.[m] ?? [])];
      // One power-of-ten scale for the whole note: the rows may be in tonnes and the note in Gt.
      const scale = SCALES.map((k) => ({ k, hits: stated.filter((n) => !n.percent && [...own, ...context].some((f) => matches(n, f * 10 ** k))).length }))
        .reduce((best, c) => (c.hits > best.hits ? c : best), { k: 0, hits: -1 }).k;
      const figures = [...own, ...context].map((f) => f * 10 ** scale);
      for (const n of stated) {
        // A figure with no percent sign is never a percentage gap: "4,3 beds per million fewer" was offered "3,4", the
        // gap in percent, when the gap is 132 beds per million.
        // A percent only ever matches a percentage or a row's own value, never any figure of the gesture.
        const pool = n.percent ? asPercent : figures.filter((f) => !gapPercents.some((p) => Math.abs(p * 10 ** scale - f) < 1e-9));
        if (pool.some((f) => matches(n, f))) continue;
        // A fix offers only what this gesture itself draws: a rank or a count may be stated, never substituted for a
        // figure ("4,3 beds fewer" was offered Mazowieckie's rank, "3,0").
        const drawn = n.percent && percents.length ? percents : [...own, ...(ofWhole ? [whole] : [])].map((x) => x * 10 ** scale).filter((x) => n.percent || !gapPercents.some((p) => Math.abs(p * 10 ** scale - x) < 1e-9));
        const best = drawn.length ? drawn.reduce((p, f) => (Math.abs(f - n.value) < Math.abs(p - n.value) ? f : p), drawn[0]) : Infinity;
        // A true figure of other rows: the gesture's marks are likely wrong, not the number, so the note goes.
        if (!n.percent && dataFigures.some((f) => matches(n, f * 10 ** scale)))
          throw new GestureRefusal(
            `gestures[${i}].note`,
            `states ${n.raw}, a figure of other rows than this ${g.do} draws: check the rows it acts on (mark, marks, of), or drop the note`,
            { set: { index: i, field: "note", value: undefined } },
          );
        // Nothing this gesture draws is near the figure: the nearest would only swap one false number for another (a
        // China bracket on the wrong rows was offered the United States' total as "the next five"), so the note goes.
        if (Math.abs(best - n.value) > Math.abs(n.value) * 0.5)
          throw new GestureRefusal(
            `gestures[${i}].note`,
            `states ${n.raw}, which nothing this ${g.do} draws comes near (${[...new Set(own.map((x) => formatLike(n, x * 10 ** scale)))].slice(0, 4).join(", ")}): drop the note, or check the rows the gesture acts on`,
            { set: { index: i, field: "note", value: undefined } },
          );
        const fixed = g.note.slice(0, n.index) + formatLike(n, best) + g.note.slice(n.index + n.raw.length);
        throw new GestureRefusal(
          `gestures[${i}].note`,
          `states ${n.raw}, but the drawn rows give ${formatLike(n, best)} for this ${g.do}: write "${fixed}"`,
          { set: { index: i, field: "note", value: fixed } },
        );
      }
      if (marks.length === 1 && ["name", "annotate", "highlight"].includes(g.do))
        for (const [word, holds, said] of RANK_WORDS) {
          // A rank word may speak of another column the row is ranked by ("the most beds", raw, beside a rate).
          const columns = Math.max(0, ...rows.map((r) => claim.facts?.[r.name]?.length ?? 0));
          const rankIn = (c) => 1 + rows.filter((r) => (claim.facts?.[r.name]?.[c] ?? -Infinity) > (claim.facts?.[marks[0]]?.[c] ?? -Infinity)).length;
          if (!word.test(g.note) || holds(rankOf.get(marks[0]), rows.length) || Array.from({ length: columns }, (_, c) => rankIn(c)).some((r) => holds(r, rows.length))) continue;
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
    // A whole-chart gesture serves a takeaway that names no drawn row when another gesture states one of its figures.
    const listStatesFigure = gestures.some((h) => figuresIn(h?.note).some((n) => takeawayFigures.some((t) => Math.abs(t - n.value) <= Math.max(0.5, Math.abs(t) * 0.005))));
    if (!touches && !statesFigure && !(wholeChart && (entities.size || listStatesFigure)))
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
    out.push({ ...g, marks: [...marks, ...of], ...(of.length ? { of } : {}), figures: own, ...(subject !== undefined ? { subject } : {}) });
  });

  // format limits on the whole list
  if (format === "video") {
    if (gestures.length < 3) {
      const has = (d) => gestures.some((g) => g.do === d);
      // A count only where values add up; elsewhere a highlight of the subject fills the event.
      const gesture = !has("pull-back") ? { do: "pull-back" } : !has("reveal") ? { do: "reveal" } : additive ? { do: "count" } : { do: "highlight", mark: [...entities][0] ?? rows[0].name };
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
      `a web page needs at least one gesture a reader asks for (${allowed.filter((d) => !WEB_RESTING.has(d)).join(", ")}); every gesture here rests on the page`,
      // The fix is a control this family draws: a bracket only where values add up, else a filter on the subject.
      { add: { at: gestures.length, gesture: additive && allowed.includes("bracket") ? { do: "bracket", mark: subject, of: "whole", note: `${v} of ${whole}` } : { do: "filter", marks: [subject] } } },
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
  const subject = gestures.find((g) => g.subject !== undefined)?.subject;
  if (subject !== undefined) return gestures.some((g) => g.do === "highlight" && g.marks.includes(subject)) ? undefined : subject;
  if (gestures.some((g) => g.do === "highlight")) return undefined;
  return gestures.find((g) => g.marks?.length)?.marks[0];
}
