// THE NEWSROOM'S CHARTER, ON WHAT THE LOOP BUILDS.
//
// The defect this pins (D3, docs/splash/defect-2026-08-07-adm1-unreachable-from-prose-chain.md):
// the PROSE chain applies `mergeProfileDefaults` in produce-all, and the LOOP chain applied
// nothing at all — a real run under a `palette: ["#d5121e"]` profile produced a config with no
// `palette` / `brandHue` / `themeBg` and shipped a DEFAULT BLUE choropleth. The flow announces
// "j'applique la charte <newsroom>" in words, so this is worse than a missing feature.
//
// Asked of `assemblerFor` rather than of an assembler directly, because assemblerFor is the
// function produce() actually calls — a test on `assembleMapNative` alone would stay green with
// the seam ripped out.
import { test, expect } from "bun:test";
import { assemblerFor } from "./index";
import { mapNativeConfigErrors } from "../../../skills/map-native/src/validate-config";
import type { BrandProfile } from "../../../skills/splash/src/brand-profile";
import type { ProductionBrief } from "../../core/production-brief";
import "../../../skills/splash/src/register-producers";

const HOUSE: BrandProfile = { palette: ["#d5121e"] };

const REGION_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "interactive",
  angle: {
    confirmedTakeaway: "Genève compte 157 détenus pour 100 000 habitants",
    altInsight: "Carte des cantons suisses, Genève le plus foncé",
    unit: "détenus pour 100 000 habitants",
  },
  dataCsv: "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19",
  attribution: "OFS",
  geo: {
    column: "country",
    geography: {
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    },
    matched: 4,
    total: 4,
    unmatched: [],
  },
};

const POINT_BRIEF: ProductionBrief = {
  ...REGION_BRIEF,
  nativeType: "symbol",
  dataCsv: "place,lat,lon,detenus\nGenève,46.2,6.14,157\nZürich,47.37,8.54,72",
  geo: undefined,
};

function assembled(
  engine: string,
  nativeType: string,
  format: ProductionBrief["format"],
  brief: ProductionBrief,
  house: BrandProfile | null,
): Record<string, unknown> {
  const assemble = assemblerFor(engine, nativeType, format, house);
  if (!assemble) throw new Error(`no assembler for ${engine}/${nativeType}`);
  const r = assemble({ ...brief, nativeType, format });
  if (!r.ok) throw new Error(r.message);
  return r.value as Record<string, unknown>;
}

test("a loop-assembled choropleth carries the newsroom's house hue", () => {
  const cfg = assembled(
    "map-native",
    "choropleth",
    "interactive",
    REGION_BRIEF,
    HOUSE,
  );
  expect(cfg.brandHue).toBe("#d5121e");
  expect(cfg.brandPalette).toEqual(["#d5121e"]);
  // The map colour paths only derive a house ramp when no explicit palette is set — so the
  // house branch must leave `palette` unset, never seed one beside the hue.
  expect(cfg.palette).toBeUndefined();
  // And the result is still a config the engine accepts.
  expect(mapNativeConfigErrors(cfg)).toEqual([]);
});

// THE SEAM SERVES EVERY MAP, not the one type the defect was found on. The point family has no
// region join and takes the hue as a single fill rather than a ramp — same policy, same field.
test("the point family takes the house hue too", () => {
  const cfg = assembled("map-native", "symbol", "static", POINT_BRIEF, HOUSE);
  expect(cfg.brandHue).toBe("#d5121e");
  expect(mapNativeConfigErrors(cfg)).toEqual([]);
});

// The map-track scrolly is assembled THROUGH skills/scrolly, whose builder key is "scrolly" —
// a house rule keyed on "map-native" alone would leave every scrolly map unbranded.
test("a map-track scrolly takes the house hue through its host engine", () => {
  const cfg = assembled(
    "scrolly",
    "choropleth",
    "scrolly",
    REGION_BRIEF,
    HOUSE,
  );
  expect(cfg.brandHue).toBe("#d5121e");
});

// The CHART side of the same seam: a chart's house colour is a single baseColor, not a ramp —
// mergeProfileDefaults already knows that, and the loop must not restate it.
test("a chart takes the house colour as its baseColor, not as a hue", () => {
  const cfg = assembled(
    "chart-native",
    "bar",
    "static",
    { ...REGION_BRIEF, dataCsv: "canton,value\nGenève,157\nZürich,72" },
    HOUSE,
  );
  expect(cfg.baseColor).toBe("#d5121e");
  expect(cfg.brandExplicit).toBe(true);
  expect(cfg.brandHue).toBeUndefined();
});

// NO PROFILE ⇒ BYTE-IDENTICAL. A newsroom that declared no house style must get exactly the
// config it got before this seam existed.
test("an install with no house profile assembles byte-identically", () => {
  const withNull = assembled(
    "map-native",
    "choropleth",
    "interactive",
    REGION_BRIEF,
    null,
  );
  const bare = assemblerFor("map-native", "choropleth", "interactive")!;
  const r = bare(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(JSON.stringify(withNull)).toBe(JSON.stringify(r.value));
});

// A house profile carrying only a `lang` or a `source` and NO palette must not paint anything.
test("a profile with no palette leaves the colour alone", () => {
  const cfg = assembled(
    "map-native",
    "choropleth",
    "interactive",
    REGION_BRIEF,
    { palette: [], lang: "fr" },
  );
  expect(cfg.brandHue).toBeUndefined();
  expect(cfg.lang).toBe("fr");
});
