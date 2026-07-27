import { describe, it, expect } from "bun:test";
import type { PreviewRecord } from "./types";
import { previewCoversDeliverable } from "./preview";

const HASH = "a".repeat(64);
const OTHER = "b".repeat(64);

function preview(over: Partial<PreviewRecord> = {}): PreviewRecord {
  return {
    deliverablePath: "/run/elements/e1/interactive.html",
    deliverableSha256: HASH,
    presentedAs: "opened",
    presentedAt: "2026-07-26T10:00:00.000Z",
    ...over,
  };
}

describe("previewCoversDeliverable — the journalist saw THESE bytes", () => {
  it("accepts a preview of the current artifact", () => {
    expect(
      previewCoversDeliverable("interactive", preview(), HASH),
    ).toStrictEqual({ ok: true });
  });

  it("refuses a preview of an artifact that has since been re-produced", () => {
    const r = previewCoversDeliverable("interactive", preview(), OTHER);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("stale-preview");
  });

  it("refuses when nothing was previewed at all", () => {
    const r = previewCoversDeliverable("interactive", undefined, HASH);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("preview-not-presented");
  });
});

describe("previewCoversDeliverable — a still is not the interactive (#3)", () => {
  it("REFUSES a png as the preview of an interactive", () => {
    // The exact substitution issue #3 reports: "A review still is also not a substitute
    // for the actual interactive."
    const r = previewCoversDeliverable(
      "interactive",
      preview({ deliverablePath: "/run/elements/e1/review-primary.png" }),
      HASH,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("not-the-deliverable");
    expect(r.detail).toContain(".png");
  });

  it("accepts the html for interactive and for scrolly", () => {
    expect(previewCoversDeliverable("interactive", preview(), HASH).ok).toBe(
      true,
    );
    expect(
      previewCoversDeliverable(
        "scrolly",
        preview({ deliverablePath: "/run/elements/e1/scrolly.html" }),
        HASH,
      ).ok,
    ).toBe(true);
  });

  it("accepts an image for static and an mp4 for video", () => {
    expect(
      previewCoversDeliverable(
        "static",
        preview({ deliverablePath: "/run/elements/e1/static.png" }),
        HASH,
      ).ok,
    ).toBe(true);
    expect(
      previewCoversDeliverable(
        "video",
        preview({ deliverablePath: "/run/elements/e1/video.mp4" }),
        HASH,
      ).ok,
    ).toBe(true);
  });

  it("refuses an html as the preview of a video", () => {
    const r = previewCoversDeliverable(
      "video",
      preview({ deliverablePath: "/run/elements/e1/interactive.html" }),
      HASH,
    );
    expect(r.ok).toBe(false);
  });
});

describe("previewCoversDeliverable — the no-GUI fallback is honest, not free", () => {
  it("accepts a printed path when the environment could not open a viewer", () => {
    expect(
      previewCoversDeliverable(
        "interactive",
        preview({
          presentedAs: "path-printed",
          fallbackReason: "no display server on this host",
        }),
        HASH,
      ).ok,
    ).toBe(true);
  });

  it("refuses a printed path with no reason — that is a skipped preview wearing a record", () => {
    const r = previewCoversDeliverable(
      "interactive",
      preview({ presentedAs: "path-printed" }),
      HASH,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("fallback-unexplained");
  });

  it("accepts an embedded presentation without a reason", () => {
    expect(
      previewCoversDeliverable(
        "interactive",
        preview({ presentedAs: "embedded" }),
        HASH,
      ).ok,
    ).toBe(true);
  });
});
