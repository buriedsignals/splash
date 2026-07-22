import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ChartFrame } from "../src/core/ChartFrame";
import { themeColors } from "../src/core/tokens";

// The tinted muted for a green house hue on the light default — the source label should use it.
const tintedMuted = themeColors(undefined, "#009E73").muted; // e.g. "#5b7167"

describe("ChartFrame threads baseColor to tinted furniture", () => {
  it("renders the source label in the house-tinted muted when baseColor is set", () => {
    const html = renderToStaticMarkup(
      createElement(ChartFrame as any, {
        title: "T",
        subtitle: "s",
        source: { name: "Src" },
        width: 800,
        height: 400,
        baseColor: "#009E73",
      }),
    );
    expect(html).toContain(tintedMuted);
    expect(html).not.toContain("#6B6B6B"); // the untinted pure grey must not appear as furniture
  });
  it("byte-identical furniture (pure grey) when no baseColor", () => {
    const html = renderToStaticMarkup(
      createElement(ChartFrame as any, {
        title: "T",
        subtitle: "s",
        source: { name: "Src" },
        width: 800,
        height: 400,
      }),
    );
    expect(html).toContain(themeColors(undefined).muted); // #6B6B6B
  });
});
