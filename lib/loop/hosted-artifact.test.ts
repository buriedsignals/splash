// A HOSTED delivery is a thing a run can RECORD — and, since the hosted-chain slice, a thing the
// run can carry all the way to a published hand-over.
//
// Datawrapper's `interactive` — chart or map — publishes and hands back a URL and no file at all
// (form "hosted", `files: []`; skills/dw-chart/src/manifest.ts, skills/map-dw/src/manifest.ts).
// The manifest's artifact slot used to require a `path`, so produce() answered `engine-failed: no
// interactive artifact in the delivery` and the URL render() correctly returned was thrown away —
// which cost the loop the whole "Embed" delivery form it publicly promises. That was closed first.
// Everything AFTER produce — capture, preview, approve, deliver — then refused by name, because
// each of them was written on "open the file, measure its pixels, hash its bytes, sign the hash".
// This slice teaches them to act on a published embed on ITS terms: capture opens the address,
// the approval binds to the hosted binding (lib/verify/hosted.ts), and delivery hands the URL over
// instead of shipping bytes nobody owns.
//
// These are the UNGATED halves of that proof: the shape, and every downstream reader's answer to
// an artifact that has no bytes on disk. The end-to-end halves — a real produce() that publishes a
// chart, a real capture of the live embed, a real hand-over — live in dw-chart-e2e.test.ts /
// map-dw-e2e.test.ts behind SPLASH_DW_E2E, because they cost a network round trip and a real
// published chart.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertInvariants,
  approvalSubjectOf,
  parseManifest,
  provenanceHash,
  gateStateOf,
  previewCovers,
  isHostedArtifact,
  fileArtifact,
  type RunManifest,
} from "./manifest";
import { previewStep } from "./preview";
import { approve } from "./approve";
import { captureStep } from "./verify";
import { generateKeyPairSync } from "node:crypto";
import { hostedBindingDigest } from "../verify/hosted";
// The editor's own signing half, from the module scripts/sign-artifact.mjs is a CLI over — so
// what this test signs with is what an editor signs with.
import { signEditorialSubject } from "../../skills/splash/src/editorial-signoff";
import type { CaptureRecord, ReviewRecord } from "../verify/types";

const HOSTED_URL = "https://datawrapper.dwcdn.net/AbCdE/1/";
const PIXELS = "c".repeat(64);
const BINDING = hostedBindingDigest(HOSTED_URL, PIXELS);

function base(): RunManifest {
  return {
    runId: "r-hosted",
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
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
          confirmedTakeaway: "t",
          emphasis: "e",
          altInsight: "a",
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
}

/** The run above, with the hosted delivery already recorded and fresh. */
function withHostedArtifact(): RunManifest {
  const m = base();
  m.elements[0]!.artifact = {
    kind: "hosted",
    url: HOSTED_URL,
    provenanceHash: provenanceHash(m, m.elements[0]!),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  return m;
}

/** What a capture of the live embed leaves on the element — the shape lib/verify/capture.ts
 *  writes when it opens an address instead of a file. Built by hand here so the whole chain
 *  downstream of capture is testable with no browser and no network; the REAL one is measured in
 *  the gated proofs. */
function hostedCaptureImage(over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
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
    titleSource: "h3",
    renderedTitle: "t",
    ...over,
  };
}

/** The run with capture and review already recorded — the state the preview step is reached in. */
function reviewedHosted(): {
  run: RunManifest;
  el: RunManifest["elements"][number];
} {
  const run = withHostedArtifact();
  const prov = provenanceHash(run, run.elements[0]!);
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
    captures: [hostedCaptureImage()],
    checks: [],
    tasteRisk: [],
    overrides: [],
    acknowledged: [],
  };
  const el = {
    ...run.elements[0]!,
    capture: {
      images: [hostedCaptureImage()],
      checks: [],
      capturedProvenanceHash: prov,
    },
    review,
  } as unknown as RunManifest["elements"][number];
  return { run: { ...run, elements: [el] }, el };
}

test("the manifest parses an artifact recorded as a hosted URL", () => {
  const parsed = parseManifest(
    JSON.parse(JSON.stringify(withHostedArtifact())),
  );
  const a = parsed.elements[0]!.artifact!;
  expect(isHostedArtifact(a)).toBe(true);
  if (!isHostedArtifact(a)) return;
  expect(a.url).toBe(HOSTED_URL);
  expect(fileArtifact(a)).toBeUndefined();
});

// THE BACKWARD-COMPATIBILITY CLAUSE. Every manifest already on disk records a file artifact and
// carries no `kind` at all — it must keep parsing, and keep meaning "a file".
test("a manifest written before hosted deliveries existed still parses as a file artifact", () => {
  const m = base();
  const legacy = {
    ...m,
    elements: [
      {
        ...m.elements[0]!,
        artifact: {
          path: "elements/e1/static.png",
          sha256: "b".repeat(64),
          provenanceHash: provenanceHash(m, m.elements[0]!),
          producedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ],
  };
  const parsed = parseManifest(JSON.parse(JSON.stringify(legacy)));
  const a = parsed.elements[0]!.artifact!;
  expect(isHostedArtifact(a)).toBe(false);
  expect(fileArtifact(a)?.path).toBe("elements/e1/static.png");
});

// THE URL IS THE WHOLE DELIVERABLE, so a blank or malformed one is a manifest asserting a delivery
// nobody can open — the hosted counterpart of a file record naming an unreadable path. produce.ts
// checks it, but produce.ts being careful is a property of today's code, not of the manifest: the
// write is where a hand-edited file or a second writer is caught. Same isHostedUrl predicate at
// both, never a second definition of "resolvable".
test("a hosted record whose url is not resolvable is refused at the write", () => {
  for (const url of [
    "", // blank
    "http://datawrapper.dwcdn.net/AbCdE/1/", // not https
    "https://localhost/AbCdE/1/", // a bare local host, not a domain
    "https://example.com/AbCdE/1/", // a placeholder host
    "not a url at all",
  ]) {
    const m = withHostedArtifact();
    (m.elements[0]!.artifact as { url: string }).url = url;
    expect(() => assertInvariants(m)).toThrow(/not a resolvable https address/);
  }
  // The control: the real published shape passes, so the guard is rejecting the URL and not the
  // hosted record itself.
  expect(() => assertInvariants(withHostedArtifact())).not.toThrow();
});

test("a hosted artifact is a produced element, and goes stale with its provenance", () => {
  const m = withHostedArtifact();
  expect(gateStateOf(m, m.elements[0]!)).toBe("produced");
  const moved: RunManifest = { ...m, channel: "social-vertical" };
  expect(gateStateOf(moved, moved.elements[0]!)).toBe("stale");
});

// ── WHAT AN APPROVAL OF A PUBLISHED EMBED IS ABOUT ────────────────────────────────────────────
//
// A file's answer is its own bytes. A hosted delivery has none, so the subject is the HOSTED
// BINDING: the address the capture landed on, hashed together with the still it took there
// (lib/verify/hosted.ts explains why neither leg alone is enough). It is resolvable only once
// something has been captured — which is exactly the order the chain already walks.
test("the subject of an approval is the artifact's bytes, or the hosted binding", () => {
  const file = base();
  file.elements[0]!.artifact = {
    kind: "file",
    path: "elements/e1/interactive.html",
    sha256: "d".repeat(64),
    provenanceHash: provenanceHash(file, file.elements[0]!),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(approvalSubjectOf(file.elements[0]!)).toEqual({
    sha256: "d".repeat(64),
  });

  // Hosted, nothing captured yet: no subject. Not an error — the chain answers "capture" next.
  expect(approvalSubjectOf(withHostedArtifact().elements[0]!)).toEqual({
    sha256: "",
  });

  const { el } = reviewedHosted();
  expect(approvalSubjectOf(el)).toEqual({ sha256: BINDING, url: HOSTED_URL });
});

// NOTHING WAS SHOWN, until something is. previewCovers answers on the subject the journalist was
// presented; before this slice a hosted artifact had none and could never be covered, which is
// what kept the approval gate shut on ten clean interactive rows.
test("a hosted artifact is covered by a preview of the binding it was captured under", () => {
  const { run, el } = reviewedHosted();
  expect(previewCovers(el)).toBe(false); // no preview recorded yet

  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-preview-"));
  try {
    const r = previewStep(run, el, runDir, { env: { SPLASH_NO_VIEWER: "1" } });
    expect(r.ok ? "presented" : `${r.code}: ${r.message}`).toBe("presented");
    if (!r.ok) return;
    const preview = (r.value.review as ReviewRecord).preview!;
    // The ADDRESS is what was presented — there is no path, and printing `<runDir>/undefined` is
    // the failure this branch exists to make impossible.
    expect(preview.deliverablePath).toBe(HOSTED_URL);
    expect(preview.deliverableSha256).toBe(BINDING);
    expect(preview.presentedAs).toBe("path-printed");
    expect(preview.fallbackReason ?? "").not.toBe("");
    expect(previewCovers(r.value)).toBe(true);

    // ...and a preview of a DIFFERENT published version does not cover this one. This is the
    // re-publish case, in one assertion: .../2/ is a different address, so it binds differently.
    const stale = {
      ...r.value,
      review: {
        ...(r.value.review as ReviewRecord),
        preview: {
          ...preview,
          deliverableSha256: hostedBindingDigest(
            "https://datawrapper.dwcdn.net/AbCdE/2/",
            PIXELS,
          ),
        },
      },
    } as unknown as RunManifest["elements"][number];
    expect(previewCovers(stale)).toBe(false);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("preview refuses a hosted artifact nobody has captured — there is no binding to present", () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-preview-nocap-"));
  try {
    const m = withHostedArtifact();
    const el = {
      ...m.elements[0]!,
      review: {
        findings: [],
        overrides: [],
        acknowledged: [],
        reviewedProvenanceHash: provenanceHash(m, m.elements[0]!),
      },
    } as unknown as RunManifest["elements"][number];
    const r = previewStep(m, el, runDir, { env: { SPLASH_NO_VIEWER: "1" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
    expect(r.message.toLowerCase()).toContain("captur");
    expect(r.message).toContain(HOSTED_URL);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// THE CEREMONY, on a delivery with no bytes. Everything the approval writes — the override, the
// sign-off document, the Ed25519 payload — binds to the hosted binding instead of a file sha256.
test("a hosted embed can be approved, and the sign-off names what it bound to", () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-approve-"));
  try {
    const { run, el } = reviewedHosted();
    const previewed = previewStep(run, el, runDir, {
      env: { SPLASH_NO_VIEWER: "1" },
    });
    expect(previewed.ok).toBe(true);
    if (!previewed.ok) return;

    const r = approve(
      { ...run, elements: [previewed.value] },
      previewed.value,
      runDir,
      { actorLabel: "Yvan" },
      { signers: [], requiredSigners: [] },
    );
    expect(r.ok ? "approved" : `${r.code}: ${r.message}`).toBe("approved");
    if (!r.ok) return;
    expect(r.value.approved).toBeDefined();

    const doc = JSON.parse(
      readFileSync(join(runDir, "signoffs", "e1.json"), "utf8"),
    );
    expect(doc.artifactSha256).toBe(BINDING);
    // The address is IN the document, so a reader of the record can tell which published version
    // was signed for without re-deriving a hash they cannot re-compute.
    expect(doc.artifactUrl).toBe(HOSTED_URL);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// THE IDENTITY HALF, on a delivery with no bytes. A newsroom that declares `requiredSigners` gets
// the same unforgeable Ed25519 gate it gets on a file — over the hosted binding instead of the
// bytes, through the SAME payload and the same verifier, so nothing about how an editor signs
// changes. `sign-artifact.mjs --digest` is the CLI an editor runs over exactly this function.
test("a newsroom's required editorial signature still gates a hosted embed", () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-signed-"));
  try {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const privatePem = privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    const signers = [
      {
        id: "yvan",
        publicKey: publicKey
          .export({ type: "spki", format: "der" })
          .toString("base64"),
      },
    ];

    const { run, el } = reviewedHosted();
    const previewed = previewStep(run, el, runDir, {
      env: { SPLASH_NO_VIEWER: "1" },
    });
    expect(previewed.ok).toBe(true);
    if (!previewed.ok) return;
    const staged = { ...run, elements: [previewed.value] };

    // Unsigned: refused, naming the signer the newsroom asked for.
    const unsigned = approve(
      staged,
      previewed.value,
      runDir,
      { actorLabel: "Yvan" },
      { signers, requiredSigners: ["yvan"] },
    );
    expect(unsigned.ok).toBe(false);

    // Signed over ANOTHER subject: refused. The verifier is handed the RUN's binding, never the
    // operator's string, so choosing what to sign is not choosing what it is checked against.
    const wrong = signEditorialSubject("f".repeat(64), "e1", privatePem);
    const forged = approve(
      staged,
      previewed.value,
      runDir,
      {
        actorLabel: "Yvan",
        signoff: { signerId: "yvan", signature: wrong.signature },
      },
      { signers, requiredSigners: ["yvan"] },
    );
    expect(forged.ok).toBe(false);

    // Signed over the binding the run recorded: approved.
    const right = signEditorialSubject(BINDING, "e1", privatePem);
    const r = approve(
      staged,
      previewed.value,
      runDir,
      {
        actorLabel: "Yvan",
        signoff: { signerId: "yvan", signature: right.signature },
      },
      { signers, requiredSigners: ["yvan"] },
    );
    expect(r.ok ? "approved" : `${r.code}: ${r.message}`).toBe("approved");
    if (!r.ok) return;
    const doc = JSON.parse(
      readFileSync(join(runDir, "signoffs", "e1.json"), "utf8"),
    );
    expect(doc.signoff).toEqual({
      signerId: "yvan",
      signature: right.signature,
    });
    expect(doc.artifactSha256).toBe(BINDING);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// capture OPENS THE ADDRESS now — it does not record a gap. An address that cannot be reached is
// therefore a real failure to fix (the element stays on `capture`), never a silent pass and never
// an "unsupported" note that would let an unverified embed reach the approval gate behind an
// override. The domain below does not resolve, on purpose: this asserts WHICH branch runs without
// asserting anything about a live chart, which is the gated proofs' job.
test("capture opens a hosted address instead of recording a gap, and a dead one fails loudly", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-capture-"));
  try {
    writeFileSync(join(runDir, "keep"), "");
    const m = withHostedArtifact();
    (m.elements[0]!.artifact as { url: string }).url =
      "https://splash-hosted-chain-no-such-host.ch/AbCdE/1/";
    const r = await captureStep(m, m.elements[0]!, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("engine-failed");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
}, 60_000);
