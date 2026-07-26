import { describe, it, expect, beforeEach } from "bun:test";
import { join } from "node:path";
import { PUBLISHERS_REGISTERED, registerAllPublishers } from "./index";
import {
  lookupPublisher,
  allPublishers,
  registerPublisher,
  resetPublishersForTest,
  type Publisher,
} from "../core/publishers";
import { fail } from "../core/verbs/types";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";

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

  it("should register the publishers this install ships", () => {
    expect(
      allPublishers()
        .map((p) => p.id)
        .sort(),
    ).toEqual(["embed-cloudflare", "embed-s3", "zip"]);
  });

  it("should expose the cloudflare adapter as a hosted publisher", () => {
    const p = lookupPublisher("embed-cloudflare");
    expect(p).toMatchObject({ kind: "hosted", implemented: true });
  });

  // The composition root runs as a module-level side effect, so anything it throws kills the
  // module body BEFORE `PUBLISHERS_REGISTERED` is initialised — leaving that binding
  // permanently in the temporal dead zone, and turning lib/loop/deliver.ts's very first
  // statement (the guard written to prove the registry loaded) into a ReferenceError inside a
  // step that documents that it never throws. Registration must therefore be idempotent, not
  // fatal, whatever a caller left in the global registry first.
  it("survives an id another caller already claimed, instead of throwing", () => {
    const squatter: Publisher = {
      id: "zip",
      kind: "package",
      implemented: true,
      publish: async () => fail("engine-failed", "stub"),
    };
    resetPublishersForTest();
    registerPublisher(squatter);
    expect(() => registerAllPublishers()).not.toThrow();
    // The claimed id keeps its owner (first registration wins, no silent shadowing), and
    // every other adapter is still dispatchable.
    expect(lookupPublisher("zip")).toBe(squatter);
    expect(lookupPublisher("embed-cloudflare")).toBeDefined();
  });

  it("still initialises PUBLISHERS_REGISTERED when the root is evaluated after a collision", () => {
    // The in-process test above cannot reproduce the module-body failure: this file imports
    // the root statically, so it is already evaluated by the time any test runs. A fresh
    // process is the only honest reproduction of the file-ordering hazard — the collision is
    // registered BEFORE the root is first evaluated, exactly as a test file that leaves a stub
    // behind does to whatever file bun runs next.
    const root = join(import.meta.dir, "..", "..");
    const program = `
      import { registerPublisher } from ${JSON.stringify(join(root, "lib/core/publishers.ts"))};
      registerPublisher({ id: "zip", kind: "package", implemented: true,
        publish: async () => ({ ok: false, code: "engine-failed", message: "stub" }) });
      const { PUBLISHERS_REGISTERED } = await import(${JSON.stringify(join(root, "lib/delivery/index.ts"))});
      const { deliver } = await import(${JSON.stringify(join(root, "lib/loop/deliver.ts"))});
      const result = await deliver(
        { runId: "r", schemaVersion: 3, input: {}, elements: [], events: [] },
        { id: "e1" },
        ${JSON.stringify(root)},
        { root: ${JSON.stringify(root)}, state: { capabilities: {} }, language: { ui: "en", content: "en" }, readiness: [] },
      );
      console.log(JSON.stringify({ registered: PUBLISHERS_REGISTERED, result }));
    `;
    const proc = Bun.spawnSync(["bun", "-e", program], { cwd: root });
    const out = proc.stdout.toString().trim().split("\n").at(-1) ?? "";
    expect({
      status: proc.exitCode,
      stderr: proc.stderr.toString(),
    }).toMatchObject({
      status: 0,
    });
    // A bounded refusal, never a ReferenceError: the registry loaded, and deliver answered
    // with data even though the process started with the id already taken.
    expect(JSON.parse(out)).toMatchObject({
      registered: true,
      result: { ok: false, code: "invalid-request" },
    });
  });

  // Two declarations of "is this destination usable": the publisher registry (this file) and
  // NEWSROOM_CAPABILITIES (the decor's declarative model). Nothing else locks them together —
  // a disagreement would make readiness answer "ready" for a destination the publish verb
  // still answers "not-implemented" for. Read-only: it only reads both registries, so it needs
  // no afterAll to restore shared state.
  it("agrees with NEWSROOM_CAPABILITIES on `implemented` for every registered publisher", () => {
    for (const publisher of allPublishers()) {
      const capability = NEWSROOM_CAPABILITIES[publisher.id];
      expect(capability).toBeDefined();
      expect(capability!.implemented).toBe(publisher.implemented);
    }
  });

  it("should refuse to deploy without credentials, before opening a socket", async () => {
    const p = lookupPublisher("embed-cloudflare")!;
    const r = await p.publish({
      artifactPath: import.meta.path,
      id: "e1",
      format: "interactive",
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
