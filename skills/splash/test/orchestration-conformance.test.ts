import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "../../deliver/test/output-review-fixture";
import type { BoundReviewFixture } from "../../deliver/test/output-review-fixture";
import {
  publishStagedDelivery,
  replacementArtifacts,
} from "../../deliver/scripts/delivery-replacement.mjs";
import { runOperation } from "../scripts/run-operation.mjs";
import { whereIs } from "../scripts/where.mjs";

const OUTPUT_ID = "1-rainfall";
const STORYBOARD = `---
takeaway: "Rainfall fell by a third in ten years."
subject: "Rainfall trends in the Rhône basin"
comparison: "the last decade against the one before it"
limits: "single weather station, not basin-wide"
placement: "above the fold, article-web"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"
grounding: supported
reference: "The Pudding, redraft — mid-table deviation"
language: en
slots:
  - id: 1
    proves: "Rainfall fell by a third in ten years."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---
`;
const RENDER = '<svg xmlns="http://www.w3.org/2000/svg"><title>Rainfall fell</title><path d="M0 0L1 1"/></svg>';

let workspace: string;
let storiesRoot: string;
let storyDir: string;
let beatDir: string;

function sha256(value: string | Buffer) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function currentBrief(
  planVersion = TEST_PLAN_VERSION,
  findingIds = TEST_FINDING_IDS,
) {
  return `---
planVersion: ${planVersion}
findingIds: [${findingIds.join(", ")}]
---

# Current beat plan
`;
}

async function writeCurrentBrief(
  targetBeatDir = beatDir,
  planVersion = TEST_PLAN_VERSION,
  findingIds = TEST_FINDING_IDS,
) {
  await writeFile(
    join(targetBeatDir, "BRIEF.md"),
    currentBrief(planVersion, findingIds),
  );
}

async function currentAnalystHashes() {
  return {
    storyboard: sha256(await readFile(join(storyDir, "STORYBOARD.md"))),
    profile: sha256(await readFile(join(storyDir, "source", "profile.json"))),
    sourceData: sha256(await readFile(join(storyDir, "source", "data.csv"))),
  };
}

async function writeCurrentAnalystData(targetBeatDir = beatDir) {
  await writeFile(
    join(targetBeatDir, "data.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      meta: { hashes: await currentAnalystHashes() },
      rows: [{ year: 2026, rainfall: 67 }],
    })}\n`,
  );
}

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), "splash-conformance-")));
  storiesRoot = join(workspace, "stories");
  storyDir = join(storiesRoot, "demo");
  beatDir = join(storyDir, "beats", OUTPUT_ID);
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await mkdir(join(storyDir, "export"), { recursive: true });
  await mkdir(join(storyDir, "source"), { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function freezeAndRender() {
  await writeFile(join(storyDir, "source", "article.md"), "Rainfall fell.\n");
  await writeFile(join(storyDir, "source", "data.csv"), "year,rainfall\n2025,100\n2026,67\n");
  await writeFile(join(storyDir, "source", "profile.json"), "{}\n");
  await writeFile(join(storyDir, "STORYBOARD.md"), STORYBOARD);
  await writeCurrentBrief();
  await writeCurrentAnalystData();
  await writeFile(join(beatDir, "renders", "rainfall.svg"), RENDER);
}

async function bindApproval() {
  const review = await approveCurrentOutput(beatDir, { reviewId: "review-demo-1" });
  await writeFile(join(beatDir, "APPROVED.md"), `Bound by ${review.id}\n`);
  return review;
}

async function bindDelivery(review: BoundReviewFixture) {
  const exportDir = join(storyDir, "export", OUTPUT_ID);
  const operationId = "delivery-demo-1";
  const { stagingDir } = replacementArtifacts(exportDir, operationId);
  await mkdir(stagingDir, { recursive: true });
  await writeFile(join(stagingDir, "rainfall.svg"), RENDER);
  await writeFile(
    join(stagingDir, "HANDOVER.md"),
    "# Rainfall visualization\nPlace above the fold.\n",
  );
  await publishStagedDelivery({
    stagingDir,
    exportDir,
    manifest: {
      operationId,
      reviewId: review.id,
      planVersion: review.planVersion,
      draftDigest: review.draftDigest,
      findingIds: review.findingIds,
      form: "owned-file",
      format: "static",
    },
  });
}

async function completeDemo() {
  await freezeAndRender();
  const review = await bindApproval();
  await bindDelivery(review);
}

async function productionReceiptFixture(outputId = OUTPUT_ID) {
  await freezeAndRender();
  await unlink(join(beatDir, "renders", "rainfall.svg"));
  const spec = "{}\n";
  await writeFile(join(beatDir, "spec.json"), spec);
  return {
    path: join(beatDir, "PRODUCTION-ATTEMPTS.json"),
    receipt: {
      schemaVersion: 1,
      operation: "datawrapper-produce",
      outputId,
      inputPath: "spec.json",
      inputDigest: sha256(spec),
      attempts: 3,
      status: "blocked",
      reason: "third failure; attempt limit reached",
    },
  };
}

async function settled(run: () => Promise<unknown>) {
  try {
    await run();
    return { status: "fulfilled" };
  } catch (error) {
    return {
      status: "rejected",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runRequestedProduction(onDispatch: () => void) {
  return runOperation(
    "datawrapper-produce",
    {
      storyId: "demo",
      outputId: OUTPUT_ID,
      canonicalStoryPath: storyDir,
      canonicalStoriesRoot: storiesRoot,
      canonicalWorkspaceRoot: workspace,
      parameters: { format: "static", size: "landscape" },
    },
    {
      runSkillEntrypointFn: async () => {
        onDispatch();
        return {
          format: "static",
          chartId: "chart-1",
          publicUrl: "https://example.invalid/chart-1",
        };
      },
    },
  );
}

async function runRequestedMapProduction(
  contractDigest: string,
  onDispatch: () => void,
) {
  return runOperation(
    "map-bake",
    {
      storyId: "demo",
      outputId: OUTPUT_ID,
      canonicalStoryPath: storyDir,
      canonicalStoriesRoot: storiesRoot,
      canonicalWorkspaceRoot: workspace,
      parameters: { contractDigest },
    },
    {
      mapBakeFn: async () => {
        onDispatch();
        return { operation: "map-bake", outputId: OUTPUT_ID };
      },
    },
  );
}

describe("authoritative Splash orchestration", () => {
  it("requires the current export tree to contain no unlisted regular file", async () => {
    await completeDemo();
    await writeFile(
      join(storyDir, "export", OUTPUT_ID, "unlisted.txt"),
      "not in the delivery manifest\n",
    );
    expect((await whereIs(storyDir)).phase).toBe("delivery");
  });

  it("binds HANDOVER.md bytes as part of the exact export tree", async () => {
    await completeDemo();
    await writeFile(
      join(storyDir, "export", OUTPUT_ID, "HANDOVER.md"),
      "# Drifted handover\n",
    );
    expect((await whereIs(storyDir)).phase).toBe("delivery");
  });

  it("rejects an added symbolic link in the current export tree", async () => {
    await completeDemo();
    const target = join(workspace, "outside-export-target.txt");
    await writeFile(target, "outside\n");
    await symlink(
      target,
      join(storyDir, "export", OUTPUT_ID, "unlisted-link"),
    );
    await expect(whereIs(storyDir)).rejects.toThrow(/symbolic link/);
  });

  it("rejects an added special file in the current export tree", async () => {
    await completeDemo();
    const specialPath = join(storyDir, "export", OUTPUT_ID, "unlisted-fifo");
    const mkfifo = Bun.spawn(["mkfifo", specialPath], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(mkfifo.stderr).text();
    if ((await mkfifo.exited) !== 0) throw new Error(`mkfifo failed: ${stderr}`);
    await expect(whereIs(storyDir)).rejects.toThrow(/special file/);
  });

  it("rejects multiple beat directories for one storyboard slot", async () => {
    await completeDemo();
    await mkdir(join(storyDir, "beats", "1-duplicate"));
    await expect(whereIs(storyDir)).rejects.toThrow(
      /multiple beat directories.*1/i,
    );
  });

  it("rejects a symlinked beat ancestor outside the story root", async () => {
    await completeDemo();
    const outsideBeat = join(workspace, "outside-beat");
    await rename(beatDir, outsideBeat);
    await symlink(outsideBeat, beatDir, "dir");
    await expect(whereIs(storyDir)).rejects.toThrow(/beat|ancestor|story/);
  });

  it("rejects a symlinked export ancestor outside the story root", async () => {
    await completeDemo();
    const exportDir = join(storyDir, "export", OUTPUT_ID);
    const outsideExport = join(workspace, "outside-export");
    await rename(exportDir, outsideExport);
    await symlink(outsideExport, exportDir, "dir");
    await expect(whereIs(storyDir)).rejects.toThrow(/export|ancestor|story/);
  });

  it("rejects a symbolic-link production receipt in resolver and runner", async () => {
    const fixture = await productionReceiptFixture();
    const outsideReceipt = join(workspace, "outside-production-attempts.json");
    await writeFile(outsideReceipt, `${JSON.stringify(fixture.receipt)}\n`);
    await symlink(outsideReceipt, fixture.path);
    let dispatches = 0;

    const resolver = await settled(() => whereIs(storyDir));
    const runner = await settled(() =>
      runRequestedProduction(() => dispatches++)
    );

    expect({ resolver, runner, dispatches }).toMatchObject({
      resolver: {
        status: "rejected",
        message: expect.stringMatching(/receipt.*regular file/i),
      },
      runner: {
        status: "rejected",
        message: expect.stringMatching(/receipt.*regular file/i),
      },
      dispatches: 0,
    });
  });

  it("rejects a non-regular production receipt in resolver and runner", async () => {
    const fixture = await productionReceiptFixture();
    await mkdir(fixture.path);
    let dispatches = 0;

    const resolver = await settled(() => whereIs(storyDir));
    const runner = await settled(() =>
      runRequestedProduction(() => dispatches++)
    );

    expect({ resolver, runner, dispatches }).toMatchObject({
      resolver: {
        status: "rejected",
        message: expect.stringMatching(/receipt.*regular file/i),
      },
      runner: {
        status: "rejected",
        message: expect.stringMatching(/receipt.*regular file/i),
      },
      dispatches: 0,
    });
  });

  it("binds a production receipt outputId to its owning beat in resolver and runner", async () => {
    const fixture = await productionReceiptFixture("2-unrelated");
    await writeFile(fixture.path, `${JSON.stringify(fixture.receipt)}\n`);
    let dispatches = 0;

    const resolver = await settled(() => whereIs(storyDir));
    const runner = await settled(() =>
      runRequestedProduction(() => dispatches++)
    );

    expect({ resolver, runner, dispatches }).toMatchObject({
      resolver: {
        status: "rejected",
        message: expect.stringMatching(
          /receipt.*outputId.*owning beat.*1-rainfall/i,
        ),
      },
      runner: {
        status: "rejected",
        message: expect.stringMatching(
          /receipt.*outputId.*owning beat.*1-rainfall/i,
        ),
      },
      dispatches: 0,
    });
  });

  it("applies production receipts only to the current operation in resolver and runner", async () => {
    const fixture = await productionReceiptFixture();
    await writeFile(fixture.path, `${JSON.stringify(fixture.receipt)}\n`);
    await writeFile(
      join(storyDir, "STORYBOARD.md"),
      STORYBOARD.replace("medium: chart", "medium: map"),
    );
    await writeCurrentAnalystData();
    const contract = "{}\n";
    await writeFile(join(beatDir, "MAP-BAKE.json"), contract);
    let dispatches = 0;

    const resolver = await whereIs(storyDir);
    const runner = await runRequestedMapProduction(
      sha256(contract),
      () => dispatches++,
    );

    expect({ resolver, runner, dispatches }).toMatchObject({
      resolver: {
        phase: "production",
        status: "ready",
        owner: { kind: "skill", id: "map-beat" },
        attempts: 0,
      },
      runner: {
        operation: "map-bake",
        outputId: OUTPUT_ID,
      },
      dispatches: 1,
    });
  });

  it("gives the dead third owner one truthful blocked resume state in resolver and runner", async () => {
    await freezeAndRender();
    await unlink(join(beatDir, "renders", "rainfall.svg"));
    const spec = "{}\n";
    await writeFile(join(beatDir, "spec.json"), spec);
    const owner = Bun.spawn([process.execPath, "-e", ""], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await owner.exited;
    await writeFile(
      join(beatDir, "PRODUCTION-ATTEMPTS.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        operation: "datawrapper-produce",
        outputId: OUTPUT_ID,
        inputPath: "spec.json",
        inputDigest: sha256(spec),
        attempts: 3,
        status: "reserved",
        reason: "production attempt 3 is already running",
        reservationId: "dead-third-owner",
        pid: owner.pid,
      })}\n`,
    );

    const freshResolver = await import(
      `../scripts/where.mjs?fresh=dead-third-owner-${owner.pid}`,
    );
    const resolved = await freshResolver.whereIs(storyDir);
    let dispatches = 0;
    const dispatched = await runOperation(
      "datawrapper-produce",
      {
        storyId: "demo",
        outputId: OUTPUT_ID,
        canonicalStoryPath: storyDir,
        canonicalStoriesRoot: storiesRoot,
        canonicalWorkspaceRoot: workspace,
        parameters: { format: "static", size: "landscape" },
      },
      {
        runSkillEntrypointFn: async () => {
          dispatches++;
          return {};
        },
      },
    );

    expect(resolved).toMatchObject({
      phase: "production",
      status: "blocked",
      attempts: 3,
      resume: expect.stringMatching(
        /owner.*no longer running.*attempt limit reached/i,
      ),
    });
    expect(dispatched).toMatchObject({
      status: "blocked",
      attempts: 3,
      resume: resolved.resume,
    });
    expect(dispatches).toBe(0);
  });

});
