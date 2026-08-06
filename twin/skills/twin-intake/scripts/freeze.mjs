// twin/skills/twin-intake/scripts/freeze.mjs
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
  const profile = profileTable(parseCsv(data));

  await writeFile(frozen, article);
  await writeFile(join(storyDir, "source", "data.csv"), data);
  await writeFile(join(storyDir, "source", "profile.json"), JSON.stringify(profile, null, 2));
  return { article, data, profile };
}
