// The state of a story is its directory. Nothing is remembered between sessions.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  return content.substring(3, end);
}

function hasConfirmedTakeaway(frontmatter) {
  if (!frontmatter) return false;
  const match = frontmatter.match(/^takeaway:[ \t]*([^\n]+)$/m);
  if (!match) return false;
  const value = match[1].trim();
  if (!value) return false;
  if (value === '""' || value === "''" || value === "null" || value === "~") return false;
  return true;
}

async function hasAnyRender(storyDir) {
  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) {
      return true;
    }
  }
  return false;
}

export async function whereIs(storyDir) {
  const source = await list(join(storyDir, "source"));
  if (!source.includes("article.md") || !source.includes("profile.json")) {
    return { phase: "intake", missing: ["source/article.md", "source/profile.json"].filter((f) => !source.includes(f.split("/")[1])) };
  }

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  if (storyboard === null) return { phase: "framing", missing: ["STORYBOARD.md"] };

  const frontmatter = extractFrontmatter(storyboard);
  if (!hasConfirmedTakeaway(frontmatter)) return { phase: "storyboard", missing: ["a confirmed takeaway"] };

  const hasRender = await hasAnyRender(storyDir);
  const exported = await list(join(storyDir, "export"));

  if (!hasRender && exported.length > 0) {
    return { phase: "production", missing: ["no renders exist in any beat"] };
  }

  if (exported.length > 0) return { phase: "done", missing: [] };
  if (hasRender) return { phase: "delivery", missing: [] };

  return { phase: "production", missing: [] };
}
