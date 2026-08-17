import { afterEach, describe, expect, it } from "bun:test";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { offerForms } from "../../../skills/deliver/scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "../../../skills/deliver/test/output-review-fixture";
import { whereIs } from "../../../skills/splash/scripts/where.mjs";
import { createRecommendationService } from "../recommendation.mjs";
import { createSelectionService } from "../selection.mjs";
import { createStoryBinding } from "../story-binding.mjs";

const FIXTURE = join(
  import.meta.dirname,
  "../../../stories/heat-pump-adoption-across-europe",
);

const PRE_TREATMENT_STORYBOARD = `---
takeaway: "Every sampled country increased heat-pump adoption from 2021 to 2025 while the 2025 gap remained wide."
subject: "The ten sampled countries, with the Nordic-to-lowest gap as the focal tension"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample, not a complete European census and not evidence of causation"
placement: "After the third paragraph of article.md"
credit: "Source: Splash Test Desk synthetic dataset"
effectiveDate: "2026-07-15"
grounding: supported
reference: "none — no matching newsroom reference was available in this test"
language: en
slots:
  - id: 1
    proves: "Every sampled country moved upward while the endpoint gap remained wide."
    medium: chart
    format: web
    reachable: yes
---

The visual treatment is deliberately unchosen so the Goose interface owns only G2-treatment.
`;

function expected(model: any) {
  return {
    storyRevision: model.revisions.story,
    catalogRevision: model.revisions.catalogue,
    capabilityGeneration: model.revisions.capabilities,
  };
}

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
});

describe("Goose heat-pump acceptance pipeline", () => {
  it("keeps chat gates ordered, exposes both treatment interfaces, and reaches G4 without deploying", async () => {
    root = await realpath(
      await mkdtemp(join(tmpdir(), "splash-heat-pump-acceptance-")),
    );
    const storyDir = join(root, "heat-pump-pipeline");
    await mkdir(join(storyDir, "source"), { recursive: true });
    await mkdir(join(storyDir, "beats"));
    await mkdir(join(storyDir, "export"));

    expect((await whereIs(storyDir)).phase).toBe("intake");
    for (const name of ["article.md", "profile.json", "data.csv"]) {
      await copyFile(join(FIXTURE, "source", name), join(storyDir, "source", name));
    }
    const article = await readFile(join(storyDir, "source", "article.md"), "utf8");
    expect(article).toContain("Europe’s heat-pump gap is narrowing");
    expect((await whereIs(storyDir)).phase).toBe("framing");

    await writeFile(join(storyDir, "STORYBOARD.md"), PRE_TREATMENT_STORYBOARD);
    expect(await whereIs(storyDir)).toMatchObject({
      phase: "storyboard",
      gate: "G2-treatment",
      awaiting: "treatment",
    });

    const randomValues = [
      "heat-pump-challenge-123456789",
      "heat-pump-capability-123456789",
    ];
    const binding = createStoryBinding({
      sessionId: "heat-pump-session-123456789",
      random: () => randomValues.shift()!,
      async inspect(path: string) {
        if (path !== storyDir) throw new Error("unexpected story target");
        return {
          storyId: basename(storyDir),
          canonicalPath: storyDir,
          articlePath: join(storyDir, "source", "article.md"),
          hasStoryboard: true,
        };
      },
    });
    await binding.nominate(storyDir);
    binding.confirm("heat-pump-challenge-123456789");
    const bindingContext = binding.context();
    const selection = createSelectionService({
      storyBinding: binding,
      capabilityProvider: async () => ({
        generation: "heat-pump-capabilities:1",
        available: [],
        reasons: {},
      }),
    });

    const alaCarte = await selection.read({ bindingContext });
    const visible = alaCarte.choices.filter((choice: any) => choice.enabled);
    expect(alaCarte.gate.id).toBe("G2-treatment");
    expect(visible.length).toBeGreaterThan(10);
    expect(visible.some((choice: any) => choice.id === "chart.slope")).toBe(true);
    expect(visible.every((choice: any) => choice.advice === undefined)).toBe(true);

    const recommendation = createRecommendationService({
      selection,
      async profileProvider() {
        return JSON.parse(
          await readFile(join(storyDir, "source", "profile.json"), "utf8"),
        );
      },
    });
    const storyboard = await recommendation.read({ bindingContext });
    expect(storyboard.selection.choices).toEqual(alaCarte.choices);
    expect(storyboard.recommendation.ranking).toHaveLength(2);
    expect(storyboard.recommendation.recommendedOptionId).toBe("chart.slope");
    expect(storyboard.recommendation.ranking[0].optionId).toBe("chart.slope");

    await recommendation.confirm({
      bindingContext,
      expected: expected(storyboard.selection),
      recommendationRevision: storyboard.recommendation.revision,
      optionId: "chart.slope",
    });
    expect(await whereIs(storyDir)).toMatchObject({
      phase: "storyboard",
      gate: "G2-producer",
      awaiting: "producer",
    });

    const producer = await selection.read({ bindingContext });
    await selection.confirm({
      bindingContext,
      expected: expected(producer),
      optionId: "producer.custom",
    });
    expect((await whereIs(storyDir)).phase).toBe("production");

    const outputId = "1-heat-pump-gap";
    const beatDir = join(storyDir, "beats", outputId);
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(
      join(beatDir, "renders", "interactive.html"),
      "<!doctype html><title>Heat-pump gap</title>",
    );
    await writeFile(join(beatDir, "APPROVED.md"), "Approved in G3.\n");
    await approveCurrentOutput(beatDir);
    expect((await whereIs(storyDir)).phase).toBe("delivery");

    const forms = offerForms({
      storiesRoot: dirname(storyDir),
      storyId: basename(storyDir),
      outputId,
      medium: "chart",
      format: "web",
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
      env: {},
    });
    expect(forms.map((form) => form.id)).toEqual([
      "owned-file",
      "source-bundle",
      "embed",
      "cms-insertion",
    ]);
    expect(forms.find((form) => form.id === "embed")?.available).toBe(false);
    expect(await whereIs(storyDir)).toMatchObject({
      phase: "delivery",
      missing: [],
    });
    expect(await readFile(join(storyDir, "STORYBOARD.md"), "utf8")).toContain(
      'chosen: "Slope (slopegraph)"',
    );
  });
});
