import { describe, it, expect } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "test") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|ts|tsx)$/.test(e.name)) yield p;
  }
}

describe("skills never import each other at runtime", () => {
  it("should find no cross-skill import outside test directories", async () => {
    const offenders: string[] = [];
    for (const skill of await readdir(SKILLS)) {
      for (const dir of ["scripts", "assets"]) {
        const root = join(SKILLS, skill, dir);
        try {
          for await (const file of sourceFiles(root)) {
            const src = await readFile(file, "utf8");
            for (const m of src.matchAll(
              /from\s+"(\.\.\/\.\.\/[a-z-]+\/[^"]+)"/g,
            )) {
              offenders.push(`${file} → ${m[1]}`);
            }
          }
        } catch {
          /* skill has no such directory */
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
