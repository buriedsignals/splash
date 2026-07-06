// realDispatch: the Dispatch (Task 3) injects to actually produce ONE accepted
// proposal. The 5 producers split into two execution models, each with its own
// I/O shape — read from the real entry points, not assumed:
//
//   FILE-BASED (shell out, execFileSync, own build/render pipeline):
//     chart-native  scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]
//                   exit 2 + "FALLBACK_TO_DW: ..." on stderr when the native type isn't
//                   mapped (specToNativeConfig throws UnsupportedNativeType) — the ONLY
//                   producer that emits this fallback signal.
//     map-native    scripts/produce.mjs <config.json> <outDir> <static|reveal|story|scrolly|all>
//                   "static" always builds BOTH the static PNG and interactive.html (no
//                   video); video kinds are additive. Never emits FALLBACK_TO_DW.
//     scrolly       scripts/produce.mjs <config.json> <outDir> — takes NO format flag
//                   (always builds one scrolly.html); a 4th argv is simply unread.
//
//   CLOUD-PUBLISHING (import + await, hits the Datawrapper API):
//     dw-chart  produceChart(spec: ChartSpec, pngPath) → { chartId, embed, pngPath, publicUrl }
//     map-dw    produceMap(spec: MapSpec, pngPath)     → { chartId, embed, pngPath, publicUrl }
//   Both ChartSpec.data and MapSpec.data are already CSV text set by the upstream
//   suggester — no toCsv (Task 2) conversion is needed here.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Dispatch } from "./produce-all";
import type { AcceptedProposal, Producer, VisualFormat } from "./producer-spec";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";
import type { ChartSpec } from "../../dw-chart/src/chart-spec";
import type { MapSpec } from "../../map-dw/src/map-spec";
import { produceChart } from "../../dw-chart/src/produce";
import { produceMap } from "../../map-dw/src/produce";

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(here, "../..");

type FileBasedProducer = "chart-native" | "map-native" | "scrolly";

function isFileBased(producer: Producer): producer is FileBasedProducer {
  return (
    producer === "chart-native" ||
    producer === "map-native" ||
    producer === "scrolly"
  );
}

// Absolute so cwd never matters for resolution, even though we also set cwd (below)
// to match the brief's call shape.
const SCRIPT: Record<FileBasedProducer, string> = {
  "chart-native": join(
    SKILLS_ROOT,
    "chart-native/scripts/produce-from-spec.mjs",
  ),
  "map-native": join(SKILLS_ROOT, "map-native/scripts/produce.mjs"),
  scrolly: join(SKILLS_ROOT, "scrolly/scripts/produce.mjs"),
};

const SKILL_DIR: Record<FileBasedProducer, string> = {
  "chart-native": join(SKILLS_ROOT, "chart-native"),
  "map-native": join(SKILLS_ROOT, "map-native"),
  scrolly: join(SKILLS_ROOT, "scrolly"),
};

// The orchestrator's generic VisualFormat → each file-based producer's own CLI flag
// vocabulary (they differ — per the scripts read above, not guessed). Cloud producers
// have no CLI flag; the format arg passed to them here is simply unused.
export function formatFlag(producer: Producer, format: VisualFormat): string {
  if (producer === "chart-native") {
    // produce.mjs argv[5]: "all" (static+interactive+3 videos) | "static" (no video).
    return format === "video" ? "all" : "static";
  }
  if (producer === "map-native") {
    // produce.mjs argv[4]: static|reveal|story|scrolly|all. "static" already builds
    // the interactive web build too (only video rendering is gated by the flag).
    if (format === "video") return "all";
    if (format === "scrolly") return "scrolly";
    return "static";
  }
  // scrolly: no CLI flag read at all (produce.mjs takes just <config> <outDir>).
  // dw-chart / map-dw: cloud producers, no CLI — value is never consumed.
  return format;
}

interface FileDispatchOutcome {
  status: "produced" | "failed" | "needs-fallback";
  outputs?: string[];
  reason?: string;
  error?: string;
}

// Flat directory listing (none of the 3 file-based scripts write subdirectories into
// outDir — static.png / interactive.html / *.mp4 / scrolly.html all land directly there).
function collectOutputs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort()
    .map((name) => join(dir, name));
}

function toText(buf: Buffer | string | undefined): string {
  return typeof buf === "string" ? buf : (buf?.toString("utf8") ?? "");
}

// Last N lines of a stream, for a bounded error/report dump (mirrors scripts/check.mjs's
// own `.slice(-30)` convention for failure output).
function tail(text: string, lines = 30): string {
  return text.split("\n").slice(-lines).join("\n").trim();
}

type ExecOutcome =
  | { status: "produced" }
  | { status: "needs-fallback"; reason: string }
  | { status: "failed"; error: string };

// Runs a file-based producer script and normalizes its outcome. Captures BOTH stdout
// and stderr — NEITHER is ever inherited — so a producer's own build/render logs
// (chart-native's Vite output, map-native's "[produce map] building…", etc.) can never
// interleave with produce-all's own final JSON.stringify(report) line on the real
// stdout. Exit code 2 is chart-native's reliable FALLBACK_TO_DW signal; we still parse
// the captured stderr for the human-readable reason line (present whenever the
// fallback is chart-native's — the only producer that emits it) and fall back to a
// generic reason if a future producer ever exits 2 without one.
export function runProducerScript(
  cmd: string,
  args: string[],
  cwd: string,
): ExecOutcome {
  try {
    execFileSync(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 20,
    });
    return { status: "produced" };
  } catch (e) {
    const execErr = e as NodeJS.ErrnoException & {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number | null;
    };
    const stdoutText = toText(execErr.stdout);
    const stderrText = toText(execErr.stderr);
    const fallbackLine = stderrText
      .split("\n")
      .find((line) => line.includes("FALLBACK_TO_DW"));
    if (execErr.status === 2) {
      return {
        status: "needs-fallback",
        reason:
          fallbackLine?.trim() ??
          "native type unsupported (exit code 2, FALLBACK_TO_DW)",
      };
    }
    const dump = [
      stdoutText && `stdout:\n${tail(stdoutText)}`,
      stderrText && `stderr:\n${tail(stderrText)}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { status: "failed", error: dump || execErr.message || String(e) };
  }
}

function dispatchFileBased(
  producer: FileBasedProducer,
  spec: NativeSpec | Record<string, unknown>,
  outDir: string,
  format: VisualFormat,
): FileDispatchOutcome {
  const absOutDir = resolve(outDir);
  mkdirSync(absOutDir, { recursive: true });

  const tmpDir = mkdtempSync(join(tmpdir(), "atelier-dispatch-"));
  const configPath = join(tmpDir, "config.json");
  writeFileSync(configPath, JSON.stringify(spec, null, 2));

  const outcome = runProducerScript(
    "bun",
    [SCRIPT[producer], configPath, absOutDir, formatFlag(producer, format)],
    SKILL_DIR[producer],
  );
  if (outcome.status !== "produced") return outcome;

  return { status: "produced", outputs: collectOutputs(absOutDir) };
}

type DispatchResult = Awaited<ReturnType<Dispatch>>;

export const realDispatch: Dispatch = async (
  p: AcceptedProposal,
  outDir: string,
): Promise<DispatchResult> => {
  if (isFileBased(p.producer)) {
    const spec =
      p.producer === "chart-native"
        ? (p.spec as NativeSpec)
        : (p.spec as Record<string, unknown>);
    return dispatchFileBased(p.producer, spec, outDir, p.format);
  }

  const absOutDir = resolve(outDir);
  mkdirSync(absOutDir, { recursive: true });
  const pngPath = join(absOutDir, `${p.id}.png`);

  if (p.producer === "dw-chart") {
    const result = await produceChart(p.spec as ChartSpec, pngPath);
    return {
      status: "produced",
      outputs: [result.pngPath],
      publicUrl: result.publicUrl,
    };
  }

  // Exhaustive by Producer's 5-member union: chart-native/map-native/scrolly handled
  // above (isFileBased), dw-chart just above — only map-dw remains.
  const result = await produceMap(p.spec as MapSpec, pngPath);
  return {
    status: "produced",
    outputs: [result.pngPath],
    publicUrl: result.publicUrl,
  };
};
