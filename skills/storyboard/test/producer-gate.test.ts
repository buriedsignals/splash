import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DATAWRAPPER_CATALOG,
  confirmProducerChoice,
  datawrapperMatch,
  formatProducerGate,
  normalizeTreatment,
} from "../scripts/producer-gate.mjs";
import { checkStoryboard, mutateStoryboard, parseStoryboard } from "../scripts/storyboard.mjs";
import {
  DATAWRAPPER_TREATMENTS,
  DATAWRAPPER_TREATMENT_MEDIA,
  datawrapperTypesForTreatment,
  whereIs,
} from "../../splash/scripts/where.mjs";

const TYPES = [
  "column-chart",
  "d3-area",
  "d3-arrow-plot",
  "d3-bars-bullet",
  "d3-bars-grouped",
  "d3-bars-split",
  "d3-bars-stacked",
  "d3-bars",
  "d3-donuts",
  "d3-dot-plot",
  "d3-lines",
  "d3-maps-choropleth",
  "d3-maps-symbols",
  "d3-multiple-donuts",
  "d3-multiple-pies",
  "d3-pies",
  "d3-range-plot",
  "d3-scatter-plot",
  "dual-axis",
  "election-donut-chart",
  "grouped-column-chart",
  "locator-map",
  "multiple-lines",
  "multiple-columns",
  "stacked-column-chart",
  "tables",
  "waterfall",
];

function storyboard({
  treatment = "Slope (slopegraph)",
  candidates = ["Slope (slopegraph)", "Dumbbell (range plot)"],
  format = "web",
  producer,
  datawrapperType,
} = {}) {
  const sized = format === "static" || format === "video" ? "    size: landscape\n" : "";
  return `---
takeaway: "Every country increased while the gap remained wide."
subject: "Ten countries"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample."
placement: "after paragraph three"
credit: "Splash Test Desk"
effectiveDate: "2026-07-15"
grounding: supported
reference: "none — no matching reference"
language: en
slots:
  - id: 1
    proves: "Every country increased while the gap remained wide."
    medium: chart
    format: ${format}
${sized}    reachable: yes
    candidates: ${JSON.stringify(candidates)}
    chosen: ${JSON.stringify(treatment)}
${producer ? `    producer: ${producer}\n` : ""}${datawrapperType ? `    datawrapperType: ${datawrapperType}\n` : ""}---
`;
}

describe("the Datawrapper catalogue", () => {
  it("pins the complete upstream VisualizationType list and its source revision", () => {
    expect(DATAWRAPPER_CATALOG.visualizationTypes.map((row) => row.id)).toEqual(TYPES);
    expect(DATAWRAPPER_CATALOG.source).toMatchObject({
      commit: "cc86334ba94044fa4f07a72e2881fea2bcbb37e7",
      symbol: "VisualizationType",
    });
  });

  it("matches selected Splash treatments only after medium and format are known", () => {
    expect(
      datawrapperMatch({ medium: "chart", format: "web", treatment: "Slope (slopegraph)" }),
    ).toMatchObject({ treatment: "Slope", datawrapperTypes: ["d3-lines"] });
    expect(datawrapperMatch({ medium: "chart", format: "video", treatment: "Slope" })).toBeNull();
    expect(datawrapperMatch({ medium: "map", format: "web", treatment: "Slope" })).toBeNull();
    expect(datawrapperMatch({ medium: "chart", format: "web", treatment: "Histogram" })).toBeNull();
  });

  it("keeps the state reader's carried mapping in parity with every catalogue alias", () => {
    const expected = new Map(
      DATAWRAPPER_CATALOG.splashTreatments.flatMap((mapping) =>
        mapping.aliases.map((alias) => [normalizeTreatment(alias), mapping.datawrapperTypes]),
      ),
    );
    expect([...DATAWRAPPER_TREATMENTS.entries()]).toEqual([...expected.entries()]);
    // The medium travels with the alias, and must not drift either: a copy that knows the types but
    // not which medium they answer for would hand a chart slot a locator map.
    const media = new Map(
      DATAWRAPPER_CATALOG.splashTreatments.flatMap((mapping) =>
        mapping.aliases.map((alias) => [normalizeTreatment(alias), mapping.medium]),
      ),
    );
    expect([...DATAWRAPPER_TREATMENT_MEDIA.entries()]).toEqual([...media.entries()]);
    // Each alias resolves for ITS OWN medium. This loop used to ask every alias as a chart, back
    // when the gate hard-coded `medium !== "chart"` and the three map types the pinned inventory
    // has always carried were unreachable. A treatment answers for one medium: "locator" is a map,
    // and a chart slot must not be handed one because the word matched.
    for (const mapping of DATAWRAPPER_CATALOG.splashTreatments) {
      for (const alias of mapping.aliases) {
        expect(
          datawrapperTypesForTreatment({ medium: mapping.medium, format: "web", treatment: alias }),
        ).toEqual(mapping.datawrapperTypes);
        expect(
          datawrapperTypesForTreatment({
            medium: mapping.medium === "chart" ? "map" : "chart",
            format: "web",
            treatment: alias,
          }),
        ).toBeNull();
      }
    }
    for (const treatment of ["Histogram", "Treemap", "Diverging stacked bar"]) {
      expect(
        datawrapperTypesForTreatment({ medium: "chart", format: "web", treatment }),
      ).toBeNull();
    }
  });

  it("normalizes explanatory parentheticals without turning unrelated treatments into matches", () => {
    expect(normalizeTreatment("Dumbbell (range plot)")).toBe("dumbbell");
    expect(normalizeTreatment("Waterfall (bridge)")).toBe("waterfall");
    expect(normalizeTreatment("Histogram")).toBe("histogram");
  });
});

describe("the post-treatment producer question", () => {
  it("offers Datawrapper and custom only for an eligible selected treatment", () => {
    const match = datawrapperMatch({ medium: "chart", format: "web", treatment: "Slope" });
    const turn = formatProducerGate({ treatment: "Slope", match });
    expect(turn).toContain("selected **Slope** treatment");
    expect(turn).toContain("**Datawrapper**");
    expect(turn).toContain("**Custom**");
    expect(turn.endsWith("Datawrapper or custom?")).toBe(true);
  });

  it("records the preferred provider type when Datawrapper is chosen", () => {
    expect(
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Slope (slopegraph)",
        producer: "datawrapper",
      }),
    ).toEqual({ producer: "datawrapper", datawrapperType: "d3-lines" });
    expect(
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Slope",
        producer: "custom",
      }),
    ).toEqual({ producer: "custom", datawrapperType: null });
  });

  it("keeps the preference binary while making a multi-type family's mapped default visible", () => {
    const match = datawrapperMatch({ medium: "chart", format: "web", treatment: "Bar and column" });
    const turn = formatProducerGate({ treatment: "Bar and column", match });
    expect(turn).toContain("Bar chart / Column chart");
    expect(turn).toContain("mapped implementation for this treatment is Bar chart");
    expect(turn.endsWith("Datawrapper or custom?")).toBe(true);
    expect(
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Bar and column",
        producer: "datawrapper",
      }),
    ).toEqual({ producer: "datawrapper", datawrapperType: "d3-bars" });
    expect(
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Bar and column",
        producer: "datawrapper",
        datawrapperType: "column-chart",
      }),
    ).toEqual({ producer: "datawrapper", datawrapperType: "column-chart" });
  });

  it("refuses Datawrapper for a treatment or format it cannot faithfully produce", () => {
    expect(() =>
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Histogram",
        producer: "datawrapper",
      }),
    ).toThrow(/not available through Datawrapper/);
    expect(() =>
      confirmProducerChoice({
        medium: "chart",
        format: "video",
        treatment: "Slope",
        producer: "datawrapper",
      }),
    ).toThrow(/not available through Datawrapper/);
  });

  it("canonicalizes a defensive unmapped custom answer to absent producer fields", () => {
    expect(
      confirmProducerChoice({
        medium: "chart",
        format: "web",
        treatment: "Histogram",
        producer: "custom",
      }),
    ).toEqual({ producer: null, datawrapperType: null });
  });
});

describe("persisted producer state", () => {
  let storyDir: string;
  let path: string;

  beforeEach(async () => {
    storyDir = await mkdtemp(join(tmpdir(), "producer-gate-"));
    path = join(storyDir, "STORYBOARD.md");
    for (const child of ["source", "beats", "export"]) await mkdir(join(storyDir, child));
    await writeFile(join(storyDir, "source", "article.md"), "article");
    await writeFile(join(storyDir, "source", "profile.json"), "{}");
    // Gate 2's SECOND file, recorded here so these cases stay about the producer sub-gate. The
    // survey of the article's other angles is what movement 10 writes; a story without it never
    // leaves the storyboard phase, which is asserted in `splash/test/where.test.ts`.
    await writeFile(join(storyDir, "SUBJECTS.md"), "---\nsubjects:\n---\n");
  });

  afterEach(async () => {
    await rm(storyDir, { recursive: true, force: true });
  });

  it("stops at G2-producer after the treatment is selected", async () => {
    await writeFile(path, storyboard());
    expect(checkStoryboard(parseStoryboard(await readFile(path, "utf8")).meta)).toContain(
      "slot 1: custom or Datawrapper was never chosen after the treatment selection",
    );
    expect(await whereIs(storyDir)).toMatchObject({
      phase: "storyboard",
      gate: "G2-producer",
      awaiting: "producer",
      slotId: "1",
    });
  });

  it("never asks the producer question before treatment selection", async () => {
    const text = storyboard().replace('    chosen: "Slope (slopegraph)"\n', "");
    await writeFile(path, text);
    expect(await whereIs(storyDir)).toMatchObject({
      gate: "G2-treatment",
      awaiting: "treatment",
    });
  });

  it("asks for slot one's producer before moving to slot two's treatment", async () => {
    const twoSlots = storyboard().replace(
      /---\n$/,
      `  - id: 2
    proves: "The lowest countries remain far behind."
    medium: chart
    format: web
    reachable: yes
    candidates: ["Line", "Bar and column"]
---
`,
    );
    await writeFile(path, twoSlots);
    expect(await whereIs(storyDir)).toMatchObject({
      gate: "G2-producer",
      awaiting: "producer",
      slotId: "1",
    });
  });

  it("writes the human choice atomically and then advances to production", async () => {
    await writeFile(path, storyboard());
    const fields = confirmProducerChoice({
      medium: "chart",
      format: "web",
      treatment: "Slope (slopegraph)",
      producer: "datawrapper",
    });
    await mutateStoryboard(path, { slot: { id: 1, fields } });
    const slot = parseStoryboard(await readFile(path, "utf8")).meta.slots[0];
    expect(slot).toMatchObject({ producer: "datawrapper", datawrapperType: "d3-lines" });
    expect(await whereIs(storyDir)).toMatchObject({ phase: "production", missing: [] });
  });

  for (const existing of [
    { producer: "custom" },
    { producer: "datawrapper", datawrapperType: "d3-lines" },
  ]) {
    it(`clears a stale ${existing.producer} answer when treatment changes`, async () => {
      await writeFile(
        path,
        storyboard({
          ...existing,
          candidates: ["Slope (slopegraph)", "Line"],
        }),
      );
      await mutateStoryboard(path, { slot: { id: 1, fields: { chosen: "Line" } } });
      const slot = parseStoryboard(await readFile(path, "utf8")).meta.slots[0];
      expect(slot.producer).toBeUndefined();
      expect(slot.datawrapperType).toBeUndefined();
      expect(await whereIs(storyDir)).toMatchObject({
        phase: "storyboard",
        gate: "G2-producer",
        awaiting: "producer",
      });
    });
  }

  it("refuses to combine treatment and producer confirmation in one write", async () => {
    await writeFile(path, storyboard({ candidates: ["Slope (slopegraph)", "Line"] }));
    await expect(
      mutateStoryboard(path, {
        slot: { id: 1, fields: { chosen: "Line", producer: "custom" } },
      }),
    ).rejects.toThrow(/producer gate separately/);
  });

  it("skips the preference question when the selected treatment is not in Datawrapper", async () => {
    await writeFile(
      path,
      storyboard({ treatment: "Histogram", candidates: ["Histogram", "Box plot"] }),
    );
    expect(checkStoryboard(parseStoryboard(await readFile(path, "utf8")).meta)).toEqual([]);
    expect(await whereIs(storyDir)).toMatchObject({ phase: "production", missing: [] });
  });

  it("rejects a Datawrapper type that does not implement the selected treatment", () => {
    const meta = parseStoryboard(
      storyboard({ producer: "datawrapper", datawrapperType: "d3-bars" }),
    ).meta;
    expect(checkStoryboard(meta).join(" ")).toContain("does not implement");
  });
});
