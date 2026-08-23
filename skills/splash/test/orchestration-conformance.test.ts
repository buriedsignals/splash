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

describe("authoritative Splash orchestration", () => {
  it("does not close G3 from a bare approval file", async () => {
    await freezeAndRender();
    await writeFile(join(beatDir, "APPROVED.md"), "approved\n");
    expect((await whereIs(storyDir)).phase).toBe("production");
  });

  it("does not close G4 from a bare handover file", async () => {
    await freezeAndRender();
    await bindApproval();
    const exportDir = join(storyDir, "export", OUTPUT_ID);
    await mkdir(exportDir, { recursive: true });
    await writeFile(join(exportDir, "rainfall.svg"), RENDER);
    await writeFile(join(exportDir, "HANDOVER.md"), "handed over\n");
    expect((await whereIs(storyDir)).phase).toBe("delivery");
  });

  it("runs one compact visualization to done and recovers done in a fresh session", async () => {
    await completeDemo();
    expect((await whereIs(storyDir)).phase).toBe("done");
    const freshResolver = await import("../scripts/where.mjs?fresh=demo");
    expect((await freshResolver.whereIs(storyDir)).phase).toBe("done");
  });

  for (const [name, mutate, expectedPhase] of [
    ["frozen data", () => writeFile(join(storyDir, "source", "data.csv"), "year,rainfall\n2026,66\n"), "production"],
    ["profile", () => writeFile(join(storyDir, "source", "profile.json"), '{"language":"fr"}\n'), "production"],
    ["storyboard", () => writeFile(join(storyDir, "STORYBOARD.md"), `${STORYBOARD}\nEditorial note.\n`), "production"],
    ["render", () => writeFile(join(beatDir, "renders", "rainfall.svg"), RENDER.replace("L1 1", "L2 2")), "production"],
    ["approval binding", async () => {
      const path = join(beatDir, "OUTPUT-REVIEW.json");
      const review = JSON.parse(await readFile(path, "utf8"));
      review.draftDigest = `sha256:${"0".repeat(64)}`;
      await writeFile(path, `${JSON.stringify(review)}\n`);
    }, "production"],
    ["passing QA result", async () => {
      const path = join(beatDir, "OUTPUT-REVIEW.json");
      const review = JSON.parse(await readFile(path, "utf8"));
      review.qaRuns[0].status = "failed";
      await writeFile(path, `${JSON.stringify(review)}\n`);
    }, "production"],
    ["delivery binding", async () => {
      const path = join(storyDir, "export", OUTPUT_ID, ".delivery-manifest.json");
      const manifest = JSON.parse(await readFile(path, "utf8"));
      manifest.reviewId = "review-stale";
      await writeFile(path, `${JSON.stringify(manifest)}\n`);
    }, "delivery"],
    ["delivered artifact", () => writeFile(join(storyDir, "export", OUTPUT_ID, "rainfall.svg"), "stale\n"), "delivery"],
  ] as const) {
    it(`reopens the earliest phase when the completed ${name} binding is stale`, async () => {
      await completeDemo();
      await mutate();
      expect((await whereIs(storyDir)).phase).toBe(expectedPhase);
    });
  }

  for (const [name, mutate] of [
    ["missing current plan record", () => unlink(join(beatDir, "BRIEF.md"))],
    [
      "changed current plan version",
      () => writeCurrentBrief(beatDir, TEST_PLAN_VERSION + 1),
    ],
    [
      "changed current findings",
      () => writeCurrentBrief(beatDir, TEST_PLAN_VERSION, ["finding-reframed"]),
    ],
    [
      "duplicate current plan version",
      () =>
        writeFile(
          join(beatDir, "BRIEF.md"),
          currentBrief().replace(
            "\n---\n\n# Current beat plan",
            `\nplanVersion: ${TEST_PLAN_VERSION + 1}\n---\n\n# Current beat plan`,
          ),
        ),
    ],
    [
      "duplicate current findings",
      () =>
        writeFile(
          join(beatDir, "BRIEF.md"),
          currentBrief().replace(
            "\n---\n\n# Current beat plan",
            "\nfindingIds: [finding-reframed]\n---\n\n# Current beat plan",
          ),
        ),
    ],
  ] as const) {
    it(`reopens G3 for a ${name}`, async () => {
      await completeDemo();
      await mutate();
      expect((await whereIs(storyDir)).phase).toBe("production");
    });
  }

  for (const [name, mutate] of [
    [
      "missing hash owner",
      async (path: string) => {
        const record = JSON.parse(await readFile(path, "utf8"));
        delete record.meta.hashes;
        await writeFile(path, `${JSON.stringify(record)}\n`);
      },
    ],
    [
      "malformed hash owner",
      async (path: string) => {
        const record = JSON.parse(await readFile(path, "utf8"));
        record.meta.hashes = [];
        await writeFile(path, `${JSON.stringify(record)}\n`);
      },
    ],
    [
      "missing storyboard hash",
      async (path: string) => {
        const record = JSON.parse(await readFile(path, "utf8"));
        delete record.meta.hashes.storyboard;
        await writeFile(path, `${JSON.stringify(record)}\n`);
      },
    ],
    [
      "missing profile hash",
      async (path: string) => {
        const record = JSON.parse(await readFile(path, "utf8"));
        delete record.meta.hashes.profile;
        await writeFile(path, `${JSON.stringify(record)}\n`);
      },
    ],
    [
      "missing source-data hash",
      async (path: string) => {
        const record = JSON.parse(await readFile(path, "utf8"));
        delete record.meta.hashes.sourceData;
        await writeFile(path, `${JSON.stringify(record)}\n`);
      },
    ],
  ] as const) {
    it(`reopens production for analyst data with a ${name}`, async () => {
      await completeDemo();
      await mutate(join(beatDir, "data.json"));
      const state = await whereIs(storyDir);
      expect(state.phase).toBe("production");
      expect(state.missing).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/beat 1-rainfall: analyst .*rebuild/),
        ]),
      );
    });
  }

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

  it("keeps production open when a current storyboard slot has no render", async () => {
    await completeDemo();
    const twoSlots = STORYBOARD.replace(
      "    candidates: [trajectory, comparison]\n---",
      `    candidates: [trajectory, comparison]
  - id: 2
    proves: "Snowfall fell too."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---`,
    );
    await writeFile(join(storyDir, "STORYBOARD.md"), twoSlots);
    await writeCurrentAnalystData();
    const secondBeat = join(storyDir, "beats", "2-snowfall");
    await mkdir(join(secondBeat, "renders"), { recursive: true });
    await writeCurrentBrief(secondBeat);
    await writeCurrentAnalystData(secondBeat);

    const state = await whereIs(storyDir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual(
      expect.arrayContaining([expect.stringMatching(/beat 2.*render/)]),
    );
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

  it("blocks the real production dispatcher after exactly three failures and resumes blocked", async () => {
    await freezeAndRender();
    await unlink(join(beatDir, "renders", "rainfall.svg"));
    await writeFile(join(beatDir, "spec.json"), "{}\n");
    const request = {
      storyId: "demo",
      outputId: OUTPUT_ID,
      canonicalStoryPath: storyDir,
      canonicalStoriesRoot: storiesRoot,
      canonicalWorkspaceRoot: workspace,
      parameters: { format: "static", size: "landscape" },
    };
    let dispatches = 0;
    const failingRunner = async () => {
      dispatches++;
      throw new Error(`render/check failed on attempt ${dispatches}`);
    };
    const outcomes: Array<Record<string, unknown>> = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        outcomes.push(await runOperation("datawrapper-produce", request, { runSkillEntrypointFn: failingRunner }));
      } catch (error) {
        outcomes.push({ status: "failed", reason: String(error) });
      }
    }
    const freshResolver = await import("../scripts/where.mjs?fresh=blocked");
    const resumed = await freshResolver.whereIs(storyDir);
    try {
      outcomes.push(await runOperation("datawrapper-produce", request, { runSkillEntrypointFn: failingRunner }));
    } catch (error) {
      outcomes.push({ status: "failed", reason: String(error) });
    }

    expect({
      thirdBlocked: outcomes[2]?.status === "blocked" && typeof outcomes[2]?.reason === "string",
      freshBlocked: resumed.phase === "production" && resumed.status === "blocked" && typeof resumed.reason === "string",
      fourthSkipped: dispatches === 3 && outcomes[3]?.status === "blocked",
    }).toEqual({ thirdBlocked: true, freshBlocked: true, fourthSkipped: true });
  });
});
