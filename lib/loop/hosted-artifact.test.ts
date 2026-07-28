// A HOSTED delivery is a thing a run can RECORD.
//
// Datawrapper's `interactive` — chart or map — publishes and hands back a URL and no file at all
// (form "hosted", `files: []`; skills/dw-chart/src/manifest.ts, skills/map-dw/src/manifest.ts).
// The manifest's artifact slot used to require a `path`, so produce() answered `engine-failed: no
// interactive artifact in the delivery` and the URL render() correctly returned was thrown away —
// which cost the loop the whole "Embed" delivery form it publicly promises.
//
// These are the UNGATED halves of that proof: the shape, and every downstream reader's answer to
// an artifact that has no bytes on disk. The end-to-end halves — a real produce() call that
// publishes a chart and records its URL — live in dw-chart-e2e.test.ts / map-dw-e2e.test.ts behind
// SPLASH_DW_E2E, because they cost a network round trip and a real published chart.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertInvariants,
  parseManifest,
  provenanceHash,
  gateStateOf,
  previewCovers,
  isHostedArtifact,
  fileArtifact,
  type RunManifest,
} from "./manifest";
import { previewStep } from "./preview";
import { captureStep } from "./verify";

const HOSTED_URL = "https://datawrapper.dwcdn.net/AbCdE/1/";

function base(): RunManifest {
  return {
    runId: "r-hosted",
    schemaVersion: 4,
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

// NOTHING WAS SHOWN. previewCovers answers on BYTES the journalist was presented; a hosted
// artifact has none, so it must never read as covered — a `false` here is what keeps the approval
// gate from clearing on an artifact nobody looked at.
test("a hosted artifact is never covered by a preview", () => {
  const m = withHostedArtifact();
  expect(previewCovers(m.elements[0]!)).toBe(false);
});

test("preview refuses a hosted artifact by name rather than reading an absent path", () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-preview-"));
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
    const r = previewStep(m, el, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
    expect(r.message.toLowerCase()).toContain("hosted");
    expect(r.message).toContain(HOSTED_URL);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// capture RECORDS THE GAP rather than refusing: the same third answer captureStep already gives a
// format lib/verify cannot cover (video). Refusing would strand the element on `capture` forever;
// skipping would publish it unverified. The recorded gap is what makes review emit its blocking
// `no-capture` finding, which only a written override can pass.
test("capture records an unsupported gap for a hosted artifact instead of opening a file", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-hosted-capture-"));
  try {
    writeFileSync(join(runDir, "keep"), "");
    const m = withHostedArtifact();
    const r = await captureStep(m, m.elements[0]!, runDir);
    expect(r.ok ? "captured" : `${r.code}: ${r.message}`).toBe("captured");
    if (!r.ok) return;
    expect(r.value.capture!.images).toEqual([]);
    expect(r.value.capture!.unsupported!.toLowerCase()).toContain("hosted");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
