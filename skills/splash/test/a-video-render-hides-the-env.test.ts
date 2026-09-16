/**
 * EVERY RENDER THAT SPAWNS `remotion` HIDES THE REPOSITORY'S SECRETS FROM THE PAGE.
 *
 * Remotion's own `get-env.js` reads the repository's `.env` and injects EVERY variable in it into
 * the render page's `process.env` — this repo's MapTiler, Datawrapper, Gemini and Cloudflare keys
 * among them (measured, `task-4-report.md` finding 1) — unless the spawn is given an `--env-file`.
 * An EMPTY `--env-file` is the one argument that turns that off; a script that spawns `remotion`
 * without one hands a composition no one asked for a key it should never see.
 *
 * WHAT THIS SCANS. Every source file under `skills/`, EXCEPT its `test/` directories — a render
 * script never lives there, and a guard's own fixture strings (this file's own scanner cases below)
 * would otherwise read as the very spawns they exist to exercise — and every file inside a beat
 * directory under `proof/` that contains `render-directions-video.mjs`. A file "spawns remotion"
 * when it calls `spawnSync(`, `spawn(` or
 * `Bun.spawn(` with a first argument that resolves to the `remotion` binary: a literal ending in
 * `.bin/remotion`, a bare literal `"remotion"`, an array whose first element is either of those, or
 * a local variable assigned from either shape earlier in the same file (the pattern every render
 * script in this tree actually uses: `const binary = join(PACKAGE_ROOT,
 * "node_modules/.bin/remotion")`, then `spawnSync(binary, args, …)`). The call is read as balanced
 * parentheses from the opening one, so its full argument list — however many lines it spans — is
 * what is checked for `--env-file=`.
 *
 * WHAT IT PROVABLY DOES NOT CATCH: a binary path built at runtime by string concatenation rather
 * than assignment-then-reference (`spawnSync(dir + "/remotion", …)`); an `--env-file` supplied
 * through a variable built somewhere else in the file rather than written inline in the call
 * (`spawnSync(binary, [...args, envFlag])` — this reads `args`' and `envFlag`'s OWN text only if
 * they are string literals inside the same call, never a separately-declared array spread in from
 * elsewhere); and a binary resolved through an alias or indirection this text scan cannot follow —
 * the same class of blind spot `no-cross-skill-imports.test.ts` documents for import specifiers.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;

function* walk(dir: string, { skipTest = false } = {}): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    if (skipTest && entry.name === "test") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path, { skipTest });
    else if (entry.isFile() && SOURCE.test(entry.name)) yield path;
  }
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Every `NAME` a top-level (or nested) `const`/`let`/`var` binds, with the RIGHT-HAND SIDE text —
 *  just far enough to answer "was this built from the remotion binary". Deliberately not a real
 *  parser: it stops the RHS at the first top-level `;` or newline that is not inside an open
 *  bracket, which is exactly how every render script in this tree writes the assignment. */
function variableBindings(code: string): Map<string, string> {
  const bindings = new Map<string, string>();
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    let rhs = "";
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        rhs += c;
        if (c === "\\") {
          rhs += code[++i] ?? "";
          continue;
        }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        rhs += c;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") {
        if (depth === 0) break;
        depth--;
      } else if ((c === ";" || c === "\n") && depth === 0) break;
      rhs += c;
    }
    bindings.set(m[1], rhs);
  }
  return bindings;
}

/** Does `text` name the `remotion` binary — directly, or (one level deep, for an array's first
 *  element) as a bare literal or a variable this file built from one? */
function namesRemotionBinary(
  text: string,
  bindings: Map<string, string>,
): boolean {
  const trimmed = text.trim();
  if (/\.bin\/remotion\b/.test(trimmed)) return true;
  if (/["'`]remotion["'`]/.test(trimmed)) return true;
  const arrayFirst = /^\[\s*([^,\]]+)/.exec(trimmed);
  if (arrayFirst) return namesRemotionBinary(arrayFirst[1], bindings);
  const ident = /^([A-Za-z_$][\w$]*)$/.exec(trimmed);
  if (ident) {
    const rhs = bindings.get(ident[1]);
    if (rhs !== undefined) return namesRemotionBinary(rhs, bindings);
  }
  return false;
}

/** The full text of the argument list of every `spawnSync(`/`spawn(`/`Bun.spawn(` call — balanced
 *  from the opening parenthesis, so a call spanning many lines is read whole. */
function spawnCalls(code: string): string[] {
  const calls: string[] = [];
  const re = /\b(?:spawnSync|spawn|Bun\.spawn)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length;
    let depth = 1;
    let quote: string | null = null;
    const start = i;
    for (; i < code.length && depth > 0; i++) {
      const c = code[i];
      if (quote) {
        if (c === "\\") {
          i++;
          continue;
        }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(") depth++;
      else if (c === ")") depth--;
    }
    calls.push(code.slice(start, i - 1));
  }
  return calls;
}

/** The first top-level argument of a call's argument-list text (up to the first comma that is not
 *  inside a nested bracket or a string). */
function firstArgument(argsText: string): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < argsText.length; i++) {
    const c = argsText[i];
    if (quote) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) return argsText.slice(0, i);
  }
  return argsText;
}

/** Every remotion spawn in `source` that carries no `--env-file=` argument, as a short label a
 *  failure can name. `[]` when the file spawns remotion nowhere, or spawns it only with the flag. */
export function remotionSpawnsWithoutEnvFile(source: string): string[] {
  const code = stripComments(source);
  const bindings = variableBindings(code);
  const offenders: string[] = [];
  for (const call of spawnCalls(code)) {
    if (!namesRemotionBinary(firstArgument(call), bindings)) continue;
    if (!call.includes("--env-file=")) offenders.push(call.trim().slice(0, 80));
  }
  return offenders;
}

describe("the scanner", () => {
  it("should find a remotion spawn through a binary variable with no --env-file", () => {
    const source = `
      const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
      const result = spawnSync(binary, ["still", ENTRY], { cwd: PACKAGE_ROOT });
    `;
    expect(remotionSpawnsWithoutEnvFile(source)).toHaveLength(1);
  });

  it("should accept a remotion spawn through a binary variable that carries --env-file", () => {
    const source = `
      const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
      const result = spawnSync(binary, ["still", ENTRY, \`--env-file=\${envFile}\`], { cwd: PACKAGE_ROOT });
    `;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });

  it("should find a bare-literal remotion spawn with no --env-file", () => {
    const source = `Bun.spawn(["remotion", "render", ENTRY, out], { cwd: ROOT });`;
    expect(remotionSpawnsWithoutEnvFile(source)).toHaveLength(1);
  });

  it("should accept a bare-literal remotion spawn that carries --env-file", () => {
    const source = `Bun.spawn(["remotion", "render", ENTRY, out, \`--env-file=\${envFile}\`], { cwd: ROOT });`;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });

  it("should not flag a spawn of a different binary", () => {
    const source = `Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], { cwd: ROOT });`;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });

  it("should not flag a file that never spawns anything", () => {
    const source = `export const binary = "node_modules/.bin/remotion";`;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });

  it("should not read a spawn written in a comment", () => {
    const source = `
      // spawnSync(binary, ["still"], {});
      const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
    `;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });

  it("should read a call spanning many lines as one argument list", () => {
    const source = `
      const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
      const result = spawnSync(
        binary,
        [
          "still",
          ENTRY,
          COMPOSITION,
          outputPath,
          \`--frame=\${LAST_FRAME}\`,
          "--timeout=120000",
          \`--env-file=\${envFile}\`,
        ],
        { cwd: PACKAGE_ROOT, stdio: "inherit" },
      );
    `;
    expect(remotionSpawnsWithoutEnvFile(source)).toEqual([]);
  });
});

/** Every file this guard is responsible for: source files under `skills/`, and every file inside a
 *  a beat directory under `proof/` that carries `render-directions-video.mjs` — a directed video beat. */
function watchedFiles(): string[] {
  const out: string[] = [];
  const skillsDir = join(ROOT, "skills");
  if (existsSync(skillsDir))
    for (const path of walk(skillsDir, { skipTest: true })) out.push(path);

  const proof = join(ROOT, "proof");
  if (existsSync(proof)) {
    for (const dir of readdirSync(proof)) {
      const beat = join(proof, dir);
      if (!existsSync(join(beat, "render-directions-video.mjs"))) continue;
      for (const path of walk(beat, { skipTest: true })) out.push(path);
    }
  }
  return out;
}

describe("every render that spawns remotion hides the env", () => {
  for (const path of watchedFiles()) {
    it(`${path.slice(ROOT.length + 1)} should pass --env-file on every remotion spawn`, () => {
      expect(remotionSpawnsWithoutEnvFile(readFileSync(path, "utf8"))).toEqual(
        [],
      );
    });
  }
});
