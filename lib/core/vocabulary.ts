// The canonical vocabulary of the execution contract. Nothing here imports upward into
// skills/ — that inversion is exactly what this file exists to end: lib/core/contract.ts
// and lib/core/registry.ts used to type-import VisualFormat/Channel from
// skills/splash/src/, which meant the new shell could not exist without the legacy
// orchestrator. skills/splash/src/producer-spec.ts and channel.ts now RE-EXPORT from
// here, so their ~46 existing importers are untouched, and VisualFormat stops being
// duplicated by hand between producer-spec.ts and channel.ts.
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §2.1.

export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

// The three canonical distribution channels a journalist picks in CADRAGE Q3.
export type Channel = "social-vertical" | "social-feed" | "article-web";

// The CLOSED verb vocabulary. A closed enum is what makes "bounded verbs" mechanical
// rather than documentary: an operation outside this list is a refusal, not an
// improvisation. Only `render` has a body in B1 — capture (issue #10), review (#9) and
// publish (#4) are declared slots their own sub-project fills.
export const VERBS = ["render", "capture", "review", "publish"] as const;
export type Verb = (typeof VERBS)[number];

export function isVerb(v: unknown): v is Verb {
  return typeof v === "string" && (VERBS as readonly string[]).includes(v);
}
