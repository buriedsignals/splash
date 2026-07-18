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

  it("should never claim-grounding-fire on a TYPO'D valueField (review F1: null cells must be skipped, not coerced to 0)", () => {
    // valueField "rateX" doesn't exist in the rows: every cell is undefined. Before the
    // fix, String(undefined ?? "") coerced to 0 → yMax:0 → the TRUE value 42 in the
    // takeaway "EXCEEDS the plotted data maximum (0)" — a lying error on top of the
    // legitimate producer-validator failure. rowsDomain must return null instead.
    const proposal = mapNativeChoropleth("The rate reaches 42% in Switzerland");
    (proposal.spec as Record<string, unknown>).valueField = "rateX";
    const outcome = validateAccepted(proposal, [proposal]);
    // The choropleth validator legitimately rejects the missing field — but the
    // claim-grounding guard must stay SILENT (no bogus "maximum (0)" error).
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
  });

  it("should not let a stray non-CSV data string DISARM the rows reader (review F2)", () => {
    // A hand-authored spec carrying rows[valueField] AND a stray GeoJSON `data` string:
    // csvDomain bails to null on JSON — the guard must fall through to rowsDomain and
    // still catch the 99-vs-42 over-claim, never take the csv branch as an early out.
    const proposal = mapNativeChoropleth("The rate reaches 99% in Switzerland");
    (proposal.spec as Record<string, unknown>).data =
      '{"type":"FeatureCollection","features":[]}';
    const outcome = validateAccepted(proposal, [proposal]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        true,
      );
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

// A5 — mechanical sub-skill proof. Minimal proposal that clears every other guard
// (named source ⇒ no dropped-hint warning; no numbers in title/takeaway ⇒ no
// claim-grounding fire), so the skillsInvoked guard is the only variable under test.
function minimalValidProposal(): AcceptedProposal {
  return {
    id: "minimal",
    producer: "chart-native",
    format: "static",
    spec: {
      producer: "chart-native",
      nativeType: "bar",
      title: "Un titre",
      data: "cat,val\nA,1\nB,2",
      source: { name: "INSEE" },
      altInsight: "insight",
      lang: "fr",
    },
    confirmedTakeaway: "A confirmed takeaway with no numbers in it",
    provenance: "table",
  };
}

describe("skillsInvoked (mechanical sub-skill proof)", () => {
  it("should warn (not fail) when skillsInvoked is absent — legacy proposals keep working", () => {
    const p = minimalValidProposal(); // no skillsInvoked
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
    if (outcome.ok)
      expect(outcome.warnings.some((w) => w.includes("skillsInvoked"))).toBe(
        true,
      );
  });

  it("should FAIL a guided-branch proposal whose skillsInvoked lacks suggest-chart", () => {
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: ["splash:cadrage-guided", "suggest-article"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("suggest-chart"))).toBe(
        true,
      );
  });

  it("should pass a guided-branch proposal that lists suggest-chart", () => {
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: [
        "splash:cadrage-guided",
        "suggest-article",
        "suggest-chart",
      ],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
  });

  it("should pass a DIRECT-branch proposal without suggest-chart in the list", () => {
    // DIRECT still calls suggest-chart for validation in practice, but the GATE only
    // enforces the guided-branch invariant (the journalist chose from candidates that
    // ONLY suggest-chart can have produced).
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: ["splash:cadrage-direct"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
  });
});

// Review hardening (M1/M2): a present list with NO branch token must warn (never a silent
// bypass of the guided check), and an empty list's warning must say "empty", not "missing".
describe("skillsInvoked review hardening", () => {
  const base = () => minimalValidProposal();

  it("should warn when skillsInvoked declares no branch token (M1)", () => {
    const p = {
      ...base(),
      skillsInvoked: ["suggest-article", "suggest-chart"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
    if (outcome.ok)
      expect(outcome.warnings.some((w) => w.includes("no branch token"))).toBe(
        true,
      );
  });

  it("should say 'empty' (not 'missing') for a present-but-empty list (M2)", () => {
    const p = { ...base(), skillsInvoked: [] as string[] };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
    if (outcome.ok)
      expect(
        outcome.warnings.some((w) => w.includes("skillsInvoked is empty")),
      ).toBe(true);
  });
});

// C5 — the image-native producer rides the spine: validateByProducer runs
// checkImageConformance on the accepted ImageStory spec (fail-hard, before any
// producer runs), and the no-interactive rule (spec §2: an image has no data to
// explore) is enforced HERE, mechanically.
function imageStorySpec() {
  return {
    title: "Le canal qui a coupé le village en deux",
    description:
      "Comment le nouveau chenal a transformé la rive est, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir: "/tmp/raw-images",
    frames: ["avant", "pendant", "apres"].map((id, i) => ({
      id,
      frameRef: `${id}.jpg`,
      caption: `Étape ${i + 1} de la transformation de la rive est.`,
      alt: `Scène distincte numéro ${i + 1} au bord de l'eau.`,
      credit: { name: "Jeanne Dupont / Agence Photo" },
      sourcePassage: `Passage original numéro ${i + 1}, raconté autrement dans l'article.`,
    })),
  };
}

function imageProposal(): AcceptedProposal {
  return {
    id: "canal-image-scrolly",
    producer: "image-native",
    format: "scrolly",
    spec: imageStorySpec(),
    confirmedTakeaway: "La rive est a été entièrement transformée en cinq ans",
    provenance: "prose",
    confirmedTable: true,
    channel: "article-web",
  };
}

describe("validateAccepted — image-native (C5)", () => {
  it("accepts a valid ImageStory pinned scrolly on article-web", () => {
    const p = imageProposal();
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
  });

  it("fails LOUD on a conformance violation (empty alt — WCAG floor)", () => {
    const p = imageProposal();
    (p.spec as ReturnType<typeof imageStorySpec>).frames[1].alt = "";
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    expect(outcome.errors.join(" | ")).toContain("empty alt");
  });

  it("fails LOUD below the scrolly frame floor (2 frames < 3)", () => {
    const p = imageProposal();
    (p.spec as ReturnType<typeof imageStorySpec>).frames.pop();
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    expect(outcome.errors.join(" | ")).toContain("a scrolly needs at least 3");
  });

  it('rejects format "interactive" — an image sequence has no data to explore (spec §2)', () => {
    const p = { ...imageProposal(), format: "interactive" as const };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("unreachable");
    expect(outcome.errors.join(" | ")).toContain("interactive");
  });
});

// GUARD 4 duration exemption (2026-07-17 false positive: "en 5 ans" vs yMax 4)
describe("claim-grounding duration exemption", () => {
  const mk = (confirmedTakeaway: string): AcceptedProposal => ({
    id: "duration-claim",
    producer: "dw-chart",
    format: "static",
    channel: "article-web",
    confirmedTakeaway,
    spec: {
      type: "column-chart",
      title: "Le réseau a quadruplé en cinq ans",
      data: "periode,lignes\nIl y a cinq ans,1\nAujourd'hui,4\n",
      source: {
        name: "Régie",
        url: "https://regie.example-transport.fr/rapport",
      },
    } as Record<string, unknown>,
  });

  it("should NOT fire on a duration ('en 5 ans') above the plotted max", () => {
    const p = mk("Le réseau de bus de nuit a quadruplé en 5 ans");
    const outcome = validateAccepted(p, [p]);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
  });

  it("should NOT fire on 'les 5 dernières années'", () => {
    const p = mk("Le réseau a quadruplé sur les 5 dernières années");
    const outcome = validateAccepted(p, [p]);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
  });

  it("should still fire on a bare magnitude above the plotted max", () => {
    const p = mk("Le réseau atteint 5 lignes aujourd'hui");
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        true,
      );
  });
});

// GUARD 4 age-band exemption (2026-07-17 KI run: "over-55s"/"55-Jährigen" vs max 48)
describe("claim-grounding age-band exemption", () => {
  const mk = (confirmedTakeaway: string): AcceptedProposal => ({
    id: "ageband-claim",
    producer: "dw-chart",
    format: "static",
    channel: "article-web",
    confirmedTakeaway,
    spec: {
      type: "column-chart",
      title: "Die Sorgenlücke zwischen den Generationen",
      data: "gruppe,anteil\nUnter 35,48\nÜber 55,23\n",
      source: { name: "Forsa", url: "https://forsa.example-umfrage.de/ki" },
    } as Record<string, unknown>,
  });

  it("should NOT fire on 'over-55s' / '55-Jährigen' cohort labels above the max", () => {
    for (const t of [
      "Only 23% of over-55s worry, versus 48% of the under 35",
      "Bei den 55-Jährigen sind es nur 23 Prozent",
      "Les plus de 55 ans ne sont que 23 %",
    ]) {
      const p = mk(t);
      const outcome = validateAccepted(p, [p]);
      if (!outcome.ok)
        expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
          false,
        );
    }
  });

  it("should still fire on a bare magnitude above the max", () => {
    const p = mk("Der Anteil erreicht 55 Prozent");
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        true,
      );
  });
});

// GUARD 4 — Bug 1 (audit gap #4): annotation-TEXT laundering. Numbers scraped from an
// annotation's free-text `text`/`label` were marked "backed" (exempt), so an over-claim was
// laundered by any decorative caption that merely MENTIONED the number. A number is backed
// only when STRUCTURALLY encoded — a numeric x/y/value field (a real plotted position), never
// prose. Proven fr/en/de/it.
describe("claim-grounding — annotation-text does not launder an over-claim (Bug 1)", () => {
  const mk = (
    takeaway: string,
    annotations: unknown,
    lang: string,
  ): AcceptedProposal => ({
    id: "launder-claim",
    producer: "dw-chart",
    format: "static",
    channel: "article-web",
    confirmedTakeaway: takeaway,
    spec: {
      type: "column-chart",
      title: "Test",
      data: "gruppe,anteil\nA,48\nB,23\n",
      annotations,
      lang,
      source: { name: "X", url: "https://x.example-org.fr/rapport" },
    } as Record<string, unknown>,
  });

  const cases: Array<{ lang: string; takeaway: string; text: string }> = [
    {
      lang: "fr",
      takeaway: "Le taux atteint 70 % des cas",
      text: "objectif de 70 % visé pour 2035",
    },
    {
      lang: "en",
      takeaway: "The rate reaches 70% of cases",
      text: "target of 70% by 2035",
    },
    {
      lang: "de",
      takeaway: "Der Anteil erreicht 70 %",
      text: "Ziel von 70 % bis 2035",
    },
    {
      lang: "it",
      takeaway: "La quota raggiunge il 70%",
      text: "obiettivo del 70% entro il 2035",
    },
  ];

  for (const c of cases) {
    it(`[${c.lang}] STILL fires: a decorative annotation whose TEXT mentions 70 does not back it`, () => {
      const p = mk(c.takeaway, [{ text: c.text }], c.lang);
      const outcome = validateAccepted(p, [p]);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        const cg = outcome.errors.filter((e) => e.includes("claim-grounding"));
        expect(cg.length).toBeGreaterThan(0);
        expect(cg.join(" | ")).toContain("70");
      }
    });

    it(`[${c.lang}] label prose is also not scraped as backing`, () => {
      const p = mk(c.takeaway, [{ label: c.text }], c.lang);
      const outcome = validateAccepted(p, [p]);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok)
        expect(
          outcome.errors.some(
            (e) => e.includes("claim-grounding") && e.includes("70"),
          ),
        ).toBe(true);
    });
  }

  it("a STRUCTURED annotation value (y: 70) DOES back the claim — correctly exempt", () => {
    const p = mk("Le taux atteint 70 %", [{ y: 70, label: "objectif" }], "fr");
    const outcome = validateAccepted(p, [p]);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
    else expect(outcome.ok).toBe(true);
  });

  it("a STRUCTURED annotation value field (value: 70) DOES back the claim", () => {
    const p = mk("The rate reaches 70%", [{ value: 70 }], "en");
    const outcome = validateAccepted(p, [p]);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(
        false,
      );
    else expect(outcome.ok).toBe(true);
  });
});
