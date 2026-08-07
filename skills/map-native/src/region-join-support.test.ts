import { describe, it, expect } from "bun:test";
import {
  ISO_A3_PINNED_JOIN_TYPES,
  isoA3PinnedJoinRefusal,
  isoA3PinnedInFormat,
  adm1UnmatchedTypeRefusal,
} from "./region-join-support";

// The two facts this module owns, both measured on real produce runs (2026-08-07) — see the
// module's own header for the run transcript. These tests pin the FACTS, not the prose.

describe("ISO_A3_PINNED_JOIN_TYPES", () => {
  it("should name exactly the two types whose static/interactive components pin the join key", () => {
    expect([...ISO_A3_PINNED_JOIN_TYPES].sort()).toEqual([
      "cartogram",
      "dot-density",
    ]);
  });

  it("should NOT name choropleth, whose components read config.geography.joinKey", () => {
    expect(ISO_A3_PINNED_JOIN_TYPES.has("choropleth")).toBe(false);
  });

  it("should NOT name route, which has no per-row region join at all", () => {
    expect(ISO_A3_PINNED_JOIN_TYPES.has("route")).toBe(false);
  });
});

describe("isoA3PinnedInFormat", () => {
  it("should hold for the two formats whose components pin the key (static, interactive)", () => {
    expect(isoA3PinnedInFormat("static")).toBe(true);
    expect(isoA3PinnedInFormat("interactive")).toBe(true);
  });

  // MEASURED, not assumed: a us-states dot-density VIDEO produced clean on the prose chain
  // (video-verify.json, 0 violations, revealMeanDiff 203.7) because the video/scrolly
  // components resolve the key through resolveVideoGeometry. Refusing those would delete a
  // working capability.
  it("should NOT hold for video or scrolly, which resolve the key from config.geography", () => {
    expect(isoA3PinnedInFormat("video")).toBe(false);
    expect(isoA3PinnedInFormat("scrolly")).toBe(false);
  });
});

describe("isoA3PinnedJoinRefusal", () => {
  it("should name the type, the basemap and the silently-wrong outcome", () => {
    const sentence = isoA3PinnedJoinRefusal("dot-density", "us-states");
    expect(sentence).toContain("dot-density");
    expect(sentence).toContain("us-states");
    expect(sentence).toContain("silently wrong rather than merely fail");
  });

  it("should be ONE wording across the two types — only the type and basemap differ", () => {
    const a = isoA3PinnedJoinRefusal("dot-density", "us-states");
    const b = isoA3PinnedJoinRefusal("cartogram", "natural-earth-admin-1");
    const skeleton = (s: string) =>
      s
        .replace(/dot-density|cartogram/g, "<type>")
        .replace(/us-states|natural-earth-admin-1/g, "<basemap>");
    expect(skeleton(a)).toBe(skeleton(b));
  });
});

describe("adm1UnmatchedTypeRefusal", () => {
  it("should say what the journalist can do, and never send them to a step this chain lacks", () => {
    const sentence = adm1UnmatchedTypeRefusal("dot-density");
    expect(sentence).toContain("dot-density");
    expect(sentence).toContain("choropleth");
    // The whole point: the resolver's fallback throw says "re-run the geography match
    // (orient)", and the prose chain has no orient step. This refusal must never repeat it.
    expect(sentence).not.toContain("orient");
  });
});
