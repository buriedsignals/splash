import { describe, it, expect } from "bun:test";
import { requestDelivery } from "./request-delivery";
import { provenanceHash, type RunElement, type RunManifest } from "./manifest";
import {
  DEFAULT_NEWSROOM_STATE,
  type CapabilityState,
} from "../newsroom/state";
import type { Decor } from "../newsroom/decor";
import type { VisualFormat } from "../core/vocabulary";

// Fixtures copied locally from lib/loop/deliver.test.ts's runWith/decorWith (test fixtures are
// not shared code in this repo — see task-8-brief.md).
function decorFixture(
  over: { capabilities?: Record<string, CapabilityState> } = {},
): Decor {
  return {
    root: "/nowhere",
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: over.capabilities ?? {},
    },
    language: { ui: "fr", content: "fr" },
    readiness: [],
    profile: { lang: "fr" },
  };
}

function runFixtureWithFormat(format: VisualFormat): {
  run: RunManifest;
  el: RunElement;
} {
  const base: RunManifest = {
    runId: "r1",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
        proposal: {
          options: [{ id: "o1", nativeType: "line", why: "w", format }],
          excluded: [],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const partial = base.elements[0]!;
  const full: RunElement = {
    ...partial,
    artifact: {
      path: "elements/e1/static.png",
      sha256: "d",
      provenanceHash: provenanceHash(base, partial),
      producedAt: "1980-01-01T00:00:00.000Z",
    },
  };
  return { run: { ...base, elements: [full] }, el: full };
}

function staticRunFixture() {
  return runFixtureWithFormat("static");
}

function interactiveRunFixture() {
  return runFixtureWithFormat("interactive");
}

describe("requestDelivery", () => {
  it("should default a static element to the portable package", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), { env: {} });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "zip",
    ]);
  });

  it("should default an interactive element to a ready host", () => {
    const { run, el } = interactiveRunFixture();
    const decor = decorFixture({
      capabilities: { "embed-cloudflare": { enabled: true } },
    });
    const r = requestDelivery(run, el, decor, {
      env: {
        CLOUDFLARE_API_TOKEN: "t",
        CLOUDFLARE_ACCOUNT_ID: "a",
        // The brief's own draft named this CLOUDFLARE_PAGES_PROJECT, but the capability
        // actually declared in lib/newsroom/capabilities.ts (and read by
        // lib/delivery/adapters/cloudflare-pages.ts) is SPLASH_EMBED_PROJECT — a typo in the
        // brief, not a second env var: fixed here so the fixture makes embed-cloudflare
        // genuinely ready, which is the point of this test.
        SPLASH_EMBED_PROJECT: "p",
      },
    });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "embed-cloudflare",
    ]);
  });

  it("should honour a destination the journalist names, without deriving one", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), {
      destinations: ["embed-s3"],
      env: {},
    });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "embed-s3",
    ]);
  });

  it("should refuse a destination this install does not know", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), {
      destinations: ["embed-dropbox"],
      env: {},
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("embed-dropbox");
  });

  it("should refuse before anything is produced", () => {
    const { run, el } = staticRunFixture();
    const { artifact: _none, ...noArtifact } = el;
    const r = requestDelivery(run, noArtifact as RunElement, decorFixture(), {
      env: {},
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should keep delivered records already on the element", () => {
    const { run, el } = staticRunFixture();
    const withHistory = {
      ...el,
      delivery: {
        requested: [],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            publishedAt: "1980-01-01T12:00:00.000Z",
            deliveredProvenanceHash: "old",
          },
        ],
      },
    };
    const r = requestDelivery(run, withHistory, decorFixture(), { env: {} });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.delivered.length).toBe(
      1,
    );
  });
});
