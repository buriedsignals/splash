import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";

// DEFECT C — claim-grounding tripwire. The confirmedTakeaway/title may embed a numeric or
// temporal claim that the spec never encodes (no annotation, no reference line): the energie
// case claims a "70% target by 2035" while the data tops out at 48% and ends at 2023. The
// title↔takeaway TEXT-agreement probe passes vacuously because neither is checked against the
// encoded data domain. This guard tokenizes title + confirmedTakeaway for numeric literals
// (%, value+unit, 4-digit years) and fails a number that falls OUTSIDE the encoded domain and
// is NOT backed by an annotation / reference line. Modeled on dw-chart's annotation-y-domain
// tripwire. NARROW: only numeric-out-of-domain; qualitative divergence stays for human review.

// Real fixture: energie-region-allemand / erneuerbare-kanton (dw-chart d3-lines).
const energie: AcceptedProposal = {
  id: "erneuerbare-kanton",
  producer: "dw-chart",
  format: "interactive",
  spec: {
    type: "d3-lines",
    title:
      "Erneuerbare Energien im Kanton wachsen weiter — das 70-%-Ziel bis 2035 rückt beim aktuellen Tempo nicht in Reichweite",
    intro:
      "Anteil erneuerbarer Energien am kantonalen Stromverbrauch, 2018–2023.",
    data: "jahr,anteil_erneuerbar_prozent\n2018,34\n2020,39\n2022,44\n2023,48",
    subject: "energy",
    baseColor: "#E69F00",
    seriesLabels: { anteil_erneuerbar_prozent: "Anteil erneuerbare Energien" },
    numberFormat: "0%",
    source: { name: "Zahlen wie im Artikel berichtet" },
    channel: "article-web",
    lang: "de",
    altInsight:
      "Der Anteil erneuerbarer Energien ist von 2018 bis 2023 stetig von 34 % auf 48 % gestiegen (+14 Prozentpunkte) — aber beim aktuellen Tempo wird das kantonale Ziel von 70 % bis 2035 nicht rechtzeitig erreicht.",
  },
  confirmedTakeaway:
    "Der Anteil erneuerbarer Energien ist von 2018 bis 2023 stetig von 34 % auf 48 % gestiegen (+14 Prozentpunkte) — aber beim aktuellen Tempo wird das kantonale Ziel von 70 % bis 2035 nicht rechtzeitig erreicht.",
  provenance: "table",
  channel: "article-web",
};

// Real fixture: temp-anomaly-line-video (chart-native line). 1980, 1.5, 2023 all in-domain.
const tempAnomaly: AcceptedProposal = {
  id: "temp-anomaly-line-video",
  producer: "chart-native",
  format: "video",
  spec: {
    producer: "chart-native",
    nativeType: "line",
    title:
      "Le réchauffement s'accélère brutalement depuis les années 1980, jusqu'à +1,5 °C en 2023",
    source: {
      name: "NASA GISS (GISTEMP)",
      url: "https://data.giss.nasa.gov/gistemp",
    },
    unit: "Anomalie de température (°C)",
    valueUnit: "°C",
    data: "annee,anomalie\n1900,0.0\n1920,0.05\n1940,0.1\n1960,0.0\n1980,0.3\n2000,0.6\n2015,0.9\n2020,1.2\n2023,1.5",
    directLabel: "Anomalie de température",
    subject: "réchauffement climatique",
    baseColor: "#D55E00",
    altInsight:
      "Après un siècle de quasi-stabilité, le réchauffement s'est brutalement accéléré depuis les années 1980, jusqu'à atteindre +1,5 °C en 2023, la limite symbolique de l'Accord de Paris.",
    lang: "fr",
    channel: "article-web",
  },
  confirmedTakeaway:
    "Après un siècle de quasi-stabilité, le réchauffement s'est brutalement accéléré depuis les années 1980, jusqu'à atteindre +1,5 °C en 2023, la limite symbolique de l'Accord de Paris.",
  provenance: "table",
  channel: "article-web",
};

describe("validateAccepted — claim-grounding (Defect C)", () => {
  it("THROWS the energie proposal: 70 % and 2035 are outside the encoded domain, unbacked", () => {
    const outcome = validateAccepted(energie);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    const joined = outcome.errors.join(" | ");
    expect(joined).toContain("claim-grounding");
    // both the out-of-time-axis year and the over-max value are called out
    expect(joined).toContain("2035");
    expect(joined).toContain("70");
  });

  it("PASSES temp-anomaly: 1980, 1,5 and 2023 are all inside the encoded domain (no over-fire)", () => {
    const outcome = validateAccepted(tempAnomaly);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok)
      throw new Error(
        "temp-anomaly should ground cleanly, got: " +
          outcome.errors.join(" | "),
      );
  });

  it("does NOT fire on a legitimate delta (+14 Prozentpunkte below the y-min is not an over-claim)", () => {
    const outcome = validateAccepted(energie);
    if (outcome.ok) throw new Error("unreachable");
    // the guard only flags values ABOVE the plotted max — the 14pt delta must never be named
    for (const e of outcome.errors)
      if (e.includes("claim-grounding")) expect(e).not.toContain("14");
  });
});

// GUARD 4 on the MAP producers. map-dw's MapSpec.data IS CSV text (the adapters contract),
// so the existing csvDomain reader must already ground its takeaway claims — this test PINS
// that coverage. map-native configs carry rows[valueField] instead (no CSV), covered below.
describe("validateAccepted — claim-grounding on map producers (GUARD 4 extension)", () => {
  it("should ground a map-dw takeaway claim against its CSV value domain (GUARD 4 covers map-dw)", () => {
    // The takeaway over-claims 90 while the data tops out at 42: GUARD 4 must bite.
    const proposal: AcceptedProposal = {
      id: "mapdw-claim",
      producer: "map-dw",
      format: "static",
      channel: "article-web",
      confirmedTakeaway: "Unemployment peaks at 90% in the north",
      provenance: "table",
      spec: {
        mapType: "choropleth",
        basemap: "world-2019",
        mapKeyAttr: "DW_NAME",
        regionKey: "region",
        valueColumn: "value",
        data: "region,value\nNord,42\nSud,12\n",
        title: "Unemployment by region",
        altInsight: "Unemployment is concentrated in the north of the country.",
      },
    };
    const outcome = validateAccepted(proposal, [proposal]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        true,
      );
  });

  // map-native configs carry no CSV: joined values live in rows[valueField] (ChoroplethData,
  // choropleth-geo.ts). A minimal valid choropleth config whose data tops out at 42.
  const mapNativeChoropleth = (
    confirmedTakeaway: string,
  ): AcceptedProposal => ({
    id: "mapnative-claim",
    producer: "map-native",
    format: "static",
    channel: "article-web",
    confirmedTakeaway,
    provenance: "table",
    spec: {
      basemap: "world",
      regionKey: "iso",
      valueField: "rate",
      rows: [
        { iso: "CHE", rate: 42 },
        { iso: "FRA", rate: 31 },
      ],
      title: "Rate by country, highest in Switzerland",
      description: "Rate per country, latest year.",
      source: { name: "Example stats office", url: "https://stats.admin.ch" },
      altInsight: "Switzerland has the highest rate of the countries mapped.",
    },
  });

  it("should ground a map-native takeaway claim against rows[valueField] (GUARD 4 map-native)", () => {
    const proposal = mapNativeChoropleth("The rate reaches 75% in Switzerland");
    const outcome = validateAccepted(proposal, [proposal]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        true,
      );
  });

  it("should stay silent on a map-native claim inside the rows domain", () => {
    // Same config, takeaway cites 42 (the actual max) → no claim-grounding error.
    const proposal = mapNativeChoropleth("The rate reaches 42% in Switzerland");
    const outcome = validateAccepted(proposal, [proposal]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok)
      throw new Error(
        "in-domain map-native claim should ground cleanly, got: " +
          outcome.errors.join(" | "),
      );
  });

  it("should stay a strict no-op for a map-native config without rows/valueField", () => {
    // A locator config (markers, no value field) → no claim-grounding error even with a
    // number in the takeaway ("the 3 sites…").
    const proposal: AcceptedProposal = {
      id: "mapnative-locator",
      producer: "map-native",
      format: "static",
      channel: "article-web",
      confirmedTakeaway: "The 3 sites cluster along the border corridor",
      provenance: "prose",
      spec: {
        type: "locator",
        basemap: "world",
        markers: [
          { lon: 6.14, lat: 46.2, label: "Site A" },
          { lon: 6.24, lat: 46.19, label: "Site B" },
          { lon: 6.11, lat: 46.14, label: "Site C" },
        ],
        title: "Three sites along the border corridor",
        description: "The three sites named in the article.",
        source: {
          name: "Example registry",
          url: "https://registry.example-org.ch",
        },
        altInsight: "The three sites cluster along the border corridor.",
      },
    };
    const outcome = validateAccepted(proposal, [proposal]);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
    else expect(outcome.ok).toBe(true);
  });
});

// DEFECTS B & D — spine wiring. The pure guards live in source-guard.ts and are unit-tested
// there; these prove they are actually WIRED into validateAccepted and consume the proposal's
// captured `sourceHint`. Production threading of sourceHint is prose-enforced by necessity (the
// orchestrator LLM copies it onto accepted.json §5b, like channel/confirmedTakeaway — no script
// transforms the in-context ProposalSet), so the guards fire when it is threaded and stay dormant
// when it is absent; the dropped-hint observability block below covers the absent case.
describe("validateAccepted — source guards wired (Defects B & D)", () => {
  const base = {
    id: "x",
    producer: "chart-native" as const,
    format: "static" as const,
    confirmedTakeaway: "A confirmed takeaway with no numbers in it",
    provenance: "table" as const,
  };

  it("B: named org discarded for the generic fallback fails when the hint is present", () => {
    const outcome = validateAccepted({
      ...base,
      spec: {
        producer: "chart-native",
        nativeType: "bar",
        title: "Un titre",
        data: "cat,val\nA,1\nB,2",
        source: { name: "Chiffres tels que rapportés dans cet article" },
        altInsight: "insight",
        lang: "fr",
      },
      sourceHint: { name: "INSEE" },
    } as AcceptedProposal);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    expect(outcome.errors.some((e) => e.includes("INSEE"))).toBe(true);
  });

  it("D: a shipped URL that diverges from the provided URL fails when the hint is present", () => {
    const outcome = validateAccepted({
      ...base,
      spec: {
        producer: "chart-native",
        nativeType: "bar",
        title: "Un titre",
        data: "cat,val\nA,1\nB,2",
        source: {
          name: "Dares",
          url: "https://dares.travail-emploi.gouv.fr/sites/default/files/x/Dares_Analyses.pdf",
        },
        altInsight: "insight",
        lang: "fr",
      },
      sourceHint: { url: "dares.travail-emploi.gouv.fr" },
    } as AcceptedProposal);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    expect(
      outcome.errors.some((e) => e.includes("dares.travail-emploi.gouv.fr")),
    ).toBe(true);
  });
});

// OBSERVABILITY — dropped-hint render-gate warning. Threading sourceHint onto accepted.json is
// prose-enforced (no script transforms the in-context ProposalSet — the orchestrator LLM assembles
// accepted.json, like channel/confirmedTakeaway), so a dropped hint silently disarms guard B. This
// non-blocking warning (surfaced at the render gate via ProposalResult.warnings) makes that disarm
// VISIBLE: it fires on the SUCCESS path when the ship is the generic fallback and no name hint was
// threaded, EXCEPT for prose/none provenance (where the generic fallback is documented-legitimate).
describe("validateAccepted — dropped-hint observability", () => {
  const base = {
    id: "x",
    producer: "chart-native" as const,
    format: "static" as const,
    confirmedTakeaway: "A confirmed takeaway with no numbers in it",
  };
  const spec = {
    producer: "chart-native",
    nativeType: "bar",
    title: "Un titre",
    data: "cat,val\nA,1\nB,2",
    source: { name: "Chiffres tels que rapportés dans cet article" },
    altInsight: "insight",
    lang: "fr",
  };

  it("surfaces a non-blocking warning when a table-provenance ship uses the generic fallback with no sourceHint", () => {
    const outcome = validateAccepted({
      ...base,
      provenance: "table",
      spec,
    } as AcceptedProposal);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("unreachable");
    expect(outcome.warnings.some((w) => w.includes("sourceHint"))).toBe(true);
  });

  it("does NOT warn for prose provenance (generic fallback is legitimate there)", () => {
    const outcome = validateAccepted({
      ...base,
      provenance: "prose",
      spec,
    } as AcceptedProposal);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("unreachable");
    expect(outcome.warnings.some((w) => w.includes("sourceHint"))).toBe(false);
  });

  it("hard-fails via guard B (not the advisory warning) when the hint IS present", () => {
    // hint present + generic-fallback ship → guard B fires on the ERROR path; the advisory
    // warning is mutually exclusive (it only fires when NO name hint was threaded).
    const outcome = validateAccepted({
      ...base,
      provenance: "table",
      spec,
      sourceHint: { name: "INSEE" },
    } as AcceptedProposal);
    expect(outcome.ok).toBe(false);
  });
});
