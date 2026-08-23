#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { runPreflight } from "./preflight.mjs";
import { probeCloudflare, probeDatawrapper, probeMapTiler } from "./keys.mjs";
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

const PRODUCTION_ATTEMPTS_FILE = "PRODUCTION-ATTEMPTS.json";
const PRODUCTION_ATTEMPTS_SCHEMA_VERSION = 1;
const MAX_PRODUCTION_ATTEMPTS = 3;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const PRODUCTION_ATTEMPTS_LOCK = `.${PRODUCTION_ATTEMPTS_FILE}.lock`;

function productionInputDigest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function validateProductionAttempts(record, path) {
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    record.schemaVersion !== PRODUCTION_ATTEMPTS_SCHEMA_VERSION ||
    !["map-bake", "datawrapper-produce"].includes(record.operation) ||
    typeof record.outputId !== "string" ||
    typeof record.inputPath !== "string" ||
    !SHA256.test(record.inputDigest ?? "") ||
    !Number.isSafeInteger(record.attempts) ||
    record.attempts < 1 ||
    record.attempts > MAX_PRODUCTION_ATTEMPTS ||
    !["failed", "blocked", "reserved"].includes(record.status) ||
    typeof record.reason !== "string" ||
    record.reason.length === 0 ||
    (record.status === "blocked" && record.attempts !== MAX_PRODUCTION_ATTEMPTS) ||
    (record.status === "failed" && record.attempts === MAX_PRODUCTION_ATTEMPTS) ||
    (record.status === "reserved" &&
      (typeof record.reservationId !== "string" ||
        record.reservationId.length === 0 ||
        !Number.isSafeInteger(record.pid) ||
        record.pid < 1))
  ) {
    throw new Error(`production attempt receipt is invalid at ${path}`);
  }
  return record;
}

async function readProductionAttempts(path) {
  try {
    return validateProductionAttempts(
      JSON.parse(await readFile(path, "utf8")),
      path,
    );
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error(`production attempt receipt is not valid JSON at ${path}`, {
        cause: error,
      });
    }
    throw error;
  }
}

async function writeProductionAttempts(path, record) {
  validateProductionAttempts(record, path);
  const temporary = join(
    dirname(path),
    `.${PRODUCTION_ATTEMPTS_FILE}.tmp-${randomUUID()}`,
  );
  try {
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
      flag: "wx",
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function readLockOwner(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function acquireProductionLock(beatDir, waitMs = 30_000) {
  const lockDir = join(beatDir, PRODUCTION_ATTEMPTS_LOCK);
  const ownerPath = join(lockDir, "owner.json");
  const ownerId = randomUUID();
  const deadline = Date.now() + waitMs;
  while (true) {
    try {
      await mkdir(lockDir);
      try {
        await writeFile(
          ownerPath,
          `${JSON.stringify({ ownerId, pid: process.pid })}\n`,
          { flag: "wx" },
        );
      } catch (error) {
        await rm(lockDir, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        if ((await readLockOwner(ownerPath))?.ownerId !== ownerId) {
          throw new Error(`production attempt lock ownership changed at ${lockDir}`);
        }
        await rm(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }

    const owner = await readLockOwner(ownerPath);
    let lockStat = null;
    try {
      lockStat = await lstat(lockDir);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if ((owner && !processIsAlive(owner.pid)) || (!owner && Date.now() - lockStat.mtimeMs > 1_000)) {
      const stale = `${lockDir}-stale-${randomUUID()}`;
      try {
        await rename(lockDir, stale);
        await rm(stale, { recursive: true, force: true });
        continue;
      } catch (error) {
        if (error?.code === "ENOENT") continue;
        throw error;
      }
    }
    if (Date.now() >= deadline) {
      throw new Error(`another production dispatcher holds the attempt lock at ${lockDir}`);
    }
    await wait(25);
  }
}

async function withProductionLock(beatDir, task) {
  const release = await acquireProductionLock(beatDir);
  try {
    return await task();
  } finally {
    await release();
  }
}

function blockedProductionResult(record) {
  return {
    operation: record.operation,
    outputId: record.outputId,
    status: "blocked",
    reason: record.reason,
    attempts: record.attempts,
  };
}

async function runManagedProductionAttempt({
  operation,
  beatDir,
  outputId,
  inputPath,
  inputDigest,
  run,
}) {
  const receiptPath = join(beatDir, PRODUCTION_ATTEMPTS_FILE);
  const reservation = await withProductionLock(beatDir, async () => {
    const previousReceipt = await readProductionAttempts(receiptPath);
    const currentReceipt =
      previousReceipt?.operation === operation &&
      previousReceipt.outputId === outputId &&
      previousReceipt.inputPath === inputPath &&
      previousReceipt.inputDigest === inputDigest
        ? previousReceipt
        : null;
    if (currentReceipt?.status === "blocked") {
      return { blocked: blockedProductionResult(currentReceipt) };
    }
    if (currentReceipt?.status === "reserved") {
      if (processIsAlive(currentReceipt.pid)) {
        return { blocked: blockedProductionResult(currentReceipt) };
      }
      if (currentReceipt.attempts === MAX_PRODUCTION_ATTEMPTS) {
        const blocked = {
          schemaVersion: PRODUCTION_ATTEMPTS_SCHEMA_VERSION,
          operation,
          outputId,
          inputPath,
          inputDigest,
          attempts: currentReceipt.attempts,
          status: "blocked",
          reason: `production attempt ${currentReceipt.attempts} ended before reconciliation; attempt limit reached`,
        };
        await writeProductionAttempts(receiptPath, blocked);
        return { blocked: blockedProductionResult(blocked) };
      }
    }

    const attempts = (currentReceipt?.attempts ?? 0) + 1;
    const reservationId = randomUUID();
    await writeProductionAttempts(receiptPath, {
      schemaVersion: PRODUCTION_ATTEMPTS_SCHEMA_VERSION,
      operation,
      outputId,
      inputPath,
      inputDigest,
      attempts,
      status: "reserved",
      reason: `production attempt ${attempts} is already running`,
      reservationId,
      pid: process.pid,
    });
    return { attempts, reservationId };
  });
  if (reservation.blocked) return reservation.blocked;

  try {
    const result = await run();
    await withProductionLock(beatDir, async () => {
      const current = await readProductionAttempts(receiptPath);
      if (current?.status === "reserved" && current.reservationId === reservation.reservationId) {
        await rm(receiptPath, { force: true });
      }
    });
    return result;
  } catch (error) {
    const receipt = await withProductionLock(beatDir, async () => {
      const current = await readProductionAttempts(receiptPath);
      if (current?.status !== "reserved" || current.reservationId !== reservation.reservationId) {
        return null;
      }
      const failed = {
        schemaVersion: PRODUCTION_ATTEMPTS_SCHEMA_VERSION,
        operation,
        outputId,
        inputPath,
        inputDigest,
        attempts: reservation.attempts,
        status: reservation.attempts === MAX_PRODUCTION_ATTEMPTS ? "blocked" : "failed",
        reason: error instanceof Error ? error.message : String(error),
      };
      await writeProductionAttempts(receiptPath, failed);
      return failed;
    });
    if (receipt?.status === "blocked") return blockedProductionResult(receipt);
    throw error;
  }
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
      return probeMapTiler(process.env.MAPTILER_KEY ?? "", fetchFn);
    case "provider-check-datawrapper":
      requireParameters(request, []);
      return probeDatawrapper(process.env.DATAWRAPPER_TOKEN ?? "", fetchFn);
    case "provider-check-cloudflare":
      requireParameters(request, []);
      return probeCloudflare(
        request.cloudflareAccountId ?? "",
        process.env.CLOUDFLARE_API_TOKEN ?? "",
        fetchFn,
      );
    case "story-inspect": {
      requireParameters(request, []);
      const { story } = await storyBoundary(request);
      return { storyId: request.storyId, canonicalPath: story };
    }
    case "map-bake": {
      const parameters = requireParameters(request, ["contractDigest"]);
      if (!SHA256.test(parameters.contractDigest ?? "")) {
        throw new Error("map contract digest must be a sha256 digest");
      }
      const { story } = await storyBoundary(request);
      const outputId = requireSegment(request.outputId, "outputId");
      const inputPath = "MAP-BAKE.json";
      const contractPath = await existingStoryFile(
        story,
        join("beats", outputId, inputPath),
        "map contract",
      );
      if (productionInputDigest(await readFile(contractPath)) !== parameters.contractDigest) {
        throw new Error("map contract digest does not match MAP-BAKE.json");
      }
      const beatDir = dirname(contractPath);
      return runManagedProductionAttempt({
        operation,
        beatDir,
        outputId,
        inputPath,
        inputDigest: parameters.contractDigest,
        run: () =>
          mapBakeFn({
            story,
            outputId,
            contractDigest: parameters.contractDigest,
            browserPath: process.env.SPLASH_BROWSER_PATH,
            mapTilerKey: process.env.MAPTILER_KEY,
          }),
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
      const inputPath = "spec.json";
      const specPath = await existingStoryFile(
        story,
        join("beats", outputId, inputPath),
        "Datawrapper spec",
      );
      return runManagedProductionAttempt({
        operation,
        beatDir: dirname(specPath),
        outputId,
        inputPath,
        inputDigest: productionInputDigest(await readFile(specPath)),
        run: async () => {
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
        },
      });
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
