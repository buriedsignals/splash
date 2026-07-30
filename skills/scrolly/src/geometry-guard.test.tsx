// Task 18 (geography-anywhere): behavioral coverage for the NEW logic this task introduced,
// beyond the structural "no ?raw import" check in tests/no-static-geojson-imports.test.ts —
// per this project's mutation bar, new logic ships with a real test, not just a passing compile.
//
// Two kinds of new logic here:
//   (A) Scrolly.tsx's `decodeWorldGeometry` helper (three call sites: dot-density/cartogram/
//       choropleth) — genuinely testable via SSR (`renderToStaticMarkup`), since the STORY/prose
//       computation runs synchronously at render time, unlike the map components' own decode
//       (deferred into their mount `useEffect`, unreachable without a real WebGL context — see
//       tests/dark-mode-and-brand-colour.test.ts's doc comment for that established constraint).
//   (B) ScrollyMap.tsx's feature-state highlight wiring (promoteId/setFeatureState/highlighted),
//       which replaced the old `enrichWorld` properties-merge — not renderable in bun:test either
//       (same WebGL constraint), so checked by source-scan, mirroring the established pattern.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";

if (!process.env.VITE_MAPTILER_KEY) {
  try {
    const lines = readFileSync(
      join(import.meta.dir, "..", "..", "..", ".env"),
      "utf8",
    ).split("\n");
    for (const line of lines) {
      const m = line.match(/^(?:VITE|REMOTION)_MAPTILER_KEY\s*=\s*(.+)$/);
      if (m) {
        process.env.VITE_MAPTILER_KEY = m[1].trim();
        break;
      }
    }
  } catch {
    // .env absent — the throw below will surface it clearly if a map track is exercised.
  }
}

const { Scrolly } = await import("./Scrolly");
const { renderToStaticMarkup } = await import("react-dom/server");

// -----------------------------------------------------------------------------------------
// (A) decodeWorldGeometry — genuine behavioral coverage via SSR.
// -----------------------------------------------------------------------------------------

describe("Scrolly story track refuses to build without config.geometry (D5)", () => {
  it("choropleth (default, un-typed) config: throws the named error, not a bare TypeError", () => {
    const config = {
      regionKey: "code",
      valueField: "share",
      title: "test",
      rows: [{ code: "NOR", share: 99 }],
      // geometry omitted deliberately
    };
    expect(() =>
      renderToStaticMarkup(<Scrolly config={config as never} />),
    ).toThrow(/scrolly story \(choropleth\): config\.geometry is required.*D5/);
  });

  it("dot-density config: throws the named error, not a bare TypeError", () => {
    const config = {
      type: "dot-density",
      regionKey: "code",
      valueField: "value",
      title: "test",
      rows: [{ code: "DEU", value: 10 }],
      // geometry omitted deliberately
    };
    expect(() =>
      renderToStaticMarkup(<Scrolly config={config as never} />),
    ).toThrow(
      /scrolly story \(dot-density\): config\.geometry is required.*D5/,
    );
  });

  it("cartogram config: throws the named error, not a bare TypeError", () => {
    const config = {
      type: "cartogram",
      title: "test",
      values: [{ id: "DEU", value: 10 }],
      // geometry omitted deliberately
    };
    expect(() =>
      renderToStaticMarkup(<Scrolly config={config as never} />),
    ).toThrow(/scrolly story \(cartogram\): config\.geometry is required.*D5/);
  });
});

// -----------------------------------------------------------------------------------------
// (B) ScrollyMap.tsx feature-state wiring — source-scan (WebGL-bound, see file doc comment).
// -----------------------------------------------------------------------------------------

describe("ScrollyMap.tsx choropleth join uses feature-state, never a properties-merge (D8)", () => {
  const src = readFileSync(join(import.meta.dir, "ScrollyMap.tsx"), "utf8");

  it("imports and calls applyChoroplethJoin (the shared, license-safe join)", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bapplyChoroplethJoin\b[^}]*\}/);
    expect(src).toMatch(/applyChoroplethJoin\(\s*world\s*,\s*layout\s*,/);
  });

  it("addSource sets promoteId so setFeatureState has a stable id", () => {
    expect(src).toMatch(/promoteId:\s*JOIN_KEY/);
  });

  it("the highlight-stroke paint reads feature-state through the safe-read idiom, not a bare read", () => {
    // The exact defect this idiom prevents (Task 16 review, Finding 1): a bare
    // ["feature-state","highlighted"] read (or a bare ["get","__highlight"] on a properties
    // merge) renders wrong for a feature with no entry. This regex would NOT match a
    // regression back to either bare form.
    expect(src).toMatch(
      /\["boolean",\s*\["feature-state",\s*"highlighted"\],\s*false\]/,
    );
    // The OLD properties-merge tokens must be gone — proves this is a genuine removal, not an
    // addition alongside the old (broken, post-Task-16-paint-change) behaviour.
    expect(src).not.toMatch(/__highlight/);
    expect(src).not.toMatch(/__hasData/);
    expect(src).not.toMatch(/enrichWorld/);
  });

  it("the currentStep effect resolves highlight membership in JS and writes feature-state per key (never source.setData with merged properties)", () => {
    expect(src).toMatch(/const highlightSet = new Set\(beat\.highlight\)/);
    expect(src).toMatch(
      /map\.setFeatureState\(\s*\{\s*source:\s*"choropleth-world",\s*id:\s*key\s*\},\s*\{\s*highlighted:\s*highlightSet\.has\(key\)\s*\}/,
    );
  });

  it("the hover popup reads the join from feature-state (f.state), not f.properties", () => {
    expect(src).toMatch(/f\.state\?\.hasData/);
    expect(src).toMatch(/f\.state\?\.value/);
  });
});

describe("all four de-inlined scrolly files carry a loud, named missing-geometry guard (not a bare TypeError)", () => {
  for (const [file, label] of [
    ["ScrollyDotDensityMap.tsx", "scrolly dot-density"],
    ["ScrollyCartogramMap.tsx", "scrolly cartogram"],
    ["ScrollyMap.tsx", "scrolly choropleth"],
  ] as const) {
    it(`${file} throws "${label}: config.geometry is required" when config.geometry is falsy`, () => {
      const src = readFileSync(join(import.meta.dir, file), "utf8");
      expect(src).toMatch(/if \(!config\.geometry\)\s*\n\s*throw new Error\(/);
      expect(src).toContain(
        `${label}: config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)`,
      );
    });
  }
});
