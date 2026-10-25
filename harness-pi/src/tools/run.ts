// The commands the Splash skills tell an agent to run, as named tools with flat arguments (Gemma 4
// garbles long multi-line tool arguments, llama.cpp #29655). Every argument that becomes part of a
// path is checked against a closed shape, so no argument can choose a flag or leave the story.
// run_script stays the one open door: the skills' JS helpers (resolveGrounding, writeStoryboardAtomic,
// formatPalette, ...) have no CLI. Its code, like every component a render executes, is model-authored
// and runs unconfined: the tool layer bounds where files are written, not what that code does.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { Bases } from "./fs.ts";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const PAGE = /^[a-z0-9][a-z0-9._-]*$/;
const OUTPUT_TAIL = 4_000;
const TIMEOUT_MS = 5 * 60_000;

function checked(value: string, shape: RegExp, what: string): string {
  if (!shape.test(value) || value.includes(".."))
    throw new Error(`${what} "${value}" must match ${shape}`);
  return value;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCommand(
  argv: string[],
  bases: Bases,
): Promise<RunResult> {
  const proc = Bun.spawn(argv, {
    cwd: bases.root,
    env: { ...process.env, SPLASH_SKILLS: join(bases.root, "skills") },
    stdout: "pipe",
    stderr: "pipe",
  });
  const timer = setTimeout(() => proc.kill(), TIMEOUT_MS);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);
  return { exitCode, stdout, stderr };
}

function report(argv: string[], r: RunResult) {
  const tail = (s: string) =>
    s.length > OUTPUT_TAIL ? `…${s.slice(-OUTPUT_TAIL)}` : s;
  const body = [`$ ${argv.slice(1).join(" ")}`, `exit ${r.exitCode}`];
  if (r.stdout.trim()) body.push(`stdout:\n${tail(r.stdout.trim())}`);
  if (r.stderr.trim()) body.push(`stderr:\n${tail(r.stderr.trim())}`);
  return {
    content: [{ type: "text" as const, text: body.join("\n") }],
    details: { exitCode: r.exitCode },
    isError: r.exitCode !== 0,
  };
}

/** A beat is named by its folder under the story's beats/; a path ending in that folder is accepted. */
export function beatDir(bases: Bases, beat: string): string {
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

export function runTools(bases: Bases) {
  const skill = (name: string, script: string) =>
    join(bases.root, "skills", name, "scripts", script);
  const exec = async (argv: string[]) =>
    report(argv, await runCommand(argv, bases));

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
      "Render a beat: format 'static' runs render-directions.mjs (PNG+SVG into renders/), 'web' runs render-directions-web.mjs (HTML into renders/). Then look at the result.",
    parameters: Type.Object({ beat: Type.String(), format: Type.String() }),
    async execute(_id, { beat, format }) {
      const runner = {
        static: "render-directions.mjs",
        web: "render-directions-web.mjs",
      }[format];
      if (!runner)
        throw new Error(`format must be "static" or "web", not "${format}"`);
      const path = join(beatDir(bases, beat), runner);
      if (!existsSync(path))
        throw new Error(`${beat} has no ${runner}; scaffold the beat first`);
      return exec(["bun", path]);
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
