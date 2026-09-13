import { describe, expect, it } from "bun:test";
import {
  startMapTilerProxy,
  stripKey,
  upstreamUrlFor,
} from "../scripts/maptiler-proxy.mjs";

const K = "abc123SECRET";
const ORIGIN = "http://127.0.0.1:4321";

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
