import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture, SIZE_TOLERANCE_PX } from "./capture";
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
