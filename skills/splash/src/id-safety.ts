// Canonical definition moved to lib/core/id-safety.ts (the contract needs it, and
// lib/core may not import upward into skills/). Re-exported so produce-all.ts,
// adapters.ts and id-safety.test.ts are unchanged.
export {
  isSafeId,
  assertSafeId,
  unsafeIdMessage,
} from "../../../lib/core/id-safety";
