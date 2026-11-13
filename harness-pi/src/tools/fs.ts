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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export interface Bases {
  /** The Splash run root that owns stories/. */
  root: string;
  /** The story directory every write is confined to. */
  storyDir: string;
  /** Root directories readable besides the story; skills/, shared/ and proof/ when absent. */
  readBases?: string[];
  /** Refuse a second read of a file unchanged since this session read it, naming what to do instead. */
  /** What a refused reread says to do instead; a function is asked at the refusal, so it names what is open then. */
  noRereads?: string | (() => string | Promise<string>);
  /** Paths the harness already answered in code: a read or listing that names one gets this reply instead. */
  answered?: { match: RegExp; reply: string }[];
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
  return existsSync(fromStory) || existsSync(join(bases.storyDir, first))
    ? fromStory
    : fromRoot;
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
const PROTECTED =
  /(^|\/)(source\/.*|STORYBOARD\.md|PALETTE\.md|DIRECTION\.md|SUBJECTS\.md|NEWSROOM\.md|data\.json|data\.csv|DATA-NOTES\.md|BRIEF\.md|OUTPUT-REVIEW\.json|render-beat\.mjs|guards\.mjs|series\.mjs|CONTRACT\.md|beat\.example\.mjs|Directed[A-Za-z]*\.tsx|crossing-geometry\.ts)$/;

/**
 * An empty write over a non-empty file is refused: a call cut off at the output cap arrives with empty content, and
 * writing it would erase the file (Spotlight's write_file rule).
 */
export function assertNotErasing(abs: string, content: string, shown: string) {
  if (
    content.trim() === "" &&
    existsSync(abs) &&
    readFileSync(abs, "utf8").trim() !== ""
  )
    throw new Error(
      `${shown} exists and the new content is empty: an empty write would erase it. Give the whole content, or change it with edit_file`,
    );
}

function assertWritable(bases: Bases, abs: string) {
  const rel = relative(realpathSync(bases.storyDir), abs);
  // In a beat folder the model writes beat.mjs and nothing else: every other file there is the kit's,
  // the analyst's or the render's.
  if (/^beats\/[^/]+\/(?!beat\.mjs$)/.test(rel) || PROTECTED.test(rel))
    throw new Error(
      `${rel} is not yours to write: sources, analyst data, recorded files and the beat's kit are produced by Splash. Change beat.mjs instead.`,
    );
}

export function resolveInStory(bases: Bases, raw: string): string {
  // Gemma 4's tool-call syntax sometimes loses the closing delimiter of the LAST argument, and the
  // 12B writes `path` after a long `content`: the path then runs into the next call
  // ("beat.mjs`}<tool_call|>...call:render_beat{..."). The content parsed whole, so when the text
  // before the break is a plain file name it is the path; anything else is refused.
  const path = MALFORMED_PATH.test(raw)
    ? raw.split(/<\||\|>|[\n\r`{}]/)[0]
    : raw;
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

/** A missing path, answered with what its nearest existing folder holds, in the path as the model wrote it
 *  (Qwen3.5-9B guessed file and folder names in a worked example, gx static cells, 2026-11-13). */
function missing(path: string, abs: string): string {
  let dir = dirname(abs);
  let shown = dirname(path.replace(/\/+$/, ""));
  while (!existsSync(dir) && dirname(dir) !== dir) {
    dir = dirname(dir);
    shown = dirname(shown);
  }
  const held = readdirSync(dir, { withFileTypes: true }).map((d) => (d.isDirectory() ? `${d.name}/` : d.name)).sort();
  return `${path} does not exist; ${shown === "." ? "the root" : `${shown}/`} holds: ${held.slice(0, 40).join(", ")}${held.length > 40 ? ", …" : ""}.`;
}

export function resolveReadable(bases: Bases, path: string): string {
  let abs = realOrParent(resolveFromRoot(bases, path));
  // A story folder spelled with _ for - (a 12B read stories/stress_q_safety_incidents/ six times over and never
  // wrote its beat) is the story's own folder.
  const story = realpathSync(bases.storyDir);
  const stories = dirname(story);
  // An absolute path through this story's folder in a mistyped run directory (a 12B retyped the run's
  // 13-digit stamp with one digit too many, six times over) is the story's own file.
  const through = `${sep}stories${sep}${basename(story)}${sep}`;
  if (!within(abs, story) && abs.includes(through))
    abs = realOrParent(
      join(story, abs.slice(abs.lastIndexOf(through) + through.length)),
    );
  const fold = (name: string) => name.toLowerCase().replace(/[-_\s]/g, "");
  // Both misspelled at once (the MLX 12B under Osaurus wrote every - as _, run directory and story folder alike).
  if (!within(abs, story)) {
    const parts = abs.split(sep);
    const at = parts.lastIndexOf("stories");
    if (
      at >= 0 &&
      at + 1 < parts.length &&
      fold(parts[at + 1]) === fold(basename(story))
    )
      abs = realOrParent(join(story, ...parts.slice(at + 2)));
  }
  if (within(abs, stories) && !within(abs, story)) {
    const [folder, ...rest] = relative(stories, abs).split(sep);
    if (fold(folder) === fold(basename(story)))
      abs = realOrParent(join(story, ...rest));
  }
  // A missing file named bare or at the run root ("data.json") is asked of the story.
  if (!existsSync(abs) && dirname(abs) === realpathSync(bases.root))
    abs = join(realpathSync(bases.storyDir), basename(abs));
  // A beat file asked for at the story root ("data.json") is the story's only beat's.
  if (!existsSync(abs) && dirname(abs) === realpathSync(bases.storyDir)) {
    const beats = join(bases.storyDir, "beats");
    const only = existsSync(beats)
      ? readdirSync(beats).filter((d) => !d.startsWith("."))
      : [];
    const candidate =
      only.length === 1
        ? join(beats, only[0], relative(realpathSync(bases.storyDir), abs))
        : "";
    if (candidate && existsSync(candidate)) abs = realpathSync(candidate);
  }
  // A frozen source asked for under another base ("proof/source/article.md") is the story's own (stress-v, 2026-11-13).
  const src = !existsSync(abs) ? /(?:^|\/)source\/(.+)$/.exec(path) : null;
  if (src && existsSync(join(bases.storyDir, "source", src[1]))) abs = realpathSync(join(bases.storyDir, "source", src[1]));
  // A skill's own reference asked for by its path inside the skill ("references/type-survey.md") is that
  // skill's, when exactly one skill holds it (stress-v, 2026-11-13: twelve turns lost listing shared/).
  if (!existsSync(abs) && !isAbsolute(path)) {
    const skills = join(bases.root, "skills");
    const held = existsSync(skills)
      ? readdirSync(skills).map((d) => join(skills, d, path)).filter((c) => existsSync(c))
      : [];
    if (held.length === 1) abs = realpathSync(held[0]);
  }
  // The newsroom profile at the root is what palette and preflight read the house colours from; asked for
  // under shared/ or source/, it is still that one (stress-v, 2026-11-13: three misses stopped the step).
  if (basename(abs) === "NEWSROOM.md" && !existsSync(abs)) abs = join(realpathSync(bases.root), "NEWSROOM.md");
  if (abs === join(realpathSync(bases.root), "NEWSROOM.md")) return abs;
  const allowed = [
    bases.storyDir,
    ...(bases.readBases ?? READ_BASES).map((b) => join(bases.root, b)),
  ]
    .filter(existsSync)
    .map((b) => realpathSync(b));
  if (!allowed.some((b) => within(abs, b))) {
    throw new Error(
      `${path} is outside the readable directories (the story, ${(bases.readBases ?? READ_BASES).map((b) => `${b}/`).join(", ")}): the story is ${bases.storyDir}`,
    );
  }
  return abs;
}

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
  details: {},
});

/** The file's passage closest to old_text, as many lines long, quoted, so a near-miss edit can be retried exactly.
 *  Tokens are letters in any script: an ASCII split left an Arabic block matching only its key line, and the model
 *  retyped the same misspelt value three times (stress-x, Qwen3.5-9B, 2026-11-13). */
function nearestLine(body: string, oldText: string): string {
  const words = (t: string) => t.split(/[^\p{L}\p{N}_]+/u).filter((w) => w.length > 2);
  const tokens = new Set(words(oldText));
  const lines = body.split("\n");
  const span = Math.max(1, oldText.replace(/\n+$/, "").split("\n").length);
  let best = "";
  let score = 0;
  for (let i = 0; i < lines.length; i++) {
    const passage = lines.slice(i, i + span).join("\n");
    const said = words(passage);
    const hits = said.filter((w) => tokens.has(w)).length - 0.1 * said.filter((w) => !tokens.has(w)).length;
    if (hits > score) [best, score] = [passage, hits];
  }
  return best
    ? ` The closest ${span > 1 ? "passage" : "line"} in the file is: ${JSON.stringify(best.slice(0, 200 * span))} — copy old_text from the file exactly.`
    : "";
}

/**
 * Rows of a country table that are totals of others (the world, continents, unions), named in full.
 * Osaurus runs 1 and 4 (2026-11-08): a 3,900-row data.json was cut at Afghanistan, so the 12B never saw World or
 * Africa until the render refused a stack that added them to the countries — and ran out of time rewriting.
 * The same rule as the render's refuseDoubleCount (craft/_shared/gesture-time-run.mjs): a country has an ISO code.
 */
export function aggregateNote(body: string): string {
  let table: { columns?: unknown[]; rows?: unknown[][] };
  try {
    table = JSON.parse(body);
  } catch {
    return "";
  }
  const rows = Array.isArray(table?.rows) ? table.rows.filter(Array.isArray) : [];
  const width = Array.isArray(table?.columns) ? table.columns.length : 0;
  if (!rows.length || !width) return "";
  const iso = (v: unknown) => /^([A-Z]{3}|OWID_KOS)$/.test(String(v ?? ""));
  const cols = [...Array(width).keys()];
  const code = cols.find((c) => rows.filter((r) => iso(r[c])).length >= rows.length * 0.6);
  if (code === undefined) return "";
  const name = cols.find((c) => c !== code && rows.every((r) => typeof r[c] === "string"));
  if (name === undefined) return "";
  const totals = [...new Set(rows.filter((r) => !iso(r[code])).map((r) => String(r[name])))].sort();
  if (!totals.length) return "";
  return `\n[harness] Rows without a country code are totals of the country rows: ${totals.map((t) => JSON.stringify(t)).join(", ")}. A stack, a sum or a share draws either the countries or one of these totals, never both; the rest of the world is a total's row minus the part shown.`;
}

/** A table above this many characters is read as a digest, never whole. */
const TABLE_DIGEST_AT = 8_000;

/**
 * A large { columns, rows } table read as its shape: row count, columns, every value of a short column, a few rows,
 * and every row of the totals (a country table's world and regions) — the rows a takeaway is mostly about.
 * Osaurus run 5 (2026-11-08): each whole read of a 3,900-row data.json put ~32,000 tokens in the context, about
 * 200 s of prefill on either server; folded away a turn later, it was read four times, 860 s of a 1,277 s craft.
 */
export function tableDigest(body: string): string | null {
  if (body.length <= TABLE_DIGEST_AT) return null;
  let table: { columns?: { name?: unknown; type?: unknown }[]; rows?: unknown[][] };
  try {
    table = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(table?.columns) || !Array.isArray(table?.rows)) return null;
  const columns = table.columns;
  const rows = table.rows.filter(Array.isArray);
  const row = (r: unknown[]) => JSON.stringify(r);
  const values = columns.map((c, i) => {
    const seen = [...new Set(rows.map((r) => r[i]).filter((v) => v !== null && v !== ""))];
    if (seen.length <= 30) return `- ${c.name}: ${seen.map((v) => (typeof v === "string" ? JSON.stringify(v) : String(v))).join(", ")}`;
    const nums = seen.map(Number).filter(Number.isFinite);
    return nums.length === seen.length
      ? `- ${c.name}: ${seen.length} values from ${Math.min(...nums)} to ${Math.max(...nums)}`
      : `- ${c.name}: ${seen.length} values, e.g. ${seen.slice(0, 8).map((v) => JSON.stringify(v)).join(", ")}`;
  });
  const iso = (v: unknown) => /^([A-Z]{3}|OWID_KOS)$/.test(String(v ?? ""));
  const code = columns.findIndex((_, c) => rows.filter((r) => iso(r[c])).length >= rows.length * 0.6);
  const totals = code < 0 ? [] : rows.filter((r) => !iso(r[code]));
  const shown = totals.length && totals.length <= 200 ? totals : rows.slice(0, 12);
  return [
    `[digest: data.json is ${body.length} characters, too long to read whole; the beat reads the file itself, by column name]`,
    `${rows.length} rows; columns in order: ${columns.map((c) => `${c.name} (${c.type})`).join(", ")}. Each row is an array of cells in that order.`,
    "Values by column:",
    ...values,
    totals.length && totals.length <= 200 ? `Every row of the totals (${totals.length}):` : `The first ${shown.length} rows:`,
    ...shown.map(row),
  ].join("\n");
}

/** stress-x (Qwen3.5-9B, 2026-11-13): told the producer needed nothing read, the model hunted the Datawrapper
 *  mapping through five missing paths until the step stopped; the hunt now meets the answer it was looking for. */
function answeredFor(bases: Bases, path: string): string | undefined {
  return bases.answered?.find((a) => a.match.test(path))?.reply;
}

const insteadOfReread = async (bases: Bases) => (typeof bases.noRereads === "function" ? await bases.noRereads() : bases.noRereads);

export function fsTools(bases: Bases) {
  const seen = new Map<string, string>();
  const readFileTool = defineTool({
    name: "read_file",
    label: "Read file",
    description:
      "Read a text file from the story, skills/, shared/ or proof/. Paths are absolute or relative to the Splash root. A CSV returns an excerpt; read source/profile.json for its full profile.",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, { path }) {
      const done = answeredFor(bases, path);
      if (done) return text(done);
      const abs = resolveReadable(bases, path);
      if (!existsSync(abs)) throw new Error(missing(path, abs));
      if (bases.noRereads) {
        // stress-ad (Qwen3.5-9B, 2026-11-13): eight alternating reads of the same two references and no question, until the cap.
        const stamp = String(statSync(abs).mtimeMs);
        if (seen.get(abs) === stamp) throw new Error(`you already read ${path} above and it has not changed — do not read it again. ${await insteadOfReread(bases)}`);
        seen.set(abs, stamp);
      }
      const body = await readFile(abs, "utf8");
      const note = abs.endsWith(".json") ? aggregateNote(body) : "";
      const digest = abs.endsWith(".json") ? tableDigest(body) : null;
      if (digest) return text(digest + note);
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
          `${body.slice(0, MAX_READ_BYTES)}\n[truncated at ${MAX_READ_BYTES} of ${body.length} characters]${note}`,
        );
      }
      return text(body + note);
    },
  });

  const listDir = defineTool({
    name: "list_dir",
    label: "List directory",
    description: "List a directory in the story, skills/, shared/ or proof/.",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, { path }) {
      const done = answeredFor(bases, path);
      if (done) return text(done);
      const abs = resolveReadable(bases, path);
      if (!existsSync(abs)) throw new Error(missing(path, abs));
      const entries = readdirSync(abs).map((name) =>
        statSync(join(abs, name)).isDirectory() ? `${name}/` : name,
      );
      const listing = entries.sort().join("\n");
      if (bases.noRereads) {
        // stress-ad (Qwen3.5-9B, 2026-11-13): the same three directories listed in turn for twelve turns, no question asked.
        if (seen.get(`dir:${abs}`) === listing) throw new Error(`you already listed ${path} above and it has not changed — do not list it again. ${await insteadOfReread(bases)}`);
        seen.set(`dir:${abs}`, listing);
      }
      return text(listing);
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
      assertNotErasing(abs, content, path);
      if (existsSync(abs) && readFileSync(abs, "utf8") === content)
        throw new Error(
          `${path} already holds exactly this content: this write changes nothing. If the beat already renders, call render_beat (it is the last step); otherwise change only the text the last refusal names.`,
        );
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
          `edit too large (old_text ${old_text.length}/${MAX_EDIT_OLD}, new_text ${new_text.length}/${MAX_EDIT_NEW} characters); split it into smaller edits, or write the whole file again with write_file`,
        );
      }
      if (old_text === new_text)
        throw new Error(
          `new_text is old_text: this edit changes nothing. If the beat already renders, call render_beat (it is the last step); otherwise change only the text the last refusal names.`,
        );
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

/**
 * The craft step's write tools: in a zoned beat the model writes beat.mjs and nothing else, so the
 * tools take no path. The 12B writes a long `content` first and then degenerates on the small argument
 * after it — a map beat's path came out as `{"path":{"path":{…` nested until the token cap, and the
 * craft step never wrote its file.
 */
export function beatTools(bases: Bases, beat: string) {
  const file = `beats/${beat}/beat.mjs`;
  const abs = () => resolveInStory(bases, join(bases.storyDir, file));
  const writeBeat = defineTool({
    name: "write_file",
    label: "Write beat.mjs",
    description: `Create or replace ${file}, the one file you write. Give its whole content.`,
    parameters: Type.Object({ content: Type.String() }),
    async execute(_id, { content }) {
      const target = abs();
      assertWritable(bases, target);
      assertNotErasing(target, content, file);
      // A call cut off before its content arrives as "", or as the literal "null": real-gwis wrote a 4-character
      // beat.mjs after an aborted generation and spent the rest of the run reading around it.
      if (/^(null|undefined)?$/.test(content.trim()))
        throw new Error(
          `${file}: the call carried no content ("${content.trim()}"). Give the whole module in content, starting with its imports`,
        );
      if (content.length > MAX_WRITE && existsSync(target))
        throw new Error(
          `${file} exists and the new content is ${content.length} characters; change it with several edit_file calls (old_text up to ${MAX_EDIT_OLD}, new_text up to ${MAX_EDIT_NEW} characters)`,
        );
      await writeFile(target, content);
      return text(`wrote ${file} (${content.length} characters)`);
    },
  });
  const editBeat = defineTool({
    name: "edit_file",
    label: "Edit beat.mjs",
    description: `Replace one exact, unique occurrence of old_text with new_text in ${file}.`,
    parameters: Type.Object({
      old_text: Type.String(),
      new_text: Type.String(),
    }),
    async execute(_id, { old_text, new_text }) {
      if (old_text.length > MAX_EDIT_OLD || new_text.length > MAX_EDIT_NEW)
        throw new Error(
          `edit too large (old_text ${old_text.length}/${MAX_EDIT_OLD}, new_text ${new_text.length}/${MAX_EDIT_NEW} characters); split it into smaller edits, or write the whole file again with write_file`,
        );
      const target = abs();
      if (!existsSync(target))
        throw new Error(`${file} does not exist yet: write it with write_file`);
      const body = readFileSync(target, "utf8");
      const count = body.split(old_text).length - 1;
      if (count !== 1)
        throw new Error(
          `old_text occurs ${count} times in ${file}; it must occur exactly once.${count === 0 ? nearestLine(body, old_text) : " Include more surrounding text."}`,
        );
      await writeFile(
        target,
        body.replace(old_text, () => new_text),
      );
      return text(`edited ${file}`);
    },
  });
  return { writeFile: writeBeat, editFile: editBeat };
}
