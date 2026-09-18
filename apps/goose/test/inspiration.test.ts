import { describe, it, expect } from "bun:test";
import { createInspirationService, NAVIGATOR_KEY_ID } from "../inspiration.mjs";

const ANON = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 5, remaining: 4, resetsAt: null },
};
const ACCOUNT = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 10, remaining: 9, resetsAt: null },
};

function recorder(answer) {
  const calls: any[] = [];
  const searchFn = async (options) => {
    calls.push(options);
    return typeof answer === "function" ? answer(options, calls.length) : answer;
  };
  return { calls, searchFn };
}

describe("createInspirationService", () => {
  it("should name the variable Engine hands the server", () => {
    expect(NAVIGATOR_KEY_ID).toBe("OSINT_NAV_API_KEY");
  });

  it("should search anonymously without a key", async () => {
    const { calls, searchFn } = recorder(ANON);
    const service = createInspirationService({ token: undefined, searchFn });
    expect(await service.search("floods")).toEqual(ANON);
    expect(calls).toEqual([{ query: "floods" }]);
  });

  it("should treat a blank key as no key", async () => {
    const { calls, searchFn } = recorder(ANON);
    const service = createInspirationService({ token: "   ", searchFn });
    await service.search("floods");
    expect(calls).toEqual([{ query: "floods" }]);
  });

  it("should search once with the key as the token", async () => {
    const { calls, searchFn } = recorder(ACCOUNT);
    const service = createInspirationService({ token: " on_key123 ", searchFn });
    expect(await service.search("floods")).toEqual(ACCOUNT);
    expect(calls).toEqual([{ query: "floods", token: "on_key123" }]);
  });

  it("should run exactly one anonymous search when the key is refused, and say so", async () => {
    const { calls, searchFn } = recorder((options) =>
      options.token ? { ok: false, reason: "invalid-token" } : ANON,
    );
    const service = createInspirationService({ token: "on_expired", searchFn });
    expect(await service.search("floods")).toEqual({ ...ANON, accountNeedsReconnect: true });
    expect(calls).toEqual([{ query: "floods", token: "on_expired" }, { query: "floods" }]);
  });

  it("should not search again for any other failure", async () => {
    const limit = {
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 10, remaining: 0, resetsAt: null },
    };
    const { calls, searchFn } = recorder(limit);
    const service = createInspirationService({ token: "on_key", searchFn });
    expect(await service.search("floods")).toEqual(limit);
    expect(calls).toHaveLength(1);
  });

  it("should read the key from the server's environment by default", async () => {
    const { calls, searchFn } = recorder(ACCOUNT);
    const previous = process.env[NAVIGATOR_KEY_ID];
    process.env[NAVIGATOR_KEY_ID] = "on_fromenv";
    try {
      const service = createInspirationService({ searchFn });
      await service.search("floods");
    } finally {
      if (previous === undefined) delete process.env[NAVIGATOR_KEY_ID];
      else process.env[NAVIGATOR_KEY_ID] = previous;
    }
    expect(calls).toEqual([{ query: "floods", token: "on_fromenv" }]);
  });

  it("should format with the skill's own words", () => {
    const service = createInspirationService({ token: undefined, searchFn: async () => ANON });
    expect(service.format({ ok: false, reason: "invalid-token" })).toBe(
      "Your Navigator account needs reconnecting: Indicator Labs → Connected services → Navigator → Connect.",
    );
  });
});
