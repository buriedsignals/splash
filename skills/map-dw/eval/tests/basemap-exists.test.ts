import { describe, it, expect } from "bun:test";
import { KNOWN_BASEMAPS } from "../basemaps";

// Live integration check: every basemap in the allowlist actually exists on Datawrapper,
// and its declared map-key-attr keys are fetchable. Requires DATAWRAPPER_API_TOKEN.
// Keeps the pure scoreMapSpec gate network-free while still proving the allowlist is real.
const token = process.env.DATAWRAPPER_API_TOKEN;
const d = token ? describe : describe.skip;

d("basemap allowlist (live)", () => {
  for (const id of KNOWN_BASEMAPS) {
    it(`basemap "${id}" exists and exposes join keys`, async () => {
      const r = await fetch(`https://api.datawrapper.de/v3/basemaps/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(r.ok).toBe(true);
      const j = (await r.json()) as { meta?: { keys?: unknown[] } };
      expect(Array.isArray(j.meta?.keys)).toBe(true);
      expect((j.meta?.keys ?? []).length).toBeGreaterThan(0);
    }, 30000);
  }
});
