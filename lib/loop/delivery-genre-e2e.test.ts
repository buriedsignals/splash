import { fileArtifact } from "./manifest";
// Opt-in live proof: a real static PNG, produced by the loop, published to a real
// S3-compatible endpoint, then FETCHED BACK.
//
// The fixture is forbidden here and that is the point. This project's own lesson (2026-07-25):
// the Cloudflare and S3 live proofs used a `.html` fixture, so "every artifact served as
// text/html" survived a live check. A proof that does not start at produce() proves nothing
// about the real path.
//
// Run it with:
//   docker run -p 9000:9000 -e MINIO_ROOT_USER=minioadmin \
//     -e MINIO_ROOT_PASSWORD=minioadmin quay.io/minio/minio server /data
//   (then create the "splash-embeds" bucket and grant it anonymous read — the adapter
//   refuses to set a bucket policy itself, see lib/delivery/adapters/s3.ts F4)
//   SPLASH_S3_E2E=1 SPLASH_S3_ACCESS_KEY_ID=minioadmin \
//     SPLASH_S3_SECRET_ACCESS_KEY=minioadmin bun test lib/loop/delivery-genre-e2e.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../delivery";
import "./engines";
import { propose } from "./propose";
import { produce } from "./produce";
import { deliver } from "./deliver";
import { captureStep, reviewStep } from "./verify";
import { previewStep } from "./preview";
import { approve } from "./approve";
import { requestDelivery } from "./request-delivery";
import type { RunManifest, RunElement } from "./manifest";
import { freezeInput } from "./freeze";
import { neutralDecor, type Decor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { validateSourcePolicy } from "../source/policy";

const RUN = process.env.SPLASH_S3_E2E === "1";

// Builds a run through the SAME seam every other loop test does (freezeInput → propose →
// choose → produce), on the 2-row fixture lib/loop/driver.test.ts already proves yields a
// buildable chart-native offer through propose() (reused verbatim, not a new dataset — see
// video-e2e.test.ts's header for why a richer fixture steered the brain elsewhere).
//
// `channel: "social-feed"` is what makes this a STATIC proof rather than an interactive one:
// social-feed's allowedFormats is ["static", "video"] (lib/core/channel-policy.ts), so the
// offer cannot contain an interactive/scrolly row to accidentally pick instead.
/** capture → review → preview → approve, on the real artifact. SPLASH_NO_VIEWER keeps the
 *  preview step from opening a window on a test machine. */
async function walkToApproval(
  run: RunManifest,
  runDir: string,
): Promise<RunElement> {
  const el = run.elements[0]!;
  const captured = await captureStep(run, el, runDir);
  if (!captured.ok) throw new Error(`capture: ${captured.message}`);
  const reviewed = await reviewStep(
    { ...run, elements: [captured.value] },
    captured.value,
    runDir,
  );
  if (!reviewed.ok) throw new Error(`review: ${reviewed.message}`);
  const previewed = previewStep(
    { ...run, elements: [reviewed.value] },
    reviewed.value,
    runDir,
    { env: { SPLASH_NO_VIEWER: "1" } },
  );
  if (!previewed.ok) throw new Error(`preview: ${previewed.message}`);
  const decided = approve(
    { ...run, elements: [previewed.value] },
    previewed.value,
    runDir,
    { actorLabel: "delivery-genre-proof" },
    { signers: [], requiredSigners: [] },
  );
  if (!decided.ok) throw new Error(`approve: ${decided.message}`);
  return decided.value;
}

function seedRun(runDir: string): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  return {
    runId: "s3-e2e",
    schemaVersion: 7,
    route: "embed",
    channel: "social-feed",
    input: { data: freezeInput(runDir, src, "data") },
    // A `local` source: the CSV written two lines above is the file the journalist brought.
    // produce() refuses an undeclared run ("the class of a source is declared, never guessed"),
    // and the declared label is rendered into the very PNG this proof fetches back — so the
    // ledger is part of the artifact under test, not paperwork around it.
    sources: {
      mode: "real" as const,
      data: { kind: "local" as const, label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
        requestedFormat: "static",
      },
    ],
    events: [],
  };
}

// ALWAYS ON — outside the gate, and the only part of this file `bun run check` runs. The
// refusal that rotted this proof ("source-undeclared") is decidable from the fixture alone: no
// MinIO, no engine, milliseconds. What it cannot see is the SECOND refusal this proof also hit
// (deliver() wanting an approval), which only exists once bytes exist — see
// docs/superpowers/specs/2026-07-27-proofs-run-design.md.
test("the fixture declares a source the loop will accept, before any render", () => {
  const seed = seedRun(mkdtempSync(join(tmpdir(), "loop-s3-fixture-")));
  const verdict = validateSourcePolicy(seed.sources?.data, {
    mode: seed.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

async function producedStaticRun(): Promise<{
  run: RunManifest;
  el: RunElement;
  runDir: string;
  decor: Decor;
}> {
  const runDir = mkdtempSync(join(tmpdir(), "loop-s3-e2e-run-"));
  const run = seedRun(runDir);
  const el = run.elements[0]!;

  const { options } = propose(run, el);
  const staticOption = options.find((o) => o.format === "static");
  if (!staticOption)
    throw new Error(
      "producedStaticRun: the offer for social-feed + requestedFormat:static must contain a static row",
    );
  el.proposal = { options, excluded: [], chosenId: staticOption.id };

  const produced = await produce(run, el, runDir);
  if (!produced.ok)
    throw new Error(
      `producedStaticRun: produce() refused: ${produced.message}`,
    );

  // …and then through the verification chain, because deliver() refuses bytes nobody approved
  // ("capture it, review it, preview it and approve it before it is published"). Driven through
  // the real steps rather than by writing `approved` onto the element: approveElement is the
  // manifest's only sanctioned writer, and a publication proof that forged the gate record
  // would prove the endpoint serves whatever it is handed — which nobody doubted.
  const approvedEl = await walkToApproval(
    { ...run, elements: [produced.value] },
    runDir,
  );

  const producedEl = approvedEl;
  const decor: Decor = {
    ...neutralDecor(),
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
  };

  return {
    run: { ...run, elements: [producedEl] },
    el: producedEl,
    runDir,
    decor,
  };
}

test.skipIf(!RUN)(
  "a produced PNG is published as an image and served as one",
  async () => {
    const { run, el, runDir, decor } = await producedStaticRun();

    const asked = requestDelivery(run, el, decor, {
      destinations: ["embed-s3"],
      env: process.env,
    });
    // A refusal is DATA in this codebase, so surface its own sentence rather than `false` —
    // `expect(x.ok).toBe(true)` was what made this proof's rot unreadable at a glance.
    if (!asked.ok) throw new Error(`requestDelivery: ${asked.message}`);

    const delivered = await deliver(
      run,
      asked.value,
      runDir,
      decor,
      {},
      { env: process.env },
    );
    if (!delivered.ok) throw new Error(`deliver: ${delivered.message}`);

    const record = delivered.value.delivery!.delivered[0]!;
    expect(record.url).toBeDefined();
    expect(record.snippet).toContain("<img ");
    expect(record.snippet).toContain("alt=");

    const served = await fetch(record.url!);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await served.arrayBuffer());
    // The PNG magic number: the right bytes landed, not just a 200.
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    // Byte identity: what got served is the SAME artifact produce() made, not a different
    // file that also happens to be a PNG — the check with real value here, since
    // deliveredProvenanceHash equality is near-tautological (deliver() computes it from the
    // same `el` it just refused to publish a stale copy of).
    expect(
      Buffer.from(bytes).equals(
        readFileSync(join(runDir, fileArtifact(el.artifact)!.path)),
      ),
    ).toBe(true);
  },
  600_000,
);
