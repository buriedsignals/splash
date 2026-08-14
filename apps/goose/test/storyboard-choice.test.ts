import { describe, expect, it } from "bun:test";
import { createRecommendationService } from "../recommendation.mjs";
import {
  createStoryboardChoice,
  decorateStoryboardSelection,
} from "../resources/storyboard-choice.mjs";
import { recommendVisualChoice } from "../../../skills/storyboard/scripts/propose.mjs";

const selection = {
  schemaVersion: "splash-selection/v1",
  story: { storyId: "story-one", canonicalPath: "/stories/story-one" },
  phase: "storyboard",
  gate: { id: "G2-treatment", awaiting: "treatment" },
  slot: {
    id: "1",
    proves: "Adoption rose across five annual observations.",
    medium: "chart",
    format: "web",
  },
  evidence: {
    proves: "Adoption rose across five annual observations.",
    comparison: "2021 against 2025",
    placement: "after the third paragraph",
  },
  revisions: {
    story: "sha256:story",
    catalogue: "sha256:catalogue",
    capabilities: "sha256:capabilities",
  },
  choices: [
    {
      id: "chart.line",
      kind: "treatment",
      value: "Line",
      label: "Line",
      description: "A series on an ordered axis.",
      dataShape: { requires: ["numeric-series", "ordered-axis"] },
      enabled: true,
      reason: null,
      repairAction: null,
    },
    {
      id: "chart.boxplot",
      kind: "treatment",
      value: "Box plot",
      label: "Box plot",
      description: "A distribution.",
      dataShape: { requires: ["distribution"] },
      enabled: true,
      reason: null,
      repairAction: null,
    },
    {
      id: "chart.contour",
      kind: "treatment",
      value: "Contour / isoline",
      label: "Contour / isoline",
      description: "A continuous field.",
      dataShape: { requires: ["continuous-field"] },
      enabled: false,
      proofOnly: true,
      reason: "No production implementation exists.",
      repairAction: null,
    },
  ],
};

const profile = {
  rowCount: 50,
  columns: [
    { name: "country", type: "text", distinct: 10 },
    { name: "year", type: "number", distinct: 5, min: 2021, max: 2025 },
    { name: "adoption_pct", type: "number", distinct: 30, min: 3, max: 64 },
  ],
};

function expected() {
  return {
    storyRevision: selection.revisions.story,
    catalogRevision: selection.revisions.catalogue,
    capabilityGeneration: selection.revisions.capabilities,
  };
}

describe("Storyboard recommendation service", () => {
  it("reads advice without writing and confirms a reachable alternative through U7 unchanged", async () => {
    const confirms: any[] = [];
    let currentSelection: any = structuredClone(selection);
    const service = createRecommendationService({
      selection: {
        async read() {
          return structuredClone(currentSelection);
        },
        async confirm(value: any) {
          confirms.push(value);
          currentSelection = {
            ...structuredClone(selection),
            gate: null,
            phase: "production",
            choices: [],
          };
          return structuredClone(currentSelection);
        },
      },
      async profileProvider() {
        return structuredClone(profile);
      },
    });
    const current = await service.read({ bindingContext: { opaque: true } });
    expect(confirms).toHaveLength(0);
    expect(current.recommendation.recommendedOptionId).toBe("chart.line");
    expect(
      current.recommendation.ranking.map((row: any) => row.optionId),
    ).toEqual(["chart.line", "chart.boxplot"]);

    const next = await service.confirm({
      bindingContext: { opaque: true },
      expected: expected(),
      recommendationRevision: current.recommendation.revision,
      optionId: "chart.boxplot",
    });
    expect(confirms).toEqual([
      {
        bindingContext: { opaque: true },
        expected: expected(),
        optionId: "chart.boxplot",
      },
    ]);
    expect(next).toMatchObject({
      schemaVersion: "splash-storyboard-choice/v1",
      selection: { phase: "production", gate: null },
      recommendation: { recommendedOptionId: null },
    });
  });

  it("rejects stale rationale and unreachable proof rows without calling the writer", async () => {
    let currentProfile: any = structuredClone(profile);
    const confirms: any[] = [];
    const service = createRecommendationService({
      selection: {
        async read() {
          return structuredClone(selection);
        },
        async confirm(value: any) {
          confirms.push(value);
          return structuredClone(selection);
        },
      },
      async profileProvider() {
        return structuredClone(currentProfile);
      },
    });
    const current = await service.read({ bindingContext: { opaque: true } });
    await expect(
      service.confirm({
        bindingContext: { opaque: true },
        expected: expected(),
        recommendationRevision: current.recommendation.revision,
        optionId: "chart.contour",
      }),
    ).rejects.toThrow("not reachable");
    currentProfile = { ...currentProfile, rowCount: 51 };
    await expect(
      service.confirm({
        bindingContext: { opaque: true },
        expected: expected(),
        recommendationRevision: current.recommendation.revision,
        optionId: "chart.line",
      }),
    ).rejects.toThrow("evidence changed");
    expect(confirms).toHaveLength(0);
  });
});

describe("shared Storyboard choice presentation", () => {
  it("orders the recommendation first, shows rationale, and leaves proof-only rows unavailable", () => {
    const recommendation = recommendVisualChoice({ model: selection, profile });
    const decorated = decorateStoryboardSelection(selection, recommendation);
    expect(decorated.choices.map((row: any) => row.id)).toEqual([
      "chart.line",
      "chart.boxplot",
      "chart.contour",
    ]);
    expect(decorated.choices[0].advice).toMatchObject({
      recommended: true,
      rank: 1,
    });
    expect(decorated.choices[0].advice.matchedEvidence.length).toBeGreaterThan(
      0,
    );
    expect(decorated.choices[2]).toMatchObject({
      enabled: false,
      proofOnly: true,
    });
  });

  it("reuses the shared chooser and adds only the current recommendation revision to confirmation", async () => {
    const recommendation = recommendVisualChoice({ model: selection, profile });
    let sharedOptions: any = null;
    let rendered: any = null;
    let confirmed: any = null;
    const component = createStoryboardChoice({
      onConfirm(value: any) {
        confirmed = value;
        const nextSelection = {
          ...structuredClone(selection),
          gate: null,
          phase: "production",
          choices: [],
        };
        return {
          schemaVersion: "splash-storyboard-choice/v1",
          selection: nextSelection,
          recommendation: recommendVisualChoice({
            model: nextSelection,
            profile,
          }),
        };
      },
      chooserFactory(options: any) {
        sharedOptions = options;
        return {
          render(value: any) {
            rendered = value;
          },
          clear() {},
        };
      },
    });
    component.render({ selection, recommendation });
    expect(rendered.choices[0].advice.recommended).toBe(true);
    const next = await sharedOptions.onConfirm({
      optionId: "chart.boxplot",
      expected: expected(),
    });
    expect(confirmed).toEqual({
      optionId: "chart.boxplot",
      expected: expected(),
      recommendationRevision: recommendation.revision,
    });
    expect(next).toMatchObject({ phase: "production", gate: null });
  });

  it("rejects a recommendation bound to a stale selection revision", () => {
    const recommendation = recommendVisualChoice({ model: selection, profile });
    expect(() =>
      decorateStoryboardSelection(
        {
          ...selection,
          revisions: { ...selection.revisions, story: "sha256:changed" },
        },
        recommendation,
      ),
    ).toThrow("does not match");
  });
});
