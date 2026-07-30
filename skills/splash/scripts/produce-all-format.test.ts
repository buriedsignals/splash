// Task 4 (single-format-produce-export): produce-all reads the accepted proposal's
// pinned spec.format, gates it through assertFormatAllowed(channel, format) (fail hard
// on a disallowed pin — never a silent ship), and invokes the right producer with that
// ONE format — no more "all". This file focuses on the wiring Task 4 actually changed:
// the channel/format gate calling assertFormatAllowed, and the real per-producer
// dispatch (adapters.ts) threading spec.format through — including the dw-chart branch,
// which the pre-Task-4 code left unthreaded (always built "static" regardless of
// p.format). Loop mechanics (drop-proof, Gate 3 reset, GUARD 1, validation gate) are
// already covered by tests/produce-all.test.ts and are not re-tested here.
import { describe, it, expect, afterAll } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  produceAll,
  type Dispatch,
  type ProposalValidator,
} from "../src/produce-all";
import type { AcceptedProposal, VisualFormat } from "../src/producer-spec";
import { assertFormatAllowed, type Channel } from "../src/channel";
import { realDispatch } from "../src/adapters";

const proposal = (
  id: string,
  extra: Partial<AcceptedProposal> = {},
): AcceptedProposal => ({
  id,
  producer: "chart-native",
  format: "static",
  spec: {},
  confirmedTakeaway: "The confirmed takeaway for this fixture",
  ...extra,
});

// Loop-mechanics tests use dummy specs, so a pass-through validator exercises the
// format-threading/gate behavior in isolation from the validation gate.
const PASS: ProposalValidator = () => ({ ok: true, warnings: [] });

// Always-ready preflight injection: these tests exercise format threading, not the
// C2 engine-readiness gate (tests/preflight.test.ts owns that), so they must not
// depend on the machine's real env/keys.
const READY = () => [];

describe("produceAll — dispatch is invoked with the proposal's pinned spec.format", () => {
  const CASES: Array<{ channel: Channel; format: VisualFormat }> = [
    { channel: "article-web", format: "static" },
    { channel: "article-web", format: "interactive" },
    { channel: "article-web", format: "video" },
    { channel: "article-web", format: "scrolly" },
    { channel: "social-vertical", format: "video" },
    { channel: "social-feed", format: "static" },
  ];

  for (const { channel, format } of CASES) {
    it(`threads format "${format}" on channel "${channel}" straight into dispatch`, async () => {
      let received: VisualFormat | undefined;
      const dispatch: Dispatch = async (p) => {
        received = p.format;
        return { status: "produced" };
      };
      const { results } = await produceAll(
        [
          proposal("p1", {
            channel,
            format,
            producer: "scrolly" === format ? "scrolly" : "chart-native",
          }),
        ],
        "out",
        dispatch,
        PASS,
        null,
        READY,
      );
      expect(received).toBe(format);
      expect(results[0].format).toBe(format);
      expect(results[0].status).toBe("produced");
    });
  }
});

describe("produceAll — assertFormatAllowed fails hard on a disallowed format (dispatch never runs)", () => {
  it("assertFormatAllowed itself throws for a disallowed pair, and not for an allowed one", () => {
    expect(() => assertFormatAllowed("social-feed", "interactive")).toThrow();
    expect(() =>
      assertFormatAllowed("article-web", "interactive"),
    ).not.toThrow();
  });

  const DISALLOWED: Array<{ channel: Channel; format: VisualFormat }> = [
    { channel: "social-feed", format: "interactive" },
    // The scrolly-routing case: a scrolly-format proposal (producer "scrolly" itself,
    // matching reality — suggest-chart/suggest-article never emit chart-native/
    // map-native + format:"scrolly") must still be blocked by the channel gate BEFORE
    // it ever reaches the "scrolly" producer, on a channel that forbids it.
    { channel: "social-vertical", format: "scrolly" },
    { channel: "social-feed", format: "scrolly" },
  ];

  for (const { channel, format } of DISALLOWED) {
    it(`refuses format "${format}" on channel "${channel}" — never dispatched`, async () => {
      let dispatched = false;
      const dispatch: Dispatch = async () => {
        dispatched = true;
        return { status: "produced" };
      };
      const { results } = await produceAll(
        [proposal("p1", { channel, format, producer: "scrolly" })],
        "out",
        dispatch,
        PASS,
      );
      expect(dispatched).toBe(false);
      expect(results[0].status).toBe("failed");
      expect(results[0].error).toContain(format);
      expect(results[0].error).toContain(channel);
    });
  }
});

// realDispatch (adapters.ts) is the layer that ACTUALLY invokes each producer with the
// proposal's format. The file-based producers (chart-native/map-native/scrolly) are
// exercised via formatFlag's own unit tests (tests/adapters.test.ts) since a real
// dispatch shells out to a full Vite/Remotion build. dw-chart is a plain async call
// (produceChart) — cheap enough to exercise for real (project convention: no mocking
// external APIs — see dw-chart/tests/produce.test.ts's own real-API gating).
describe("realDispatch — dw-chart threads the proposal's format into produceChart", () => {
  it('fails hard, before any network call, when format is "video" (dw-chart cannot build it)', async () => {
    const outDir = mkdtempSync(join(tmpdir(), "splash-format-dwchart-video-"));
    const result = await realDispatch(
      proposal("p1", {
        producer: "dw-chart",
        format: "video",
        spec: {
          type: "d3-lines",
          title: "x",
          data: "a,b\n1,2",
          altInsight: "x",
        },
      }),
      outDir,
    );
    expect(result.status).toBe("failed");
    expect(result.error).toContain("video");
  });

  it('fails hard when format is "scrolly" (dw-chart cannot build it)', async () => {
    const outDir = mkdtempSync(
      join(tmpdir(), "splash-format-dwchart-scrolly-"),
    );
    const result = await realDispatch(
      proposal("p1", {
        producer: "dw-chart",
        format: "scrolly",
        spec: {
          type: "d3-lines",
          title: "x",
          data: "a,b\n1,2",
          altInsight: "x",
        },
      }),
      outDir,
    );
    expect(result.status).toBe("failed");
    expect(result.error).toContain("scrolly");
  });

  // Real Datawrapper API round-trip. Requires DATAWRAPPER_API_TOKEN; skipped without it
  // so a clean checkout / CI stays green (mirrors dw-chart/tests/produce.test.ts's own
  // gating).
  const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
  const d = hasToken ? describe : describe.skip;
  let createdChartId: string | undefined;

  d("with a real Datawrapper token", () => {
    it('builds the hosted embed alone — no pngPath/outputs — for format "interactive"', async () => {
      const outDir = mkdtempSync(
        join(tmpdir(), "splash-format-dwchart-interactive-"),
      );
      const result = await realDispatch(
        proposal("fmt-thread-check", {
          producer: "dw-chart",
          format: "interactive",
          spec: {
            type: "d3-lines",
            title: "Format-threading smoke test (produce-all-format.test.ts)",
            data: "year,value\n2020,1\n2021,2",
            altInsight: "value doubled from 2020 to 2021",
            source: { name: "sample data" },
          },
        }),
        outDir,
      );
      expect(result.status).toBe("produced");
      expect(result.actualProducer).toBe("dw-chart");
      expect(result.publicUrl).toContain("datawrapper");
      expect(result.outputs).toEqual([]);
      const m =
        result.publicUrl?.match(/datawrapper\.de\/_\/([^/]+)/) ??
        result.publicUrl?.match(/dwcdn\.net\/([^/]+)/);
      createdChartId = m?.[1];
    }, 60000);
  });

  afterAll(async () => {
    if (!createdChartId) return;
    try {
      const { deleteChart } = await import("../../dw-chart/src/datawrapper");
      await deleteChart(createdChartId);
    } catch {
      // best-effort cleanup — a failure here must not fail the suite
    }
  });
});
