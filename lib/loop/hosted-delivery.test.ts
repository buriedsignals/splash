// WHERE a published embed goes, and what happens when it is sent somewhere that ships bytes.
//
// A hosted delivery is already live: the hand-over is the address plus the embed code, which is
// what `embed-hosted` does (lib/delivery/adapters/hosted-embed.ts). This file proves the two
// decisions around it — the DEFAULT (request-delivery names that destination for an artifact
// nobody has to upload) and the LEGALITY (deliver refuses a byte-shipping destination before any
// call goes out, rather than handing an adapter `join(runDir, undefined)`).
//
// `globalThis.fetch` is replaced; the live hand-over is in the gated Datawrapper proofs.
import { test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultDestinationsFor } from "../delivery/routing";
import { requestDelivery } from "./request-delivery";
import { deliver } from "./deliver";
import { hostedBindingDigest } from "../verify/hosted";
import { provenanceHash, type RunManifest } from "./manifest";
import type { CaptureRecord, ReviewRecord } from "../verify/types";
import type { Decor } from "../newsroom/decor";

const HOSTED_URL = "https://datawrapper.dwcdn.net/AbCdE/1/";
const PIXELS = "c".repeat(64);
const BINDING = hostedBindingDigest(HOSTED_URL, PIXELS);

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function decorFor(root: string): Decor {
  return {
    root,
    profile: { credit: "Heidi.news", lang: "fr" },
    state: {
      capabilities: {
        "embed-hosted": { enabled: true, settings: {} },
        zip: { enabled: true, settings: {} },
      },
      delivery: {},
    },
  } as unknown as Decor;
}

/** A hosted element that has been captured, reviewed, previewed and approved — the state the
 *  delivery step is legitimately reached in. */
function approvedHostedRun(): RunManifest {
  const run: RunManifest = {
    runId: "r-hosted-delivery",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "a".repeat(64) } },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "Federal Statistical Office",
        url: "https://www.bfs.admin.ch/bfs/en/home.html",
      },
    },
    orient: {
      profile: {
        columns: ["city", "rate"],
        numericColumns: ["rate"],
        rowCount: 4,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Basel recycles the most",
          emphasis: "Basel",
          altInsight: "A ranking of four Swiss cities",
          unit: "%",
        },
        proposal: {
          options: [
            {
              id: "dw-column",
              nativeType: "column-chart",
              engine: "dw-chart",
              format: "interactive",
              why: "w",
            },
          ],
          excluded: [],
          chosenId: "dw-column",
        },
      },
    ],
    events: [],
  };
  const prov = provenanceHash(run, run.elements[0]!);
  const image: CaptureRecord = {
    breakpoint: "primary",
    path: "/tmp/verify/e1/review-primary.png",
    sha256: PIXELS,
    cssViewport: { width: 900, height: 560 },
    deviceScaleFactor: 2,
    rootBox: { x: 0, y: 0, width: 900, height: 436 },
    rootSelector: "body",
    documentScroll: { width: 900, height: 560 },
    artifactSha256: BINDING,
    artifactUrl: HOSTED_URL,
    destinationId: "article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-01-01T00:00:00.000Z",
    marks: 5,
    markColours: ["#18a1cd"],
  };
  const review: ReviewRecord = {
    findings: [],
    reviewedProvenanceHash: prov,
    reviewer: {
      mode: "mechanical",
      name: "splash-review",
      version: "1",
      inputsHash: "i",
      outputHash: "o",
      independentSemanticReview: "unavailable",
    },
    captures: [image],
    checks: [],
    tasteRisk: [],
    overrides: [],
    acknowledged: [],
    preview: {
      deliverablePath: HOSTED_URL,
      deliverableSha256: BINDING,
      presentedAs: "opened",
      presentedAt: "2026-01-01T00:00:00.000Z",
    },
  };
  const el = {
    ...run.elements[0]!,
    artifact: {
      kind: "hosted",
      url: HOSTED_URL,
      provenanceHash: prov,
      producedAt: "2026-01-01T00:00:00.000Z",
    },
    capture: { images: [image], checks: [], capturedProvenanceHash: prov },
    review,
    approved: { signoffPath: "signoffs/e1.json", approvedProvenanceHash: prov },
  } as unknown as RunManifest["elements"][number];
  return { ...run, elements: [el] };
}

test("an already-published deliverable is routed to the hand-over, not to a package", () => {
  const ready = ["embed-hosted", "embed-cloudflare", "zip"];
  expect(
    defaultDestinationsFor("interactive", ready, undefined, {
      alreadyPublished: true,
    }),
  ).toEqual(["embed-hosted"]);
  // Unmoved for everything the run OWNS: an interactive.html still prefers a real host, a png is
  // still handed over as a file.
  expect(defaultDestinationsFor("interactive", ready)).toEqual([
    "embed-cloudflare",
  ]);
  expect(defaultDestinationsFor("static", ready)).toEqual(["zip"]);
});

test("request-delivery names the hand-over for a hosted artifact without being told", () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-request-"));
  try {
    const run = approvedHostedRun();
    const r = requestDelivery(run, run.elements[0]!, decorFor(runDir), {
      env: {},
    });
    expect(r.ok ? "requested" : `${r.code}: ${r.message}`).toBe("requested");
    if (!r.ok) return;
    expect(r.value.delivery!.requested).toEqual(["embed-hosted"]);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("delivering a hosted embed records the address and the embed code, and no file", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-deliver-"));
  try {
    let asked = "";
    globalThis.fetch = (async (
    u: string | URL,
    _i?: RequestInit,
  ): Promise<Response> => {
      asked = String(u);
      return new Response("<html>a chart</html>", { status: 200 });
    }) as typeof fetch;

    const run = approvedHostedRun();
    const el = {
      ...run.elements[0]!,
      delivery: { requested: ["embed-hosted"], delivered: [] },
    } as unknown as RunManifest["elements"][number];
    const r = await deliver(
      { ...run, elements: [el] },
      el,
      runDir,
      decorFor(runDir),
      undefined,
      {
        env: {},
      },
    );
    expect(r.ok ? "delivered" : `${r.code}: ${r.message}`).toBe("delivered");
    if (!r.ok) return;
    expect(asked).toBe(HOSTED_URL);
    const record = r.value.delivery!.delivered[0]!;
    expect(record.publisherId).toBe("embed-hosted");
    expect(record.kind).toBe("hosted");
    expect(record.url).toBe(HOSTED_URL);
    expect(record.snippet).toContain(HOSTED_URL);
    // No package was written, and the record does not claim one.
    expect(record.artifact).toBeUndefined();
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// THE REFUSAL THAT REPLACED THE OLD BLANKET ONE. deliver() used to refuse EVERY hosted artifact by
// name ("there is nothing for a publisher to send"). It now refuses only the mismatch — a
// destination that ships bytes, asked to ship an embed nobody owns bytes of — and it does so
// BEFORE the verb runs, so nothing is staged, uploaded or deployed.
test("a byte-shipping destination is refused for a hosted embed, by name, before any call", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-deliver-wrong-"));
  try {
    let called = false;
    globalThis.fetch = (async (
      _u: string | URL,
      _i?: RequestInit,
    ): Promise<Response> => {
      called = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const run = approvedHostedRun();
    const el = {
      ...run.elements[0]!,
      delivery: { requested: ["zip"], delivered: [] },
    } as unknown as RunManifest["elements"][number];
    const r = await deliver(
      { ...run, elements: [el] },
      el,
      runDir,
      decorFor(runDir),
      undefined,
      {
        env: {},
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("zip");
    expect(r.message).toContain(HOSTED_URL);
    expect(called).toBe(false);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("an unapproved hosted embed is still refused — the editorial gate is unmoved", async () => {
  const runDir = mkdtempSync(
    join(tmpdir(), "splash-hosted-deliver-unapproved-"),
  );
  try {
    const run = approvedHostedRun();
    const el = {
      ...run.elements[0]!,
      approved: undefined,
      delivery: { requested: ["embed-hosted"], delivered: [] },
    } as unknown as RunManifest["elements"][number];
    const r = await deliver(
      { ...run, elements: [el] },
      el,
      runDir,
      decorFor(runDir),
      undefined,
      {
        env: {},
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("approved");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
