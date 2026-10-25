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
// path is read from the root; a path already inside the story is accepted as-is. A relative path
// that names nothing at the root but something in the story ("source/", "beats/1/beat.mjs") is the
// story's: the 12B often writes them that way.
function resolveFromRoot(bases: Bases, path: string): string {
  if (/^\.?\/?$/.test(path.trim())) return bases.storyDir;
  const fromRoot = resolve(bases.root, path);
  if (isAbsolute(path) || existsSync(fromRoot)) return fromRoot;
  const fromStory = resolve(bases.storyDir, path);
  const first = path.split(/[\\/]/)[0];
  return existsSync(fromStory) || existsSync(join(bases.storyDir, first)) ? fromStory : fromRoot;
}

function within(path: string, base: string): boolean {
  const rel = relative(base, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** Template tokens, newlines or backticks in a path mean the model's tool call ran into the next one. */
const MALFORMED_PATH = /<\||\|>|[\n\r`{}]/;

/**
 * Files the model never writes: the frozen sources, what the analyst built (a data.json it changed
 * is refused by the analyst on rebuild, which stalled a run), what typed tools record, and the kit
 * the harness copies into a zoned beat. In a zoned beat the model writes beat.mjs.
 */
const PROTECTED = /(^|\/)(source\/.*|STORYBOARD\.md|PALETTE\.md|DIRECTION\.md|SUBJECTS\.md|NEWSROOM\.md|data\.json|data\.csv|DATA-NOTES\.md|BRIEF\.md|OUTPUT-REVIEW\.json|render-beat\.mjs|CONTRACT\.md|beat\.example\.mjs|Directed[A-Za-z]*\.tsx|crossing-geometry\.ts)$/;

function assertWritable(bases: Bases, abs: string) {
  const rel = relative(bases.storyDir, abs);
  if (PROTECTED.test(rel))
    throw new Error(`${rel} is not yours to write: sources, analyst data, recorded files and the beat's kit are produced by Splash. Change beat.mjs instead.`);
}

export function resolveInStory(bases: Bases, raw: string): string {
  // Gemma 4's tool-call syntax sometimes loses the closing delimiter of the LAST argument, and the
  // 12B writes `path` after a long `content`: the path then runs into the next call
  // ("beat.mjs`}<tool_call|>...call:render_beat{..."). The content parsed whole, so when the text
  // before the break is a plain file name it is the path; anything else is refused.
  const path = MALFORMED_PATH.test(raw) ? raw.split(/<\||\|>|[\n\r`{}]/)[0] : raw;
  if (MALFORMED_PATH.test(raw) && !/\/?[\w.-]+\.[a-z0-9]{1,5}$/i.test(path))
    throw new Error(
      `the path ${JSON.stringify(raw.slice(0, 80))} is malformed (it holds tool-call text); call the tool again with just the file path`,
    );
  const abs = realOrParent(resolveFromRoot(bases, path));
  if (!within(abs, realpathSync(bases.storyDir))) {
    throw new Error(
      `${path} is outside the story directory ${bases.storyDir}; writes stay inside it`,
    );
  }
  return abs;
}

export function resolveReadable(bases: Bases, path: string): string {
  let abs = realOrParent(resolveFromRoot(bases, path));
  // A beat file asked for at the story root ("data.json") is the story's only beat's.
  if (!existsSync(abs) && dirname(abs) === realpathSync(bases.storyDir)) {
    const beats = join(bases.storyDir, "beats");
    const only = existsSync(beats) ? readdirSync(beats).filter((d) => !d.startsWith(".")) : [];
    const candidate = only.length === 1 ? join(beats, only[0], relative(realpathSync(bases.storyDir), abs)) : "";
    if (candidate && existsSync(candidate)) abs = realpathSync(candidate);
  }
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

/** The file's line closest to old_text's first line, quoted, so a near-miss edit can be retried exactly. */
function nearestLine(body: string, oldText: string): string {
  const first = oldText.split("\n").find((l) => l.trim()) ?? "";
  const tokens = new Set(first.split(/\W+/).filter((t) => t.length > 2));
  let best = "";
  let score = 0;
  for (const line of body.split("\n")) {
    const hits = line.split(/\W+/).filter((t) => tokens.has(t)).length;
    if (hits > score) [best, score] = [line, hits];
  }
  return best ? ` The closest line in the file is: ${JSON.stringify(best.slice(0, 200))} — copy old_text from the file exactly.` : "";
}

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
      assertWritable(bases, abs);
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
      assertWritable(bases, abs);
      const body = readFileSync(abs, "utf8");
      const count = body.split(old_text).length - 1;
      if (count !== 1)
        throw new Error(
          `old_text occurs ${count} times in ${path}; it must occur exactly once.${count === 0 ? nearestLine(body, old_text) : " Include more surrounding text."}`,
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
