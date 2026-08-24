import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CEILING_BYTES, weightAgainstCeiling } from "./verify-guards.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOT = resolve(SKILL_ROOT, "..", "..");
const TEXT_ARTIFACTS = new Set([".html", ".svg"]);
const LOCAL_PROOF_ARTIFACTS = new Set([".html", ".svg", ".png"]);

function walk(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
  });
}

export function deliveredArtifacts(root = DEFAULT_ROOT) {
  const storyRoots = existsSync(join(root, "stories"))
    ? readdirSync(join(root, "stories"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => [
          join(root, "stories", entry.name, "beats"),
          join(root, "stories", entry.name, "export"),
        ])
    : [];
  const localProof = join(root, relative(DEFAULT_ROOT, SKILL_ROOT), "output-proof");
  const candidates = [join(root, "proof"), localProof, ...storyRoots].flatMap(walk);
  return [...new Set(candidates)]
    .filter((path) => {
      const extension = extname(path).toLowerCase();
      if (path.startsWith(`${localProof}${sep}`))
        return LOCAL_PROOF_ARTIFACTS.has(extension);
      if (!TEXT_ARTIFACTS.has(extension)) return false;
      const artifact = readFileSync(path, "utf8");
      return /data:image|data:font|;base64,/.test(artifact);
    })
    .sort();
}

export function verifyDeliveredArtifacts(root = DEFAULT_ROOT) {
  const artifacts = deliveredArtifacts(root);
  if (artifacts.length === 0) return ["no delivered artifacts found"];
  return artifacts.flatMap((path) => {
    const weight = weightAgainstCeiling(statSync(path).size, CEILING_BYTES);
    return weight.over
      ? [`${path}: ${weight.bytes} bytes exceeds ${weight.ceiling}`]
      : [];
  });
}

if (import.meta.main) {
  const problems = verifyDeliveredArtifacts();
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("delivered artifacts satisfy local guards");
}
