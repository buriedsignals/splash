import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runSealedDelivery } from "../scripts/sealed-operation.mjs";

const roots: string[] = [];

afterEach(async () => {
  delete process.env.CLOUDFLARE_API_TOKEN;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("sealed hosted delivery materialises the complete embed form without caller-selected provider internals", async () => {
  const storiesRoot = await mkdtemp(join(tmpdir(), "splash-sealed-delivery-"));
  roots.push(storiesRoot);
  const exportDir = join(storiesRoot, "story", "export", "chart");
  await mkdir(exportDir, { recursive: true });
  const deploymentPath = join(exportDir, "DEPLOYMENT.json");
  const handoverPath = join(exportDir, "HANDOVER.md");
  process.env.CLOUDFLARE_API_TOKEN = "broker-cloudflare-canary";
  let observed: any = null;

  const result = await runSealedDelivery(
    "materialise-embed",
    {
      accountId: "0123456789abcdef0123456789abcdef",
      storiesRoot,
      storyId: "story",
      outputId: "chart",
      format: "web",
      planVersion: 1,
      findingIds: ["finding-chart"],
      handover: {
        language: "en",
        placement: "After the chart paragraph",
        alt: "Fixture chart",
        credit: "Source: fixture",
        caveat: "Fixture only",
      },
    },
    {
      materialiseFn: async (options) => {
        observed = options;
        await writeFile(
          deploymentPath,
          `${JSON.stringify({
            publicUrl: "https://stable.pages.dev",
            immutableDeploymentUrl: "https://revision.stable.pages.dev",
            deploymentId: "deployment-id",
          })}\n`,
        );
        await writeFile(handoverPath, "handover\n");
        return [deploymentPath, handoverPath];
      },
    },
  );

  expect(observed).toMatchObject({
    form: "embed",
    storiesRoot,
    storyId: "story",
    outputId: "chart",
    format: "web",
    env: {
      CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      CLOUDFLARE_API_TOKEN: "broker-cloudflare-canary",
    },
  });
  expect(observed).not.toHaveProperty("projectName");
  expect(observed).not.toHaveProperty("filePath");
  expect(result).toEqual({
    outputs: [
      join("story", "export", "chart", "DEPLOYMENT.json"),
      join("story", "export", "chart", "HANDOVER.md"),
    ],
    publicUrl: "https://stable.pages.dev",
    immutableDeploymentUrl: "https://revision.stable.pages.dev",
    deploymentId: "deployment-id",
  });
});

test("sealed hosted delivery rejects the retired low-level deployment shape", async () => {
  let called = false;
  await expect(
    runSealedDelivery(
      "materialise-embed",
      {
        accountId: "account",
        deliveryOperationId: "caller-operation",
        draftDigest: "caller-digest",
        fileName: "page.html",
        outputId: "chart",
        projectName: "caller-project",
        reviewId: "caller-review",
      },
      {
        materialiseFn: async () => {
          called = true;
        },
      },
    ),
  ).rejects.toThrow("closed contract");
  expect(called).toBe(false);
});
