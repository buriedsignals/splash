import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadRuntimeCapabilities,
  runOperation,
} from "../scripts/run-operation.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "../../deliver/test/output-review-fixture";

const roots: string[] = [];

interface StoryFixture {
  workspace: string;
  storiesRoot: string;
  story: string;
  request: {
    storyId: string;
    canonicalStoryPath: string;
    canonicalStoriesRoot: string;
    canonicalWorkspaceRoot: string;
    parameters: Record<string, never>;
  };
}

afterEach(async () => {
  delete process.env.MAPTILER_KEY;
  delete process.env.MAPTILER_DELIVERY_KEY;
  delete process.env.DATAWRAPPER_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.SPLASH_BROWSER_PATH;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function storyFixture(): Promise<StoryFixture> {
  const workspace = await realpath(
    await mkdtemp(join(tmpdir(), "splash-operation-")),
  );
  roots.push(workspace);
  const storiesRoot = join(workspace, "stories");
  const story = join(storiesRoot, "fixture");
  await mkdir(join(story, "source"), { recursive: true });
  await mkdir(join(story, "export", "map"), { recursive: true });
  await writeFile(join(story, "AGENTS.md"), "# fixture\n");
  await writeFile(join(story, "source", "article.md"), "article\n");
  return {
    workspace,
    storiesRoot,
    story,
    request: {
      storyId: "fixture",
      canonicalStoryPath: story,
      canonicalStoriesRoot: storiesRoot,
      canonicalWorkspaceRoot: workspace,
      parameters: {},
    },
  };
}

function sha256(bytes: string | Buffer) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function nextTurn() {
  const { promise, resolve } = Promise.withResolvers<void>();
  setImmediate(resolve);
  await promise;
}

async function waitForReservationDecision(controlDir: string) {
  while (true) {
    const names = await readdir(controlDir);
    const runCount = names.filter((name) => name.endsWith(".run")).length;
    const resultCount = names.filter((name) => name.endsWith(".result.json")).length;
    if (runCount === 2 || (runCount === 1 && resultCount === 1)) return;
    await nextTurn();
  }
}

async function runConcurrentLastAttempt(
  fixture: StoryFixture,
  outcome: "success" | "failure",
) {
  const outputId = "chart";
  const beatDir = join(fixture.story, "beats", outputId);
  const spec = "{}\n";
  await mkdir(beatDir, { recursive: true });
  await writeFile(join(beatDir, "spec.json"), spec);
  await writeFile(
    join(beatDir, "PRODUCTION-ATTEMPTS.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      operation: "datawrapper-produce",
      outputId,
      inputPath: "spec.json",
      inputDigest: sha256(spec),
      attempts: 2,
      status: "failed",
      reason: "second attempt failed",
    })}\n`,
  );

  const controlDir = join(fixture.workspace, `attempt-control-${outcome}`);
  await mkdir(controlDir);
  const childPath = join(controlDir, "attempt-child.mjs");
  await writeFile(
    childPath,
    `import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
// This disposable child runs from scratch, so its absolute production-module URL is runtime-selected.
const { runOperation } = await import(process.env.RUN_OPERATION_URL);
const controlDir = process.env.CONTROL_DIR;
const id = process.env.CHILD_ID;
const request = JSON.parse(process.env.REQUEST_JSON);
const runner = async () => {
  await writeFile(join(controlDir, \`\${id}.run\`), "admitted\\n");
  while (true) {
    try {
      await readFile(join(controlDir, "release"));
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const { promise, resolve } = Promise.withResolvers();
      setImmediate(resolve);
      await promise;
    }
  }
  if (process.env.ATTEMPT_OUTCOME === "failure") throw new Error(\`external failure \${id}\`);
  return { format: "static", chartId: \`chart-\${id}\`, publicUrl: \`https://example.test/\${id}\` };
};
try {
  const value = await runOperation("datawrapper-produce", request, { runSkillEntrypointFn: runner });
  await writeFile(join(controlDir, \`\${id}.result.json\`), JSON.stringify({ ok: true, value }));
} catch (error) {
  await writeFile(join(controlDir, \`\${id}.result.json\`), JSON.stringify({ ok: false, error: String(error) }));
}
`,
  );
  const request = {
    ...fixture.request,
    outputId,
    parameters: { format: "static", size: "landscape" },
  };
  const children = ["one", "two"].map((id) =>
    Bun.spawn([process.execPath, childPath], {
      env: {
        ...process.env,
        ATTEMPT_OUTCOME: outcome,
        CHILD_ID: id,
        CONTROL_DIR: controlDir,
        REQUEST_JSON: JSON.stringify(request),
        RUN_OPERATION_URL: new URL(
          "../scripts/run-operation.mjs",
          import.meta.url,
        ).href,
      },
      stdout: "pipe",
      stderr: "pipe",
    }),
  );

  await waitForReservationDecision(controlDir);
  await writeFile(join(controlDir, "release"), "release\n");
  const exits = await Promise.all(children.map((child) => child.exited));
  const errors = await Promise.all(
    children.map((child) => new Response(child.stderr).text()),
  );
  if (exits.some((exit) => exit !== 0)) {
    throw new Error(`attempt child failed: ${errors.join("\n")}`);
  }
  const names = await readdir(controlDir);
  const results = await Promise.all(
    names
      .filter((name) => name.endsWith(".result.json"))
      .sort()
      .map(async (name) =>
        JSON.parse(await readFile(join(controlDir, name), "utf8")),
      ),
  );
  return {
    beatDir,
    runCount: names.filter((name) => name.endsWith(".run")).length,
    results,
  };
}

describe("closed Splash operation runner", () => {
  test("installed chart, map, and video capability modules load without package installation", async () => {
    expect(await loadRuntimeCapabilities()).toEqual({
      chart: true,
      map: true,
      video: true,
    });
  });

  test("provider probe uses only the Engine-injected canonical credential", async () => {
    const fixture = await storyFixture();
    await writeFile(
      join(fixture.workspace, ".env"),
      "MAPTILER_KEY=legacy-must-not-load\n",
    );
    process.env.MAPTILER_KEY = "broker-canary-12345";
    let observed = "";
    const result = await runOperation(
      "provider-check-maptiler",
      fixture.request,
      {
        fetchFn: async (url: string | URL) => {
          observed = String(url);
          return new Response("{}", { status: 200 });
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(observed).toContain("broker-canary-12345");
    expect(observed).not.toContain("legacy-must-not-load");
    expect(JSON.stringify(result)).not.toContain("broker-canary-12345");
  });

  test("Datawrapper production reads the canonical beat spec and dispatches only story identity", async () => {
    const fixture = await storyFixture();
    await mkdir(join(fixture.story, "beats", "chart"), { recursive: true });
    await writeFile(join(fixture.story, "beats", "chart", "spec.json"), "{}\n");
    let dispatched: any = null;
    const result = await runOperation(
      "datawrapper-produce",
      {
        ...fixture.request,
        outputId: "chart",
        parameters: { format: "static", size: "landscape" },
      },
      {
        runSkillEntrypointFn: async (path, args, input) => {
          dispatched = { path, args, input };
          return {
            format: "static",
            chartId: "chart-id",
            publicUrl: "https://datawrapper.example/chart-id",
          };
        },
      },
    );
    expect(dispatched.path).toEndWith(
      "skills/dw-beat/scripts/sealed-produce.mjs",
    );
    expect(dispatched.args).toEqual([]);
    expect(dispatched.input).toEqual({
      storiesRoot: fixture.storiesRoot,
      storyId: "fixture",
      outputId: "chart",
      format: "static",
      size: "landscape",
    });
    expect(result).toEqual({
      operation: "datawrapper-produce",
      outputId: "chart",
      format: "static",
      chartId: "chart-id",
      publicUrl: "https://datawrapper.example/chart-id",
    });
  });

  test("map production dispatches only a story-bound declarative contract through the managed browser", async () => {
    const fixture = await storyFixture();
    await mkdir(join(fixture.story, "beats", "map"), { recursive: true });
    process.env.MAPTILER_KEY = "broker-map-canary-12345";
    process.env.SPLASH_BROWSER_PATH = "/engine/managed/chromium";
    let dispatched: any = null;
    const contractDigest = `sha256:${"a".repeat(64)}`;
    const result = await runOperation(
      "map-bake",
      {
        ...fixture.request,
        outputId: "map",
        parameters: { contractDigest },
      },
      {
        mapBakeFn: async (input) => {
          dispatched = input;
          return {
            operation: "map-bake",
            outputId: "map",
            contractDigest,
            outputs: ["beats/map/map-bake/revision/plate.png"],
          };
        },
      },
    );
    expect(dispatched).toEqual({
      story: fixture.story,
      outputId: "map",
      contractDigest,
      browserPath: "/engine/managed/chromium",
      mapTilerKey: "broker-map-canary-12345",
    });
    expect(result.outputs).toEqual([
      "beats/map/map-bake/revision/plate.png",
    ]);
    expect(JSON.stringify(result)).not.toContain("broker-map-canary-12345");
  });

  test("rejects a malformed map digest before dispatch or attempt persistence", async () => {
    const fixture = await storyFixture();
    const beatDir = join(fixture.story, "beats", "map");
    await mkdir(beatDir, { recursive: true });
    let dispatched = false;

    await expect(
      runOperation(
        "map-bake",
        {
          ...fixture.request,
          outputId: "map",
          parameters: { contractDigest: "not-a-sha256" },
        },
        {
          mapBakeFn: async () => {
            dispatched = true;
            throw new Error("invalid request reached the map producer");
          },
        },
      ),
    ).rejects.toThrow(/digest.*invalid|sha256/i);
    expect(dispatched).toBe(false);
    expect(
      await Bun.file(join(beatDir, "PRODUCTION-ATTEMPTS.json")).exists(),
    ).toBe(false);
  });

  test("reserves the third failed attempt once across dispatcher processes", async () => {
    const fixture = await storyFixture();
    const result = await runConcurrentLastAttempt(fixture, "failure");
    expect(result.runCount).toBe(1);
    expect(
      JSON.parse(
        await readFile(
          join(result.beatDir, "PRODUCTION-ATTEMPTS.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      attempts: 3,
      status: "blocked",
    });
  });

  test("reconciles a successful reserved attempt without a stale receipt", async () => {
    const fixture = await storyFixture();
    const result = await runConcurrentLastAttempt(fixture, "success");
    expect(result.runCount).toBe(1);
    expect(
      result.results
        .map((entry) => entry.value?.status ?? (entry.ok ? "success" : "error"))
        .sort(),
    ).toEqual(["blocked", "success"]);
    expect(
      await Bun.file(
        join(result.beatDir, "PRODUCTION-ATTEMPTS.json"),
      ).exists(),
    ).toBe(false);
  });

  test("map delivery writes the client-publishable key only to the final artifact", async () => {
    const fixture = await storyFixture();
    const beat = join(fixture.story, "beats", "map");
    const input = join(beat, "renders", "source.html");
    await mkdir(join(beat, "renders"), { recursive: true });
    await writeFile(input, '<script>const key="__MAPTILER_KEY__"</script>');
    await approveCurrentOutput(beat);
    process.env.MAPTILER_DELIVERY_KEY = "restricted-delivery-canary-12345";
    const result = await runOperation("maptiler-delivery", {
      ...fixture.request,
      outputId: "map",
      finalDeliveryConfirmed: true,
      parameters: {
        findingIds: TEST_FINDING_IDS,
        format: "web",
        handover: {
          language: "en",
          placement: "After the paragraph supported by this map",
          alt: "A fixture map",
          credit: "Source: fixture",
          caveat: "Fixture only",
        },
        planVersion: TEST_PLAN_VERSION,
      },
    });
    const final = await readFile(
      join(fixture.story, "export", "map", "source.html"),
      "utf8",
    );
    expect(final).toContain("restricted-delivery-canary-12345");
    expect(await readFile(input, "utf8")).not.toContain(
      "restricted-delivery-canary-12345",
    );
    expect(JSON.stringify(result)).not.toContain(
      "restricted-delivery-canary-12345",
    );
    expect(result.keyState).toBe("restricted");
  });

  test("rejects undeclared parameters and story escapes", async () => {
    const fixture = await storyFixture();
    await expect(
      runOperation("provider-check-datawrapper", {
        ...fixture.request,
        parameters: { command: "/bin/sh" },
      }),
    ).rejects.toThrow("closed contract");
    await expect(
      runOperation("story-inspect", {
        ...fixture.request,
        canonicalStoryPath: fixture.workspace,
      }),
    ).rejects.toThrow("bound story");
  });

  test("fixed seed parameters cannot masquerade as the declarative map operation", async () => {
    const fixture = await storyFixture();
    await expect(
      runOperation("map-bake", {
        ...fixture.request,
        outputId: "map",
        format: "web",
        parameters: { data: "source/article.md", settle: "50", size: "320" },
      }),
    ).rejects.toThrow("closed contract");
  });

  test("delivery cannot target an unconfirmed output namespace", async () => {
    const fixture = await storyFixture();
    await expect(
      runOperation("maptiler-delivery", {
        ...fixture.request,
        outputId: "map",
        finalDeliveryConfirmed: false,
        parameters: {
          findingIds: TEST_FINDING_IDS,
          format: "web",
          handover: {},
          planVersion: TEST_PLAN_VERSION,
        },
      }),
    ).rejects.toThrow("final-delivery confirmation");
  });

  test("hosted delivery dispatches the complete confirmed form without caller-selected Cloudflare internals", async () => {
    const fixture = await storyFixture();
    let dispatched: any = null;
    const parameters = {
      findingIds: TEST_FINDING_IDS,
      format: "web",
      handover: {
        language: "en",
        placement: "After the paragraph supported by this chart",
        alt: "A fixture chart",
        credit: "Source: fixture",
        caveat: "Fixture only",
      },
      planVersion: TEST_PLAN_VERSION,
    };
    const result = await runOperation(
      "cloudflare-deploy",
      {
        ...fixture.request,
        outputId: "chart",
        cloudflareAccountId: "0123456789abcdef0123456789abcdef",
        finalDeliveryConfirmed: true,
        parameters,
      },
      {
        runSkillEntrypointFn: async (path, args, input) => {
          dispatched = { path, args, input };
          return {
            outputs: ["fixture/export/chart/EMBED_URL.txt"],
            publicUrl: "https://stable.pages.dev",
            immutableDeploymentUrl: "https://revision.stable.pages.dev",
            deploymentId: "deployment-id",
          };
        },
      },
    );
    expect(dispatched.path).toEndWith(
      "skills/deliver/scripts/sealed-operation.mjs",
    );
    expect(dispatched.args).toEqual(["materialise-embed"]);
    expect(dispatched.input).toEqual({
      accountId: "0123456789abcdef0123456789abcdef",
      storiesRoot: fixture.storiesRoot,
      storyId: "fixture",
      outputId: "chart",
      ...parameters,
    });
    expect(result.publicUrl).toBe("https://stable.pages.dev");
    expect(dispatched.input).not.toHaveProperty("projectName");
    expect(dispatched.input).not.toHaveProperty("filePath");

    await expect(
      runOperation("cloudflare-deploy", {
        ...fixture.request,
        outputId: "chart",
        cloudflareAccountId: "0123456789abcdef0123456789abcdef",
        finalDeliveryConfirmed: true,
        parameters: {
          deliveryOperationId: "caller-selected",
          draftDigest: "sha256:bad",
          fileName: "page.html",
          projectName: "caller-project",
          reviewId: "caller-review",
        },
      }),
    ).rejects.toThrow("closed contract");
  });
});
