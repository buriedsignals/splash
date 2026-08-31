import { describe, it, expect } from "bun:test";
import {
  probeMapTiler,
  probeDatawrapper,
  probeCloudflare,
  resolveEnvKey,
} from "../scripts/keys.mjs";

describe("resolveEnvKey — canonical name first, then the engine's own aliases", () => {
  it("should read the canonical MAPTILER_KEY when set", () => {
    expect(resolveEnvKey({ MAPTILER_KEY: "canonical" }, "MAPTILER_KEY")).toBe(
      "canonical",
    );
  });

  it("should fall back to MAPTILER_API_KEY, the engine's own name, when MAPTILER_KEY is absent", () => {
    expect(resolveEnvKey({ MAPTILER_API_KEY: "engine" }, "MAPTILER_KEY")).toBe(
      "engine",
    );
  });

  it("should fall back to REMOTION_MAPTILER_KEY, the engine's own name, when MAPTILER_KEY is absent", () => {
    expect(
      resolveEnvKey({ REMOTION_MAPTILER_KEY: "engine" }, "MAPTILER_KEY"),
    ).toBe("engine");
  });

  it("should fall back to VITE_MAPTILER_KEY, the engine's own name, when MAPTILER_KEY is absent", () => {
    expect(resolveEnvKey({ VITE_MAPTILER_KEY: "engine" }, "MAPTILER_KEY")).toBe(
      "engine",
    );
  });

  it("should prefer the canonical name over an alias when both are set", () => {
    expect(
      resolveEnvKey(
        { MAPTILER_KEY: "canonical", VITE_MAPTILER_KEY: "engine" },
        "MAPTILER_KEY",
      ),
    ).toBe("canonical");
  });

  it("should read the canonical DATAWRAPPER_TOKEN when set", () => {
    expect(
      resolveEnvKey({ DATAWRAPPER_TOKEN: "canonical" }, "DATAWRAPPER_TOKEN"),
    ).toBe("canonical");
  });

  it("should fall back to DATAWRAPPER_API_TOKEN, the engine's own name, when DATAWRAPPER_TOKEN is absent", () => {
    expect(
      resolveEnvKey({ DATAWRAPPER_API_TOKEN: "engine" }, "DATAWRAPPER_TOKEN"),
    ).toBe("engine");
  });

  it("should return an empty string when neither the canonical name nor any alias is set", () => {
    expect(resolveEnvKey({}, "MAPTILER_KEY")).toBe("");
  });

  it("should return an empty string for a name with no declared aliases at all, when it is itself absent from env", () => {
    expect(resolveEnvKey({ MAPTILER_KEY: "x" }, "SOME_OTHER_VAR")).toBe("");
  });
});

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

  it("should send the key in the request URL, not silently drop it", async () => {
    let capturedUrl = "";
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response("{}", { status: 200 });
    };
    await probeMapTiler("secret-key-123", fetchFn);
    expect(capturedUrl).toContain("secret-key-123");
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

  it("should send the bearer token in the Authorization header, not silently drop it", async () => {
    let capturedInit;
    const fetchFn = async (url, init) => {
      capturedInit = init;
      return new Response("{}", { status: 200 });
    };
    await probeDatawrapper("secret-token-456", fetchFn);
    expect(capturedInit?.headers?.Authorization).toBe(
      "Bearer secret-token-456",
    );
  });
});

describe("probeCloudflare", () => {
  it("should report ok when the account endpoint answers 200", async () => {
    const fetchFn = async () => new Response("{}", { status: 200 });
    const result = await probeCloudflare("account-id", "api-token", fetchFn);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("should report not ok when the account ID is absent", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response("", { status: 200 });
    };
    const result = await probeCloudflare("", "api-token", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(called).toBe(false);
  });

  it("should report not ok when the API token is absent", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response("", { status: 200 });
    };
    const result = await probeCloudflare("account-id", "", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("CLOUDFLARE_API_TOKEN");
    expect(called).toBe(false);
  });

  it("should report not ok when credentials are rejected", async () => {
    const fetchFn = async () => new Response("Unauthorized", { status: 403 });
    const result = await probeCloudflare(
      "stale-account",
      "stale-token",
      fetchFn,
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.detail).toContain("403");
  });

  it("should send the bearer token in the Authorization header", async () => {
    let capturedInit;
    const fetchFn = async (url, init) => {
      capturedInit = init;
      return new Response("{}", { status: 200 });
    };
    await probeCloudflare("account-123", "secret-token-xyz", fetchFn);
    expect(capturedInit?.headers?.Authorization).toBe(
      "Bearer secret-token-xyz",
    );
  });

  it("should include the account ID in the request URL", async () => {
    let capturedUrl = "";
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response("{}", { status: 200 });
    };
    await probeCloudflare("account-123", "token", fetchFn);
    expect(capturedUrl).toContain("account-123");
  });

  it("should report not ok when the network throws", async () => {
    const fetchFn = async () => {
      throw new Error("ECONNREFUSED");
    };
    const result = await probeCloudflare("account-id", "api-token", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(null);
    expect(result.detail).toContain("ECONNREFUSED");
  });
});

describe("probeMapTiler against the real endpoint", () => {
  const key = process.env.MAPTILER_KEY ?? "";
  if (!key) {
    console.log(
      "Skipping real MapTiler probe: MAPTILER_KEY is not set in the environment.",
    );
  }

  it.skipIf(!key)(
    "should return a concrete verdict using the key in the environment",
    async () => {
      const result = await probeMapTiler(key, fetch);
      expect(typeof result.ok).toBe("boolean");
      expect(result.status).not.toBe(null);
      expect(result.detail.length).toBeGreaterThan(0);
      console.log(
        `MapTiler verdict: ok=${result.ok} status=${result.status} — ${result.detail}`,
      );
    },
  );
});

