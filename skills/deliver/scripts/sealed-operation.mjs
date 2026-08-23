#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { KEYED_DELIVERY_DIR, materialise } from "./deliver.mjs";
import { resolveEnvKey } from "./env-keys.mjs";

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

/**
 * WHETHER THE RESTRICTED KEY ACTUALLY REACHED THE ARTIFACT THAT CARRIES IT — asked of the file that
 * carries it, which as of 2026-08-23 is not the file that lands in `export/<beat>/`.
 *
 * D1: a live key may not be committed and the export is inside the repository, so `materialise` now
 * writes the record with the placeholder and the DELIVERY into `export/<beat>/keyed/`. This used to
 * scan the record bodies for the key and would now answer "none" on every successful keyed
 * delivery — a mechanism reporting a failure that had not happened, which is the same shape as one
 * reporting a success that had not.
 *
 * AND THE RECORD IS CHECKED IN THE OTHER DIRECTION, at the seal, because this is the last place the
 * bytes are in hand before they are committed: a record body carrying the key is a leak and stops
 * the operation rather than being reported.
 */
async function keyStateOf(written, readFileFn) {
  const key = resolveEnvKey(process.env, "MAPTILER_DELIVERY_KEY");
  if (!key) return "unkeyed";
  const read = async (path) => {
    try {
      return await readFileFn(path, "utf8");
    } catch {
      return "";
    }
  };
  for (const path of written)
    if ((await read(path)).includes(key))
      throw new Error(
        `the delivered record ${basename(path)} carries the live MapTiler key. The key belongs in ` +
          `${KEYED_DELIVERY_DIR}/, which git cannot commit; the record carries the placeholder.`,
      );
  const keyed = await Promise.all(
    written.map((path) => read(join(dirname(path), KEYED_DELIVERY_DIR, basename(path)))),
  );
  return keyed.some((body) => body.includes(key)) ? "restricted" : "none";
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
      env: { MAPTILER_DELIVERY_KEY: resolveEnvKey(process.env, "MAPTILER_DELIVERY_KEY") },
    });
    return {
      outputs: written.map((path) => relative(request.storiesRoot, path)),
      keyState: await keyStateOf(written, readFileFn),
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
        CLOUDFLARE_API_TOKEN: resolveEnvKey(process.env, "CLOUDFLARE_API_TOKEN"),
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
