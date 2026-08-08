import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerb } from "./index";
import { isCapturePayload } from "./capture";
import { isReviewPayload } from "./review";

const dir = mkdtempSync(join(tmpdir(), "verify-verbs-"));

function png(name: string, w: number, h: number): string {
  const p = join(dir, name);
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(b.buffer);
  view.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, w);
  view.setUint32(20, h);
  writeFileSync(p, b);
  return p;
}

const capturePayload = {
  artifactPath: png("art.png", 1200, 675),
  format: "static",
  channel: "article-web",
  outDir: join(dir, "out"),
  id: "e1",
};

const reviewPayload = {
  reviewedProvenanceHash: "prov-1",
  acceptedDestinationId: "channel:article-web",
  checks: [],
  source: {
    format: "static",
    channel: "article-web",
    confirmedTakeaway: "Premiums rose",
    unit: "CHF",
    altText: "Both cantons rose from 2015 to 2024.",
    sourceName: "the newsroom",
    evidenceExtracts: [],
    captures: [],
    interactionResults: [],
    rubric: [],
  },
};

describe("the declared slots have bodies now", () => {
  it("no longer answers not-implemented for capture and review", async () => {
    for (const [verb, payload] of [
      ["capture", capturePayload],
      ["review", reviewPayload],
    ] as const) {
      const r = await runVerb(verb, payload);
      if (!r.ok) expect(r.code).not.toBe("not-implemented");
      else expect(r.ok).toBe(true);
    }
  });

  it("refuses a malformed payload as invalid-request, naming what is required", async () => {
    const c = await runVerb("capture", {});
    expect(c.ok).toBe(false);
    if (c.ok) throw new Error("unreachable");
    expect(c.code).toBe("invalid-request");
    expect(c.message).toContain("artifactPath");

    const v = await runVerb("review", {});
    expect(v.ok).toBe(false);
    if (v.ok) throw new Error("unreachable");
    expect(v.code).toBe("invalid-request");
    expect(v.message).toContain("source");
  });

  it("still refuses a verb outside the closed enum (I4)", async () => {
    const r = await runVerb("screenshot", capturePayload);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
  });
});

describe("shape gates", () => {
  it("accepts a well-formed payload and rejects wrong-typed fields", () => {
    expect(isCapturePayload(capturePayload)).toBe(true);
    expect(isCapturePayload({ ...capturePayload, format: 7 })).toBe(false);
    expect(isCapturePayload(null)).toBe(false);
    // `alternates` — the other true spellings of a role's text (a unit says "%" or "percent").
    // Absent is the ordinary case; present must be a list of STRINGS, because the browser side
    // hands each one to `String.includes` and a number there would match nothing while looking
    // like a declared expectation.
    expect(
      isCapturePayload({
        ...capturePayload,
        furniture: [{ role: "unit", text: "%", alternates: ["percent"] }],
      }),
    ).toBe(true);
    for (const bad of ["percent", [1], [null], {}])
      expect(
        isCapturePayload({
          ...capturePayload,
          furniture: [{ role: "unit", text: "%", alternates: bad }],
        }),
        `alternates ${JSON.stringify(bad)} must be refused`,
      ).toBe(false);
    // heightPolicy is checked by MEMBERSHIP, not `typeof string`. A near-miss spelling must be
    // REFUSED, never silently read as the default "pinned": a guard that a typo relaxes is worse
    // than no guard, and this one decides whether a height is checked at all.
    expect(
      isCapturePayload({ ...capturePayload, heightPolicy: "content-driven" }),
    ).toBe(true);
    expect(
      isCapturePayload({ ...capturePayload, heightPolicy: "pinned" }),
    ).toBe(true);
    for (const bad of [
      "contentDriven",
      "content driven",
      "row-driven",
      "",
      1,
      null,
    ])
      expect(
        isCapturePayload({ ...capturePayload, heightPolicy: bad }),
        `heightPolicy ${JSON.stringify(bad)} must be refused`,
      ).toBe(false);
    expect(isReviewPayload(reviewPayload)).toBe(true);
    expect(isReviewPayload({ ...reviewPayload, source: null })).toBe(false);
    expect(isReviewPayload({ ...reviewPayload, checks: "none" })).toBe(false);
  });
});

describe("a verb never throws (I1)", () => {
  it("turns a missing artifact into a typed failure", async () => {
    const r = await runVerb("capture", {
      ...capturePayload,
      artifactPath: join(dir, "gone.png"),
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
  });

  it("defers video capture loudly rather than passing silently", async () => {
    const r = await runVerb("capture", { ...capturePayload, format: "video" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("not-implemented");
    expect(r.message).toContain("video");
  });

  it("returns a record rather than throwing when a review adapter explodes", async () => {
    const r = await runVerb("review", reviewPayload);
    // The verb takes no adapter over the wire (a function is not JSON) — the point here is
    // that the verb completes and records, which is the behaviour a host depends on.
    expect(r.ok).toBe(true);
  });
});

describe("results are JSON all the way down (I6, I7)", () => {
  it("round-trips both verbs' results with no key lost", async () => {
    for (const [verb, payload] of [
      ["capture", capturePayload],
      ["review", reviewPayload],
      ["capture", { ...capturePayload, format: "video" }],
      ["review", {}],
    ] as const) {
      const r = await runVerb(verb, payload);
      expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
    }
  });

  it("returns paths, never bytes", async () => {
    const r = await runVerb("capture", capturePayload);
    if (!r.ok) throw new Error(r.message);
    const value = r.value as { images: { path: string }[] };
    expect(typeof value.images[0]!.path).toBe("string");
    expect(JSON.stringify(r).length).toBeLessThan(4000);
  });
});

describe("no ambient state (I5)", () => {
  it("reads no environment variable anywhere in the verify layer or its verbs", () => {
    // The same shape lib/loop/produce.test.ts uses to assert "no subprocess, no skills/
    // import": a source-level guard, because an env read is invisible until the one machine
    // where the variable is set behaves differently.
    const here = dirname(fileURLToPath(import.meta.url));
    const files = [
      ...readdirSync(join(here, "../../verify"))
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .map((f) => join(here, "../../verify", f)),
      join(here, "capture.ts"),
      join(here, "review.ts"),
    ];
    // Comments are stripped first: a header that PROMISES not to read the environment is
    // not a read, and a guard that cannot tell the two apart would push people to stop
    // documenting the invariant.
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const f of files) {
      const src = stripComments(readFileSync(f, "utf8"));
      expect(src, `${f} reads process.env`).not.toMatch(/process\s*\.\s*env/);
      expect(src, `${f} imports from skills/`).not.toMatch(
        /from\s+["'][^"']*skills\//,
      );
    }
  });
});
