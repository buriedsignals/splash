import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import catalog from "../../catalog/visual-catalog.json" with { type: "json" };
import {
  EXPORT_SIZES,
  mutateStoryboardRevisioned,
  parseStoryboard,
  REQUIRED_SCALARS,
  SIZED_FORMATS,
  storyboardRevision,
} from "../../skills/storyboard/scripts/storyboard.mjs";
import {
  confirmProducerChoice,
  datawrapperMatch,
  producerGap,
} from "../../skills/storyboard/scripts/producer-gate.mjs";
import { whereIs } from "../../skills/splash/scripts/where.mjs";

export const SELECTION_SCHEMA_VERSION = "splash-selection/v1";

const USABLE_CREDENTIAL_STATES = new Set([
  "ready",
  "partially-verified",
  "saved-unverified",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

export function visualCatalogRevision(value = catalog) {
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

export function capabilitySnapshotFromStatus(status, catalogue = catalog) {
  const credentials = new Map(
    (Array.isArray(status?.credentials) ? status.credentials : []).map(
      (row) => [row?.id, row],
    ),
  );
  const settingAvailable = new Set();
  for (const row of credentials.values()) {
    if (row?.validation?.evidence?.cloudflareAccountId) {
      settingAvailable.add("cloudflare-account-id");
    }
  }
  const available = [];
  const reasons = {};
  for (const definition of catalogue.capabilities ?? []) {
    const credentialsReady = (definition.requiredCredentials ?? []).every(
      (id) => USABLE_CREDENTIAL_STATES.has(credentials.get(id)?.state),
    );
    const settingsReady = (definition.requiredSettings ?? []).every((id) =>
      settingAvailable.has(id),
    );
    if (credentialsReady && settingsReady) available.push(definition.id);
    else reasons[definition.id] = definition.unavailableReason;
  }
  const generationSource = {
    credentials: [...credentials.values()].map((row) => ({
      id: row?.id ?? null,
      state: row?.state ?? null,
      generation: Number.isSafeInteger(row?.generation) ? row.generation : null,
      cloudflareAccountId:
        row?.validation?.evidence?.cloudflareAccountId ?? null,
    })),
    runtime: status?.runtime?.status ?? null,
    readiness: status?.readiness?.ready === true,
  };
  return {
    generation: `sha256:${createHash("sha256")
      .update(JSON.stringify(stable(generationSource)))
      .digest("hex")}`,
    available,
    reasons,
  };
}

function conflict(message, code = "SELECTION_CONFLICT") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeCapabilities(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("selection capability snapshot is unavailable");
  }
  if (
    typeof value.generation !== "string" ||
    !value.generation ||
    value.generation.length > 256
  ) {
    throw new Error("selection capability generation is invalid");
  }
  const available = Array.isArray(value.available) ? value.available : [];
  if (
    available.some((id) => typeof id !== "string") ||
    new Set(available).size !== available.length
  ) {
    throw new Error("selection capability availability is invalid");
  }
  const reasons =
    value.reasons &&
    typeof value.reasons === "object" &&
    !Array.isArray(value.reasons)
      ? Object.fromEntries(
          Object.entries(value.reasons).flatMap(([id, reason]) =>
            typeof reason === "string" && reason
              ? [[id, reason.slice(0, 2000)]]
              : [],
          ),
        )
      : {};
  return {
    generation: value.generation,
    available: new Set(available),
    reasons,
  };
}

async function readStableStoryboard(path) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > 2 << 20) {
    throw new Error(
      "the bound STORYBOARD.md is missing, too large, or not a real file",
    );
  }
  const text = await readFile(path, "utf8");
  const after = await lstat(path);
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw conflict(
      "the bound STORYBOARD.md changed while selection state was loading",
    );
  }
  return { text, revision: storyboardRevision(text) };
}

function requiredCapabilityState(ids, capabilities, catalogue) {
  const definitions = new Map(
    catalogue.capabilities.map((row) => [row.id, row]),
  );
  const missing = ids.filter((id) => !capabilities.available.has(id));
  if (missing.length === 0)
    return { enabled: true, reason: null, repairAction: null };
  const first = missing[0];
  const definition = definitions.get(first);
  return {
    enabled: false,
    reason:
      capabilities.reasons[first] ??
      definition?.unavailableReason ??
      `Capability ${first} is unavailable.`,
    repairAction: definition?.repairAction ?? null,
  };
}

function option(
  base,
  availability = { enabled: true, reason: null, repairAction: null },
) {
  return { ...base, ...availability };
}

function capabilityImplications(ids, capabilities, catalogue) {
  const definitions = new Map(
    catalogue.capabilities.map((row) => [row.id, row]),
  );
  return ids.map((id) => ({
    id,
    label: definitions.get(id)?.label ?? id,
    ...requiredCapabilityState([id], capabilities, catalogue),
  }));
}

function deliveryImplications(ids, capabilities, catalogue) {
  const definitions = new Map(
    catalogue.deliveryForms.map((row) => [row.id, row]),
  );
  return ids.map((id) => {
    const definition = definitions.get(id);
    return {
      id,
      label: definition?.label ?? id,
      ...requiredCapabilityState(
        definition?.requiredCapabilities ?? [],
        capabilities,
        catalogue,
      ),
    };
  });
}

const DECISION_PREREQUISITES = REQUIRED_SCALARS.filter(
  (field) => field !== "reference",
);

function deriveCurrentDecision(state, parsed) {
  if (
    state.phase !== "storyboard" ||
    DECISION_PREREQUISITES.some((field) => !parsed.meta[field])
  ) {
    return null;
  }
  const slots = parsed.meta.slots ?? [];
  if (slots.length === 0) return { id: "G2a", awaiting: "slot" };

  for (const [index, slot] of slots.entries()) {
    const slotId = String(slot.id ?? index + 1);
    if (!slot.id) return { id: "G2a", awaiting: "id", slotId };
    if (!slot.proves) return { id: "G2a", awaiting: "proves", slotId };
    if (!slot.medium) return { id: "G2a", awaiting: "medium", slotId };
    if (!slot.format) return { id: "G2b", awaiting: "format", slotId };
    if (slot.reachable !== "yes") {
      return { id: "G2b", awaiting: "reachability", slotId };
    }
    if (SIZED_FORMATS.includes(slot.format) && !slot.size) {
      return { id: "G2c", awaiting: "size", slotId };
    }
    if (!SIZED_FORMATS.includes(slot.format) && slot.size) {
      return { id: "G2c", awaiting: "size-removal", slotId };
    }
    if (slot.size && !EXPORT_SIZES.includes(slot.size)) {
      return { id: "G2c", awaiting: "size", slotId };
    }
  }

  if (!parsed.meta.reference) {
    return { id: "G2-reference", awaiting: "reference" };
  }
  for (const [index, slot] of slots.entries()) {
    const slotId = String(slot.id ?? index + 1);
    if (
      !slot.chosen ||
      !Array.isArray(slot.candidates) ||
      !slot.candidates.includes(slot.chosen)
    ) {
      return { id: "G2-treatment", awaiting: "treatment", slotId };
    }
    if (producerGap(slot)) {
      return { id: "G2-producer", awaiting: "producer", slotId };
    }
  }
  return null;
}

function activeSlot(parsed, decision) {
  const slots = parsed.meta.slots ?? [];
  if (!decision?.slotId) return null;
  return (
    slots.find((slot) => String(slot.id) === String(decision.slotId)) ?? null
  );
}

function choicesFor({ catalogue, capabilities, parsed, decision }) {
  const slot = activeSlot(parsed, decision);
  const pairs = new Map(
    catalogue.formatPairs.map((row) => [`${row.medium}/${row.format}`, row]),
  );
  if (decision?.id === "G2a" && decision.awaiting === "medium") {
    return catalogue.mediums.map((medium) => {
      const pairRows = catalogue.formatPairs.filter(
        (row) => row.medium === medium.id,
      );
      const reachable = pairRows.some(
        (row) =>
          requiredCapabilityState(
            row.requiredCapabilities,
            capabilities,
            catalogue,
          ).enabled,
      );
      const availability = reachable
        ? { enabled: true, reason: null, repairAction: null }
        : requiredCapabilityState(
            pairRows.flatMap((row) => row.requiredCapabilities),
            capabilities,
            catalogue,
          );
      return option(
        {
          id: `medium.${medium.id}`,
          kind: "medium",
          value: medium.id,
          label: medium.label,
          description: medium.description,
        },
        availability,
      );
    });
  }
  if (!slot) return [];
  if (
    decision?.id === "G2b" &&
    (decision.awaiting === "format" || decision.awaiting === "reachability")
  ) {
    return catalogue.formats.flatMap((format) => {
      const pair = pairs.get(`${slot.medium}/${format.id}`);
      if (!pair) return [];
      return [
        option(
          {
            id: `format.${format.id}`,
            kind: "format",
            value: format.id,
            label: format.label,
            description: format.description,
            interaction: pair.interaction,
            sizeRule: pair.sizeRule,
            deliveryForms: pair.deliveryForms,
            deliveryOptions: deliveryImplications(
              pair.deliveryForms,
              capabilities,
              catalogue,
            ),
            optionalCapabilities: capabilityImplications(
              pair.optionalCapabilities,
              capabilities,
              catalogue,
            ),
            runtimePrerequisites: pair.runtimePrerequisites,
            browserPrerequisites: pair.browserPrerequisites,
          },
          requiredCapabilityState(
            pair.requiredCapabilities,
            capabilities,
            catalogue,
          ),
        ),
      ];
    });
  }
  if (decision?.id === "G2c") {
    const pair = pairs.get(`${slot.medium}/${slot.format}`);
    if (!pair) return [];
    if (decision.awaiting === "size-removal") {
      return [
        option({
          id: "size.none",
          kind: "size",
          value: null,
          label: "No fixed size",
          description: "This format fills its container.",
        }),
      ];
    }
    return (pair.sizeRule.options ?? []).map((size) =>
      option({
        id: `size.${size}`,
        kind: "size",
        value: size,
        label: size[0].toUpperCase() + size.slice(1),
        description: `Use the ${size} export contract.`,
      }),
    );
  }
  if (decision?.id === "G2-treatment") {
    const pair = pairs.get(`${slot.medium}/${slot.format}`);
    if (!pair) return [];
    const candidateLabels =
      Array.isArray(slot.candidates) && slot.candidates.length > 0
        ? new Set(slot.candidates.map(String))
        : null;
    const capabilityState = requiredCapabilityState(
      pair.requiredCapabilities,
      capabilities,
      catalogue,
    );
    return catalogue.treatments
      .filter(
        (row) =>
          row.medium === slot.medium && row.formats.includes(slot.format),
      )
      .filter((row) => !candidateLabels || candidateLabels.has(row.label))
      .map((row) =>
        option(
          {
            id: row.id,
            kind: "treatment",
            value: row.label,
            label: row.label,
            description: row.dataShape.summary,
            dataShape: row.dataShape,
            family: row.medium,
            proofOnly: row.state === "proof-only",
          },
          row.state === "proof-only"
            ? { enabled: false, reason: row.disabledReason, repairAction: null }
            : capabilityState,
        ),
      );
  }
  if (decision?.id === "G2-producer") {
    const match = datawrapperMatch({
      medium: slot.medium,
      format: slot.format,
      treatment: slot.chosen,
    });
    if (!match) return [];
    return [
      option({
        id: "producer.custom",
        kind: "producer",
        value: "custom",
        label: "Custom",
        description: "Produce a bespoke Splash component.",
      }),
      option(
        {
          id: "producer.datawrapper",
          kind: "producer",
          value: "datawrapper",
          label: "Datawrapper",
          description: `Use the maintained ${match.datawrapperTypes[0]} implementation.`,
          datawrapperType: match.datawrapperTypes[0],
        },
        requiredCapabilityState(["datawrapper"], capabilities, catalogue),
      ),
    ];
  }
  return [];
}

function publicSlot(slot) {
  if (!slot) return null;
  return Object.fromEntries(
    [
      "id",
      "proves",
      "medium",
      "format",
      "size",
      "reachable",
      "candidates",
      "chosen",
      "producer",
      "datawrapperType",
    ].flatMap((key) =>
      Object.prototype.hasOwnProperty.call(slot, key) ? [[key, slot[key]]] : [],
    ),
  );
}

function publicEvidence(parsed, slot) {
  const fields = [
    "takeaway",
    "subject",
    "comparison",
    "limits",
    "placement",
    "effectiveDate",
  ];
  const evidence = Object.fromEntries(
    fields.flatMap((field) => {
      const value = parsed.meta[field];
      return typeof value === "string" && value.trim()
        ? [[field, value.trim().slice(0, 4000)]]
        : [];
    }),
  );
  if (typeof slot?.proves === "string" && slot.proves.trim()) {
    evidence.proves = slot.proves.trim().slice(0, 4000);
  }
  return evidence;
}

function expectedMatches(expected, model) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected))
    return false;
  return (
    expected.storyRevision === model.revisions.story &&
    expected.catalogRevision === model.revisions.catalogue &&
    expected.capabilityGeneration === model.revisions.capabilities
  );
}

function mutationFor(model, choice) {
  const slot = model.slot;
  if (!slot) throw new Error("the current storyboard gate has no active slot");
  switch (choice.kind) {
    case "medium":
      return {
        slot: {
          id: slot.id,
          fields: {
            medium: choice.value,
            format: null,
            size: null,
            reachable: null,
            candidates: null,
            chosen: null,
          },
        },
      };
    case "format":
      return {
        slot: {
          id: slot.id,
          fields: {
            format: choice.value,
            size: null,
            reachable: "yes",
            candidates: null,
            chosen: null,
          },
        },
      };
    case "size":
      return { slot: { id: slot.id, fields: { size: choice.value } } };
    case "treatment": {
      const candidates =
        Array.isArray(slot.candidates) && slot.candidates.length > 0
          ? slot.candidates
          : model.choices
              .filter((row) => row.kind === "treatment" && row.enabled)
              .map((row) => row.value);
      return {
        slot: { id: slot.id, fields: { candidates, chosen: choice.value } },
      };
    }
    case "producer": {
      const producer = confirmProducerChoice({
        medium: slot.medium,
        format: slot.format,
        treatment: slot.chosen,
        producer: choice.value,
        datawrapperType: choice.datawrapperType,
      });
      return { slot: { id: slot.id, fields: producer } };
    }
    default:
      throw new Error(
        "the selected catalogue option does not belong to a writable gate",
      );
  }
}

export function createSelectionService({
  storyBinding,
  capabilityProvider,
  catalogProvider = () => catalog,
  stateProvider = whereIs,
  writer = mutateStoryboardRevisioned,
} = {}) {
  if (!storyBinding || typeof storyBinding.revalidate !== "function")
    throw new Error("selection requires a confirmed story binding");
  if (typeof capabilityProvider !== "function")
    throw new Error("selection requires a capability provider");

  async function read({ bindingContext } = {}) {
    const descriptor = await storyBinding.revalidate(bindingContext);
    const storyboardPath = join(descriptor.canonicalPath, "STORYBOARD.md");
    const before = await readStableStoryboard(storyboardPath);
    const [state, providedCatalogue, providedCapabilities] = await Promise.all([
      stateProvider(descriptor.canonicalPath),
      catalogProvider(),
      capabilityProvider(),
    ]);
    const after = await readStableStoryboard(storyboardPath);
    if (before.revision !== after.revision)
      throw conflict("STORYBOARD.md changed while selection state was loading");
    if (!state || typeof state.phase !== "string")
      throw new Error("the bound story returned no canonical phase state");
    const parsed = parseStoryboard(after.text);
    const capabilities = normalizeCapabilities(providedCapabilities);
    const decision = deriveCurrentDecision(state, parsed);
    const slot = activeSlot(parsed, decision);
    const model = {
      schemaVersion: SELECTION_SCHEMA_VERSION,
      story: {
        storyId: descriptor.storyId,
        canonicalPath: descriptor.canonicalPath,
      },
      phase: state.phase,
      gate: decision
        ? { id: decision.id, awaiting: decision.awaiting }
        : null,
      slot: publicSlot(slot),
      evidence: publicEvidence(parsed, slot),
      revisions: {
        story: after.revision,
        catalogue: visualCatalogRevision(providedCatalogue),
        capabilities: capabilities.generation,
      },
      choices: [],
    };
    model.choices = choicesFor({
      catalogue: providedCatalogue,
      capabilities,
      parsed,
      decision,
    });
    return model;
  }

  async function writeCurrent({ bindingContext, expected, mutation }) {
    const current = await read({ bindingContext });
    if (!expectedMatches(expected, current)) {
      throw conflict(
        "the story, visual catalogue, or capability state changed; refresh before confirming",
      );
    }
    const path = join(current.story.canonicalPath, "STORYBOARD.md");
    await writer(path, mutation(current), {
      expectedRevision: current.revisions.story,
    });
    return read({ bindingContext });
  }

  return Object.freeze({
    read,

    async confirm({ bindingContext, expected, optionId } = {}) {
      if (typeof optionId !== "string" || !optionId)
        throw new Error("selection confirmation requires an option id");
      return writeCurrent({
        bindingContext,
        expected,
        mutation(current) {
          const choice = current.choices.find((row) => row.id === optionId);
          if (!choice)
            throw new Error(
              "the selected option does not belong to the current gate",
            );
          if (!choice.enabled)
            throw conflict(
              choice.reason ?? "the selected option is unavailable",
              "OPTION_UNAVAILABLE",
            );
          return mutationFor(current, choice);
        },
      });
    },

    async reopenFormat({ bindingContext, expected } = {}) {
      return writeCurrent({
        bindingContext,
        expected,
        mutation(current) {
          if (!current.slot?.format)
            throw new Error(
              "the active slot has no confirmed publication format to reopen",
            );
          return {
            slot: {
              id: current.slot.id,
              fields: {
                format: null,
                size: null,
                reachable: null,
                candidates: null,
                chosen: null,
              },
            },
          };
        },
      });
    },

    async reopenTreatment({ bindingContext, expected } = {}) {
      return writeCurrent({
        bindingContext,
        expected,
        mutation(current) {
          if (!current.slot?.chosen)
            throw new Error(
              "the active slot has no confirmed treatment to reopen",
            );
          return { slot: { id: current.slot.id, fields: { chosen: null } } };
        },
      });
    },
  });
}
