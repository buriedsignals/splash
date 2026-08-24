import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportDirFor, materialise } from "../scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

const SENTINEL_CREDENTIAL = "OwnedFile7xK4mP9qR2vN6tH3";
const MAP_KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";
const KEYED_DELIVERY_DIR = "keyed";
const MAP_PAGE = `<!doctype html><html><body><script>fetch("https://api.maptiler.com/maps/basic/style.json?key=${MAP_KEY_PLACEHOLDER}")</script></body></html>`;

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

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" });
}

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

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "keyed-delivery-boundary-"));
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");

  storiesRoot = join(repo, "stories");
  beatDir = join(storiesRoot, "story", "beats", "1-map");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "map.html"), MAP_PAGE);
  await approveCurrentOutput(beatDir);
  exportDir = exportDirFor({
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
  });
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
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

  it("cannot select key-bearing bytes with git add -A", async () => {
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
    const trackedAbsolutePath = join(repo, trackedPath);
    const lastGoodKeyedPage = MAP_PAGE.replace("basic", "last-good");
    await mkdir(join(exportDir, KEYED_DELIVERY_DIR), { recursive: true });
    await writeFile(join(exportDir, "map.html"), MAP_PAGE);
    await writeFile(trackedAbsolutePath, lastGoodKeyedPage);
    git("add", "-A");
    expect(git("ls-files", "--error-unmatch", trackedPath).trim()).toBe(trackedPath);

    await expect(deliverOwnedFile()).rejects.toThrow(/keyed/i);

    expect(await readFile(trackedAbsolutePath, "utf8")).toBe(lastGoodKeyedPage);
    expect(git("show", `:${trackedPath}`)).toBe(lastGoodKeyedPage);
    expect(git("show", `:${trackedPath}`)).not.toContain(SENTINEL_CREDENTIAL);
    expect(git("diff", "--name-only", "--", trackedPath)).toBe("");
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
