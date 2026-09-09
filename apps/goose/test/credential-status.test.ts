import { describe, expect, it } from "bun:test";

import { readCredentialStatuses } from "../studio/credential-status.mjs";
import { engineTimeout } from "../../../installer/setup/engine-bridge.mjs";

const rows = ["MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN"].map((id) => ({ id, metadata: { name: id } }));

describe("bounded credential status", () => {
  it("reads keys one at a time and passes each its deadline", async () => {
    const calls: Array<[string, number | undefined]> = [];
    const bridge = {
      async status(id: string, { timeoutMs }: { timeoutMs?: number } = {}) {
        calls.push([id, timeoutMs]);
        return { ok: true, id, stored: true, generation: 1 };
      },
    };
    const out = await readCredentialStatuses(bridge, rows, { perKeyMs: 500, budgetMs: 5_000 });
    expect(calls.map(([id]) => id)).toEqual(rows.map((row) => row.id));
    expect(calls.every(([, timeoutMs]) => timeoutMs === 500)).toBe(true);
    expect(out.map((row) => row.stored)).toEqual([true, true, true]);
    expect(out[0].metadata).toEqual({ name: "MAPTILER_KEY" });
  });

  it("reports a key whose read outlives its deadline and stops reading once the budget is spent", async () => {
    let clock = 0;
    const bridge = {
      async status(id: string, { timeoutMs = 0 }: { timeoutMs?: number } = {}) {
        // The first read hangs until its deadline (a keychain prompt); the
        // bridge maps that to engine-timeout.
        clock += timeoutMs;
        return id === "MAPTILER_KEY" ? engineTimeout(id) : { ok: true, id, stored: false, generation: 0 };
      },
    };
    const out = await readCredentialStatuses(bridge, rows, { perKeyMs: 100, budgetMs: 150, now: () => clock });
    expect(out.map((row) => [row.id, row.status ?? row.stored, row.outcome ?? null])).toEqual([
      ["MAPTILER_KEY", "engine-timeout", "engine-timeout"],
      ["DATAWRAPPER_TOKEN", false, null],
      ["CLOUDFLARE_API_TOKEN", "engine-timeout", "budget-exhausted"],
    ]);
    expect(out[0].reason).toContain("keychain prompt");
    expect(out[2].reason).toContain("keychain prompt");
  });

  it("never throws when the bridge does", async () => {
    const bridge = { async status() { throw new Error("spawn failed"); } };
    const out = await readCredentialStatuses(bridge, rows.slice(0, 1), { perKeyMs: 10, budgetMs: 100 });
    expect(out[0].status).toBe("engine-timeout");
  });
});
