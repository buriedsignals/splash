// twin/skills/intake/scripts/freeze.mjs
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseCsv } from "./csv.mjs";
import { profileTable } from "./profile.mjs";
import { digestOf, sourceEntry, writeManifest } from "./manifest.mjs";

/** `rents.csv` → `rents`, so a slot names the journalist's own word for the table. */
function idFor(path, fallback) {
  const stem = basename(path).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return stem || fallback;
}

/**
 * FREEZE N SOURCES, BOUND BY DIGEST — issue #37.
 *
 * `articlePath` and `dataPath` remain, because one article and one table is the ordinary story and
 * it should stay a two-argument call. `extraSources` is what a real investigation needed: the other
 * eight datasets, the photographs, the geolocated places file. Each is recorded in
 * `source/MANIFEST.json` by id, path, kind and digest, and a slot names the one it draws on.
 *
 * WHAT IS NO LONGER REFUSED. A second call. Freezing refused one, which never prevented a
 * journalist editing their data — it meant the story was abandoned and recreated, and the record of
 * what changed was lost rather than preserved. What is refused instead is SILENT change:
 * `driftedSources` names the source that moved, and the beats that read it reopen.
 */
export async function freezeSource({ storyDir, articlePath, dataPath, extraSources = [] }) {
  const sourceDir = join(storyDir, "source");
  await mkdir(sourceDir, { recursive: true });

  const article = await readFile(articlePath, "utf8");
  const data = await readFile(dataPath, "utf8");
  // The article goes to the profiler as PROSE, not only to disk: a dataset that states its own
  // incompleteness ("the 2026 data is incomplete") states it in a description line, never in a
  // column, and this is the only moment where the two are in the same hand at the same time.
  const profile = profileTable(parseCsv(data), { prose: article });

  await writeFile(join(sourceDir, "article.md"), article);
  await writeFile(join(sourceDir, "data.csv"), data);
  await writeFile(join(sourceDir, "profile.json"), JSON.stringify(profile, null, 2));

  const sources = [
    sourceEntry({ id: "article", path: "source/article.md", kind: "prose", digest: digestOf(article) }),
    sourceEntry({
      id: idFor(dataPath, "data"),
      path: "source/data.csv",
      kind: "table",
      digest: digestOf(data),
      profile: "source/profile.json",
    }),
  ];

  // Every further source is COPIED IN and recorded, so the story still holds what it was analysed
  // from and a digest still means something after the journalist tidies their desktop.
  for (const extra of extraSources) {
    const bytes = await readFile(extra.path);
    const name = basename(extra.path);
    await writeFile(join(sourceDir, name), bytes);
    const entry = {
      id: extra.id ?? idFor(extra.path, "source"),
      path: `source/${name}`,
      kind: extra.kind ?? "document",
      digest: digestOf(bytes),
      ...(extra.note ? { note: extra.note } : {}),
    };
    if (entry.kind === "table") {
      const profilePath = `source/${name.replace(/\.[^.]+$/, "")}.profile.json`;
      await writeFile(
        join(storyDir, profilePath),
        JSON.stringify(profileTable(parseCsv(bytes.toString("utf8")), { prose: article }), null, 2),
      );
      entry.profile = profilePath;
    }
    sources.push(sourceEntry(entry));
  }

  const manifest = await writeManifest(storyDir, sources);
  return { article, data, profile, manifest };
}

/** Whether this story has been frozen at all. `intake` is done when the manifest exists. */
export async function isFrozen(storyDir) {
  try {
    await stat(join(storyDir, "source", "article.md"));
    return true;
  } catch {
    return false;
  }
}
