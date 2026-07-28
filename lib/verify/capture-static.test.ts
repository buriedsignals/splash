import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  capture,
  CONTENT_HEIGHT_LIMIT_MULTIPLE,
  SIZE_TOLERANCE_PX,
} from "./capture";
import type { CaptureCheck } from "./types";

function ihdrPng(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(b.buffer);
  view.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return b;
}

const dir = mkdtempSync(join(tmpdir(), "verify-capture-static-"));

function staticPngAt(name: string, w: number, h: number): string {
  const p = join(dir, name);
  writeFileSync(p, ihdrPng(w, h));
  return p;
}

function check(
  checks: CaptureCheck[],
  id: CaptureCheck["id"],
): CaptureCheck | undefined {
  return checks.find((c) => c.id === id);
}

describe("capture — a static deliverable IS its own review image", () => {
  it("records one primary image with the artifact's real hash and size", async () => {
    const artifactPath = staticPngAt("ok.png", 1200, 675);
    const r = await capture({
      artifactPath,
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-ok"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images).toHaveLength(1);
    const img = r.value.images[0]!;
    expect(img.breakpoint).toBe("primary");
    expect(img.path).toBe(artifactPath);
    expect(img.cssViewport).toStrictEqual({ width: 1200, height: 675 });
    expect(img.rootBox).toStrictEqual({ x: 0, y: 0, width: 1200, height: 675 });
    expect(img.destinationId).toBe("channel:article-web");
    expect(img.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(img.sha256).toBe(img.artifactSha256);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("pass");
    expect(check(r.value.checks, "capture:fits-viewport")?.outcome).toBe(
      "pass",
    );
  });

  it("accepts the engines' real one-pixel rounding, the same tolerance produce already allows", async () => {
    // Measured, not assumed: a real loop-produced article-web static.png is 1200x676
    // against a 1200x675 channel size. skills/splash/src/channel.ts:66 already ships a
    // 2px tolerance for exactly this; a stricter gate here would fail a correct artifact.
    const r = await capture({
      artifactPath: staticPngAt("rounded.png", 1200, 676),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rounded"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(SIZE_TOLERANCE_PX).toBe(2);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("pass");
  });

  it("records a device-scaled render at its integer scale rather than calling it wrong", async () => {
    const r = await capture({
      artifactPath: staticPngAt("dpr2.png", 2400, 1350),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-dpr"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.deviceScaleFactor).toBe(2);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("pass");
  });

  it("FAILS a still whose size is not the destination's — with both sizes in the detail", async () => {
    const r = await capture({
      artifactPath: staticPngAt("small.png", 800, 450),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-small"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    const c = check(r.value.checks, "capture:size-matches-destination");
    expect(c?.outcome).toBe("fail");
    expect(c?.detail).toContain("800x450");
    expect(c?.detail).toContain("1200x675");
  });

  it("says WHY it read no title, instead of inventing one from the commissioned text", async () => {
    // A png has no DOM. Reading a title out of it would mean OCR — a layer of uncertainty
    // nothing in the record accounts for — and copying `angle.confirmedTakeaway` in as a
    // stand-in would make the divergence detector compare a string with itself: guaranteed
    // silence, presented as having looked. The honest answer is an absent title and a
    // recorded reason.
    const r = await capture({
      artifactPath: staticPngAt("titleless.png", 1200, 675),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-title"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.titleSource).toBe("static-image");
    expect(r.value.images[0]!.renderedTitle).toBeUndefined();
    expect("renderedTitle" in r.value.images[0]!).toBe(false);
  });

  it("follows the channel: a social-vertical static is checked against 1080x1920", async () => {
    const r = await capture({
      artifactPath: staticPngAt("landscape-on-vertical.png", 1200, 675),
      format: "static",
      channel: "social-vertical",
      outDir: join(dir, "out-vertical"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("fail");
  });
});

// A deliverable whose HEIGHT follows its content, not its box. Measured, not hypothetical: a
// 3-row Datawrapper bar chart delivered 1200x600 against article-web's 1200x675, because pinning
// the height of a row-driven export makes Datawrapper CROP the rows that overflow — silent data
// loss (skills/dw-chart/src/export-aspect.ts ROW_DRIVEN_TYPES). The artifact is correct; the
// check read it as a mismatch, and the loop answered by refusing to offer nine chart types.
//
// The policy is DECLARED by the caller, never inferred here: which types grow with their rows is
// an engine fact, and a list of type names inside lib/verify would be that fact's second, driftable
// home. Absent ⇒ "pinned", so every existing caller is unchanged.
describe("capture — a content-driven height is measured on its width alone", () => {
  it("PASSES a row-driven export that is the destination's width at its own height", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven.png", 1200, 600),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const c = check(r.value.checks, "capture:size-matches-destination");
    expect(c?.outcome).toBe("pass");
    // The relaxation must be READABLE in the evidence, not silent: the detail says the height
    // was not held to the box, and the record carries the policy it was measured under.
    expect(c?.detail).toContain("content-driven");
    expect(r.value.images[0]!.heightPolicy).toBe("content-driven");
    expect(check(r.value.checks, "capture:fits-viewport")?.outcome).toBe(
      "pass",
    );
  });

  it("PASSES a many-row export that is TALLER than the box it publishes into", async () => {
    // The other direction of the same fact: a 45-row bar chart grows past the container, and the
    // container grows with it. Held to the box, this correct artifact would fail twice — once as
    // a size mismatch and once as an overflow.
    const r = await capture({
      artifactPath: staticPngAt("row-driven-tall.png", 1200, 3000),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-tall"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("pass");
    expect(check(r.value.checks, "capture:fits-viewport")?.outcome).toBe(
      "pass",
    );
  });

  it("FAILS a row-driven export whose WIDTH is wrong — only the height is forgiven", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven-narrow.png", 1000, 600),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-narrow"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const c = check(r.value.checks, "capture:size-matches-destination");
    expect(c?.outcome).toBe("fail");
    expect(c?.detail).toContain("1000");
    expect(c?.detail).toContain("1200");
  });

  it("FAILS a row-driven export that is WIDER than its destination", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven-wide.png", 1600, 600),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-wide"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("fail");
    expect(check(r.value.checks, "capture:fits-viewport")?.outcome).toBe(
      "fail",
    );
  });

  it("FAILS the SAME image under the default policy — the relaxation is opt-in, not the new rule", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven.png", 1200, 600),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-default"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("fail");
    expect(r.value.images[0]!.heightPolicy).toBeUndefined();
    expect("heightPolicy" in r.value.images[0]!).toBe(false);
  });

  it("FAILS a pinned deliverable on EITHER axis", async () => {
    for (const [w, h] of [
      [1200, 900],
      [900, 675],
    ] as const) {
      const r = await capture({
        artifactPath: staticPngAt(`pinned-${w}x${h}.png`, w, h),
        format: "static",
        channel: "article-web",
        outDir: join(dir, `out-pinned-${w}x${h}`),
        id: "e1",
        heightPolicy: "pinned",
      });
      if (!r.ok) throw new Error(r.message);
      expect(
        check(r.value.checks, "capture:size-matches-destination")?.outcome,
      ).toBe("fail");
    }
  });

  it("reads the device scale off the WIDTH when the height is content-driven", async () => {
    // A 2x row-driven export: no integer scale explains BOTH axes, so a rule that demands both
    // would record a 2x image as scale 1 and then measure it against the wrong box.
    const r = await capture({
      artifactPath: staticPngAt("row-driven-2x.png", 2400, 1400),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-2x"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.value.images[0]!.deviceScaleFactor).toBe(2);
    expect(r.value.images[0]!.rootBox).toStrictEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 700,
    });
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("pass");
  });

  // A content-driven artifact still has a CEILING — what it does not have is the box's exact
  // height. Without one, a 500-row export from a data bug would sail through with no signal at
  // all, which is not what "the height belongs to the content" was meant to buy. This is its own
  // named check, not a re-tightening of the leg the policy relaxes: the two say different things,
  // and a journalist reading "this is far taller than the space it publishes into" is being told
  // something true and actionable, where "size mismatch" would be false.
  it("PASSES a legitimately tall row-driven export — a long ranking is a real chart", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven-long.png", 1200, 3000),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-long"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    expect(check(r.value.checks, "capture:height-within-bound")?.outcome).toBe(
      "pass",
    );
  });

  it("FAILS an absurd export — the ceiling scales with the channel, so it is not a pixel count", async () => {
    // 1200x30000 against a 675-high box: 44x. The shape a runaway row count really produces.
    const r = await capture({
      artifactPath: staticPngAt("row-driven-runaway.png", 1200, 30000),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-runaway"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!r.ok) throw new Error(r.message);
    const c = check(r.value.checks, "capture:height-within-bound");
    expect(c?.outcome).toBe("fail");
    // The detail must say how far out it is and what the ceiling was, or the finding is a
    // verdict with nothing behind it.
    expect(c?.detail).toContain("30000");
    expect(c?.detail).toContain(String(CONTENT_HEIGHT_LIMIT_MULTIPLE));
  });

  it("puts the ceiling exactly where it says it does", async () => {
    const limit = 675 * CONTENT_HEIGHT_LIMIT_MULTIPLE;
    const at = await capture({
      artifactPath: staticPngAt("row-driven-at-limit.png", 1200, limit),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-at-limit"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!at.ok) throw new Error(at.message);
    expect(check(at.value.checks, "capture:height-within-bound")?.outcome).toBe(
      "pass",
    );

    const past = await capture({
      artifactPath: staticPngAt("row-driven-past-limit.png", 1200, limit + 100),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-past-limit"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!past.ok) throw new Error(past.message);
    expect(
      check(past.value.checks, "capture:height-within-bound")?.outcome,
    ).toBe("fail");
  });

  it("does NOT bound a PINNED artifact — its height is already checked exactly", async () => {
    // size-matches-destination pins that height to ±2px. A second height check on the same
    // number would file one defect twice, which is the failure furnitureChecks already avoids.
    const r = await capture({
      artifactPath: staticPngAt("pinned-tall.png", 1200, 30000),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-pinned-tall"),
      id: "e1",
    });
    if (!r.ok) throw new Error(r.message);
    expect(
      check(r.value.checks, "capture:height-within-bound"),
    ).toBeUndefined();
    expect(
      check(r.value.checks, "capture:size-matches-destination")?.outcome,
    ).toBe("fail");
  });

  it("follows the CHANNEL, not a hard-coded pixel count", async () => {
    // ONE image, two destinations: 15000px is 13.9x a square feed post's 1080 box and 7.8x a
    // 1920-high vertical one. A ceiling written in pixels could not tell those apart, which is
    // the whole reason it is a multiple of the destination.
    const png = staticPngAt("row-driven-1080x15000.png", 1080, 15000);
    const feed = await capture({
      artifactPath: png,
      format: "static",
      channel: "social-feed", // 1080x1080
      outDir: join(dir, "out-rowdriven-feed"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!feed.ok) throw new Error(feed.message);
    expect(
      check(feed.value.checks, "capture:height-within-bound")?.outcome,
    ).toBe("fail");

    const vertical = await capture({
      artifactPath: png,
      format: "static",
      channel: "social-vertical", // 1080x1920 — a taller box, and the same image is inside it
      outDir: join(dir, "out-rowdriven-vertical"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    if (!vertical.ok) throw new Error(vertical.message);
    expect(
      check(vertical.value.checks, "capture:height-within-bound")?.outcome,
    ).toBe("pass");
  });

  it("survives JSON.parse(JSON.stringify(result)) with the policy intact", async () => {
    const r = await capture({
      artifactPath: staticPngAt("row-driven-json.png", 1200, 600),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-rowdriven-json"),
      id: "e1",
      heightPolicy: "content-driven",
    });
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  });
});

describe("capture — a verb never throws (I1) and always round-trips (I6)", () => {
  it("reports a missing artifact as a typed failure", async () => {
    const r = await capture({
      artifactPath: join(dir, "does-not-exist.png"),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-missing"),
      id: "e1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message).toContain("does-not-exist.png");
  });

  it("reports a non-image static deliverable rather than guessing its size", async () => {
    const p = join(dir, "not-an-image.png");
    writeFileSync(p, "<html>nope</html>");
    const r = await capture({
      artifactPath: p,
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-nonimage"),
      id: "e1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message.toLowerCase()).toContain("png");
  });

  it("refuses an unsafe id before it resolves any path", async () => {
    const r = await capture({
      artifactPath: staticPngAt("safe.png", 1200, 675),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-unsafe"),
      id: "../../escape",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
  });

  it("defers video capture with a typed refusal, never a silent pass", async () => {
    const r = await capture({
      artifactPath: staticPngAt("video-placeholder.png", 1200, 675),
      format: "video",
      channel: "article-web",
      outDir: join(dir, "out-video"),
      id: "e1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("not-implemented");
    expect(r.message).toContain("video");
  });

  it("survives JSON.parse(JSON.stringify(result)) with no key lost", async () => {
    const r = await capture({
      artifactPath: staticPngAt("json.png", 1200, 675),
      format: "static",
      channel: "article-web",
      outDir: join(dir, "out-json"),
      id: "e1",
    });
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  });
});
