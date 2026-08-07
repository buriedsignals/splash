// The journalist said it BEFORE we produced, and it changed nothing. These are the teeth.
//
// The real run (exports/glaciers-requiem-2026) plotted "Cervin" on the Matterhorn GLACIER, 1063 m
// from the summit, under a beat reading « Au sommet du Cervin, à 4478 mètres ». The journalist had
// warned about it before production. decisions.jsonl holds one line — `suggest-chart-invoked` —
// so the warning left no trace anywhere in the run.
//
// Every spec below is the REAL failing spec (or a minimal reduction of it), so a green here is a
// claim about that run and not about a shape invented to be catchable.
import { describe, expect, it } from "bun:test";
import {
  claimsASummit,
  statedElevationM,
  resolvedPlaceErrors,
  resolvedPlaceWarnings,
  type ResolvedPlace,
} from "./place-resolution";

// --- the real failing spec, trimmed to the fields these guards read ------------------------
const CERVIN_GLACIER_COORD = { lon: 7.661000215400804, lat: 45.986011489842674 };
const CERVIN_SUMMIT_COORD = { lon: 7.658602260053158, lat: 45.97642633812452 };

function failingSpec(over: Record<string, unknown> = {}) {
  return {
    type: "locator",
    markers: [
      { lon: 8.077508042316026, lat: 46.451632464223096, label: "Glacier d'Aletsch" },
      { ...CERVIN_GLACIER_COORD, label: "Cervin" },
    ],
    arcBeats: [
      {
        region: "Glacier d'Aletsch",
        role: "establish",
        text: "Sur le glacier d'Aletsch, une immense étendue de neige a fondu en deux semaines.",
      },
      {
        region: "Cervin",
        role: "build",
        text: "Au sommet du Cervin, à 4478 mètres, des cascades torrentielles — un phénomène rarissime.",
      },
    ],
    ...over,
  };
}

const CERVIN_RECORD_SUMMIT: ResolvedPlace = {
  label: "Cervin",
  origin: "geocoder",
  ...CERVIN_SUMMIT_COORD,
  resolvedName: "Cervin, Zermatt",
  categories: ["peak"],
  elevationM: 4478,
  shownToJournalist: true,
};

describe("claimsASummit", () => {
  it("reads the beat that was contradicted", () => {
    expect(
      claimsASummit(
        "Au sommet du Cervin, à 4478 mètres, des cascades torrentielles.",
      ),
    ).toBe(true);
  });

  it("fires on the summit word in each shipped language", () => {
    expect(claimsASummit("At the summit of the Matterhorn")).toBe(true);
    expect(claimsASummit("Auf dem Gipfel des Matterhorns")).toBe(true);
    expect(claimsASummit("In cima al Cervino")).toBe(true);
    expect(claimsASummit("La vetta del Cervino")).toBe(true);
  });

  it("fires on a bare elevation, which is a summit claim without the word", () => {
    expect(claimsASummit("Le pic atteint 4478 mètres")).toBe(true);
    expect(claimsASummit("4478 m above sea level")).toBe(true);
    // Just over the kilometre floor, where altitude and distance part company.
    expect(claimsASummit("un plateau à 1200 mètres")).toBe(true);
  });

  it("does NOT fire on ordinary prose — a false block kills a legitimate run", () => {
    expect(
      claimsASummit(
        "Sur le glacier d'Aletsch, une immense étendue de neige a fondu.",
      ),
    ).toBe(false);
    expect(claimsASummit("En seize jours, le glacier a perdu 1,60 mètre.")).toBe(
      false,
    );
    // A distance or a length in metres is not an altitude. The separator is the kilometre
    // convention: a horizontal distance past 1 km is written in km, an altitude never is.
    expect(claimsASummit("un front de 300 mètres de large")).toBe(false);
    expect(claimsASummit("le refuge est à 800 m du village")).toBe(false);
    expect(claimsASummit("a 900 m walk from the station")).toBe(false);
    expect(claimsASummit("")).toBe(false);
  });
});

describe("statedElevationM", () => {
  it("extracts the elevation the sentence names", () => {
    expect(
      statedElevationM("Au sommet du Cervin, à 4478 mètres, des cascades."),
    ).toBe(4478);
    expect(statedElevationM("culminating at 4,478 m")).toBe(4478);
    expect(statedElevationM("auf 3 970 m")).toBe(3970);
  });

  it("returns undefined when no elevation is stated", () => {
    expect(statedElevationM("Au sommet du Cervin")).toBeUndefined();
    expect(statedElevationM("le glacier a perdu 1,60 mètre")).toBeUndefined();
  });
});

describe("GUARD — a summit claim owes a resolution record (spec-only; fires on the real run)", () => {
  it("FAILS THE REAL FAILING SPEC with no threading at all", () => {
    const errors = resolvedPlaceErrors(failingSpec(), undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Cervin");
    expect(errors[0]).toMatch(/sommet|summit/i);
  });

  it("passes once the marker carries a resolution the journalist saw", () => {
    expect(
      resolvedPlaceErrors(
        failingSpec({
          markers: [
            {
              lon: 8.077508042316026,
              lat: 46.451632464223096,
              label: "Glacier d'Aletsch",
            },
            { ...CERVIN_SUMMIT_COORD, label: "Cervin" },
          ],
        }),
        [CERVIN_RECORD_SUMMIT],
      ),
    ).toEqual([]);
  });

  it("stays dormant on a map that claims no summit — the Aletsch beat owes nothing", () => {
    const noSummit = failingSpec({
      arcBeats: [
        {
          region: "Cervin",
          text: "Le Cervin a vu ses cascades grossir cet été.",
        },
      ],
    });
    expect(resolvedPlaceErrors(noSummit, undefined)).toEqual([]);
  });

  it("reads a symbol map's points[] as well as a locator's markers[]", () => {
    const symbol = {
      type: "symbol",
      points: [{ ...CERVIN_GLACIER_COORD, value: 3, label: "Cervin" }],
      arcBeats: [
        { region: "Cervin", text: "Au sommet du Cervin, à 4478 mètres." },
      ],
    };
    expect(resolvedPlaceErrors(symbol, undefined)).toHaveLength(1);
  });

  it("reads the title and description too, not only the beats", () => {
    const inTitle = {
      type: "locator",
      markers: [{ ...CERVIN_GLACIER_COORD, label: "Cervin" }],
      title: "Au sommet du Cervin, les cascades ont remplacé la glace",
    };
    expect(resolvedPlaceErrors(inTitle, undefined)).toHaveLength(1);
  });
});

describe("GUARD — what the geocoder resolved must not contradict the sentence", () => {
  it("THE DEFECT: a summit beat plotted on a feature the geocoder called a GLACIER", () => {
    const glacierRecord: ResolvedPlace = {
      label: "Cervin",
      origin: "geocoder",
      ...CERVIN_GLACIER_COORD,
      resolvedName: "Matterhorngletscher, Suisse",
      categories: ["glacier"],
      shownToJournalist: true,
    };
    const errors = resolvedPlaceErrors(failingSpec(), [glacierRecord]);
    expect(errors.some((e) => /glacier/i.test(e) && /Cervin/.test(e))).toBe(
      true,
    );
  });

  it("catches a peak whose OWN elevation contradicts the stated one", () => {
    // Matterhorn, Nevada — a real peak, 3250 m, for a sentence that says 4478.
    const nevada: ResolvedPlace = {
      label: "Cervin",
      origin: "geocoder",
      lon: -115.37534482777119,
      lat: 41.810740532405546,
      resolvedName: "Matterhorn, Elko",
      categories: ["peak"],
      elevationM: 3250,
      shownToJournalist: true,
    };
    const spec = failingSpec({
      markers: [{ lon: -115.375, lat: 41.81, label: "Cervin" }],
    });
    expect(
      resolvedPlaceErrors(spec, [nevada]).some((e) => /3250|4478/.test(e)),
    ).toBe(true);
  });

  it("stays dormant when the geocoder said nothing about what the feature is", () => {
    const noCategories: ResolvedPlace = {
      label: "Cervin",
      origin: "journalist",
      ...CERVIN_SUMMIT_COORD,
      shownToJournalist: true,
    };
    const spec = failingSpec({
      markers: [{ ...CERVIN_SUMMIT_COORD, label: "Cervin" }],
    });
    expect(resolvedPlaceErrors(spec, [noCategories])).toEqual([]);
  });
});

describe("GUARD — a coordinate the machine resolved on its own must have been shown", () => {
  it("refuses a geocoded place the journalist never saw", () => {
    const unshown: ResolvedPlace = { ...CERVIN_RECORD_SUMMIT, shownToJournalist: false };
    const spec = failingSpec({
      markers: [{ ...CERVIN_SUMMIT_COORD, label: "Cervin" }],
    });
    const errors = resolvedPlaceErrors(spec, [unshown]);
    expect(errors.some((e) => /shown|montr/i.test(e))).toBe(true);
  });

  it("asks nothing of a coordinate that came from the journalist's own data", () => {
    const fromData: ResolvedPlace = {
      label: "Cervin",
      origin: "data",
      ...CERVIN_SUMMIT_COORD,
    };
    const spec = failingSpec({
      markers: [{ ...CERVIN_SUMMIT_COORD, label: "Cervin" }],
      arcBeats: [{ region: "Cervin", text: "Le Cervin, cet été." }],
    });
    expect(resolvedPlaceErrors(spec, [fromData])).toEqual([]);
  });
});

describe("GUARD — a correction the journalist gave must LAND in the spec", () => {
  it("THE BIGGER HALF: the record says summit, the spec still carries the glacier ⇒ hard fail", () => {
    const corrected: ResolvedPlace = {
      label: "Cervin",
      origin: "journalist",
      ...CERVIN_SUMMIT_COORD,
      resolvedName: "Cervin (sommet)",
      categories: ["peak"],
      elevationM: 4478,
      correctedFrom: CERVIN_GLACIER_COORD,
      shownToJournalist: true,
    };
    // failingSpec() still plots the glacier coordinate.
    const errors = resolvedPlaceErrors(failingSpec(), [corrected]);
    expect(
      errors.some((e) => /does not match|correction/i.test(e) && /Cervin/.test(e)),
    ).toBe(true);
  });

  it("passes once the corrected coordinate is actually what the spec plots", () => {
    const corrected: ResolvedPlace = {
      label: "Cervin",
      origin: "journalist",
      ...CERVIN_SUMMIT_COORD,
      categories: ["peak"],
      elevationM: 4478,
      correctedFrom: CERVIN_GLACIER_COORD,
      shownToJournalist: true,
    };
    expect(
      resolvedPlaceErrors(
        failingSpec({
          markers: [
            {
              lon: 8.077508042316026,
              lat: 46.451632464223096,
              label: "Glacier d'Aletsch",
            },
            { ...CERVIN_SUMMIT_COORD, label: "Cervin" },
          ],
        }),
        [corrected],
      ),
    ).toEqual([]);
  });

  it("refuses a record for a marker the spec does not carry", () => {
    const orphan: ResolvedPlace = {
      label: "Cervino",
      origin: "geocoder",
      ...CERVIN_SUMMIT_COORD,
      categories: ["peak"],
      shownToJournalist: true,
    };
    expect(
      resolvedPlaceErrors(failingSpec(), [orphan]).some((e) =>
        /no marker|Cervino/.test(e),
      ),
    ).toBe(true);
  });
});

describe("OBSERVABILITY — a point map with no resolution records at all", () => {
  it("warns that the guards are disarmed", () => {
    const warnings = resolvedPlaceWarnings(
      failingSpec({ arcBeats: [{ region: "Cervin", text: "Le Cervin." }] }),
      undefined,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/resolvedPlaces/);
  });

  it("says nothing once records are threaded", () => {
    expect(
      resolvedPlaceWarnings(failingSpec(), [CERVIN_RECORD_SUMMIT]),
    ).toEqual([]);
  });

  it("says nothing about a map that plots no points at all", () => {
    expect(
      resolvedPlaceWarnings({ type: "choropleth", rows: [] }, undefined),
    ).toEqual([]);
  });
});
