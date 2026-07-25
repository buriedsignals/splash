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
import { isSafeId } from "../core/id-safety";
import { fail, type VerbResult } from "../core/verbs/types";

export type OutDirCheck =
  { ok: true; path: string } | { ok: false; message: string };

// How shallow is too shallow. A path with fewer than two segments below the filesystem
// root (`/`, `/etc`, `C:\`) is never an artifact directory and always something whose loss
// is unrecoverable.
const MIN_SEGMENTS = 2;

// ARTIFACT NAMES — the whole point of the probe, so it is matched by NAME, never by
// extension. An extension allowlist (`png|html|mp4|json`) accepts a photo library, a
// budget spreadsheet, a wedding video, and — worst case — a run directory whose only
// entry is `run.json`, the manifest that IS the run. Every one of those would be wiped
// while the façade answered `{"ok": true}`.
//
// The list below is the closed set of basenames the five producers actually write into an
// outDir, each verified against the producing source:
//
//   chart-native  scripts/produce.mjs:165  config.json                  (all formats)
//                                    :166  native-source.json           (all formats)
//                                    :173  brand-concerns.json          (conditional)
//                 scripts/snap-proof.mjs:59   static.png                (static)
//                        produce.mjs:245  interactive.html              (interactive)
//                 scripts/snap-proof.mjs:91   interactive.png           (interactive)
//                        produce.mjs:357-359  video-<aspect>-still.png,
//                                             video-<aspect>-final.png,
//                                             <aspect>.mp4              (video)
//                 scripts/snap-video.mjs:220  video-verify.json         (video)
//   map-native    scripts/snap-static.mjs:119   static.png              (static)
//                 scripts/snap-theme.mjs:246    theme.png               (static+dark)
//                 scripts/snap-contrast.mjs:178 contrast-<mode>.png
//                        produce.mjs:321-333  interactive.html,
//                                             source-manifest.json, config.json
//                 scripts/snap-proof.mjs:422   interactive.png          (interactive)
//                 scripts/snap-responsive.mjs:63 responsive-<w>.png     (interactive)
//                 scripts/snap-a11y.mjs:324    a11y.png                (interactive)
//                        produce.mjs:408-409  video-<aspect>-still.png, <aspect>.mp4
//                 scripts/snap-video.mjs:221   video-verify.json        (video)
//   scrolly       scripts/produce.mjs:82-86  scrolly.html,
//                                            source-manifest.json, config.json
//   image-native  scripts/prep-images.mjs:150 prep-report.json
//                 scripts/prep-images.mjs:69  frames/  (the ONE subdirectory)
//                 scripts/prep-images.mjs:126 frames/<frame-id>.jpg
//   dw-chart      src/manifest.ts:27          <id>.png   (static only)
//   map-dw        src/manifest.ts:28          <id>.png   (static only)
//
// `<aspect>` is closed to landscape|square|portrait (chart-native produce.mjs:308-312,
// map-native produce.mjs:219-241) — so `wedding.mp4` is NOT a producible name. `<mode>`
// is closed to static|interactive (snap-contrast.mjs:83). `report.json` is deliberately
// ABSENT: it belongs to the RUN directory, the parent of outDir, never to outDir itself
// (skills/splash/src/render-provenance.ts:155-160).
const ASPECT = "(?:landscape|square|portrait)";
const PRODUCIBLE_NAMES: ReadonlySet<string> = new Set([
  "a11y.png",
  "brand-concerns.json",
  "config.json",
  "contrast-interactive.png",
  "contrast-static.png",
  "interactive.html",
  "interactive.png",
  "native-source.json",
  "prep-report.json",
  "scrolly.html",
  "source-manifest.json",
  "static.png",
  "theme.png",
  "video-verify.json",
]);
const PRODUCIBLE_PATTERNS: readonly RegExp[] = [
  new RegExp(`^${ASPECT}\\.mp4$`),
  new RegExp(`^video-${ASPECT}-(?:still|final)\\.png$`),
  // The width set lives in map-native's snap-responsive.mjs and may grow; the shape is
  // what identifies it, and no plausible user file is named `responsive-<digits>.png`.
  /^responsive-\d+\.png$/,
];

// `frames/` is the only subdirectory a produce creates inside an outDir. It is NOT
// trusted wholesale — that is how `frames/originals/negative.dng` survived the previous
// guard. Its contents are probed too, and image-native writes exactly one shape there:
// `<frame-id>.jpg`, where the frame id is already slug-guarded
// (skills/image-native/src/image-story.ts:402, the same `[A-Za-z0-9_-]+` as an element
// id). No nested directory, no other extension.
const FRAMES_DIRECTORY = "frames";
const PRODUCIBLE_FRAME = /^[A-Za-z0-9_-]+\.jpg$/;

// `<id>.png` is producible ONLY for the id the request itself carries: the DW producers
// derive the stem from `ctx.id`, so nothing wider is justified. Without an id in the
// payload there is no producible png stem at all.
function producibleIdPng(id: unknown): string | undefined {
  return isSafeId(id) ? `${id}.png` : undefined;
}

function isProducibleFileName(
  name: string,
  idPng: string | undefined,
): boolean {
  if (PRODUCIBLE_NAMES.has(name)) return true;
  if (idPng !== undefined && name === idPng) return true;
  return PRODUCIBLE_PATTERNS.some((re) => re.test(name));
}

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
// construction — `readdirSync` + `statSync`, never a delete. Reported names are prefixed
// with their subdirectory so the refusal message says WHERE the stranger is.
function unproducibleEntries(dir: string, idPng: string | undefined): string[] {
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
      // The one producible subdirectory is still PROBED, not trusted: a `frames/` a host
      // filled with its own originals is the host's data, whatever the directory is named.
      if (name !== FRAMES_DIRECTORY) strangers.push(`${name}/`);
      else
        strangers.push(
          ...unproducibleFrames(join(dir, name)).map((n) => `${name}/${n}`),
        );
      continue;
    }
    if (!isProducibleFileName(name, idPng)) strangers.push(name);
  }
  return strangers.sort();
}

// Inside `frames/`: flat `<frame-id>.jpg` files and nothing else — no nested directory
// (`frames/originals/` is a stranger), no other extension.
function unproducibleFrames(dir: string): string[] {
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
    if (isDir) strangers.push(`${name}/`);
    else if (!PRODUCIBLE_FRAME.test(name)) strangers.push(name);
  }
  return strangers;
}

// The whole guard, as a value. Never throws — the façade answers a non-JS host that has no
// `catch`, so a refusal has to be data all the way down.
//
// `id` is the request's own element id, and it only ever WIDENS the probe by exactly one
// name (`<id>.png`, the DW producers' output). It is optional and never trusted beyond the
// slug guard, so a caller that omits it gets the strictest probe.
export function checkOutDir(outDir: unknown, id?: unknown): OutDirCheck {
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
    const strangers = unproducibleEntries(abs, producibleIdPng(id));
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
  const verdict = checkOutDir(outDir, (payload as Record<string, unknown>).id);
  return verdict.ok ? undefined : fail("invalid-request", verdict.message);
}
