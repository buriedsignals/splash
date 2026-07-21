// core/locale — re-exports the shared implementation. See lib/core/locale.ts for the
// full rationale. NOTE (shared-core extraction, see lib/core/locale.test.ts): this
// repoint is a BEHAVIOUR CHANGE for map-native, closing two previously-silent gaps —
// (1) German/Italian now get correct separators + "Quelle:"/"Fonte:" furniture instead
// of falling back to English style; (2) the French thousands separator is now the
// narrow no-break space (U+202F, matches chart-native/Intl/Datawrapper) instead of a
// plain breakable ASCII space. Both were real drift from this file's own former header
// ("mirroring chart-native/src/core/locale.ts"), not intentional map-native-specific
// design — see lib/core/locale.ts's MERGE NOTE and the Task 3 report for evidence.
export * from "../../../../lib/core/locale";
