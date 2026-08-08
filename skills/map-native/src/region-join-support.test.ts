import { describe, it, expect } from "bun:test";
import {
  ISO_A3_PINNED_JOIN_TYPES,
  isoA3PinnedJoinRefusal,
  isoA3PinnedJoinError,
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

  // MEASURED, not assumed, and now for BOTH members of the set: a us-states dot-density VIDEO
  // produced clean on the prose chain (video-verify.json, 0 violations, revealMeanDiff 203.7),
  // and a us-states CARTOGRAM video produced clean on the LOOP chain (0 violations,
  // revealMeanDiff 198.2, all four states joined in the still) — because the video/scrolly
  // components resolve the key through resolveVideoGeometry. Refusing those would delete a
  // working capability. Both loop callers depend on this staying false: the assembler's
  // cartogram branch asks this exact question (lib/loop/assemble/map-native.ts).
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

// THE PREDICATE ALL THREE CHAINS ASK — the offer (lib/brain/eligibility.ts), the loop's assembler
// (lib/loop/assemble/map-native.ts) and the prose chain's gate (skills/splash/src/validate-gate.ts).
//
// It exists because each of them used to assemble the triple by hand, and that is what let two
// branches of ONE file disagree about ONE fact: the loop's cartogram branch asked about the format
// and its dot-density branch did not, which refused a us-states dot-density video that renders
// correctly (docs/splash/proofs/2026-08-07-dot-density-video-join/). A predicate cannot be
// half-remembered.
describe("isoA3PinnedJoinError", () => {
  it("should refuse the pinned types in the pinned formats, in the shared wording", () => {
    for (const type of ISO_A3_PINNED_JOIN_TYPES)
      for (const format of ["static", "interactive"] as const)
        expect(isoA3PinnedJoinError(type, "us-states", format)).toBe(
          isoA3PinnedJoinRefusal(type, "us-states"),
        );
  });

  // THE THREE EDGES THAT KEEP IT FROM BEING BROADER THAN THE DEFECT. Each one, widened, deletes a
  // capability that works: the first a whole type, the second the ordinary world path, the third
  // every motion build of both types.
  it("should clear a type outside the set, whose components read config.geography.joinKey", () => {
    expect(isoA3PinnedJoinError("choropleth", "us-states", "static")).toBeNull();
  });

  it("should clear the world basemap, the one the pinned key is right for", () => {
    expect(isoA3PinnedJoinError("cartogram", "world", "static")).toBeNull();
  });

  it("should clear video and scrolly, which resolve the key through resolveVideoGeometry", () => {
    for (const type of ISO_A3_PINNED_JOIN_TYPES)
      for (const format of ["video", "scrolly"] as const)
        expect(`${type}/${format}: ${isoA3PinnedJoinError(type, "us-states", format)}`).toBe(
          `${type}/${format}: null`,
        );
  });

  // The OFFER asks this before a build exists, and a run whose geography has not been matched has
  // no pairing to refuse. Answering anything but null here would have the menu refuse forms on a
  // guess — the produce-time guard is the backstop for that gap, deliberately.
  it("should clear an unknown basemap rather than guess at one", () => {
    expect(isoA3PinnedJoinError("cartogram", undefined, "static")).toBeNull();
  });
});
