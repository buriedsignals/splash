// The source VOCABULARY — the words themselves, and NOTHING else: no schema, no validation, no
// import. (Mirrors lib/core/vocabulary.ts, which does the same for the delivery words.)
//
// It sits apart from kinds.ts, which keeps the schemas, for one concrete reason: an ENGINE has
// to name a source class in its own types (chart-native's NativeSpec.sourceKind), and an engine
// is source that gets COPIED into the runnable bundle a newsroom downloads. The bundler traces
// static imports without distinguishing a type-only one (skills/splash/scripts/bundle-source.mjs
// — deliberately, so the copied source stays complete), so a `import type { SourceKind }` from a
// module that imports zod hands every scrolly bundle a zod dependency it never runs. The words
// have no dependencies; only the schemas do. Splitting them says so.
//
// kinds.ts re-exports everything here, so every existing importer keeps its path.

export const SOURCE_KINDS = [
  // A named external dataset or publication. Traceable by anyone: needs its own URL.
  "public",
  // A file the journalist brought. Provenance is the run's own frozen input (path + sha256),
  // which is why this kind needs no URL and stores no second copy of the path.
  "local",
  // A newsroom-internal dataset. Publishable ATTRIBUTION only; the internal reference stays in
  // the private run ledger and never reaches a rendered visual.
  "private",
  // Test / demo data. Never reporting: barred from a real run outright.
  "synthetic",
  // Figures the journalist quoted in their own text. An already-published claim, not a record —
  // so Splash may re-present it, never derive from it.
  "prose",
  // No external factual data at all (a diagram, a pure illustration). The one kind with no
  // credit, and legal only for a visual that asserts no facts.
  "none",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

// Whether this run is reporting or a rehearsal. The axis synthetic data is gated on: a demo
// dataset is legitimate in a test run and a fabrication in a real one, and nothing else in the
// declaration can express that difference.
export const RUN_MODES = ["real", "test"] as const;
export type RunMode = (typeof RUN_MODES)[number];
