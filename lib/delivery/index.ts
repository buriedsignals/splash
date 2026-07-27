// The delivery COMPOSITION ROOT — the one place adapters are registered, and the twin of
// lib/loop/engines.ts.
//
// The publish verb dispatches from a registry that nobody populates on its own: without this
// import every publish answers `unknown-publisher` for an adapter that exists. The value
// export below is what keeps the import load-bearing — a lone side-effect import is exactly
// the line a future "unused import" cleanup deletes, and the failure that causes is a runtime
// refusal, not a compile error.
import { lookupPublisher, registerPublisher } from "../core/publishers";
import type { Publisher } from "../core/publishers";
import { cloudflarePublisher } from "./adapters/cloudflare-pages";
import { s3Publisher } from "./adapters/s3";
import { wepublishPublisher } from "./adapters/wepublish";
import { zipPublisher } from "./adapters/zip";

/** The adapters this install ships. One line per adapter is the whole cost of a new
 * destination (§3.1). */
const DELIVERY_PUBLISHERS: Publisher[] = [
  cloudflarePublisher,
  s3Publisher,
  wepublishPublisher,
  zipPublisher,
];

// Exported as a function, not only as a module-level side effect: the registry is global to
// the module and `bun test` shares one process across files, so a test file that calls
// resetPublishersForTest() would otherwise leave every LATER file with an empty registry —
// module caching means the side effect never runs twice. A test resets, then calls this.
//
// IDEMPOTENT AND NON-FATAL, and that is a correctness property rather than convenience. This
// function also runs as a module-level side effect below, so anything it throws kills the
// module body BEFORE `PUBLISHERS_REGISTERED` is initialised — leaving that binding permanently
// in the temporal dead zone. lib/loop/deliver.ts reads it as its FIRST statement, so the guard
// written to prove the registry loaded would itself raise a ReferenceError, and lib/loop
// awaits `deliver()` unguarded precisely because that module promises never to throw: a
// bounded refusal would become a crash. Measured: one test file leaving a `{id:"zip"}` stub
// behind was enough to do it (13 failures under `bun test lib/` from the repo root).
//
// An id already claimed keeps its owner — first registration wins, and no adapter is silently
// swapped underneath a caller that deliberately registered its own. `registerPublisher` keeps
// throwing on a duplicate for every DIRECT caller, so the double-registration mistake it
// exists to catch is still caught where it can be reported.
export function registerAllPublishers(): void {
  for (const p of DELIVERY_PUBLISHERS) {
    if (lookupPublisher(p.id) === undefined) registerPublisher(p);
  }
}

registerAllPublishers();

// Reports what is actually dispatchable rather than asserting a constant: every adapter this
// root owns answers to its id. `deliver` turns a false here into a bounded refusal.
export const PUBLISHERS_REGISTERED: boolean = DELIVERY_PUBLISHERS.every(
  (p) => lookupPublisher(p.id) !== undefined,
);
