import { describe, expect, it } from "bun:test";
import { backfillAdm1FeatureIds } from "./adm1-backfill";

// The four Swiss cantons of the run this defect was found on
// (docs/splash/defect-2026-08-07-adm1-unreachable-from-prose-chain.md).
const CANTON_ROWS = [
  { canton_code: "CH-GE", canton: "Genève", rate: 157 },
  { canton_code: "CH-VD", canton: "Vaud", rate: 110 },
  { canton_code: "CH-ZH", canton: "Zurich", rate: 72 },
  { canton_code: "CH-JU", canton: "Jura", rate: 43 },
];

function cantonConfig(extra: Record<string, unknown> = {}) {
  return {
    regionKey: "canton_code",
    valueField: "rate",
    rows: CANTON_ROWS.map((r) => ({ ...r })),
    basemap: "natural-earth-admin-1",
    ...extra,
  } as Record<string, unknown>;
}

describe("backfillAdm1FeatureIds — the prose chain's own geography match", () => {
  it("resolves the region ids a config that never went through orient is missing", () => {
    const config = cantonConfig();
    backfillAdm1FeatureIds(config);
    const byValue = config.featureIdsByValue as Record<string, unknown[]>;
    expect(Object.keys(byValue).sort()).toEqual([
      "Genève",
      "Jura",
      "Vaud",
      "Zurich",
    ]);
    for (const row of CANTON_ROWS)
      expect(byValue[row.canton]!.length).toBeGreaterThan(0);
    expect((config.geography as { set: string }).set).toBe(
      "natural-earth-admin-1",
    );
  });

  it("leaves a config that already carries the ids untouched", () => {
    const mine = { Genève: [{ featureId: "CHE-159", country: "CHE" }] };
    const config = cantonConfig({ featureIdsByValue: mine });
    const before = JSON.stringify(config);
    backfillAdm1FeatureIds(config);
    expect(JSON.stringify(config)).toBe(before);
    expect(config.featureIdsByValue).toBe(mine);
  });

  it("leaves a non-admin-1 basemap untouched — this is not a general geography step", () => {
    const config = {
      regionKey: "country",
      valueField: "rate",
      rows: [{ country: "France", rate: 1 }],
      basemap: "world",
    } as Record<string, unknown>;
    const before = JSON.stringify(config);
    backfillAdm1FeatureIds(config);
    expect(JSON.stringify(config)).toBe(before);
  });

  // THE REAL RUN'S OWN SHAPE. The suggester joined on `canton_code` ("CH-GE"), which resolves
  // to nothing in the admin-1 index, while `canton` ("Genève") resolves 4/4.
  it("re-points the join at the column that resolves, like the loop's assembler", () => {
    const config = cantonConfig();
    backfillAdm1FeatureIds(config);
    expect(config.regionKey).toBe("canton");
    const byValue = config.featureIdsByValue as Record<string, unknown[]>;
    for (const row of CANTON_ROWS) expect(byValue[row.canton]).toBeDefined();
  });

  // ── the four holes an adversarial review opened, each with its own case ────────────────────

  // 1. A DECLARED key that resolves must WIN. The wide search keeps the first column on a tie,
  //    which is row-key order — so a second, equally resolvable column would silently shade the
  //    wrong cantons over a `regionKey` that was right.
  it("keeps a declared region key that resolves, even when a sibling column resolves too", () => {
    const config = {
      regionKey: "canton",
      valueField: "rate",
      rows: [
        { canton_naissance: "Vaud", canton: "Genève", rate: 157 },
        { canton_naissance: "Genève", canton: "Vaud", rate: 110 },
      ],
      basemap: "natural-earth-admin-1",
    } as Record<string, unknown>;
    backfillAdm1FeatureIds(config);
    expect(config.regionKey).toBe("canton"); // never the birth canton, whatever the key order
  });

  // 2. A constant country column makes the SHIPPED admin-0 candidate tie and win inside
  //    `matchGeography`, which used to surface here as "these regions resolve to nothing" —
  //    false, and its remedy was exactly what the journalist had already done.
  it("still resolves when the table also carries a constant ISO-A3 country column", () => {
    const config = cantonConfig({
      regionKey: "canton",
      rows: CANTON_ROWS.map((r) => ({ ...r, pays: "CHE" })),
    });
    backfillAdm1FeatureIds(config);
    expect(config.regionKey).toBe("canton");
    expect(Object.keys(config.featureIdsByValue as object).sort()).toEqual([
      "Genève",
      "Jura",
      "Vaud",
      "Zurich",
    ]);
  });

  // 3. dot-density and cartogram resolve their own join key with a hardcoded `iso_a3` default an
  //    admin-1 subset cannot satisfy. Filling their ids trades the resolver's loud refusal for a
  //    map with boundaries and no data.
  it("does not touch a dot-density or cartogram config — their loud refusal must survive", () => {
    for (const type of ["dot-density", "cartogram", "route"]) {
      const config = cantonConfig({ type, regionKey: "canton" });
      const before = JSON.stringify(config);
      backfillAdm1FeatureIds(config);
      expect(JSON.stringify(config)).toBe(before);
    }
  });

  // 4. The storyboard was validated against the OLD key's values and the resolver is about to
  //    rewrite those cells — a beat left on "CH-GE" would miss at render, after confirmation.
  it("carries the confirmed storyboard across when it re-points the join", () => {
    const config = cantonConfig({
      arcBeats: [
        { region: "CH-GE", role: "establish", text: "Genève enferme le plus." },
        { region: "CH-JU", role: "turn", text: "Le Jura, le moins." },
      ],
    });
    backfillAdm1FeatureIds(config);
    expect(
      (config.arcBeats as { region: string }[]).map((b) => b.region),
    ).toEqual(["Genève", "Jura"]);
  });

  it("is a no-op on a config the resolver already resolved (a re-produced source bundle)", () => {
    const config = cantonConfig({
      geometry: { type: "Topology", objects: {} },
      regionKey: "canton",
    });
    const before = JSON.stringify(config);
    backfillAdm1FeatureIds(config);
    expect(JSON.stringify(config)).toBe(before);
  });

  it("refuses, naming the declared column's values, when no column names a region", () => {
    const config = cantonConfig({
      rows: [
        { canton_code: "Wakanda", canton: "Wakanda", rate: 1 },
        { canton_code: "Freedonia", canton: "Freedonia", rate: 2 },
      ],
    });
    expect(() => backfillAdm1FeatureIds(config)).toThrow(/Wakanda/);
    // And it must NOT tell a prose-chain journalist to "re-run orient": there is no orient
    // step on their chain, which is the whole reason this function exists.
    expect(() => backfillAdm1FeatureIds(config)).not.toThrow(/orient/);
  });
});
