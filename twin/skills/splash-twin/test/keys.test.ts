import { describe, it, expect } from "bun:test";
import { probeMapTiler, probeDatawrapper } from "../scripts/keys.mjs";

describe("probeMapTiler", () => {
  it("should report ok when the tiles endpoint answers 200", async () => {
    const fetchFn = async () => new Response("{}", { status: 200 });
    const result = await probeMapTiler("any-key", fetchFn);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("should report not ok with the status when the key is rejected", async () => {
    const fetchFn = async () => new Response("Invalid key", { status: 403 });
    const result = await probeMapTiler("stale-key", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.detail).toContain("403");
  });

  it("should report not ok when the key is absent, without calling the network", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response("", { status: 200 });
    };
    const result = await probeMapTiler("", fetchFn);
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("should report not ok when the network throws", async () => {
    const fetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    const result = await probeMapTiler("any-key", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(null);
    expect(result.detail).toContain("ENOTFOUND");
  });
});

describe("probeDatawrapper", () => {
  it("should report ok when /v3/me answers 200", async () => {
    const fetchFn = async () => new Response("{}", { status: 200 });
    expect((await probeDatawrapper("token", fetchFn)).ok).toBe(true);
  });

  it("should report not ok on 401", async () => {
    const fetchFn = async () => new Response("", { status: 401 });
    const result = await probeDatawrapper("token", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe("probeMapTiler against the real endpoint", () => {
  it("should return a concrete verdict using the key in the environment", async () => {
    const result = await probeMapTiler(process.env.MAPTILER_KEY ?? "", fetch);
    expect(typeof result.ok).toBe("boolean");
    expect(result.detail.length).toBeGreaterThan(0);
    console.log(
      `MapTiler verdict: ok=${result.ok} status=${result.status} — ${result.detail}`,
    );
  });
});
