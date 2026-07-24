// The editorial loop's COMPOSITION ROOT — and the loop's only point of knowledge about
// skills/.
//
// The verb contract dispatches from a registry that each engine self-registers into on
// import (skills/<engine>/src/manifest.ts). A registry nobody populated is empty, and
// render() then answers `unknown-engine` for every engine that exists: the wiring is not
// optional, it is what makes the shipped module able to reach an engine at all. Before the
// verb contract, produce.ts shelled out to a hard-coded skills/ path and therefore worked
// standalone; that side effect has to be re-declared HERE or the loop only works inside a
// test file that happens to import the registrations itself.
//
// Why one file, and why this one:
//   - Every other module under lib/loop/ stays engine-agnostic — nothing else imports
//     skills/, so the loop keeps the property the verb-contract branch gave it.
//   - The side effect is NOT scattered across the modules that need an engine: one import
//     site means one place to see it, and module caching runs it exactly once however many
//     loop modules pull it in.
//   - It does NOT live in lib/core/. The core is what skills/ depends on; a core module
//     importing skills/ would re-invert the dependency arrow this branch exists to fix.
//   - It is the swap point for the host façade (B2): a host that ships a different engine
//     set replaces THIS file, not the loop.
//
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §3.3.
import "../../skills/splash/src/register-producers";

// A value export so the import is unmistakably load-bearing: a lone side-effect import is
// exactly the line a future "unused import" cleanup deletes, and the failure it causes is
// a runtime `unknown-engine`, not a compile error.
export const ENGINES_REGISTERED = true;
