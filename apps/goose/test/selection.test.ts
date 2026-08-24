import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import visualCatalog from "../../../catalog/visual-catalog.json" with { type: "json" };
import storyboardCatalog from "../../../skills/storyboard/references/visual-catalog.json" with { type: "json" };
import {
  mutateStoryboard,
  parseStoryboard,
} from "../../../skills/storyboard/scripts/storyboard.mjs";
import {
  createSelectionService,
  visualCatalogRevision,
} from "../selection.mjs";
import { createStoryBinding } from "../story-binding.mjs";

const SCALARS = `takeaway: "Every sampled country increased adoption while the gap remained wide."
subject: "Ten sampled countries"
comparison: "2021 against 2025"
limits: "A synthetic sample"
placement: "after the third paragraph"
credit: "Source: Splash Test Desk"
effectiveDate: "2026-08-14"
grounding: supported`;

function storyboard(slot: string, { reference = false } = {}) {
  return `---
${SCALARS}
${reference ? 'reference: "The Pudding, slope comparison"\n' : ""}slots:
${slot}
---

Keep this journalist prose byte-for-byte.
`;
}

function formatGate(medium = "chart") {
  return storyboard(`  - id: 1
    proves: "Adoption rose while the gap persisted."
    medium: ${medium}`);
}

function treatmentGate({ chosen = false } = {}) {
  return storyboard(
    `  - id: 1
    proves: "Adoption rose while the gap persisted."
    medium: chart
    format: web
    reachable: yes
    candidates: [Line, "Slope (slopegraph)"]${chosen ? '\n    chosen: "Slope (slopegraph)"' : ""}`,
    { reference: true },
  );
}

function expected(model: any) {
  return {
    storyRevision: model.revisions.story,
    catalogRevision: model.revisions.catalogue,
    capabilityGeneration: model.revisions.capabilities,
  };
}

let root: string;
let storyPath: string;
let binding: ReturnType<typeof createStoryBinding>;
let bindingContext: any;
let capabilityState: {
  generation: string;
  available: string[];
  reasons?: Record<string, string>;
};
let currentCatalog: any;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "splash-selection-")));
  storyPath = join(root, "story-one");
  await mkdir(join(storyPath, "source"), { recursive: true });
  await mkdir(join(storyPath, "beats"));
  await mkdir(join(storyPath, "export"));
  await writeFile(join(storyPath, "AGENTS.md"), "# Story instructions\n");
  // S5 parity: `whereIs` leaves intake only when all three frozen files exist.
  await writeFile(join(storyPath, "source", "article.md"), "Article\n");
  await writeFile(join(storyPath, "source", "data.csv"), "country,value\nFrance,1\n");
  await writeFile(join(storyPath, "source", "profile.json"), "{}\n");
  await writeFile(join(storyPath, "STORYBOARD.md"), formatGate());
  const randomValues = [
    "binding-challenge-123456789",
    "binding-capability-123456789",
  ];
  binding = createStoryBinding({
    sessionId: "selection-session-123456789",
    random: () => randomValues.shift()!,
    async inspect(path: string) {
      if (path !== storyPath)
        throw new Error("Engine refused a different story");
      return {
        storyId: "story-one",
        canonicalPath: storyPath,
        articlePath: join(storyPath, "source", "article.md"),
        hasStoryboard: true,
      };
    },
  });
  await binding.nominate(storyPath);
  binding.confirm("binding-challenge-123456789");
  bindingContext = binding.context();
  capabilityState = {
    generation: "capabilities:1",
    available: ["map", "map-delivery", "datawrapper", "hosted-embed"],
  };
  currentCatalog = structuredClone(visualCatalog);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function service() {
  return createSelectionService({
    storyBinding: binding,
    capabilityProvider: async () => capabilityState,
    catalogProvider: async () => currentCatalog,
  });
}

describe("shared revision-safe selection domain", () => {
  it("loads the bound active gate without writing on read, focus, details, or cancellation", async () => {
    const before = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
    const model = await service().read({ bindingContext });
    expect(model.schemaVersion).toBe("splash-selection/v1");
    expect(model.story).toEqual({
      storyId: "story-one",
      canonicalPath: storyPath,
    });
    expect(model.gate).toEqual({ id: "G2b", awaiting: "format" });
    expect(
      model.choices.filter((row: any) => row.enabled).map((row: any) => row.id),
    ).toEqual([
      "format.static",
      "format.web",
      "format.video",
      "format.scrolly",
    ]);
    expect(model.revisions.catalogue).toBe(
      visualCatalogRevision(currentCatalog),
    );
    expect(model.revisions.catalogue).toBe(storyboardCatalog.catalogRevision);
    await service().read({ bindingContext });
    expect(await readFile(join(storyPath, "STORYBOARD.md"), "utf8")).toBe(
      before,
    );
  });

  it("confirms only the active gate fields and preserves unrelated content", async () => {
    const selection = service();
    const model = await selection.read({ bindingContext });
    const next = await selection.confirm({
      bindingContext,
      expected: expected(model),
      optionId: "format.web",
    });
    const written = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
    const slot = parseStoryboard(written).meta.slots[0];
    expect(slot).toMatchObject({
      id: "1",
      medium: "chart",
      format: "web",
      reachable: "yes",
    });
    expect(slot.size).toBeUndefined();
    expect(slot.chosen).toBeUndefined();
    expect(written).toContain("Keep this journalist prose byte-for-byte.");
    expect(next.gate).toEqual({ id: "G2-reference", awaiting: "reference" });
  });

  it("writes byte-identical storyboard state through the graphical and skill-local paths", async () => {
    const skillLocalPath = join(storyPath, "STORYBOARD.skill-local.md");
    const before = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
    await writeFile(skillLocalPath, before);
    const selection = service();
    const model = await selection.read({ bindingContext });
    await selection.confirm({
      bindingContext,
      expected: expected(model),
      optionId: "format.web",
    });
    await mutateStoryboard(skillLocalPath, {
      slot: {
        id: 1,
        fields: {
          format: "web",
          size: null,
          reachable: "yes",
          candidates: null,
          chosen: null,
        },
      },
    });
    expect(await readFile(join(storyPath, "STORYBOARD.md"), "utf8")).toBe(
      await readFile(skillLocalPath, "utf8"),
    );
  });

  it("rejects stale story, catalogue, and capability generations without writing", async () => {
    for (const stale of ["story", "catalogue", "capabilities"]) {
      await writeFile(join(storyPath, "STORYBOARD.md"), formatGate());
      currentCatalog = structuredClone(visualCatalog);
      capabilityState = {
        generation: "capabilities:1",
        available: ["map", "datawrapper"],
      };
      const selection = service();
      const model = await selection.read({ bindingContext });
      if (stale === "story")
        await writeFile(
          join(storyPath, "STORYBOARD.md"),
          `${formatGate()}\n<!-- editor change -->\n`,
        );
      if (stale === "catalogue")
        currentCatalog.formats[0].description += " Changed.";
      if (stale === "capabilities")
        capabilityState.generation = "capabilities:2";
      const before = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
      await expect(
        selection.confirm({
          bindingContext,
          expected: expected(model),
          optionId: "format.web",
        }),
      ).rejects.toThrow(/changed|refresh/);
      expect(await readFile(join(storyPath, "STORYBOARD.md"), "utf8")).toBe(
        before,
      );
    }
  });

  it("disables only capability-dependent options and names the repair", async () => {
    await writeFile(join(storyPath, "STORYBOARD.md"), formatGate("map"));
    capabilityState = {
      generation: "capabilities:no-map",
      available: [],
      reasons: { map: "MapTiler has not been configured for this newsroom." },
    };
    const selection = service();
    const model = await selection.read({ bindingContext });
    expect(model.choices.every((row: any) => row.enabled === false)).toBe(true);
    expect(model.choices[0]).toMatchObject({
      reason: "MapTiler has not been configured for this newsroom.",
      repairAction: "open-readiness",
    });
    const before = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
    await expect(
      selection.confirm({
        bindingContext,
        expected: expected(model),
        optionId: "format.web",
      }),
    ).rejects.toThrow("MapTiler");
    expect(await readFile(join(storyPath, "STORYBOARD.md"), "utf8")).toBe(
      before,
    );
  });

  it("keeps an optional delivery capability separate from format reachability", async () => {
    capabilityState = {
      generation: "capabilities:no-hosting",
      available: [],
      reasons: {
        "hosted-embed": "Cloudflare hosted delivery is not configured.",
      },
    };
    const before = await readFile(join(storyPath, "STORYBOARD.md"), "utf8");
    const current = await service().read({ bindingContext });
    const web = current.choices.find((row: any) => row.id === "format.web");
    expect(web.enabled).toBe(true);
    expect(
      web.deliveryOptions.find((row: any) => row.id === "embed"),
    ).toMatchObject({
      enabled: false,
      reason: "Cloudflare hosted delivery is not configured.",
      repairAction: "open-readiness",
    });
    expect(await readFile(join(storyPath, "STORYBOARD.md"), "utf8")).toBe(
      before,
    );
  });

  it("can re-confirm a format whose recorded reachability is missing", async () => {
    await writeFile(
      join(storyPath, "STORYBOARD.md"),
      formatGate().replace(
        "    medium: chart",
        "    medium: chart\n    format: web",
      ),
    );
    const selection = service();
    const model = await selection.read({ bindingContext });
    expect(model.gate).toEqual({ id: "G2b", awaiting: "reachability" });
    expect(model.choices.map((row: any) => row.id)).toContain("format.web");
    await selection.confirm({
      bindingContext,
      expected: expected(model),
      optionId: "format.web",
    });
    expect(
      parseStoryboard(await readFile(join(storyPath, "STORYBOARD.md"), "utf8"))
        .meta.slots[0].reachable,
    ).toBe("yes");
  });

  it("keeps treatment and producer as separate confirmations and resolves Datawrapper deterministically", async () => {
    await writeFile(join(storyPath, "STORYBOARD.md"), treatmentGate());
    const selection = service();
    const treatment = await selection.read({ bindingContext });
    expect(treatment.gate).toEqual({
      id: "G2-treatment",
      awaiting: "treatment",
    });
    expect(treatment.choices.map((row: any) => row.id)).toEqual([
      "chart.line",
      "chart.slope",
    ]);
    await expect(
      selection.confirm({
        bindingContext,
        expected: expected(treatment),
        optionId: "format.static",
      }),
    ).rejects.toThrow("current gate");

    const producer = await selection.confirm({
      bindingContext,
      expected: expected(treatment),
      optionId: "chart.slope",
    });
    expect(producer.gate).toEqual({ id: "G2-producer", awaiting: "producer" });
    let slot = parseStoryboard(
      await readFile(join(storyPath, "STORYBOARD.md"), "utf8"),
    ).meta.slots[0];
    expect(slot.chosen).toBe("Slope (slopegraph)");
    expect(slot.producer).toBeUndefined();

    const complete = await selection.confirm({
      bindingContext,
      expected: expected(producer),
      optionId: "producer.datawrapper",
    });
    expect(complete.phase).toBe("production");
    expect(complete.gate).toBeNull();
    slot = parseStoryboard(
      await readFile(join(storyPath, "STORYBOARD.md"), "utf8"),
    ).meta.slots[0];
    expect(slot).toMatchObject({
      producer: "datawrapper",
      datawrapperType: "d3-lines",
    });
  });

  it("rewinds format dependencies in a separate command before another candidate can be confirmed", async () => {
    await writeFile(
      join(storyPath, "STORYBOARD.md"),
      treatmentGate({ chosen: true }),
    );
    const selection = service();
    const model = await selection.read({ bindingContext });
    expect(model.gate?.id).toBe("G2-producer");
    const reopened = await selection.reopenFormat({
      bindingContext,
      expected: expected(model),
    });
    expect(reopened.gate).toEqual({ id: "G2b", awaiting: "format" });
    const slot = parseStoryboard(
      await readFile(join(storyPath, "STORYBOARD.md"), "utf8"),
    ).meta.slots[0];
    expect(slot.medium).toBe("chart");
    for (const field of [
      "format",
      "size",
      "reachable",
      "candidates",
      "chosen",
      "producer",
      "datawrapperType",
    ]) {
      expect(slot[field]).toBeUndefined();
    }
  });

  it("reopens treatment without changing the confirmed publication format", async () => {
    await writeFile(
      join(storyPath, "STORYBOARD.md"),
      treatmentGate({ chosen: true }),
    );
    const selection = service();
    const model = await selection.read({ bindingContext });
    expect(model.gate?.id).toBe("G2-producer");
    const reopened = await selection.reopenTreatment({
      bindingContext,
      expected: expected(model),
    });
    expect(reopened.gate).toEqual({
      id: "G2-treatment",
      awaiting: "treatment",
    });
    const slot = parseStoryboard(
      await readFile(join(storyPath, "STORYBOARD.md"), "utf8"),
    ).meta.slots[0];
    expect(slot.format).toBe("web");
    expect(slot.chosen).toBeUndefined();
    expect(slot.producer).toBeUndefined();
    expect(slot.datawrapperType).toBeUndefined();
  });

  it("lets exactly one concurrent confirmation win from one observed revision", async () => {
    const selection = service();
    const model = await selection.read({ bindingContext });
    const results = await Promise.allSettled([
      selection.confirm({
        bindingContext,
        expected: expected(model),
        optionId: "format.web",
      }),
      selection.confirm({
        bindingContext,
        expected: expected(model),
        optionId: "format.static",
      }),
    ]);
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((row) => row.status === "rejected")).toHaveLength(1);
    expect(
      (
        results.find(
          (row) => row.status === "rejected",
        ) as PromiseRejectedResult
      ).reason.code,
    ).toBe("REVISION_CONFLICT");
    const slot = parseStoryboard(
      await readFile(join(storyPath, "STORYBOARD.md"), "utf8"),
    ).meta.slots[0];
    expect(["web", "static"]).toContain(slot.format);
  });
});
