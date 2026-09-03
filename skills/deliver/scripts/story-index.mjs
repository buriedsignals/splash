// twin/skills/deliver/scripts/story-index.mjs
//
// ONE FILE THAT SAYS WHAT WE MADE AND WHERE IT IS — issue #56.
//
// Every fact below is already on disk and recorded well. None of it is in one place, and none of it
// is at the STORY level: a URL lives in `export/<id>/EMBED_URL.txt`, the deployment in
// `DEPLOYMENT.json`, what a file is for in `HANDOVER.md`, whether the delivery is closed in two
// dotfiles, a video only in `beats/<id>/renders/`. To answer "what have we made and where is it?" a
// person opens n directories, reads a JSON and two dotfiles per output, and has to know that
// anything unhosted is in `beats/` rather than `export/`.
//
// The journalist's own words at the end of a real run, having just been handed two URLs and an mp4:
// "Please create a txt file with these, with the URLs in wherever you deploy them… so I can store
// the URLs and know where they are. That should probably be a feature by the way, otherwise people
// are not going to remember where things are."
//
// FOUR RULES THIS FILE HOLDS ITSELF TO, each from the issue:
//
//   1. IT IS NOT A STATE FILE. `whereIs` derives state from the real artifacts and keeps doing so.
//      Nothing reads this back. If it were ever load-bearing it would drift, and a drifting index
//      is worse than none — so it is regenerated whole on every delivery, never appended to.
//   2. IT COVERS THE UNHOSTED FORMATS HONESTLY. A video and a static export have no URL, and saying
//      so plainly beats omitting them: a journalist who cannot find their video in the index
//      concludes it was never made.
//   3. IT SAYS WHERE TO CORRECT A VISUAL. `beats/<id>/` is where you fix it; `export/<id>/` is what
//      you sent. `AGENTS.md` states that in prose for an agent and nothing stated it for a human,
//      and it is the distinction a returning journalist most needs and most easily gets wrong.
//   4. IT IS WRITTEN IN THE STORY'S LANGUAGE (ruling R4), like the hand-over and both halves of the
//      closing offer — or it becomes the half-translated document A25 was about.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const STORY_INDEX_FILE = "VISUALS.md";

async function read(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function list(path) {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

/**
 * What one slot became: where it is editable, where it was sent, whether it has a public address,
 * and any warning that belongs to it.
 *
 * A slot with no export is reported too — as open, at whatever gate it stopped at. An index that
 * only lists finished things cannot answer "what is left".
 */
export async function describeVisual(storyDir, slot) {
  const id = String(slot.id);
  const beatDir = join(storyDir, "beats", id);
  const beats = await list(join(storyDir, "beats"));
  const beatName = beats.find((name) => name === id || name.startsWith(`${id}-`)) ?? id;
  const exportDir = join(storyDir, "export", beatName);

  const url = (await read(join(exportDir, "EMBED_URL.txt")))?.trim() || null;
  const deployment = await read(join(exportDir, "DEPLOYMENT.json"));
  const handover = await read(join(exportDir, "HANDOVER.md"));
  const delivered = (await list(exportDir)).length > 0;
  const renders = await list(join(storyDir, "beats", beatName, "renders"));
  const video = renders.find((name) => name.endsWith(".mp4")) ?? null;

  // A DEVELOPMENT MapTiler key is readable by every reader of the page and billed to the newsroom.
  // It was recorded inside one output's HANDOVER.md, so a journalist with four visuals had no
  // summary of which of them carried it — which is exactly the summary they need.
  const warnings = [];
  if (handover && /development key/i.test(handover)) {
    warnings.push(
      "carries a DEVELOPMENT MapTiler key — readable by every reader of the page, and billed to the newsroom's account",
    );
  }

  return {
    id,
    proves: slot.proves ?? null,
    medium: slot.medium ?? null,
    format: slot.format ?? null,
    url,
    hosted: Boolean(url),
    delivered,
    video: video ? `beats/${beatName}/renders/${video}` : null,
    editableSource: `beats/${beatName}/`,
    sent: delivered ? `export/${beatName}/` : null,
    deployment: deployment ? JSON.parse(deployment) : null,
    warnings,
  };
}

/** What a reader can do with each format — one line, so the index does not assume the reader knows. */
const WHAT_A_READER_CAN_DO = {
  web: "a live page: a reader can hover, tap and move through it",
  scrolly: "a live page a reader moves through by scrolling",
  static: "a fixed image — no URL, it is a file you place",
  video: "a video file — no URL, it is a file you upload where it is shown",
};

/**
 * The index itself. Markdown, for a person.
 *
 * `strings` carries the story's language (ruling R4); the caller resolves it the same way the
 * hand-over does, because this file is read by the same journalist in the same sitting.
 */
export function formatStoryIndex({ slug, visuals, openSubjects = [], strings = {} }) {
  const t = {
    title: "Visuals in this story",
    intro:
      "Everything this story has produced, where each one lives, and where to correct it. " +
      "Regenerated on every delivery — it describes the current state, not a history.",
    correct: "Correct it in",
    sent: "Sent from",
    shows: "Shows",
    noUrl: "No URL — this one is a file, not a page.",
    open: "Not delivered yet",
    stable:
      "A corrected, re-approved visual redeploys to the SAME address, so an embed already in an " +
      "article keeps working.",
    awaiting: "Still awaiting a decision",
    none: "This story has produced no visuals yet.",
    ...strings,
  };

  const lines = [`# ${t.title} — ${slug}`, "", t.intro, ""];
  if (visuals.length === 0) lines.push(t.none, "");

  for (const visual of visuals) {
    lines.push(`## ${visual.id}${visual.medium ? ` — ${visual.medium} / ${visual.format}` : ""}`, "");
    if (visual.proves) lines.push(`**${t.shows}:** ${visual.proves}`, "");
    if (visual.url) {
      lines.push(`**URL:** ${visual.url}`, "");
    } else if (visual.video) {
      lines.push(`**${t.noUrl}** \`${visual.video}\``, "");
    } else if (visual.delivered) {
      lines.push(`**${t.noUrl}**`, "");
    } else {
      lines.push(`**${t.open}.**`, "");
    }
    const can = WHAT_A_READER_CAN_DO[visual.format];
    if (can) lines.push(can, "");
    // Rule 3 — the distinction a returning journalist most needs.
    lines.push(`**${t.correct}:** \`${visual.editableSource}\``);
    if (visual.sent) lines.push(`**${t.sent}:** \`${visual.sent}\``);
    lines.push("");
    for (const warning of visual.warnings) lines.push(`> ⚠️ ${warning}`, "");
  }

  if (visuals.some((visual) => visual.hosted)) lines.push(t.stable, "");
  if (openSubjects.length > 0) {
    lines.push(`## ${t.awaiting}`, "");
    for (const subject of openSubjects) lines.push(`- ${subject}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Write it beside `STORYBOARD.md` — it describes several exports, so it does not live inside one. */
export async function writeStoryIndex(storyDir, index) {
  await writeFile(join(storyDir, STORY_INDEX_FILE), index.endsWith("\n") ? index : `${index}\n`);
  return join(storyDir, STORY_INDEX_FILE);
}
