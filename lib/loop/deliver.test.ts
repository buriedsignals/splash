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
import "../../skills/splash/src/register-producers";
import { deliver } from "./deliver";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { provenanceHash, type RunElement, type RunManifest } from "./manifest";
import { neutralDecor, type Decor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { registerAllPublishers } from "../delivery";
import {
  registerPublisher,
  resetPublishersForTest,
  type Publisher,
} from "../core/publishers";
import { ok } from "../core/verbs";
import { VISUAL_FORMATS } from "../core/vocabulary";

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
    schemaVersion: 4,
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
          options: [{ id: "o1", nativeType: "line", why: "w" }],
          excluded: [],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const partial = { ...base.elements[0]!, ...el };
  const artifact = partial.artifact ?? {
    path: "elements/e1/static.png",
    sha256: "d",
    provenanceHash: provenanceHash(base, partial),
    producedAt: "1980-01-01T00:00:00.000Z",
  };
  const full: RunElement = {
    ...partial,
    artifact,
    // Publishing is gated on an approval covering these exact bytes — the unconditional half
    // of the editorial gate (see "refuses to publish what nobody approved" below, which is the
    // test of the gate itself). Every case in this file is about what happens AFTER that gate,
    // so the fixture carries the approval a journalist would have written.
    approved: partial.approved ?? {
      signoffPath: "signoffs/e1.json",
      approvedProvenanceHash: artifact.provenanceHash,
    },
  };
  return { run: { ...base, elements: [full] }, el: full };
}

describe("deliver", () => {
  // THE GATE. Until the verification chain was wired, a visual went from produced to published
  // with nothing having looked at it: deliver() asked for an approval only when the newsroom
  // had declared requiredSigners, and nothing in production could write one — so a newsroom
  // that declared signers could never publish, and a newsroom that declared none published
  // with no gate at all. Both halves of one disease.
  it("refuses to publish what nobody approved, with or without requiredSigners", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const { approved: _approved, ...unapproved } = el;
    const r = await deliver(
      { ...run, elements: [unapproved] },
      unapproved,
      runDir,
      decorWith(),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toMatch(/approv/i);
  });

  it("refuses an approval that covers an earlier version of the artifact", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
      approved: {
        signoffPath: "signoffs/e1.json",
        approvedProvenanceHash: "the-hash-of-something-else",
      },
    });
    const r = await deliver(run, el, runDir, decorWith());
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toMatch(/approv/i);
  });

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

  // The module's whole contract is "bounded VerbResult refusals, never a throw" (see the
  // header comment of deliver.ts). A Decor missing `profile` entirely — reachable if a future
  // caller builds one by hand instead of through loadDecor/neutralDecor, both of which always
  // set it — must not turn that contract into a TypeError on `profile.requiredSigners`.
  it("should refuse rather than throw when the decor carries no profile at all", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const decorNoProfile = decorWith() as unknown as Record<string, unknown>;
    delete decorNoProfile.profile;
    const r = await deliver(
      run,
      el,
      runDir,
      decorNoProfile as unknown as Decor,
    );
    // No requiredSigners means nothing is gated: the call proceeds and zip is always ready, so
    // the bounded answer is a success, not a refusal — the point being that it IS bounded.
    expect(r.ok).toBe(true);
  });

  it("should refuse when the profile requires signers and the element carries no matching approval", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["zip"], delivered: [] },
    });
    const { approved: _approved, ...unapproved } = el;
    const r = await deliver(
      { ...run, elements: [unapproved] },
      unapproved,
      runDir,
      decorWith(),
      { requiredSigners: ["yvan"] },
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("sign-off");
  });

  // The secret invariant of spec §3.10, proven where it can actually fail. (A predecessor of
  // this test delivered to "zip" with a secret in the injected env and asserted it was absent
  // from the record: tautological — zip's cap.env is [], so `credentials` is `{}` and the
  // adapter never reads it, leaving the assertion green through any regression in deliver.ts's
  // own collection loop. A misleading green is worse than no test, so it is gone.) This one
  // registers a throwaway capability that DECLARES one env var, and a publisher that echoes
  // back exactly what it received (via the outcome's own `snippet` field, so the answer is
  // visible in the returned RunElement) — proving the collection loop forwards a declared
  // variable and never an undeclared one, even when both sit in the same injected environment.
  it("forwards only a destination's own declared credential, never an undeclared one from the same env", async () => {
    const TEST_CAP_ID = "test-echo-cap";
    NEWSROOM_CAPABILITIES[TEST_CAP_ID] = {
      id: TEST_CAP_ID,
      label: "Test echo (throwaway, this test only)",
      kind: "delivery",
      env: [["DECLARED_TOKEN"]],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    const echoPublisher: Publisher = {
      id: TEST_CAP_ID,
      kind: "package",
      serves: [...VISUAL_FORMATS],
      implemented: true,
      async publish(req) {
        return ok({
          publisherId: TEST_CAP_ID,
          kind: "package" as const,
          snippet: JSON.stringify(req.credentials),
          publishedAt: new Date().toISOString(),
        });
      },
    };
    registerPublisher(echoPublisher);

    try {
      const { run, el } = runWith({
        delivery: { requested: [TEST_CAP_ID], delivered: [] },
      });
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [TEST_CAP_ID]: { enabled: true } },
        },
      });
      const r = await deliver(
        run,
        el,
        runDir,
        decor,
        {},
        {
          env: {
            DECLARED_TOKEN: "DECLARED-VALUE",
            DECOY_TOKEN: "DECOY-SECRET-VALUE",
          },
        },
      );
      expect(r.ok).toBe(true);
      const value = (r as { value: RunElement }).value;
      const snippet = value.delivery!.delivered[0]!.snippet;
      expect(snippet).toContain("DECLARED-VALUE");
      expect(snippet).not.toContain("DECOY-SECRET-VALUE");
      expect(JSON.stringify(value)).not.toContain("DECOY-SECRET-VALUE");
    } finally {
      // The registry resets in the next beforeEach, but NEWSROOM_CAPABILITIES is a shared
      // module-level object with no reset seam of its own — bun test shares one process
      // across every file, so leaving this throwaway entry behind would leak into whatever
      // test in whatever file runs next (e.g. a whole-registry size assertion elsewhere).
      delete NEWSROOM_CAPABILITIES[TEST_CAP_ID];
    }
  });

  // Review fix (Task 3-4, round 1, Critical): settingsFields declared for a capability
  // (embed-s3's endpoint/region/bucket/prefix/publicBaseUrl) had no channel to reach the
  // adapter at all — capabilityReadiness reports "ready" once the secrets are present, but
  // `deliver`'s settings object carried only `publisherId` and the transverse
  // snippetTemplate, so the adapter always refused with "settings.endpoint is required" for a
  // fully-configured newsroom. This proves the persisted per-capability `settings` (spec
  // 2026-07-24 §3.2) now reach `req.settings` through a REAL `deliver()` call — not a
  // hand-built PublishRequest, which is exactly what let the gap ship unnoticed the first
  // time — and that they never come from the environment, even when a decoy env var of the
  // same shape is present.
  it("merges a capability's own persisted settings into the publish request, never from the environment", async () => {
    const echoS3: Publisher = {
      id: "embed-s3",
      kind: "hosted",
      serves: [...VISUAL_FORMATS],
      implemented: true,
      async publish(req) {
        return ok({
          publisherId: "embed-s3",
          kind: "hosted" as const,
          url: "https://s3-echo.invalid/proof",
          snippet: JSON.stringify(req.settings),
          publishedAt: new Date().toISOString(),
        });
      },
    };
    // The real embed-s3 adapter is registered by the outer beforeEach; swap in an echo stub
    // for just this test so the assertion is about the SETTINGS-MERGING PATH, not the network.
    resetPublishersForTest();
    registerPublisher(echoS3);

    const { run, el } = runWith({
      delivery: { requested: ["embed-s3"], delivered: [] },
    });
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: {
          "embed-s3": {
            enabled: true,
            settings: {
              endpoint: "http://127.0.0.1:9000",
              region: "us-east-1",
              bucket: "splash-embeds",
              publicBaseUrl: "http://127.0.0.1:9000/splash-embeds",
            },
          },
        },
      },
    });
    const r = await deliver(
      run,
      el,
      runDir,
      decor,
      {},
      {
        env: {
          SPLASH_S3_ACCESS_KEY_ID: "key-id",
          SPLASH_S3_SECRET_ACCESS_KEY: "secret-key",
          DECOY_SETTING: "should-never-appear",
        },
      },
    );
    expect(r.ok).toBe(true);
    const value = (r as { value: RunElement }).value;
    const snippet = value.delivery!.delivered[0]!.snippet;
    // The echo stub above always returns a snippet — this test is about what settings reach it,
    // not about the optional-snippet contract Task 6 introduced elsewhere.
    const settings = JSON.parse(snippet!);
    expect(settings).toMatchObject({
      publisherId: "embed-s3",
      endpoint: "http://127.0.0.1:9000",
      region: "us-east-1",
      bucket: "splash-embeds",
      publicBaseUrl: "http://127.0.0.1:9000/splash-embeds",
    });
    expect(snippet).not.toContain("should-never-appear");
    // The full recorded element (event log, delivery record…) must not carry the decoy either.
    expect(JSON.stringify(value)).not.toContain("should-never-appear");
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
    const packagePath = join(runDir, "deliveries", "e1", "e1.zip");
    mkdirSync(join(runDir, "deliveries", "e1"), { recursive: true });
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
    expect(existsSync(join(runDir, "deliveries", "e1", "e1.zip"))).toBe(true);

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

  it("skips a destination it cannot satisfy instead of starving the universal fallback", async () => {
    // The head-of-line case, and the natural request that hits it: "give me the link, and a
    // zip as backup". Retrying the FIRST unsatisfied destination on every call means an
    // unconfigured host refuses identically forever, nextActions keeps answering ["deliver"],
    // and the zip — which exists precisely so "no host configured" is a working path — is
    // never written.
    const { run, el } = runWith({
      delivery: { requested: ["embed-cloudflare", "zip"], delivered: [] },
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
    expect(existsSync(join(runDir, "deliveries", "e1", "e1.zip"))).toBe(true);

    // …and the refusal is NOT swallowed: the cloudflare destination is still unsatisfied, so
    // the very next call is the bounded refusal naming the variable the journalist must set.
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
  });

  it("names every destination it could not satisfy when none of them could be published", async () => {
    const { run, el } = runWith({
      delivery: {
        requested: ["embed-cloudflare", "embed-s3"],
        delivered: [],
      },
    });
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: { "embed-cloudflare": { enabled: true } },
      },
    });
    const r = await deliver(run, el, runDir, decor, {}, { env: {} });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    const message = (r as { message: string }).message;
    expect(message).toContain("CLOUDFLARE_API_TOKEN");
    expect(message).toContain("embed-s3");
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

  // Regression: produce() and deliver() used to render into and publish into the SAME
  // directory (`elements/<id>/`). freshOutDir (lib/core/verbs/exec.ts) wipes that directory
  // clean before every render, so re-producing an element after it was delivered silently
  // deleted the zip archive (and its ALT.txt/README.md) — while the manifest still recorded
  // that delivery's path and hash. This exercises the REAL sequence through the real
  // chart-native seam (no fixture — a fixture never runs freshOutDir at all), the same way
  // produce.test.ts's own e2e cases do.
  it("re-producing an element after it was delivered does not delete the delivered package", async () => {
    const src = join(runDir, "src.csv");
    writeFileSync(
      src,
      "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
    );
    const base: RunManifest = {
      runId: "reproduce-after-deliver",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(runDir, src, "data") },
      // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
      // journalist brought. produce() refuses an undeclared run rather than crediting a
      // placeholder, so every fixture that reaches a render says what its data is.
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
      orient: {
        profile: {
          columns: ["canton", "2015", "2024"],
          numericColumns: ["2015", "2024"],
          rowCount: 3,
        },
        supportsPoint: true,
      },
      elements: [
        {
          id: "e1",
          angle: {
            confirmedTakeaway: "Health premiums rose in every canton shown",
            altInsight:
              "Between 2015 and 2024 the adult premium rose in all three cantons shown.",
            unit: "Monthly adult premium (CHF)",
          },
          proposal: {
            options: [
              { id: "slope", nativeType: "slope", why: "two points in time" },
            ],
            excluded: [],
            chosenId: "slope",
          },
        },
      ],
      events: [],
    };

    const produced1 = await produce(base, base.elements[0]!, runDir);
    if (!produced1.ok) throw new Error(produced1.message);
    const withArtifact: RunElement = {
      ...produced1.value,
      delivery: { requested: ["zip"], delivered: [] },
      // Publishing is gated on an approval covering these bytes; this test is about what a
      // re-produce does to an already-delivered package.
      approved: {
        signoffPath: "signoffs/e1.json",
        approvedProvenanceHash: produced1.value.artifact!.provenanceHash,
      },
    };
    const runWithArtifact: RunManifest = { ...base, elements: [withArtifact] };

    const delivered = await deliver(
      runWithArtifact,
      withArtifact,
      runDir,
      decorWith(),
    );
    if (!delivered.ok) throw new Error(delivered.message);
    const rec = delivered.value.delivery!.delivered[0]!;
    const packagePath = join(runDir, rec.artifact!.path);
    expect(existsSync(packagePath)).toBe(true);

    const runAfterDeliver: RunManifest = {
      ...runWithArtifact,
      elements: [delivered.value],
    };
    const produced2 = await produce(runAfterDeliver, delivered.value, runDir);
    if (!produced2.ok) throw new Error(produced2.message);

    // THE assertion this test exists for: the delivered package must still be on disk.
    expect(existsSync(packagePath)).toBe(true);
  }, 180_000);
});

// The element the existing helper builds, re-pinned to a static format with a provenance that
// matches — anything else refuses on staleness before reaching the check under test.
function staticRunWith(requested: string[]) {
  const { run, el } = runWith({ delivery: { requested, delivered: [] } });
  const repinned = {
    ...el,
    proposal: {
      ...el.proposal!,
      options: el.proposal!.options.map((o) => ({
        ...o,
        format: "static" as const,
      })),
    },
  };
  // Re-pinning the format moves the provenance hash, so the artifact AND the approval that
  // covers it both follow — an approval left behind would read stale and the delivery would be
  // refused by the editorial gate rather than by the genre rule these tests are about.
  const provenance = provenanceHash(run, repinned);
  const fixed = {
    ...repinned,
    artifact: { ...repinned.artifact!, provenanceHash: provenance },
    approved: {
      signoffPath: "signoffs/e1.json",
      approvedProvenanceHash: provenance,
    },
  };
  return { run: { ...run, elements: [fixed] }, el: fixed };
}

describe("a destination that cannot serve the artifact's format", () => {
  const HOSTED_ID = "test-html-only-host";

  it("should refuse before the publisher is ever entered", async () => {
    let entered = 0;
    NEWSROOM_CAPABILITIES[HOSTED_ID] = {
      id: HOSTED_ID,
      label: "Test HTML-only host (throwaway, this test only)",
      kind: "delivery",
      env: [],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    registerPublisher({
      id: HOSTED_ID,
      kind: "hosted",
      serves: ["interactive", "scrolly"],
      implemented: true,
      async publish() {
        entered += 1;
        return ok({
          publisherId: HOSTED_ID,
          kind: "hosted" as const,
          url: "https://example.invalid/",
          snippet: "",
          publishedAt: new Date().toISOString(),
        });
      },
    });

    try {
      const { run, el } = staticRunWith([HOSTED_ID]);
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [HOSTED_ID]: { enabled: true } },
        },
      });
      const r = await deliver(run, el, runDir, decor, {}, { env: {} });
      expect(r.ok).toBe(false);
      expect(entered).toBe(0);
      expect((r as { message: string }).message).toContain("interactive");
    } finally {
      delete NEWSROOM_CAPABILITIES[HOSTED_ID];
      resetPublishersForTest();
      registerAllPublishers();
    }
  });

  it("should let a hosted destination that DOES serve the format through", async () => {
    const OPEN_ID = "test-serves-everything-host";
    NEWSROOM_CAPABILITIES[OPEN_ID] = {
      id: OPEN_ID,
      label: "Test asset host (throwaway, this test only)",
      kind: "delivery",
      env: [],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    registerPublisher({
      id: OPEN_ID,
      kind: "hosted",
      serves: [...VISUAL_FORMATS],
      implemented: true,
      async publish() {
        return ok({
          publisherId: OPEN_ID,
          kind: "hosted" as const,
          url: "https://assets.example.invalid/primes.png",
          snippet:
            '<img src="https://assets.example.invalid/primes.png" alt="x">',
          publishedAt: new Date().toISOString(),
        });
      },
    });

    try {
      const { run, el } = staticRunWith([OPEN_ID]);
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [OPEN_ID]: { enabled: true } },
        },
      });
      const r = await deliver(run, el, runDir, decor, {}, { env: {} });
      expect(r.ok).toBe(true);
      const value = (r as { value: RunElement }).value;
      expect(value.delivery!.delivered[0]!.publisherId).toBe(OPEN_ID);
    } finally {
      delete NEWSROOM_CAPABILITIES[OPEN_ID];
      resetPublishersForTest();
      registerAllPublishers();
    }
  });
});

describe("a delivery with no embed code", () => {
  it("should record a delivery that has no embed code without inventing one", async () => {
    const FILE_ID = "test-file-package";
    NEWSROOM_CAPABILITIES[FILE_ID] = {
      id: FILE_ID,
      label: "Test file package (throwaway, this test only)",
      kind: "delivery",
      env: [],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    registerPublisher({
      id: FILE_ID,
      kind: "package",
      serves: [...VISUAL_FORMATS],
      implemented: true,
      async publish() {
        return ok({
          publisherId: FILE_ID,
          kind: "package" as const,
          publishedAt: new Date().toISOString(),
        });
      },
    });

    try {
      const { run, el } = staticRunWith([FILE_ID]);
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [FILE_ID]: { enabled: true } },
        },
      });
      const r = await deliver(run, el, runDir, decor, {}, { env: {} });
      expect(r.ok).toBe(true);
      const record = (r as { value: RunElement }).value.delivery!.delivered[0]!;
      expect("snippet" in record).toBe(false);
    } finally {
      delete NEWSROOM_CAPABILITIES[FILE_ID];
      resetPublishersForTest();
      registerAllPublishers();
    }
  });
});
