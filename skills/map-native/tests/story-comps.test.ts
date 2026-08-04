import { describe, it, expect } from "bun:test";
import { storyComps, defaultCameraMode } from "../scripts/lib/story-comps.mjs";
import { CAMERA_MODES } from "../src/camera-mode";

// storyComps dispatches the story-format video (produce.mjs's "video" case) on cameraMode.
// Two things are pinned here:
//   1. every (type, cameraMode) pair a journalist can now choose resolves to the RIGHT
//      composition family — never a silent fallthrough to a different type's video.
//   2. the no-choice default (cameraMode absent) stays exactly what it was before the knob
//      opened: route-reveal for a route, guided-tour for everything else.
const STORY_TYPES = [
  "choropleth",
  "symbol",
  "locator",
  "dot-density",
  "hex-grid",
  "cartogram",
];

const STORY_BASE_BY_TYPE: Record<string, string> = {
  choropleth: "ChoroplethStory",
  symbol: "SymbolStory",
  locator: "LocatorStory",
  "dot-density": "DotDensityStory",
  "hex-grid": "HexGridStory",
  cartogram: "CartogramStory",
};

const REVEAL_BASE_BY_TYPE: Record<string, string> = {
  choropleth: "ChoroplethReveal",
  symbol: "SymbolReveal",
  locator: "LocatorReveal",
  "dot-density": "DotDensityReveal",
  "hex-grid": "HexGridReveal",
  cartogram: "CartogramReveal",
};

function landscapeId(comps: [string, string][]): string {
  const landscape = comps.find(([, aspect]) => aspect === "landscape");
  if (!landscape)
    throw new Error("no landscape entry in " + JSON.stringify(comps));
  return landscape[0];
}

describe("storyComps — route no longer falls through to a choropleth composition", () => {
  it("a route's guided tour is not a Choropleth composition", () => {
    const comps = storyComps({ type: "route" }, "guided-tour");
    const ids = comps.map(([id]) => id);
    expect(ids.some((id) => id.includes("Choropleth"))).toBe(false);
  });

  it("a route's guided tour is RouteReveal — the only composition a route has", () => {
    const comps = storyComps({ type: "route" }, "guided-tour");
    expect(comps).toEqual([
      ["RouteReveal", "landscape"],
      ["RouteRevealSquare", "square"],
      ["RouteRevealPortrait", "portrait"],
    ]);
  });
});

describe("storyComps — every (type, cameraMode) pair resolves to its own family", () => {
  for (const type of STORY_TYPES) {
    it(`guided-tour on "${type}" resolves to ${STORY_BASE_BY_TYPE[type]}`, () => {
      const comps = storyComps({ type }, "guided-tour");
      expect(landscapeId(comps)).toBe(STORY_BASE_BY_TYPE[type]!);
      expect(comps).toEqual([
        [STORY_BASE_BY_TYPE[type], "landscape"],
        [`${STORY_BASE_BY_TYPE[type]}Square`, "square"],
        [`${STORY_BASE_BY_TYPE[type]}Portrait`, "portrait"],
      ]);
    });

    it(`simple on "${type}" resolves to ${REVEAL_BASE_BY_TYPE[type]}`, () => {
      const comps = storyComps({ type }, "simple");
      expect(landscapeId(comps)).toBe(REVEAL_BASE_BY_TYPE[type]!);
      expect(comps).toEqual([
        [REVEAL_BASE_BY_TYPE[type], "landscape"],
        [`${REVEAL_BASE_BY_TYPE[type]}Square`, "square"],
        [`${REVEAL_BASE_BY_TYPE[type]}Portrait`, "portrait"],
      ]);
    });
  }

  it('simple on "route" resolves to RouteReveal (a route has no separate simple/reveal)', () => {
    const comps = storyComps({ type: "route" }, "simple");
    expect(landscapeId(comps)).toBe("RouteReveal");
  });

  it('route-reveal on "route" resolves to RouteReveal', () => {
    expect(landscapeId(storyComps({ type: "route" }, "route-reveal"))).toBe(
      "RouteReveal",
    );
  });

  // Defence in depth: validate-config.ts's cameraModeError already refuses this combination,
  // named, before render — but storyComps must not silently hand back RouteReveal for data that
  // was never a route if that gate is ever bypassed (a hand-edited config, a caller that skips
  // validation). Every non-route type is covered, not just one, since each is a distinct branch
  // in the dispatch above and a fix to one does not prove the others.
  for (const type of STORY_TYPES) {
    it(`route-reveal on "${type}" throws instead of silently returning RouteReveal`, () => {
      expect(() => storyComps({ type }, "route-reveal")).toThrow(
        `camera mode 'route-reveal' does not apply to a "${type}" map`,
      );
    });
  }

  it("an unimplemented camera mode throws, naming the mode", () => {
    expect(() => storyComps({ type: "choropleth" }, "orbit")).toThrow(
      "camera mode 'orbit' is not implemented",
    );
  });
});

describe("defaultCameraMode — the no-choice path is unchanged", () => {
  it('defaults a route to "route-reveal"', () => {
    expect(defaultCameraMode({ type: "route" })).toBe("route-reveal");
  });

  it('defaults every other type to "guided-tour"', () => {
    for (const type of STORY_TYPES) {
      expect(defaultCameraMode({ type })).toBe("guided-tour");
    }
    // choropleth's config carries no explicit `type` field (the mount default) — the same
    // default must apply.
    expect(defaultCameraMode({})).toBe("guided-tour");
  });

  it("the no-choice default resolves through storyComps to today's compositions", () => {
    const routeComps = storyComps(
      { type: "route" },
      defaultCameraMode({ type: "route" }),
    );
    expect(landscapeId(routeComps)).toBe("RouteReveal");

    const choroplethComps = storyComps(
      { type: "choropleth" },
      defaultCameraMode({ type: "choropleth" }),
    );
    expect(landscapeId(choroplethComps)).toBe("ChoroplethStory");
  });
});

// ---------------------------------------------------------------------------
// THE STEPPED KIND — sub-project ④(a). The family already existed, worked, and was registered:
// MapScrolly dispatches all seven types (MapScrolly.tsx) and Root.tsx registers its three
// aspects with scrollyMeta. What did not exist was any way to ASK for it — storyComps knew only
// "guided-tour" and "simple", so a whole narrative genre rendered correctly and no journalist
// could reach it. Exactly the defect `simple` itself was in until it was added here.
// ---------------------------------------------------------------------------
describe("the stepped kind — one dispatcher, every type", () => {
  const TYPES = [
    "choropleth",
    "symbol",
    "locator",
    "cartogram",
    "dot-density",
    "hex-grid",
    "route",
  ];

  for (const type of TYPES)
    it(`stepped on "${type}" resolves to the MapScrolly family`, () => {
      const comps = storyComps({ type }, "stepped");
      expect(comps.map(([id]) => id)).toEqual([
        "MapScrolly",
        "MapScrollySquare",
        "MapScrollyPortrait",
      ]);
      // The three aspects the producer always builds for the video format.
      expect(comps.map(([, aspect]) => aspect)).toEqual([
        "landscape",
        "square",
        "portrait",
      ]);
    });

  it("is a real camera mode, not a string the validator would reject", () => {
    expect(CAMERA_MODES).toContain("stepped");
  });

  it("does not change what any other mode resolves to", () => {
    expect(storyComps({ type: "choropleth" }, "guided-tour")[0]![0]).toBe(
      "ChoroplethStory",
    );
    expect(storyComps({ type: "choropleth" }, "simple")[0]![0]).toBe(
      "ChoroplethReveal",
    );
  });
});
