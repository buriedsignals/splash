#!/usr/bin/env bun

import { produce } from "./produce.mjs";
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
  return produceFn(spec, {
    storiesRoot: request.storiesRoot,
    storyId: request.storyId,
    outputId: request.outputId,
    size: request.size,
    token: process.env.DATAWRAPPER_TOKEN ?? "",
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
