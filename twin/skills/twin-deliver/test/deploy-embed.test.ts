import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
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
    calls.push({ url, method: init?.method ?? "GET" });
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
          result: { name: "twin-deliver-proof" },
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
          result: { url: "https://deadbeef.twin-deliver-proof.pages.dev" },
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

  it("should return the deployment's own URL", async () => {
    const { fetchFn } = fakeCloudflare();
    const { url } = await deployFile({
      accountId: "acct",
      apiToken: "tok",
      projectName: "twin-deliver-proof",
      filePath: join(dir, "rainfall.html"),
      fileName: "rainfall.html",
      fetchFn,
    });
    expect(url).toBe("https://deadbeef.twin-deliver-proof.pages.dev");
  });

  it("should call the four Cloudflare endpoints in order: create project, upload-token, check-missing, upload, deployments", async () => {
    const { fetchFn, calls } = fakeCloudflare();
    await deployFile({
      accountId: "acct",
      apiToken: "tok",
      projectName: "twin-deliver-proof",
      filePath: join(dir, "rainfall.html"),
      fileName: "rainfall.html",
      fetchFn,
    });
    const paths = calls.map((c) => new URL(c.url).pathname.split("/").pop());
    expect(paths).toEqual([
      "projects",
      "upload-token",
      "check-missing",
      "upload",
      "deployments",
    ]);
  });

  it("should treat an already-existing project as success, not a failure", async () => {
    const { fetchFn } = fakeCloudflare({ existingProject: true });
    const { url } = await deployFile({
      accountId: "acct",
      apiToken: "tok",
      projectName: "twin-deliver-proof",
      filePath: join(dir, "rainfall.html"),
      fileName: "rainfall.html",
      fetchFn,
    });
    expect(url).toBe("https://deadbeef.twin-deliver-proof.pages.dev");
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
      deployFile({
        accountId: "acct",
        apiToken: "bad-token",
        projectName: "twin-deliver-proof",
        filePath: join(dir, "rainfall.html"),
        fileName: "rainfall.html",
        fetchFn,
      }),
    ).rejects.toThrow("Invalid API Token");
  });
});
