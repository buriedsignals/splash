import { describe, it, expect } from "bun:test";
import { defaultDestinationsFor } from "./routing";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { VISUAL_FORMATS } from "../core/vocabulary";
import { deliveryGenreFor } from "../core/publishers";

const EVERY_DELIVERY_ID = Object.values(NEWSROOM_CAPABILITIES)
  .filter((c) => c.kind === "delivery")
  .map((c) => c.id);

describe("defaultDestinationsFor", () => {
  it("should hand a static image over as a package even when a host is ready", () => {
    expect(defaultDestinationsFor("static", EVERY_DELIVERY_ID)).toEqual([
      "zip",
    ]);
  });

  it("should hand a video over as a package even when a host is ready", () => {
    expect(defaultDestinationsFor("video", EVERY_DELIVERY_ID)).toEqual(["zip"]);
  });

  it("should host an interactive when a hosted destination is ready", () => {
    expect(defaultDestinationsFor("interactive", ["embed-cloudflare"])).toEqual(
      ["embed-cloudflare"],
    );
  });

  it("should fall back to the portable package when no host is ready", () => {
    expect(defaultDestinationsFor("scrolly", [])).toEqual(["zip"]);
    expect(defaultDestinationsFor("interactive", ["zip"])).toEqual(["zip"]);
  });

  it("should never answer with nothing, for any format", () => {
    for (const f of VISUAL_FORMATS) {
      expect(defaultDestinationsFor(f, []).length).toBeGreaterThan(0);
      expect(defaultDestinationsFor(f, EVERY_DELIVERY_ID).length).toBe(1);
    }
  });

  // The drift guard: whatever the set of ready destinations, a file genre never routes to a
  // hosted one by DEFAULT. An explicit choice still can (that legality lives in deliver()).
  it("should never default a file genre to a hosted destination", () => {
    for (const f of VISUAL_FORMATS) {
      if (deliveryGenreFor(f) !== "file") continue;
      expect(defaultDestinationsFor(f, EVERY_DELIVERY_ID)).toEqual(["zip"]);
    }
  });

  it("should respect HOSTED_PREFERENCE order, not the caller's order", () => {
    // Ready ids passed in reverse preference order: prefer embed-cms (first in array),
    // not embed-s3 (first in the caller's list).
    expect(
      defaultDestinationsFor("interactive", ["embed-s3", "embed-cms"]),
    ).toEqual(["embed-cms"]);
    // Verify the preference order holds for other pairs.
    expect(
      defaultDestinationsFor("scrolly", ["embed-fly", "embed-cloudflare"]),
    ).toEqual(["embed-cloudflare"]);
  });
});
