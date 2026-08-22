import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveCurrentOutput } from "../../deliver/test/output-review-fixture";
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
  const hashes = {
    storyboard: sha256(await readFile(join(storyDir, "STORYBOARD.md"))),
    profile: sha256(await readFile(join(storyDir, "source", "profile.json"))),
    sourceData: sha256(await readFile(join(storyDir, "source", "data.csv"))),
  };
  await writeFile(
    join(beatDir, "data.json"),
    `${JSON.stringify({ schemaVersion: 1, meta: { hashes }, rows: [{ year: 2026, rainfall: 67 }] })}\n`,
  );
  await writeFile(join(beatDir, "renders", "rainfall.svg"), RENDER);
}

async function bindApproval() {
  const review = await approveCurrentOutput(beatDir, { reviewId: "review-demo-1" });
  await writeFile(join(beatDir, "APPROVED.md"), `Bound by ${review.id}\n`);
  return review;
}

async function bindDelivery(review: Awaited<ReturnType<typeof bindApproval>>) {
  const exportDir = join(storyDir, "export", OUTPUT_ID);
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(exportDir, "rainfall.svg"), RENDER);
  await writeFile(join(exportDir, "HANDOVER.md"), "# Rainfall visualization\nPlace above the fold.\n");
  await writeFile(
    join(exportDir, ".delivery-manifest.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      state: "complete",
      operationId: "delivery-demo-1",
      outputId: OUTPUT_ID,
      reviewId: review.id,
      planVersion: review.planVersion,
      draftDigest: review.draftDigest,
      findingIds: review.findingIds,
      form: "owned-file",
      format: "static",
      artifacts: [{ path: "rainfall.svg", digest: sha256(RENDER) }],
    })}\n`,
  );
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
