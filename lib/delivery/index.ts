// The delivery COMPOSITION ROOT — the one place adapters are registered, and the twin of
// lib/loop/engines.ts.
//
// The publish verb dispatches from a registry that nobody populates on its own: without this
// import every publish answers `unknown-publisher` for an adapter that exists. The value
// export below is what keeps the import load-bearing — a lone side-effect import is exactly
// the line a future "unused import" cleanup deletes, and the failure that causes is a runtime
// refusal, not a compile error.
import { registerPublisher } from "../core/publishers";
import { cloudflarePublisher } from "./adapters/cloudflare-pages";
import { zipPublisher } from "./adapters/zip";

// Exported as a function, not only as a module-level side effect: the registry is global to
// the module and `bun test` shares one process across files, so a test file that calls
// resetPublishersForTest() would otherwise leave every LATER file with an empty registry —
// module caching means the side effect never runs twice. A test resets, then calls this.
export function registerAllPublishers(): void {
  registerPublisher(cloudflarePublisher);
  registerPublisher(zipPublisher);
}

registerAllPublishers();

export const PUBLISHERS_REGISTERED = true;
