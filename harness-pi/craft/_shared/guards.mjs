// The refusals every zone kit shares, each one learned from a 12B run. A kit's render-beat.mjs calls
// them before it draws; the harness copies this folder into the beat beside the kit. A refusal names
// what to change in beat.mjs — the model's only file.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

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
export function applyStoryboard(beat, here, { title = "title", standfirst = "limits", source = "source", basemap } = {}) {
  // A 12B beat once exported its fields one by one; the first write below then threw a bare TypeError.
  if (!beat || typeof beat !== "object")
    throw new Error("beat.mjs has no default export: put every field in one object, export default { title: …, limits: …, source: …, check(…) { … } } (see CONTRACT.md)");
  const field = front(here);
  if (!field) return;
  const credit = field("credit");
  const asOf = field("effectiveDate");
  if (credit) beat[source] = asOf && !/\bas of\b/i.test(credit) ? `${credit} · as of ${asOf}` : credit;
  if (basemap && !String(beat[source] ?? "").includes(basemap)) beat[source] = [beat[source], basemap].filter(Boolean).join(" · ");
  const named = field("limits");
  const first = [beat[standfirst]].flat()[0];
  if (named && !/^none$/i.test(named) && first !== undefined) {
    const words = (t) => String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
    const said = new Set(words(first));
    const theirs = words(named);
    if (theirs.length && theirs.filter((w) => said.has(w)).length / theirs.length < 0.4)
      throw new Error(`the standfirst's first form must carry the limits the journalist named, in their words (shorter forms may follow): ${named}`);
  }
  const takeaway = field("takeaway");
  const norm = (t) => String(t).replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
  const headline = [beat[title]].flat()[0];
  if (takeaway && headline !== undefined && norm(headline) !== norm(takeaway))
    throw new Error(`title's first form must be the journalist's takeaway copied as a literal string, not computed. It renders as: "${norm(headline)}" — it must be: "${takeaway}"`);
  // The plate may draw a shorter form instead of the takeaway; a 26B wrote those in French under `language: en` (G2).
  const language = String(field("language") ?? "").toLowerCase().slice(0, 2);
  const foreign = [beat[title]].flat().slice(1).find((form) => {
    const said = languageOf(form);
    return said && STOPWORDS[language] && said !== language;
  });
  if (foreign !== undefined)
    throw new Error(`the title's shorter forms must be in the storyboard's language (${language}), like the takeaway: "${foreign}" is not. Write each shorter form as a shortening of "${takeaway}"`);
  // Every other word the plate prints (eyebrow, unit, gesture notes, labels) is in that language too: the E4B wrote
  // French notes and a Portuguese eyebrow on an English plate (stress-p, 2026-11-12). The title, standfirst and credit
  // are held above in the journalist's own words.
  if (!STOPWORDS[language]) return;
  const held = new Set([title, standfirst, source, "rows", "check", "format", "alt"]);
  const strays = [];
  const walk = (value, path) => {
    if (typeof value === "string") strays.push([path, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
  };
  for (const [k, v] of Object.entries(beat)) if (!held.has(k)) walk(v, k);
  // A row or series name copied from the data is the journalist's data, not the plate's words.
  const dataPath = join(here, "data.json");
  const table = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : {};
  const cells = new Set([...(table.columns ?? []).map((c) => String(c.name)), ...(table.rows ?? []).flat().map(String)]);
  const stray = strays.find(([, text]) => { const said = !cells.has(text) && languageOf(text); return said && said !== language; });
  if (stray)
    throw new Error(`${stray[0]} is "${stray[1]}", not in the storyboard's language (${language}): write every word on the plate in that language, like the takeaway "${takeaway}"`);
}

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

export const beatHere = (url) => dirname(new URL(url).pathname);

/**
 * A refusal's text, with every error of a failed build spelled out: Bun reports a beat.mjs that does not parse as
 * one AggregateError whose message is only "2 errors building <path>", and the 12B retried three times on that.
 */
export function errorText(error) {
  const one = (e) => {
    const where = e?.position ? ` (line ${e.position.line}: ${String(e.position.lineText ?? "").trim()})` : "";
    return `${e?.message ?? String(e)}${where}`;
  };
  // One build error comes alone, carrying its own position; several come grouped.
  return error?.errors?.length ? [error.message, ...error.errors.map(one)].join(" — ") : one(error);
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
