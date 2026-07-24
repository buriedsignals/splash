// The canonical vocabulary of the execution contract. Nothing here imports upward into
// skills/ — that inversion is exactly what this file exists to end: lib/core/contract.ts
// and lib/core/registry.ts used to type-import VisualFormat/Channel from
// skills/splash/src/, which meant the new shell could not exist without the legacy
// orchestrator. skills/splash/src/producer-spec.ts and channel.ts now RE-EXPORT from
// here, so their ~46 existing importers are untouched, and VisualFormat stops being
// duplicated by hand between producer-spec.ts and channel.ts.
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §2.1.

// Every vocabulary below is declared ONCE, as a const array, with its union type DERIVED
// from it (the VERBS/Verb shape). That derivation is the whole point: a runtime shape gate
// (lib/core/verbs/index.ts's isRenderPayload) needs the values at runtime, and a
// hand-written second copy of the list is exactly the drift this file exists to abolish —
// a fifth format added to the union but not to the array would silently make the gate
// reject a valid payload. Deriving the type from the array makes the two impossible to
// disagree.
export const VISUAL_FORMATS = [
  "static",
  "interactive",
  "video",
  "scrolly",
] as const;
export type VisualFormat = (typeof VISUAL_FORMATS)[number];

// The three canonical distribution channels a journalist picks in CADRAGE Q3.
// (Distinct from skills/splash/src/channel.ts's CHANNELS map, which hangs each channel's
// aspect/size POLICY off these keys — the vocabulary is the keys, not the policy.)
export const CHANNELS = [
  "social-vertical",
  "social-feed",
  "article-web",
] as const;
export type Channel = (typeof CHANNELS)[number];

export function isVisualFormat(v: unknown): v is VisualFormat {
  return (
    typeof v === "string" && (VISUAL_FORMATS as readonly string[]).includes(v)
  );
}

export function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}

// The CLOSED verb vocabulary. A closed enum is what makes "bounded verbs" mechanical
// rather than documentary: an operation outside this list is a refusal, not an
// improvisation. Only `render` has a body in B1 — capture (issue #10), review (#9) and
// publish (#4) are declared slots their own sub-project fills.
export const VERBS = ["render", "capture", "review", "publish"] as const;
export type Verb = (typeof VERBS)[number];

export function isVerb(v: unknown): v is Verb {
  return typeof v === "string" && (VERBS as readonly string[]).includes(v);
}
