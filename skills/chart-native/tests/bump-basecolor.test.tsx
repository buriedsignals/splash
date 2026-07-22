import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BumpChart, type BumpConfig } from "../src/BumpChart";
import { resolveBumpAccents } from "../src/bump-geometry";
import { OKABE_ITO, BUMP_ACCENT_COLORS } from "../src/core/tokens";

// A bump chart must PAINT the subject-fit colour the journalist approved in the spec
// (baseColor for a single tracked line, seriesColors for several), like every other
// chart-native type. Before the fix, BumpChart hardcoded BUMP_ACCENT_COLORS and the
// approved hue never reached the highlighted line — a spec with baseColor #CC79A7
// shipped a BLUE line.
const base: BumpConfig = {
  title: "Streaming overtook linear TV as the main screen, 2019–2025",
  source: { name: "UK media viewing panel", url: "https://example.org/x" },
  valueLabel: "rank by weekly viewing hours (1 = most watched)",
  periods: ["2019", "2021", "2023", "2025"],
  items: [
    { label: "Streaming", ranks: [3, 2, 1, 1] },
    { label: "Linear TV", ranks: [1, 1, 2, 3] },
    { label: "Gaming", ranks: [4, 4, 3, 2] },
    { label: "Radio", ranks: [2, 3, 4, 4] },
    { label: "Cinema", ranks: [5, 5, 5, 5] },
  ],
};

describe("resolveBumpAccents — the single colour-resolution path", () => {
  it("uses baseColor for a SINGLE highlighted line (subject-fit hue)", () => {
    expect(
      resolveBumpAccents(["Streaming"], { baseColor: OKABE_ITO.purple }),
    ).toEqual([OKABE_ITO.purple]);
  });

  it("uses seriesColors in highlight order for MULTIPLE highlighted lines", () => {
    expect(
      resolveBumpAccents(["Streaming", "Linear TV"], {
        seriesColors: [OKABE_ITO.purple, OKABE_ITO.green],
      }),
    ).toEqual([OKABE_ITO.purple, OKABE_ITO.green]);
  });

  it("falls back to BUMP_ACCENT_COLORS only when the spec provides no colour", () => {
    expect(resolveBumpAccents(["Streaming"], {})).toEqual([
      BUMP_ACCENT_COLORS[0],
    ]);
    expect(resolveBumpAccents(["Streaming", "Linear TV"], {})).toEqual([
      BUMP_ACCENT_COLORS[0],
      BUMP_ACCENT_COLORS[1],
    ]);
  });

  it("fills uncoloured multi-line slots from the default palette (partial seriesColors)", () => {
    expect(
      resolveBumpAccents(["Streaming", "Linear TV"], {
        seriesColors: [OKABE_ITO.purple],
      }),
    ).toEqual([OKABE_ITO.purple, BUMP_ACCENT_COLORS[1]]);
  });

  it("treats no highlight as one shared accent (baseColor still honoured)", () => {
    expect(
      resolveBumpAccents(undefined, { baseColor: OKABE_ITO.purple }),
    ).toEqual([OKABE_ITO.purple]);
  });
});

// S3 story accent: the brand-profile editorial-emphasis hue reaches the SHARED/PEAK
// accent slot (the single-highlight case) — not the multi-highlight BUMP_ACCENT_COLORS
// cycling, and never over an explicit baseColor/seriesColors (those stay subject-fit).
describe("resolveBumpAccents — config.accent (S3 story accent)", () => {
  it("uses accent as the shared/peak fallback for a single highlighted line", () => {
    expect(resolveBumpAccents(["Streaming"], { accent: "#7A1FA2" })).toEqual([
      "#7A1FA2",
    ]);
  });

  it("falls back to BUMP_ACCENT_COLORS when neither baseColor nor accent is given (byte-identical)", () => {
    expect(resolveBumpAccents(["Streaming"], {})).toEqual([
      BUMP_ACCENT_COLORS[0],
    ]);
  });

  it("an explicit baseColor still wins over the story accent", () => {
    expect(
      resolveBumpAccents(["Streaming"], {
        baseColor: OKABE_ITO.purple,
        accent: "#7A1FA2",
      }),
    ).toEqual([OKABE_ITO.purple]);
  });

  it("leaves the multi-highlight BUMP_ACCENT_COLORS cycling untouched by accent", () => {
    expect(
      resolveBumpAccents(["Streaming", "Linear TV"], { accent: "#7A1FA2" }),
    ).toEqual([BUMP_ACCENT_COLORS[0], BUMP_ACCENT_COLORS[1]]);
  });
});

describe("BumpChart — honours config.accent (S3 story accent)", () => {
  it("paints a single highlighted line in the story accent when no baseColor is set", () => {
    const svg = renderToStaticMarkup(
      <BumpChart
        config={{ ...base, highlight: ["Streaming"], accent: "#7A1FA2" }}
        responsive={false}
      />,
    );
    expect(svg).toContain(`stroke="#7A1FA2"`);
  });

  it("is byte-identical to the default palette when accent is absent", () => {
    const withAccent = renderToStaticMarkup(
      <BumpChart
        config={{ ...base, highlight: ["Streaming"] }}
        responsive={false}
      />,
    );
    expect(withAccent).toContain(`stroke="${BUMP_ACCENT_COLORS[0]}"`);
  });
});

describe("BumpChart — honours the spec's subject-fit colour", () => {
  it("paints a single highlighted line in baseColor, not the hardcoded blue", () => {
    const svg = renderToStaticMarkup(
      <BumpChart
        config={{
          ...base,
          highlight: ["Streaming"],
          baseColor: OKABE_ITO.purple,
        }}
        responsive={false}
      />,
    );
    // the tracked line is painted in the approved purple…
    expect(svg).toContain(`stroke="${OKABE_ITO.purple}"`);
    // …and the old hardcoded blue accent never appears
    expect(svg).not.toContain(OKABE_ITO.blue);
    // the untracked lines stay neutral grey context, now tinted by the
    // house hue (S3 fan-out threaded baseColor into themeColors here too)
    expect(svg).toContain(`stroke="#79646f"`); // tinted neutral (S3 fan-out)
  });

  it("paints multiple highlighted lines from seriesColors in order", () => {
    const svg = renderToStaticMarkup(
      <BumpChart
        config={{
          ...base,
          highlight: ["Streaming", "Linear TV"],
          seriesColors: [OKABE_ITO.purple, OKABE_ITO.green],
        }}
        responsive={false}
      />,
    );
    expect(svg).toContain(`stroke="${OKABE_ITO.purple}"`);
    expect(svg).toContain(`stroke="${OKABE_ITO.green}"`);
    expect(svg).not.toContain(OKABE_ITO.blue);
  });

  it("falls back to the default palette when the spec provides no colour", () => {
    const svg = renderToStaticMarkup(
      <BumpChart
        config={{ ...base, highlight: ["Streaming", "Linear TV"] }}
        responsive={false}
      />,
    );
    expect(svg).toContain(`stroke="${BUMP_ACCENT_COLORS[0]}"`);
    expect(svg).toContain(`stroke="${BUMP_ACCENT_COLORS[1]}"`);
  });
});
