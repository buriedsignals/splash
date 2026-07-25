import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deliver } from "./deliver";
import { provenanceHash, type RunElement, type RunManifest } from "./manifest";
import { neutralDecor, type Decor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { registerAllPublishers } from "../delivery";
import { resetPublishersForTest } from "../core/publishers";

let runDir: string;

beforeEach(() => {
  // bun test shares one process, and lib/core/verbs/publish.test.ts resets the global
  // registry: re-register here so this file does not depend on test file order.
  resetPublishersForTest();
  registerAllPublishers();
  runDir = mkdtempSync(join(tmpdir(), "splash-deliver-"));
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "not-a-png");
});
afterEach(() => rmSync(runDir, { recursive: true, force: true }));

function decorWith(over: Partial<Decor> = {}): Decor {
  return {
    ...neutralDecor(),
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { zip: { enabled: true } },
    },
    ...over,
  };
}

function runWith(el: Partial<RunElement>): {
  run: RunManifest;
  el: RunElement;
} {
  const base: RunManifest = {
    runId: "r1",
    schemaVersion: 3,
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
          options: [{ id: "o1", nativeType: "line", why: "w" }],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const partial = { ...base.elements[0]!, ...el };
  const full: RunElement = {
    ...partial,
    artifact: partial.artifact ?? {
      path: "elements/e1/static.png",
      sha256: "d",
      provenanceHash: provenanceHash(base, partial),
      producedAt: "1980-01-01T00:00:00.000Z",
    },
  };
  return { run: { ...base, elements: [full] }, el: full };
}

describe("deliver", () => {
  it("should record an outcome carrying the current provenance", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const r = await deliver(run, el, runDir, decorWith());
    expect(r.ok).toBe(true);
    const rec = (r as { value: RunElement }).value.delivery!.delivered[0]!;
    expect(rec).toMatchObject({ publisherId: "zip", kind: "package" });
    expect(rec.deliveredProvenanceHash).toBe(provenanceHash(run, el));
  });

  it("should refuse to publish a stale artifact", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const revised: RunElement = {
      ...el,
      angle: { ...el.angle!, emphasis: "Genève" },
    };
    const r = await deliver(
      { ...run, elements: [revised] },
      revised,
      runDir,
      decorWith(),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("stale");
  });

  it("should refuse a destination whose capability is not ready, naming the variable never its value", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["embed-cloudflare"], delivered: [] },
    });
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: { "embed-cloudflare": { enabled: true } },
      },
    });
    const r = await deliver(run, el, runDir, decor, {}, { env: {} });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain(
      "CLOUDFLARE_API_TOKEN",
    );
  });

  it("should refuse when the profile requires signers and the element carries no matching approval", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const r = await deliver(run, el, runDir, decorWith(), {
      requiredSigners: ["yvan"],
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("sign-off");
  });

  it("should keep every credential out of the recorded element", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const r = await deliver(
      run,
      el,
      runDir,
      decorWith(),
      {},
      {
        env: { CLOUDFLARE_API_TOKEN: "SECRET-TOKEN-VALUE" },
      },
    );
    expect(r.ok).toBe(true);
    expect(JSON.stringify((r as { value: RunElement }).value)).not.toContain(
      "SECRET-TOKEN-VALUE",
    );
  });

  // Probing beyond the brief's 5 mandated tests — see task-9-report.md for the reasoning.

  it("never throws when the just-delivered package cannot be read back for hashing", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    // Pre-create the package output with owner-write-only permissions (0o200): the zip
    // publisher can still overwrite it (write permission is all `writeFileSync` needs), but
    // the subsequent read-back-to-hash step needs READ permission, which this file does not
    // grant. This reproduces — with real fs permissions, no mocking — the exact race class
    // produce.ts already guards against (an engine ran, but recording its output can still
    // fail) for the delivery path's own analogous step.
    const packagePath = join(runDir, "elements", "e1", "e1.zip");
    writeFileSync(packagePath, "placeholder");
    chmodSync(packagePath, 0o200);
    try {
      const r = await deliver(run, el, runDir, decorWith());
      expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    } finally {
      chmodSync(packagePath, 0o600); // afterEach's rmSync needs to read the dir entry back
    }
  });

  it("does not discard an already-recorded delivery when a later destination cannot be validated", async () => {
    // Two destinations requested in one go; the second ("embed-cloudflare") cannot be
    // validated (no credentials in this env). A single deliver() call must process the
    // destinations one at a time — a later refusal must never erase an earlier success that
    // already happened (and, for a package publisher, already landed on disk).
    const { run, el } = runWith({
      delivery: { requested: ["zip", "embed-cloudflare"], delivered: [] },
    });
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: {
          zip: { enabled: true },
          "embed-cloudflare": { enabled: true },
        },
      },
    });
    const first = await deliver(run, el, runDir, decor, {}, { env: {} });
    expect(first.ok).toBe(true);
    const afterFirst = (first as { value: RunElement }).value;
    expect(afterFirst.delivery!.delivered.map((d) => d.publisherId)).toEqual([
      "zip",
    ]);
    expect(existsSync(join(runDir, "elements", "e1", "e1.zip"))).toBe(true);

    const second = await deliver(
      { ...run, elements: [afterFirst] },
      afterFirst,
      runDir,
      decor,
      {},
      { env: {} },
    );
    expect(second).toMatchObject({ ok: false, code: "invalid-request" });
    expect((second as { message: string }).message).toContain(
      "CLOUDFLARE_API_TOKEN",
    );
    // The zip record from the first call must still be intact — a failed second call must
    // not have any way to erase it, since the caller only merges an `ok` result.
    expect(afterFirst.delivery!.delivered).toHaveLength(1);
  });

  it("does not re-publish an already-delivered destination on a repeat call", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const decor = decorWith();
    const first = await deliver(run, el, runDir, decor);
    expect(first.ok).toBe(true);
    const delivered = (first as { value: RunElement }).value;

    const second = await deliver(
      { ...run, elements: [delivered] },
      delivered,
      runDir,
      decor,
    );
    expect(second.ok).toBe(true);
    const rec = (second as { value: RunElement }).value;
    // Same single record, not a duplicate — the destination was already delivered for this
    // exact provenance, so the repeat call must be a no-op, not a second upload.
    expect(rec.delivery!.delivered).toHaveLength(1);
    expect(rec.delivery!.delivered[0]).toEqual(
      delivered.delivery!.delivered[0]!,
    );
  });
});
