// The approval gate, and its relationship with the Ed25519 editorial sign-off.
//
// approveElement (lib/loop/manifest.ts) has been the only sanctioned writer of `approved`
// since the verify layer landed, and nothing outside a test ever called it. This module is the
// caller — and it is also where the question "one approval concept or two?" is answered:
// `approved` says WHAT was approved, the signature says WHO approved it, and when a newsroom
// declares requiredSigners no approval can be written without a verified signature over the
// exact artifact bytes. There is one writer, one record, two strengths.
import { beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { editorialPayload } from "../../skills/splash/src/editorial-signoff";
import { freezeInput } from "./freeze";
import { produce } from "./produce";
import { previewStep } from "./preview";
import { captureStep, reviewStep } from "./verify";
import { approve } from "./approve";
import {
  approvalCovers,
  provenanceHash,
  writeManifest,
  type RunElement,
  type RunManifest,
} from "./manifest";
import type { Finding, ReviewRecord } from "../verify/types";

const NO_VIEWER = { SPLASH_NO_VIEWER: "1" };
const NO_SIGNERS = { signers: [], requiredSigners: [] };

let runDir: string;
let run: RunManifest;
let ready: RunElement;

beforeAll(async () => {
  runDir = mkdtempSync(join(tmpdir(), "loop-approve-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  run = {
    runId: "approve-gate",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
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
          altInsight: "The adult premium rose in both cantons, 2015 to 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static" as const,
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const produced = await produce(run, run.elements[0]!, runDir);
  if (!produced.ok) throw new Error(produced.message);
  const captured = await captureStep(
    { ...run, elements: [produced.value] },
    produced.value,
    runDir,
  );
  if (!captured.ok) throw new Error(captured.message);
  const reviewed = await reviewStep(
    { ...run, elements: [captured.value] },
    captured.value,
    runDir,
  );
  if (!reviewed.ok) throw new Error(reviewed.message);
  const previewed = previewStep(
    { ...run, elements: [reviewed.value] },
    reviewed.value,
    runDir,
    { env: NO_VIEWER },
  );
  if (!previewed.ok) throw new Error(previewed.message);
  ready = previewed.value;
  run = { ...run, elements: [ready] };
}, 300_000);

/** The element with one extra finding on its review — the shape a defect produces. */
function withFinding(el: RunElement, finding: Finding): RunElement {
  const review = el.review as ReviewRecord;
  return {
    ...el,
    review: { ...review, findings: [...review.findings, finding] },
  };
}

const blocking: Finding = {
  id: "source-missing",
  criterion: "source",
  severity: "blocking",
  status: "open",
  summary: "the visual carries no source attribution",
  evidence: [],
  provenance: "mechanical",
};
const warning: Finding = {
  id: "unit-missing",
  criterion: "craft",
  severity: "warning",
  status: "open",
  summary: "the visual states no unit for its numbers",
  evidence: [],
  provenance: "mechanical",
};

describe("approve — the ceremony", () => {
  it("writes the approval and a sign-off document that exists on disk", () => {
    const result = approve(
      run,
      ready,
      runDir,
      { actorLabel: "Yvan" },
      NO_SIGNERS,
    );
    if (!result.ok) throw new Error(result.message);
    const approved = result.value.approved!;
    expect(approved.approvedProvenanceHash).toBe(provenanceHash(run, ready));
    expect(approvalCovers(run, result.value)).toBe(true);

    const doc = JSON.parse(
      readFileSync(join(runDir, approved.signoffPath), "utf8"),
    );
    expect(existsSync(join(runDir, approved.signoffPath))).toBe(true);
    expect(doc).toMatchObject({
      elementId: "e1",
      artifactSha256: ready.artifact!.sha256,
      approvedProvenanceHash: provenanceHash(run, ready),
      actorLabel: "Yvan",
      independentSemanticReview: "unavailable",
    });
    // The lane no machine grades is written into the document the human signs, rather than
    // vanishing into a field nobody reads back.
    expect(Array.isArray(doc.needsHumanEye)).toBe(true);
  });

  it("the approved element is writable — it satisfies the manifest's own invariants", () => {
    const result = approve(run, ready, runDir, {}, NO_SIGNERS);
    if (!result.ok) throw new Error(result.message);
    expect(() =>
      writeManifest(join(runDir, "run.json"), {
        ...run,
        elements: [result.value],
      }),
    ).not.toThrow();
  });

  it("refuses an artifact nobody has been shown", () => {
    const { preview: _preview, ...review } = ready.review as ReviewRecord;
    const unshown: RunElement = { ...ready, review };
    const result = approve(
      { ...run, elements: [unshown] },
      unshown,
      runDir,
      {},
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("preview-not-presented");
  });

  it("refuses an artifact nobody has reviewed", () => {
    const { review: _review, ...unreviewed } = ready;
    const result = approve(
      { ...run, elements: [unreviewed] },
      unreviewed,
      runDir,
      {},
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("not-reviewed");
  });
});

describe("approve — findings, overrides and acknowledgements (#11)", () => {
  it("refuses while a blocking finding is open", () => {
    const el = withFinding(ready, blocking);
    const result = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      {},
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("blocking-findings-open");
      expect(result.message).toContain("source-missing");
    }
  });

  it("an override with a reason clears it, bound to these bytes by the spine", () => {
    const el = withFinding(ready, blocking);
    const result = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      {
        actorLabel: "Rinny",
        overrides: [
          {
            findingId: "source-missing",
            reason: "the source line is set in the CMS",
          },
        ],
      },
      NO_SIGNERS,
    );
    if (!result.ok) throw new Error(result.message);
    const recorded = (result.value.review as ReviewRecord).overrides[0]!;
    // The host supplies the id and the reason. WHICH bytes and WHICH provenance the override
    // covers are the spine's to write — an override cannot claim to be about another artifact.
    expect(recorded).toMatchObject({
      findingId: "source-missing",
      actorLabel: "Rinny",
      artifactSha256: ready.artifact!.sha256,
      provenanceHash: provenanceHash(run, ready),
    });
    expect(recorded.at.length).toBeGreaterThan(0);
    expect(
      (result.value.review as ReviewRecord).findings.find(
        (f) => f.id === "source-missing",
      )!.status,
    ).toBe("overridden");
  });

  it("refuses an override with a blank reason", () => {
    const el = withFinding(ready, blocking);
    const result = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      {
        actorLabel: "Rinny",
        overrides: [{ findingId: "source-missing", reason: "   " }],
      },
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/reason/i);
  });

  it("refuses an override with no actor", () => {
    const el = withFinding(ready, blocking);
    const result = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      {
        overrides: [{ findingId: "source-missing", reason: "set in the CMS" }],
      },
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/actor/i);
  });

  it("refuses an override for a finding the review does not carry", () => {
    const result = approve(
      run,
      ready,
      runDir,
      {
        actorLabel: "Rinny",
        overrides: [{ findingId: "invented-defect", reason: "because" }],
      },
      NO_SIGNERS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("invented-defect");
  });

  it("a warning asks for acknowledgement, not the override ceremony", () => {
    const el = withFinding(ready, warning);
    const refused = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      {},
      NO_SIGNERS,
    );
    expect(refused.ok).toBe(false);
    if (!refused.ok)
      expect(refused.message).toContain("warnings-unacknowledged");

    const acknowledged = approve(
      { ...run, elements: [el] },
      el,
      runDir,
      { acknowledged: ["unit-missing"] },
      NO_SIGNERS,
    );
    expect(acknowledged.ok).toBe(true);
  });
});

describe("approve — the Ed25519 sign-off is the identity proof INSIDE the approval", () => {
  const editor = generateKeyPairSync("ed25519");
  const publicKey = editor.publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const signers = {
    signers: [{ id: "yvan", publicKey }],
    requiredSigners: ["yvan"],
  };

  function signatureOver(elementId: string, sha256hex: string): string {
    return cryptoSign(
      null,
      Buffer.from(editorialPayload(elementId, sha256hex), "utf8"),
      editor.privateKey,
    ).toString("base64");
  }

  it("refuses to write an approval at all when the newsroom requires a signature and none is given", () => {
    const result = approve(run, ready, runDir, { actorLabel: "Yvan" }, signers);
    expect(result.ok).toBe(false);
    // The whole point: without this, an unsigned approval would satisfy deliver()'s
    // requiredSigners gate and turn a cryptographic requirement into a formality.
    if (!result.ok) expect(result.message).toMatch(/sign/i);
  });

  it("accepts a real signature over the exact artifact bytes, and records it", () => {
    const result = approve(
      run,
      ready,
      runDir,
      {
        actorLabel: "Yvan Pandelé",
        signoff: {
          signerId: "yvan",
          signature: signatureOver("e1", ready.artifact!.sha256),
        },
      },
      signers,
    );
    if (!result.ok) throw new Error(result.message);
    const doc = JSON.parse(
      readFileSync(join(runDir, result.value.approved!.signoffPath), "utf8"),
    );
    expect(doc.signoff).toMatchObject({ signerId: "yvan" });
    expect(doc.signoff.signature.length).toBeGreaterThan(0);
  });

  it("refuses a signature over other bytes", () => {
    const result = approve(
      run,
      ready,
      runDir,
      {
        actorLabel: "Yvan",
        signoff: {
          signerId: "yvan",
          signature: signatureOver("e1", "0".repeat(64)),
        },
      },
      signers,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/signature/i);
  });

  it("refuses a signer this newsroom does not require", () => {
    const result = approve(
      run,
      ready,
      runDir,
      {
        actorLabel: "Someone",
        signoff: {
          signerId: "rinny",
          signature: signatureOver("e1", ready.artifact!.sha256),
        },
      },
      signers,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("rinny");
  });
});
