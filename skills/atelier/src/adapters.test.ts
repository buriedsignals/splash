import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realDispatch, withProposalChannel } from "./adapters.ts";
import type { AcceptedProposal } from "./producer-spec.ts";
import { deleteChart } from "../../dw-chart/src/datawrapper";

describe("withProposalChannel — the proposal's canonical channel is injected into the spec", () => {
  it("sets the channel on a spec that has none (suggest-chart's emitted MapSpec case)", () => {
    const spec: { title: string; channel?: string } = { title: "t" };
    expect(withProposalChannel(spec, "social-feed").channel).toBe(
      "social-feed",
    );
  });

  it("the proposal value WINS over a spec-level channel (proposal-first, like resolveGuardChannel)", () => {
    const spec = { title: "t", channel: "article-web" };
    expect(withProposalChannel(spec, "social-vertical").channel).toBe(
      "social-vertical",
    );
  });

  it("an absent proposal channel leaves the spec untouched (legacy spec-level channel survives)", () => {
    const spec = { title: "t", channel: "social-feed" };
    const out = withProposalChannel(spec, undefined);
    expect(out).toBe(spec);
    expect(out.channel).toBe("social-feed");
  });

  it("is pure — never mutates the accepted proposal's spec", () => {
    const spec = { title: "t", channel: "article-web" };
    withProposalChannel(spec, "social-feed");
    expect(spec.channel).toBe("article-web");
  });
});

// Same render-free IHDR probe map-dw's own floor uses: width/height as big-endian
// uint32 at bytes 16-19/20-23 (the file's dims, never the request's).
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Datawrapper chart ids are 5 alphanumerics; both publicUrl shapes
// (datawrapper.dwcdn.net/<id>/<v>/ and www.datawrapper.de/_/<id>/) carry it as a
// path segment. Used only to delete the throwaway live test chart.
function chartIdFromPublicUrl(publicUrl: string): string | undefined {
  return new URL(publicUrl).pathname
    .split("/")
    .find((seg) => /^[a-zA-Z0-9]{5}$/.test(seg));
}

// Live: exercises the REAL routed path (proposal → realDispatch → produceMap → DW
// export → IHDR floor). Requires DATAWRAPPER_API_TOKEN (worktree .env).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d(
  "realDispatch map-dw — the proposal's canonical channel reaches the producer (live)",
  () => {
    it("a social-feed proposal delivers a 1080x1080 PNG, not article-web's 1200x675", async () => {
      // The spec deliberately carries NO channel field — exactly what suggest-chart's
      // emitted-MapSpec template produces on the routed path. The proposal-level
      // channel (CADRAGE Q3, canonical) is the spine's truth and MUST reach produceMap,
      // which sizes AND render-size-verifies against spec.channel only.
      const p: AcceptedProposal = {
        id: "socialfeed-locator",
        producer: "map-dw",
        format: "static",
        channel: "social-feed",
        confirmedTakeaway:
          "Annemasse, Geneva and Chamonix marked along the Arve",
        spec: {
          mapType: "locator",
          title: "Three sites along the Arve valley",
          altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
          markers: [
            { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
            { lng: 6.1432, lat: 46.2044, label: "Geneva" },
            { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
          ],
          source: { name: "OpenStreetMap" },
        },
      };
      const outDir = join(tmpdir(), `atelier-adapters-live-${Date.now()}`);
      let publicUrl: string | undefined;
      try {
        const r = await realDispatch(p, outDir);
        if (r.status !== "produced")
          throw new Error(`dispatch ${r.status}: ${r.error ?? r.reason}`);
        publicUrl = r.publicUrl;
        const png = join(outDir, `${p.id}.png`);
        expect(existsSync(png)).toBe(true);
        // social-feed mediaSize is 1080x1080 (skills/atelier/src/channel.ts), ±2px —
        // the same tolerance the producer's own assertRenderedSize floor applies.
        const dims = pngSize(png);
        expect(Math.abs(dims.width - 1080)).toBeLessThanOrEqual(2);
        expect(Math.abs(dims.height - 1080)).toBeLessThanOrEqual(2);
      } finally {
        // throwaway live chart + outDir — cleaned even when the assertion fails (the
        // RED run publishes a wrongly-sized map; don't leak it).
        const id = publicUrl ? chartIdFromPublicUrl(publicUrl) : undefined;
        if (id) await deleteChart(id);
        rmSync(outDir, { recursive: true, force: true });
      }
    }, 120000);
  },
);
