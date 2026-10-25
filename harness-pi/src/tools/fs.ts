// File tools resolve every path against base directories: reads may reach the skills, shared code
// and worked examples; writes may only land inside the story. There is no bash tool to escape this.
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export interface Bases {
  /** The Splash run root that owns stories/. */
  root: string;
  /** The story directory every write is confined to. */
  storyDir: string;
}

const READ_BASES = ["skills", "shared", "proof"];
const CSV_EXCERPT_LINES = 40;
const MAX_READ_BYTES = 60_000;
// A small model that re-emits a whole file in one tool call spends minutes generating it and then
// hits the output limit (measured on the 12B: 16k tokens, about 20 minutes, truncated). The limits
// make the cheap behaviour the only one available: small edits, and whole-file writes only for new
// short files.
export const MAX_EDIT_OLD = 1_500;
export const MAX_EDIT_NEW = 3_000;
export const MAX_WRITE = 6_000;

function realOrParent(path: string): string {
  // A file about to be written does not exist yet; its nearest existing ancestor decides.
  let probe = path;
  while (!existsSync(probe)) {
    const up = dirname(probe);
    if (up === probe) break;
    probe = up;
  }
  return join(realpathSync(probe), relative(probe, path));
}

// The skills write paths from the Splash root ("stories/<slug>/STORYBOARD.md"), so a relative
// path is read from the root; a path already inside the story is accepted as-is.
function resolveFromRoot(bases: Bases, path: string): string {
  return resolve(bases.root, path);
}

function within(path: string, base: string): boolean {
  const rel = relative(base, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveInStory(bases: Bases, path: string): string {
  const abs = realOrParent(resolveFromRoot(bases, path));
  if (!within(abs, realpathSync(bases.storyDir))) {
    throw new Error(
      `${path} is outside the story directory ${bases.storyDir}; writes stay inside it`,
    );
  }
  return abs;
}

export function resolveReadable(bases: Bases, path: string): string {
  const abs = realOrParent(resolveFromRoot(bases, path));
  // The newsroom profile at the root is what palette and preflight read the house colours from.
  if (abs === join(realpathSync(bases.root), "NEWSROOM.md")) return abs;
  const allowed = [
    bases.storyDir,
    ...READ_BASES.map((b) => join(bases.root, b)),
  ]
    .filter(existsSync)
    .map((b) => realpathSync(b));
  if (!allowed.some((b) => within(abs, b))) {
    throw new Error(
      `${path} is outside the readable directories (the story, skills/, shared/, proof/)`,
    );
  }
  return abs;
}

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
  details: {},
});

export function fsTools(bases: Bases) {
  const readFileTool = defineTool({
    name: "read_file",
    label: "Read file",
    description:
      "Read a text file from the story, skills/, shared/ or proof/. Paths are absolute or relative to the Splash root. A CSV returns an excerpt; read source/profile.json for its full profile.",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, { path }) {
      const abs = resolveReadable(bases, path);
      const body = await readFile(abs, "utf8");
      if (abs.endsWith(".csv")) {
        const lines = body.split("\n");
        if (lines.length > CSV_EXCERPT_LINES) {
          return text(
            `${lines.slice(0, CSV_EXCERPT_LINES).join("\n")}\n[excerpt: first ${CSV_EXCERPT_LINES} of ${lines.length} lines; the full profile is in source/profile.json]`,
          );
        }
      }
      if (body.length > MAX_READ_BYTES) {
        return text(
          `${body.slice(0, MAX_READ_BYTES)}\n[truncated at ${MAX_READ_BYTES} of ${body.length} characters]`,
        );
      }
      return text(body);
    },
  });

  const listDir = defineTool({
    name: "list_dir",
    label: "List directory",
    description: "List a directory in the story, skills/, shared/ or proof/.",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, { path }) {
      const abs = resolveReadable(bases, path);
      const entries = readdirSync(abs).map((name) =>
        statSync(join(abs, name)).isDirectory() ? `${name}/` : name,
      );
      return text(entries.sort().join("\n"));
    },
  });

  const writeFileTool = defineTool({
    name: "write_file",
    label: "Write file",
    description: "Create or replace a file inside the story directory.",
    parameters: Type.Object({ path: Type.String(), content: Type.String() }),
    async execute(_id, { path, content }) {
      const abs = resolveInStory(bases, path);
      if (content.length > MAX_WRITE && existsSync(abs)) {
        throw new Error(
          `${path} exists and the new content is ${content.length} characters; rewrite it with several edit_file calls (old_text up to ${MAX_EDIT_OLD}, new_text up to ${MAX_EDIT_NEW} characters)`,
        );
      }
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content);
      return text(
        `wrote ${relative(bases.storyDir, abs)} (${content.length} characters)`,
      );
    },
  });

  const editFile = defineTool({
    name: "edit_file",
    label: "Edit file",
    description:
      "Replace one exact, unique occurrence of old_text with new_text in a file inside the story.",
    parameters: Type.Object({
      path: Type.String(),
      old_text: Type.String(),
      new_text: Type.String(),
    }),
    async execute(_id, { path, old_text, new_text }) {
      if (old_text.length > MAX_EDIT_OLD || new_text.length > MAX_EDIT_NEW) {
        throw new Error(
          `edit too large (old_text ${old_text.length}/${MAX_EDIT_OLD}, new_text ${new_text.length}/${MAX_EDIT_NEW} characters); split it into smaller edits`,
        );
      }
      const abs = resolveInStory(bases, path);
      const body = readFileSync(abs, "utf8");
      const count = body.split(old_text).length - 1;
      if (count !== 1)
        throw new Error(
          `old_text occurs ${count} times in ${path}; it must occur exactly once`,
        );
      await writeFile(
        abs,
        body.replace(old_text, () => new_text),
      );
      return text(`edited ${relative(bases.storyDir, abs)}`);
    },
  });

  return {
    readFile: readFileTool,
    listDir,
    writeFile: writeFileTool,
    editFile,
  };
}
