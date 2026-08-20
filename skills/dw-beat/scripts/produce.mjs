// One call, one pinned format, one real chart — the producer a beat actually invokes. No mock, no
// fallback rendering: a missing token is reported and this stops right there (splash's own
// never-list, "a missing prerequisite is reported and never designed around", applies here too).

import { createHash, randomUUID } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { validateChartSpec } from "./validate-spec.mjs";
import { buildChartPayload, resolveSeriesLabel, renameValueColumn } from "./metadata-spec.mjs";
import { toCsv } from "./csv.mjs";
import { chartIdForPath, createChart, setChartData, patchChart, publishChart, exportChartPng } from "./dw-client.mjs";
import { sizeFor } from "./sizes.mjs";
import { assertExportedSurface } from "./verify-owned.mjs";

export function datawrapperFormatFor(format) {
  if (format === "static") return "static";
  if (format === "web") return "interactive";
  throw new Error(`Datawrapper supports canonical Splash formats static and web, got ${JSON.stringify(format)}`);
}

// Finding 2 (round-two stress): the root's `.env` names this credential `DATAWRAPPER_API_TOKEN` —
// the engine's own name for the same key — and a naive `process.env.DATAWRAPPER_TOKEN` read
// refuses a valid, present token because it looked under the wrong name. This is the same
// reconciliation `skills/splash/scripts/keys.mjs`'s `resolveEnvKey` already performs for its own
// capability rows, DUPLICATED here (no cross-skill runtime import — every producer that can throw
// "no token" carries its own copy) rather than imported, so this file stays copy-pasteable on its
// own. Canonical name wins when both happen to be set; the alias is read only when the canonical
// name is entirely absent.
const DATAWRAPPER_TOKEN_ALIASES = ["DATAWRAPPER_API_TOKEN"];

export function resolveDatawrapperToken(env) {
  if (env.DATAWRAPPER_TOKEN) return env.DATAWRAPPER_TOKEN;
  for (const alias of DATAWRAPPER_TOKEN_ALIASES) {
    if (env[alias]) return env[alias];
  }
  return "";
}

/** Names every variable this producer looked for, never a value — this fires only once
 * `resolveDatawrapperToken` has already failed under every known name, so "the root holds
 * neither" is always true when this runs. */
export function missingDatawrapperTokenMessage() {
  const names = ["DATAWRAPPER_TOKEN", ...DATAWRAPPER_TOKEN_ALIASES];
  return (
    `no Datawrapper token — looked for ${names.join(" or ")}, and the root holds neither — ` +
    "no mock, no fallback: a real token is required to produce a Datawrapper beat."
  );
}

export const DATAWRAPPER_RECORD = "DATAWRAPPER.json";
export const DATAWRAPPER_SPEC = "spec.json";
const DATAWRAPPER_LOCK = ".datawrapper-production.lock";
const productionQueues = new Map();

function absolutePublicUrl(value) {
  if (!value) throw new Error("Datawrapper publish response did not include a public URL");
  return value.startsWith("//") ? `https:${value}` : value;
}

async function optionalJson(path) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`${path} must be a regular file`);
    }
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) throw new Error(`${path} is not valid JSON`, { cause: error });
    throw error;
  }
}

async function optionalStat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function stableId(value, label) {
  if (
    typeof value !== "string" || value.trim() === "" || value === "." || value === ".." ||
    value.includes("/") || value.includes("\\") || value.includes("\0")
  ) {
    throw new Error(`${label} must be one stable path segment`);
  }
  return value;
}

function canonicalDirectory(path, label, { canonicalize = false } = {}) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${path}`, { cause: error });
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${path}`);
  }
  const canonical = realpathSync(path);
  if (!canonicalize && canonical !== path) {
    throw new Error(`${label} has a symlinked ancestor: ${path}`);
  }
  return canonical;
}

function assertContained(root, candidate, label) {
  const rel = relative(root, candidate);
  if (rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) return;
  throw new Error(`${label} escapes the declared stories root`);
}

/** Resolve the only tracked Datawrapper beat path from stable story/output identity. */
export function resolveDatawrapperBeatIdentity({ storiesRoot, storyId, outputId } = {}) {
  if (typeof storiesRoot !== "string" || storiesRoot.trim() === "") {
    throw new Error("Datawrapper production needs storiesRoot, storyId, and outputId");
  }
  const rootPath = resolve(storiesRoot);
  const canonicalRoot = canonicalDirectory(rootPath, "stories root", { canonicalize: true });
  const safeStoryId = stableId(storyId, "storyId");
  const safeOutputId = stableId(outputId, "outputId");
  const storyDir = join(canonicalRoot, safeStoryId);
  const beatsDir = join(storyDir, "beats");
  const beatDir = join(beatsDir, safeOutputId);
  for (const [path, label] of [
    [storyDir, "story directory"],
    [beatsDir, "beats directory"],
    [beatDir, "Datawrapper beat directory"],
  ]) {
    assertContained(canonicalRoot, path, label);
    canonicalDirectory(path, label);
  }
  return { storiesRoot: canonicalRoot, storyId: safeStoryId, outputId: safeOutputId, storyDir, beatsDir, beatDir };
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

async function acquireProductionLock(beatDir, waitMs) {
  const lockDir = join(beatDir, DATAWRAPPER_LOCK);
  const ownerPath = join(lockDir, "owner.json");
  const operationId = randomUUID();
  const deadline = Date.now() + waitMs;
  while (true) {
    try {
      await mkdir(lockDir);
      try {
        await writeFile(
          ownerPath,
          `${JSON.stringify({ schemaVersion: 1, operationId, pid: process.pid, hostname: hostname() })}\n`,
          { flag: "wx" },
        );
      } catch (error) {
        await rm(lockDir, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        const owner = await optionalJson(ownerPath);
        if (owner?.operationId !== operationId) {
          throw new Error(`Datawrapper production lock ownership changed at ${lockDir}`);
        }
        await rm(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const owner = await optionalJson(ownerPath).catch(() => null);
    const lockStat = await optionalStat(lockDir);
    const abandoned =
      (owner?.hostname === hostname() && !processIsAlive(owner.pid)) ||
      (!owner && lockStat && Date.now() - lockStat.mtimeMs > 1_000);
    if (abandoned) {
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
      throw new Error(`another Datawrapper production still holds the beat lock at ${lockDir}`);
    }
    await wait(25);
  }
}

async function queued(key, task) {
  const previous = productionQueues.get(key) ?? Promise.resolve();
  let releaseTurn;
  const turn = new Promise((resolveTurn) => { releaseTurn = resolveTurn; });
  const tail = previous.then(() => turn);
  productionQueues.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    releaseTurn();
    if (productionQueues.get(key) === tail) productionQueues.delete(key);
  }
}

async function withProductionLock(beatDir, task, { waitMs = 30_000 } = {}) {
  const key = resolve(beatDir);
  return queued(key, async () => {
    const release = await acquireProductionLock(beatDir, waitMs);
    try {
      return await task();
    } finally {
      await release();
    }
  });
}

async function ensureRealDirectory(path, label) {
  await mkdir(path, { recursive: true });
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${path}`);
  }
  return path;
}

async function refuseSymlink(path, label) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${path}`);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function writeAtomic(path, bytes) {
  await refuseSymlink(path, "Datawrapper output");
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function writeJsonAtomic(path, value) {
  await writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function validateExistingRecord(record, beatDir) {
  if (record === null) return null;
  if (
    ![1, 2].includes(record?.schemaVersion) ||
    record?.provider !== "datawrapper" ||
    typeof record?.chartId !== "string" ||
    !record.chartId
  ) {
    throw new Error(`${join(beatDir, DATAWRAPPER_RECORD)} has an unsupported Datawrapper beat record`);
  }
  if (record.state !== undefined && !["prepared", "local-complete"].includes(record.state)) {
    throw new Error(`${join(beatDir, DATAWRAPPER_RECORD)} has an unknown state ${JSON.stringify(record.state)}`);
  }
  chartIdForPath(record.chartId);
  if (record.schemaVersion === 2 && record.outputId !== basename(beatDir)) {
    throw new Error(`${join(beatDir, DATAWRAPPER_RECORD)} belongs to a different output`);
  }
  if (record.schemaVersion === 2 && (!record.attemptId || !record.specDigest)) {
    throw new Error(`${join(beatDir, DATAWRAPPER_RECORD)} is missing its revision binding`);
  }
  return record;
}

function specDigest(spec) {
  return `sha256:${createHash("sha256")
    .update("splash-datawrapper-spec-v1\0")
    .update(JSON.stringify(spec))
    .digest("hex")}`;
}

function iframePage(url, title, language) {
  const safeUrl = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const safeTitle = String(title).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeLanguage = String(language).replace(/[^A-Za-z0-9_-]/g, "") || "en";
  return `<!doctype html>
<html lang="${safeLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title>
<style>html,body,iframe{width:100%;height:100%;margin:0;border:0}body{min-height:600px}</style></head>
<body><iframe src="${safeUrl}" title="${safeTitle}" loading="lazy"></iframe></body></html>\n`;
}

/**
 * The exported PNG's own IHDR, against the row that was asked for. THROWS when they disagree.
 *
 * This is the twin's `assertRenderedSize`, and it is written as a check rather than as a pinned
 * constant on purpose. Datawrapper lays the chart out server-side and this skill has never verified
 * that it HONOURS the `height` it is handed — a short chart may well come back shorter than the
 * frame. The spec's instruction was "measure once and pin what it returns"; this branch has no
 * `DATAWRAPPER_TOKEN` to measure with, and pinning a number nobody has seen is precisely the
 * reasoning-from-source this chantier exists to stop. So the FIRST REAL RUN is the measurement, and
 * it cannot come back wrong quietly: either the export is the size that was chosen, or this says so
 * and names both.
 *
 * It holds for ALL THREE sizes. The original Splash exempts its landscape case from its own size
 * assertion (`skills/chart-native/scripts/produce.mjs:352-368`), so its contract holds for two of
 * three and the DEFAULT is the unenforced one. That is the mistake being avoided, not the model.
 *
 * PNG only: the IHDR chunk sits at a fixed offset in every conformant PNG (8-byte signature,
 * 4-byte length, 4-byte "IHDR", then width and height, big-endian) — nothing to search for.
 * `image-beat/scripts/render-still.mjs`'s `readImageMeta` reads the same bytes the same way.
 */
export function assertExportedSize(bytes, size, row) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50)
    throw new Error(`Datawrapper returned ${bytes.length} bytes that are not a PNG`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const got = { width: view.getUint32(16), height: view.getUint32(20) };
  if (got.width !== row.width || got.height !== row.height)
    throw new Error(
      `asked Datawrapper for ${size} (${row.width}x${row.height}) and it returned ` +
        `${got.width}x${got.height}. Datawrapper lays out server-side and may not honour the ` +
        `height it is given; this is the first run that measures it. Record what it actually does ` +
        `in this skill's SKILL.md before changing anything here — do not widen the check to make ` +
        `it pass.`,
    );
  return got;
}

async function produceUnlocked(
  spec,
  { outDir, beatDir, name = "chart", size, token, fetchFn = fetch } = {},
) {
  validateChartSpec(spec);
  if (!token) {
    throw new Error(
      "DATAWRAPPER_TOKEN is not set — no mock, no fallback: a real token is required to produce a Datawrapper beat.",
    );
  }

  const payload = buildChartPayload(spec);
  const provider = { format: datawrapperFormatFor(spec.format) };
  const rendersDir = beatDir ? join(beatDir, "renders") : outDir;
  if (beatDir) {
    await ensureRealDirectory(beatDir, "Datawrapper beat directory");
    await writeJsonAtomic(join(beatDir, DATAWRAPPER_SPEC), spec);
  }
  const existing = beatDir
    ? validateExistingRecord(await optionalJson(join(beatDir, DATAWRAPPER_RECORD)), beatDir)
    : null;
  const chart = existing
    ? { id: existing.chartId }
    : await createChart(
        { title: payload.title, type: payload.type, language: payload.language },
        token,
        fetchFn,
      );
  chartIdForPath(chart.id);
  const recordCreatedAt = existing?.createdAt ?? new Date().toISOString();
  const attemptId = randomUUID();
  const currentSpecDigest = specDigest(spec);
  const lastCompleted = existing?.state === "local-complete"
    ? {
        chartType: existing.chartType,
        format: existing.format,
        publicUrl: existing.publicUrl,
        renderedArtifact: existing.renderedArtifact,
        specDigest: existing.specDigest,
        completedAt: existing.updatedAt,
      }
    : existing?.lastCompleted;
  if (beatDir) {
    // Persist provider identity and the current attempt before every follow-up request, including
    // revisions. A failure never leaves a stale `local-complete` claim beside a newer spec.
    await writeJsonAtomic(join(beatDir, DATAWRAPPER_RECORD), {
      schemaVersion: 2,
      provider: "datawrapper",
      state: "prepared",
      outputId: basename(beatDir),
      chartId: chart.id,
      chartType: spec.chartType,
      format: spec.format,
      attemptId,
      specDigest: currentSpecDigest,
      ...(lastCompleted ? { lastCompleted } : {}),
      editableSpec: DATAWRAPPER_SPEC,
      createdAt: recordCreatedAt,
      updatedAt: new Date().toISOString(),
    });
  }
  // The CSV column name IS the direct-label Datawrapper prints on the line — rename it to the same
  // resolved series label buildChartPayload used for custom-colors, so a raw field name never
  // reaches the render on either side.
  const csvRows = renameValueColumn(spec.data, resolveSeriesLabel(spec));
  await setChartData(chart.id, toCsv(csvRows), token, fetchFn);
  await patchChart(
    chart.id,
    {
      title: payload.title,
      type: payload.type,
      language: payload.language,
      metadata: payload.metadata,
    },
    token,
    fetchFn,
  );
  const published = await publishChart(chart.id, token, fetchFn);
  const publicUrl = absolutePublicUrl(
    published.publicUrl ?? published.data?.publicUrl ?? published.url,
  );

  let artifactPath;

  if (provider.format === "interactive") {
    if (beatDir) {
      await ensureRealDirectory(rendersDir, "Datawrapper renders directory");
      artifactPath = join(rendersDir, `${name}.html`);
      await writeAtomic(artifactPath, iframePage(publicUrl, spec.takeaway, spec.language));
    }
    const result = { format: "web", provider, chartId: chart.id, publicUrl, htmlPath: artifactPath };
    if (beatDir) {
      const now = new Date().toISOString();
      await writeJsonAtomic(join(beatDir, DATAWRAPPER_RECORD), {
        schemaVersion: 2,
        provider: "datawrapper",
        state: "local-complete",
        outputId: basename(beatDir),
        chartId: chart.id,
        chartType: spec.chartType,
        format: spec.format,
        attemptId,
        specDigest: currentSpecDigest,
        publicUrl,
        editableSpec: DATAWRAPPER_SPEC,
        renderedArtifact: `renders/${name}.html`,
        createdAt: recordCreatedAt,
        updatedAt: now,
      });
    }
    return result;
  }

  // `sizeFor` THROWS on an unknown or missing name rather than defaulting — a chart exported at a
  // size nobody chose looks every bit as deliberate as one in a colour nobody chose. `zoom: 1`,
  // because the row IS the delivered pixel size: the frame and the file are one number, which is
  // the same decision the static path takes when it retires its own 2x rasteriser.
  const row = sizeFor(size);
  const png = await exportChartPng(chart.id, token, fetchFn, {
    width: row.width,
    height: row.height,
    zoom: 1,
  });
  assertExportedSize(png, size, row);
  // The second thing that can only be read off the bytes that came back. `assertExportedSize` catches
  // an export that is the wrong SHAPE; this catches one painted on the opposite side from the ground
  // the story declared — silent, valid, correct, and a white rectangle in a dark column. Both run
  // before the file is written, so a refused export leaves nothing behind to be delivered by mistake.
  if (beatDir) assertExportedSurface(png, beatDir);
  if (!rendersDir) throw new Error("a static Datawrapper beat needs outDir or beatDir");
  if (beatDir) await ensureRealDirectory(rendersDir, "Datawrapper renders directory");
  else await mkdir(rendersDir, { recursive: true });
  const pngPath = join(rendersDir, `${name}.png`);
  await writeAtomic(pngPath, png);
  if (beatDir) {
    const now = new Date().toISOString();
    await writeJsonAtomic(join(beatDir, DATAWRAPPER_RECORD), {
      schemaVersion: 2,
      provider: "datawrapper",
      state: "local-complete",
      outputId: basename(beatDir),
      chartId: chart.id,
      chartType: spec.chartType,
      format: spec.format,
      attemptId,
      specDigest: currentSpecDigest,
      publicUrl,
      editableSpec: DATAWRAPPER_SPEC,
      renderedArtifact: `renders/${name}.png`,
      createdAt: recordCreatedAt,
      updatedAt: now,
    });
  }
  return { format: "static", provider, chartId: chart.id, pngPath, publicUrl, size };
}

export async function produce(spec, options = {}) {
  validateChartSpec(spec);
  if (!options.token) {
    throw new Error(
      "DATAWRAPPER_TOKEN is not set — no mock, no fallback: a real token is required to produce a Datawrapper beat.",
    );
  }
  if (Object.hasOwn(options, "beatDir")) {
    throw new Error(
      "produce no longer accepts a caller-selected beatDir; use storiesRoot, storyId, and outputId",
    );
  }
  const identityFields = ["storiesRoot", "storyId", "outputId"].filter((field) =>
    Object.hasOwn(options, field),
  );
  if (identityFields.length > 0 && identityFields.length !== 3) {
    throw new Error("Datawrapper production needs storiesRoot, storyId, and outputId together");
  }
  if (identityFields.length === 3 && Object.hasOwn(options, "outDir")) {
    throw new Error("Datawrapper production cannot mix story identity with legacy outDir");
  }
  if (identityFields.length === 0) {
    return produceUnlocked(spec, options);
  }
  const identity = resolveDatawrapperBeatIdentity(options);
  return withProductionLock(
    identity.beatDir,
    () => produceUnlocked(spec, { ...options, beatDir: identity.beatDir }),
    { waitMs: options.lockWaitMs },
  );
}

export function parseProduceCli(argv) {
  const storyOutputMode = argv.includes("--story-output");
  const positional = argv.filter((value) => value !== "--story-output");
  if (storyOutputMode) {
    const [storiesRoot, storyId, outputId, formatArg, sizeArg] = positional;
    return { storiesRoot, storyId, outputId, formatArg, sizeArg, storyOutputMode };
  }
  const [specPath, outDir, formatArg, sizeArg] = positional;
  return { specPath, outDir, formatArg, sizeArg, storyOutputMode };
}

if (import.meta.main) {
  const parsed = parseProduceCli(process.argv.slice(2));
  if (
    parsed.storyOutputMode
      ? !parsed.storiesRoot || !parsed.storyId || !parsed.outputId
      : !parsed.specPath || !parsed.outDir
  ) {
    console.error(
      "usage: bun run scripts/produce.mjs <storiesRoot> <storyId> <outputId> [static|web] [landscape|square|portrait] --story-output\n" +
      "   or: bun run scripts/produce.mjs <spec.json> <outDir> [static|web] [landscape|square|portrait]",
    );
    process.exit(1);
  }
  const identity = parsed.storyOutputMode
    ? resolveDatawrapperBeatIdentity(parsed)
    : null;
  const specPath = identity ? join(identity.beatDir, DATAWRAPPER_SPEC) : parsed.specPath;
  const spec = JSON.parse(await Bun.file(specPath).text());
  if (parsed.formatArg) spec.format = parsed.formatArg;
  const token = resolveDatawrapperToken(process.env);
  if (!token) throw new Error(missingDatawrapperTokenMessage());
  const result = await produce(spec, {
    ...(identity
      ? { storiesRoot: identity.storiesRoot, storyId: identity.storyId, outputId: identity.outputId }
      : { outDir: parsed.outDir }),
    size: parsed.sizeArg,
    token,
    fetchFn: fetch,
  });
  console.log(JSON.stringify(result, null, 2));
}
