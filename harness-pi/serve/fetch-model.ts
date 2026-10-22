// Download the local model and its vision projector from a pinned Hugging Face commit and refuse
// any file whose sha256 differs: a model that silently changed under the harness would invalidate
// every measurement taken on it.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { appendFile, mkdir, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const MODEL = {
  repo: "unsloth/gemma-4-12b-it-GGUF",
  revision: "fc034cfff751157913579611efad8462ac1be606",
  dir: "gemma-4-12b-it",
  files: [
    {
      name: "gemma-4-12b-it-Q4_K_M.gguf",
      size: 7_121_861_440,
      sha256:
        "0a270ec9fe6b34f4a0d33992b6135117b484ebc4766ab76b51d4ae8c457e4c42",
    },
    {
      name: "mmproj-BF16.gguf",
      size: 175_115_840,
      sha256:
        "2e269f906eb15169ee9ce880ea649bd6d42d4964c21f8ede10d0d0efc738bcbb",
    },
  ],
} as const;

export function modelsDir(): string {
  return (
    process.env.SPLASH_MODELS_DIR ??
    join(homedir(), ".splash-harness", "models")
  );
}

const PART_BYTES = 256 * 1024 * 1024;
const PARALLEL = 8;

// One connection to the Hub runs at about 1 MB/s on a home line; eight ranges run about four
// times faster. Parts are resumable: a part already at its full size is not fetched again.
async function downloadInParts(url: string, path: string, size: number): Promise<void> {
  const parts: { file: string; from: number; to: number }[] = [];
  for (let from = 0, i = 0; from < size; from += PART_BYTES, i++) {
    parts.push({ file: `${path}.part${String(i).padStart(3, "0")}`, from, to: Math.min(from + PART_BYTES, size) - 1 });
  }
  const pending = [...parts];
  const worker = async () => {
    for (let part = pending.shift(); part; part = pending.shift()) {
      const want = part.to - part.from + 1;
      if (existsSync(part.file) && statSync(part.file).size === want) continue;
      const proc = Bun.spawn(["curl", "-fsL", "--retry", "5", "-r", `${part.from}-${part.to}`, "-o", part.file, url]);
      if ((await proc.exited) !== 0 || statSync(part.file).size !== want) throw new Error(`download failed: ${part.file}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  for (const part of parts) {
    await appendFile(path, await readFile(part.file));
    // Freed as it is appended, so the disk never holds the model twice.
    await rm(part.file);
  }
}

async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function fetchModel(): Promise<string> {
  const target = join(modelsDir(), MODEL.dir);
  await mkdir(target, { recursive: true });
  for (const file of MODEL.files) {
    const path = join(target, file.name);
    if (!existsSync(path)) {
      const url = `https://huggingface.co/${MODEL.repo}/resolve/${MODEL.revision}/${file.name}`;
      await downloadInParts(url, path, file.size);
    }
    const actual = await sha256(path);
    if (actual !== file.sha256) {
      throw new Error(
        `${path}: sha256 ${actual} does not match pinned ${file.sha256}`,
      );
    }
  }
  return target;
}

if (import.meta.main) {
  console.log(await fetchModel());
}
