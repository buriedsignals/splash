import { allProducers } from "../core/registry";
import { CHANNELS, VERBS, VISUAL_FORMATS } from "../core/vocabulary";
import { VERB_ERROR_CODES, type RenderPayload } from "../core/verbs/types";
import { HOST_ERROR_CODES } from "./errors";
import {
  RENDER_SOURCE_POLICY_MARK,
  type SourcePolicyMark,
} from "./source-mark";

export type PayloadField = {
  name: string;
  type: string;
  required: boolean;
  enum?: readonly string[];
};

// One engine as a host sees it: the registry key it must pass as `engine`, and the formats
// that engine's own manifest declares. Without the second half a host can discover the
// engine names but not which of them can honour the format it wants — and the format gate
// in render() answers `unsupported-format` from exactly this data.
export type EngineDeclaration = {
  name: string;
  formats: readonly string[];
};

// A verb the façade will NOT dispatch, and the way through instead. `verbs` is what a host
// trusts in place of reading our source, so a detour that only lived in cli.ts would be
// undiscoverable: a host would build a valid request and meet a refusal it could not have
// anticipated. Declared here, read by cli.ts — one source, so the refusal and the declaration
// cannot describe different worlds.
export const HOST_ONLY_VERBS: Readonly<
  Record<string, { why: string; commands: readonly string[] }>
> = {
  publish: {
    why: "publishing goes through the editorial loop, which applies the sign-off, provenance and readiness gates the neutral contract cannot see",
    commands: ["request-delivery --run <dir>", "advance --run <dir>"],
  },
};

export type Capabilities = {
  contract: "splash-verbs/1";
  verbs: {
    name: string;
    implemented: boolean;
    payload?: PayloadField[];
    /** Present when `verb <name>` is refused: the façade command that performs it. */
    hostCommand?: string;
    /** Present when calling this verb through `verb` skips a policy the loop applies. `render`
     *  carries it: the contract holds `spec` opaque, so the credit inside it is whatever the
     *  request supplied. Declared here so a host reads the limitation rather than assuming its
     *  artifact was checked — the answer carries the same object (lib/host/cli.ts). */
    sourcePolicy?: SourcePolicyMark;
  }[];
  vocabulary: {
    formats: readonly string[];
    channels: readonly string[];
    engines: readonly EngineDeclaration[];
  };
  // Split, because a host meets two families and they arrive differently: `verb` codes come
  // in a VerbResult body, `host` codes come from the façade's own commands. Each has ONE
  // declared source (lib/core/verbs/types.ts, lib/host/errors.ts) — neither is retyped here.
  errorCodes: {
    verb: readonly string[];
    host: readonly string[];
  };
};

// Verbs with a body today. The vocabulary is CLOSED and declared in full — a host must be
// able to see that `capture`/`review` exist and are not callable yet, rather than
// discovering it as an error.
const IMPLEMENTED = new Set<string>([
  "render",
  "publish",
  "capture",
  "review",
]);

// The declaration of render's payload, KEYED BY THE PAYLOAD TYPE. `Record<keyof
// RenderPayload, …>` is the whole point: adding a field to RenderPayload (lib/core/verbs/
// types.ts) makes this object miss a key and stops compiling, so the declaration cannot
// silently keep describing the previous shape. Before this, the two agreed only by hand and
// a test's hardcoded name list passed against itself. §4.4 of the spec records the
// predecessor branch being bitten by exactly this drift class.
//
// A function, not a constant, because the engine enum is read from the registry at call
// time — the registry is populated by the composition root the caller binds.
function renderPayloadFields(): Record<
  keyof RenderPayload,
  Omit<PayloadField, "name">
> {
  return {
    engine: {
      type: "string",
      required: true,
      enum: engineDeclarations().map((e) => e.name),
    },
    // OPAQUE by contract (I3): only the engine's own validator understands it, so the
    // declaration says it exists and stops there.
    spec: { type: "unknown", required: true },
    format: { type: "string", required: true, enum: VISUAL_FORMATS },
    channel: { type: "string", required: true, enum: CHANNELS },
    outDir: {
      type: "string",
      required: true,
      // Not an enum but a constraint, and the façade enforces it (lib/host/path-safety.ts):
      // the contract wipes and recreates outDir, so a relative path would resolve against
      // the host's own working directory.
    },
    id: { type: "string", required: true },
  };
}

function payloadFields(): PayloadField[] {
  return Object.entries(renderPayloadFields()).map(([name, field]) => ({
    name,
    ...field,
  }));
}

// Derived from the registry, never a hand-written list: engines self-register their manifest
// (skills/<engine>/src/manifest.ts) and `allProducers()` is already the single source dispatch
// reads. Sorted so the declaration is stable across registration order.
function engineDeclarations(): EngineDeclaration[] {
  return allProducers()
    .map((m) => ({ name: m.name, formats: [...m.formats] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The machine-readable contract. Every enumeration is DERIVED from the vocabulary or the
// registry, never re-typed here: a local copy would drift from the union the payload type is
// built on, and this declaration is exactly what a host trusts instead of reading our source.
export function capabilities(): Capabilities {
  return {
    contract: "splash-verbs/1",
    verbs: VERBS.map((name) => ({
      name,
      // Still true of `publish`: the verb HAS a body, and lib/loop/deliver.ts calls it. What the
      // detour below changes is the path a host takes to reach it, not whether it exists.
      implemented: IMPLEMENTED.has(name),
      ...(name === "render"
        ? {
            payload: payloadFields(),
            sourcePolicy: RENDER_SOURCE_POLICY_MARK,
          }
        : {}),
      // The command that actually PERFORMS the verb — the last of the detour's sequence, since
      // the ones before it record the decisions that make it valid. The full sequence is in
      // HOST_ONLY_VERBS and in the refusal cli.ts prints; this field is the one word a host acts
      // on, and it is derived rather than retyped so the two can never disagree.
      ...(HOST_ONLY_VERBS[name]
        ? { hostCommand: HOST_ONLY_VERBS[name]!.commands.at(-1)!.split(" ")[0] }
        : {}),
    })),
    vocabulary: {
      formats: VISUAL_FORMATS,
      channels: CHANNELS,
      engines: engineDeclarations(),
    },
    errorCodes: { verb: VERB_ERROR_CODES, host: HOST_ERROR_CODES },
  };
}
