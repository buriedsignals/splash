// I5, made mechanical: an adapter never reads ambient state. Credentials and settings are
// resolved by the caller (lib/loop/deliver.ts) and arrive in the PublishRequest — that is what
// makes a publish reproducible, and what keeps a run from depending on which shell started it.
//
// The principle was documented on the type (lib/core/publishers.ts:38) and honoured everywhere
// EXCEPT two `= process.env` parameter defaults in cloudflare-pages.ts, which no publish path
// exercised but which were the one remaining door (registry A7). A prose principle with one
// undefended door is how the door gets used, so this asserts it on the source instead.
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DELIVERY = import.meta.dir;

function productionSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...productionSources(full));
      continue;
    }
    if (!entry.endsWith(".ts")) continue;
    // Test files are allowed ambient state: they set TZ, gate opt-in live proofs on an env
    // flag, and pass process.env to child processes on purpose.
    if (entry.endsWith(".test.ts")) continue;
    out.push(full);
  }
  return out;
}

// Comments are stripped before scanning: s3-sign.ts's header states "no process.env" as its
// own purity contract, and a guard that fires on a module documenting the rule it obeys would
// be deleted rather than obeyed.
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// A ratchet, not an allowlist: the one entry left is named with what unblocks it, and the
// COUNT is asserted, so a second door cannot be added under cover of the first.
//
// `resolveEmbedConfig`'s `= process.env` default survives only because its one remaining
// caller is skills/splash/scripts/deploy-embed.mjs:108, which calls it with no argument. That
// file is the legacy shell (registry §3.6) and is outside this slice's boundary; the close is
// one token there — `resolveEmbedConfig(process.env)` — and then this list goes to zero.
const AMBIENT_READERS_LEFT: Record<string, number> = {
  "adapters/cloudflare-pages.ts": 1,
};

describe("delivery adapters read no ambient state", () => {
  it("should touch process.env nowhere but the one door the register still names", () => {
    const found: Record<string, number> = {};
    for (const f of productionSources(DELIVERY)) {
      const hits = withoutComments(readFileSync(f, "utf8")).match(
        /process\s*\.\s*env/g,
      );
      if (hits) found[f.slice(DELIVERY.length + 1)] = hits.length;
    }
    expect(found).toEqual(AMBIENT_READERS_LEFT);
  });

  it("should scan a non-trivial number of files, so an empty walk cannot pass as compliance", () => {
    expect(productionSources(DELIVERY).length).toBeGreaterThan(5);
  });
});
