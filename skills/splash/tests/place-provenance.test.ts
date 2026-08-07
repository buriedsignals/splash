// THE SEAM, CLOSED. These tests are about a run that RESOLVED a place and then lost the record.
//
// GUARD 6 (lib/geo/place-resolution.ts) checks `resolvedPlaces` once it is threaded, and its own
// author wrote that the threading itself was prose-enforced: nothing forced the record to exist,
// so every record-based leg could be disarmed by simply not writing it. What follows is the
// confrontation that removes that choice — the run directory's own resolution receipt, read
// against what the accepted proposal carries.
import { describe, expect, it } from "bun:test";
import {
  readPlaceProvenance,
  placeProvenanceRefusal,
  placeProvenanceWarnings,
  type PlaceProvenance,
} from "../src/place-provenance";
import type { AcceptedProposal } from "../src/producer-spec";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The real failing run's two coordinates, byte for byte (lib/geo/place-resolution.test.ts).
const GLACIER = { lon: 7.661000215400804, lat: 45.986011489842674 };
const SUMMIT = { lon: 7.658602260053158, lat: 45.97642633812452 };

function proposal(over: Partial<AcceptedProposal> = {}): AcceptedProposal {
  return {
    id: "cervin",
    producer: "map-native",
    format: "static",
    confirmedTakeaway: "Le Cervin fond par le sommet.",
    spec: {
      type: "locator",
      markers: [{ ...GLACIER, label: "Cervin" }],
    },
    ...over,
  };
}

/** A receipt the sanctioned resolver would have left for the Cervin lookup that went wrong. */
function receipt(over: Record<string, unknown> = {}): PlaceProvenance {
  return {
    present: true,
    resolutions: [
      {
        label: "Cervin",
        ...GLACIER,
        resolvedName: "Matterhorngletscher, Zermatt",
        categories: ["glacier"],
        ...over,
      },
    ],
  };
}

const NONE: PlaceProvenance = { present: false, resolutions: [] };

describe("readPlaceProvenance", () => {
  it("reports absent when the run directory holds no receipt", () => {
    const dir = mkdtempSync(join(tmpdir(), "places-"));
    try {
      expect(readPlaceProvenance(dir).present).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads the resolutions the resolver wrote", () => {
    const dir = mkdtempSync(join(tmpdir(), "places-"));
    try {
      writeFileSync(
        join(dir, "places.json"),
        JSON.stringify({
          resolutions: [
            {
              label: "Cervin",
              ...GLACIER,
              resolvedName: "Matterhorngletscher",
            },
          ],
        }),
      );
      const prov = readPlaceProvenance(dir);
      expect(prov.present).toBe(true);
      expect(prov.resolutions).toHaveLength(1);
      expect(prov.resolutions[0].label).toBe("Cervin");
      expect(prov.resolutions[0].lon).toBe(GLACIER.lon);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("treats an unparseable receipt as absent rather than as a silent pass", () => {
    const dir = mkdtempSync(join(tmpdir(), "places-"));
    try {
      writeFileSync(join(dir, "places.json"), "{ not json");
      expect(readPlaceProvenance(dir).present).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// --- L1: THE DROPPED THREAD. The receipt exists; the proposal did not carry it across. ------
describe("a resolution the run made and the proposal did not carry", () => {
  it("refuses, naming the place and what it resolved to", () => {
    const r = placeProvenanceRefusal(proposal(), receipt());
    expect(r).not.toBeNull();
    expect(r?.code).toBe("place-resolution-undeclared");
    expect(r?.message).toContain("Cervin");
    expect(r?.message).toContain("Matterhorngletscher");
  });

  it("still refuses when resolvedPlaces exists but covers a different place", () => {
    const r = placeProvenanceRefusal(
      proposal({
        resolvedPlaces: [
          { label: "Aletsch", origin: "data", lon: 8.07, lat: 46.45 },
        ],
      }),
      receipt(),
    );
    expect(r?.message).toContain("Cervin");
  });

  it("passes once the record is carried across", () => {
    expect(
      placeProvenanceRefusal(
        proposal({
          resolvedPlaces: [
            {
              label: "Cervin",
              origin: "geocoder",
              ...GLACIER,
              shownToJournalist: true,
            },
          ],
        }),
        receipt(),
      ),
    ).toBeNull();
  });

  it("ignores a resolution for a place this spec does not plot", () => {
    // A run may look a place up and then decide not to map it; holding this element to a lookup
    // it does not use would be a false block. The Cervin record is here so the map still answers
    // for what it DOES plot — otherwise L3 fires and this would be testing the wrong leg.
    const prov: PlaceProvenance = {
      present: true,
      resolutions: [
        { label: "Jungfrau", lon: 7.96, lat: 46.53, resolvedName: "Jungfrau" },
      ],
    };
    expect(
      placeProvenanceRefusal(
        proposal({
          resolvedPlaces: [{ label: "Cervin", origin: "data", ...GLACIER }],
        }),
        prov,
      ),
    ).toBeNull();
  });
});

// --- L2: THE RECORD THAT COPIES NOTHING. -----------------------------------------------------
describe("a record whose coordinate came from neither the resolution nor a correction", () => {
  it("refuses a record that silently moved the point", () => {
    const r = placeProvenanceRefusal(
      proposal({
        spec: { type: "locator", markers: [{ ...SUMMIT, label: "Cervin" }] },
        resolvedPlaces: [
          {
            label: "Cervin",
            origin: "geocoder",
            ...SUMMIT,
            shownToJournalist: true,
          },
        ],
      }),
      receipt(),
    );
    expect(r?.message).toContain("correctedFrom");
    expect(r?.message).toContain("Cervin");
  });

  it("accepts the same move once it is declared a correction", () => {
    expect(
      placeProvenanceRefusal(
        proposal({
          spec: { type: "locator", markers: [{ ...SUMMIT, label: "Cervin" }] },
          resolvedPlaces: [
            {
              label: "Cervin",
              origin: "journalist",
              ...SUMMIT,
              correctedFrom: GLACIER,
            },
          ],
        }),
        receipt(),
      ),
    ).toBeNull();
  });

  it("refuses `origin: data` for a place the run's own receipt shows it geocoded", () => {
    const r = placeProvenanceRefusal(
      proposal({
        resolvedPlaces: [{ label: "Cervin", origin: "data", ...GLACIER }],
      }),
      receipt(),
    );
    expect(r?.message).toContain("origin");
    expect(r?.message).toContain("Cervin");
  });

  // THE ONE-WORD DODGE. L2a asked `origin === "data"` and stopped there, so the whole check could
  // be walked around by typing a different word: `journalist` also owes no showback (G3 requires
  // one for `geocoder` alone), and it left the coordinate the machine chose sitting in the spec
  // with nobody having seen it — the exact defect the Cervin run shipped. Same class as `data`,
  // same mechanism, closed the same way.
  it("refuses `origin: journalist` for a point the run's own receipt shows the machine chose", () => {
    const r = placeProvenanceRefusal(
      proposal({
        resolvedPlaces: [{ label: "Cervin", origin: "journalist", ...GLACIER }],
      }),
      receipt(),
    );
    expect(r?.message).toContain("origin");
    expect(r?.message).toContain("Cervin");
  });

  // …and the correction it must NOT block: a journalist who MOVED the point owns the new
  // coordinate, and `correctedFrom` is what says so. Refusing this would push a real correction
  // back onto the machine's answer, which is the opposite of the point.
  it("accepts `origin: journalist` when the record declares what it corrected", () => {
    expect(
      placeProvenanceRefusal(
        proposal({
          spec: { type: "locator", markers: [{ ...SUMMIT, label: "Cervin" }] },
          resolvedPlaces: [
            {
              label: "Cervin",
              origin: "journalist",
              ...SUMMIT,
              correctedFrom: GLACIER,
            },
          ],
        }),
        receipt(),
      ),
    ).toBeNull();
  });
});

// --- L3: THE MAP THAT ACCOUNTS FOR NOTHING (the "just don't write it" dodge). ----------------
describe("a point map that can account for none of its coordinates", () => {
  it("refuses when nothing was resolved, nothing was recorded and nothing was declared", () => {
    const r = placeProvenanceRefusal(proposal(), NONE);
    expect(r?.code).toBe("place-resolution-undeclared");
    expect(r?.message).toContain("Cervin");
  });

  it("passes when the journalist's own file supplied every coordinate, said out loud", () => {
    expect(
      placeProvenanceRefusal(proposal({ coordinatesFromData: true }), NONE),
    ).toBeNull();
  });

  it("refuses the data declaration the run's own receipt contradicts", () => {
    // The record is COMPLETE and correct here on purpose: without it L1 would fire first and this
    // would be testing the dropped thread again. What is under test is the element claiming every
    // coordinate came from the newsroom's file while the run's own receipt shows it geocoded one.
    const r = placeProvenanceRefusal(
      proposal({
        coordinatesFromData: true,
        resolvedPlaces: [
          {
            label: "Cervin",
            origin: "geocoder",
            ...GLACIER,
            shownToJournalist: true,
          },
        ],
      }),
      receipt(),
    );
    expect(r?.message).toContain("coordinatesFromData");
    expect(r?.message).toContain("Cervin");
  });

  it("passes when records account for the places, with no receipt on disk", () => {
    expect(
      placeProvenanceRefusal(
        proposal({
          resolvedPlaces: [{ label: "Cervin", origin: "data", ...GLACIER }],
        }),
        NONE,
      ),
    ).toBeNull();
  });

  it("says nothing about a spec that plots no named place", () => {
    expect(
      placeProvenanceRefusal(
        proposal({ spec: { type: "choropleth", values: [{ id: "CHE" }] } }),
        NONE,
      ),
    ).toBeNull();
  });

  it("says nothing about a producer that plots no places at all", () => {
    expect(
      placeProvenanceRefusal(
        proposal({ producer: "chart-native", spec: { nativeType: "line" } }),
        NONE,
      ),
    ).toBeNull();
  });
});

// --- the partial gap: said out loud, never fatal (attestation-corroboration's own rule). -----
describe("a map that accounts for some places and not others", () => {
  const twoMarkers = {
    type: "locator",
    markers: [
      { ...GLACIER, label: "Cervin" },
      { lon: 8.077508042316026, lat: 46.451632464223096, label: "Aletsch" },
    ],
  };

  it("warns, naming the place nothing accounts for", () => {
    const w = placeProvenanceWarnings(
      proposal({
        spec: twoMarkers,
        resolvedPlaces: [{ label: "Cervin", origin: "data", ...GLACIER }],
      }),
      NONE,
    );
    expect(w.join(" ")).toContain("Aletsch");
    expect(w.join(" ")).not.toContain("Cervin");
  });

  it("does not refuse the partial gap", () => {
    expect(
      placeProvenanceRefusal(
        proposal({
          spec: twoMarkers,
          resolvedPlaces: [{ label: "Cervin", origin: "data", ...GLACIER }],
        }),
        NONE,
      ),
    ).toBeNull();
  });

  it("leaves TOTAL absence to the refusal rather than double-reporting it as a warning", () => {
    expect(placeProvenanceWarnings(proposal(), NONE)).toEqual([]);
  });

  it("stays quiet when every place is accounted for", () => {
    expect(
      placeProvenanceWarnings(
        proposal({
          spec: twoMarkers,
          resolvedPlaces: [
            { label: "Cervin", origin: "data", ...GLACIER },
            {
              label: "Aletsch",
              origin: "data",
              lon: 8.077508042316026,
              lat: 46.451632464223096,
            },
          ],
        }),
        NONE,
      ),
    ).toEqual([]);
  });

  it("stays quiet when the coordinates were declared to come from the data", () => {
    expect(
      placeProvenanceWarnings(
        proposal({ spec: twoMarkers, coordinatesFromData: true }),
        NONE,
      ),
    ).toEqual([]);
  });
});
