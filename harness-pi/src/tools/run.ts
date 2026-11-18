// The commands the Splash skills tell an agent to run, as named tools with flat arguments (Gemma 4
// garbles long multi-line tool arguments, llama.cpp #29655). Every argument that becomes part of a
// path is checked against a closed shape, so no argument can choose a flag or leave the story.
// run_script stays the one open door: the skills' JS helpers (resolveGrounding, writeStoryboardAtomic,
// formatPalette, ...) have no CLI. Its code, like every component a render executes, is model-authored
// and runs unconfined: the tool layer bounds where files are written, not what that code does.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { Bases } from "./fs.ts";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const PAGE = /^[a-z0-9][a-z0-9._-]*$/;
const OUTPUT_TAIL = 4_000;
/** Every child's full output, under the run root: the model sees a tail, the log keeps the rest. */
export const CHILD_LOG = "child-output.log";
// A map video renders in up to 7.5 minutes on the target Mac (its runner stops Remotion itself at 8).
const TIMEOUT_MS = 12 * 60_000;

function checked(value: string, shape: RegExp, what: string): string {
  if (!shape.test(value) || value.includes(".."))
    throw new Error(`${what} "${value}" must match ${shape}`);
  return value;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Killed by its time limit: a render that never finished, not one that refused. */
  timedOut?: boolean;
}

function killTree(pid: number) {
  const children = Bun.spawnSync(["pgrep", "-P", String(pid)])
    .stdout.toString()
    .split("\n")
    .filter(Boolean);
  for (const child of children) killTree(Number(child));
  try {
    process.kill(pid, "SIGKILL");
  } catch {}
}

export async function runCommand(
  argv: string[],
  bases: Bases,
  env: Record<string, string> = {},
  timeoutMs = TIMEOUT_MS,
): Promise<RunResult> {
  const proc = Bun.spawn(argv, {
    cwd: bases.root,
    env: { ...process.env, SPLASH_SKILLS: join(bases.root, "skills"), ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  // The whole tree: killing bun alone left a render's Remotion and Chrome children running.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killTree(proc.pid);
  }, timeoutMs);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);
  return timedOut
    ? {
        exitCode,
        stdout,
        stderr: `${stderr}\nkilled after ${Math.round(timeoutMs / 60_000)} min: the command never finished`,
        timedOut,
      }
    : { exitCode, stdout, stderr };
}

/** The reason a run stops when its final render hung: another craft session on the same kit would hang again. */
export function hungRender(
  r: RunResult,
  beat: string,
  minutes: number,
): string | null {
  return r.timedOut
    ? `the render of beats/${beat} never finished (killed after ${minutes} min): a hang in the kit, not a refusal beat.mjs can fix`
    : null;
}

export function report(argv: string[], r: RunResult) {
  // A tail that drops output says how much and where the rest is (Tom, REMI §4: no dropped input unsaid).
  const tail = (s: string) =>
    s.length > OUTPUT_TAIL
      ? `[${s.length - OUTPUT_TAIL} earlier chars dropped; full output in ${CHILD_LOG}]\n…${s.slice(-OUTPUT_TAIL)}`
      : s;
  const body = [`$ ${argv.slice(1).join(" ")}`, `exit ${r.exitCode}`];
  if (r.stdout.trim()) body.push(`stdout:\n${tail(r.stdout.trim())}`);
  // Bun prints the source excerpt before the error line; the reason goes first so a tail never hides it.
  const reason = r.stderr
    .split("\n")
    .find((l) =>
      /^\s*(error|Error|TypeError|ReferenceError|SyntaxError)\b/.test(l),
    );
  if (reason) body.push(`error: ${reason.replace(/^\s*error:\s*/, "").trim()}`);
  // A check that compares a raw division with the takeaway's rounded figure (232.954… vs 233).
  if (reason && /\d+\.\d{4,}/.test(reason) && /expected|not|but/i.test(reason))
    body.push(
      "hint: compare at the takeaway's precision in check(), e.g. Math.round(value) === 233, not the raw division.",
    );
  if (r.stderr.trim()) body.push(`stderr:\n${tail(r.stderr.trim())}`);
  return {
    content: [{ type: "text" as const, text: body.join("\n") }],
    details: { exitCode: r.exitCode },
    isError: r.exitCode !== 0,
  };
}

/** A beat is named by its folder under the story's beats/; a path ending in that folder is accepted. */
export function beatDir(bases: Bases, beat: string): string {
  // A file inside the beat names its folder: Qwen3.5-9B rendered "beats/1/beat.mjs" (tile cartogram, 2026-11-15).
  const inside = beat.match(/(?:^|\/)beats\/([^/]+)\/[^/]+\.[a-z]+$/i);
  if (inside) beat = inside[1];
  const name = beat.replace(/\/+$/, "").split("/").pop() ?? "";
  if (beat.includes("/") && !/(^|\/)beats\/[^/]+\/?$/.test(beat)) {
    throw new Error(
      `beat "${beat}" is not under this story's beats/: in a story, a beat is a folder name such as "1-lisboa-share" (it lives at beats/1-lisboa-share)`,
    );
  }
  return join(bases.storyDir, "beats", checked(name, SLUG, "beat"));
}

export function shotsDir(bases: Bases, beat: string): string {
  return join(bases.storyDir, ".harness", "shots", checked(beat, SLUG, "beat"));
}

/**
 * What a kit refusal leaves unsaid. A map kit asked for "shorter forms" and the 12B shortened the
 * title's only form, which the takeaway guard then refused: the forms are a list, longest first, and the
 * shorter ones go after the takeaway, not in its place. A standfirst with one form then left the headline as
 * the only thing the plate could shorten, and the delivered map lost the takeaway.
 */
/** Whether the kit's page draws limits' last form on a phone (connected-scatter web does; most kits draw only the first). */
export function drawsLastLimits(dir: string): boolean {
  const kit = join(dir, "render-beat.mjs");
  return (
    existsSync(kit) &&
    /\[beat\.limits\]\.flat\(\)\.at\(-1\)/.test(readFileSync(kit, "utf8"))
  );
}

export function refusalHint(
  output: string,
  record?: string,
  drawsLastLimits = true,
): string {
  // A recorded staging is the one the kit reads: Qwen3.5-9B fixed beat.mjs's gestures three times against a refusal of
  // gestures.json's note (tile cartogram, 2026-11-15) and the craft step stopped on the same refusal.
  const gesture = output.match(/REFUSED — (gestures(?:\[\d+\])?(?:\.\w+)?)/);
  if (gesture && record)
    return `\nhint: the staging the kit reads is ${record}, written by record_gestures; beat.mjs's gestures are not read. Fix ${gesture[1]} by calling record_gestures again with the whole list.`;
  // Twice the 12B's small edits added a declaration without removing the old one ("rows", then "whole"),
  // and it went on editing around the error.
  const twice = output.match(/"([^"]+)" has already been declared/);
  if (twice)
    return `\nhint: beat.mjs declares "${twice[1]}" twice — an edit added a declaration without removing the old one. Read beat.mjs, then rewrite it whole with write_file, each name declared once.`;
  const phone = output.match(
    /phone \d+x\d+: no vertical scroll[^\n]*?overflow (\d+)px/,
  );
  if (phone && !drawsLastLimits)
    return `\nhint: the failures are the phone frame's height, not a label: on a phone the page is ${phone[1]}px too tall. Shorten limits' first form and reading — this page draws only the first form of each. The title's first form stays the journalist's takeaway, word for word.`;
  if (phone)
    return `\nhint: the failures are the phone frame's height, not a label: on a phone the page is ${phone[1]}px too tall. Make limits a list and add a shorter form AFTER the first one — the phone draws the last form; shorten reading too. The title's first form stays the journalist's takeaway, word for word.`;
  return /shorter forms/i.test(output)
    ? "\nhint: the copy fields (title, limits, callout, reading, …) are lists of forms, longest first. Add shorter forms AFTER the first one, to limits and reading first: the plate shortens those before the headline. The title's first form stays the journalist's takeaway, word for word."
    : "";
}

/** The text from the bracket at `at` to the one that closes it (or to the end). Quotes are not tracked: a stray bracket
 *  in a string only widens or narrows the scope a hint searches, it never makes a hint lie about what it found. */
function balanced(src: string, at: number): string {
  let depth = 0;
  for (let i = at; i < src.length; i += 1) {
    if ("([{".includes(src[i])) depth += 1;
    else if (")]}".includes(src[i]) && --depth === 0)
      return src.slice(at, i + 1);
  }
  return src.slice(at);
}

/** A data.json row is a list: read by a column name it is undefined. Qwen3.5-9B read r["entity_fr"] and its own check
 *  then refused "CHN has no French name in data.json" twice (gx-lollipop scrolly, 2026-11-17), searching data.json
 *  instead of its access. Rows are the parameters of data.rows' callbacks and loops; returns "" when none is read so. */
export function rowByNameHint(dir: string): string {
  const beat = join(dir, "beat.mjs");
  const data = join(dir, "data.json");
  if (!existsSync(beat) || !existsSync(data)) return "";
  let columns: string[];
  try {
    columns = (JSON.parse(readFileSync(data, "utf8")).columns ?? []).map(
      (c: { name: string }) => c.name,
    );
  } catch {
    return "";
  }
  const src = readFileSync(beat, "utf8");
  // A row name is read only where it holds a raw row: the callback a .rows method was handed, or the loop over .rows.
  // The same name elsewhere is often the object that row was mapped to (gx-locator web, mvq57).
  const scopes: { row: string; text: string }[] = [
    ...[...src.matchAll(/\.rows\.\w+(\(\s*\(?\s*(\w+))/g)].map((m) => ({
      row: m[2],
      text: balanced(src, m.index! + m[0].length - m[1].length),
    })),
    ...[
      ...src.matchAll(
        /for\s*(\(\s*(?:const|let)\s+(\w+)\s+of\s+[\w.]*rows\b)/g,
      ),
    ].map((m) => {
      const head = m.index! + m[0].length - m[1].length;
      const after = head + balanced(src, head).length;
      const open = src.slice(after).match(/^\s*\{/);
      return {
        row: m[2],
        text: open
          ? balanced(src, after + open[0].length - 1)
          : src.slice(after).split(/;|\n/)[0],
      };
    }),
  ];
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const { row, text } of scopes)
    for (const name of columns) {
      const read = text.match(
        new RegExp(
          `\\b${esc(row)}(\\[(["'\`])${esc(name)}\\2\\]|\\.${esc(name)}\\b)`,
        ),
      );
      if (read)
        return `\nhint: a data.json row is a list, so ${read[0]} is undefined: read a column by its index — const ${name.toUpperCase().replace(/\W/g, "_")} = col(${JSON.stringify(name)}); then ${row}[${name.toUpperCase().replace(/\W/g, "_")}] — the worked example's col() returns that index; written in place, ${row}[col(${JSON.stringify(name)})].`;
    }
  return "";
}

/** "${X}" in plain quotes prints as is: JavaScript fills ${…} only between backticks. Qwen3.5-9B wrote
 *  mark: "Espagne · ${ADDED}" and the refusal gave the drawn row, never the quotes (gx-stacked-bar web, 2026-11-17).
 *  Lines holding a backtick are skipped: a quote inside a template literal is text, not a string's edge. */
export function quotedTemplateHint(dir: string): string {
  const beat = join(dir, "beat.mjs");
  if (!existsSync(beat)) return "";
  for (const line of readFileSync(beat, "utf8").split("\n")) {
    if (line.includes("`")) continue;
    const hit = line.match(
      /(["'])(?:(?!\1)[^\\\n])*\$\{[^}]+\}(?:(?!\1)[^\\\n])*\1/,
    );
    if (hit)
      return `\nhint: ${hit[0]} is in plain quotes, so the page prints its \${…} as is: JavaScript fills \${…} only between backticks — write it \`${hit[0].slice(1, -1)}\``;
  }
  return "";
}

/** A line holding only a quote after the closing "};" is never code (gx-bullet web, 12B, 2026-11-13: told to delete
 *  it, the 12B edited template strings elsewhere through three passes). Removed before rendering; returns what it did. */
export function trimStrayTail(file: string): string {
  if (!existsSync(file)) return "";
  const lines = readFileSync(file, "utf8").split("\n");
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  if (end > 0 && /^\s*\};?\s*[`'"]\s*[,;]?\s*$/.test(lines[end - 1])) {
    const at = end;
    lines[end - 1] = lines[end - 1].replace(/(\};?)\s*[`'"]\s*[,;]?\s*$/, "$1");
    writeFileSync(file, `${lines.slice(0, end).join("\n")}\n`);
    return `the harness removed the quote after the closing "};" on line ${at} of beat.mjs\n`;
  }
  const removed: number[] = [];
  while (end > 1 && /^\s*[`'"]\s*[,;]?\s*$/.test(lines[end - 1])) {
    let prev = end - 2;
    while (prev >= 0 && lines[prev].trim() === "") prev--;
    if (prev < 0 || !/^\s*\};?\s*$/.test(lines[prev])) break;
    removed.push(end);
    end = prev + 1;
  }
  if (!removed.length) return "";
  writeFileSync(file, `${lines.slice(0, end).join("\n")}\n`);
  return `the harness removed line ${removed.reverse().join(", ")} of beat.mjs: a lone quote (and its comma) after the closing "};"\n`;
}

/** gx-connected-scatter web (12B, mvg8, 2026-11-18): an edit rewrote check()'s tail and left the old tail after its
 *  closing "},"; the file stopped parsing and the 12B spent its remaining 30 minutes editing around it. A block that
 *  sits between two closing braces, repeats at least half the lines before it, and whose removal makes the file
 *  parse is a stale copy, never meant code: the harness removes it before rendering; returns what it did. */
export function trimDuplicatedTail(file: string): string {
  if (!existsSync(file)) return "";
  const transpiler = new Bun.Transpiler({ loader: "js" });
  const parses = (text: string) => {
    try {
      transpiler.transformSync(text);
      return true;
    } catch {
      return false;
    }
  };
  const text = readFileSync(file, "utf8");
  if (parses(text)) return "";
  const lines = text.split("\n");
  const closes = lines.flatMap((line, i) =>
    /^\s*\},?\s*$/.test(line) ? [i] : [],
  );
  for (let k = 0; k + 1 < closes.length; k++) {
    const [i, j] = [closes[k], closes[k + 1]];
    const block = lines
      .slice(i + 1, j)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!block.length) continue;
    const before = new Set(lines.slice(0, i).map((l) => l.trim()));
    if (block.filter((l) => before.has(l)).length * 2 < block.length) continue;
    const kept = [...lines.slice(0, i + 1), ...lines.slice(j + 1)].join("\n");
    if (!parses(kept)) continue;
    writeFileSync(file, kept);
    return `the harness removed lines ${i + 2}–${j + 1} of beat.mjs: a stale copy of the lines before line ${i + 1}, left after its closing brace\n`;
  }
  return "";
}

/** gx-connected-scatter web (12B, mvg9, 2026-11-18): each edit of check() left the file ending on "}," with the
 *  export object's closing "};" gone, refused twice. When appending that one line makes the file parse, nothing
 *  else was lost: the harness appends it before rendering; returns what it did. */
export function closeOpenExport(file: string): string {
  if (!existsSync(file)) return "";
  const transpiler = new Bun.Transpiler({ loader: "js" });
  const parses = (text: string) => {
    try {
      transpiler.transformSync(text);
      return true;
    } catch {
      return false;
    }
  };
  const text = readFileSync(file, "utf8");
  if (parses(text)) return "";
  const closed = `${text.replace(/\s*$/, "")}\n};\n`;
  if (!parses(closed)) return "";
  writeFileSync(file, closed);
  return `the harness added "};" at the end of beat.mjs: the export object was never closed\n`;
}

/** An unquoted object key with a space (`Czech Republic: "Tchéquie"`) never parses. Told the quoted key six times,
 *  Qwen3.5-9B rewrote the file with the same line (gx-proportional-symbol web, 2026-11-14). Quoting a key changes no
 *  meaning: the harness quotes each one the parser stops at, before rendering; returns what it did. */
/**
 * A field written as a YAML list of forms ("limits:" then "- `long`" / "- `short`" lines) parses as JS — each "- `x`"
 * is unary or binary minus on a string — and the page prints NaN (gx-lollipop web, 12B, 2026-11-18). Rewrite each such
 * field as an array of its forms; an item continues on the next line while its line ends with "+".
 */
export function listifyDashedForms(file: string): string {
  if (!existsSync(file)) return "";
  const lines = readFileSync(file, "utf8").split("\n");
  const item = /^\s*-\s+[`"']/;
  const out: string[] = [];
  const fixed: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const head = /^(\s*)([A-Za-z_$][\w$]*|"[^"]+"):\s*$/.exec(lines[i]);
    if (!head || !item.test(lines[i + 1] ?? "")) {
      out.push(lines[i]);
      continue;
    }
    const forms: string[][] = [];
    let k = i + 1;
    for (; k < lines.length; k++) {
      const line = lines[k];
      const last = forms.at(-1);
      if (item.test(line)) forms.push([line.replace(/^\s*-\s+/, "")]);
      else if (/^\s*,\s*$/.test(line)) {
        k++;
        break;
      } else if (last && /\+\s*$/.test(last.at(-1) ?? "")) last.push(line);
      else break;
    }
    const tail = forms.at(-1)!;
    tail[tail.length - 1] = tail[tail.length - 1].replace(/,\s*$/, "");
    out.push(
      `${head[1]}${head[2]}: [`,
      ...forms.map((f) => `${head[1]}  ${f.join("\n")},`),
      `${head[1]}],`,
    );
    fixed.push(head[2]);
    i = k - 1;
  }
  if (!fixed.length) return "";
  const text = out.join("\n");
  try {
    new Bun.Transpiler({ loader: "js" }).transformSync(text);
  } catch {
    return "";
  }
  writeFileSync(file, text);
  return `the harness rewrote ${fixed.join(", ")} in beat.mjs as a list of forms ([\`long\`, \`short\`]): a "- " line is JS minus, not a list item, and the page printed NaN\n`;
}

export function quoteSpacedKeys(file: string): string {
  if (!existsSync(file)) return "";
  const transpiler = new Bun.Transpiler({ loader: "js" });
  let text = readFileSync(file, "utf8");
  const quoted: string[] = [];
  for (let pass = 0; pass < 50; pass++) {
    let errors: { message?: string; position?: { line?: number } }[] = [];
    try {
      transpiler.transformSync(text);
      break;
    } catch (error) {
      errors = (error as { errors?: typeof errors })?.errors ?? [];
    }
    const first = errors[0];
    const word = /^Expected "\}" but found "([A-Za-z][\w-]*)"$/.exec(
      String(first?.message ?? ""),
    )?.[1];
    const at = (first?.position?.line ?? 0) - 1;
    const lines = text.split("\n");
    if (!word || at < 0 || at >= lines.length) break;
    const key = new RegExp(
      `(^\\s*|[{,]\\s*)((?:[A-Za-z][\\w-]* )+${word})(\\s*:)`,
    );
    const found = key.exec(lines[at]);
    if (!found) break;
    lines[at] = lines[at].replace(key, `$1"$2"$3`);
    quoted.push(found[2]);
    text = lines.join("\n");
  }
  if (!quoted.length) return "";
  writeFileSync(file, text);
  return `the harness quoted the keys ${quoted.map((k) => `"${k}"`).join(", ")} in beat.mjs: a key with a space needs quotes\n`;
}

export function runTools(bases: Bases) {
  const skill = (name: string, script: string) =>
    join(bases.root, "skills", name, "scripts", script);
  const exec = async (argv: string[]) => {
    const r = await runCommand(argv, bases);
    await appendFile(
      join(bases.root, CHILD_LOG),
      `=== ${new Date().toISOString()} $ ${argv.slice(1).join(" ")}\nexit ${r.exitCode}\n--- stdout\n${r.stdout}\n--- stderr\n${r.stderr}\n`,
    ).catch(() => {});
    return report(argv, r);
  };

  const scaffoldStatic = defineTool({
    name: "scaffold_static_beat",
    label: "Scaffold static beat",
    description:
      "Scaffold a static chart beat from a type's worked example (chart-beat step 2). type is a file name under skills/chart-beat/references/types/ without .md.",
    parameters: Type.Object({
      type: Type.String(),
      beat: Type.String(),
      component: Type.String(),
    }),
    async execute(_id, { type, beat, component }) {
      return exec([
        "bun",
        skill("chart-beat", "scaffold-static-beat.mjs"),
        "--type",
        checked(type, SLUG, "type"),
        "--beat",
        beatDir(bases, beat),
        "--component",
        checked(component, PASCAL, "component"),
      ]);
    },
  });

  const scaffoldWeb = defineTool({
    name: "scaffold_web_beat",
    label: "Scaffold web beat",
    description:
      "Scaffold a web chart beat from the story's static beat (chart-web). static_beat is that beat's folder name.",
    parameters: Type.Object({
      type: Type.String(),
      beat: Type.String(),
      static_beat: Type.String(),
      component: Type.String(),
    }),
    async execute(_id, { type, beat, static_beat, component }) {
      return exec([
        "bun",
        skill("chart-web", "scaffold-web-beat.mjs"),
        "--type",
        checked(type, SLUG, "type"),
        "--beat",
        beatDir(bases, beat),
        "--static",
        beatDir(bases, static_beat),
        "--component",
        checked(component, PASCAL, "component"),
      ]);
    },
  });

  const render = defineTool({
    name: "render_beat",
    label: "Render beat",
    description:
      "Render a beat. A beat prepared from a zone kit renders through its render-beat.mjs in any format: static (PNG+SVG), web (HTML + screenshots), video (look stills, then the mp4), scrolly (the page + one screenshot per card). Otherwise static runs render-directions.mjs and web render-directions-web.mjs. Then look at the PNG it names.",
    parameters: Type.Object({ beat: Type.String(), format: Type.String() }),
    async execute(_id, { beat, format }) {
      // A beat the harness prepared for zone writing renders through its generic runner.
      // A beat the harness prepared from a zone kit renders through the kit's runner, in any format.
      const zoned = existsSync(join(beatDir(bases, beat), "render-beat.mjs"));
      const runner = zoned
        ? "render-beat.mjs"
        : { static: "render-directions.mjs", web: "render-directions-web.mjs" }[
            format
          ];
      if (!runner)
        throw new Error(`format must be "static" or "web", not "${format}"`);
      const path = join(beatDir(bases, beat), runner);
      if (!existsSync(path))
        throw new Error(`${beat} has no ${runner}; scaffold the beat first`);
      if (zoned && !existsSync(join(beatDir(bases, beat), "beat.mjs")))
        throw new Error(
          `beats/${beat}/beat.mjs does not exist yet: write it with write_file, then render`,
        );
      const trimmed = zoned
        ? trimStrayTail(join(beatDir(bases, beat), "beat.mjs")) +
          trimDuplicatedTail(join(beatDir(bases, beat), "beat.mjs")) +
          closeOpenExport(join(beatDir(bases, beat), "beat.mjs")) +
          listifyDashedForms(join(beatDir(bases, beat), "beat.mjs")) +
          quoteSpacedKeys(join(beatDir(bases, beat), "beat.mjs"))
        : "";
      const result = await exec(["bun", path]);
      const record =
        zoned && existsSync(join(beatDir(bases, beat), "gestures.json"))
          ? `beats/${beat}/gestures.json`
          : undefined;
      const failed = /REFUSED|Error|error:/.test(result.content[0].text);
      result.content[0].text =
        trimmed +
        result.content[0].text +
        refusalHint(
          result.content[0].text,
          record,
          !zoned || drawsLastLimits(beatDir(bases, beat)),
        ) +
        (zoned && failed
          ? rowByNameHint(beatDir(bases, beat)) +
            quotedTemplateHint(beatDir(bases, beat))
          : "");
      // Name every PNG the render wrote by its full path, so the next call can look at it.
      const renders = join(beatDir(bases, beat), "renders");
      if (existsSync(renders)) {
        const pngs = readdirSync(renders)
          .filter((f) => f.endsWith(".png"))
          .map((f) => join(renders, f));
        if (pngs.length)
          result.content[0].text += `\nlook at: ${pngs.join(", ")}`;
      }
      return result;
    },
  });

  const verifyWeb = defineTool({
    name: "verify_web",
    label: "Verify web page",
    description:
      "Run the Chrome-driven checks on a rendered web page (renders/<page>.html) and write screenshots to .harness/shots/<beat>/ for you to look at.",
    parameters: Type.Object({ beat: Type.String(), page: Type.String() }),
    async execute(_id, { beat, page }) {
      const file = join(
        beatDir(bases, beat),
        "renders",
        `${checked(page, PAGE, "page")}.html`,
      );
      if (!existsSync(file))
        throw new Error(
          `${beat}/renders/${page}.html does not exist; render the beat first`,
        );
      const out = shotsDir(bases, beat);
      await mkdir(out, { recursive: true });
      return exec([
        "bun",
        join(bases.root, "skills", "chart-web", "scripts", "verify-web.mjs"),
        "--file",
        file,
        "--shots",
        "--out",
        out,
      ]);
    },
  });

  const buildData = defineTool({
    name: "build_data",
    label: "Build beat data",
    description:
      "Run the analyst for one storyboard slot: writes beats/<id>/data.json and DATA-NOTES.md.",
    parameters: Type.Object({ slot: Type.String() }),
    async execute(_id, { slot }) {
      return exec([
        "bun",
        skill("analyst", "build-data.mjs"),
        bases.storyDir,
        checked(slot, SLUG, "slot"),
      ]);
    },
  });

  let scriptCount = 0;
  const runScript = defineTool({
    name: "run_script",
    label: "Run script",
    description: `Run a short JavaScript module with Bun, for the skills' JS helpers that have no command line. Import them by absolute path under ${join(bases.root, "skills")}. The working directory is the Splash root ${bases.root}.`,
    parameters: Type.Object({ code: Type.String() }),
    async execute(_id, { code }) {
      const dir = join(bases.storyDir, ".harness", "scripts");
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${Date.now()}-${++scriptCount}.mjs`);
      await writeFile(file, code);
      return exec(["bun", file]);
    },
  });

  return {
    scaffoldStatic,
    scaffoldWeb,
    render,
    verifyWeb,
    buildData,
    runScript,
  };
}
