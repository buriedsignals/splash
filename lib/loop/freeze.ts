import { sha256 } from "@noble/hashes/sha2.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

// Copy a brought input into the run directory so the run is self-contained and the
// manifest can reference it by path+hash only — never by content, never a secret.
// The frozen filename is content-addressed so re-freezing identical bytes is a no-op.
export function freezeInput(
  runDir: string,
  srcPath: string,
  kind: "data" | "article",
): { path: string; sha256: string } {
  if (!existsSync(srcPath))
    throw new Error(`freezeInput: source not found: ${srcPath}`);
  const bytes = readFileSync(srcPath);
  const hash = Buffer.from(sha256(bytes)).toString("hex");
  const sourceExt = extname(srcPath).slice(1).toLowerCase();
  const ext = sourceExt || (kind === "data" ? "csv" : "txt");
  const rel = join("input", `${kind}-${hash.slice(0, 16)}.${ext}`);
  const dest = join(runDir, rel);
  mkdirSync(join(runDir, "input"), { recursive: true });
  if (!existsSync(dest)) writeFileSync(dest, bytes);
  return { path: rel, sha256: hash };
}
