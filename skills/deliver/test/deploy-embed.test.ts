import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentTypeFor,
  resolveCloudflareCredentials,
  deployFile,
} from "../scripts/deploy-embed.mjs";

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

// A hand-rolled fake of the exact four-call Cloudflare sequence `deployFile` makes (see
// `scripts/deploy-embed.mjs`'s own header comment) — this is what lets the suite prove the
// SEQUENCE and the SHAPE of every request without a real network call. The real sequence was
// proven separately, live, against the actual Cloudflare API (see the session report) — this
// fixture exists to keep that proof from needing to re-run on every `bun test`.
function fakeCloudflare({ existingProject = false } = {}) {
  const calls = [];
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
        JSON.stringify({ success: true, result: body.hashes }),
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
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: "deployment-1",
            url: "https://deadbeef.deliver-proof.pages.dev",
          },
        }),
      );
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

  it("should return the deployment's own URL", async () => {
    const { fetchFn } = fakeCloudflare();
    const { url } = await deploy({ fetchFn });
    expect(url).toBe("https://deadbeef.deliver-proof.pages.dev");
  });

  it("should call the four Cloudflare endpoints in order: create project, upload-token, check-missing, upload, deployments", async () => {
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

  it("should treat an already-existing project as success, not a failure", async () => {
    const { fetchFn } = fakeCloudflare({ existingProject: true });
    const { url } = await deploy({ fetchFn });
    expect(url).toBe("https://deadbeef.deliver-proof.pages.dev");
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

    expect(recovered.url).toBe("https://lost-response.deliver-proof.pages.dev");
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
});
