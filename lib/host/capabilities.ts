import { CHANNELS, VERBS, VISUAL_FORMATS } from "../core/vocabulary";
import { VERB_ERROR_CODES } from "../core/verbs/types";

export type PayloadField = {
  name: string;
  type: string;
  required: boolean;
  enum?: readonly string[];
};

export type Capabilities = {
  contract: "splash-verbs/1";
  verbs: { name: string; implemented: boolean; payload?: PayloadField[] }[];
  vocabulary: { formats: readonly string[]; channels: readonly string[] };
  errorCodes: readonly string[];
};

// Verbs with a body today. The vocabulary is CLOSED and declared in full — a host must be
// able to see that `capture`/`review`/`publish` exist and are not callable yet, rather
// than discovering it as an error.
const IMPLEMENTED = new Set<string>(["render"]);

const RENDER_PAYLOAD: PayloadField[] = [
  { name: "engine", type: "string", required: true },
  // OPAQUE by contract (I3): only the engine's own validator understands it, so the
  // declaration says it exists and stops there.
  { name: "spec", type: "unknown", required: true },
  { name: "format", type: "string", required: true, enum: VISUAL_FORMATS },
  { name: "channel", type: "string", required: true, enum: CHANNELS },
  { name: "outDir", type: "string", required: true },
  { name: "id", type: "string", required: true },
];

// The machine-readable contract. Every enumeration is DERIVED from the vocabulary, never
// re-typed here: a local copy would drift from the union the payload type is built on, and
// this declaration is exactly what a host trusts instead of reading our source.
export function capabilities(): Capabilities {
  return {
    contract: "splash-verbs/1",
    verbs: VERBS.map((name) => ({
      name,
      implemented: IMPLEMENTED.has(name),
      ...(name === "render" ? { payload: RENDER_PAYLOAD } : {}),
    })),
    vocabulary: { formats: VISUAL_FORMATS, channels: CHANNELS },
    errorCodes: VERB_ERROR_CODES,
  };
}
