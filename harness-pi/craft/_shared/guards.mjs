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
}

/** Every drawn value is a number (a cell in another digit system once concatenated instead of adding). */
export function assertNumbers(entries, label = "values") {
  const bad = entries.filter(([, v]) => typeof v !== "number" || !Number.isFinite(v));
  if (bad.length)
    throw new Error(`${label} hold values that are not numbers: ${bad.slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}. Convert them with Number(), or leave out the rows the data cannot give (say so in the standfirst)`);
}

/** Value labels a reader can tell apart (a per-resident rate once printed 0,004 on every bar). */
export function assertLegibleLabels(values, format) {
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
export function assertHeadlineNumbersDrawn(headline, drawn, label = "marks") {
  // Magnitudes: a title states a loss as "fell 12" against a drawn -12; signed bounds left negatives unchecked.
  const signed = drawn.filter((v) => Number.isFinite(v));
  if (!signed.length) return;
  const values = signed.map(Math.abs);
  const allowed = [...values, Math.abs(signed.reduce((a, b) => a + b, 0))];
  const lo = Math.min(...values) / 2;
  const hi = Math.max(...values) * 2;
  // A digit glued to letters is part of a name (CO2, PM2.5, H2O), not a figure the title states.
  const stated = [...String(headline).matchAll(/(?<![\p{L}\d])(\d{1,3}(?:[ ,  ]\d{3})+|\d+(?:[.,]\d+)?)(?![\p{L}\d])(\s*%)?/gu)]
    .filter((m) => !m[2])
    .map((m) => Number(m[1].replace(/[ ,  ](?=\d{3}\b)/g, "").replace(",", ".")))
    .filter((n) => !(Number.isInteger(n) && n >= 1700 && n <= 2100) && n >= lo && n <= hi);
  const missing = stated.filter((n) => !allowed.some((v) => Math.abs(v - n) <= Math.max(0.5, Math.abs(n) * 0.005)));
  if (missing.length && missing.length * 2 > stated.length)
    throw new Error(`the title states ${missing.join(", ")}, which the drawn ${label} do not contain: the rows selected from data.json are probably not the takeaway's series — read its other columns and filter to the one the takeaway is about`);
}

/** When the journalist named the claim's column, the drawn values are that column's (raw beds under a per-resident headline, once). */
export function assertDrawsClaimColumn(drawn, here) {
  const field = front(here);
  const dataPath = join(here, "data.json");
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
  const foreign = scales.map(foreignAt).reduce((best, f) => (f.length < best.length ? f : best));
  if (foreign.length)
    throw new Error(`the claim is about the column ${column}, but the plate draws values that column does not hold (${foreign.slice(0, 3).join(", ")}): draw ${column}'s values`);
}

const decimals = (v) => (String(v).split(".")[1] ?? "").length;

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
  const aggregates = names.filter((name) => {
    const row = table.rows.find((r) => r.some((cell) => cell === name));
    return row && !iso(row[code]);
  });
  if (aggregates.length)
    throw new Error(
      `${aggregates.map((a) => `"${a}"`).join(", ")} ${aggregates.length > 1 ? "are aggregates" : "is an aggregate"} in data.json (its ${columns[code].name} is not a country code): build rows only from rows whose ${columns[code].name} is three capital letters, like "${table.rows.find((r) => iso(r[code]))[code]}"`,
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
    `Read it: const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8")); const col = (n) => data.columns.findIndex((c) => c.name === n); ` +
    `const rows = data.rows.map((r) => ({ name: r[col("${name}")], value: Number(r[col("${value}")]) })).sort((a, b) => b.value - a.value);`
  );
}

/**
 * The beat, imported for a gesture kit. A 12B beat read data.json as an array of objects ("data.find(...).value"
 * on undefined), failed three renders, then typed the six rows and a check() that compared constants with
 * themselves: a beat that never reads data.json cannot be contradicted by it. So a beat that throws while
 * loading is answered with data.json's real shape, and one that does not read data.json is refused.
 */
export async function importBeat(here) {
  const file = join(here, "beat.mjs");
  let beat;
  try {
    ({ default: beat } = await import(file));
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError && !error?.errors)
      throw new Error(`beat.mjs throws while loading: ${errorText(error)} — ${readingHint(here)}`);
    throw error;
  }
  if (existsSync(join(here, "data.json")) && !/data\.json/.test(readFileSync(file, "utf8")))
    throw new Error(`beat.mjs types its rows instead of reading data.json, so the data can never refuse its title: ${readingHint(here)}`);
  return beat;
}
