import { describe, it, expect } from "bun:test";
import { CHANNEL_POLICY } from "../core/channel-policy";
import type { DestinationProfile } from "./types";
import {
  DEFAULT_DEVICE_SCALE_FACTOR,
  NARROW_WIDTH,
  WIDE_WIDTH,
  destinationIdFor,
  resolveTargets,
} from "./viewport";

describe("resolveTargets — an aspect-pinned format has ONE real size", () => {
  it("captures a static article-web deliverable at the channel's own media size", () => {
    const t = resolveTargets("article-web", "static");
    expect(t).toHaveLength(1);
    expect(t[0]!.breakpoint).toBe("primary");
    expect(t[0]!.cssViewport).toStrictEqual(
      CHANNEL_POLICY["article-web"].mediaSize,
    );
  });

  it("follows the channel, not a universal rectangle", () => {
    expect(
      resolveTargets("social-vertical", "static")[0]!.cssViewport,
    ).toStrictEqual({ width: 1080, height: 1920 });
    expect(
      resolveTargets("social-feed", "static")[0]!.cssViewport,
    ).toStrictEqual({ width: 1080, height: 1080 });
  });

  it("gives video the same single pinned size — it has no breakpoints to pretend about", () => {
    const t = resolveTargets("social-feed", "video");
    expect(t).toHaveLength(1);
    expect(t[0]!.cssViewport.width).toBe(1080);
  });
});

describe("resolveTargets — a responsive format is checked at three real breakpoints", () => {
  it("checks narrow, primary and wide for an interactive", () => {
    const t = resolveTargets("article-web", "interactive");
    expect(t.map((x) => x.breakpoint)).toStrictEqual([
      "narrow",
      "primary",
      "wide",
    ]);
    expect(t[0]!.cssViewport.width).toBe(NARROW_WIDTH);
    expect(t[1]!.cssViewport.width).toBe(
      CHANNEL_POLICY["article-web"].mediaSize.width,
    );
    expect(t[2]!.cssViewport.width).toBe(WIDE_WIDTH);
  });

  it("treats scrolly the same way", () => {
    expect(resolveTargets("article-web", "scrolly")).toHaveLength(3);
  });
});

describe("resolveTargets — the newsroom's own embed contract wins", () => {
  // Issue #10, verbatim: "Avoid assuming one universal 'article web' rectangle: the
  // newsroom delivery profile should supply its real embed width/height or responsive
  // contract."
  const profile: DestinationProfile = {
    id: "heidi-article-embed",
    primary: { width: 660, height: 480 },
    narrow: { width: 320, height: 480 },
    wide: { width: 1280, height: 720 },
    deviceScaleFactor: 3,
  };

  it("uses the profile's real embed box instead of the channel default", () => {
    const t = resolveTargets("article-web", "interactive", profile);
    expect(t.map((x) => x.cssViewport.width)).toStrictEqual([320, 660, 1280]);
    expect(t.every((x) => x.deviceScaleFactor === 3)).toBe(true);
  });

  it("falls back per-breakpoint when the profile only pins the primary container", () => {
    const t = resolveTargets("article-web", "interactive", {
      id: "cms",
      primary: { width: 700, height: 500 },
    });
    expect(t.map((x) => x.cssViewport.width)).toStrictEqual([
      NARROW_WIDTH,
      700,
      WIDE_WIDTH,
    ]);
    expect(t[1]!.deviceScaleFactor).toBe(DEFAULT_DEVICE_SCALE_FACTOR);
  });

  it("pins a static deliverable to the profile's box too", () => {
    const t = resolveTargets("article-web", "static", profile);
    expect(t).toHaveLength(1);
    expect(t[0]!.cssViewport).toStrictEqual({ width: 660, height: 480 });
  });

  it("refuses a nonsensical device scale factor instead of capturing at zero", () => {
    expect(() =>
      resolveTargets("article-web", "static", {
        id: "broken",
        primary: { width: 660, height: 480 },
        deviceScaleFactor: 0,
      }),
    ).toThrow(/deviceScaleFactor/);
  });

  it("refuses a non-positive viewport", () => {
    expect(() =>
      resolveTargets("article-web", "static", {
        id: "broken",
        primary: { width: 0, height: 480 },
      }),
    ).toThrow(/width/);
  });
});

describe("destinationIdFor — the still records WHERE it claims to represent", () => {
  it("names the profile when there is one, and the channel otherwise", () => {
    expect(destinationIdFor("article-web")).toBe("channel:article-web");
    expect(
      destinationIdFor("article-web", {
        id: "heidi-article-embed",
        primary: { width: 660, height: 480 },
      }),
    ).toBe("heidi-article-embed");
  });
});

describe("targets round-trip through JSON (I6)", () => {
  it("survives JSON.parse(JSON.stringify(x)) with no key lost", () => {
    const t = resolveTargets("article-web", "interactive");
    expect(JSON.parse(JSON.stringify(t))).toStrictEqual(t);
  });
});
