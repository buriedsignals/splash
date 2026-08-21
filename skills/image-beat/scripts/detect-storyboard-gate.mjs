/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`.
 *
 *  `storyboardGateStatus` (`storyboard-gate.mjs`) reads the story directory a beat's own directory
 *  sits under, not a delivered artefact — a report, never a refusal (see that file's own header
 *  for why this is a capability and not a guard). This file exists so it is DECLARED, the same
 *  `GUARDS`-array convention every other guard and capability in this skill already uses. */
export const GUARDS = ["storyboardGateStatus"];

export { storyboardGateStatus } from "./storyboard-gate.mjs";
