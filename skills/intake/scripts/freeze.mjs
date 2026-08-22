// twin/skills/intake/scripts/freeze.mjs
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "./csv.mjs";
import { profileTable } from "./profile.mjs";

export async function freezeSource({ storyDir, articlePath, dataPath }) {
  const frozen = join(storyDir, "source", "article.md");
  try { await stat(frozen); throw new Error("source is already frozen"); }
  catch (error) { if (error.message.includes("already frozen")) throw error; }

  const article = await readFile(articlePath, "utf8");
  const data = await readFile(dataPath, "utf8");
  // The article goes to the profiler as PROSE, not only to disk: a dataset that states its own
  // incompleteness ("the 2026 data is incomplete") states it in a description line, never in a
  // column, and this is the only moment where the two are in the same hand at the same time.
  const profile = profileTable(parseCsv(data), { prose: article });

  await writeFile(frozen, article);
  await writeFile(join(storyDir, "source", "data.csv"), data);
  await writeFile(join(storyDir, "source", "profile.json"), JSON.stringify(profile, null, 2));
  return { article, data, profile };
}
