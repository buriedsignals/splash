import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  startMapTilerProxy,
  stripKey,
  upstreamUrlFor,
} from "../scripts/maptiler-proxy.mjs";

const K = "abc123SECRET";
const ORIGIN = "http://127.0.0.1:4321";

function fixtureUpstream(
  bodies: Record<string, string | Uint8Array>,
  status = 200,
) {
  let hits = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      hits++;
      const body = bodies[new URL(req.url).pathname];
      if (body === undefined || status !== 200)
        return new Response("no", { status: status === 200 ? 404 : status });
      return new Response(body, {
        headers: {
          "content-type":
            typeof body === "string"
              ? "application/json"
              : "application/x-protobuf",
        },
      });
    },
  });
  return {
    origin: `http://127.0.0.1:${server.port}`,
    stop: () => server.stop(true),
    get hits() {
      return hits;
    },
  };
}

describe("stripKey", () => {
  it("should route MapTiler URLs through the proxy", () => {
    expect(
      stripKey(`"https://api.maptiler.com/tiles/v3/{z}.pbf"`, K, ORIGIN),
    ).toBe(`"${ORIGIN}/maptiler/tiles/v3/{z}.pbf"`);
  });
  it("should remove the key when it is the only parameter", () => {
    expect(
      stripKey(`https://api.maptiler.com/a.json?key=${K}`, K, ORIGIN),
    ).toBe(`${ORIGIN}/maptiler/a.json`);
  });
  it("should remove the key when it is followed by another parameter", () => {
    expect(
      stripKey(`https://api.maptiler.com/a.json?key=${K}&mtsid=1`, K, ORIGIN),
    ).toBe(`${ORIGIN}/maptiler/a.json?mtsid=1`);
  });
  it("should remove the key when it follows another parameter", () => {
    expect(
      stripKey(`https://api.maptiler.com/a.json?mtsid=1&key=${K}`, K, ORIGIN),
    ).toBe(`${ORIGIN}/maptiler/a.json?mtsid=1`);
  });
  it("should strip a bare occurrence of the key outside the key= pattern", () => {
    expect(stripKey(`error: bad key ${K}`, K, ORIGIN)).toBe("error: bad key ");
  });
  it("should strip a percent-encoded occurrence of the key", () => {
    const encodedKey = "abc%2F123%2BSECRET";
    const rawKey = "abc/123+SECRET";
    expect(stripKey(`redirect=key%3D${encodedKey}`, rawKey, ORIGIN)).toBe(
      "redirect=key%3D",
    );
  });
});

describe("upstreamUrlFor", () => {
  it("should refuse a path outside /maptiler/", () => {
    expect(upstreamUrlFor(new URL(`${ORIGIN}/etc/passwd`), K)).toBeNull();
  });
  it("should forward to api.maptiler.com only, with the key added and a caller's key dropped", () => {
    const url = upstreamUrlFor(
      new URL(`${ORIGIN}/maptiler/maps/x/style.json?key=evil&a=1`),
      K,
    )!;
    expect([
      url.origin,
      url.pathname,
      url.searchParams.get("key"),
      url.searchParams.get("a"),
    ]).toEqual(["https://api.maptiler.com", "/maps/x/style.json", K, "1"]);
  });
});

describe("startMapTilerProxy", () => {
  it("should bind to 127.0.0.1 and refuse a path outside /maptiler/, without touching the network", async () => {
    const proxy = startMapTilerProxy({ key: K });
    try {
      expect(new URL(proxy.origin).hostname).toBe("127.0.0.1");
      const res = await fetch(`${proxy.origin}/etc/passwd`);
      expect(res.status).toBe(404);
    } finally {
      proxy.stop();
    }
  });

  it("should carry CORS on the 404 for a path outside /maptiler/", async () => {
    const proxy = startMapTilerProxy({ key: K });
    try {
      const res = await fetch(`${proxy.origin}/etc/passwd`);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    } finally {
      proxy.stop();
    }
  });

  it("should strip the key from a non-JSON text body", async () => {
    // A local fixture upstream, not an external API: it stands in for a MapTiler error page that
    // happens to echo the request URL as plain text.
    const fake = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch() {
        return new Response(`error at https://api.maptiler.com/x?key=${K}`, {
          headers: { "content-type": "text/plain" },
        });
      },
    });
    const proxy = startMapTilerProxy({
      key: K,
      upstreamBase: `http://${fake.hostname}:${fake.port}`,
    });
    try {
      const res = await fetch(`${proxy.origin}/maptiler/x.json`);
      const text = await res.text();
      expect(text).not.toContain(K);
      expect(text).toBe(`error at ${proxy.origin}/maptiler/x`);
    } finally {
      proxy.stop();
      fake.stop(true);
    }
  });

  it("should return 502 and never let the key reach stdout/stderr when upstream is unreachable", async () => {
    const modulePath = new URL("../scripts/maptiler-proxy.mjs", import.meta.url)
      .href;
    const script = [
      `import { startMapTilerProxy } from ${JSON.stringify(modulePath)};`,
      `const proxy = startMapTilerProxy({ key: ${JSON.stringify(K)}, upstreamBase: "http://127.0.0.1:9" });`,
      `const res = await fetch(\`\${proxy.origin}/maptiler/x.json\`);`,
      `console.log("STATUS", res.status);`,
      `proxy.stop();`,
    ].join("\n");
    const proc = Bun.spawn(["bun", "-e", script], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    const combined = stdout + stderr;
    expect(combined).toContain("STATUS 502");
    expect(combined).not.toContain(K);
  });
});

describe("the proxy's tile cache", () => {
  it("should answer a second identical request from disk without reaching the upstream", async () => {
    const upstream = fixtureUpstream({
      "/tiles/countries/1/1/1.pbf": new Uint8Array([1, 2, 3]),
    });
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const proxy = startMapTilerProxy({
      key: "SECRET123",
      upstreamBase: upstream.origin,
      cacheDir,
    });
    try {
      for (let i = 0; i < 2; i++)
        expect(
          new Uint8Array(
            await (
              await fetch(`${proxy.origin}/maptiler/tiles/countries/1/1/1.pbf`)
            ).arrayBuffer(),
          ),
        ).toEqual(new Uint8Array([1, 2, 3]));
      expect(upstream.hits).toBe(1);
      expect(proxy.counts["cache hit"]).toBe(1);
    } finally {
      proxy.stop();
      upstream.stop();
    }
  });

  it("should never write the key into a cached file, and serve a cached style at a new proxy's origin", async () => {
    const upstream = fixtureUpstream({
      "/maps/dataviz/style.json": JSON.stringify({
        glyphs:
          "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=SECRET123",
      }),
    });
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const first = startMapTilerProxy({
      key: "SECRET123",
      upstreamBase: upstream.origin,
      cacheDir,
    });
    await (
      await fetch(`${first.origin}/maptiler/maps/dataviz/style.json`)
    ).text();
    first.stop();
    for (const f of readdirSync(cacheDir))
      expect(readFileSync(join(cacheDir, f), "latin1")).not.toContain(
        "SECRET123",
      );
    const second = startMapTilerProxy({
      key: "SECRET123",
      upstreamBase: upstream.origin,
      cacheDir,
    });
    try {
      const doc = await (
        await fetch(`${second.origin}/maptiler/maps/dataviz/style.json`)
      ).json();
      expect(doc.glyphs).toBe(
        `${second.origin}/maptiler/fonts/{fontstack}/{range}.pbf`,
      );
      expect(upstream.hits).toBe(1);
    } finally {
      second.stop();
      upstream.stop();
    }
  });

  it("should not cache an upstream error", async () => {
    const upstream = fixtureUpstream({}, 503);
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const proxy = startMapTilerProxy({
      key: "SECRET123",
      upstreamBase: upstream.origin,
      cacheDir,
    });
    try {
      await fetch(`${proxy.origin}/maptiler/tiles/x.pbf`);
      expect(readdirSync(cacheDir)).toEqual([]);
    } finally {
      proxy.stop();
      upstream.stop();
    }
  });
});
