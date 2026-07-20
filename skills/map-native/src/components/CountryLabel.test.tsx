import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { CountryLabel } from "./CountryLabel.tsx";

describe("CountryLabel typography", () => {
  it("uses --map-label-font with the Space Grotesk fallback (default unchanged)", () => {
    const html = renderToStaticMarkup(
      <CountryLabel
        name="Berlin"
        color="#e0b"
        reveal={1}
        x={0}
        y={0}
        value="88"
      />,
    );
    // The var indirection is present with a fallback (default output still Space Grotesk).
    expect(html).toContain("var(--map-label-font");
    expect(html).toContain("Space Grotesk");
  });

  it("uses --map-label-color with the default ink fallback", () => {
    const html = renderToStaticMarkup(
      <CountryLabel name="Berlin" color="#e0b" reveal={1} x={0} y={0} />,
    );
    expect(html).toContain("var(--map-label-color");
    expect(html).toContain("#F5F2ED");
  });
});
