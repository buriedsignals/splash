// The refusals every zone kit shares, each one learned from a 12B run. A kit's render-beat.mjs calls
// them before it draws; the harness copies this folder into the beat beside the kit. A refusal names
// what to change in beat.mjs — the model's only file.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { codeFor, norm } from "./country-names.mjs";

const front = (here) => {
  const storyboard = join(here, "..", "..", "STORYBOARD.md");
  if (!existsSync(storyboard)) return null;
  const text = readFileSync(storyboard, "utf8").split("---")[1] ?? "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
};

/**
 * What the journalist recorded, held on the plate: the credit line with its as-of date (a 12B beat
 * printed "unattributed" with no date), the takeaway as the headline's first form, word for word (one
 * translated it into German, another computed its percentage from the July table), and the named limits
 * carried by the standfirst (one replaced them with its own sentences). A map kit names its basemap's
 * attribution, which the journalist's credit replaced on a choropleth's plate.
 */
/** The credit's as-of date in the story's language: "as of 2025-06-26" closed a French plate (gx-bullet web, 2026-11-13). */
const asOfIn = (language, date) => {
  const [y, m, d] = String(date).split("-");
  const dmy = y && m && d ? `${d}/${m}/${y}` : date;
  const said = { fr: `données au ${dmy}`, de: `Stand: ${d && m ? `${d}.${m}.${y}` : date}`, es: `datos a ${dmy}`, pt: `dados de ${dmy}`, it: `dati al ${dmy}` };
  return said[language.toLowerCase().slice(0, 2)] ?? `as of ${date}`;
};

/** The credit with its as-of date in the story's language, unless the credit already carries one. */
export const datedCredit = (credit, date, language = "") =>
  credit && date && !/\bas of\b|\bdonnées au\b|\bStand\b|\bdatos a\b|\bdados de\b|\bdati al\b/i.test(credit)
    ? `${credit} · ${asOfIn(String(language ?? ""), date)}`
    : credit || (date ? asOfIn(String(language ?? ""), date) : "");

/** What a beat function was called with, by its keys: the only things it can read. */
const shapeOf = (args) =>
  args.length === 0 ? "nothing" : args.map((a) => (a && typeof a === "object" && !Array.isArray(a) ? `{ ${Object.keys(a).join(", ")} }` : Array.isArray(a) ? "an array" : typeof a)).join(", ");

/**
 * A beat function that reads what the kit never passes threw a bare engine message: gx-bullet web (Qwen3.5-9B,
 * 2026-11-13) read r.parts in detail(r), and three renders refused "undefined is not an object (evaluating
 * 'r.parts.map')" until the session stopped. The fault now names the field, its line in beat.mjs and the keys it
 * receives. A function's own Error (a check's refusal) passes word for word.
 */
function explainFaults(beat) {
  for (const [key, fn] of Object.entries(beat)) {
    if (typeof fn !== "function") continue;
    const explain = (error, args) => {
      if (!(error instanceof TypeError || error instanceof ReferenceError)) return error;
      const line = /beat\.mjs:(\d+)/.exec(String(error.stack))?.[1];
      return new Error(`beat.mjs's ${key}(…) failed${line ? ` at line ${line}` : ""}: ${error.message}. ${key} receives ${shapeOf(args)} and nothing else: read anything more from beat.mjs's own constants, by those keys.`);
    };
    beat[key] = function (...args) {
      try {
        const out = fn.apply(this, args);
        return out instanceof Promise ? out.catch((error) => { throw explain(error, args); }) : out;
      } catch (error) {
        throw explain(error, args);
      }
    };
  }
}

/** @param {any} beat @param {string} here @param {{ title?: string, standfirst?: string, source?: string, basemap?: string }} [options] */
export function applyStoryboard(beat, here, { title = "title", standfirst = "limits", source = "source", basemap } = {}) {
  // A 12B beat once exported its fields one by one; the first write below then threw a bare TypeError.
  if (!beat || typeof beat !== "object")
    throw new Error("beat.mjs has no default export: put every field in one object, export default { title: …, limits: …, source: …, check(…) { … } } (see CONTRACT.md)");
  explainFaults(beat);
  const field = front(here);
  if (!field) return;
  const credit = field("credit");
  const asOf = field("effectiveDate");
  const dated = credit && asOf ? datedCredit(credit, asOf, field("language")) : credit;
  // A beat that gives its source as forms (a video's one-line credit) keeps forms: the dated credit, then the credit
  // alone. One dated string ran past the line and every render refused (gx-bullet video, Qwen3.5-9B, 2026-11-13).
  // The beat's own forms shorter than the credit stay too, dated first: the credit with its date overran a video's line,
  // its shorter forms were dropped, and the plate printed it undated (gx-bullet video, Qwen3.5-9B, 2026-11-13).
  if (credit && Array.isArray(beat[source]) && dated !== credit) {
    const shorter = beat[source].map((f) => String(f ?? "").trim()).filter((f) => f && f.length < credit.length);
    const lang = field("language");
    beat[source] = [...new Set([dated, ...shorter.map((f) => datedCredit(f, asOf, lang)), credit, ...shorter])];
  } else if (credit) beat[source] = dated;
  const withBasemap = (form) => (String(form ?? "").includes(basemap) ? form : [form, basemap].filter(Boolean).join(" · "));
  if (basemap) beat[source] = Array.isArray(beat[source]) ? beat[source].map(withBasemap) : withBasemap(beat[source]);
  const named = field("limits");
  const first = [beat[standfirst]].flat()[0];
  if (named && !/^none$/i.test(named) && first !== undefined) {
    const words = (t) => String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
    const said = new Set(words(first));
    const theirs = words(named);
    if (theirs.length && theirs.filter((w) => said.has(w)).length / theirs.length < 0.4)
      // The refusal names the kit's own field: "the standfirst" sent Qwen3.5-9B to write a standfirst field the scrolly kit
      // never reads (gx-bullet scrolly, 2026-11-13), and the E4B refused nine times in a row on it (stress-p, 2026-11-12).
      throw new Error(`${standfirst}: its first form must carry the limits the journalist named, in their words (shorter forms may follow) — a value that works: ${standfirst}: ${Array.isArray(beat[standfirst]) ? `[${JSON.stringify(named)}, …]` : JSON.stringify(named)}`);
  }
  const takeaway = field("takeaway");
  const norm = (t) => String(t).replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
  // Apostrophes and quotation marks are typography, not words: Qwen3.5-9B typed "d'un" for "d’un" and three renders
  // refused a difference it cannot see (gx-proportional-symbol web, 2026-11-13). Equal but for them, the plate prints
  // the journalist's own.
  const plain = (t) => norm(t).replace(/[’‘ʼ`´]/g, "'").replace(/[«»“”„]/g, '"').replace(/\s+/g, "");
  const headline = [beat[title]].flat()[0];
  if (takeaway && headline !== undefined && norm(headline) !== norm(takeaway) && plain(headline) === plain(takeaway))
    beat[title] = Array.isArray(beat[title]) ? [takeaway, ...beat[title].slice(1)] : takeaway;
  else if (takeaway && headline !== undefined && norm(headline) !== norm(takeaway))
    throw new Error(`title's first form must be the journalist's takeaway copied as a literal string, not computed. It renders as: "${norm(headline)}" — it must be: "${takeaway}"`);
  // The plate's own words print the typographic apostrophe: Qwen3.5-9B typed "dans l'électricité" on a video's axis
  // (gx-bullet, 2026-11-13). The title and the credit are the journalist's, and a data cell keeps its spelling for joins.
  {
    const dataFile = join(here, "data.json");
    const data = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, "utf8")) : {};
    const asData = new Set([...(data.columns ?? []).map((c) => String(c.name)), ...(data.rows ?? []).flat().map(String)]);
    // A language that writes its decimals with a comma prints them so: "Albanie, 100.0 %" closed a French plate
    // (gx-choropleth, 12B and Qwen3.5-9B, 2026-11-14). One or two decimals only, never a run of dotted numbers (a date,
    // a version), so a thousands group is never read as a decimal.
    const comma = /^(fr|de|es|it|pt|pl|nl|cs|sk|sl|hr|ro|ru|uk|tr|sv|fi|da|nb|no|el|hu)/i.test(String(field("language") ?? ""));
    const mark = (t) => (comma ? t.replace(/(?<![\d.,]|\p{L})(\d+)\.(\d{1,2})(?![\d.])/gu, "$1,$2") : t);
    const curl = (v) => (typeof v === "string" && !asData.has(v) ? mark(v.replace(/(\p{L})'(?=\p{L})/gu, "$1’")) : v);
    const curlAll = (v) => (Array.isArray(v) ? v.map(curl) : curl(v));
    for (const key of Object.keys(beat)) if (key !== title && key !== source) beat[key] = curlAll(beat[key]);
    if (Array.isArray(beat.gestures))
      beat.gestures = beat.gestures.map((g) => (g && typeof g === "object" ? Object.fromEntries(Object.entries(g).map(([k, v]) => [k, ["note", "card", "label"].includes(k) ? curlAll(v) : v])) : g));
  }
  // The plate may draw a shorter form instead of the takeaway; a 26B wrote those in French under `language: en` (G2).
  const language = String(field("language") ?? "").toLowerCase().slice(0, 2);
  // Every word the plate prints is in that language: the E4B wrote French notes and a Portuguese eyebrow on an English
  // plate (stress-p, 2026-11-12), and Qwen3.5-9B Portuguese shorter title and standfirst forms (stress-p, 2026-11-13),
  // fixed one refusal per render. One refusal names every foreign string, so one edit pass fixes them all.
  // A shorter title form is the takeaway said in fewer words, not another headline: a copy ladder that spends the
  // headline printed "La puissance tient dans peu de sites" for a claim about a hundredth of the sites
  // (gx-proportional-symbol static, Qwen3.5-9B, 2026-11-13). Each form keeps the takeaway's numbers and a third of its words
  // (their first five letters: "cleaned" is "cleaner").
  // It runs after the language check: a form in another language is that refusal's, not this one's.
  const claimKept = () => {
    if (!takeaway || !Array.isArray(beat[title]) || beat[title].length < 2) return;
    const words = (t) => String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !/^\d/.test(w));
    const stem = (w) => w.slice(0, 5);
    const numbers = (t) => String(t).match(/\d+(?:[.,]\d+)?/g) ?? [];
    const claim = words(takeaway);
    const figures = numbers(takeaway);
    const keeps = (form) => {
      const said = new Set(words(form).map(stem));
      const shown = numbers(form);
      return figures.every((n) => shown.includes(n)) && (!claim.length || claim.filter((w) => said.has(stem(w))).length / claim.length >= 1 / 3);
    };
    const forms = beat[title].map((f) => String(f ?? ""));
    const lost = forms.findIndex((f, i) => i > 0 && !keeps(f));
    if (lost > 0) {
      const kept = forms.filter((f, i) => i === 0 || keeps(f));
      throw new Error(`title: its form ${lost + 1}, "${norm(forms[lost])}", drops the takeaway's claim${figures.length ? ` (${figures.join(", ")})` : ""}: a shorter form says the takeaway in fewer words, keeping its numbers and its key words (${claim.join(", ")}) — a value that works: title: ${JSON.stringify(kept)}`);
    }
  };
  if (!STOPWORDS[language]) return claimKept();
  // A row or series name copied from the data is the journalist's data, not the plate's words.
  const dataPath = join(here, "data.json");
  const table = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : {};
  const cells = new Set([...(table.columns ?? []).map((c) => String(c.name)), ...(table.rows ?? []).flat().map(String)]);
  const isForeign = (text) => {
    if (cells.has(text)) return false;
    const said = languageOf(text);
    if (said) return said !== language;
    // A note too short for languageOf ("214 contra 96", "de 394": Qwen3.5-9B on an English plate, stress-p 2026-11-13)
    // is foreign when it holds a function word no English plate prints. Only these: the broad lists hold words an
    // English plate does print ("per cent", "as", "en", "CHE"), 21 false refusals over 238 delivered beats.
    // A particle inside a name ("Rio de Janeiro") is the name's, not the note's.
    if (language !== "en") return false;
    const words = String(text).replace(/\p{Lu}\p{L}*\s+(?:\p{Ll}{1,3}\s+)+(?=\p{Lu})/gu, "").toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
    return words.some((w) => NOT_ENGLISH.has(w));
  };
  // The title's and standfirst's first forms are held above in the journalist's own words; the credit is the storyboard's.
  const held = new Set([title, standfirst, source, "rows", "check", "format", "alt"]);
  const strays = [];
  const walk = (value, path) => {
    if (typeof value === "string") strays.push([path, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
  };
  for (const key of [title, standfirst]) [beat[key]].flat().slice(1).forEach((form, i) => typeof form === "string" && strays.push([`${key}[${i + 1}]`, form]));
  for (const [k, v] of Object.entries(beat)) if (!held.has(k)) walk(v, k);
  const foreign = strays.filter(([, text]) => isForeign(text));
  if (!foreign.length) return claimKept();
  const titled = foreign.some(([path]) => path.startsWith(`${title}[`));
  const list = foreign.map(([path, text]) => `${path} is "${text}"`).join("; ");
  throw new Error(
    `${titled ? `the title's shorter forms must be in the storyboard's language (${language}), like the takeaway. ` : ""}${list}: not in the storyboard's language (${language}). Rewrite each of them in that language${titled ? ` (each shorter title form as a shortening of "${takeaway}")` : `, like the takeaway "${takeaway}"`}.`,
  );
}

/** Function words of other languages that no English plate prints, read on notes too short for languageOf. */
const NOT_ENGLISH = new Set(["de", "des", "du", "le", "les", "et", "em", "da", "dos", "das", "contra", "und", "der", "mit", "von", "para", "com", "mais", "del", "los", "más"]);

/** Function words that tell a headline's language apart (no figures, no names). */
const STOPWORDS = {
  en: ["the", "and", "of", "in", "to", "a", "is", "are", "than", "more", "less", "all", "its", "their", "from", "at", "on", "with", "yet", "but", "lost", "gained"],
  fr: ["le", "la", "les", "des", "du", "de", "et", "en", "un", "une", "plus", "moins", "chez", "eux", "tous", "toutes", "sont", "est", "que", "qui", "aux", "au", "sur", "dans", "pour"],
  de: ["der", "die", "das", "und", "ist", "sind", "mehr", "weniger", "alle", "ein", "eine", "im", "mit", "von", "zu", "auf", "als"],
  es: ["el", "los", "las", "del", "y", "es", "son", "más", "menos", "todos", "una", "con", "por", "para", "que"],
  it: ["il", "lo", "gli", "della", "dei", "e", "è", "sono", "più", "meno", "tutti", "una", "con", "per", "che"],
  pt: ["o", "os", "as", "do", "da", "dos", "das", "e", "é", "são", "mais", "menos", "todos", "uma", "com", "por", "para", "que", "em"],
  nl: ["de", "het", "een", "en", "is", "zijn", "meer", "minder", "alle", "van", "met", "op", "voor", "dan"],
};

/** The language a short text is most clearly written in, or null when no language leads by two function words. */
function languageOf(text) {
  const words = String(text).toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const scores = Object.entries(STOPWORDS).map(([lang, list]) => [lang, words.filter((w) => list.includes(w)).length]).sort((a, b) => b[1] - a[1]);
  return scores[0][1] >= 2 && scores[0][1] - scores[1][1] >= 2 ? scores[0][0] : null;
}

/** Every drawn value is a number (a cell in another digit system once concatenated instead of adding). */
export function assertNumbers(entries, label = "values") {
  const bad = entries.filter(([, v]) => typeof v !== "number" || !Number.isFinite(v));
  if (bad.length)
    throw new Error(`${label} hold values that are not numbers: ${bad.slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}. Convert them with Number(), or leave out the rows the data cannot give (say so in the standfirst)`);
}

/** Value labels a reader can tell apart (a per-resident rate once printed 0,004 on every bar). */
export function assertLegibleLabels(values, format) {
  // Rows rounded before they are drawn: a 12B wrote Math.round(beds / population * 1000), every region became 4, and
  // the plate could no longer show the subject third.
  if (values.length >= 4 && values.every(Number.isInteger) && new Set(values).size * 2 <= values.length)
    throw new Error(`the rows' values tie (${values.slice(0, 4).join(", ")}…): they were rounded before drawing. Keep the computed value unrounded in rows (no Math.round) and let format() choose the decimals`);
  if (values.every((v) => Math.abs(v) < 0.1))
    throw new Error(`every value is below 0.1 (${values.slice(0, 3).join(", ")}): draw the rate per 1,000, 10,000 or 100,000 (multiply the values) so the labels read as whole numbers, and say the base in the standfirst or unit`);
  // A 12B video printed CO₂ to the last tonne ("12,289,037,000 t") where the worked example reads "12,3 Gt".
  const digits = (t) => (String(t).match(/\d/g) ?? []).length;
  if (values.every((v) => Math.abs(v) >= 1e7) && values.every((v) => digits(format(v)) >= 8)) {
    const [scale, word] = Math.min(...values.map(Math.abs)) >= 1e9 ? [1e9, "billions"] : [1e6, "millions"];
    throw new Error(`every value is printed to 8 digits or more (${format(values[0])}): draw them in ${word} (divide by ${scale.toExponential(0).replace("e+", "e")}) and say it in the unit (e.g. "Gt", "million"), so the labels read at a glance`);
  }
  const labels = new Set(values.map((v) => format(v)));
  const distinct = new Set(values).size;
  if (labels.size < Math.min(distinct, values.length) * 0.75)
    throw new Error(`format() prints ${distinct} different values as only ${labels.size} labels (${[...labels].slice(0, 3).join(", ")}): show enough decimals, or rescale, so different marks read differently`);
}

/**
 * The beat's format, with as many decimals as keep distinct values distinct: a 12B printed 4.05, 4.02 and 3.88 as
 * "4", "4", "4" and the render refused six attempts. The kit chooses the decimals rather than refusing (Rémy: the
 * gesture kit never fails on the data's shape); the decimal mark and grouping are read from the beat's own format.
 */
export function legibleFormat(values, format) {
  const collapsed = (f) => new Set(values.map((v) => f(v))).size < Math.min(new Set(values).size, values.length) * 0.75;
  if (!collapsed(format)) return format;
  // A compact format ("1.2M") shows no grouping; whole counts then read best grouped (runs 36 and 38: "406220.0").
  const decimalComma = /\d,\d/.test(String(format(1.5)));
  const group = String(format(1234567)).match(/^1([^\d])234/)?.[1] ?? (/1234567/.test(String(format(1234567))) ? "" : decimalComma ? "\u202f" : ",");
  // A format with no decimals shows no decimal mark: a space or point grouping thousands (pl, de, fr) implies a comma.
  const comma = decimalComma || (group !== "" && group !== ",");
  for (let d = values.every((v) => Number.isInteger(Number(v))) ? 0 : 1; d <= 4; d++) {
    const f = (v) => {
      const [whole, part] = Math.abs(Number(v)).toFixed(d).split(".");
      return `${Number(v) < 0 ? "-" : ""}${whole.replace(/\B(?=(\d{3})+$)/g, group)}${part ? `${comma ? "," : "."}${part}` : ""}`;
    };
    if (!collapsed(f)) return f;
  }
  return format;
}

/**
 * The beat's check(), its refusal saying which side may be wrong: a 12B's check() threw "Mazowieckie is rank 3",
 * which is the takeaway itself, and three attempts went to editing the data rather than the inverted condition.
 */
export function runCheck(beat) {
  try {
    beat.check();
  } catch (error) {
    const message = String(error?.message ?? error);
    // The same figure twice ("99.5%, expected 99.5%"): an exact === on a computed value that only rounds to it.
    const figures = (message.match(/\d+(?:[.,]\d+)?/g) ?? []).map((d) => d.replace(",", "."));
    const sameTwice = figures.some((f, i) => f.includes(".") && figures.indexOf(f) !== i);
    if (sameTwice)
      throw new Error(`check() threw: ${message}. Both sides print the same figure: the computed value only rounds to it, so compare with a tolerance, e.g. Math.abs(value - expected) > 0.05, never ===`);
    throw new Error(`check() threw: ${message}. If that is what the takeaway says, check() is inverted: it must throw only when the data contradicts the takeaway — fix its condition, not the data`);
  }
}

/** One point per x: several rows per year drawn as one series zig-zags (three location groups, once). */
export function assertOnePerX(points, x = "year") {
  const seen = new Map();
  for (const p of points) seen.set(p[x], (seen.get(p[x]) ?? 0) + 1);
  const doubled = [...seen].filter(([, n]) => n > 1);
  if (doubled.length)
    throw new Error(`data holds ${doubled[0][1]} values for ${doubled[0][0]} (and ${doubled.length - 1} other(s)): filter data.json's rows to ONE series — read its other columns — so each ${x} has one value`);
}

/**
 * Most figures the headline states at the scale of the drawn values are among them (or their total): a
 * beat once drew the inside-built-up-areas series (17 to 119) under a takeaway that says 36 to 214. A
 * takeaway may state a figure the plate does not draw, so only a majority missing refuses.
 */
export function assertHeadlineNumbersDrawn(headline, drawn, label = "marks", dataPath = join(import.meta.dirname, "data.json")) {
  // Magnitudes: a title states a loss as "fell 12" against a drawn -12; signed bounds left negatives unchecked.
  const signed = drawn.filter((v) => Number.isFinite(v));
  if (!signed.length) return;
  const values = signed.map(Math.abs);
  const total = Math.abs(signed.reduce((a, b) => a + b, 0));
  // Callers pass the values first and their own figures after (breaks, counts): every running total, so the values'
  // own total is in, whatever follows them.
  let run = 0;
  const totals = signed.map((v) => Math.abs((run += v)));
  const allowed = [...new Set([...values, ...totals])];
  const lo = Math.min(...values) / 2;
  const hi = Math.max(Math.max(...values) * 2, total * 1.2);
  // A digit glued to letters is part of a name (CO2, PM2.5, H2O), not a figure the title states.
  const places = new Map();
  const stated = [...String(headline).matchAll(/(?<![\p{L}\d])(\d{1,3}(?:[ ,  ]\d{3})+|\d+(?:[.,]\d+)?)(?![\p{L}\d])(\s*%)?/gu)]
    .filter((m) => !m[2])
    .map((m) => {
      const text = m[1].replace(/[ ,  ](?=\d{3}\b)/g, "").replace(",", ".");
      const n = Number(text);
      places.set(n, Math.max(places.get(n) ?? 0, text.split(".")[1]?.length ?? 0));
      return n;
    })
    .filter((n) => !(Number.isInteger(n) && n >= 1700 && n <= 2100) && n >= lo && n <= hi);
  // A round figure ("8 900 centrales") stands for anything it rounds from: its unit is the tolerance.
  const unit = (n) => (Number.isInteger(n) && n >= 100 ? 10 ** (String(n).match(/0*$/)[0].length) : 0);
  // A figure written with decimals stands for what rounds to it: "11.8" is 11.75 to 11.85. At ±0.5 it took Germany's
  // 11.71-point move for France's 11.8-point loss, which no mark drew (gx-connected-scatter, Osaurus, 2026-11-12).
  const near = (v, n) => Math.abs(v - n) <= (places.get(n) ? 0.5 * 10 ** -places.get(n) + 1e-9 : Math.max(0.5, Math.abs(n) * 0.005, unit(n)));
  // A figure the title states is a drawn value, their total, or the sum or gap of two drawn values (a change, a lead).
  // Every one must be: the model's check() used to stand behind the title, and it no longer decides (Lisboa drawn at
  // 150 under a title stating 214 of 394 passed the earlier majority rule).
  // Pairs of drawn values only: a running total paired with a value made almost any figure derivable (Lisboa's 214).
  const pool = [...new Set(values)].slice(0, 1500);
  const pairs = (n) => pool.some((a, i) => pool.some((b, j) => j > i && (near(a + b, n) || near(Math.abs(a - b), n))));
  // With many marks almost every figure is the sum or gap of two of them, and the rule refuses nothing: a connected
  // scatter of 64 TWh readings passed "France lost 11.8 points" (Osaurus, 2026-11-11). Pairs count only where they
  // still exclude most figures in the drawn range; there, a change the title states must be drawn by a gesture.
  const top = Math.max(...values);
  const probes = Array.from({ length: 1001 }, (_, k) => (top * k) / 1000);
  const pairsMean = pool.length <= 200 && probes.filter(pairs).length <= 250;
  const derivable = (n) => allowed.some((v) => near(v, n)) || (pairsMean && pairs(n));
  const missing = stated.filter((n) => !derivable(n));
  if (missing.length)
    throw new Error(`the title states ${missing.join(", ")}, which the drawn ${label} do not contain: ${locateStated(missing, stated, dataPath) ?? computedHint(missing, dataPath) ?? "the rows selected from data.json are probably not the takeaway's series — read its other columns and filter to the one the takeaway is about"}`);
}

/**
 * A figure no cell of data.json holds is computed from it (a share, a change in points): no other column will give it.
 * gx-connected-scatter (2026-11-11) titled a share France lost while drawing two TWh columns.
 */
export function computedHint(missing, dataPath) {
  let rows;
  try {
    rows = JSON.parse(readFileSync(dataPath, "utf8")).rows;
  } catch {
    return undefined;
  }
  if (!Array.isArray(rows) || !rows.length) return undefined;
  const cells = rows.flatMap((r) => (Array.isArray(r) ? r : Object.values(r ?? {}))).map(Number).filter(Number.isFinite);
  const absent = missing.filter((n) => !cells.some((c) => Math.abs(Math.abs(c) - n) <= Math.max(0.05, n * 0.005)));
  if (!absent.length) return undefined;
  return `${absent.join(", ")} is in no cell of data.json: it is computed from it (a share, a ratio, a change). Map each row to that computed measure and draw it as the marks: a mark, or the move between two of the same thing's marks, then carries ${absent[0]}. The title stays word for word`;
}

/**
 * Where data.json holds a figure the title states: the column holding most of the title's figures, and the row that
 * holds this one. r8 on Osaurus (2026-11-11): told only to "read its other columns", the 12B rewrote the beat for 25
 * minutes on the inside-built-up-areas rows while 214 sat in the all-locations row of the same column.
 */
export function locateStated(missing, stated, dataPath) {
  let data;
  try {
    data = JSON.parse(readFileSync(dataPath, "utf8"));
  } catch {
    return undefined;
  }
  const { columns = [], rows = [] } = data;
  if (!rows.length || !Array.isArray(rows[0])) return undefined;
  const num = (v) => (typeof v === "number" ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN);
  const hits = (j, n) => rows.filter((r) => num(r[j]) === n);
  const year = (j) => rows.every((r) => Number.isInteger(num(r[j])) && num(r[j]) >= 1700 && num(r[j]) <= 2100);
  const scored = columns
    .map((c, j) => ({ j, name: c.name, score: stated.filter((n) => hits(j, n).length).length, first: missing.filter((n) => hits(j, n).length).length }))
    .filter((c) => c.first && !year(c.j))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return undefined;
  const { j, name } = scored[0];
  const n = missing.find((m) => hits(j, m).length);
  const row = hits(j, n)[0];
  // The cells that tell this row from the others: the year, and every text column with more than one value.
  const keys = columns
    .map((c, k) => ({ c, k }))
    .filter(({ k }) => k !== j && (year(k) || (typeof row[k] === "string" && Number.isNaN(num(row[k])) && new Set(rows.map((r) => r[k])).size > 1)));
  const where = keys.map(({ c, k }) => `${c.name} = ${JSON.stringify(row[k])}`).join(", ");
  const strings = typeof row[j] === "string" ? ` Its cells are strings ("${row[j]}"): draw Number(cell).` : "";
  return `${n} is data.json's column "${name}" in the row where ${where}. Draw that column, filtered to rows like that one${keys.some(({ k }) => !year(k)) ? ` (keep ${keys.filter(({ k }) => !year(k)).map(({ c, k }) => `${c.name} = ${JSON.stringify(row[k])}`).join(", ")})` : ""}.${strings}`;
}

/** When the journalist named the claim's column, the drawn values are that column's (raw beds under a per-resident headline, once). */
export function assertDrawsClaimColumn(drawn, here) {
  const field = front(here);
  const dataPath = join(here, "data.json");
  if (field?.("claimRatio")) return assertDrawsRatio(drawn, here, field("claimRatio"));
  const column = field?.("claimColumn");
  if (!column || !existsSync(dataPath)) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const at = (table.columns ?? []).findIndex((c) => c.name === column);
  if (at < 0) return;
  const held = table.rows.map((r) => Number(String(r[at]).replace(/\s/g, "").replace(",", "."))).filter(Number.isFinite);
  // The column may be drawn in a power-of-ten unit (tonnes as billions of tonnes, a share as a percent):
  // one scale for every drawn value, rounding allowed at the drawn precision.
  const near = (v, h) => Math.abs(h - v) <= Math.max(1e-9, Math.abs(h) * 1e-6, Math.abs(v) < 1e4 ? 0.05 * 10 ** -decimals(v) * 10 : 0);
  const foreignAt = (scale) => drawn.filter((v) => Number.isFinite(v) && !held.some((h) => near(v, h * scale)));
  const scales = Array.from({ length: 25 }, (_, i) => 10 ** (i - 12));
  const best = scales.map((scale) => ({ scale, foreign: foreignAt(scale) })).reduce((a, b) => (b.foreign.length < a.foreign.length ? b : a));
  let { foreign } = best;
  // A comparison draws a second series beside the claim's (pedelecs against bicycles without a motor, r8: both the
  // 12B and the 26B were refused until the cap for drawing the series the storyboard asked for). Values one other
  // column holds at the same scale pass, as long as the claim column is drawn too.
  const columnHolds = (i, v) => table.rows.some((r) => near(v, Number(String(r[i]).replace(/\s/g, "").replace(",", ".")) * best.scale));
  const drawsClaim = drawn.filter(Number.isFinite).length > foreign.length;
  if (foreign.length && drawsClaim && (table.columns ?? []).some((_, i) => i !== at && foreign.every((v) => columnHolds(i, v)))) foreign = [];
  if (foreign.length)
    throw new Error(`the claim is about the column ${column}, but the plate draws values that column does not hold (${foreign.slice(0, 3).join(", ")}): draw ${column}'s values`);
}

const decimals = (v) => (String(v).split(".")[1] ?? "").length;

const cell = (v) => Number(String(v).replace(/\s/g, "").replace(",", "."));

/**
 * A claim on a measure computed from two columns (beds per resident): every drawn value is that ratio at one
 * power-of-ten scale (per resident, per 10,000, a percent). The E4B drew absolute beds under a "third per resident"
 * title (stress-ad, 2026-11-12); the comparison-series exception does not apply, since the numerator is a column.
 */
function assertDrawsRatio(drawn, here, ratio) {
  const dataPath = join(here, "data.json");
  const [top, bottom] = ratio.split(" / ");
  if (!existsSync(dataPath)) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const names = (table.columns ?? []).map((c) => c.name);
  const a = names.indexOf(top);
  const b = names.indexOf(bottom);
  if (a < 0 || b < 0) return;
  const held = table.rows.map((r) => cell(r[a]) / cell(r[b])).filter(Number.isFinite);
  const near = (v, h) => Math.abs(h - v) <= Math.max(1e-9, Math.abs(h) * 0.005, 0.5 * 10 ** -decimals(v));
  const values = drawn.filter(Number.isFinite);
  const scales = Array.from({ length: 25 }, (_, i) => 10 ** (i - 12));
  const foreign = scales.map((s) => values.filter((v) => !held.some((h) => near(v, h * s)))).reduce((x, y) => (y.length < x.length ? y : x));
  if (foreign.length) {
    const first = table.rows.find((r) => Number.isFinite(cell(r[a]) / cell(r[b])));
    const show = first ? ` (${first[0]}: ${cell(first[a])} / ${cell(first[b])} = ${+(cell(first[a]) / cell(first[b])).toPrecision(3)}, or ${+((cell(first[a]) / cell(first[b])) * 10000).toPrecision(3)} per 10,000)` : "";
    throw new Error(`the claim is about ${top} divided by ${bottom}, but the plate draws values that ratio does not hold (${foreign.slice(0, 3).join(", ")}): draw each row's ${top} divided by ${bottom}${show}, at one scale for every row`);
  }
}

/**
 * A card that does not state the figure its picture shows. When it states the same figure at another rounding
 * (format(v, 0) printed 14 for the drawn 13,8 — gx-bullet scrolly, Qwen3.5-9B, 2026-11-13, same refusal 3x), the
 * refusal says so and names the call that prints it as drawn.
 */
export function figureRefusal(where, what, wanted, value, text) {
  const read = (n) => Number(n.replace(",", "."));
  const drawn = value ?? read(String(wanted).replace(/[\s\u00a0\u202f]/g, ""));
  // The same figure rounded otherwise: the drawn value, rounded to the stated figure's decimals, gives it back.
  const near = [...String(text).matchAll(/(?<![\d.,])\d+(?:[.,]\d+)?/g)]
    .map((m) => m[0])
    .find((n) => {
      if (n === wanted || !Number.isFinite(drawn)) return false;
      const places = /[.,](\d+)$/.exec(n)?.[1].length ?? 0;
      return Math.abs(read(n) - Number(drawn.toFixed(places))) < 1e-9;
    });
  const hint = near
    ? `; it states ${near}, the same figure rounded otherwise — a value that works: "${wanted}", printed by format(r.${what}) with no decimals argument`
    : ` — a value that works: a sentence that states "${wanted}"`;
  return `${where} must state ${what} = "${wanted}" — the figure its picture shows${hint}. It says: ${text}`;
}

export const beatHere = (url) => dirname(new URL(url).pathname);

/**
 * A refusal's text, with every error of a failed build spelled out: Bun reports a beat.mjs that does not parse as
 * one AggregateError whose message is only "2 errors building <path>", and the 12B retried three times on that.
 */
/** The whole key of `Two words: value`, when a build error stopped at its second word. */
function spacedKey(e) {
  const found = e?.position && /^Expected "\}" but found "([A-Za-z][\w-]*)"$/.exec(String(e.message ?? ""));
  if (!found) return null;
  const line = String(e.position.lineText ?? "");
  const at = e.position.column ? e.position.column - 1 : line.indexOf(found[1]);
  const before = /([A-Za-z][\w-]*(?: [A-Za-z][\w-]*)*) $/.exec(line.slice(0, at));
  return before && new RegExp(`^${found[1]}\\s*:`).test(line.slice(at)) ? `${before[1].split(/[,{]\s*/).pop()} ${found[1]}` : null;
}

/** The line before a declaration the parser stopped at, when it ends with "," (a statement closed like a field). */
function commaBefore(e) {
  if (!e?.position?.file || !/^Expected identifier but found "(const|let|var|function)"$/.test(String(e.message ?? ""))) return null;
  if (!existsSync(e.position.file)) return null;
  const lines = readFileSync(e.position.file, "utf8").split("\n");
  for (let i = e.position.line - 2; i >= 0; i--) {
    if (!lines[i].trim()) continue;
    return lines[i].trimEnd().endsWith(",") ? i + 1 : null;
  }
  return null;
}

/**
 * A beat.mjs holding the beat twice: the line where its imports start again, and the lines to delete — the copy
 * without `export default` goes, else the first (gx-proportional-symbol web, 12B, 2026-11-13: a draft in lines 1–122,
 * a whole beat from 123, and six refusals listing "has already been declared" names).
 */
function secondCopy(e) {
  if (!e?.position?.file || !/has already been declared$/.test(String(e.message ?? ""))) return null;
  if (!existsSync(e.position.file)) return null;
  const lines = readFileSync(e.position.file, "utf8").replace(/\n$/, "").split("\n");
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("import ")) continue;
    if (!seen.has(line)) {
      seen.add(line);
      continue;
    }
    const exports = (from, to) => lines.slice(from, to).some((l) => /^export default\b/.test(l.trim()));
    const keepFirst = exports(0, i) && !exports(i, lines.length);
    const drop = keepFirst ? `${i + 1}–${lines.length}` : `1–${i}`;
    return `beat.mjs holds two copies of the beat: the second starts at line ${i + 1}, where "${line}" comes again — a value that works: delete lines ${drop} (keep the copy with export default)`;
  }
  return null;
}

export function errorText(error) {
  const one = (e) => {
    // The video credit's only refusal (chart-video shots.mjs sourceCreditFor) names no field: the field is source.
    const credit = /^no form wraps into (\d+) lines? of ([\d.]+)px in .+? ([\d.]+)px$/.exec(String(e?.message ?? ""));
    if (credit) {
      const [, n, px, size] = credit;
      const chars = Math.floor(Number(px) / (Number(size) * 0.55));
      return `source: no form of the credit fits ${n} line${n === "1" ? "" : "s"} of ${Math.round(Number(px))}px — a value that works: add a shorter form as the last item of source, about ${chars} characters or fewer, e.g. ["<the full credit>", "<publisher, dataset, date>"]`;
    }
    // A bare name that is only a field of the beat (gx-bullet scrolly, Qwen3.5-9B, 2026-11-13: format: (v) => … as a
    // field, then format(…) inside a card) came back as "format is not defined", with no line and no fix.
    const bare = e instanceof ReferenceError && /^(\w+) is not defined$/.exec(String(e.message));
    if (bare) {
      const line = /beat\.mjs:(\d+)/.exec(String(e.stack ?? ""))?.[1];
      const name = bare[1];
      return `${name} is not defined${line ? ` (beat.mjs line ${line})` : ""}: a function in beat.mjs calls ${name} by its bare name, but nothing defines it there — a field of the beat is not a variable — a value that works: const ${name} = … above export default, then give the field as ${name}, (shorthand)`;
    }
    const where = e?.position ? ` (line ${e.position.line}: ${String(e.position.lineText ?? "").trim()})` : "";
    // A line holding only a quote opens a string nothing closes (gx-bullet web, 12B, 2026-11-13: a lone backtick after
    // the closing "};"); "Unterminated string literal (line 125: `)" sent the 12B editing template strings elsewhere.
    const lone = e?.position && /^\s*([`'"])[\s,;]*$/.exec(String(e.position.lineText ?? ""));
    if (lone)
      return `${e.message}${where}: line ${e.position.line} holds only a stray ${lone[1]} that opens a string nothing closes — a value that works: delete line ${e.position.line} (edit_file its "${String(e.position.lineText).trim()}" line, with the line before it, to that line alone)`;
    // The same stray quote on the closing line itself: "};`," (gx-proportional-symbol web, 12B, 2026-11-14).
    const tail = e?.position && /^\s*(\}\s*;?)\s*([`'"])[\s,;]*$/.exec(String(e.position.lineText ?? ""));
    if (tail)
      return `${e.message}${where}: line ${e.position.line} closes the beat, then a stray ${tail[2]} opens a string nothing closes — a value that works: line ${e.position.line} reads "${tail[1].replace(/\s+/g, "")}" alone (edit_file "${String(e.position.lineText).trim()}" to "${tail[1].replace(/\s+/g, "")}")`;
    // gx-proportional-symbol web (Qwen3.5-9B, q8, 2026-11-13): "…centrales.`," closed a top-level statement, and the
    // refusal quoted only the next declaration's line; six edits there, never on the comma.
    const comma = commaBefore(e);
    if (comma)
      return `${e.message}${where}: line ${comma} ends with "," but closes a statement, not a field — a value that works: end line ${comma} with ";"`;
    const copy = secondCopy(e);
    if (copy) return copy;
    const key = spacedKey(e);
    if (key)
      return `${key}: ... (line ${e.position.line}) is a key with a space, written without quotes — a value that works: "${key}": (quote the key)`;
    return `${e?.message ?? String(e)}${where}`;
  };
  // One build error comes alone, carrying its own position; several come grouped. An unquoted key with a space
  // (gx-proportional-symbol web, Qwen3.5-9B, 2026-11-13: `San Marino: "Saint-Marin"`) breaks the parse once and
  // cascades into "Expected ;" errors that point at nothing: only its own error is named.
  if (!error?.errors?.length) return one(error);
  const first = error.errors.find((e) => spacedKey(e) || commaBefore(e) || secondCopy(e));
  return [error.message, ...(first ? [first] : error.errors).map(one)].join(" — ");
}

/**
 * No drawn row is an aggregate. OWID-style tables carry regions and the world beside countries, told apart by a
 * three-letter code column ("CHN"; "" or "OWID_WRL" for an aggregate). A 12B video ranked "Africa (GCP)" among the
 * next five emitters. Applies only when such a code column exists.
 */
export function assertNoAggregates(names, here) {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath)) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const columns = table.columns ?? [];
  // OWID codes Kosovo OWID_KOS: a country with no ISO code, not an aggregate.
  const iso = (v) => /^([A-Z]{3}|OWID_KOS)$/.test(String(v ?? ""));
  const code = columns.findIndex((_, c) => table.rows.filter((r) => iso(r[c])).length >= table.rows.length * 0.6);
  if (code < 0) return;
  // An aggregate the storyboard names is the story's subject, not a stray region (real-gwis: "Africa accounts for two
  // thirds of the world's wildfires" — refused, the 12B rebuilt the continents from a country list it made up).
  const field = front(here);
  const told = ["takeaway", "subject", "comparison"].map((k) => field?.(k) ?? "").join(" ").toLowerCase();
  const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = (name) => new RegExp(`(?<![\\p{L}])${escape(String(name).toLowerCase())}(?![\\p{L}])`, "u").test(told);
  const rowOf = (name) => table.rows.find((r) => r.some((cell) => cell === name));
  // A plate of aggregates only (every continent stacked, real-gwis: the journalist asked for "the other five
  // continents in the same stack") mixes no region among countries: the refusal is for the mix.
  if (!names.some((name) => rowOf(name) && iso(rowOf(name)[code]))) return;
  const aggregates = names.filter((name) => {
    const row = rowOf(name);
    return row && !iso(row[code]) && !named(name);
  });
  // The aggregates the story names are drawn as data.json holds them: never rebuilt from a country list.
  const namedRows = [...new Set(table.rows.filter((r) => !iso(r[code])).map((r) => r.find((cell) => typeof cell === "string" && cell !== r[code])).filter((n) => n && named(n)))];
  const namedHint = namedRows.length ? `, or take the aggregates the storyboard names (${namedRows.map((n) => `"${n}"`).join(", ")}) as data.json holds them, never summed from a country list you wrote` : "";
  if (aggregates.length)
    throw new Error(
      `${aggregates.map((a) => `"${a}"`).join(", ")} ${aggregates.length > 1 ? "are aggregates" : "is an aggregate"} in data.json (its ${columns[code].name} is not a country code): build rows only from rows whose ${columns[code].name} is three capital letters, like "${table.rows.find((r) => iso(r[code]))[code]}"${namedHint}`,
    );
}

/** How data.json is laid out and how to read it, in this beat's own column names. */
export function readingHint(here) {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath)) return "";
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const columns = (table.columns ?? []).map((c) => c.name);
  const name = table.columns?.find((c) => c.type === "text")?.name ?? columns[0];
  const value = table.columns?.find((c) => c.type === "number")?.name ?? columns[1];
  return (
    `data.json is { columns: [{ name, type }], rows: [[…]] }: its columns are ${columns.map((c) => `"${c}"`).join(", ")} and each row is an array in that order, e.g. ${JSON.stringify(table.rows?.[0])}. ` +
    `Read it: import { readFileSync } from "node:fs"; import { join } from "node:path"; const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8")); const col = (n) => data.columns.findIndex((c) => c.name === n); ` +
    `const rows = data.rows.map((r) => ({ name: r[col("${name}")], value: Number(r[col("${value}")]) })).sort((a, b) => b.value - a.value);`
  );
}

/**
 * The beat, imported for a gesture kit. A 12B beat read data.json as an array of objects ("data.find(...).value"
 * on undefined), failed three renders, then typed the six rows and a check() that compared constants with
 * themselves: a beat that never reads data.json cannot be contradicted by it. So a beat that throws while
 * loading is answered with data.json's real shape, and one that does not read data.json is refused.
 */
/**
 * The beat's check, derived by code from the recorded claim and data.json (the model no longer writes check(): an
 * inverted condition was a recurring 12B failure). A maximum, minimum or comparison the journalist recorded is decided
 * on claimColumn at the latest time the rows share; "none" and "total" leave the title to the figure guards and the
 * gesture core.
 */
export function claimCheck(here) {
  const f = front(here);
  const shape = String(f?.("claimShape") ?? "").trim().toLowerCase();
  const file = join(here, "data.json");
  if (!["maximum", "minimum", "comparison"].includes(shape) || !existsSync(file)) return () => {};
  const { columns = [], rows = [] } = JSON.parse(readFileSync(file, "utf8"));
  const fold = (v) => String(v ?? "").trim().toLowerCase();
  const at = (name) => columns.findIndex((c) => fold(c.name) === fold(name));
  const col = at(f("claimColumn"));
  const entity = f("claimEntity");
  const versus = f("claimVersus");
  const named = columns.findIndex((c, i) => i !== col && rows.some((r) => fold(r[i]) === fold(entity)));
  if (col < 0 || named < 0) return () => {};
  const time = columns.findIndex((c, i) => i !== col && /^(year|ann[ée]e|jahr|rok|ano|año|anno|date|t|time|period)$/i.test(c.name));
  return () => {
    const times = time < 0 ? [null] : [...new Set(rows.filter((r) => fold(r[named]) === fold(entity)).map((r) => Number(r[time])))].sort((a, b) => b - a);
    const now = times[0];
    const live = rows.filter((r) => (time < 0 || Number(r[time]) === now) && Number.isFinite(Number(r[col])) && r[col] !== null && r[col] !== "");
    const valueOf = (name) => live.find((r) => fold(r[named]) === fold(name))?.[col];
    const mine = Number(valueOf(entity));
    const when = now === null ? "" : ` in ${now}`;
    if (!Number.isFinite(mine)) throw new Error(`the data no longer holds ${entity}'s ${columns[col].name}${when}`);
    const others = live.filter((r) => fold(r[named]) !== fold(entity)).map((r) => Number(r[col]));
    if (shape === "maximum" && others.some((v) => v > mine)) throw new Error(`the data no longer makes ${entity} the highest ${columns[col].name}${when} (${mine} against ${Math.max(...others)})`);
    if (shape === "minimum" && others.some((v) => v < mine)) throw new Error(`the data no longer makes ${entity} the lowest ${columns[col].name}${when} (${mine} against ${Math.min(...others)})`);
    if (shape === "comparison" && versus) {
      const theirs = Number(valueOf(versus));
      const less = /^less/i.test(String(f("claimDirection") ?? ""));
      if (Number.isFinite(theirs) && (less ? !(mine < theirs) : !(mine > theirs)))
        throw new Error(`the data no longer puts ${entity} ${less ? "below" : "above"} ${versus} on ${columns[col].name}${when} (${mine} against ${theirs})`);
    }
  };
}

export async function importBeat(here) {
  const file = join(here, "beat.mjs");
  let beat;
  try {
    ({ default: beat } = await import(file));
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError && !error?.errors)
      throw new Error(`beat.mjs throws while loading: ${errorText(error)} — ${/data\.json/.test(errorText(error)) ? "data.json is not a module to import from: read it as a file. " : ""}${readingHint(here)}`);
    throw error;
  }
  if (existsSync(join(here, "data.json")) && !/data\.json/.test(readFileSync(file, "utf8")))
    throw new Error(`beat.mjs types its rows instead of reading data.json, so the data can never refuse its title: ${readingHint(here)}`);
  if (!beat || typeof beat !== "object")
    throw new Error(`beat.mjs exports no object: end it with export default { … } (see CONTRACT.md) — ${readingHint(here)}`);
  // The gestures recorded through the craft step's typed tool (gestures.json) are the beat's staging; check() is code's.
  const recorded = join(here, "gestures.json");
  if (existsSync(recorded)) beat.gestures = JSON.parse(readFileSync(recorded, "utf8")).gestures;
  beat.check = claimCheck(here);
  return printable(beat);
}

/**
 * The beat's printed words as text, whatever the 12B wrote: a number where a line was expected crashed the still
 * renderer ("text.replace is not a function") three times; a template written in plain quotes printed "${96}" on the
 * plate. Words are coerced to strings and a literal "${x}" is unwrapped to x; nothing is refused for it.
 */
export function printable(beat) {
  if (!beat || typeof beat !== "object") return beat;
  const word = (v) => (v === undefined || v === null || typeof v === "function" ? v : String(v).replace(/\$\{\s*([^}]*?)\s*\}/g, "$1"));
  const words = (v) => (Array.isArray(v) ? v.map(word) : word(v));
  for (const key of ["eyebrow", "title", "limits", "source", "unit", "restLabel"]) if (key in beat) beat[key] = words(beat[key]);
  if (Array.isArray(beat.gestures))
    beat.gestures = beat.gestures.map((g) => (g && typeof g === "object" ? { ...g, ...(g.note !== undefined ? { note: word(g.note) } : {}), ...(g.card !== undefined ? { card: words(g.card) } : {}), ...(g.label !== undefined ? { label: word(g.label) } : {}) } : g));
  return beat;
}

/**
 * Every number data.json holds for each named row, in any number column. A note may state a figure of its own row
 * that the plate does not draw: a takeaway cited Centro's raw count (412) beside a per-resident rate, the core knew
 * only the drawn rates, and the fix it offered, "205 raw incidents", was false.
 */
export function rowFacts(here) {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath)) return {};
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const numeric = (table.columns ?? []).map((c) => c.type === "number");
  const facts = {};
  for (const row of table.rows ?? []) {
    const numbers = row.map((cell, i) => (numeric[i] ? Number(cell) : NaN)).filter(Number.isFinite);
    for (const cell of row) if (typeof cell === "string" && cell.trim()) (facts[cell] ??= []).push(...numbers);
  }
  return facts;
}

/**
 * Every entity of data.json is a panel, or the plate says how many were left out. A 12B beat cleared the
 * hairline refusal by dropping the five smallest of sixteen countries — the subject among them — under a
 * title about all sixteen, and nothing said they were missing.
 * @param {string[]} names the panel names drawn
 * @param {string} here the beat folder
 * @param {{ foldNote?: unknown, limits?: unknown }} beat
 */
export function assertPanelsAccounted(names, here, beat) {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath)) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const columns = table.columns ?? [];
  let at = columns.findIndex((c) => c.name === "entity");
  if (at < 0) at = columns.findIndex((c) => c.type === "text");
  if (at < 0) return;
  const all = [...new Set((table.rows ?? []).map((r) => r[at]).filter((v) => typeof v === "string" && v.trim()))];
  const dropped = all.filter((e) => !names.includes(e));
  if (!dropped.length) return;
  const said = typeof beat.foldNote === "function" ||
    [beat.limits].flat().some((l) => typeof l === "string" && l.includes(String(all.length)) && l.includes(String(all.length - dropped.length)));
  if (said) return;
  throw new Error(
    `panels draw ${all.length - dropped.length} of the ${all.length} entities in data.json and nothing says so; missing: ${dropped.join(", ")}. ` +
      `If the takeaway is about all of them, draw them all — a panel too small to see means the scale is wrong for the claim: draw the measure the takeaway names (a share, a rate) so every panel shows. ` +
      `If leaving some out is right, keep the ones the takeaway names and add foldNote: (drawn, all) => \`\${drawn} of \${all} …\` in the story's language.`,
  );
}

const SI = { "": 1, k: 1e3, m: 1e6, g: 1e9, t: 1e12 };
const unitOf = (token) => {
  const m = /^([kmgt]?)(wh|w)$/i.exec(String(token ?? "").trim());
  return m ? { scale: SI[m[1].toLowerCase()], base: m[2].toLowerCase() } : null;
};
const spell = (scale, base) => `${Object.keys(SI).find((k) => SI[k] === scale).toUpperCase()}${base === "wh" ? "Wh" : "W"}`;

/**
 * The figure a plate prints for a value states that value in the unit it names. gx-proportional-symbol web (12B,
 * 2026-11-13): `${fr(mw / 1000, 0)} MW` printed France's 97,224.6 MW as "97 MW" on the circle and the key, and the
 * render exited 0. The column's unit is read from its name (capacity_mw); a figure with no unit we can read passes.
 */
export function assertFigureMatchesValue(figure, values, here) {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath)) return;
  const columns = JSON.parse(readFileSync(dataPath, "utf8")).columns ?? [];
  const claim = front(here)?.("claimColumn");
  const units = columns.map((c) => unitOf(String(c.name).split("_").pop())).filter(Boolean);
  const column = (claim && unitOf(String(claim).split("_").pop())) || (units.length === 1 ? units[0] : null);
  if (!column) return;
  for (const v of values.filter((x) => Number.isFinite(x) && x !== 0)) {
    const printed = String(figure(v));
    const m = /(-?[\d\s  .,]*\d)\s*([A-Za-z]+)/.exec(printed);
    const unit = m && unitOf(m[2]);
    if (!unit || unit.base !== column.base) continue;
    const raw = m[1].replace(/[\s  ]/g, "");
    const n = Number(/,\d{1,2}$/.test(raw) || !raw.includes(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const factor = unit.scale / column.scale;
    const dec = (raw.split(/[.,]/)[1] ?? "").length;
    if (Math.abs(n * factor - v) <= Math.max(0.6 * 10 ** -dec * factor, Math.abs(v) * 0.005)) continue;
    const up = [1, 1e3, 1e6, 1e9].map((f) => f * column.scale).filter((s) => s >= column.scale && Math.abs(v * column.scale) / s >= 1).pop();
    const works = `${+(v * column.scale / up).toPrecision(3)} ${spell(up, column.base)}`;
    throw new Error(`figure(${v}) prints "${printed}", but ${v} is in ${spell(column.scale, column.base)} (data.json's column unit): a figure divided by a thousand names the next unit — a value that works: "${works}"`);
  }
}

const stem = (s) => norm(s).replace(/[^a-z]/g, "").slice(0, 4);

/**
 * Symbols that sum data.json's rows per place, with every row of one category left out. The 12B's bubble map web
 * (2026-11-14) listed six low-carbon fuels and not Nuclear, under a subject naming the nuclear plants: France drew
 * 34 GW where data.json holds 97, and every guard passed. A category the plate states it leaves out passes, unless
 * the storyboard's subject or takeaway names it.
 * @param {{ name: string, iso?: string, value: number }[]} symbols one per place, or one per row named by its place
 * @param {string} here the beat folder
 * @param {string} said the plate's own words (title, standfirst, limits, notes)
 */
export function assertNoCategoryDropped(symbols, here, said = "") {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath) || symbols.length < 3) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const columns = table.columns ?? [];
  const field = front(here);
  // The claim's column, or else every quantity data.json holds (coordinates and years are not summed).
  const claim = columns.findIndex((c) => c.name === field?.("claimColumn") && c.type === "number");
  const measures = claim >= 0 ? [claim] : columns.map((c, i) => (c.type === "number" && !/^(lon|lng|long|longitude|lat|latitude|x|y|year|annee|année)$/i.test(c.name) ? i : -1)).filter((i) => i >= 0);
  for (const measure of measures) dropsAt(measure);
  function dropsAt(measure) {
  const texts = columns.map((c, i) => (c.type === "text" ? i : -1)).filter((i) => i >= 0);
  const shapes = join(here, "shapes.geojson");
  const features = existsSync(shapes) ? JSON.parse(readFileSync(shapes, "utf8")).features ?? [] : [];
  const keyOf = (name, iso) => iso ?? (codeFor(name, features)?.exact ? codeFor(name, features).code : norm(name));
  // Symbols drawn one per row (a video's stations) add up per place like one per place.
  const drawn = new Map();
  for (const s of symbols) {
    const key = keyOf(s.name, s.iso && String(s.iso));
    const had = drawn.get(key);
    drawn.set(key, { name: s.name, value: (had?.value ?? 0) + Number(s.value) });
  }
  // The place column: the text column most of whose values key to a drawn symbol.
  const placeAt = texts
    .map((i) => ({ i, hits: new Set(table.rows.map((r) => keyOf(String(r[i]))).filter((k) => drawn.has(k))).size }))
    .reduce((a, b) => (b.hits > a.hits ? b : a), { i: -1, hits: 0 });
  // Symbols with no place name are held to the total of every row.
  const byPlace = placeAt.hits >= Math.max(3, drawn.size / 2);
  if (!byPlace) {
    if (symbols.some((s) => s.name || s.iso)) return;
    drawn.clear();
    drawn.set("*", { name: "the map", value: symbols.reduce((a, s) => a + Number(s.value), 0) });
  }
  const totals = new Map();
  const byCategory = new Map(); // `${column}\u0000${value}` -> Map(place -> sum)
  for (const r of table.rows) {
    const key = byPlace ? keyOf(String(r[placeAt.i])) : "*";
    const v = cell(r[measure]);
    if (!drawn.has(key) || !Number.isFinite(v)) continue;
    totals.set(key, (totals.get(key) ?? 0) + v);
    for (const i of texts) {
      if (byPlace && i === placeAt.i) continue;
      const cat = `${columns[i].name}\u0000${r[i]}`;
      const m = byCategory.get(cat) ?? new Map();
      m.set(key, (m.get(key) ?? 0) + v);
      byCategory.set(cat, m);
    }
  }
  const places = [...totals.keys()];
  // One power-of-ten scale for every symbol (MW drawn as GW), the one that brings most places closest to their total.
  const scale = [...Array(13)].map((_, k) => 10 ** (k - 6)).reduce((a, b) => {
    const off = (s) => places.reduce((acc, p) => acc + Math.abs(Math.log((drawn.get(p).value * s) / totals.get(p) || 1e-12)), 0);
    return off(b) < off(a) ? b : a;
  });
  const near = (v, h) => Math.abs(v - h) <= Math.max(0.015 * h, 0.5 / scale);
  for (const [cat, sums] of byCategory) {
    const hit = places.filter((p) => (sums.get(p) ?? 0) > 0.02 * totals.get(p));
    if (hit.length < Math.min(2, places.length)) continue;
    const without = hit.filter((p) => near(drawn.get(p).value * scale, totals.get(p) - sums.get(p)));
    if (without.length < 0.8 * hit.length) continue;
    const [column, value] = cat.split("\u0000");
    const named = [field?.("subject"), field?.("takeaway")].some((t) => t && stem(value) && norm(t).replace(/[^a-z ]/g, "").includes(stem(value)));
    const stated = stem(value) && norm(said).replace(/[^a-z ]/g, "").includes(stem(value));
    if (stated && !named) continue;
    const p = hit.reduce((a, b) => (sums.get(b) > sums.get(a) ? b : a));
    const rowsOf = table.rows.filter((r) => String(r[columns.findIndex((c) => c.name === column)]) === value).length;
    throw new Error(
      `the symbols leave out every ${column} "${value}" row (${rowsOf} rows of data.json): ${drawn.get(p).name} draws ${+(drawn.get(p).value).toPrecision(6)} where data.json holds ${+(totals.get(p) / scale).toPrecision(6)} with them${named ? ` — and the storyboard's subject names it` : ""}. Sum every row of each place, ${value} included${named ? "" : `, or say on the plate that ${value} is left out`}`,
    );
  }
  }
}

// Every way a reader may write a country on the plate: the map's own name, data.json's spelling, and its name in the
// languages Splash writes in, by ISO-2 through Intl ("Syrie", "Algérie", "Maroc").
let spoken;
const twoOf = new Map(); // ISO-3 -> ISO-2, for the name a sentence in the story's language gives
function spokenNames(features) {
  if (spoken) return spoken;
  spoken = new Map();
  const langs = ["en", "fr", "de", "es", "it", "pt", "nl"].map((l) => new Intl.DisplayNames([l], { type: "region" }));
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 26; j++) {
      const two = String.fromCharCode(65 + i, 65 + j);
      const en = langs[0].of(two);
      if (!en || en === two) continue;
      const hit = codeFor(en, features);
      if (!hit?.exact) continue;
      if (!twoOf.has(hit.code)) twoOf.set(hit.code, two);
      const names = spoken.get(hit.code) ?? new Set();
      for (const d of langs) names.add(words(d.of(two)));
      spoken.set(hit.code, names);
    }
  return spoken;
}
const words = (s) => ` ${norm(s).replace(/[^a-z]+/g, " ").trim()} `;
const NOT_DRAWN = { fr: "Hors carte : ", en: "Not on the map: ", de: "Nicht auf der Karte: ", es: "Fuera del mapa: ", it: "Fuori dalla mappa: ", pt: "Fora do mapa: ", nl: "Niet op de kaart: " };
const LEFT_OUT = /\b(hors|sauf|exclu|ecart|laisse|omis|sans|ohne|ausgenommen|excepto|sin|fuera|fora|tranne|nicht auf|niet op|escluso|exclud|except|left out|leaves out|omit|outside|not shown|not drawn)/;

/**
 * The places data.json holds and the symbols leave out, held to the plate's own words. The 12B's bubble map web
 * (2026-11-14) filtered "Syrian Republic" where data.json writes "Syrian Arab Republic": its standfirst left Syria out,
 * the map drew it, and every guard passed. A place left out must be named on the plate, unless the symbols are the
 * largest places (a top-N cut); a place a sentence leaves out must not be drawn.
 * @param {{ name: string, iso?: string, value: number }[]} symbols
 * @param {string} here the beat folder
 * @param {string} said the plate's own words
 */
export function assertPlacesLeftOutStated(symbols, here, said = "") {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath) || symbols.length < 3) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const columns = table.columns ?? [];
  const shapes = join(here, "shapes.geojson");
  const features = existsSync(shapes) ? JSON.parse(readFileSync(shapes, "utf8")).features ?? [] : [];
  const keyOf = (name, iso) => iso ?? (codeFor(name, features)?.exact ? codeFor(name, features).code : norm(name));
  const drawn = new Set(symbols.filter((s) => s.name || s.iso).map((s) => keyOf(s.name, s.iso && String(s.iso))));
  const place = columns
    .map((c, i) => (c.type === "text" ? i : -1))
    .filter((i) => i >= 0)
    .map((i) => ({ i, hits: new Set(table.rows.map((r) => keyOf(String(r[i]))).filter((k) => drawn.has(k))).size }))
    .reduce((a, b) => (b.hits > a.hits ? b : a), { i: -1, hits: 0 });
  if (place.hits < Math.max(3, drawn.size / 2)) return;
  const measure = columns.findIndex((c) => c.name === front(here)?.("claimColumn") && c.type === "number");
  const m = measure >= 0 ? measure : columns.findIndex((c) => c.type === "number" && !/^(lon|lng|long|longitude|lat|latitude|x|y|year)$/i.test(c.name));
  const held = new Map(); // key -> { name, total }
  for (const r of table.rows) {
    const name = String(r[place.i]);
    const k = keyOf(name);
    const had = held.get(k) ?? { name, total: 0 };
    const v = m >= 0 ? cell(r[m]) : 0;
    had.total += Number.isFinite(v) ? v : 0;
    held.set(k, had);
  }
  const known = spokenNames(features);
  const namesOf = (k, name) => new Set([words(name), ...(known.get(k) ?? []), ...features.filter((f) => f.properties?.iso === k).map((f) => words(f.properties.name))]);
  const named = (text, k, name) => [...namesOf(k, name)].some((n) => n.trim() && text.includes(n));
  const text = words(said);
  const out = [...held].filter(([k]) => !drawn.has(k));
  // A sentence that leaves places out names no drawn place.
  for (const sentence of String(said).split(/[.;:!?\n]+/)) {
    const s = words(sentence);
    if (!LEFT_OUT.test(s) || !out.some(([k, h]) => named(s, k, h.name))) continue;
    const both = [...held].filter(([k, h]) => drawn.has(k) && named(s, k, h.name));
    if (both.length)
      throw new Error(`the plate leaves out ${both.map(([, h]) => h.name).join(", ")} ("${sentence.trim()}"), but the symbols draw ${both.length > 1 ? "them" : "it"}: data.json writes ${both.map(([, h]) => JSON.stringify(h.name)).join(", ")} — filter that exact spelling, or drop ${both.length > 1 ? "them" : "it"} from the sentence`);
  }
  const unsaid = out.filter(([k, h]) => !named(text, k, h.name));
  if (!unsaid.length) return;
  const smallest = Math.min(...[...held].filter(([k]) => drawn.has(k)).map(([, h]) => h.total));
  if (m >= 0 && out.every(([, h]) => h.total <= smallest)) return;
  const lang = String(front(here)?.("language") ?? "en").toLowerCase().slice(0, 2);
  const label = NOT_DRAWN[lang] ?? NOT_DRAWN.en;
  const shown = (k, name) => { try { return twoOf.has(k) ? new Intl.DisplayNames([lang], { type: "region" }).of(twoOf.get(k)) : name; } catch { return name; } };
  const sentence = `${label}${out.map(([k, h]) => shown(k, h.name)).join(", ")}.`;
  throw new Error(`the symbols leave out ${unsaid.length} of data.json's ${held.size} places without a word on the plate: ${unsaid.slice(0, 6).map(([, h]) => JSON.stringify(h.name)).join(", ")}${unsaid.length > 6 ? ", …" : ""} — a value that works: add to limits "${sentence}" (or draw them)`);
}

const MARK = "(?:cercles?|disques?|bulles?|symboles?|circles?|bubbles?|discs?|kreis(?:e)?|c[ií]rculos?|cerchi[oa]?|cirkels?)";
const EACH = "(?:par|pour chaque|per|for each|for every|pro|je|por|para cada|ogni|por cada)";
const PER_COUNTRY = { fr: "un cercle par pays", en: "one circle per country", de: "ein Kreis pro Land", es: "un círculo por país", it: "un cerchio per paese", pt: "um círculo por país", nl: "één cirkel per land" };
const COUNTRY_WORDS = /^(pays|country|countries|nation|nations|land|lander|pais|paises|paese|paesi|landen|etat|etats|state|states)$/;

/**
 * What one circle stands for, held to the plate's words. Qwen3.5-9B's bubble map web (2026-11-13) summed data.json's
 * plants into one circle per country, and limits and alt still said "Un cercle par centrale", copied from the
 * storyboard. When the symbols sum several rows of data.json, "one circle per X" must name what they sum to.
 * @param {{ name: string, value: number }[]} symbols
 * @param {string} here the beat folder
 * @param {string} said the plate's own words, alt included
 */
export function assertSymbolUnitStated(symbols, here, said = "") {
  const dataPath = join(here, "data.json");
  if (!existsSync(dataPath) || symbols.length < 3) return;
  const table = JSON.parse(readFileSync(dataPath, "utf8"));
  const rows = table.rows ?? [];
  if (rows.length < symbols.length * 1.5) return;
  const shapes = join(here, "shapes.geojson");
  const features = existsSync(shapes) ? JSON.parse(readFileSync(shapes, "utf8")).features ?? [] : [];
  const keyOf = (name, iso) => iso ?? (codeFor(name, features)?.exact ? codeFor(name, features).code : norm(name));
  const names = new Set(symbols.map((s) => keyOf(String(s.name ?? ""), s.iso && String(s.iso))));
  const place = (table.columns ?? [])
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.type === "text")
    .map(({ c, i }) => ({ c, hits: new Set(rows.map((r) => keyOf(String(r[i]))).filter((v) => names.has(v))).size }))
    .reduce((a, b) => (b.hits > a.hits ? b : a), { c: null, hits: 0 });
  if (!place.c || place.hits < Math.max(3, symbols.length / 2)) return;
  const country = /countr|pays|nation|land|iso/i.test(place.c.name);
  const unit = country ? null : norm(place.c.name);
  const lang = String(front(here)?.("language") ?? "en").toLowerCase().slice(0, 2);
  const works = country ? (PER_COUNTRY[lang] ?? PER_COUNTRY.en) : `one circle per ${place.c.name}`;
  const per = new RegExp(`\\b(${MARK}\\s+${EACH}\\s+([\\p{L}-]+))`, "giu");
  for (const [, phrase, noun] of String(said).matchAll(per)) {
    const n = norm(noun).replace(/[^a-z]/g, "");
    if (country ? COUNTRY_WORDS.test(n) : n.startsWith(unit.slice(0, 4))) continue;
    throw new Error(`the plate says "${phrase}", but the symbols draw one circle per ${place.c.name}: ${symbols.length} circles summing data.json's ${rows.length} rows — a value that works: "${works}" (in limits and alt alike), or draw one circle per row`);
  }
}

/**
 * A value spliced into a sentence that came out empty. The 12B's bubble map web (2026-11-14, i17) emptied its own
 * `labelled` after a label refusal, and alt read "viennent ensuite . Ces cercles…": the template's list was empty
 * and no guard read the words. A word followed by a space and "." or ",", an empty list item (", ,"), or a literal
 * undefined/NaN/null is a splice the plate cannot print.
 * @param {Record<string, unknown>} fields the plate's printed words by field name
 */
export function assertNoEmptySplice(fields) {
  const bad = /(\S+\s+[.,](?=\s|$))|(,\s*,)|\b(undefined|NaN|null)\b|\[object Object\]/u;
  for (const [field, value] of Object.entries(fields)) {
    for (const text of [value].flat()) {
      if (typeof text !== "string") continue;
      const m = bad.exec(text);
      if (!m) continue;
      const at = text.slice(Math.max(0, m.index - 30), m.index + m[0].length);
      throw new Error(
        `${field} prints "${m[0].trim()}" ("…${at.trim()}"): a value spliced into the sentence came out empty — a value that works: ` +
          `when the list or value can be empty, write the sentence without it (e.g. \`list.length ? \`… \${list.join(", ")}.\` : ""\`), or fix what emptied it`,
      );
    }
  }
}

/**
 * A circle drawn under the legibility floor reads as no data. The shared area scale refuses it in its own keys and
 * asks for a larger anchor radius, a constant the beat cannot touch (i18, 12B, 2026-11-14): this names the places
 * and the smallest value a circle can be drawn at, in the beat's own terms.
 */
export function assertNoneUnderFloor(rows, { maxRadius, floor, exponent }) {
  const max = Math.max(...rows.map((r) => r.value));
  const radius = (v) => maxRadius * (v / max) ** exponent;
  const under = rows.filter((r) => radius(r.value) < floor);
  if (!under.length) return;
  const least = Math.ceil(max * (floor / maxRadius) ** (1 / exponent));
  const names = under.slice(0, 8).map((r) => r.name).join(", ") + (under.length > 8 ? `, … (${under.length - 8} more)` : "");
  throw new Error(
    `symbols: ${under.length} of ${rows.length} places are drawn under the ${floor} px legibility floor (${names}): beside the largest, their circles read as no data — a value that works: keep the symbols with value >= ${least} and leave out the ${under.length} others, then say on the plate which ones are not drawn (the refusal that follows gives the sentence)`,
  );
}
