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
});
