import { describe, expect, it, test } from "bun:test";
import {
  capabilityVerifiable,
  verifyAnthropic,
  verifyCapability,
  verifyCloudflare,
  verifyDatawrapper,
  verifyMapTiler,
} from "./verify";

// A fetch that throws is the offline / filtering-proxy / TLS-interception case. It must read as
// "couldn't reach", never as "invalid" — a valid key behind a corporate proxy would otherwise be
// condemned for life.
async function offline<T>(run: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  // Through `unknown`: a bare cast fails tsc here (lib/ typechecks its tests, unlike install/),
  // because a throwing thunk shares no members with the real fetch — including `preconnect`.
  globalThis.fetch = (() => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

// Bounded time (docs/superpowers/specs/2026-07-26-bounded-time-design.md): a provider that
// accepts the connection and never answers is the class this closes. `base` is a test-only seam
// (same convention as lib/delivery/adapters/cloudflare-pages.ts's `cf()`) so the real hang comes
// from an actual server, not a mocked clock or a fetch stub.
describe("verify* against a real hung endpoint", () => {
  function hungServer() {
    return Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Promise<Response>(() => {}), // accepts, never answers
    });
  }

  it("refuses within the configured bound instead of hanging, and reads as unreachable — never as an invalid key", async () => {
    const server = hungServer();
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const start = Date.now();
      const results = await Promise.all([
        verifyMapTiler("some-key", 150, base),
        verifyDatawrapper("some-token", 150, base),
        verifyCloudflare("tok", "acct", 150, base),
        verifyAnthropic("sk-ant-some", 150, base),
      ]);
      expect(Date.now() - start).toBeLessThan(2_000);
      // null is the tri-state's "could not reach" — the honest bucket. `false` would mean the
      // provider actively rejected the credential, which is the lie a hung endpoint must not tell.
      expect(results).toEqual([null, null, null, null]);
    } finally {
      server.stop(true);
    }
  }, 3_000);

  it("propagates as VerifyOutcome 'unreachable' through verifyCapability, not 'rejected'", async () => {
    const server = hungServer();
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const start = Date.now();
      const outcome = await verifyCapability(
        "dw-chart",
        { DATAWRAPPER_API_TOKEN: "tok" },
        150,
        base,
      );
      expect(Date.now() - start).toBeLessThan(2_000);
      expect(outcome).toBe("unreachable");
    } finally {
      server.stop(true);
    }
  }, 3_000);
});

describe("verify* (moved here from install/configurator-core.ts, tri-state intact)", () => {
  it("returns null — unreachable, NOT false — when the provider cannot be reached", async () => {
    await offline(async () => {
      expect(await verifyMapTiler("some-key")).toBeNull();
      expect(await verifyDatawrapper("some-token")).toBeNull();
      expect(await verifyAnthropic("sk-ant-some")).toBeNull();
      expect(await verifyCloudflare("tok", "acct")).toBeNull();
    });
  });

  it("returns false for a genuinely blank credential, without ever fetching", async () => {
    expect(await verifyMapTiler("")).toBe(false);
    expect(await verifyDatawrapper("   ")).toBe(false);
    expect(await verifyAnthropic("")).toBe(false);
    expect(await verifyCloudflare("tok", "")).toBe(false);
    expect(await verifyCloudflare("", "acct")).toBe(false);
  });
});

describe("verifyCapability — verification at the grain of a capability", () => {
  it("reports a blank credential as rejected", async () => {
    expect(
      await verifyCapability("dw-chart", { DATAWRAPPER_API_TOKEN: "" }),
    ).toBe("rejected");
  });

  it("reports an unreachable provider as unreachable, never rejected", async () => {
    await offline(async () => {
      expect(
        await verifyCapability("dw-chart", { DATAWRAPPER_API_TOKEN: "tok" }),
      ).toBe("unreachable");
    });
  });

  it("answers undefined for a capability with nothing to verify — an absence of question, not a failure", async () => {
    expect(await verifyCapability("chart-native", {})).toBeUndefined();
    expect(await verifyCapability("zip", {})).toBeUndefined();
    expect(await verifyCapability("image-native", {})).toBeUndefined();
    expect(capabilityVerifiable("chart-native")).toBe(false);
    expect(capabilityVerifiable("dw-chart")).toBe(true);
  });

  // No capability in the registry is only-declared any more (Fly.io, the last one, was
  // dropped) — verifyCapability answers the same way for an id it does not recognize at all:
  // silence, never a fabricated verdict.
  it("answers undefined for an id this install does not recognize", async () => {
    expect(
      await verifyCapability("nonexistent-capability", {}),
    ).toBeUndefined();
  });

  it("accepts either MapTiler mirror name for the map capabilities", async () => {
    await offline(async () => {
      expect(
        await verifyCapability("map-native", { VITE_MAPTILER_KEY: "k" }),
      ).toBe("unreachable");
      expect(
        await verifyCapability("scrolly", { REMOTION_MAPTILER_KEY: "k" }),
      ).toBe("unreachable");
    });
    expect(await verifyCapability("map-native", {})).toBe("rejected");
  });

  it("rejects a Cloudflare token supplied without its account id (the Pages call needs both)", async () => {
    expect(
      await verifyCapability("embed-cloudflare", {
        CLOUDFLARE_API_TOKEN: "tok",
      }),
    ).toBe("rejected");
  });
});

// Live proofs — opt-in, keyed. Real provider round-trips, no mocks (project convention). They
// followed their functions here from install/configurator-core.test.ts.
const MT = process.env.VITE_MAPTILER_KEY;
const DW = process.env.DATAWRAPPER_API_TOKEN;
const AN = process.env.ANTHROPIC_API_KEY;

test.skipIf(!MT)(
  "verifyMapTiler: true for the real key, false for a bad one",
  async () => {
    expect(await verifyMapTiler(MT!)).toBe(true);
    expect(await verifyMapTiler("not-a-real-key")).toBe(false);
  },
  60000, // real-API round-trips flake past the 5s default under gate contention
);

test.skipIf(!DW)(
  "verifyDatawrapper: true for the real token, false for a bad one",
  async () => {
    expect(await verifyDatawrapper(DW!)).toBe(true);
    expect(await verifyDatawrapper("not-a-real-token")).toBe(false);
  },
  60000,
);

test.skipIf(!AN)(
  "verifyAnthropic: true for the real key, false for a bad one",
  async () => {
    expect(await verifyAnthropic(AN!)).toBe(true);
    expect(await verifyAnthropic("sk-ant-not-real")).toBe(false);
  },
  60000,
);
