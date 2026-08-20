#!/usr/bin/env bun

import { missingDatawrapperTokenMessage, produce, resolveDatawrapperToken } from "./produce.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_REQUEST_BYTES = 64 * 1024;

function exactKeys(value, expected) {
  const actual =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).sort()
      : [];
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(
      "sealed Datawrapper request fields do not match the closed contract",
    );
  }
}

async function readRequest() {
  const chunks = [];
  let total = 0;
  for await (const chunk of Bun.stdin.stream()) {
    total += chunk.byteLength;
    if (total > MAX_REQUEST_BYTES)
      throw new Error("sealed Datawrapper request has an invalid size");
    chunks.push(chunk);
  }
  if (total === 0)
    throw new Error("sealed Datawrapper request has an invalid size");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function produceSealed(
  request,
  { produceFn = produce, readFileFn = readFile, fetchFn = fetch } = {},
) {
  exactKeys(request, ["format", "outputId", "size", "storiesRoot", "storyId"]);
  const specPath = join(
    request.storiesRoot,
    request.storyId,
    "beats",
    request.outputId,
    "spec.json",
  );
  const spec = JSON.parse(await readFileFn(specPath, "utf8"));
  spec.format = request.format;
  // Finding 2 (round-two stress): a closed operation spawns with `--no-env-file` and inherits
  // exactly the env its caller handed it — which, outside the Engine-managed broker path, is
  // whatever the root `.env` loaded, under the root's own name (`DATAWRAPPER_API_TOKEN`). Reading
  // `process.env.DATAWRAPPER_TOKEN` alone refused a real, present token for exactly that reason.
  const token = resolveDatawrapperToken(process.env);
  if (!token) throw new Error(missingDatawrapperTokenMessage());
  return produceFn(spec, {
    storiesRoot: request.storiesRoot,
    storyId: request.storyId,
    outputId: request.outputId,
    size: request.size,
    token,
    fetchFn,
  });
}

export async function main() {
  const request = await readRequest();
  const result = await produceSealed(request);
  console.log(JSON.stringify(result));
}

if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
