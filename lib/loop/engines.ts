// The editorial loop's COMPOSITION ROOT — the one place the loop learns WHICH ENGINES EXIST
// and how to run them.
//
// The verb contract dispatches from a registry that each engine self-registers into on
// import (skills/<engine>/src/manifest.ts). A registry nobody populated is empty, and
// render() then answers `unknown-engine` for every engine that exists: the wiring is not
// optional, it is what makes the shipped module able to reach an engine at all. Before the
// verb contract, produce.ts shelled out to a hard-coded skills/ path and therefore worked
// standalone; that side effect has to be re-declared HERE or the loop only works inside a
// test file that happens to import the registrations itself.
//
// ★ THE RULE THIS FILE ACTUALLY KEEPS — stated precisely, because the version that stood here
// until this commit did not. It read "the loop's only point of knowledge about skills/" and
// "nothing else imports skills/", and that was false when it was written: TEN other production
// modules under lib/loop/ import skills/ today (approve.ts, assemble/{brief,dw-chart,
// image-native,index,map-dw,map-native,scrolly}.ts, beats.ts, orient.ts). The charter fix
// (3a1af005) added an eleventh import site without the sentence noticing, which is what a claim
// nothing checks always ends up doing.
//
// What is true, and what the drift test next door (engine-binding-drift.test.ts) now enforces,
// is a rule about the KIND of knowledge that may cross, not about whether anything crosses:
//
//   · DECLARATIONS may cross anywhere. Type ids, capability lists, validators, refusal
//     strings, pure helpers and asset readers — MAP_TYPES, CHART_TYPES, BASEMAP_NAMES,
//     scrolly's hosted-track lists, checkImageConformance, matchGeography, mergeProfileDefaults.
//     The loop reads these instead of restating them, and that is the point: a hand-copied
//     capability list is the drift class this repo keeps finding. Every one of these modules
//     REGISTERS NOTHING — importing it cannot make an engine reachable, so it cannot smuggle
//     in the wiring this file owns.
//
//   · The ENGINE SET may cross HERE AND NOWHERE ELSE. `register-producers` is the only import
//     under lib/loop/ whose module graph reaches a `registerProducer(...)` call — the side
//     effect that binds an engine's scriptPath and skillDir and makes getProducer answer.
//     That is the single point of knowledge, and it is a real one.
//
// Why the binding lives in one file, and why this one:
//   - The side effect is NOT scattered across the modules that need an engine: one import
//     site means one place to see it, and module caching runs it exactly once however many
//     loop modules pull it in.
//   - It does NOT live in lib/core/. The core is what skills/ depends on; a core module
//     importing skills/ would re-invert the dependency arrow this branch exists to fix.
//   - It is the swap point for the host façade (B2): a host that ships a different engine
//     set replaces THIS file, not the loop.
//
// HONEST CEILING: the declarations that cross are still a coupling — lib/loop does not compile
// without skills/ present. Routing them through lib/core (re-exporting each engine constant
// from the composition root) would buy a loop that type-checks standalone, at the cost of a
// second declaration site for every list, which is the very drift this repo mechanises against.
// That trade was NOT made here; this comment names the coupling instead of denying it.
//
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §3.3.
import "../../skills/splash/src/register-producers";

// A value export so the import is unmistakably load-bearing: a lone side-effect import is
// exactly the line a future "unused import" cleanup deletes, and the failure it causes is
// a runtime `unknown-engine`, not a compile error.
export const ENGINES_REGISTERED = true;
