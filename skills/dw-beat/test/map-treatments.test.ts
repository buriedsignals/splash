// AN ORDINARY MAP SHOULD REACH THE DELEGATED PRODUCER, THE WAY AN ORDINARY BAR CHART DOES.
//
// This tree's own pinned provider inventory carries three map types — `d3-maps-choropleth`,
// `d3-maps-symbols`, `locator-map` — and every layer above them refused: `dw-beat/SKILL.md` said
// "not for a map", no `splashTreatments` entry named one, and `datawrapperMatch` returned null for
// any medium that was not `chart`. A journalist who wanted an ordinary static choropleth got the
// bespoke engine or nothing, and nothing about Datawrapper caused that.
//
// The boundary that REMAINS is the real one, and these tests pin it too: the delegated path serves
// an ordinary map, and does not serve a bespoke camera, a baked plate, a scroll-driven reveal or
// video — that is `map-beat`'s and `scrolly`'s work.

import { describe, expect, it } from "bun:test";
import { datawrapperMatch } from "../../storyboard/scripts/producer-gate.mjs";

const typesFor = (treatment: string, format = "static") =>
  datawrapperMatch({ medium: "map", format, treatment })?.datawrapperTypes ?? null;

describe("an ordinary map treatment", () => {
  it("reaches a pinned Datawrapper type", () => {
    expect(typesFor("Choropleth")).toEqual(["d3-maps-choropleth"]);
    expect(typesFor("Proportional symbol (symbol / bubble map)")).toEqual(["d3-maps-symbols"]);
    expect(typesFor("Locator")).toEqual(["locator-map"]);
  });

  it("reaches it by the catalogue's own id as well as its label", () => {
    expect(typesFor("map.choropleth")).toEqual(["d3-maps-choropleth"]);
  });

  it("reaches it for a hosted embed too, not only an owned PNG", () => {
    expect(typesFor("Choropleth", "web")).toEqual(["d3-maps-choropleth"]);
  });
});

describe("the boundary that remains", () => {
  it("does not offer the delegated path for video", () => {
    expect(typesFor("Choropleth", "video")).toBeNull();
  });

  it("does not offer it for a scroll-driven map", () => {
    expect(typesFor("Choropleth", "scrolly")).toBeNull();
  });

  // A flow map is a route with a camera; a hex grid is a spatial binning this provider does not do.
  // Refusing them by omission is the catalogue working, not a gap.
  it("offers nothing for a map treatment the provider has no type for", () => {
    expect(typesFor("Flow map (route)")).toBeNull();
    expect(typesFor("Hex grid (spatial binning)")).toBeNull();
  });

  it("still refuses a chart treatment it never mapped", () => {
    expect(datawrapperMatch({ medium: "chart", format: "static", treatment: "sankey" })).toBeNull();
  });
});
