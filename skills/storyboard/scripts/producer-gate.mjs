import catalog from "../references/datawrapper-chart-types.json" with { type: "json" };

// Datawrapper renders a fixed picture or a hosted embed; it makes no video and drives no scroll.
const SUPPORTED_FORMATS = new Set(["static", "web"]);
/** The media the delegated provider has types for. A treatment declares its own — the gate used to
 *  hard-code `chart`, which closed the map path end to end while the pinned inventory carried three
 *  map types the whole time. */
const SUPPORTED_MEDIA = new Set(["chart", "map"]);
const PRODUCERS = new Set(["custom", "datawrapper"]);

export function normalizeTreatment(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Words that name a MEDIUM rather than a treatment. A name made of nothing else — a bare "map" —
 *  names no treatment at all, and one of these at either end of a name is furniture a journalist
 *  appended ("choropleth map", "slope chart") rather than part of the type. */
const GENERIC_TREATMENT_WORDS = new Set(["map", "chart", "plot", "graph", "diagram", "graphic"]);

/**
 * EVERY NAME A TREATMENT ANSWERS TO, DERIVED FROM ITS OWN TITLE — never read out of a list somebody
 * remembered to extend.
 *
 * ROUND SEVEN, D7, on `stories/real-gwis-wildfire-counts`. The slot wrote its treatment as
 * "Stacked area", which is the natural name for it and literally half of that type's own sheet
 * title, "Area (and stacked area)". `datawrapperMatch` returned `null` — and null here is not a
 * neutral outcome, it REMOVES A GATE: the caller reads it as "not delegated", so the
 * custom-or-Datawrapper question is never asked and the beat goes custom with nobody consulted.
 * Only the exact catalogue string and the bare word "area" opened it. The same hole was measured
 * one movement earlier, where five of fifteen provider names matched no survey row at all.
 *
 * The fix is the rule, not the five renames it would have taken to hide it. A title is a small
 * grammar and each of its pieces is a name: the head ("Area"), the whole title with its brackets
 * flattened ("area and stacked area"), whatever a parenthetical holds ("slopegraph", "range plot",
 * "bridge"), and each alternative either side of a "/" or an "and" ("stacked area", "bubble",
 * "isoline"). Each of those again with a leading or trailing generic medium word dropped, because
 * "choropleth map" and "slope chart" are how people write them.
 *
 * MEASURED ACROSS THE FORTY TYPE SHEETS: no two sheets of one medium share a derived name, and
 * exactly one name is shared across media — "bubble", which a bubble chart (a scatter) and a bubble
 * map (proportional symbols) both legitimately answer to. Every caller supplies the medium, which
 * is precisely what tells those two apart, so the collision is the right answer rather than a
 * defect. Reproduce both counts with `treatmentNames` over `readTypeSheets()`.
 */
export function treatmentNames(value) {
  const raw = String(value ?? "");
  const parts = [raw.replace(/[()]/g, " "), raw.split("(")[0]];
  for (const paren of raw.matchAll(/\(([^)]*)\)/g)) parts.push(paren[1]);
  const names = new Set();
  for (const part of parts) {
    for (const piece of [part, ...part.split(/\s*[/,;]\s*|\s+(?:and|or)\s+/iu)]) {
      const name = normalizeTreatment(piece.replace(/[()]/g, " ")).replace(/^(?:and|or) /u, "");
      if (!name) continue;
      names.add(name);
      const words = name.split(" ");
      while (words.length > 1 && GENERIC_TREATMENT_WORDS.has(words[words.length - 1])) words.pop();
      while (words.length > 1 && GENERIC_TREATMENT_WORDS.has(words[0])) words.shift();
      if (!GENERIC_TREATMENT_WORDS.has(words[0])) names.add(words.join(" "));
    }
  }
  return [...names];
}

/** The names one provider mapping opens on: its treatment's own, plus any spelling DECLARED beside
 *  it because no title can yield it. A declared alias is therefore a claim about the rule — that it
 *  cannot reach this word — and `validateCatalog` refuses one the rule already derives, so the list
 *  can never again hide a matching rule that does not work. */
function namesFor(mapping) {
  return [...new Set([mapping.treatment, ...(mapping.aliases ?? [])].flatMap(treatmentNames))];
}

function validateCatalog(value) {
  if (value?.schemaVersion !== 1) throw new Error("unsupported Datawrapper catalogue schema");
  const types = new Set();
  const aliases = new Set();
  for (const row of value.visualizationTypes ?? []) {
    if (!row?.id || types.has(row.id)) throw new Error("Datawrapper catalogue has a missing or duplicate type id");
    types.add(row.id);
  }
  for (const mapping of value.splashTreatments ?? []) {
    if (!mapping?.treatment || !Array.isArray(mapping.aliases)) {
      throw new Error("Datawrapper catalogue has an incomplete Splash treatment mapping");
    }
    if (!SUPPORTED_MEDIA.has(mapping.medium)) {
      throw new Error(
        `Datawrapper treatment ${JSON.stringify(mapping.treatment)} declares no medium the provider serves`,
      );
    }
    const derived = new Set(treatmentNames(mapping.treatment));
    for (const alias of mapping.aliases) {
      const own = treatmentNames(alias);
      if (own.length === 0) {
        throw new Error(`Datawrapper catalogue declares an empty treatment alias for ${JSON.stringify(mapping.treatment)}`);
      }
      if (own.some((name) => derived.has(name))) {
        throw new Error(
          `Datawrapper catalogue declares alias ${JSON.stringify(alias)}, which ${JSON.stringify(mapping.treatment)} already answers to by its own name — a declared alias is only for a spelling the rule cannot reach`,
        );
      }
    }
    // Names are unique WITHIN A MEDIUM, not across the whole file: a bubble chart is a scatter and
    // a bubble map is proportional symbols, and the medium every caller supplies is what tells
    // those two apart.
    for (const name of namesFor(mapping)) {
      const key = `${mapping.medium}/${name}`;
      if (aliases.has(key)) {
        throw new Error(`Datawrapper catalogue has two ${mapping.medium} treatments answering to ${JSON.stringify(name)}`);
      }
      aliases.add(key);
    }
    for (const type of mapping.datawrapperTypes ?? []) {
      if (!types.has(type)) {
        throw new Error(`Datawrapper treatment ${JSON.stringify(mapping.treatment)} names unknown type ${JSON.stringify(type)}`);
      }
    }
  }
  return value;
}

export const DATAWRAPPER_CATALOG = validateCatalog(catalog);

const NAMES_BY_MAPPING = new Map(
  DATAWRAPPER_CATALOG.splashTreatments.map((mapping) => [mapping, new Set(namesFor(mapping))]),
);

/**
 * THE LONGEST SHARED NAME WINS, AND A WINNER IN ANOTHER MEDIUM IS NO MATCH.
 *
 * "bubble" is one word two treatments legitimately answer to — a bubble chart is a scatter, a
 * bubble map is proportional symbols — so a rule that took ANY shared name would hand a map slot
 * asking for "Scatter and bubble" a symbol map, and a chart slot asking for "bubble map" a scatter.
 * Both were `null` before this rule and must stay `null`: the most specific reading of "bubble map"
 * is the map, and the caller said chart. So the best match is chosen across ALL media by how many
 * words the shared name has, ties go to the medium asked for, and a best match belonging to the
 * other medium is refused rather than downgraded to a weaker one. A treatment answers for its OWN
 * medium: "locator" is a map and nothing else.
 */
export function datawrapperMatch({ medium, format, treatment }) {
  if (!SUPPORTED_MEDIA.has(medium) || !SUPPORTED_FORMATS.has(format)) return null;
  // A row whose `datawrapperTypes` is EMPTY is a treatment this provider cannot honour, recorded
  // with its reason rather than deleted so nobody re-adds it from the type list. It is not a match:
  // the gate asks nothing and production stays custom, which is the documented behaviour for an
  // unmapped treatment. `Scatter (and bubble)` is the first — see #44 for what Datawrapper does to
  // a scatter's colour and its y-range.
  const asked = treatmentNames(treatment);
  let best = null;
  for (const [mapping, names] of NAMES_BY_MAPPING) {
    for (const name of asked) {
      if (!names.has(name)) continue;
      const words = name.split(" ").length;
      const wins =
        !best ||
        words > best.words ||
        (words === best.words && best.mapping.medium !== medium && mapping.medium === medium);
      if (wins) best = { mapping, words };
    }
  }
  if (best?.mapping.medium !== medium) return null;
  return best.mapping.datawrapperTypes.length > 0 ? best.mapping : null;
}

export function producerGap(slot) {
  const match = datawrapperMatch({
    medium: slot?.medium,
    format: slot?.format,
    treatment: slot?.chosen,
  });
  const producer = slot?.producer;
  const type = slot?.datawrapperType;
  const id = slot?.id ?? "?";

  if (!match) {
    if (producer === "datawrapper") {
      return `slot ${id}: ${JSON.stringify(slot?.chosen)} is not mapped to a Datawrapper chart for ${slot?.format ?? "this format"}`;
    }
    if (type) return `slot ${id}: datawrapperType is set but the selected treatment is not delegated to Datawrapper`;
    if (producer && producer !== "custom") return `slot ${id}: producer must be custom or datawrapper`;
    return null;
  }

  if (!producer) return `slot ${id}: custom or Datawrapper was never chosen after the treatment selection`;
  if (!PRODUCERS.has(producer)) return `slot ${id}: producer must be custom or datawrapper`;
  if (producer === "custom") {
    return type ? `slot ${id}: a custom chart must not carry a datawrapperType` : null;
  }
  if (!type) return `slot ${id}: the Datawrapper choice has no recorded Datawrapper chart type`;
  if (!match.datawrapperTypes.includes(type)) {
    return `slot ${id}: Datawrapper type ${JSON.stringify(type)} does not implement ${JSON.stringify(match.treatment)}`;
  }
  return null;
}

/**
 * WHAT PREFLIGHT ALREADY MEASURED ABOUT THE SURFACE A DELEGATED RENDER COMES BACK ON, read here
 * rather than re-derived — `null` when nothing was measured, which is not the same as "it is fine".
 *
 * ROUND SEVEN, on `stories/real-owid-life-expectancy`. `runPreflight` returned
 * `capabilities.datawrapper.surface = {ground: "#16191B", static: true, web: false}`: a published
 * Datawrapper embed follows the READER's own colour scheme and defaults to light, so it is the one
 * form no request can steer, while a static export can be asked for the matching side. Round five
 * moved that question early precisely so a later phase could offer honestly. Then this gate — the
 * phase that asks "Datawrapper or custom?" — took `{treatment, match}` and had no seam for
 * capabilities at all, so it offered the embed anyway; and `surfaceGap`, the seam written to say it
 * in words, was called by NOTHING but its own test. A journalist who answered "Datawrapper" got a
 * live published chart on the newsroom's account and a refusal at export.
 *
 * This function does not re-decide anything. `surface[format]` is preflight's own boolean, read as
 * it stands; only the sentence is this gate's, because a gate must say what it withdraws in the
 * words of the question it is asking.
 */
function surfaceRefusal({ format, capabilities }) {
  const surface = capabilities?.datawrapper?.surface;
  if (!surface || !format || surface[format] !== false) return null;
  return (
    `Datawrapper cannot carry a ${format} beat on this newsroom's ground (${surface.ground}), which ` +
    `preflight measured before this story existed: a published Datawrapper embed follows the ` +
    `reader's own colour scheme and defaults to light, so it is the one form no request can steer. ` +
    `A static Datawrapper beat still can — its export is requested on the matching surface — and so ` +
    `can any producer that draws its own ground.`
  );
}

export function confirmProducerChoice({ medium, format, treatment, producer, datawrapperType, capabilities }) {
  if (!PRODUCERS.has(producer)) throw new Error("producer must be custom or datawrapper");
  const refusal = producer === "datawrapper" ? surfaceRefusal({ format, capabilities }) : null;
  if (refusal) throw new Error(refusal);
  const match = datawrapperMatch({ medium, format, treatment });
  if (!match) {
    if (producer === "datawrapper") {
      throw new Error(`${JSON.stringify(treatment)} is not available through Datawrapper for ${format}`);
    }
    // Unmapped treatments never open this human gate. Nulls let the canonical storyboard mutator
    // remove any stale legacy fields if a caller defensively routes the state through here.
    return { producer: null, datawrapperType: null };
  }
  if (producer === "custom") return { producer, datawrapperType: null };
  const resolvedType = datawrapperType ?? match.datawrapperTypes[0];
  if (!match.datawrapperTypes.includes(resolvedType)) {
    throw new Error(
      `${JSON.stringify(resolvedType)} is not a Datawrapper implementation of ${JSON.stringify(match.treatment)}; use ${match.datawrapperTypes.join(", ")}`,
    );
  }
  return { producer, datawrapperType: resolvedType };
}

export function formatProducerGate({ treatment, match, format, capabilities }) {
  if (!match) throw new Error("formatProducerGate needs a Datawrapper-supported treatment");
  const refusal = surfaceRefusal({ format, capabilities });
  if (refusal) {
    // NOT A QUESTION. There is one production path left, so this states the measurement and says
    // what it leaves — asking "Datawrapper or custom?" here would be offering an answer the next
    // call refuses, which is the shape that put a live chart on a newsroom account.
    return [
      `The selected **${treatment}** treatment is available in Datawrapper, but not for this beat.`,
      "",
      `${refusal}`,
      "",
      "So this beat is **custom** — a bespoke Splash component with full control over geometry and interaction, drawn on the ground this newsroom recorded.",
    ].join("\n");
  }
  const providerLabels = match.datawrapperTypes
    .map((id) => DATAWRAPPER_CATALOG.visualizationTypes.find((row) => row.id === id)?.label ?? id)
    .join(" / ");
  const defaultLabel = DATAWRAPPER_CATALOG.visualizationTypes.find(
    (row) => row.id === match.datawrapperTypes[0],
  )?.label ?? match.datawrapperTypes[0];
  return [
    `The selected **${treatment}** treatment is available in Datawrapper (${providerLabels}). Which production path do you prefer?`,
    "",
    `- **Datawrapper** — a persisted Splash spec backed by a reusable newsroom chart ID; Splash's mapped implementation for this treatment is ${defaultLabel}.`,
    // WHAT THE JOURNALIST GIVES UP, said at the gate rather than discovered in the render (#45).
    // Choosing a delegated provider means accepting its rendering, and that is a legitimate
    // choice — but only if it is a CHOICE. Splash carries the newsroom's accent and its own
    // annotations to the line/bar family and nothing further: axis ticks, gridlines, value
    // formatting, mark shape and the rest are Datawrapper's, and a treatment whose colour cannot
    // be applied is not offered here at all rather than published in a colour nobody chose.
    "  Splash sends the newsroom's accent and your annotations; everything else — axis ticks," +
      " gridlines, value formatting, mark shape — is Datawrapper's own, and the chart is edited" +
      " afterwards in Datawrapper rather than here.",
    "- **Custom** — a bespoke Splash component with full control over geometry and interaction.",
    "",
    "Datawrapper or custom?",
  ].join("\n");
}
