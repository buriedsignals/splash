// The state of a story is its directory. Nothing is remembered between sessions.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

export async function whereIs(storyDir) {
  const source = await list(join(storyDir, "source"));
  if (!source.includes("article.md") || !source.includes("profile.json")) {
    return { phase: "intake", missing: ["source/article.md", "source/profile.json"].filter((f) => !source.includes(f.split("/")[1])) };
  }

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  if (storyboard === null) return { phase: "framing", missing: ["STORYBOARD.md"] };
  if (!/^takeaway:\s*\S/m.test(storyboard)) return { phase: "storyboard", missing: ["a confirmed takeaway"] };

  const exported = await list(join(storyDir, "export"));
  if (exported.length > 0) return { phase: "done", missing: [] };

  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) {
      return { phase: "delivery", missing: [] };
    }
  }
  return { phase: "production", missing: [] };
}
