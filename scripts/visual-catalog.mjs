// The authored catalogue is normalized: producer/format capability and treatment knowledge each
// appear once. This generator validates those joins against the code that actually ships, computes
// proof coverage without using it as a production verdict, and emits the Storyboard-local copy.
//
//   bun scripts/visual-catalog.mjs           writes the Storyboard derivative
//   bun scripts/visual-catalog.mjs --check   validates everything and fails on generated drift
//
// JSON Schema 2020-12 leaves unknown properties open unless `additionalProperties` closes them;
// the published schema and the strict Zod objects below therefore both reject unknown fields.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CREDENTIAL_IDS } from "../apps/goose/contract.mjs";
import { FORMS_BY_FORMAT } from "../skills/deliver/scripts/deliver.mjs";
import {
  DATAWRAPPER_CATALOG,
  datawrapperMatch,
} from "../skills/storyboard/scripts/producer-gate.mjs";
import { readBeats } from "./matrix.mjs";
import { provenFormats, readTypeSheets } from "./type-survey.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SPLASH_ROOT = join(HERE, "..");
export const VISUAL_CATALOG_PATH = join(
  SPLASH_ROOT,
  "catalog",
  "visual-catalog.json",
);
export const VISUAL_CATALOG_SCHEMA_PATH = join(
  SPLASH_ROOT,
  "catalog",
  "visual-catalog.schema.json",
);
export const STORYBOARD_VISUAL_CATALOG_PATH = join(
  SPLASH_ROOT,
  "skills",
  "storyboard",
  "references",
  "visual-catalog.json",
);

const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const id = z.string().min(1).max(100).regex(ID_PATTERN);
const nonEmpty = z.string().trim().min(1).max(2000);
const idArray = z.array(id).max(100);
const namedDescription = z.strictObject({
  id,
  label: nonEmpty,
  description: nonEmpty,
});
const capability = z.strictObject({
  id,
  label: nonEmpty,
  requiredCredentials: z.array(z.string().regex(/^[A-Z][A-Z0-9_]+$/)).max(32),
  requiredSettings: idArray,
  repairAction: z.literal("open-readiness"),
  unavailableReason: nonEmpty,
});
const deliveryForm = z.strictObject({
  id,
  label: nonEmpty,
  requiredCapabilities: idArray,
});
const producer = z.strictObject({
  id,
  label: nonEmpty,
  skill: z.string().regex(/^[a-z][a-z0-9-]+$/),
});
const delegatedProducer = z.strictObject({
  id,
  label: nonEmpty,
  producer: id,
  capability: id,
  // MEDIA, plural: the delegated provider has three map types as well as its charts, and a single
  // `medium` here is what kept them unreachable while the pinned inventory carried them.
  media: idArray,
  formats: idArray,
});
const sizeRule = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("required"),
    options: z
      .array(z.enum(["landscape", "square", "portrait"]))
      .min(1)
      .max(3),
  }),
  z.strictObject({ kind: z.literal("none") }),
]);
const interaction = z.strictObject({
  kind: z.enum(["none", "explore", "motion", "scroll"]),
  promise: nonEmpty,
});
const formatPair = z.strictObject({
  id,
  label: nonEmpty,
  medium: id,
  format: id,
  producer: id,
  sizeRule,
  interaction,
  deliveryForms: idArray,
  requiredCapabilities: idArray,
  optionalCapabilities: idArray,
  runtimePrerequisites: z
    .array(z.enum(["bun", "production-dependencies"]))
    .min(1)
    .max(2),
  browserPrerequisites: z.array(z.literal("engine-managed-chromium")).max(1),
});
const treatment = z.strictObject({
  id,
  medium: id,
  label: nonEmpty,
  reference: z
    .string()
    .regex(/^[a-z][a-z0-9-]+\/(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.md$/),
  dataShape: z.strictObject({ summary: nonEmpty, requires: idArray }),
  formats: idArray,
  state: z.enum(["selectable", "proof-only"]),
  disabledReason: nonEmpty.optional(),
});
const catalogSchema = z.strictObject({
  $schema: nonEmpty,
  schemaVersion: z.literal(1),
  catalogId: id,
  mediums: z.array(namedDescription).min(1),
  formats: z.array(namedDescription).min(1),
  capabilities: z.array(capability),
  deliveryForms: z.array(deliveryForm).min(1),
  producers: z.array(producer).min(1),
  delegatedProducers: z.array(delegatedProducer),
  formatPairs: z.array(formatPair).min(1),
  treatments: z.array(treatment).min(1),
});

const EXPECTED_SIZES = ["landscape", "square", "portrait"];
const SIZED_FORMATS = new Set(["static", "video"]);
const KNOWN_SETTINGS = new Set(["cloudflare-account-id"]);

function fail(message) {
  throw new Error(`visual catalogue: ${message}`);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

export function catalogueRevision(value) {
  // Identify the authored catalogue, not filesystem-derived proof annotations or generated
  // Datawrapper mappings. The root source and enriched skill-local derivative therefore agree.
  const source = {
    ...value,
    treatments: value.treatments.map(
      ({ purpose: _purpose, proofFormats: _proofFormats, ...row }) => row,
    ),
    delegatedProducers: value.delegatedProducers.map(
      ({ mappings: _mappings, ...row }) => row,
    ),
  };
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stable(source)))
    .digest("hex")}`;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`duplicate ${label} ${JSON.stringify(value)}`);
    seen.add(value);
  }
}

function assertUniqueList(values, label) {
  assertUnique(values, `${label} value`);
}

function assertKnown(values, known, label) {
  for (const value of values) {
    if (!known.has(value))
      fail(`${label} names unknown id ${JSON.stringify(value)}`);
  }
}

function sameList(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function safeReference(root, reference) {
  const skillsRoot = resolve(root, "skills");
  const target = resolve(skillsRoot, reference);
  const rel = relative(skillsRoot, target);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) {
    fail(`reference escapes skills/: ${JSON.stringify(reference)}`);
  }
  return target;
}

function frontMatterName(path) {
  const text = readFileSync(path, "utf8");
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  return /^name:\s*([^\r\n]+)$/m.exec(block)?.[1]?.trim() ?? "";
}

function schemaError(error) {
  return error.issues
    .slice(0, 12)
    .map(
      (issue) =>
        `${issue.path.length ? issue.path.join(".") : "root"}: ${issue.message}`,
    )
    .join("; ");
}

function proofForTreatment(row, sheet, beats) {
  if (sheet) return provenFormats(sheet, beats);
  if (row.id !== "image.photograph-sequence") return [];
  const formats = new Set();
  for (const beat of beats) {
    if (beat.type !== "photograph sequence") continue;
    for (const format of beat.formats) formats.add(format);
  }
  return ["static", "web", "video", "scrolly"].filter((format) =>
    formats.has(format),
  );
}

/**
 * Validate schema, references, filesystem producers, delivery parity, type-sheet coverage, and
 * size semantics. Proof is returned as evidence only and never changes a treatment's state.
 */
export function validateVisualCatalog(
  input,
  {
    root = SPLASH_ROOT,
    checkFilesystem = true,
    sheets = checkFilesystem ? readTypeSheets() : [],
    beats = checkFilesystem ? readBeats() : [],
  } = {},
) {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) fail(`schema rejection — ${schemaError(parsed.error)}`);
  const catalog = parsed.data;

  for (const [label, rows] of [
    ["medium id", catalog.mediums],
    ["format id", catalog.formats],
    ["capability id", catalog.capabilities],
    ["delivery form id", catalog.deliveryForms],
    ["producer id", catalog.producers],
    ["delegated-producer id", catalog.delegatedProducers],
    ["format-pair id", catalog.formatPairs],
    ["treatment id", catalog.treatments],
  ])
    assertUnique(
      rows.map((row) => row.id),
      label,
    );

  const mediums = new Set(catalog.mediums.map((row) => row.id));
  const formats = new Set(catalog.formats.map((row) => row.id));
  const capabilities = new Set(catalog.capabilities.map((row) => row.id));
  const deliveryForms = new Map(
    catalog.deliveryForms.map((row) => [row.id, row]),
  );
  const producers = new Map(catalog.producers.map((row) => [row.id, row]));
  const credentialIDs = new Set(CREDENTIAL_IDS);

  for (const row of catalog.capabilities) {
    assertUniqueList(row.requiredCredentials, `${row.id}.requiredCredentials`);
    assertUniqueList(row.requiredSettings, `${row.id}.requiredSettings`);
    assertKnown(
      row.requiredCredentials,
      credentialIDs,
      `${row.id}.requiredCredentials`,
    );
    assertKnown(
      row.requiredSettings,
      KNOWN_SETTINGS,
      `${row.id}.requiredSettings`,
    );
  }
  for (const row of catalog.deliveryForms) {
    assertUniqueList(
      row.requiredCapabilities,
      `${row.id}.requiredCapabilities`,
    );
    assertKnown(
      row.requiredCapabilities,
      capabilities,
      `${row.id}.requiredCapabilities`,
    );
  }
  if (checkFilesystem) {
    for (const row of catalog.producers) {
      const skill = join(root, "skills", row.skill);
      const skillDoc = join(skill, "SKILL.md");
      if (!existsSync(skillDoc))
        fail(
          `producer ${row.id} has no shipped skill at ${row.skill}/SKILL.md`,
        );
      if (frontMatterName(skillDoc) !== row.skill) {
        fail(
          `producer ${row.id} points to ${row.skill}, whose front matter names a different skill`,
        );
      }
    }
  }
  for (const row of catalog.delegatedProducers) {
    if (!producers.has(row.producer))
      fail(
        `delegated producer ${row.id} names unknown producer ${JSON.stringify(row.producer)}`,
      );
    if (!capabilities.has(row.capability))
      fail(
        `delegated producer ${row.id} names unknown capability ${JSON.stringify(row.capability)}`,
      );
    for (const medium of row.media)
      if (!mediums.has(medium))
        fail(
          `delegated producer ${row.id} names unknown medium ${JSON.stringify(medium)}`,
      );
    if (!row.formats.length)
      fail(`delegated producer ${row.id} has no publication format`);
    assertUniqueList(row.formats, `${row.id}.formats`);
    assertKnown(row.formats, formats, `${row.id}.formats`);
  }

  const pairKeys = new Set();
  for (const row of catalog.formatPairs) {
    if (!mediums.has(row.medium))
      fail(
        `format pair ${row.id} names unknown medium ${JSON.stringify(row.medium)}`,
      );
    if (!formats.has(row.format))
      fail(
        `format pair ${row.id} names unsupported format ${JSON.stringify(row.format)}`,
      );
    if (!producers.has(row.producer))
      fail(
        `format pair ${row.id} names unknown producer ${JSON.stringify(row.producer)}`,
      );
    if (row.id !== `${row.medium}.${row.format}`) {
      fail(
        `format pair ${row.id} must use stable id ${row.medium}.${row.format}`,
      );
    }
    const pairKey = `${row.medium}/${row.format}`;
    if (pairKeys.has(pairKey)) fail(`duplicate medium/format pair ${pairKey}`);
    pairKeys.add(pairKey);
    for (const [field, values] of [
      ["deliveryForms", row.deliveryForms],
      ["requiredCapabilities", row.requiredCapabilities],
      ["optionalCapabilities", row.optionalCapabilities],
      ["runtimePrerequisites", row.runtimePrerequisites],
      ["browserPrerequisites", row.browserPrerequisites],
    ])
      assertUniqueList(values, `${row.id}.${field}`);
    assertKnown(
      row.deliveryForms,
      new Set(deliveryForms.keys()),
      `${row.id}.deliveryForms`,
    );
    assertKnown(
      row.requiredCapabilities,
      capabilities,
      `${row.id}.requiredCapabilities`,
    );
    assertKnown(
      row.optionalCapabilities,
      capabilities,
      `${row.id}.optionalCapabilities`,
    );
    const overlap = row.requiredCapabilities.find((value) =>
      row.optionalCapabilities.includes(value),
    );
    if (overlap)
      fail(
        `format pair ${row.id} makes capability ${overlap} both required and optional`,
      );

    const actualForms = Object.keys(FORMS_BY_FORMAT[row.format] ?? {});
    if (!actualForms.length)
      fail(
        `format pair ${row.id} has no delivery implementation for ${row.format}`,
      );
    if (!sameList(row.deliveryForms, actualForms)) {
      fail(
        `format pair ${row.id} delivery forms drifted; expected ${actualForms.join(", ")}`,
      );
    }
    if (SIZED_FORMATS.has(row.format)) {
      if (
        row.sizeRule.kind !== "required" ||
        !sameList(row.sizeRule.options, EXPECTED_SIZES)
      ) {
        fail(
          `format pair ${row.id} has an impossible size rule; ${row.format} requires ${EXPECTED_SIZES.join(", ")}`,
        );
      }
    } else if (row.sizeRule.kind !== "none") {
      fail(
        `format pair ${row.id} has an impossible size rule; ${row.format} takes no export size`,
      );
    }
  }
  for (const format of Object.keys(FORMS_BY_FORMAT)) {
    if (!catalog.formatPairs.some((row) => row.format === format)) {
      fail(`delivery implements ${format}, but no format pair reaches it`);
    }
  }

  const sheetsByReference = new Map(
    sheets.map((sheet) => [sheet.sheet, sheet]),
  );
  const referencedSheets = new Set();
  const treatmentsWithProof = [];
  for (const row of catalog.treatments) {
    if (!mediums.has(row.medium))
      fail(
        `treatment ${row.id} names unknown medium ${JSON.stringify(row.medium)}`,
      );
    if (!row.id.startsWith(`${row.medium}.`))
      fail(`treatment ${row.id} must begin with ${row.medium}.`);
    if (!row.formats.length)
      fail(`treatment ${row.id} has no publication format`);
    assertUniqueList(row.formats, `${row.id}.formats`);
    for (const format of row.formats) {
      if (!formats.has(format))
        fail(
          `treatment ${row.id} names unsupported format ${JSON.stringify(format)}`,
        );
      if (!pairKeys.has(`${row.medium}/${format}`)) {
        fail(
          `treatment ${row.id} has no working producer/delivery pair for ${row.medium}/${format}`,
        );
      }
    }
    assertUniqueList(row.dataShape.requires, `${row.id}.dataShape.requires`);
    if (row.state === "proof-only" && !row.disabledReason)
      fail(`proof-only treatment ${row.id} needs a disabled reason`);
    if (row.state === "selectable" && row.disabledReason)
      fail(`selectable treatment ${row.id} must not carry a disabled reason`);

    const target = safeReference(root, row.reference);
    if (checkFilesystem && !existsSync(target))
      fail(`treatment ${row.id} reference is missing: ${row.reference}`);
    const sheet = sheetsByReference.get(row.reference);
    if (row.medium === "chart" || row.medium === "map") {
      if (checkFilesystem && !sheet)
        fail(
          `treatment ${row.id} does not name a current ${row.medium} type sheet`,
        );
      if (sheet && row.label !== sheet.title) {
        fail(
          `treatment ${row.id} label drifted from its type sheet; expected ${JSON.stringify(sheet.title)}`,
        );
      }
      if (referencedSheets.has(row.reference))
        fail(
          `type sheet ${row.reference} is assigned to more than one treatment`,
        );
      referencedSheets.add(row.reference);
    }
    if (checkFilesystem) {
      const referenceText = readFileSync(target, "utf8");
      if (
        /Not backed by a shipped implementation/i.test(referenceText) &&
        row.state === "selectable"
      ) {
        fail(
          `treatment ${row.id} is selectable although its reference says no implementation ships`,
        );
      }
    }
    treatmentsWithProof.push({
      ...row,
      purpose: sheet?.purpose ?? row.dataShape.summary,
      proofFormats: proofForTreatment(row, sheet, beats),
    });
  }
  if (checkFilesystem) {
    for (const sheet of sheets) {
      if (!referencedSheets.has(sheet.sheet))
        fail(`type sheet ${sheet.sheet} has no catalogue treatment`);
    }
  }

  const delegatedWithMappings = catalog.delegatedProducers.map((row) => {
    if (row.id !== "datawrapper")
      fail(`delegated producer ${row.id} has no maintained mapping adapter`);
    const usedMappings = new Set();
    const mappings = [];
    // The delegated provider serves more than one medium: it has three map types as well as its
    // charts, and declaring a single `medium` here is what kept them unreachable while the pinned
    // inventory carried them the whole time.
    for (const treatmentRow of treatmentsWithProof.filter((candidate) =>
      row.media.includes(candidate.medium),
    )) {
      for (const format of row.formats) {
        const match = datawrapperMatch({
          medium: treatmentRow.medium,
          format,
          treatment: treatmentRow.label,
        });
        if (!match) continue;
        usedMappings.add(match.treatment);
        mappings.push({
          treatmentId: treatmentRow.id,
          format,
          providerTypes: match.datawrapperTypes,
          defaultProviderType: match.datawrapperTypes[0],
        });
      }
    }
    for (const mapping of DATAWRAPPER_CATALOG.splashTreatments) {
      if (!usedMappings.has(mapping.treatment)) {
        fail(
          `Datawrapper treatment mapping ${JSON.stringify(mapping.treatment)} reaches no canonical catalogue treatment`,
        );
      }
    }
    if (!mappings.length)
      fail(`delegated producer ${row.id} reaches no catalogue entry`);
    return { ...row, mappings };
  });

  return {
    ...catalog,
    delegatedProducers: delegatedWithMappings,
    treatments: treatmentsWithProof,
  };
}

function capabilityFacts(catalog, ids) {
  const byID = new Map(catalog.capabilities.map((row) => [row.id, row]));
  const rows = ids.map((id) => byID.get(id));
  return {
    requiredCredentials: [
      ...new Set(rows.flatMap((row) => row?.requiredCredentials ?? [])),
    ],
    requiredSettings: [
      ...new Set(rows.flatMap((row) => row?.requiredSettings ?? [])),
    ],
  };
}

/** Expand normalized data for consumers that need one stable treatment/format option per row. */
export function expandVisualCatalog(catalog) {
  const pairs = new Map(
    catalog.formatPairs.map((row) => [`${row.medium}/${row.format}`, row]),
  );
  const producers = new Map(catalog.producers.map((row) => [row.id, row]));
  const forms = new Map(catalog.deliveryForms.map((row) => [row.id, row]));
  const entries = [];
  for (const treatment of catalog.treatments) {
    for (const format of treatment.formats) {
      const pair = pairs.get(`${treatment.medium}/${format}`);
      if (!pair)
        fail(`cannot expand ${treatment.id}/${format}: pair is missing`);
      const producerRow = producers.get(pair.producer);
      const pairFacts = capabilityFacts(catalog, pair.requiredCapabilities);
      const optionalFacts = capabilityFacts(catalog, pair.optionalCapabilities);
      entries.push({
        id: `${treatment.id}.${format}`,
        label: treatment.label,
        optionLabel: `${treatment.label} · ${pair.label}`,
        medium: treatment.medium,
        format,
        treatmentId: treatment.id,
        treatment: treatment.label,
        purpose: treatment.purpose ?? treatment.dataShape.summary,
        dataShape: treatment.dataShape,
        state: treatment.state,
        disabledReason: treatment.disabledReason ?? null,
        sizeRule: pair.sizeRule,
        interaction: pair.interaction,
        producer: {
          id: producerRow.id,
          label: producerRow.label,
          skill: producerRow.skill,
        },
        producerAlternatives: catalog.delegatedProducers.flatMap((delegated) =>
          delegated.mappings
            .filter(
              (mapping) =>
                mapping.treatmentId === treatment.id &&
                mapping.format === format,
            )
            .map((mapping) => ({
              id: delegated.id,
              label: delegated.label,
              producer: producers.get(delegated.producer),
              requiredCapabilities: [delegated.capability],
              ...capabilityFacts(catalog, [delegated.capability]),
              providerTypes: mapping.providerTypes,
              defaultProviderType: mapping.defaultProviderType,
            })),
        ),
        deliveryForms: pair.deliveryForms.map((formID) => {
          const form = forms.get(formID);
          const facts = capabilityFacts(catalog, form.requiredCapabilities);
          return {
            id: form.id,
            label: form.label,
            gives: FORMS_BY_FORMAT[format][form.id].gives,
            requiredCapabilities: form.requiredCapabilities,
            ...facts,
          };
        }),
        requiredCapabilities: pair.requiredCapabilities,
        optionalCapabilities: pair.optionalCapabilities,
        ...pairFacts,
        optionalCredentials: optionalFacts.requiredCredentials,
        optionalSettings: optionalFacts.requiredSettings,
        runtimePrerequisites: pair.runtimePrerequisites,
        browserPrerequisites: pair.browserPrerequisites,
        proofFormats: treatment.proofFormats ?? [],
        provenInThisFormat: (treatment.proofFormats ?? []).includes(format),
      });
    }
  }
  assertUnique(
    entries.map((row) => row.id),
    "expanded entry id",
  );
  return entries;
}

export function buildStoryboardVisualCatalog(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    catalogId: catalog.catalogId,
    catalogRevision: catalogueRevision(catalog),
    mediums: catalog.mediums,
    formats: catalog.formats,
    capabilities: catalog.capabilities,
    deliveryForms: catalog.deliveryForms,
    producers: catalog.producers,
    delegatedProducers: catalog.delegatedProducers,
    formatPairs: catalog.formatPairs.map((row) => ({
      ...row,
      pair: `${row.medium}/${row.format}`,
      producerSkill: catalog.producers.find(
        (producerRow) => producerRow.id === row.producer,
      ).skill,
      delivered: true,
    })),
    treatments: catalog.treatments,
  };
}

export function readVisualCatalog(path = VISUAL_CATALOG_PATH, options = {}) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return validateVisualCatalog(value, options);
}

function renderDerivative(catalog) {
  return `${JSON.stringify(buildStoryboardVisualCatalog(catalog), null, 2)}\n`;
}

function checkPublishedSchema() {
  let schema;
  try {
    schema = JSON.parse(readFileSync(VISUAL_CATALOG_SCHEMA_PATH, "utf8"));
  } catch (error) {
    fail(
      `cannot read published JSON Schema: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    schema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    schema.additionalProperties !== false
  ) {
    fail("published JSON Schema must be strict Draft 2020-12");
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--check");
  if (unknown.length) {
    console.error(`visual-catalog.mjs does not know ${unknown.join(", ")}`);
    process.exit(2);
  }
  try {
    checkPublishedSchema();
    const built = renderDerivative(readVisualCatalog());
    if (args.includes("--check")) {
      const current = existsSync(STORYBOARD_VISUAL_CATALOG_PATH)
        ? readFileSync(STORYBOARD_VISUAL_CATALOG_PATH, "utf8")
        : "";
      if (current !== built) {
        console.error(
          "skills/storyboard/references/visual-catalog.json has drifted. Run: bun scripts/visual-catalog.mjs",
        );
        process.exit(1);
      }
      console.log(
        "visual catalogue schema, parity checks, and Storyboard derivative pass.",
      );
    } else {
      writeFileSync(STORYBOARD_VISUAL_CATALOG_PATH, built);
      console.log(`wrote ${STORYBOARD_VISUAL_CATALOG_PATH}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
