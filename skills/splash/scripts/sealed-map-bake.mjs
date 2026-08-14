import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import puppeteer from "puppeteer-core";

const CONTRACT_NAME = "MAP-BAKE.json";
const CONTRACT_SCHEMA_VERSION = 1;
const MAX_CONTRACT_BYTES = 64 * 1024;
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_FEATURES = 100_000;
const MAX_COORDINATES = 500_000;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PROPERTY = /^[A-Za-z_][A-Za-z0-9_-]{0,127}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const STYLE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAP_TREATMENTS = new Set([
  "map.cartogram",
  "map.choropleth",
  "map.dot-density",
  "map.flow-map",
  "map.hex-grid",
  "map.locator",
  "map.proportional-symbol",
]);
const FORMATS = new Set(["static", "web", "video", "scrolly"]);
const DATA_FORMATS = new Set(["csv", "geojson", "json", "tsv"]);
const GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} fields do not match the managed map contract`);
  }
}

function sha256(body) {
  return `sha256:${createHash("sha256").update(body).digest("hex")}`;
}

function boundedString(value, label, pattern = null) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 256 ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function relativeInputPath(value, outputId, label) {
  boundedString(value, label);
  if (
    value.includes("\\") ||
    value !== posix.normalize(value) ||
    value.startsWith("/") ||
    value === "." ||
    value === ".." ||
    value.startsWith("../")
  ) {
    throw new Error(`${label} must be one normalized story-relative path`);
  }
  const allowedBeatPrefix = `beats/${outputId}/`;
  if (!value.startsWith("source/") && !value.startsWith(allowedBeatPrefix)) {
    throw new Error(`${label} must be under source/ or the selected beat`);
  }
  return value;
}

function coordinate(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] < -180 ||
    value[0] > 180 ||
    value[1] < -85 ||
    value[1] > 85
  ) {
    throw new Error(`${label} must be one valid [longitude, latitude] pair`);
  }
  return value;
}

export function validateMapBakeContract(value, outputId) {
  boundedString(outputId, "outputId", SEGMENT);
  exactKeys(
    value,
    [
      "schemaVersion",
      "treatment",
      "format",
      "camera",
      "basemap",
      "geography",
      "data",
      "anchors",
      "outputs",
    ],
    "map contract",
  );
  if (value.schemaVersion !== CONTRACT_SCHEMA_VERSION) {
    throw new Error("map contract schemaVersion is unsupported");
  }
  if (!MAP_TREATMENTS.has(value.treatment)) {
    throw new Error("map contract treatment is not a shipped map treatment");
  }
  if (!FORMATS.has(value.format)) {
    throw new Error("map contract format is unsupported");
  }

  exactKeys(
    value.camera,
    ["bounds", "width", "height", "settleMs"],
    "map camera",
  );
  if (
    !Array.isArray(value.camera.bounds) ||
    value.camera.bounds.length !== 2
  ) {
    throw new Error("map camera bounds are invalid");
  }
  const [southWest, northEast] = value.camera.bounds.map((row, index) =>
    coordinate(row, `map camera bound ${index + 1}`),
  );
  if (southWest[0] >= northEast[0] || southWest[1] >= northEast[1]) {
    throw new Error("map camera bounds must run west-to-east and south-to-north");
  }
  for (const [name, number] of [
    ["width", value.camera.width],
    ["height", value.camera.height],
  ]) {
    if (!Number.isInteger(number) || number < 240 || number > 4096) {
      throw new Error(`map camera ${name} must be an integer from 240 to 4096`);
    }
  }
  if (value.camera.width * value.camera.height > 4_194_304) {
    throw new Error("map camera exceeds the managed pixel budget");
  }
  if (
    !Number.isInteger(value.camera.settleMs) ||
    value.camera.settleMs < 1_000 ||
    value.camera.settleMs > 30_000
  ) {
    throw new Error("map camera settleMs must be an integer from 1000 to 30000");
  }

  exactKeys(value.basemap, ["style", "labels"], "map basemap");
  boundedString(value.basemap.style, "map basemap style", STYLE);
  if (!new Set(["hide-all", "keep-place-labels"]).has(value.basemap.labels)) {
    throw new Error("map basemap labels policy is unsupported");
  }

  exactKeys(
    value.geography,
    ["path", "digest", "idProperty", "nameProperty", "studyIds"],
    "map geography",
  );
  relativeInputPath(value.geography.path, outputId, "map geography path");
  boundedString(value.geography.digest, "map geography digest", DIGEST);
  boundedString(value.geography.idProperty, "map geography idProperty", PROPERTY);
  boundedString(
    value.geography.nameProperty,
    "map geography nameProperty",
    PROPERTY,
  );
  if (
    !Array.isArray(value.geography.studyIds) ||
    value.geography.studyIds.length === 0 ||
    value.geography.studyIds.length > 4096
  ) {
    throw new Error("map geography studyIds must be a bounded non-empty array");
  }
  const studyIds = new Set();
  for (const id of value.geography.studyIds) {
    boundedString(id, "map geography study ID", SEGMENT);
    if (studyIds.has(id)) throw new Error("map geography studyIds contain a duplicate");
    studyIds.add(id);
  }

  exactKeys(value.data, ["path", "digest", "format", "joinProperty"], "map data");
  relativeInputPath(value.data.path, outputId, "map data path");
  boundedString(value.data.digest, "map data digest", DIGEST);
  if (!DATA_FORMATS.has(value.data.format)) {
    throw new Error("map data format is unsupported");
  }
  boundedString(value.data.joinProperty, "map data joinProperty", PROPERTY);

  if (!Array.isArray(value.anchors) || value.anchors.length > 64) {
    throw new Error("map anchors must be a bounded array");
  }
  const anchorIds = new Set();
  for (const anchor of value.anchors) {
    exactKeys(anchor, ["id", "coordinates"], "map anchor");
    boundedString(anchor.id, "map anchor id", SEGMENT);
    if (anchorIds.has(anchor.id)) throw new Error("map anchors contain a duplicate ID");
    anchorIds.add(anchor.id);
    coordinate(anchor.coordinates, `map anchor ${anchor.id}`);
  }

  exactKeys(value.outputs, ["plate", "geometry"], "map outputs");
  if (value.outputs.plate !== "plate.png" || value.outputs.geometry !== "geometry.json") {
    throw new Error("map outputs must be plate.png and geometry.json");
  }
  return value;
}

function beneath(root, path) {
  const rel = relative(root, path);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function realDirectory(path, label) {
  if (!isAbsolute(path) || resolve(path) !== path) {
    throw new Error(`${label} must be a clean absolute path`);
  }
  const info = await lstat(path);
  const canonical = await realpath(path);
  if (!info.isDirectory() || info.isSymbolicLink() || canonical !== path) {
    throw new Error(`${label} must be a real directory without symlinks`);
  }
  return canonical;
}

async function readStableFile(path, root, expectedDigest, maxBytes, label) {
  const candidate = resolve(root, path);
  if (!beneath(root, candidate)) throw new Error(`${label} escapes the story`);
  const canonical = await realpath(candidate);
  if (canonical !== candidate || !beneath(root, canonical)) {
    throw new Error(`${label} contains a symlink or escapes the story`);
  }
  const before = await lstat(canonical);
  if (!before.isFile() || before.isSymbolicLink() || before.size > maxBytes) {
    throw new Error(`${label} is missing, too large, or not a real file`);
  }
  const body = await readFile(canonical);
  const after = await lstat(canonical);
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error(`${label} changed while it was being read`);
  }
  const actualDigest = sha256(body);
  if (expectedDigest && actualDigest !== expectedDigest) {
    throw new Error(`${label} does not match its declared digest`);
  }
  return { body, path: canonical, digest: actualDigest };
}

function featureID(feature, property) {
  const raw = feature?.properties?.[property];
  if ((typeof raw !== "string" && typeof raw !== "number") || !SEGMENT.test(String(raw))) {
    throw new Error("map geography contains an invalid or missing feature ID");
  }
  return String(raw);
}

function validateCoordinates(value, depth, counter) {
  if (depth === 0) {
    coordinate(value, "map geography coordinate");
    counter.count += 1;
    if (counter.count > MAX_COORDINATES) {
      throw new Error("map geography exceeds the coordinate budget");
    }
    return;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("map geography contains malformed coordinates");
  }
  for (const child of value) validateCoordinates(child, depth - 1, counter);
}

function geometryDepth(type) {
  return {
    Point: 0,
    MultiPoint: 1,
    LineString: 1,
    MultiLineString: 2,
    Polygon: 2,
    MultiPolygon: 3,
  }[type];
}

function selectGeoJSON(body, geography) {
  let collection;
  try {
    collection = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("map geography is not valid GeoJSON");
  }
  if (
    !collection ||
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length === 0 ||
    collection.features.length > MAX_FEATURES
  ) {
    throw new Error("map geography must be a bounded non-empty FeatureCollection");
  }
  const byID = new Map();
  const coordinateCounter = { count: 0 };
  for (const feature of collection.features) {
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
      throw new Error("map geography contains an invalid feature");
    }
    const { type, coordinates } = feature.geometry;
    if (!GEOMETRY_TYPES.has(type)) {
      throw new Error("map geography contains an unsupported geometry type");
    }
    validateCoordinates(coordinates, geometryDepth(type), coordinateCounter);
    const id = featureID(feature, geography.idProperty);
    if (byID.has(id)) throw new Error("map geography contains duplicate feature IDs");
    const rawName = feature.properties?.[geography.nameProperty];
    if (typeof rawName !== "string" || rawName.length === 0 || rawName.length > 512) {
      throw new Error("map geography contains an invalid or missing feature name");
    }
    byID.set(id, { id, name: rawName, geometry: { type, coordinates } });
  }
  const missing = geography.studyIds.filter((id) => !byID.has(id));
  if (missing.length > 0) {
    throw new Error("map geography is missing one or more declared study features");
  }
  return geography.studyIds.map((id) => byID.get(id));
}

async function loadContract({ story, outputId, contractDigest }) {
  await realDirectory(story, "story");
  const beat = await realDirectory(join(story, "beats", outputId), "map beat");
  const contractFile = await readStableFile(
    join("beats", outputId, CONTRACT_NAME),
    story,
    contractDigest,
    MAX_CONTRACT_BYTES,
    "map contract",
  );
  let contract;
  try {
    contract = JSON.parse(contractFile.body.toString("utf8"));
  } catch {
    throw new Error("map contract is not valid JSON");
  }
  validateMapBakeContract(contract, outputId);
  const geography = await readStableFile(
    contract.geography.path,
    story,
    contract.geography.digest,
    MAX_INPUT_BYTES,
    "map geography",
  );
  const data = await readStableFile(
    contract.data.path,
    story,
    contract.data.digest,
    MAX_INPUT_BYTES,
    "map data",
  );
  return {
    beat,
    contract,
    contractDigest: contractFile.digest,
    dataDigest: data.digest,
    features: selectGeoJSON(geography.body, contract.geography),
    geographyDigest: geography.digest,
  };
}

function flattenPixelCoordinates(value, out = []) {
  if (Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)) {
    out.push(value);
    return out;
  }
  for (const child of value) flattenPixelCoordinates(child, out);
  return out;
}

function assertStudyFeaturesMeetFrame(features, width, height) {
  const missing = [];
  for (const feature of features) {
    const points = flattenPixelCoordinates(feature.geometry.coordinates);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (
      points.length === 0 ||
      maxX < 0 ||
      minX > width ||
      maxY < 0 ||
      minY > height
    ) {
      missing.push(feature.id);
    }
  }
  if (missing.length > 0) {
    throw new Error("map camera excludes one or more declared study features");
  }
}

function cameraFacts(zoom, corners) {
  const worldWidthPx = 512 * 2 ** zoom;
  const centerLat = (corners.north + corners.south) / 2;
  return {
    worldWidthPx: Math.round(worldWidthPx * 10) / 10,
    degreesPerPixel: Number((360 / worldWidthPx).toPrecision(6)),
    metresPerPixel: Number(
      ((40075016.686 * Math.cos((centerLat * Math.PI) / 180)) / worldWidthPx).toPrecision(6),
    ),
  };
}

export async function captureMap({
  browserPath,
  contract,
  features,
  mapTilerKey,
  maplibreCssPath,
  maplibreJsPath,
  platePath,
  styleDefinition = null,
}) {
  for (const [label, path] of [
    ["browser", browserPath],
    ["MapLibre JavaScript", maplibreJsPath],
    ["MapLibre CSS", maplibreCssPath],
  ]) {
    if (!isAbsolute(path ?? "")) throw new Error(`${label} path is unavailable`);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} path is not a real file`);
  }
  if (typeof mapTilerKey !== "string" || mapTilerKey.length === 0) {
    throw new Error("managed map bake did not receive MAPTILER_KEY");
  }
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: browserPath,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-sandbox",
      "--hide-scrollbars",
    ],
  });
  try {
    const page = await browser.newPage();
    const { width, height, bounds, settleMs } = contract.camera;
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style></head><body><div id="map"></div></body></html>`,
      { waitUntil: "load" },
    );
    await page.addStyleTag({ path: maplibreCssPath });
    await page.addScriptTag({ path: maplibreJsPath });
    await page.waitForFunction("window.maplibregl !== undefined", { timeout: 30_000 });
    const gate = await page.evaluate(
      async ({ bounds, height, key, labels, settleMs, style, styleDefinition, width }) => {
        const map = new maplibregl.Map({
          container: "map",
          style:
            styleDefinition ??
            `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          preserveDrawingBuffer: true,
          bounds,
          fitBoundsOptions: { padding: 0, animate: false },
        });
        window.__splashMap = map;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("MapTiler style load timed out")),
            30_000,
          );
          map.once("style.load", () => {
            clearTimeout(timer);
            resolve();
          });
          map.once("error", () => {
            clearTimeout(timer);
            reject(new Error("MapTiler style failed to load"));
          });
        });
        let hidden = 0;
        for (const layer of map.getStyle().layers ?? []) {
          const boundary = /border|boundary|admin/i.test(layer.id);
          const symbol = layer.type === "symbol";
          if (boundary || (labels === "hide-all" && symbol)) {
            map.setLayoutProperty(layer.id, "visibility", "none");
            hidden += 1;
          }
        }
        const started = Date.now();
        const gatedBy = await new Promise((resolve) => {
          let done = false;
          const finish = (value) => {
            if (done) return;
            done = true;
            resolve(value);
          };
          map.once("idle", () => finish("idle"));
          setTimeout(() => finish("settle"), settleMs);
        });
        return {
          gatedBy,
          gateMs: Date.now() - started,
          hidden,
          zoom: map.getZoom(),
          topLeft: map.unproject([0, 0]),
          bottomRight: map.unproject([width, height]),
        };
      },
      {
        bounds,
        height,
        key: mapTilerKey,
        labels: contract.basemap.labels,
        settleMs,
        style: contract.basemap.style,
        styleDefinition,
        width,
      },
    );
    await page.screenshot({
      path: platePath,
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });
    const projected = await page.evaluate((rows) => {
      const project = (value) => {
        if (Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)) {
          const point = window.__splashMap.project(value);
          return [Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10];
        }
        return value.map(project);
      };
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        geometry: { type: row.geometry.type, coordinates: project(row.geometry.coordinates) },
      }));
    }, features);
    const anchors = await page.evaluate((rows) => {
      return rows.map((row) => {
        const point = window.__splashMap.project(row.coordinates);
        return { id: row.id, x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 };
      });
    }, contract.anchors);
    assertStudyFeaturesMeetFrame(projected, width, height);
    const frameCorners = {
      west: gate.topLeft.lng,
      north: gate.topLeft.lat,
      east: gate.bottomRight.lng,
      south: gate.bottomRight.lat,
    };
    return {
      schemaVersion: "splash-map-geometry/v1",
      frame: { width, height },
      bounds,
      style: contract.basemap.style,
      labels: contract.basemap.labels,
      gatedBy: gate.gatedBy,
      zoom: Math.round(gate.zoom * 1000) / 1000,
      frameCorners,
      ...cameraFacts(gate.zoom, frameCorners),
      anchors,
      features: projected,
    };
  } finally {
    await browser.close();
  }
}

async function verifyExistingRevision(path, contractDigest) {
  const receiptPath = join(path, "RECEIPT.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  if (
    receipt?.schemaVersion !== "splash-map-bake-receipt/v1" ||
    receipt.contractDigest !== contractDigest ||
    !DIGEST.test(receipt.outputs?.plate ?? "") ||
    !DIGEST.test(receipt.outputs?.geometry ?? "")
  ) {
    throw new Error("existing managed map bake has an invalid receipt");
  }
  for (const [name, digest] of [
    ["plate.png", receipt.outputs.plate],
    ["geometry.json", receipt.outputs.geometry],
  ]) {
    const body = await readFile(join(path, name));
    if (sha256(body) !== digest) throw new Error("existing managed map bake output drifted");
  }
  return receipt;
}

function publicResult(outputId, revision, contractDigest, receipt) {
  const root = join("beats", outputId, "map-bake", revision);
  return {
    operation: "map-bake",
    outputId,
    contractDigest,
    outputs: [
      join(root, "plate.png"),
      join(root, "geometry.json"),
      join(root, "RECEIPT.json"),
    ],
    outputDigests: receipt.outputs,
  };
}

export async function bakeMapContract(
  { story, outputId, contractDigest, browserPath, mapTilerKey },
  { captureFn = captureMap } = {},
) {
  boundedString(contractDigest, "map contract digest", DIGEST);
  const loaded = await loadContract({ story, outputId, contractDigest });
  const revision = loaded.contractDigest.slice("sha256:".length);
  const bakeRoot = join(loaded.beat, "map-bake");
  await mkdir(bakeRoot, { recursive: true, mode: 0o700 });
  await realDirectory(bakeRoot, "map bake root");
  const final = join(bakeRoot, revision);
  try {
    const info = await lstat(final);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error("existing managed map bake is not a real directory");
    }
    const receipt = await verifyExistingRevision(final, loaded.contractDigest);
    return publicResult(outputId, revision, loaded.contractDigest, receipt);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const stage = await mkdtemp(join(bakeRoot, ".stage-"));
  try {
    const geometry = await captureFn({
      browserPath,
      contract: loaded.contract,
      features: loaded.features,
      mapTilerKey,
      maplibreCssPath: join(
        resolve(import.meta.dirname, "../../.."),
        "node_modules/maplibre-gl/dist/maplibre-gl.css",
      ),
      maplibreJsPath: join(
        resolve(import.meta.dirname, "../../.."),
        "node_modules/maplibre-gl/dist/maplibre-gl.js",
      ),
      platePath: join(stage, loaded.contract.outputs.plate),
    });
    const geometryBody = Buffer.from(`${JSON.stringify({
      ...geometry,
      contractDigest: loaded.contractDigest,
      treatment: loaded.contract.treatment,
      format: loaded.contract.format,
      inputs: {
        geography: loaded.geographyDigest,
        data: loaded.dataDigest,
      },
    })}\n`);
    await writeFile(join(stage, loaded.contract.outputs.geometry), geometryBody, {
      flag: "wx",
      mode: 0o600,
    });
    const plateBody = await readFile(join(stage, loaded.contract.outputs.plate));
    const receipt = {
      schemaVersion: "splash-map-bake-receipt/v1",
      contractDigest: loaded.contractDigest,
      treatment: loaded.contract.treatment,
      format: loaded.contract.format,
      inputs: { geography: loaded.geographyDigest, data: loaded.dataDigest },
      outputs: { plate: sha256(plateBody), geometry: sha256(geometryBody) },
    };
    await writeFile(join(stage, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    try {
      await rename(stage, final);
    } catch (error) {
      if (error?.code !== "EEXIST" && error?.code !== "ENOTEMPTY") throw error;
      await verifyExistingRevision(final, loaded.contractDigest);
    }
    const verified = await verifyExistingRevision(final, loaded.contractDigest);
    return publicResult(outputId, revision, loaded.contractDigest, verified);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
