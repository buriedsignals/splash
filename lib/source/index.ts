// lib/source — the one source model and policy of issue #7, for every gate that has an opinion
// about where a number came from (proposal validation, production, render review, delivery).
//
// The shape of the thing, in one paragraph: a source is CLASSIFIED explicitly (kinds.ts) and
// recorded on the run manifest beside the input it qualifies; each class carries its
// consequences in one exhaustive table (requirements.ts); validateSourcePolicy (policy.ts) is
// the single call that reads that table and answers all four questions #7 asks — required
// fields, display furniture, privacy handling, shippability for the run mode; what may leave
// the newsroom is a DIFFERENT TYPE built by allow-list (furniture.ts, redact.ts); and a prose
// source may only be re-presented, never computed from (prose.ts).
export * from "./kinds";
export * from "./result";
export * from "./requirements";
export * from "./url";
export * from "./furniture";
export * from "./prose";
export * from "./redact";
export * from "./policy";
