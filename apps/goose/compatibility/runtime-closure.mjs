#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { lstatSync, readlinkSync } from "node:fs";
import { cp, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const CLOSURE_SCHEMA_VERSION = 1;
const ROOT = resolve(import.meta.dirname, "../../..");
const MUTABLE_ENV = [
  "CHROME_PATH",
  "PUPPETEER_CACHE_DIR",
  "BUN_INSTALL_CACHE_DIR",
  "NODE_PATH",
  "MAPTILER_KEY",
  "MAPTILER_API_KEY",
  "REMOTION_MAPTILER_KEY",
  "VITE_MAPTILER_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

export const OPERATION_CONTRACTS = Object.freeze({
  "map-bake": Object.freeze({
    entrypoint: "skills/map-web/scripts/bake-plate.mjs",
    assetIds: Object.freeze([
      "bun", "browser", "browser-runtime", "runtime-closure", "package-manifest", "lockfile",
      "map-entrypoint", "map-root-helper", "map-geometry-helper", "map-data", "map-style-stub",
      "maplibre-js", "maplibre-css", "runtime-modules",
    ]),
    mutableOutputs: Object.freeze([
      ".sealed-scratch", "provider-stub-read-attempt.marker", "provider-stub-read-success.marker",
      "plate.png", "geometry.json",
    ]),
    credentialIds: Object.freeze([]),
  }),
  "delivery-build": Object.freeze({
    entrypoint: "skills/deliver/scripts/deliver.mjs",
    assetIds: Object.freeze([
      "bun", "runtime-closure", "package-manifest", "lockfile", "runtime-modules",
      "delivery-code", "delivery-fixture",
    ]),
    mutableOutputs: Object.freeze([".sealed-scratch", "stories/fixture"]),
    credentialIds: Object.freeze([]),
  }),
});

function browserRuntimeRoot(browserPath) {
  return dirname(dirname(dirname(browserPath)));
}

function assetDefinitions(browserPath) {
  return {
    bun: ["executable", process.execPath],
    browser: ["executable", browserPath],
    "browser-runtime": ["executable", browserRuntimeRoot(browserPath)],
    "runtime-closure": ["code", import.meta.filename],
    "package-manifest": ["immutable-input", join(ROOT, "package.json")],
    lockfile: ["immutable-input", join(ROOT, "bun.lock")],
    "map-entrypoint": ["code", join(ROOT, "skills/map-web/scripts/bake-plate.mjs")],
    "map-root-helper": ["code", join(ROOT, "skills/map-web/scripts/splash-root.mjs")],
    "map-geometry-helper": ["code", join(ROOT, "skills/map-web/assets/geo-symbol.ts")],
    "map-data": ["immutable-input", join(ROOT, "skills/map-web/assets/sample-data/regions.json")],
    "map-style-stub": ["provider-stub", join(ROOT, "apps/goose/compatibility/fixtures/map-style.json")],
    "maplibre-js": ["code", join(ROOT, "node_modules/maplibre-gl/dist/maplibre-gl.js")],
    "maplibre-css": ["code", join(ROOT, "node_modules/maplibre-gl/dist/maplibre-gl.css")],
    "runtime-modules": ["code", join(ROOT, "node_modules"), [".cache"]],
    "delivery-code": ["code", join(ROOT, "skills/deliver/scripts")],
    "delivery-fixture": ["immutable-input", join(ROOT, "apps/goose/compatibility/fixtures/delivery")],
  };
}

function frame(hash, kind, name, bytes = null) {
  hash.update(`${kind}:${Buffer.byteLength(name)}:${name}`);
  if (bytes !== null) hash.update(`:${bytes.length}:`).update(bytes);
  hash.update("\0");
}

export async function digestPath(path, { excludedPaths = [] } = {}) {
  const stat = lstatSync(path);
  if (stat.isFile() && excludedPaths.length > 0) throw new Error(`file asset cannot exclude child paths: ${path}`);
  if (stat.isFile()) {
    return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  }
  if (!stat.isDirectory()) throw new Error(`closure asset is not a regular file or directory: ${path}`);
  const hash = createHash("sha256");
  const canonicalTreeRoot = await realpath(path);
  hash.update("splash-closure-tree-v1\0");
  async function walk(directory, prefix) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excludedPaths.some((excluded) => rel === excluded || rel.startsWith(`${excluded}/`))) continue;
      const child = lstatSync(path);
      if (child.isSymbolicLink()) {
        const canonicalTarget = await realpath(path);
        if (canonicalTarget !== canonicalTreeRoot && !canonicalTarget.startsWith(`${canonicalTreeRoot}${sep}`)) {
          throw new Error(`closure tree symlink escapes its asset root: ${path} -> ${canonicalTarget}`);
        }
        frame(hash, "symlink", rel, Buffer.from(readlinkSync(path)));
      }
      else if (child.isDirectory()) {
        frame(hash, "directory", rel);
        await walk(path, rel);
      } else if (child.isFile()) frame(hash, "file", rel, await readFile(path));
      else throw new Error(`closure tree contains a special file: ${path}`);
    }
  }
  await walk(path, "");
  return `sha256:${hash.digest("hex")}`;
}

export function digestBytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function asset(id, classification, path, excludedPaths = []) {
  const absolute = resolve(path);
  const descriptor = { id, classification, path: absolute, digest: await digestPath(absolute, { excludedPaths }) };
  if (excludedPaths.length > 0) descriptor.excludedPaths = excludedPaths;
  return descriptor;
}

export async function createManifest({ browserPath }) {
  if (!isAbsolute(browserPath)) throw new Error("--browser must be an absolute executable path");
  const entries = await Promise.all(Object.entries(assetDefinitions(browserPath)).map(
    ([id, [classification, path, excludedPaths]]) => asset(id, classification, path, excludedPaths),
  ));
  return {
    schemaVersion: CLOSURE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    root: ROOT,
    assets: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
    operations: OPERATION_CONTRACTS,
  };
}

function assertExactKeys(value, expected, label) {
  const actual = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} fields are ${JSON.stringify(actual)}; expected ${JSON.stringify(wanted)}`);
  }
}

function validateShape(manifest, operation, browserPath) {
  assertExactKeys(manifest, ["schemaVersion", "generatedAt", "root", "assets", "operations"], "closure manifest");
  if (manifest?.schemaVersion !== CLOSURE_SCHEMA_VERSION) {
    throw new Error(`unsupported closure schema ${JSON.stringify(manifest?.schemaVersion)}`);
  }
  if (manifest.root !== ROOT) throw new Error(`closure root is ${manifest.root}; expected ${ROOT}`);
  if (Number.isNaN(Date.parse(manifest.generatedAt))) throw new Error("closure generatedAt is not an ISO timestamp");
  assertExactKeys(manifest.operations, Object.keys(OPERATION_CONTRACTS), "closure operations");
  for (const [name, expected] of Object.entries(OPERATION_CONTRACTS)) {
    const actual = manifest.operations[name];
    assertExactKeys(actual, ["entrypoint", "assetIds", "mutableOutputs", "credentialIds"], `closure operation ${name}`);
    if (
      actual.entrypoint !== expected.entrypoint
      || JSON.stringify(actual.assetIds) !== JSON.stringify(expected.assetIds)
      || JSON.stringify(actual.mutableOutputs) !== JSON.stringify(expected.mutableOutputs)
      || JSON.stringify(actual.credentialIds) !== JSON.stringify(expected.credentialIds)
    ) {
      throw new Error(`closure operation ${name} does not match the code-owned contract`);
    }
  }
  const definitions = assetDefinitions(browserPath);
  assertExactKeys(manifest.assets, Object.keys(definitions), "closure assets");
  for (const [id, [classification, path, excludedPaths = []]] of Object.entries(definitions)) {
    const declared = manifest.assets[id];
    const fields = ["id", "classification", "path", "digest"];
    if (excludedPaths.length > 0) fields.push("excludedPaths");
    assertExactKeys(declared, fields, `closure asset ${id}`);
    if (declared.id !== id || declared.classification !== classification || declared.path !== resolve(path)) {
      throw new Error(`closure asset ${id} descriptor does not match the code-owned contract`);
    }
    if (JSON.stringify(declared.excludedPaths ?? []) !== JSON.stringify(excludedPaths)) {
      throw new Error(`closure asset ${id} exclusions do not match the code-owned contract`);
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(declared.digest)) throw new Error(`closure asset ${id} has an invalid digest`);
  }
  const spec = manifest.operations?.[operation];
  if (!spec || !Array.isArray(spec.assetIds)) throw new Error(`closure has no operation ${operation}`);
  return spec;
}

export async function verifyManifest(manifest, operation, { browserPath }) {
  const spec = validateShape(manifest, operation, browserPath);
  for (const id of spec.assetIds) {
    const declared = manifest.assets?.[id];
    if (!declared || !isAbsolute(declared.path) || !declared.classification) {
      throw new Error(`closure asset ${id} is missing, relative, or unclassified`);
    }
    let actual;
    try {
      actual = await digestPath(declared.path, { excludedPaths: declared.excludedPaths ?? [] });
    } catch (error) {
      throw new Error(`closure asset ${id} is unavailable before operation start`, { cause: error });
    }
    if (actual !== declared.digest) {
      throw new Error(`closure asset ${id} changed before operation start: ${actual} != ${declared.digest}`);
    }
  }
  return spec;
}

function stripAmbientSelectors(outDir) {
  for (const name of MUTABLE_ENV) delete process.env[name];
  process.env.PATH = "";
  const scratch = join(outDir, ".sealed-scratch");
  process.env.HOME = join(scratch, "home");
  process.env.XDG_CACHE_HOME = join(scratch, "cache");
  process.env.TMPDIR = join(scratch, "tmp");
}

function cliArgs(args) {
  const flag = (name) => {
    const at = args.indexOf(name);
    return at >= 0 ? args[at + 1] : null;
  };
  return {
    manifestPath: flag("--manifest"),
    manifestDigest: flag("--manifest-digest"),
    outDir: flag("--out"),
    browserPath: flag("--browser"),
  };
}

async function importAsEntrypoint(path, args) {
  const previous = process.argv;
  process.argv = [process.execPath, path, ...args];
  try {
    await import(`${pathToFileURL(path).href}?closure=${Date.now()}`);
  } finally {
    process.argv = previous;
  }
}

async function prepareOutputBoundary(outDir) {
  const canonicalRoot = await realpath(ROOT);
  const parent = dirname(outDir);
  let outputInfo;
  try {
    outputInfo = lstatSync(outDir);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (outputInfo) throw new Error(`closure output must be a new directory: ${outDir}`);
  const parentInfo = lstatSync(parent);
  if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new Error(`closure output parent is not a real directory: ${parent}`);
  }
  const canonicalParent = await realpath(parent);
  if (canonicalParent !== parent) throw new Error(`closure output parent contains a symlink: ${parent}`);
  if (canonicalParent === canonicalRoot || canonicalParent.startsWith(`${canonicalRoot}${sep}`)) {
    throw new Error(`closure output must be outside the immutable Splash root: ${outDir}`);
  }
  await mkdir(outDir);
  const canonicalOutput = await realpath(outDir);
  if (canonicalOutput !== outDir || !lstatSync(outDir).isDirectory()) {
    throw new Error(`closure output did not resolve to the new directory: ${outDir}`);
  }
}

async function prepareScratch(outDir) {
  await Promise.all([
    mkdir(process.env.HOME, { recursive: true }),
    mkdir(process.env.XDG_CACHE_HOME, { recursive: true }),
    mkdir(process.env.TMPDIR, { recursive: true }),
  ]);
}

async function readProviderStubAfterVerification(path, outDir) {
  await writeFile(join(outDir, "provider-stub-read-attempt.marker"), "provider-stub-read-called\n");
  const body = await readFile(path);
  await writeFile(join(outDir, "provider-stub-read-success.marker"), "provider-stub-read-succeeded\n");
  return body;
}

export async function runMapBake(manifest, outDir, { browserPath }) {
  await verifyManifest(manifest, "map-bake", { browserPath });
  await prepareOutputBoundary(outDir);
  stripAmbientSelectors(outDir);
  await prepareScratch(outDir);
  const assets = manifest.assets;
  // The attempt marker is written by the provider-read wrapper itself, after
  // every closure asset verifies and immediately before reading the local
  // stub. Refusal tests assert that the wrapper was never called; the separate
  // success marker proves the read completed on the passing path.
  await readProviderStubAfterVerification(assets["map-style-stub"].path, outDir);
  await importAsEntrypoint(assets["map-entrypoint"].path, [
    "--size", "320",
    "--out", outDir,
    "--data", assets["map-data"].path,
    "--settle", "50",
    "--browser", assets.browser.path,
    "--maplibre-js", assets["maplibre-js"].path,
    "--maplibre-css", assets["maplibre-css"].path,
    "--style-json", assets["map-style-stub"].path,
  ]);
  for (const name of ["plate.png", "geometry.json"]) {
    if (!lstatSync(join(outDir, name)).isFile()) throw new Error(`map bake did not write ${name}`);
  }
  return { operation: "map-bake", outputs: ["plate.png", "geometry.json"] };
}

export async function runDeliveryBuild(manifest, outDir, { browserPath }) {
  await verifyManifest(manifest, "delivery-build", { browserPath });
  await prepareOutputBoundary(outDir);
  stripAmbientSelectors(outDir);
  await prepareScratch(outDir);
  const storiesRoot = join(outDir, "stories");
  const beatDir = join(storiesRoot, "fixture", "beats", "fixture");
  await mkdir(dirname(beatDir), { recursive: true });
  await cp(manifest.assets["delivery-fixture"].path, beatDir, { recursive: true, errorOnExist: true });

  const deliveryUrl = pathToFileURL(join(manifest.assets["delivery-code"].path, "deliver.mjs")).href;
  const reviewUrl = pathToFileURL(join(manifest.assets["delivery-code"].path, "output-review.mjs")).href;
  const [{ materialise }, { renderDigest, writeOutputReview }] = await Promise.all([
    import(deliveryUrl),
    import(reviewUrl),
  ]);
  const planVersion = 1;
  const findingIds = ["closure-fixture"];
  const draftDigest = renderDigest(beatDir);
  const completedAt = "2026-08-14T00:00:00.000Z";
  await writeOutputReview({
    beatDir,
    id: "closure-review",
    planVersion,
    findingIds,
    qaRuns: [{
      schemaVersion: 1,
      id: "closure-qa",
      outputId: "fixture",
      planVersion,
      draftDigest,
      findingIds,
      status: "passed",
      completedAt,
    }],
    angleEvidenceBrief: "Deterministic local closure fixture.",
    decision: "approve",
    reviewer: "closure-spike",
    decidedAt: completedAt,
  });
  await materialise({
    storiesRoot,
    storyId: "fixture",
    outputId: "fixture",
    form: "source-bundle",
    format: "web",
    planVersion,
    findingIds,
    env: {},
    handover: {
      language: "en",
      placement: "Closure fixture only",
      alt: "A deterministic closure fixture",
      credit: "Source: local deterministic fixture",
      caveat: "Not newsroom content",
    },
  });
  const exportDir = join(storiesRoot, "fixture", "export", "fixture");
  const reactTarget = join(exportDir, "node_modules", "react");
  await mkdir(dirname(reactTarget), { recursive: true });
  await cp(join(manifest.assets["runtime-modules"].path, "react"), reactTarget, { recursive: true, errorOnExist: true });
  const buildPath = join(exportDir, "build.ts");
  const previousCwd = process.cwd();
  try {
    process.chdir(exportDir);
    await import(`${pathToFileURL(buildPath).href}?closure=${Date.now()}`);
  } finally {
    process.chdir(previousCwd);
  }
  const dist = join(exportDir, "dist", "Fixture.js");
  if (!lstatSync(dist).isFile()) throw new Error(`generated delivery build did not write ${dist}`);
  return { operation: "delivery-build", outputs: [relative(outDir, exportDir), relative(outDir, dist)] };
}

export async function main(args = process.argv.slice(2)) {
  const [command] = args;
  const { manifestPath, manifestDigest, outDir, browserPath } = cliArgs(args);
  if (command === "manifest") {
    if (!browserPath || !manifestPath) throw new Error("manifest requires --browser <absolute-path> --manifest <output.json>");
    const manifest = await createManifest({ browserPath });
    await mkdir(dirname(resolve(manifestPath)), { recursive: true });
    const body = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(resolve(manifestPath), body);
    console.log(JSON.stringify({
      operation: "manifest",
      path: resolve(manifestPath),
      digest: digestBytes(body),
      assets: Object.keys(manifest.assets).length,
    }));
    return;
  }
  if (!manifestPath || !manifestDigest || !outDir || !browserPath) {
    throw new Error(`${command} requires --manifest, --manifest-digest, --browser, and --out`);
  }
  const body = await readFile(resolve(manifestPath));
  const actualManifestDigest = digestBytes(body);
  if (actualManifestDigest !== manifestDigest) {
    throw new Error(`closure manifest changed before operation start: ${actualManifestDigest} != ${manifestDigest}`);
  }
  const manifest = JSON.parse(body.toString("utf8"));
  const result = command === "map-bake"
    ? await runMapBake(manifest, resolve(outDir), { browserPath })
    : command === "delivery-build"
      ? await runDeliveryBuild(manifest, resolve(outDir), { browserPath })
      : null;
  if (!result) throw new Error(`unknown closure command ${JSON.stringify(command)}`);
  console.log(JSON.stringify(result));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
