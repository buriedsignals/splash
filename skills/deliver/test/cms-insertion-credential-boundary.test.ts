import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { exportDirFor, materialise } from "../scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

const SENTINEL_CREDENTIAL = "CmsBoundary7xK4mP9qR2vN6tH3";
const MAP_KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";
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

async function repositoryFiles(): Promise<string[]> {
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      if (directory === repo && entry.name === ".git") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) found.push(relative(repo, path));
    }
  }

  await walk(repo);
  return found;
}

async function filesContaining(needle: string): Promise<string[]> {
  const target = Buffer.from(needle);
  const offenders: string[] = [];
  for (const path of await repositoryFiles()) {
    if ((await readFile(join(repo, path))).includes(target)) offenders.push(path);
  }
  return offenders;
}

async function materialiseCms(kind: "we-publish" | "livingdocs"): Promise<void> {
  await materialise({
    form: "cms-insertion",
    format: "web",
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
    env: { MAPTILER_DELIVERY_KEY: SENTINEL_CREDENTIAL },
    cms:
      kind === "we-publish"
        ? {
            kind,
            articleId: "article-42",
            previousBody: "<p>Existing article body.</p>",
          }
        : { kind, articleId: "article-42" },
    handover,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });
}

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "cms-credential-boundary-"));
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

describe("CMS insertion credential boundary", () => {
  for (const kind of ["we-publish", "livingdocs"] as const) {
    it(`keeps the ${kind} prepared mutation and every committable delivery artifact placeholder-only`, async () => {
      await materialiseCms(kind);

      const preparedMutation = await readFile(join(exportDir, "CMS-INSERTION.md"), "utf8");
      expect(preparedMutation).toContain(MAP_KEY_PLACEHOLDER);
      expect(preparedMutation).not.toContain(SENTINEL_CREDENTIAL);

      const paths = committablePaths();
      for (const name of [
        "CMS-INSERTION.md",
        "HANDOVER.md",
        ".delivery-manifest.json",
        ".delivered-from",
      ]) {
        expect(paths).toContain(`stories/story/export/1-map/${name}`);
      }
      for (const path of paths) {
        expect(
          (await readFile(join(repo, path))).includes(Buffer.from(SENTINEL_CREDENTIAL)),
        ).toBe(false);
      }
      expect(await filesContaining(SENTINEL_CREDENTIAL)).toEqual([]);
    });
  }

  it("keeps key-bearing remote-send material outside the repository and removes it when the send fails", async () => {
    let keyBearingFilesAtSend: string[] | null = null;

    await expect(
      materialise({
        form: "embed",
        format: "web",
        storiesRoot,
        storyId: "story",
        outputId: "1-map",
        env: {
          MAPTILER_DELIVERY_KEY: SENTINEL_CREDENTIAL,
          CLOUDFLARE_ACCOUNT_ID: "account",
          CLOUDFLARE_API_TOKEN: "cloudflare-token",
        },
        fetchFn: async () => {
          keyBearingFilesAtSend = await filesContaining(SENTINEL_CREDENTIAL);
          throw new Error("sentinel remote-send failure");
        },
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow("sentinel remote-send failure");

    expect(keyBearingFilesAtSend).toEqual([]);
    expect(await filesContaining(SENTINEL_CREDENTIAL)).toEqual([]);
  });
});
