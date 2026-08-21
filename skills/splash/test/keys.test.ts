import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  probeMapTiler,
  probeDatawrapper,
  probeCloudflare,
  recordKey,
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

// The one code path in this toolchain that accepts a key FROM A JOURNALIST. Before it existed,
// preflight reported a closed capability accurately and there was nowhere for an answer to go.
describe("recordKey — one key, into the root .env, and nowhere else", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "recordkey-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const envText = () => readFile(join(root, ".env"), "utf8");

  it("should create a .env that did not exist", async () => {
    await recordKey({ root, name: "MAPTILER_KEY", value: "abc123" });
    expect(await envText()).toBe("MAPTILER_KEY=abc123\n");
  });

  it("should append beside keys that are already there", async () => {
    await writeFile(join(root, ".env"), "DATAWRAPPER_TOKEN=tok\n");
    await recordKey({ root, name: "MAPTILER_KEY", value: "abc123" });
    const text = await envText();
    expect(text).toContain("DATAWRAPPER_TOKEN=tok");
    expect(text).toContain("MAPTILER_KEY=abc123");
  });

  it("should append to a file with no trailing newline without joining two keys onto one line", async () => {
    await writeFile(join(root, ".env"), "DATAWRAPPER_TOKEN=tok");
    await recordKey({ root, name: "MAPTILER_KEY", value: "abc123" });
    expect(await envText()).toBe("DATAWRAPPER_TOKEN=tok\nMAPTILER_KEY=abc123\n");
  });

  // The case that matters, because a duplicate line is worse than a wrong one: a journalist who
  // pastes a corrected key must not leave the stale one below it, where the next reader cannot
  // tell which is live.
  it("should REPLACE an existing line for the same key rather than appending a second", async () => {
    await writeFile(join(root, ".env"), "MAPTILER_KEY=stale\nDATAWRAPPER_TOKEN=tok\n");
    await recordKey({ root, name: "MAPTILER_KEY", value: "fresh" });
    const text = await envText();
    expect(text.match(/MAPTILER_KEY=/g)).toHaveLength(1);
    expect(text).toContain("MAPTILER_KEY=fresh");
    expect(text).not.toContain("stale");
    expect(text).toContain("DATAWRAPPER_TOKEN=tok");
  });

  // And the case the whole seam exists for: the key a journalist just gave is the key the next
  // probe reads. A recordKey that wrote somewhere nothing reads would look identical from here.
  it("should be read back by resolveEnvKey once the .env is loaded", async () => {
    await recordKey({ root, name: "DATAWRAPPER_TOKEN", value: "fresh-token" });
    const loaded: Record<string, string> = {};
    for (const line of (await envText()).split("\n")) {
      const pair = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (pair) loaded[pair[1]] = pair[2];
    }
    expect(resolveEnvKey(loaded, "DATAWRAPPER_TOKEN")).toBe("fresh-token");
  });

  it("should refuse a name this toolchain does not read, so nothing pasted can set an arbitrary variable", async () => {
    await expect(
      recordKey({ root, name: "PATH", value: "/tmp" }),
    ).rejects.toThrow(/not a key this toolchain reads/);
    // An alias is refused too: the canonical name is what resolveEnvKey reads first.
    await expect(
      recordKey({ root, name: "MAPTILER_API_KEY", value: "x" }),
    ).rejects.toThrow(/not a key this toolchain reads/);
  });

  it("should refuse an empty value and a value carrying a line break", async () => {
    await expect(
      recordKey({ root, name: "MAPTILER_KEY", value: "   " }),
    ).rejects.toThrow(/no value/);
    await expect(
      recordKey({ root, name: "MAPTILER_KEY", value: "abc\nPATH=/tmp" }),
    ).rejects.toThrow(/line break/);
  });

  it("should return nothing, so the value is never echoed back to a caller that might print it", async () => {
    expect(await recordKey({ root, name: "MAPTILER_KEY", value: "abc123" })).toBeUndefined();
  });
});

// FINDING 20 (stress round four): a capability was reported CLOSED for a reason that was not about
// the capability. `runPreflight` declared `fetchFn` as a required argument and defaulted nothing,
// so calling it the obvious way — `runPreflight({ root, env })` — made `fetchFn(url, init)` throw
// inside `probe`, which caught it and folded the message into the capability's own reason:
//
//   MapTiler threw: fetchFn is not a function. (In 'fetchFn(url, init)', 'fetchFn' is undefined)
//
// A journalist reads that as "MapTiler is down". With a real `fetch` passed in, on the same
// machine, at the same moment: map 200, datawrapper 200, hostedEmbed 403. Every capability the
// toolchain has, reported shut, by an argument the caller forgot.
//
// Two answers, and both are needed. The probe DEFAULTS to the platform's own `fetch`, because
// there is a correct one and refusing to use it helps nobody. And a caller who passes something
// that is not a function is REFUSED by name rather than having it disguised as a dead provider —
// a mistake in the call is not evidence about MapTiler.
describe("a probe never reports a capability closed for a reason that is not about the capability", () => {
  it("should use the platform's own fetch when no fetchFn is passed", async () => {
    const seen = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      seen.push(String(url));
      return { ok: true, status: 200 };
    };
    try {
      const result = await probeMapTiler("a-key");
      expect(result.ok).toBe(true);
      expect(result.detail).toBe("MapTiler answered 200");
      expect(seen.length).toBe(1);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("should refuse a fetchFn that is not callable, by name, rather than blaming the provider", async () => {
    const result = await probeMapTiler("a-key", "not a function").catch((error) => error);
    expect(result instanceof Error).toBe(true);
    expect(result.message).toMatch(/fetchFn/);
    expect(result.message).not.toMatch(/MapTiler answered|MapTiler threw/);
  });

  it("should say the same for Datawrapper and Cloudflare, which share the probe", async () => {
    const dw = await probeDatawrapper("a-token", 42).catch((error) => error);
    expect(dw instanceof Error).toBe(true);
    expect(dw.message).toMatch(/fetchFn/);
    const cf = await probeCloudflare("account", "token", 42).catch((error) => error);
    expect(cf instanceof Error).toBe(true);
    expect(cf.message).toMatch(/fetchFn/);
  });
});
