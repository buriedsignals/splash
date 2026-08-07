// The flyover's WIRING — that the engine is reachable from the journalist's path, and that the
// path does not ask it for things it cannot do. The camera math has its own suite
// (flight-path.test.ts); this one is about the seams.
import { describe, expect, it } from "bun:test";
import {
  flyoverConfigErrors,
  resolveFlyoverProps,
  FLYOVER_COMPS,
  FLYOVER_TYPE,
} from "../src/validate-config";
import { getProducer } from "../../../lib/core/registry";
import "../src/manifest";
import { narrativeKindsFor } from "../../splash/src/narrative-kinds";
import { narrativeWalkError } from "../../splash/src/narrative-walk-gate";
import type { AcceptedProposal } from "../../splash/src/producer-spec";

const validConfig = {
  type: "flyover",
  path: [
    [94.968, 29.757],
    [94.99, 29.76],
    [95.02, 29.78],
  ],
  travelKm: 13,
};

describe("flyoverConfigErrors", () => {
  it("should accept a config carrying a camera path", () => {
    expect(flyoverConfigErrors(validConfig)).toEqual([]);
  });

  it("should refuse a missing camera path BY NAME, saying both ways of giving one", () => {
    const [error] = flyoverConfigErrors({ type: "flyover" });
    expect(error).toContain("camera path");
    expect(error).toContain("path");
    expect(error).toContain("routeGeoJSON");
  });

  it("should refuse [lat, lng] order, which is the mistake that renders an empty ocean", () => {
    const errors = flyoverConfigErrors({
      ...validConfig,
      path: [
        [29.757, 94.968],
        [29.76, 94.99],
      ],
    });
    expect(errors.join(" ")).toContain("[lng, lat]");
  });

  it("should refuse a field the engine does not read rather than dropping it in silence", () => {
    const errors = flyoverConfigErrors({ ...validConfig, durationSeconds: 12 });
    expect(errors.join(" ")).toContain("durationSeconds");
  });

  it("should refuse both a path and a centerline, because the camera has one route", () => {
    const errors = flyoverConfigErrors({
      ...validConfig,
      routeGeoJSON: "river.geojson",
    });
    expect(errors.join(" ")).toContain("one route");
  });

  it("should refuse a city-only knob on a landscape flyover", () => {
    const errors = flyoverConfigErrors({
      ...validConfig,
      maximumScreenSpaceError: 6,
    });
    expect(errors.join(" ")).toContain("city");
  });
});

describe("resolveFlyoverProps", () => {
  it("should render the landscape composition by default", () => {
    const resolved = resolveFlyoverProps(validConfig as never);
    expect(resolved.comp).toBe(FLYOVER_COMPS.landscape.comp);
    expect(resolved.durationInFrames).toBe(720);
  });

  it("should forward the source as the sourceName the component actually draws", () => {
    const resolved = resolveFlyoverProps({
      ...validConfig,
      source: { name: "MapTiler" },
    } as never);
    expect(resolved.props.sourceName).toBe("MapTiler");
  });
});

describe("registration", () => {
  it("should register one format, video, and one type", () => {
    const manifest = getProducer("cesium-flyover");
    expect(manifest?.formats).toEqual(["video"]);
    expect(manifest?.types?.map((t) => t.id)).toEqual([FLYOVER_TYPE]);
  });

  it("should declare push and nothing else — the camera moves, no data enters", () => {
    const gestures = getProducer("cesium-flyover")?.types?.[0].gestures;
    expect(gestures).toEqual({ reveal: ["push"] });
  });
});

describe("narrative kind", () => {
  it("should offer reveal ONLY — a flyover paints no beat text, so there is nothing to choose", () => {
    const offers = narrativeKindsFor("cesium-flyover", FLYOVER_TYPE);
    expect(offers.map((o) => o.kind)).toEqual(["reveal"]);
    expect(offers[0].owesStoryboard).toBe(false);
  });

  it("should owe no storyboard: one offer is not a question, and no sentence would be shown", () => {
    const proposal: AcceptedProposal = {
      id: "gorge",
      producer: "cesium-flyover",
      format: "video",
      spec: validConfig,
      confirmedTakeaway: "The road is cut into a wall 2 000 m above the river.",
    };
    expect(narrativeWalkError(proposal)).toBeNull();
  });
});
