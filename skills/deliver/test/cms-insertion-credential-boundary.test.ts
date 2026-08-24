import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
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
let git: GitCommand;

let controlledTempRoot: string;

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

type SendObservation = {
  uploadedBytes: string;
  directories: string[];
  files: string[];
  directoryPath?: string;
  filePath?: string;
  directoryMode?: number;
  fileMode?: number;
};

async function observeTemporaryUpload(
  tempRoot: string,
  uploadedBytes: string,
): Promise<SendObservation> {
  const directories = (await readdir(tempRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const observation: SendObservation = {
    uploadedBytes,
    directories,
    files: [],
  };
  if (directories.length !== 1) return observation;

  const directoryPath = await realpath(join(tempRoot, directories[0]!));
  const files = (await readdir(directoryPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  observation.directoryPath = directoryPath;
  observation.directoryMode = (await stat(directoryPath)).mode & 0o777;
  observation.files = files;
  if (files.length === 1) {
    observation.filePath = await realpath(join(directoryPath, files[0]!));
    observation.fileMode = (await stat(observation.filePath)).mode & 0o777;
  }
  return observation;
}

function fakeCloudflareAtBoundary({
  tempRoot,
  failSentinelUpload = false,
}: {
  tempRoot: string;
  failSentinelUpload?: boolean;
}) {
  let deploymentNumber = 0;
  const deployments = new Map<string, { url: string; commitHash: string }>();
  const state: { calls: number; observation: SendObservation | null } = {
    calls: 0,
    observation: null,
  };
  const fetchFn = async (url: string, init?: RequestInit) => {
    state.calls++;
    const path = new URL(url).pathname;
    if (path.endsWith("/upload-token")) {
      return new Response(
        JSON.stringify({ success: true, result: { jwt: "fake-jwt" } }),
      );
    }
    if (path === "/client/v4/pages/assets/check-missing") {
      const body = JSON.parse(init!.body as string);
      return new Response(
        JSON.stringify({ success: true, result: body.hashes }),
      );
    }
    if (path === "/client/v4/pages/assets/upload") {
      const uploadedBytes = (
        JSON.parse(init!.body as string) as Array<{ value: string }>
      )
        .map(({ value }) => Buffer.from(value, "base64").toString("utf8"))
        .join("");
      if (uploadedBytes.includes(SENTINEL_CREDENTIAL)) {
        state.observation = await observeTemporaryUpload(tempRoot, uploadedBytes);
        if (failSentinelUpload) {
          throw new Error("deterministic provider upload failure");
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: { successful_key_count: 1, unsuccessful_keys: [] },
        }),
      );
    }
    if (path.endsWith("/deployments") && init?.method === "POST") {
      deploymentNumber++;
      const parts = path.split("/");
      const projectName = parts[parts.indexOf("projects") + 1]!;
      const id = `deployment-${deploymentNumber}`;
      const url = `https://deploy-${deploymentNumber}.${projectName}.pages.dev`;
      deployments.set(id, {
        url,
        commitHash: (init!.body as FormData).get("commit_hash") as string,
      });
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id,
            url,
            aliases: [`https://${projectName}.pages.dev`],
          },
        }),
      );
    }
    const deploymentMatch = path.match(/\/deployments\/(deployment-\d+)$/);
    if (deploymentMatch && init?.method !== "POST") {
      const deployment = deployments.get(deploymentMatch[1]!);
      if (!deployment) throw new Error(`missing ${deploymentMatch[1]}`);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: deploymentMatch[1],
            url: deployment.url,
            deployment_trigger: {
              metadata: { commit_hash: deployment.commitHash },
            },
          },
        }),
      );
    }
    if (path.endsWith("/projects") && init?.method === "POST") {
      return new Response(JSON.stringify({ success: true, result: {} }));
    }
    throw new Error(`unhandled provider call ${init?.method ?? "GET"} ${path}`);
  };
  return { fetchFn, state };
}

async function expectPrivateExternalSend(
  observation: SendObservation | null,
): Promise<void> {
  if (!observation) throw new Error("provider did not receive the sentinel upload");
  expect(observation.uploadedBytes).toContain(SENTINEL_CREDENTIAL);
  expect(observation.directories).toHaveLength(1);
  expect(observation.files).toHaveLength(1);
  if (!observation.directoryPath || !observation.filePath) {
    throw new Error("controlled temporary root did not contain one send file");
  }

  const canonicalRepo = await realpath(repo);
  const canonicalTempRoot = await realpath(controlledTempRoot);
  const fromRepository = relative(canonicalRepo, observation.filePath);
  expect(fromRepository === ".." || fromRepository.startsWith(`..${sep}`)).toBe(
    true,
  );
  const fromControlledRoot = relative(
    canonicalTempRoot,
    observation.directoryPath,
  );
  expect(fromControlledRoot).not.toBe("");
  expect(fromControlledRoot.startsWith(`..${sep}`)).toBe(false);
  expect(isAbsolute(fromControlledRoot)).toBe(false);
  expect(observation.directoryMode).toBe(0o700);
  expect(observation.fileMode).toBe(0o600);
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
  controlledTempRoot = await mkdtemp(join(tmpdir(), "cms-hosted-temp-root-"));
  const bootstrapGit = gitCommand(repo);
  bootstrapGit("init", "-q");

  const excludesFile = join(repo, ".git", "host-excludes");
  const systemConfig = join(repo, ".git", "host-system-config");
  const globalConfig = join(repo, ".git", "host-global-config");
  await writeFile(excludesFile, "stories/**\n");
  const hostileConfig = `[core]\n\texcludesFile = ${JSON.stringify(excludesFile)}\n`;
  await writeFile(systemConfig, hostileConfig);
  await writeFile(globalConfig, hostileConfig);
  const ambient = hostileExcludeEnvironment(systemConfig, globalConfig);
  git = gitCommand(repo, ambient);
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
  await rm(controlledTempRoot, { recursive: true, force: true });
});

describe("CMS insertion credential boundary", () => {
  for (const kind of ["we-publish", "livingdocs"] as const) {
    it(`keeps the ${kind} prepared mutation and every committable delivery artifact placeholder-only under matching system and global excludes`, async () => {
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

  it("uploads substituted bytes from a private canonical path outside the repository and cleans it after success", async () => {
    const provider = fakeCloudflareAtBoundary({
      tempRoot: controlledTempRoot,
    });

    await materialise({
      form: "embed",
      format: "web",
      storiesRoot,
      storyId: "story",
      outputId: "1-map",
      env: {
        MAPTILER_DELIVERY_KEY: SENTINEL_CREDENTIAL,
        CLOUDFLARE_ACCOUNT_ID: "account",
        CLOUDFLARE_API_TOKEN: "cloudflare-token",
        TMPDIR: controlledTempRoot,
      },
      fetchFn: provider.fetchFn,
      handover,
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
    });

    expect(await readdir(controlledTempRoot)).toEqual([]);
    await expectPrivateExternalSend(provider.state.observation);
    expect(await filesContaining(SENTINEL_CREDENTIAL)).toEqual([]);
  });

  it("cleans the private external send material after a deterministic provider failure", async () => {
    const provider = fakeCloudflareAtBoundary({
      tempRoot: controlledTempRoot,
      failSentinelUpload: true,
    });

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
          TMPDIR: controlledTempRoot,
        },
        fetchFn: provider.fetchFn,
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow("deterministic provider upload failure");

    expect(await readdir(controlledTempRoot)).toEqual([]);
    await expectPrivateExternalSend(provider.state.observation);
    expect(await filesContaining(SENTINEL_CREDENTIAL)).toEqual([]);
  });

  it("refuses a temporary root owned by a different Git worktree", async () => {
    const foreignRepo = await mkdtemp(join(tmpdir(), "foreign-hosted-temp-"));
    try {
      const foreignGit = gitCommand(foreignRepo);
      foreignGit("init", "-q");
      foreignGit("config", "user.email", "test@example.invalid");
      foreignGit("config", "user.name", "Test");
      const foreignTempRoot = join(foreignRepo, "provider-temp");
      await mkdir(foreignTempRoot);
      const provider = fakeCloudflareAtBoundary({ tempRoot: foreignTempRoot });

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
            TMPDIR: foreignTempRoot,
          },
          fetchFn: provider.fetchFn,
          handover,
          planVersion: TEST_PLAN_VERSION,
          findingIds: TEST_FINDING_IDS,
        }),
      ).rejects.toThrow(/outside every Git repository/i);

      expect(provider.state.calls).toBe(0);
      expect(await readdir(foreignTempRoot)).toEqual([]);
    } finally {
      await rm(foreignRepo, { recursive: true, force: true });
    }
  });

  it("refuses an injected TMPDIR inside the repository before writing or sending key-bearing bytes", async () => {
    const repositoryTempRoot = join(repo, "provider-temp");
    await mkdir(repositoryTempRoot);
    await chmod(repositoryTempRoot, 0o500);
    const provider = fakeCloudflareAtBoundary({
      tempRoot: repositoryTempRoot,
    });

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
          TMPDIR: repositoryTempRoot,
        },
        fetchFn: provider.fetchFn,
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/temporary.*outside.*repository/i);

    expect(provider.state.calls).toBe(0);
    expect(await readdir(repositoryTempRoot)).toEqual([]);
    expect(await filesContaining(SENTINEL_CREDENTIAL)).toEqual([]);
  });
});
