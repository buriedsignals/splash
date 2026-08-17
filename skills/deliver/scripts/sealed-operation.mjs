#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { basename, relative } from "node:path";
import { materialise } from "./deliver.mjs";

const MAX_REQUEST_BYTES = 64 * 1024;
function exactKeys(value, expected) {
  const actual =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).sort()
      : [];
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(
      "sealed delivery request fields do not match the closed contract",
    );
  }
}

async function readRequest() {
  const chunks = [];
  let total = 0;
  for await (const chunk of Bun.stdin.stream()) {
    total += chunk.byteLength;
    if (total > MAX_REQUEST_BYTES)
      throw new Error("sealed delivery request has an invalid size");
    chunks.push(chunk);
  }
  if (total === 0)
    throw new Error("sealed delivery request has an invalid size");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function keyState(files) {
  const key = process.env.MAPTILER_KEY ?? "";
  if (!key) return "unkeyed";
  return files.some((body) => body.includes(key)) ? "configured" : "none";
}

export async function runSealedDelivery(
  operation,
  request,
  { materialiseFn = materialise, readFileFn = readFile, fetchFn = fetch } = {},
) {
  if (operation === "materialise-owned") {
    exactKeys(request, [
      "findingIds",
      "format",
      "handover",
      "outputId",
      "planVersion",
      "storiesRoot",
      "storyId",
    ]);
    const written = await materialiseFn({
      ...request,
      form: "owned-file",
      env: { MAPTILER_KEY: process.env.MAPTILER_KEY ?? "" },
    });
    const bodies = await Promise.all(
      written.map(async (path) => {
        try {
          return await readFileFn(path, "utf8");
        } catch {
          return "";
        }
      }),
    );
    return {
      outputs: written.map((path) => relative(request.storiesRoot, path)),
      keyState: keyState(bodies),
    };
  }
  if (operation === "materialise-embed") {
    exactKeys(request, [
      "accountId",
      "findingIds",
      "format",
      "handover",
      "outputId",
      "planVersion",
      "storiesRoot",
      "storyId",
    ]);
    const written = await materialiseFn({
      storiesRoot: request.storiesRoot,
      storyId: request.storyId,
      outputId: request.outputId,
      form: "embed",
      format: request.format,
      planVersion: request.planVersion,
      findingIds: request.findingIds,
      handover: request.handover,
      env: {
        CLOUDFLARE_ACCOUNT_ID: request.accountId,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? "",
      },
      fetchFn,
    });
    const deploymentPath = written.find(
      (path) => basename(path) === "DEPLOYMENT.json",
    );
    if (!deploymentPath)
      throw new Error("hosted delivery produced no deployment receipt");
    const deployment = JSON.parse(await readFileFn(deploymentPath, "utf8"));
    return {
      outputs: written.map((path) => relative(request.storiesRoot, path)),
      publicUrl: deployment.publicUrl,
      immutableDeploymentUrl: deployment.immutableDeploymentUrl,
      deploymentId: deployment.deploymentId,
    };
  }
  throw new Error("unknown sealed delivery operation");
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1)
    throw new Error("sealed delivery entrypoint accepts one operation");
  const request = await readRequest();
  console.log(JSON.stringify(await runSealedDelivery(argv[0], request)));
}

if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
