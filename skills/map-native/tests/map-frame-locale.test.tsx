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

describe("MapFrame — geoCredit, rendered beside source, always (D7)", () => {
  it("renders geoCredit under its own testid, beside the data source, when present", () => {
    const html = renderToStaticMarkup(
      <MapFrame
        title="La capacité renouvelable se concentre au nord"
        source={{ name: "INSEE" }}
        geoCredit={{
          name: "© OpenStreetMap contributors",
          url: "https://www.openstreetmap.org/copyright",
        }}
        width={1200}
        height={700}
        responsive={false}
        frame={frame}
      >
        <div />
      </MapFrame>,
    );
    expect(html).toContain('data-testid="map-geo-credit"');
    expect(html).toContain("OpenStreetMap contributors");
    // Neither band crowds out the other: source and geoCredit coexist in the same render.
    expect(html).toContain('data-testid="map-source"');
    expect(html).toContain("INSEE");
  });

  it("renders nothing under map-geo-credit when geoCredit is absent — the shipped-basemap case", () => {
    const html = renderToStaticMarkup(
      <MapFrame
        title="La capacité renouvelable se concentre au nord"
        source={{ name: "INSEE" }}
        width={1200}
        height={700}
        responsive={false}
        frame={frame}
      >
        <div />
      </MapFrame>,
    );
    // Genuinely absent — not an empty node, no testid string in the markup at all.
    expect(html).not.toContain('data-testid="map-geo-credit"');
  });
});
