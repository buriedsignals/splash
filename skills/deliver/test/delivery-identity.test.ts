import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportDirFor, materialise, offerForms } from "../scripts/deliver.mjs";
import {
  LEGACY_DELIVERY_ADAPTER_VERSION,
  exportDirForLegacyV1,
  materialiseLegacyV1,
  offerFormsLegacyV1,
} from "../scripts/delivery-compat-v1.mjs";
import { resolveDeliveryIdentity } from "../scripts/delivery-identity.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

const handover = {
  language: "en",
  placement: "after the first paragraph",
  alt: "Rainfall by winter",
  credit: "Source: MeteoSwiss",
};

let tempRoot: string;
let storiesRoot: string;
let storyDir: string;
let beatDir: string;
let identity: { storiesRoot: string; storyId: string; outputId: string };

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "delivery-identity-"));
  storiesRoot = join(tempRoot, "stories");
  storyDir = join(storiesRoot, "rainfall-story");
  beatDir = join(storyDir, "beats", "output-rainfall");
  identity = {
    storiesRoot,
    storyId: "rainfall-story",
    outputId: "output-rainfall",
  };
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await approveCurrentOutput(beatDir);
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function reviewed(options = {}) {
  return {
    ...identity,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
    ...options,
  };
}

describe("canonical delivery identity", () => {
  it("derives the source and only legal replacement target from the declared root and IDs", async () => {
    const paths = resolveDeliveryIdentity(identity);
    expect(paths.beatDir).toBe(await realpath(beatDir));
    expect(paths.exportDir).toBe(join(paths.storyDir, "export", "output-rainfall"));
    expect(exportDirFor(identity)).toBe(paths.exportDir);
  });

  it("drives offer and materialise without accepting source or destination paths", async () => {
    expect(offerForms(reviewed({ medium: "chart", format: "static" }))).toHaveLength(3);
    const written = await materialise(
      reviewed({ form: "owned-file", format: "static", handover }),
    );
    const exportDir = exportDirFor(identity);
    expect(written).toContain(join(exportDir, "still.png"));
    expect(await readFile(join(exportDir, "still.png"), "utf8")).toBe("png-bytes");
  });

  it("rejects traversal IDs before they can name a source or replacement target", async () => {
    expect(() => exportDirFor({ ...identity, storyId: "../outside" })).toThrow(/storyId/);
    await expect(
      materialise(
        reviewed({
          outputId: "../outside",
          form: "owned-file",
          format: "static",
          handover,
        }),
      ),
    ).rejects.toThrow(/outputId/);
  });

  it("rejects legacy path fields on the canonical API", async () => {
    expect(() =>
      offerForms(
        reviewed({ medium: "chart", format: "static", beatDir }),
      ),
    ).toThrow(/delivery-compat-v1/);
    await expect(
      materialise(
        reviewed({
          form: "owned-file",
          format: "static",
          handover,
          beatDir,
          exportDir: join(tempRoot, "outside"),
        }),
      ),
    ).rejects.toThrow(/delivery-compat-v1/);
  });

  it("rejects a symlinked stories root and a symlinked story ancestor", async () => {
    const linkedRoot = join(tempRoot, "linked-stories");
    await symlink(storiesRoot, linkedRoot, "dir");
    expect(() => offerForms(reviewed({ storiesRoot: linkedRoot, format: "static" }))).toThrow(
      /symlinked stories root/,
    );

    const linkedStory = join(storiesRoot, "linked-story");
    await symlink(storyDir, linkedStory, "dir");
    expect(() =>
      offerForms(
        reviewed({ storyId: "linked-story", medium: "chart", format: "static" }),
      ),
    ).toThrow(/symlinked story directory/);
  });
});

describe("legacy delivery adapter v1", () => {
  it("is explicitly versioned and preserves the real one-output path", async () => {
    expect(LEGACY_DELIVERY_ADAPTER_VERSION).toBe(1);
    const exportDir = exportDirFor(identity);
    expect(
      exportDirForLegacyV1({
        storiesRoot,
        storyDir,
        beatName: identity.outputId,
      }),
    ).toBe(exportDir);
    expect(
      offerFormsLegacyV1({
        storiesRoot,
        beatDir,
        medium: "chart",
        format: "static",
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toHaveLength(3);
    await materialiseLegacyV1({
      storiesRoot,
      beatDir,
      exportDir,
      form: "owned-file",
      format: "static",
      handover,
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
    });
    expect(await readFile(join(exportDir, "still.png"), "utf8")).toBe("png-bytes");
  });

  it("validates then discards a legacy export path instead of using it as a target", async () => {
    const outsideStory = join(tempRoot, "outside-story");
    const outsideExport = join(outsideStory, "export", identity.outputId);
    await mkdir(outsideExport, { recursive: true });
    await writeFile(join(outsideExport, "sentinel.txt"), "keep-me");

    await expect(
      materialiseLegacyV1({
        storiesRoot,
        beatDir,
        exportDir: outsideExport,
        form: "owned-file",
        format: "static",
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/supplied path is never used/);
    expect(await readFile(join(outsideExport, "sentinel.txt"), "utf8")).toBe("keep-me");
  });

  it("refuses a symlinked ancestor in a legacy export path", async () => {
    const linkedStory = join(storiesRoot, "linked-rainfall-story");
    await symlink(storyDir, linkedStory, "dir");
    await expect(
      materialiseLegacyV1({
        storiesRoot,
        beatDir,
        exportDir: join(linkedStory, "export", identity.outputId),
        form: "owned-file",
        format: "static",
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/symlinked ancestor in exportDir/);
  });

  it("refuses a beat outside the declared stories root", async () => {
    const outsideRoot = join(tempRoot, "outside");
    const outsideBeat = join(outsideRoot, "other-story", "beats", "other-output");
    await mkdir(join(outsideBeat, "renders"), { recursive: true });
    await expect(
      materialiseLegacyV1({
        storiesRoot,
        beatDir: outsideBeat,
        exportDir: join(outsideRoot, "other-story", "export", "other-output"),
        form: "owned-file",
        format: "static",
        handover,
      }),
    ).rejects.toThrow(/inside storiesRoot/);
  });
});
