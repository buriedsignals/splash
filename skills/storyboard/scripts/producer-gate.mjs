import catalog from "../references/datawrapper-chart-types.json" with { type: "json" };

const SUPPORTED_FORMATS = new Set(["static", "web"]);
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

function validateCatalog(value) {
  if (value?.schemaVersion !== 1) throw new Error("unsupported Datawrapper catalogue schema");
  const types = new Set();
  const aliases = new Set();
  for (const row of value.visualizationTypes ?? []) {
    if (!row?.id || types.has(row.id)) throw new Error("Datawrapper catalogue has a missing or duplicate type id");
    types.add(row.id);
  }
  for (const mapping of value.splashTreatments ?? []) {
    if (!mapping?.treatment || !Array.isArray(mapping.aliases) || mapping.aliases.length === 0) {
      throw new Error("Datawrapper catalogue has an incomplete Splash treatment mapping");
    }
    for (const alias of mapping.aliases) {
      const normalized = normalizeTreatment(alias);
      if (!normalized || aliases.has(normalized)) {
        throw new Error(`Datawrapper catalogue has a missing or duplicate treatment alias ${JSON.stringify(alias)}`);
      }
      aliases.add(normalized);
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

const BY_ALIAS = new Map(
  DATAWRAPPER_CATALOG.splashTreatments.flatMap((mapping) =>
    mapping.aliases.map((alias) => [normalizeTreatment(alias), mapping]),
  ),
);

export function datawrapperMatch({ medium, format, treatment }) {
  if (medium !== "chart" || !SUPPORTED_FORMATS.has(format)) return null;
  return BY_ALIAS.get(normalizeTreatment(treatment)) ?? null;
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

export function confirmProducerChoice({ medium, format, treatment, producer, datawrapperType }) {
  if (!PRODUCERS.has(producer)) throw new Error("producer must be custom or datawrapper");
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

export function formatProducerGate({ treatment, match }) {
  if (!match) throw new Error("formatProducerGate needs a Datawrapper-supported treatment");
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
    "- **Custom** — a bespoke Splash component with full control over geometry and interaction.",
    "",
    "Datawrapper or custom?",
  ].join("\n");
}
