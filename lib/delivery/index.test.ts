import { describe, it, expect, beforeEach } from "bun:test";
import { PUBLISHERS_REGISTERED, registerAllPublishers } from "./index";
import {
  lookupPublisher,
  allPublishers,
  resetPublishersForTest,
} from "../core/publishers";

// The registry is global and bun test shares one process: any earlier file that reset it
// would leave this one empty, because module caching means the root's side effect never runs
// twice. Resetting and re-registering here makes this file independent of test file order.
beforeEach(() => {
  resetPublishersForTest();
  registerAllPublishers();
});

describe("the delivery composition root", () => {
  it("should be load-bearing rather than a bare side-effect import", () => {
    expect(PUBLISHERS_REGISTERED).toBe(true);
  });

  it("should register the two publishers L1 ships", () => {
    expect(
      allPublishers()
        .map((p) => p.id)
        .sort(),
    ).toEqual(["embed-cloudflare", "zip"]);
  });

  it("should expose the cloudflare adapter as a hosted publisher", () => {
    const p = lookupPublisher("embed-cloudflare");
    expect(p).toMatchObject({ kind: "hosted", implemented: true });
  });

  it("should refuse to deploy without credentials, before opening a socket", async () => {
    const p = lookupPublisher("embed-cloudflare")!;
    const r = await p.publish({
      artifactPath: import.meta.path,
      id: "e1",
      metadata: {
        title: "T",
        altText: "A",
        source: "S",
        credit: "C",
        lang: "en",
      },
      settings: { publisherId: "embed-cloudflare" },
      credentials: {},
      outDir: "/nonexistent",
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain(
      "CLOUDFLARE_API_TOKEN",
    );
  });
});
