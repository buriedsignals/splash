#!/usr/bin/env bun

import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { runPreflight } from "./preflight.mjs";
import { probeCloudflare, probeDatawrapper, probeMapTiler, resolveEnvKey } from "./keys.mjs";
import { bakeMapContract } from "./sealed-map-bake.mjs";

export const OPERATION_IDS = Object.freeze([
  "runtime-smoke",
  "preflight",
  "provider-check-maptiler",
  "provider-check-datawrapper",
  "provider-check-cloudflare",
  "story-inspect",
  "map-bake",
  "datawrapper-produce",
  "maptiler-delivery",
  "cloudflare-deploy",
]);

const SOURCE_ROOT = resolve(import.meta.dirname, "../../..");
const CHECKOUT_ROOT = process.env.SPLASH_CHECKOUT_ROOT
  ? resolve(process.env.SPLASH_CHECKOUT_ROOT)
  : SOURCE_ROOT;
if (CHECKOUT_ROOT !== SOURCE_ROOT) {
  throw new Error(
    "Engine checkout root does not match the executing Splash checkout",
  );
}
const ROOT = SOURCE_ROOT;
const ENGINE_MANAGED = Boolean(process.env.SPLASH_CHECKOUT_ROOT);
const MAX_STDIN_BYTES = 64 * 1024;
const MAX_CHILD_OUTPUT_BYTES = 256 * 1024;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ENGINE_BUN_CONFIG = join(import.meta.dirname, "engine-bunfig.toml");

function runtimeEntrypoint(_bundle, source) {
  return join(SOURCE_ROOT, source);
}

export async function loadRuntimeCapabilities(
  importFn = (specifier) => import(specifier),
) {
  await Promise.all([
    importFn("@resvg/resvg-js"),
    importFn("d3-array"),
    importFn("maplibre-gl"),
    importFn("puppeteer-core"),
    importFn("@remotion/cli"),
    importFn("remotion"),
  ]);
  return { chart: true, map: true, video: true };
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} fields do not match the closed contract`);
  }
}

export async function readRequest(stream = Bun.stdin.stream()) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > MAX_STDIN_BYTES)
      throw new Error(`operation request exceeds ${MAX_STDIN_BYTES} bytes`);
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const request = JSON.parse(body || "{}");
  const allowed = [
    "path",
    "storyId",
    "outputId",
    "format",
    "size",
    "cloudflareAccountId",
    "finalDeliveryConfirmed",
    "canonicalStoryPath",
    "canonicalStoriesRoot",
    "canonicalWorkspaceRoot",
    "parameters",
  ];
  for (const key of Object.keys(request)) {
    if (!allowed.includes(key))
      throw new Error("operation request contains an unknown field");
  }
  if (!request.parameters) request.parameters = {};
  if (
    typeof request.parameters !== "object" ||
    Array.isArray(request.parameters)
  ) {
    throw new Error("operation parameters must be an object");
  }
  return request;
}

function requireParameters(request, expected) {
  exactKeys(request.parameters, expected, "operation parameters");
  return request.parameters;
}

function requireSegment(value, label) {
  if (!SEGMENT.test(value ?? ""))
    throw new Error(`${label} must be one safe path segment`);
  return value;
}

async function realDirectory(path, label) {
  if (!isAbsolute(path)) throw new Error(`${label} must be absolute`);
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error(`${label} must be a real directory`);
  const canonical = await realpath(path);
  if (canonical !== path) throw new Error(`${label} contains a symlink`);
  return canonical;
}

async function newsroomBoundary() {
  const newsroomPath = process.env.SPLASH_NEWSROOM_PATH;
  if (
    !newsroomPath ||
    !isAbsolute(newsroomPath) ||
    resolve(newsroomPath) !== newsroomPath ||
    newsroomPath.split(sep).at(-1) !== "NEWSROOM.md"
  ) {
    throw new Error("Engine newsroom path is unavailable or invalid");
  }
  const parent = await realDirectory(dirname(newsroomPath), "newsroom root");
  if (parent !== dirname(newsroomPath))
    throw new Error("newsroom root contains a symlink");
  try {
    const info = await lstat(newsroomPath);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("NEWSROOM.md is not a regular file");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return newsroomPath;
}

function beneath(root, path) {
  const rel = relative(root, path);
  return (
    rel !== "" &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

async function storyBoundary(request) {
  const storiesRoot = await realDirectory(
    request.canonicalStoriesRoot,
    "stories root",
  );
  const story = await realDirectory(request.canonicalStoryPath, "story path");
  if (
    !beneath(storiesRoot, story) ||
    relative(storiesRoot, story).includes(sep)
  ) {
    throw new Error("story path is outside the bound story");
  }
  return { storiesRoot, story };
}

async function existingStoryFile(story, relativePath, label) {
  if (!relativePath || isAbsolute(relativePath))
    throw new Error(`${label} must be relative to the bound story`);
  const candidate = resolve(story, relativePath);
  if (!beneath(story, candidate))
    throw new Error(`${label} escapes the bound story`);
  const canonical = await realpath(candidate);
  if (!beneath(story, canonical))
    throw new Error(`${label} resolves outside the bound story`);
  const info = await lstat(canonical);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error(`${label} must be a real file`);
  return canonical;
}

async function boundedChildText(stream, label, child) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CHILD_OUTPUT_BYTES) {
        child.kill();
        throw new Error(`${label} exceeded ${MAX_CHILD_OUTPUT_BYTES} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function runSkillEntrypoint(path, args, input = null) {
  const child = Bun.spawn(
    [
      process.execPath,
      `--config=${ENGINE_BUN_CONFIG}`,
      "--no-install",
      "--no-env-file",
      path,
      ...args,
    ],
    {
      cwd: ROOT,
      env: process.env,
      stdin:
        input === null ? "ignore" : Buffer.from(`${JSON.stringify(input)}\n`),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    boundedChildText(child.stdout, "closed child stdout", child),
    boundedChildText(child.stderr, "closed child stderr", child),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `closed skill entrypoint failed with exit ${exitCode}: ${stderr.trim() || "no diagnostics"}`,
    );
  }
  return stdout.trim() === "" ? null : JSON.parse(stdout);
}

export async function runOperation(
  operation,
  request,
  {
    fetchFn = fetch,
    mapBakeFn = bakeMapContract,
    runSkillEntrypointFn = runSkillEntrypoint,
  } = {},
) {
  if (!OPERATION_IDS.includes(operation))
    throw new Error("unknown closed Splash operation");
  switch (operation) {
    case "runtime-smoke": {
      requireParameters(request, []);
      if (!ENGINE_MANAGED)
        throw new Error("runtime smoke requires an Engine-managed checkout");
      await realDirectory(ROOT, "checkout root");
      for (const path of [
        join(ROOT, "package.json"),
        join(ROOT, "bun.lock"),
        join(ROOT, ".splash-bun-install.json"),
        join(ROOT, "skills", "splash", "scripts", "run-operation.mjs"),
        join(ROOT, "apps", "goose", "server.mjs"),
        join(ROOT, "installer", "setup", "controller-child.mjs"),
      ]) {
        const info = await lstat(path);
        if (!info.isFile() || info.isSymbolicLink())
          throw new Error("installed checkout has an invalid required file");
      }
      await realDirectory(join(ROOT, "node_modules"), "dependency tree");
      const capabilities = await loadRuntimeCapabilities();
      return {
        ready: true,
        schemaVersion: "splash-checkout/v1",
        capabilities,
      };
    }
    case "preflight": {
      requireParameters(request, []);
      const root = await realDirectory(
        request.canonicalWorkspaceRoot,
        "workspace root",
      );
      const newsroomPath = await newsroomBoundary();
      return runPreflight({
        root,
        newsroomPath,
        env: process.env,
        fetchFn,
        templateRoot: join(
          SOURCE_ROOT,
          "skills",
          "splash",
          "assets",
          "root-template",
        ),
      });
    }
    case "provider-check-maptiler":
      requireParameters(request, []);
      // Finding 2 (round-two stress): the root's own name for this key can be
      // MAPTILER_API_KEY / REMOTION_MAPTILER_KEY / VITE_MAPTILER_KEY, not only the canonical
      // MAPTILER_KEY `preflight` already reconciles for its status row — the live probe must
      // agree with that row, or a capability reported open here refuses right after.
      return probeMapTiler(resolveEnvKey(process.env, "MAPTILER_KEY"), fetchFn);
    case "provider-check-datawrapper":
      requireParameters(request, []);
      // Same reconciliation for DATAWRAPPER_API_TOKEN, the root's own name.
      return probeDatawrapper(resolveEnvKey(process.env, "DATAWRAPPER_TOKEN"), fetchFn);
    case "provider-check-cloudflare":
      requireParameters(request, []);
      // THE THIRD PROVIDER CASE, and until 2026-08-23 the only one of the three that read its
      // credential by its own canonical name while the two lines above it resolved aliases. Nothing
      // here changes on this machine — `CLOUDFLARE_API_TOKEN` has no aliases and the root's `.env`
      // holds it under that exact name — and that is the point: the read is now DECLARED, it goes
      // through the one table `keys.mjs` owns, and the day this credential earns an alias the probe
      // honours it without anybody remembering this line. The shape found three times in one week
      // (`verify-live-map.mjs`, then the gate that decided whether that probe ran at all, then
      // here) is a mechanism, not three accidents, and the mechanism is a read that has its own
      // opinion about which names exist.
      return probeCloudflare(
        request.cloudflareAccountId ?? "",
        resolveEnvKey(process.env, "CLOUDFLARE_API_TOKEN"),
        fetchFn,
      );
    case "story-inspect": {
      requireParameters(request, []);
      const { story } = await storyBoundary(request);
      return { storyId: request.storyId, canonicalPath: story };
    }
    case "map-bake": {
      const parameters = requireParameters(request, ["contractDigest"]);
      const { story } = await storyBoundary(request);
      const outputId = requireSegment(request.outputId, "outputId");
      return mapBakeFn({
        story,
        outputId,
        contractDigest: parameters.contractDigest,
        browserPath: process.env.SPLASH_BROWSER_PATH,
        mapTilerKey: resolveEnvKey(process.env, "MAPTILER_KEY"),
      });
    }
    case "datawrapper-produce": {
      const parameters = requireParameters(request, ["format", "size"]);
      const { storiesRoot, story } = await storyBoundary(request);
      const outputId = requireSegment(request.outputId, "outputId");
      if (!["static", "web"].includes(parameters.format))
        throw new Error("Datawrapper format must be static or web");
      if (!["landscape", "square", "portrait"].includes(parameters.size))
        throw new Error("Datawrapper size is unsupported");
      await existingStoryFile(
        story,
        join("beats", outputId, "spec.json"),
        "Datawrapper spec",
      );
      const result = await runSkillEntrypointFn(
        runtimeEntrypoint(
          "datawrapper",
          "skills/dw-beat/scripts/sealed-produce.mjs",
        ),
        [],
        {
          storiesRoot,
          storyId: request.storyId,
          outputId,
          format: parameters.format,
          size: parameters.size,
        },
      );
      return {
        operation,
        outputId,
        format: result.format,
        chartId: result.chartId,
        publicUrl: result.publicUrl,
      };
    }
    case "maptiler-delivery": {
      const parameters = requireParameters(request, [
        "findingIds",
        "format",
        "handover",
        "planVersion",
      ]);
      if (request.finalDeliveryConfirmed !== true)
        throw new Error("map delivery requires final-delivery confirmation");
      const { storiesRoot } = await storyBoundary(request);
      const outputId = requireSegment(request.outputId, "outputId");
      if (!["static", "web", "scrolly", "video"].includes(parameters.format))
        throw new Error("delivery format is unsupported");
      const result = await runSkillEntrypointFn(
        runtimeEntrypoint(
          "delivery",
          "skills/deliver/scripts/sealed-operation.mjs",
        ),
        ["materialise-owned"],
        {
          storiesRoot,
          storyId: request.storyId,
          outputId,
          format: parameters.format,
          planVersion: parameters.planVersion,
          findingIds: parameters.findingIds,
          handover: parameters.handover,
        },
      );
      return { operation, outputs: result.outputs, keyState: result.keyState };
    }
    case "cloudflare-deploy": {
      const parameters = requireParameters(request, [
        "findingIds",
        "format",
        "handover",
        "planVersion",
      ]);
      if (request.finalDeliveryConfirmed !== true)
        throw new Error("hosted delivery requires final-delivery confirmation");
      const { storiesRoot } = await storyBoundary(request);
      const outputId = requireSegment(request.outputId, "outputId");
      if (!["web", "scrolly"].includes(parameters.format))
        throw new Error("hosted delivery format is unsupported");
      const result = await runSkillEntrypointFn(
        runtimeEntrypoint(
          "delivery",
          "skills/deliver/scripts/sealed-operation.mjs",
        ),
        ["materialise-embed"],
        {
          accountId: requireSegment(
            request.cloudflareAccountId,
            "cloudflareAccountId",
          ),
          storiesRoot,
          storyId: request.storyId,
          outputId,
          format: parameters.format,
          planVersion: parameters.planVersion,
          findingIds: parameters.findingIds,
          handover: parameters.handover,
        },
      );
      return {
        operation,
        outputs: result.outputs,
        publicUrl: result.publicUrl,
        immutableDeploymentUrl: result.immutableDeploymentUrl,
        deploymentId: result.deploymentId,
      };
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1)
    throw new Error("closed Splash runner accepts exactly one operation ID");
  const request = await readRequest();
  const result = await runOperation(argv[0], request);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "closed Splash operation failed",
    );
    process.exitCode = 1;
  });
}
