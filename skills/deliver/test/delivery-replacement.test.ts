import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  mkdir,
  mkdtemp,
  lstat,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  DELIVERY_MANIFEST_FILE,
  REPLACEMENT_SCHEMA_VERSION,
  publishStagedDelivery,
  reconcileDeliveryReplacement,
  replacementArtifacts,
  withDeliveryLock,
} from "../scripts/delivery-replacement.mjs";

let root: string;
let exportDir: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "delivery-replacement-"));
  exportDir = join(root, "story", "export", "1-rainfall");
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(exportDir, "old.txt"), "last-good");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function staging(operationId: string) {
  const artifacts = replacementArtifacts(exportDir, operationId);
  await mkdir(artifacts.stagingDir);
  await writeFile(join(artifacts.stagingDir, "new.txt"), "complete-new-delivery");
  return artifacts;
}

async function pathExists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error: any) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function manifest(operationId: string) {
  return {
    operationId,
    reviewId: "review-1",
    planVersion: 1,
    draftDigest: `sha256:${"a".repeat(64)}`,
    findingIds: ["finding-1"],
    form: "owned-file",
    genre: "static",
    createdAt: "2026-08-11T10:00:00.000Z",
  };
}

async function writeJournal(operationId: string, state: string) {
  const artifacts = replacementArtifacts(exportDir, operationId);
  await writeFile(
    artifacts.journalPath,
    `${JSON.stringify(
      {
        schemaVersion: REPLACEMENT_SCHEMA_VERSION,
        operationId,
        outputId: basename(exportDir),
        exportName: basename(exportDir),
        stagingName: basename(artifacts.stagingDir),
        backupName: basename(artifacts.backupDir),
        state,
        createdAt: "2026-08-11T10:00:00.000Z",
        updatedAt: "2026-08-11T10:00:01.000Z",
      },
      null,
      2,
    )}\n`,
  );
  return artifacts;
}

describe("journaled delivery replacement", () => {
  it("publishes a complete staged directory and removes its journal and backup", async () => {
    const operationId = "operation-success";
    const artifacts = await staging(operationId);
    await publishStagedDelivery({
      stagingDir: artifacts.stagingDir,
      exportDir,
      manifest: manifest(operationId),
    });

    expect(await readFile(join(exportDir, "new.txt"), "utf8")).toBe(
      "complete-new-delivery",
    );
    expect(await Bun.file(join(exportDir, DELIVERY_MANIFEST_FILE)).json()).toMatchObject({
      schemaVersion: 1,
      operationId,
      outputId: "1-rainfall",
      state: "complete",
    });
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
    expect(await pathExists(artifacts.backupDir)).toBe(false);
  });

  it("preserves the previous export when the first publication rename fails", async () => {
    const operationId = "operation-first-rename";
    const artifacts = await staging(operationId);
    await expect(
      publishStagedDelivery({
        stagingDir: artifacts.stagingDir,
        exportDir,
        manifest: manifest(operationId),
        hooks: {
          beforeMovePrevious: () => {
            throw new Error("first rename fault");
          },
        },
      }),
    ).rejects.toThrow(/first rename fault/);

    expect(await readFile(join(exportDir, "old.txt"), "utf8")).toBe("last-good");
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
    expect(await pathExists(artifacts.backupDir)).toBe(false);
  });

  it("restores the previous export when the staging publication rename fails", async () => {
    const operationId = "operation-second-rename";
    const artifacts = await staging(operationId);
    await expect(
      publishStagedDelivery({
        stagingDir: artifacts.stagingDir,
        exportDir,
        manifest: manifest(operationId),
        hooks: {
          beforePublishStaging: () => {
            throw new Error("second rename fault");
          },
        },
      }),
    ).rejects.toThrow(/second rename fault/);

    expect(await readFile(join(exportDir, "old.txt"), "utf8")).toBe("last-good");
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
    expect(await pathExists(artifacts.backupDir)).toBe(false);
  });

  it("records cleanup-pending and reconciles a backup cleanup failure", async () => {
    const operationId = "operation-cleanup";
    const artifacts = await staging(operationId);
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await publishStagedDelivery({
        stagingDir: artifacts.stagingDir,
        exportDir,
        manifest: manifest(operationId),
        hooks: {
          beforeCleanupBackup: () => {
            throw new Error("cleanup fault");
          },
        },
      });
    } finally {
      console.warn = originalWarn;
    }

    expect(await Bun.file(artifacts.journalPath).json()).toMatchObject({
      state: "cleanup-pending",
    });
    expect(await pathExists(artifacts.backupDir)).toBe(true);
    expect(await reconcileDeliveryReplacement(exportDir)).toEqual({
      state: "completed-published-replacement",
    });
    expect(await readFile(join(exportDir, "new.txt"), "utf8")).toBe(
      "complete-new-delivery",
    );
    expect(await pathExists(artifacts.backupDir)).toBe(false);
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
  });

  it("restores the previous export after a process stopped between the two renames", async () => {
    const operationId = "operation-restart-before-publish";
    const artifacts = await staging(operationId);
    await rename(exportDir, artifacts.backupDir);
    await writeJournal(operationId, "previous-moved");

    expect(await reconcileDeliveryReplacement(exportDir)).toEqual({
      state: "restored-previous-export",
    });
    expect(await readFile(join(exportDir, "old.txt"), "utf8")).toBe("last-good");
    expect(await pathExists(artifacts.stagingDir)).toBe(false);
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
  });

  it("keeps the complete new export after a process stopped following the second rename", async () => {
    const operationId = "operation-restart-after-publish";
    const artifacts = await staging(operationId);
    await writeFile(
      join(artifacts.stagingDir, DELIVERY_MANIFEST_FILE),
      `${JSON.stringify({
        ...manifest(operationId),
        schemaVersion: REPLACEMENT_SCHEMA_VERSION,
        outputId: "1-rainfall",
        state: "complete",
      })}\n`,
    );
    await rename(exportDir, artifacts.backupDir);
    await rename(artifacts.stagingDir, exportDir);
    await writeJournal(operationId, "previous-moved");

    expect(await reconcileDeliveryReplacement(exportDir)).toEqual({
      state: "completed-published-replacement",
    });
    expect(await readFile(join(exportDir, "new.txt"), "utf8")).toBe(
      "complete-new-delivery",
    );
    expect(await pathExists(artifacts.backupDir)).toBe(false);
    expect(await Bun.file(artifacts.journalPath).exists()).toBe(false);
  });

  it("removes abandoned staging before the next delivery", async () => {
    const artifacts = await staging("operation-orphan-staging");
    expect(await reconcileDeliveryReplacement(exportDir)).toEqual({
      state: "discarded-orphaned-staging",
    });
    expect(await pathExists(artifacts.stagingDir)).toBe(false);
    expect(await readFile(join(exportDir, "old.txt"), "utf8")).toBe("last-good");
  });
});

describe("per-output delivery lock", () => {
  it("serializes concurrent work for the same output", async () => {
    let active = 0;
    let mostActive = 0;
    const order: string[] = [];
    let releaseFirst: () => void;
    const firstMayFinish = new Promise<void>((resolveFinish) => {
      releaseFirst = resolveFinish;
    });
    let firstStarted: () => void;
    const firstDidStart = new Promise<void>((resolveStart) => {
      firstStarted = resolveStart;
    });

    const first = withDeliveryLock(exportDir, async () => {
      order.push("first-start");
      active++;
      mostActive = Math.max(mostActive, active);
      firstStarted();
      await firstMayFinish;
      active--;
      order.push("first-end");
    });
    await firstDidStart;
    const second = withDeliveryLock(exportDir, async () => {
      order.push("second-start");
      active++;
      mostActive = Math.max(mostActive, active);
      active--;
      order.push("second-end");
    });
    await Promise.resolve();
    expect(order).toEqual(["first-start"]);
    releaseFirst();
    await Promise.all([first, second]);

    expect(mostActive).toBe(1);
    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
  });

  it("reclaims an abandoned lock from a dead process", async () => {
    const artifacts = replacementArtifacts(exportDir, "lock-probe");
    await mkdir(artifacts.lockDir);
    await writeFile(
      join(artifacts.lockDir, "owner.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        operationId: "dead-owner",
        pid: 2_147_483_647,
        hostname: hostname(),
      })}\n`,
    );

    let entered = false;
    await withDeliveryLock(exportDir, async () => {
      entered = true;
    });
    expect(entered).toBe(true);
    expect((await readdir(dirname(exportDir))).some((name) => name.includes("-stale-"))).toBe(
      false,
    );
  });
});
