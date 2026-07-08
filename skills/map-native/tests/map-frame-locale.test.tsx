import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MapFrame } from "../src/core/MapFrame";
import { resolveMapFrame } from "../src/core/map-format";

const frame = resolveMapFrame(1200, 700, {
  titleLines: 1,
  hasDescription: false,
});

function render(lang?: string) {
  return renderToStaticMarkup(
    <MapFrame
      title="La capacité renouvelable se concentre au nord"
      source={{ name: "INSEE 2025", url: "https://example.org/x" }}
      width={1200}
      height={700}
      responsive={false}
      frame={frame}
      lang={lang}
    >
      <div />
    </MapFrame>,
  );
}

describe("MapFrame — localized Source furniture", () => {
  it('renders "Source :" (French spacing) when lang is fr', () => {
    const html = render("fr");
    expect(html).toContain("Source :");
    expect(html).not.toContain("Source: ");
  });

  it('renders "Source:" (English) by default', () => {
    const html = render();
    expect(html).toContain("Source:");
    expect(html).not.toContain("Source :");
  });
});
