import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentTypeFor,
  cloudflareProjectName,
  cloudflareScrollerProjectName,
  cloudflareScrollerUrl,
  resolveSplashInstanceId,
  resolveCloudflareCredentials,
  deployFile,
  validateDeploymentReceipt,
} from "../scripts/deploy-embed.mjs";

const INSTANCE_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("resolveCloudflareCredentials", () => {
  it("should return null when both env vars are absent", () => {
    expect(resolveCloudflareCredentials({})).toBeNull();
  });

  it("should return null when only the account id is set", () => {
    expect(
      resolveCloudflareCredentials({ CLOUDFLARE_ACCOUNT_ID: "acct" }),
    ).toBeNull();
  });

  it("should return null when only the api token is set", () => {
    expect(
      resolveCloudflareCredentials({ CLOUDFLARE_API_TOKEN: "tok" }),
    ).toBeNull();
  });

  it("should return both values when both env vars are set", () => {
    expect(
      resolveCloudflareCredentials({
        CLOUDFLARE_ACCOUNT_ID: "acct",
        CLOUDFLARE_API_TOKEN: "tok",
      }),
    ).toEqual({ accountId: "acct", apiToken: "tok" });
  });
});

describe("contentTypeFor", () => {
  it("should map a .html file to text/html", () => {
    expect(contentTypeFor("rainfall.html")).toBe("text/html; charset=utf-8");
  });

  it("should map a .png file to image/png", () => {
    expect(contentTypeFor("still.png")).toBe("image/png");
  });

  it("should fall back to application/octet-stream for an unknown extension", () => {
    expect(contentTypeFor("data.weird")).toBe("application/octet-stream");
  });
});

// A hand-rolled fake of the Cloudflare project-create and direct-upload sequence `deployFile` makes (see
// `scripts/deploy-embed.mjs`'s own header comment) — this is what lets the suite prove the
// sequence and shape of every request without a real network call. It makes no live-provider claim.
function fakeCloudflare({ existingProject = false, assetMissing = true } = {}) {
  const calls = [];
  let deploymentKey;
  const fetchFn = async (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", init });
    const path = new URL(url).pathname;

    if (
      path === "/client/v4/accounts/acct/pages/projects" &&
      init?.method === "POST"
    ) {
      if (existingProject) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [
              {
                code: 8000002,
                message: "A project with this name already exists.",
              },
            ],
          }),
          { status: 409 },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: { name: "deliver-proof" },
        }),
      );
    }

    if (path.endsWith("/upload-token")) {
      return new Response(
        JSON.stringify({ success: true, result: { jwt: "fake-jwt" } }),
      );
    }

    if (path === "/client/v4/pages/assets/check-missing") {
      const body = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ success: true, result: assetMissing ? body.hashes : [] }),
      );
    }

    if (path === "/client/v4/pages/assets/upload") {
      return new Response(
        JSON.stringify({
          success: true,
          result: { successful_key_count: 1, unsuccessful_keys: [] },
        }),
      );
    }

    if (path.endsWith("/deployments") && init?.method === "POST") {
      deploymentKey = init.body.get("commit_hash");
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: "deployment-1",
            url: "https://deadbeef.deliver-proof.pages.dev",
            aliases: ["https://deliver-proof.pages.dev"],
          },
        }),
      );
    }

    if (path.endsWith("/deployments/deployment-1") && init?.method !== "POST") {
      return new Response(JSON.stringify({
        success: true,
        result: {
          id: "deployment-1",
          url: "https://deadbeef.deliver-proof.pages.dev",
          deployment_trigger: { metadata: { commit_hash: deploymentKey } },
        },
      }));
    }

    throw new Error(
      `fakeCloudflare: unhandled call ${init?.method ?? "GET"} ${path}`,
    );
  };
  return { fetchFn, calls };
}

describe("deployFile", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "embed-"));
    await writeFile(join(dir, "rainfall.html"), "<!doctype html><h1>hi</h1>");
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function deploy(overrides = {}) {
    return deployFile({
      accountId: "acct",
      apiToken: "tok",
      projectName: "deliver-proof",
      filePath: join(dir, "rainfall.html"),
      fileName: "rainfall.html",
      recordDir: dir,
      outputId: "1-rainfall",
      reviewId: "review-1",
      draftDigest: `sha256:${"a".repeat(64)}`,
      deliveryOperationId: "delivery-operation-1",
      ...overrides,
    });
  }

  it("should return the stable project URL and retain the immutable deployment URL", async () => {
    const { fetchFn } = fakeCloudflare();
    const { url, deploymentUrl } = await deploy({ fetchFn });
    expect(url).toBe("https://deliver-proof.pages.dev");
    expect(deploymentUrl).toBe("https://deadbeef.deliver-proof.pages.dev");
  });

  it("should call project creation and the four upload endpoints in order", async () => {
    const { fetchFn, calls } = fakeCloudflare();
    await deploy({ fetchFn });
    const paths = calls.map((c) => new URL(c.url).pathname.split("/").pop());
    expect(paths).toEqual([
      "projects",
      "upload-token",
      "check-missing",
      "upload",
      "deployments",
    ]);
    const deployment = calls.find(
      (call) => call.method === "POST" && call.url.endsWith("/deployments"),
    );
    const deploymentKey = deployment.init.body.get("commit_hash");
    expect(deploymentKey).toMatch(/^[0-9a-f]{40}$/);
    expect(deployment.init.body.get("commit_message")).toContain(deploymentKey);
  });

  it("should skip the asset upload when Cloudflare already has the content hash", async () => {
    const { fetchFn, calls } = fakeCloudflare({ assetMissing: false });
    await deploy({ fetchFn });
    expect(calls.some((call) => new URL(call.url).pathname.endsWith("/pages/assets/upload"))).toBe(false);
    expect(calls.some((call) => call.url.endsWith("/deployments"))).toBe(true);
  });

  it("should treat an already-existing project as success, not a failure", async () => {
    const { fetchFn } = fakeCloudflare({ existingProject: true });
    const { url } = await deploy({ fetchFn });
    expect(url).toBe("https://deliver-proof.pages.dev");
  });

  it("should throw, naming the real reason, when a Cloudflare call fails for a reason other than the project already existing", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          success: false,
          errors: [{ message: "Invalid API Token" }],
        }),
        { status: 401 },
      );
    await expect(
      deploy({ apiToken: "bad-token", fetchFn }),
    ).rejects.toThrow("Invalid API Token");
  });

  it("should enforce a hard deadline even when fetch ignores the abort signal", async () => {
    let signal: AbortSignal | undefined;
    const fetchFn = (_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    };
    const started = Date.now();
    await expect(deploy({ fetchFn, timeoutMs: 20 })).rejects.toThrow(/timed out after 20ms/);
    expect(Date.now() - started).toBeLessThan(200);
    expect(signal?.aborted).toBe(true);
  });

  it("should bound response-body reads too", async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => new Promise(() => {}),
    });
    await expect(deploy({ fetchFn, timeoutMs: 20 })).rejects.toThrow(/timed out after 20ms/);
  });

  it("should reconcile a deployment whose successful response was lost without posting twice", async () => {
    const base = fakeCloudflare();
    const remote = [];
    let deploymentPosts = 0;
    let deploymentLists = 0;
    const fetchFn = async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/deployments") && init?.method !== "POST") {
        deploymentLists++;
        return new Response(JSON.stringify({ success: true, result: remote }));
      }
      if (parsed.pathname.endsWith("/deployments") && init?.method === "POST") {
        deploymentPosts++;
        const deploymentKey = init.body.get("commit_hash");
        remote.push({
          id: "deployment-after-loss",
          url: "https://lost-response.deliver-proof.pages.dev",
          aliases: ["https://deliver-proof.pages.dev"],
          deployment_trigger: { metadata: { commit_hash: deploymentKey } },
        });
        throw new Error("connection closed before the response arrived");
      }
      return base.fetchFn(url, init);
    };

    await expect(deploy({ fetchFn })).rejects.toThrow(/connection closed/);
    const recovered = await deploy({
      fetchFn,
      deliveryOperationId: "delivery-operation-2",
    });

    expect(recovered.url).toBe("https://deliver-proof.pages.dev");
    expect(recovered.deploymentUrl).toBe("https://lost-response.deliver-proof.pages.dev");
    expect(recovered.reused).toBe(true);
    expect(deploymentPosts).toBe(1);
    expect(deploymentLists).toBe(1);
    expect(JSON.parse(await readFile(recovered.recordPath, "utf8"))).toMatchObject({
      state: "remote-complete",
      deploymentId: "deployment-after-loss",
    });
  });

  it("should fail closed after an unreadable deployment 5xx instead of posting twice", async () => {
    const base = fakeCloudflare();
    let deploymentPosts = 0;
    const fetchFn = async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/deployments") && init?.method !== "POST") {
        return new Response(JSON.stringify({ success: true, result: [] }));
      }
      if (parsed.pathname.endsWith("/deployments") && init?.method === "POST") {
        deploymentPosts++;
        return {
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: async () => {
            throw new Error("truncated response body");
          },
        };
      }
      return base.fetchFn(url, init);
    };

    await expect(deploy({ fetchFn })).rejects.toThrow(/unreadable JSON/);
    await expect(
      deploy({ fetchFn, deliveryOperationId: "delivery-operation-2" }),
    ).rejects.toThrow(/remains ambiguous/);
    expect(deploymentPosts).toBe(1);
  });

  it("should authenticate a completed operation receipt before reusing it", async () => {
    const { fetchFn, calls } = fakeCloudflare();
    await deploy({ fetchFn });
    const reused = await deploy({
      fetchFn,
      deliveryOperationId: "delivery-operation-2",
    });
    expect(reused.reused).toBe(true);
    expect(
      calls.filter((call) => call.method === "POST" && call.url.endsWith("/deployments")),
    ).toHaveLength(1);
    expect(calls.some((call) => call.url.endsWith("/deployments/deployment-1"))).toBe(true);
  });

  it("should reject unsafe authenticated provider path segments before fetch", async () => {
    let called = false;
    await expect(
      deploy({
        accountId: "../accounts",
        fetchFn: async () => {
          called = true;
          throw new Error("must not fetch");
        },
      }),
    ).rejects.toThrow(/one Cloudflare provider path segment/);
    expect(called).toBe(false);
  });
});

describe("cloudflareProjectName", () => {
  it("derives one stable, bounded project name per story output", () => {
    const first = cloudflareProjectName(INSTANCE_ID, "heat-pump-adoption-across-europe", "1-the-gap-that-persists");
    expect(first).toBe(cloudflareProjectName(INSTANCE_ID, "heat-pump-adoption-across-europe", "1-the-gap-that-persists"));
    expect(first).not.toBe(cloudflareProjectName(INSTANCE_ID, "heat-pump-adoption-across-europe", "2-the-gap"));
    expect(first).not.toBe(cloudflareProjectName("123e4567-e89b-42d3-b456-426614174000", "heat-pump-adoption-across-europe", "1-the-gap-that-persists"));
    expect(first.length).toBeLessThanOrEqual(58);
    expect(first).toMatch(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/);
    expect(first).toMatch(/-[0-9a-f]{20}$/);
  });

  it("persists and reuses one deployment namespace per stories root", async () => {
    const storiesRoot = await mkdtemp(join(tmpdir(), "splash-instance-"));
    try {
      const first = await resolveSplashInstanceId(storiesRoot);
      const second = await resolveSplashInstanceId(storiesRoot);
      expect(second).toBe(first);
      expect(first).toMatch(/^[0-9a-f-]{36}$/);
    } finally {
      await rm(storiesRoot, { recursive: true, force: true });
    }
  });

  it("recovers a missing namespace from a validated versioned deployment receipt", async () => {
    const storiesRoot = await mkdtemp(join(tmpdir(), "splash-instance-recovery-"));
    const projectName = cloudflareProjectName(INSTANCE_ID, "story", "1-chart");
    const receiptDir = join(storiesRoot, "story", "export", "1-chart");
    await mkdir(receiptDir, { recursive: true });
    await writeFile(join(receiptDir, "DEPLOYMENT.json"), JSON.stringify({
      schemaVersion: 2,
      provider: "cloudflare-pages",
      splashInstanceId: INSTANCE_ID,
      storyId: "story",
      outputId: "1-chart",
      projectName,
      publicUrl: `https://${projectName}.pages.dev`,
      immutableDeploymentUrl: `https://deadbeef.${projectName}.pages.dev`,
      deploymentId: "deployment-1",
      reviewId: "review-1",
      draftDigest: `sha256:${"a".repeat(64)}`,
      editableSource: "beats/1-chart/",
      renderedArtifact: "beats/1-chart/renders/chart.html",
      currentDelivery: "export/1-chart/",
      stableAcrossRevisions: true,
      publishedAt: "2026-08-14T00:00:00.000Z",
    }));
    try {
      expect(await resolveSplashInstanceId(storiesRoot)).toBe(INSTANCE_ID);
      expect((await readFile(join(storiesRoot, ".splash-instance-id"), "utf8")).trim()).toBe(
        INSTANCE_ID,
      );
    } finally {
      await rm(storiesRoot, { recursive: true, force: true });
    }
  });

  it("fails when deployment history carries conflicting namespaces", async () => {
    const storiesRoot = await mkdtemp(join(tmpdir(), "splash-instance-conflict-"));
    const ids = [INSTANCE_ID, "123e4567-e89b-42d3-b456-426614174000"];
    try {
      for (const [index, id] of ids.entries()) {
        const storyId = `story-${index}`;
        const outputId = "1-chart";
        const projectName = cloudflareProjectName(id, storyId, outputId);
        const receiptDir = join(storiesRoot, storyId, "export", outputId);
        await mkdir(receiptDir, { recursive: true });
        await writeFile(join(receiptDir, "DEPLOYMENT.json"), JSON.stringify({
          schemaVersion: 2,
          provider: "cloudflare-pages",
          splashInstanceId: id,
          storyId,
          outputId,
          projectName,
          publicUrl: `https://${projectName}.pages.dev`,
          immutableDeploymentUrl: `https://deadbeef.${projectName}.pages.dev`,
          deploymentId: `deployment-${index}`,
          reviewId: `review-${index}`,
          draftDigest: `sha256:${String(index).repeat(64)}`,
          editableSource: `beats/${outputId}/`,
          renderedArtifact: `beats/${outputId}/renders/chart.html`,
          currentDelivery: `export/${outputId}/`,
          stableAcrossRevisions: true,
          publishedAt: "2026-08-14T00:00:00.000Z",
        }));
      }
      await expect(resolveSplashInstanceId(storiesRoot)).rejects.toThrow(/conflicting/);
    } finally {
      await rm(storiesRoot, { recursive: true, force: true });
    }
  });

  it("rejects a current receipt whose public URL points away from its project", () => {
    expect(() => validateDeploymentReceipt({
      schemaVersion: 2,
      provider: "cloudflare-pages",
      splashInstanceId: INSTANCE_ID,
      storyId: "story",
      outputId: "1-chart",
      projectName: "splash-story-chart-1234567890abcdef1234",
      publicUrl: "https://example.com/redirect",
      immutableDeploymentUrl: "https://deadbeef.splash-story-chart-1234567890abcdef1234.pages.dev",
      deploymentId: "deployment-1",
      reviewId: "review-1",
      draftDigest: `sha256:${"a".repeat(64)}`,
      editableSource: "beats/1-chart/",
      renderedArtifact: "beats/1-chart/renders/chart.html",
      currentDelivery: "export/1-chart/",
      stableAcrossRevisions: true,
      publishedAt: "2026-08-14T00:00:00.000Z",
    })).toThrow(/does not belong/);
  });
});

describe("cloudflareScrollerProjectName", () => {
  it("derives one stable companion URL per Cloudflare account", () => {
    const project = cloudflareScrollerProjectName("acct");
    expect(project).toBe("splash-scroller-def0b17f603285ef4336");
    expect(cloudflareScrollerUrl("acct")).toBe(`https://${project}.pages.dev`);
    expect(cloudflareScrollerProjectName("ABCDEF0123456789ABCDEF0123456789")).toBe(
      cloudflareScrollerProjectName("abcdef0123456789abcdef0123456789"),
    );
  });
});
