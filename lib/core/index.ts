// Splash shared core — the single source of cross-cutting correctness primitives
// (contrast, theme, locale, text-fit, video-verify, conformance-L0). Engines import
// ONLY from this barrel, never from each other's src/. See docs/superpowers/specs/
// 2026-07-20-shared-core-registry-contracts-design.md.
export const CORE_MARKER = "splash-core" as const;
export * from "./contrast";
