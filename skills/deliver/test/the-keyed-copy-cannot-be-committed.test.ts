import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportDirFor, materialise } from "../scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";
import {
  gitCommand,
  hostileExcludeEnvironment,
  type GitCommand,
} from "./git-authority-fixture";

const SENTINEL_CREDENTIAL = "OwnedFile7xK4mP9qR2vN6tH3";
const MAP_KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";
const KEYED_DELIVERY_DIR = "keyed";
const MAP_PAGE = `<!doctype html><html><body><script>fetch("https://api.maptiler.com/maps/basic/style.json?key=${MAP_KEY_PLACEHOLDER}")</script></body></html>`;
const LAST_GOOD_KEYED_PAGE = MAP_PAGE.replace("basic", "last-good");
const LAST_GOOD_EXPORT = "last-good-export";
const MATERIALISE_RUNNER = fileURLToPath(
  new URL("./materialise-with-ambient-git.mjs", import.meta.url),
);

const handover = {
  language: "en",
  placement: "after the paragraph on reported deaths, article web, full width",
  alt: "A world map of what each country reported",
  credit: "Source: World Health Organization, as of 2026-08-23",
  caveat: "reported, not measured",
};

let repo: string;
let storiesRoot: string;
let beatDir: string;
let exportDir: string;
let git: GitCommand;
let fixtureAmbientGitEnvironment: NodeJS.ProcessEnv;
let additionalRoots: string[];

function committablePaths(): string[] {
  const paths = (args: string[]) =>
    git(...args)
      .split("\0")
      .filter(Boolean);
  return [
    ...paths(["ls-files", "-z", "--", "."]),
    ...paths(["ls-files", "-z", "--others", "--exclude-standard", "--", "."]),
  ].sort();
}

async function deliverOwnedFile(): Promise<void> {
  await materialise({
    form: "owned-file",
    format: "web",
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
    env: { MAPTILER_DELIVERY_KEY: SENTINEL_CREDENTIAL },
    handover,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });
}
async function setupReviewedStory(): Promise<void> {
  beatDir = join(storiesRoot, "story", "beats", "1-map");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "map.html"), MAP_PAGE);
  await approveCurrentOutput(beatDir);
  exportDir = exportDirFor({
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
  });
}

async function prepareTrackedKeyedDestination(
  ownerGit: GitCommand,
  trackedPath: string,
): Promise<void> {
  await mkdir(join(exportDir, KEYED_DELIVERY_DIR), { recursive: true });
  await writeFile(join(exportDir, "map.html"), MAP_PAGE);
  await writeFile(join(exportDir, "previous.txt"), LAST_GOOD_EXPORT);
  await writeFile(join(exportDir, KEYED_DELIVERY_DIR, "map.html"), LAST_GOOD_KEYED_PAGE);
  ownerGit("add", "-A");
  expect(ownerGit("ls-files", "--error-unmatch", trackedPath).trim()).toBe(trackedPath);
}

async function expectPriorExportAndIndex(
  ownerGit: GitCommand,
  trackedPath: string,
): Promise<void> {
  expect(await readFile(join(exportDir, "previous.txt"), "utf8").catch(() => null)).toBe(
    LAST_GOOD_EXPORT,
  );
  expect(
    await readFile(join(exportDir, KEYED_DELIVERY_DIR, "map.html"), "utf8").catch(
      () => null,
    ),
  ).toBe(LAST_GOOD_KEYED_PAGE);
  expect(ownerGit("show", `:${trackedPath}`)).toBe(LAST_GOOD_KEYED_PAGE);
  expect(ownerGit("show", `:${trackedPath}`)).not.toContain(SENTINEL_CREDENTIAL);
  expect(ownerGit("diff", "--name-only", "--", trackedPath)).toBe("");
}

function runWithAmbientGitSelectors(selectors: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [MATERIALISE_RUNNER], {
    encoding: "utf8",
    env: {
      ...fixtureAmbientGitEnvironment,
      ...selectors,
      SPLASH_TEST_MAP_KEY: SENTINEL_CREDENTIAL,
      SPLASH_TEST_STORIES_ROOT: storiesRoot,
    },
  });
}

beforeEach(async () => {
  additionalRoots = [];
  repo = await mkdtemp(join(tmpdir(), "keyed-delivery-boundary-"));
  const bootstrapGit = gitCommand(repo);
  bootstrapGit("init", "-q");

  const excludesFile = join(repo, ".git", "host-excludes");
  const systemConfig = join(repo, ".git", "host-system-config");
  const globalConfig = join(repo, ".git", "host-global-config");
  await writeFile(excludesFile, "stories/**\n");
  const hostileConfig = `[core]\n\texcludesFile = ${JSON.stringify(excludesFile)}\n`;
  await writeFile(systemConfig, hostileConfig);
  await writeFile(globalConfig, hostileConfig);
  fixtureAmbientGitEnvironment = hostileExcludeEnvironment(systemConfig, globalConfig);
  git = gitCommand(repo, fixtureAmbientGitEnvironment);
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");

  storiesRoot = join(repo, "stories");
  await setupReviewedStory();
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
  await Promise.all(additionalRoots.map((root) => rm(root, { recursive: true, force: true })));
});

describe("owned-file keyed delivery boundary", () => {
  it("keeps a committable placeholder record and a private keyed page under its own ignore authority", async () => {
    await deliverOwnedFile();

    const recordPath = join(exportDir, "map.html");
    const keyedDir = join(exportDir, KEYED_DELIVERY_DIR);
    const keyedPath = join(keyedDir, "map.html");
    expect(await readFile(recordPath, "utf8")).toContain(MAP_KEY_PLACEHOLDER);
    expect(await readFile(recordPath, "utf8")).not.toContain(SENTINEL_CREDENTIAL);
    expect(await readFile(keyedPath, "utf8")).toContain(SENTINEL_CREDENTIAL);
    expect(await readFile(join(keyedDir, ".gitignore"), "utf8")).toContain("*");
    expect((await stat(keyedDir)).mode & 0o777).toBe(0o700);
    expect((await stat(keyedPath)).mode & 0o777).toBe(0o600);
  });

  it("keeps fixture committability authoritative under matching system and global excludes", async () => {
    await deliverOwnedFile();

    git("add", "-A");
    const staged = git("diff", "--cached", "--name-only", "-z")
      .split("\0")
      .filter(Boolean);
    expect(staged).toContain("stories/story/export/1-map/map.html");
    expect(staged.filter((path) => path.includes(`/${KEYED_DELIVERY_DIR}/`))).toEqual([]);
    for (const path of staged) {
      expect(git("show", `:${path}`)).not.toContain(SENTINEL_CREDENTIAL);
    }
  });

  it("makes the sentinel-bearing page committable when its own ignore authority is removed", async () => {
    await deliverOwnedFile();
    await rm(join(exportDir, KEYED_DELIVERY_DIR, ".gitignore"));

    const keyedPath = `stories/story/export/1-map/${KEYED_DELIVERY_DIR}/map.html`;
    expect(committablePaths()).toContain(keyedPath);
    expect(await readFile(join(repo, keyedPath), "utf8")).toContain(SENTINEL_CREDENTIAL);
  });

  it("refuses a source renders/keyed collision before replacing the prior export", async () => {
    const sourceKeyedDir = join(beatDir, "renders", KEYED_DELIVERY_DIR);
    await mkdir(sourceKeyedDir);
    await writeFile(join(sourceKeyedDir, ".gitignore"), "!*\n");
    await writeFile(join(sourceKeyedDir, "nested.html"), MAP_PAGE);
    await approveCurrentOutput(beatDir);
    await mkdir(exportDir, { recursive: true });
    await writeFile(join(exportDir, "previous.txt"), "last-good");
    git("add", "-A");

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe("last-good");
    expect(git("show", ":stories/story/export/1-map/previous.txt")).toBe("last-good");
    expect(git("diff", "--name-only", "--", "stories/story/export/1-map")).toBe("");
    for (const path of committablePaths()) {
      expect(await readFile(join(repo, path), "utf8")).not.toContain(SENTINEL_CREDENTIAL);
    }
  });

  it("refuses a pretracked final keyed path before modifying its working tree or index bytes", async () => {
    const trackedPath = "stories/story/export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(git, trackedPath);

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    await expectPriorExportAndIndex(git, trackedPath);
  });

  it("refuses a case-equivalent tracked keyed path on every filesystem", async () => {
    const trackedPath = "stories/story/export/1-map/Keyed/map.html";
    const caseVariantDir = join(exportDir, "Keyed");
    await mkdir(caseVariantDir, { recursive: true });
    await writeFile(join(exportDir, "map.html"), MAP_PAGE);
    await writeFile(join(exportDir, "previous.txt"), LAST_GOOD_EXPORT);
    await writeFile(join(caseVariantDir, "map.html"), LAST_GOOD_KEYED_PAGE);
    git("add", "-A");
    expect(git("ls-files", "--error-unmatch", trackedPath).trim()).toBe(trackedPath);

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    expect(await readFile(join(caseVariantDir, "map.html"), "utf8")).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("show", `:${trackedPath}`)).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("show", `:${trackedPath}`)).not.toContain(SENTINEL_CREDENTIAL);
  });

  it("refuses a Unicode-equivalent tracked keyed path on every filesystem", async () => {
    const trackedPath = "stories/story/export/1-map/Keyed/map.html";
    const unicodeVariantDir = join(exportDir, "Keyed");
    await mkdir(unicodeVariantDir, { recursive: true });
    await writeFile(join(exportDir, "map.html"), MAP_PAGE);
    await writeFile(join(exportDir, "previous.txt"), LAST_GOOD_EXPORT);
    await writeFile(join(unicodeVariantDir, "map.html"), LAST_GOOD_KEYED_PAGE);
    git("add", "-A");
    expect(git("ls-files", "-z", "--error-unmatch", trackedPath).split("\0")[0]).toBe(
      trackedPath,
    );

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    expect(await readFile(join(unicodeVariantDir, "map.html"), "utf8")).toBe(
      LAST_GOOD_KEYED_PAGE,
    );
    expect(git("show", `:${trackedPath}`)).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("show", `:${trackedPath}`)).not.toContain(SENTINEL_CREDENTIAL);
  });

  it("refuses a symlinked final keyed directory before consulting the wrong Git owner", async () => {
    const trackedPath = "stories/story/export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(git, trackedPath);
    const target = await mkdtemp(join(tmpdir(), "symlinked-keyed-target-"));
    additionalRoots.push(target);
    await writeFile(join(target, "map.html"), LAST_GOOD_KEYED_PAGE);
    await rm(join(exportDir, KEYED_DELIVERY_DIR), { recursive: true, force: true });
    await symlink(target, join(exportDir, KEYED_DELIVERY_DIR), "dir");
    const statusBefore = git("status", "--porcelain=v1");

    await expect(deliverOwnedFile()).rejects.toThrow(/symlinked destination ancestor/i);

    expect(await readFile(join(target, "map.html"), "utf8")).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("show", `:${trackedPath}`)).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("status", "--porcelain=v1")).toBe(statusBefore);
  });

  it("ignores foreign GIT_DIR, GIT_WORK_TREE, and GIT_INDEX_FILE selectors", async () => {
    const trackedPath = "stories/story/export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(git, trackedPath);

    const foreignRepo = await mkdtemp(join(tmpdir(), "foreign-git-authority-"));
    additionalRoots.push(foreignRepo);
    const foreignGit = gitCommand(foreignRepo, fixtureAmbientGitEnvironment);
    foreignGit("init", "-q");
    await writeFile(join(foreignRepo, "seed.txt"), "foreign-index");
    foreignGit("add", "seed.txt");

    const result = runWithAmbientGitSelectors({
      GIT_DIR: join(foreignRepo, ".git"),
      GIT_WORK_TREE: foreignRepo,
      GIT_INDEX_FILE: join(foreignRepo, ".git", "index"),
    });

    await expectPriorExportAndIndex(git, trackedPath);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/keyed/i);
  });

  it("uses the nested story repository that owns the final keyed destination", async () => {
    const storyDir = join(storiesRoot, "story");
    const nestedGit = gitCommand(storyDir, fixtureAmbientGitEnvironment);
    nestedGit("init", "-q");
    nestedGit("config", "user.email", "test@example.invalid");
    nestedGit("config", "user.name", "Test");
    const trackedPath = "export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(nestedGit, trackedPath);

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    await expectPriorExportAndIndex(nestedGit, trackedPath);
  });
  it("checks an enclosing index after a nested story repository becomes the nearest owner", async () => {
    const outerTrackedPath = "stories/story/export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(git, outerTrackedPath);
    const storyDir = join(storiesRoot, "story");
    const nestedGit = gitCommand(storyDir, fixtureAmbientGitEnvironment);
    nestedGit("init", "-q");
    nestedGit("config", "user.email", "test@example.invalid");
    nestedGit("config", "user.name", "Test");

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(LAST_GOOD_EXPORT);
    expect(await readFile(join(exportDir, KEYED_DELIVERY_DIR, "map.html"), "utf8")).toBe(
      LAST_GOOD_KEYED_PAGE,
    );
    expect(git("show", `:${outerTrackedPath}`)).toBe(LAST_GOOD_KEYED_PAGE);
    expect(git("show", `:${outerTrackedPath}`)).not.toContain(SENTINEL_CREDENTIAL);
    expect(nestedGit("ls-files", "--", "export/1-map/keyed/map.html")).toBe("");
  });


  it("uses a nested linked worktree that owns the final keyed destination", async () => {
    await rm(join(storiesRoot, "story"), { recursive: true, force: true });
    const ownerRepo = await mkdtemp(join(tmpdir(), "nested-worktree-owner-"));
    additionalRoots.push(ownerRepo);
    const ownerGit = gitCommand(ownerRepo, fixtureAmbientGitEnvironment);
    ownerGit("init", "-q");
    ownerGit("config", "user.email", "test@example.invalid");
    ownerGit("config", "user.name", "Test");
    await writeFile(join(ownerRepo, "seed.txt"), "worktree-owner");
    ownerGit("add", "seed.txt");
    ownerGit("commit", "--no-gpg-sign", "-m", "seed");
    ownerGit("worktree", "add", "--detach", join(storiesRoot, "story"));
    await setupReviewedStory();

    const worktreeGit = gitCommand(join(storiesRoot, "story"), fixtureAmbientGitEnvironment);
    const trackedPath = "export/1-map/keyed/map.html";
    await prepareTrackedKeyedDestination(worktreeGit, trackedPath);

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    await expectPriorExportAndIndex(worktreeGit, trackedPath);
  });
});

describe("source-bundle credential custody", () => {
  it("keeps nested HTML placeholder-only, committable, and outside the keyed namespace", async () => {
    const nestedSource = join(beatDir, "assets", "previews", "map.html");
    await mkdir(join(beatDir, "assets", "previews"), { recursive: true });
    await writeFile(nestedSource, MAP_PAGE);

    await materialise({
      form: "source-bundle",
      format: "web",
      storiesRoot,
      storyId: "story",
      outputId: "1-map",
      env: { MAPTILER_DELIVERY_KEY: SENTINEL_CREDENTIAL },
      handover,
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
    });

    const bundledPath = "stories/story/export/1-map/assets/previews/map.html";
    const bundledHtml = await readFile(join(repo, bundledPath), "utf8");
    expect(bundledHtml).toContain(MAP_KEY_PLACEHOLDER);
    expect(bundledHtml).not.toContain(SENTINEL_CREDENTIAL);
    expect(await readdir(exportDir)).not.toContain(KEYED_DELIVERY_DIR);
    expect(committablePaths()).toContain(bundledPath);
    for (const path of committablePaths()) {
      expect(await readFile(join(repo, path), "utf8")).not.toContain(SENTINEL_CREDENTIAL);
    }

    git("add", "-A");
    const staged = git("diff", "--cached", "--name-only", "-z")
      .split("\0")
      .filter(Boolean);
    expect(staged).toContain(bundledPath);
    for (const path of staged) {
      expect(git("show", `:${path}`)).not.toContain(SENTINEL_CREDENTIAL);
    }
  });
});
