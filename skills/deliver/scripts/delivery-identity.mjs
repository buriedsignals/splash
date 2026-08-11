import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const DELIVERY_IDENTITY_SCHEMA_VERSION = 1;

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function stableDeliveryId(value, label) {
  requiredText(value, label);
  if (
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new Error(`${label} must be one stable path segment, got ${JSON.stringify(value)}`);
  }
  return value;
}

function statDirectory(path, label, { optional = false } = {}) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (optional && error?.code === "ENOENT") return null;
    if (error?.code === "ENOENT") {
      throw new Error(`${label} does not exist: ${path}`, { cause: error });
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`delivery refuses a symlinked ${label}: ${path}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`delivery refuses a non-directory ${label}: ${path}`);
  }
  return stat;
}

function assertContained(storiesRoot, candidate, label) {
  const rel = relative(storiesRoot, candidate);
  if (rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) return;
  throw new Error(`${label} escapes the declared stories root: ${candidate}`);
}

export function canonicalStoriesRoot(storiesRoot) {
  requiredText(storiesRoot, "storiesRoot");
  const declared = resolve(storiesRoot);
  statDirectory(declared, "stories root");
  return realpathSync(declared);
}

function verifyDirectory(storiesRoot, path, label, options) {
  const stat = statDirectory(path, label, options);
  if (stat === null) return null;
  const canonical = realpathSync(path);
  assertContained(storiesRoot, canonical, label);
  if (canonical !== path) {
    throw new Error(`delivery refuses a symlinked ancestor for ${label}: ${path}`);
  }
  return canonical;
}

function identityInput(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new Error("delivery identity must name storiesRoot, storyId, and outputId");
  }
  const storiesRoot = canonicalStoriesRoot(identity.storiesRoot);
  const storyId = stableDeliveryId(identity.storyId, "storyId");
  const outputId = stableDeliveryId(identity.outputId, "outputId");
  return { storiesRoot, storyId, outputId };
}

export function deliveryDestinations(identity) {
  const { storiesRoot, storyId, outputId } = identityInput(identity);
  const storyDir = join(storiesRoot, storyId);
  const exportRoot = join(storyDir, "export");
  const exportDir = join(exportRoot, outputId);
  assertContained(storiesRoot, storyDir, "story directory");
  assertContained(storiesRoot, exportDir, "output export directory");
  return { storiesRoot, storyId, outputId, storyDir, exportRoot, exportDir };
}

export function resolveDeliveryIdentity(identity) {
  const destinations = deliveryDestinations(identity);
  const { storiesRoot, storyDir, outputId } = destinations;
  const beatsDir = join(storyDir, "beats");
  const beatDir = join(beatsDir, outputId);
  const rendersDir = join(beatDir, "renders");

  verifyDirectory(storiesRoot, storyDir, "story directory");
  verifyDirectory(storiesRoot, beatsDir, "beats directory");
  verifyDirectory(storiesRoot, beatDir, "output beat directory");
  verifyDirectory(storiesRoot, rendersDir, "renders directory");
  verifyDirectory(storiesRoot, destinations.exportRoot, "export root", { optional: true });
  verifyDirectory(storiesRoot, destinations.exportDir, "output export directory", {
    optional: true,
  });

  return { ...destinations, beatsDir, beatDir, rendersDir };
}
