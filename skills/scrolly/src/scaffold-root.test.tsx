// Regression guard for residual A34: the scrolly scaffold must expose exactly one
// `[data-splash-root]` element that contains the WHOLE page (header + sticky graphic +
// prose column + credit line), with `[data-splash-title]` addressable inside it. Before
// this fix, Scrolly.tsx returned a bare fragment whose first child was the header, so the
// Verify layer's capture ladder (lib/verify/capture.ts) fell through to its structural
// guess `#root > div` and measured the 454×63px title banner instead of the page —
// live-measured and written up in docs/splash/residuals.md (A34).
//
// Scrolly.tsx statically imports every map track component (ScrollyMap.tsx et al.), which
// throw at module-eval time without a MapTiler key — mirrors produce.mjs's own sourcing
// of the repo-root .env rather than duplicating the secret in this package.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";
// The map-track sample (assets/sample-data/scrolly.json) carries no `geometry` of its own
// (Task 4, geography-anywhere repair) — production only ever supplies it through
// skills/scrolly/scripts/produce.mjs's own resolveGeometryForProduce call, and this SSR-only
// structural test renders Scrolly directly, never through that CLI. Resolving it here, the same
// way the producer does, is what keeps this a real map-track render rather than reintroducing a
// second geometry-bearing copy of the fixture that could drift from what production supplies.
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce";

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
const lineSample = (await import("../assets/sample-data/line-scrolly.json"))
  .default;
const choroplethSampleRaw = (await import("../assets/sample-data/scrolly.json"))
  .default;
// A shallow copy: resolveGeometryForProduce mutates `config` IN PLACE, and the imported JSON
// module is a shared singleton — mutating it directly would leak the resolved geometry into
// every other test file that imports this same fixture. `type: "choropleth"` explicitly: this
// fixture predates the `type` field (Scrolly.tsx's own dispatch already defaults an absent
// `config.type` to "choropleth" — see its "default, un-typed" comment), but
// resolveGeometryForProduce's join-type allow-list reads `config.type` directly and does not
// know that renderer-side default, so it is restated here rather than left implicit.
const choroplethSample: Record<string, unknown> = {
  ...choroplethSampleRaw,
  type: "choropleth",
};
await resolveGeometryForProduce({
  config: choroplethSample,
  assetsGeoDir: join(
    import.meta.dir,
    "..",
    "..",
    "map-native",
    "assets",
    "geo",
  ),
  renderWidthPx: 1200, // article-web's own mediaSize.width — see produce.mjs's own comment
});

describe("Scrolly scaffold root (A34)", () => {
  it("has exactly one data-splash-root element that contains the whole page (chart track)", () => {
    const html = renderToStaticMarkup(<Scrolly config={lineSample as never} />);
    const roots = html.match(/data-splash-root/g) ?? [];
    expect(roots.length).toBe(1);
    // The title lives INSIDE the root, and is addressable on its own.
    expect(html.indexOf("data-splash-root")).toBeLessThan(
      html.indexOf("data-splash-title"),
    );
  });

  it("has exactly one data-splash-root element that contains the whole page (map track)", () => {
    const html = renderToStaticMarkup(
      <Scrolly config={choroplethSample as never} />,
    );
    const roots = html.match(/data-splash-root/g) ?? [];
    expect(roots.length).toBe(1);
    expect(html.indexOf("data-splash-root")).toBeLessThan(
      html.indexOf("data-splash-title"),
    );
  });
});

// WCAG 1.1.1, and a defect that was measured rather than reasoned about.
//
// A chart-track scrolly's config IS a chart-native spec (lib/loop/assemble/scrolly.ts composes it
// through assembleChartNative), so it carries `altInsight` — probed on a real assembled config.
// chart-native paints that string as a visually-hidden description from its OWN mount.tsx
// (AltInsightContext.Provider → ChartFrame). skills/scrolly/src/mount.tsx has no equivalent and
// this scaffold painted title / unit / source / credit and nothing else, so every chart scrolly
// shipped without the accessible description its own config carried — and `capture` filed a
// blocking `furniture-missing` on every one of them ("no element carries the alt-text text …",
// at all three breakpoints, measured in lib/loop/scrolly-e2e.test.ts).
describe("Scrolly accessible description (WCAG 1.1.1)", () => {
  const ALT =
    "Arctic September sea-ice extent fell from 7 to 4.3 million km² between 1979 and 2025.";

  it("emits the config's altInsight as a visually-hidden description inside the root", () => {
    const html = renderToStaticMarkup(
      <Scrolly config={{ ...lineSample, altInsight: ALT } as never} />,
    );
    expect(html).toContain(ALT);
    // Inside the captured component, or the capture ladder would never see it.
    expect(html.indexOf("data-splash-root")).toBeLessThan(html.indexOf(ALT));
  });

  it("emits nothing at all when the config carries no altInsight", () => {
    // Byte-identical to the render before this existed — every sample, map and image config
    // that has never carried the field renders exactly as it did.
    const withField = renderToStaticMarkup(
      <Scrolly config={{ ...lineSample, altInsight: "   " } as never} />,
    );
    const without = renderToStaticMarkup(
      <Scrolly config={lineSample as never} />,
    );
    expect(withField).toBe(without);
  });
});
