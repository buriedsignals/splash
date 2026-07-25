// Path-safety for the ONE destructive field of the host request: `outDir`.
//
// `lib/core/verbs/exec.ts`'s freshOutDir runs `rmSync(resolve(dir), {recursive:true,
// force:true})` on whatever string the payload carries. `lib/core/id-safety.ts` already
// states the principle for `id` — *no LLM-supplied identifier reaches a path resolution or
// delete without passing the slug guard* — and `outDir` is strictly more powerful: it is a
// whole path, not a name inside a base the caller controls.
//
// The guard lives HERE, at the façade, not inside render(). The legacy orchestrator builds
// its own outDir under a base it owns from an already-slug-checked id, so it is a trusted
// caller and its dispatch semantics must not change. The CLI is the new untrusted boundary:
// its request comes from a shell recipe, an agent, a local model — none of them behind an
// upstream gate.
//
// The project's shell-safety rule is explicit about the shape of a destructive operation:
// resolve the path, confirm it is inside the permitted base, probe non-destructively first,
// never a one-shot destroy. That is the order below.
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fail, type VerbResult } from "../core/verbs/types";

export type OutDirCheck =
  { ok: true; path: string } | { ok: false; message: string };

// How shallow is too shallow. A path with fewer than two segments below the filesystem
// root (`/`, `/etc`, `C:\`) is never an artifact directory and always something whose loss
// is unrecoverable.
const MIN_SEGMENTS = 2;

// Every filename the five producers write into an outDir, gathered from their own sources
// (`static.png`, `interactive.html`, `scrolly.html`, `<name>.mp4`, `config.json`,
// `native-source.json`, `report.json`, `source-manifest.json`, `a11y.png`,
// `responsive-<w>.png`, `contrast-<mode>.png`, `video-*-still.png`, `theme.png`,
// `<id>.png`, …) reduces to these four extensions — plus the one subdirectory any of them
// creates, `frames/`, for the video renderers. Anything else in the directory was NOT put
// there by a produce, so wiping it would destroy a host's own data.
const PRODUCIBLE_EXTENSIONS = new Set(["png", "html", "mp4", "json"]);
const PRODUCIBLE_DIRECTORIES = new Set(["frames"]);

// A produced filename is a plain artifact name: no separators, no leading dot, one of the
// extensions above.
const PRODUCIBLE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function segmentsOf(abs: string): string[] {
  return abs.split(sep).filter((s) => s.length > 0);
}

// Resolve as far as the filesystem actually goes, then re-attach the part that does not
// exist yet. `realpathSync` on the whole path throws for a not-yet-created outDir (the
// normal case), and resolving only the string would leave a symlinked ancestor unresolved —
// which is exactly how a guard like this gets walked around.
function resolveThroughSymlinks(abs: string): string {
  let cursor = abs;
  const missing: string[] = [];
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return abs; // reached the root without finding anything
    missing.unshift(basename(cursor));
    cursor = parent;
  }
  let real: string;
  try {
    real = realpathSync(cursor);
  } catch {
    real = cursor; // unreadable ancestor: judge the lexical path, never assume it is safe
  }
  return missing.length ? join(real, ...missing) : real;
}

function isAncestorOf(candidate: string, descendant: string): boolean {
  if (candidate === descendant) return false;
  return descendant.startsWith(
    candidate.endsWith(sep) ? candidate : candidate + sep,
  );
}

// Directories whose deletion is never what a render meant. Each is resolved through
// symlinks too, because on macOS `os.tmpdir()` is itself a symlinked path.
function protectedRoots(): string[] {
  const raw = [homedir(), tmpdir(), process.cwd()];
  const out = new Set<string>();
  for (const p of raw) {
    out.add(resolve(p));
    out.add(resolveThroughSymlinks(resolve(p)));
  }
  return [...out];
}

// The probe: what is already in there, and could a produce have written it? Read-only by
// construction — `readdirSync` + `statSync`, never a delete.
function unproducibleEntries(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (e) {
    return [`<unreadable: ${(e as Error).message}>`];
  }
  const strangers: string[] = [];
  for (const name of entries) {
    let isDir = false;
    try {
      isDir = statSync(join(dir, name)).isDirectory();
    } catch {
      strangers.push(name);
      continue;
    }
    if (isDir) {
      if (!PRODUCIBLE_DIRECTORIES.has(name)) strangers.push(`${name}/`);
      continue;
    }
    const ext = name.includes(".")
      ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
      : "";
    if (!PRODUCIBLE_NAME.test(name) || !PRODUCIBLE_EXTENSIONS.has(ext))
      strangers.push(name);
  }
  return strangers.sort();
}

// The whole guard, as a value. Never throws — the façade answers a non-JS host that has no
// `catch`, so a refusal has to be data all the way down.
export function checkOutDir(outDir: unknown): OutDirCheck {
  if (typeof outDir !== "string" || outDir.trim().length === 0)
    return {
      ok: false,
      message:
        "outDir must be a non-empty string naming an absolute directory path",
    };

  // An absolute path is the one requirement that cannot be relaxed: a relative outDir
  // resolves against the HOST's working directory, so `"."` would wipe wherever the host
  // happened to be standing.
  if (!isAbsolute(outDir))
    return {
      ok: false,
      message:
        `outDir "${outDir}" is not an absolute path — the contract wipes and recreates ` +
        `this directory, and a relative path resolves against the host's working ` +
        `directory rather than a location the request named`,
    };

  const abs = resolveThroughSymlinks(resolve(outDir));

  const segments = segmentsOf(abs);
  if (segments.length < MIN_SEGMENTS)
    return {
      ok: false,
      message:
        `outDir "${outDir}" resolves to "${abs}", which is a filesystem root or ` +
        `immediately below one — too shallow to be an artifact directory, and the ` +
        `contract would recursively delete it`,
    };

  for (const root of protectedRoots()) {
    if (abs === root)
      return {
        ok: false,
        message:
          `outDir "${outDir}" resolves to "${abs}", a directory the contract will not ` +
          `delete (a home, temp or working directory) — name a subdirectory instead`,
      };
    if (isAncestorOf(abs, root))
      return {
        ok: false,
        message:
          `outDir "${outDir}" resolves to "${abs}", which CONTAINS "${root}" — the ` +
          `contract would recursively delete a home, temp or working directory`,
      };
  }

  if (existsSync(abs)) {
    let isDir: boolean;
    try {
      isDir = statSync(abs).isDirectory();
    } catch (e) {
      return {
        ok: false,
        message: `outDir "${outDir}" cannot be inspected: ${(e as Error).message}`,
      };
    }
    if (!isDir)
      return {
        ok: false,
        message:
          `outDir "${outDir}" resolves to "${abs}", which exists and is not a ` +
          `directory — the contract only ever writes artifacts into a directory`,
      };
    // Probe BEFORE the destroy: a directory already holding things no produce writes is
    // somebody's data, not a stale render.
    const strangers = unproducibleEntries(abs);
    if (strangers.length)
      return {
        ok: false,
        message:
          `outDir "${outDir}" resolves to "${abs}", which already holds ${strangers.length} ` +
          `entr${strangers.length === 1 ? "y" : "ies"} no produce writes ` +
          `(${strangers.slice(0, 5).join(", ")}${strangers.length > 5 ? ", …" : ""}) — ` +
          `the contract wipes outDir before rendering, so it refuses rather than delete ` +
          `content it did not create; point outDir at a new or previously produced directory`,
      };
  }

  return { ok: true, path: abs };
}

// The façade's use of the guard: a refusal in the SAME shape as any other verb refusal, so
// the CLI prints it as JSON with exit 1 and a host needs no second parser. `invalid-request`
// is the honest code — the request was malformed, no engine ever ran.
//
// Returns undefined when there is nothing to guard: a payload with no `outDir` string is
// either a different verb or a malformed render that runVerb's own shape gate will refuse
// with its own words.
export function outDirRefusal(payload: unknown): VerbResult<never> | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const outDir = (payload as Record<string, unknown>).outDir;
  if (typeof outDir !== "string") return undefined;
  const verdict = checkOutDir(outDir);
  return verdict.ok ? undefined : fail("invalid-request", verdict.message);
}
