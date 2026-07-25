// The HOST-level error codes — the codes a host meets from the façade itself rather than
// from a verb. `lib/core/verbs/types.ts` gives the verb codes exactly this treatment
// (VERB_ERROR_CODES as the single declared source, the union derived from it); these had no
// source at all, they were string literals typed once in state.ts and once in cli.ts, and
// the capability declaration therefore could not name them. Same rule, one field further:
// the vocabulary is never hand-duplicated.
export const HOST_ERROR_CODES = [
  "usage", // a malformed command line: unknown command/flag, missing or unreadable stdin
  "no-run", // --run names a directory that holds no run.json
  "invalid-run", // run.json is unparseable, or fails the manifest schema
  "stale-schema", // run.json predates the current schema; state/next will not migrate it
  "internal", // a residual defect in the façade — reported, never a stack trace on stdout
] as const;

export type HostErrorCode = (typeof HOST_ERROR_CODES)[number];
