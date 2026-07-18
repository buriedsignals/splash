// realDispatch: the Dispatch (Task 3) injects to actually produce ONE accepted
// proposal. The 5 producers split into two execution models, each with its own
// I/O shape — read from the real entry points, not assumed:
//
//   FILE-BASED (shell out, execFileSync, own build/render pipeline):
//     chart-native  scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> <format>
//                   format is the SINGLE VisualFormat to build — static|interactive|
//                   video|scrolly — passed straight through (single-format-produce-
//                   export, Tasks 2-3: no more "all"/style translation). "scrolly"
//                   fails hard (see SCROLLY ROUTING below). exit 2 + "FALLBACK_TO_DW: ..."
//                   on stderr when the native type isn't mapped (specToNativeConfig
//                   throws UnsupportedNativeType) — the ONLY producer that emits this
//                   fallback signal.
//     map-native    scripts/produce.mjs <config.json> <outDir> <format>
//                   same single-format vocabulary as chart-native, passed straight
//                   through — builds EXACTLY that one format's artifacts, nothing else.
//                   "scrolly" fails hard too. Never emits FALLBACK_TO_DW.
//     scrolly       scripts/produce.mjs <config.json> <outDir> — takes NO format flag
//                   (always builds one scrolly.html); a 4th argv is simply unread.
//
//   SCROLLY ROUTING: a scrolly-format element is proposed with producer "scrolly"
//   ITSELF (suggest-chart/suggest-article never emit chart-native/map-native paired
//   with format:"scrolly" — both of those producers' own produce.mjs now fail hard on
//   "scrolly", see their file-header comments). isFileBased/SCRIPT dispatch a "scrolly"
//   producer straight to skills/scrolly, which hosts the moteur's renderer for the
//   scroll-driven format — unchanged by Task 4, confirmed still correct here.
//
//   CHANNEL THREADING (Slice 2, producer rendering — 2026-07-08): the proposal's
//   confirmed CADRAGE Q3 channel (skills/splash/src/channel.ts) is forwarded to the
//   two NATIVE producers (chart-native, map-native) ONLY, as an env var
//   `SPLASH_CHANNEL` on the spawned process — NOT a 6th positional argv. Chosen
//   because both entry scripts already read a sibling env fallback this way,
//   and because an env var survives produce-from-spec.mjs's own inner
//   execFileSync("bun", [...]) re-spawn of produce.mjs for free (inherited process.env)
//   with no extra plumbing in that forwarding script. Absent channel (legacy
//   proposals) defaults to "article-web", matching normalizeChannel's default.
//   dw-chart / map-dw / scrolly dispatch is UNCHANGED — no channel is threaded to them.
//
//   CLOUD-PUBLISHING (import + await, hits the Datawrapper API):
//     dw-chart  produceChart(spec: ChartSpec, pngPath, opts?) → { chartId, embed, pngPath?, publicUrl }
//               opts.format ("static" default | "interactive") — single-format-produce-
//               export (Task 3): "static" exports the media (pngPath present);
//               "interactive" delivers the hosted embed alone (pngPath undefined).
//               Task 4 threads `p.format` here; a format outside {static, interactive}
//               (video/scrolly — dw-chart has no such renderer) fails hard before any
//               API call rather than silently building "static".
//     map-dw    produceMap(spec: MapSpec, pngPath, opts?) → { chartId, embed, pngPath?, publicUrl }
//               opts.format ("static" default | "interactive") — the same single-format
//               contract as dw-chart (map-dw floor): "static" exports the owned PNG at
//               the channel's box (render-size fail-hard, IHDR readback); "interactive"
//               delivers the hosted embed alone (pngPath undefined). A format outside
//               {static, interactive} (video/scrolly — animated maps are map-native's)
//               fails hard here BEFORE any API call, mirroring the dw-chart gate below.
//   Both ChartSpec.data and MapSpec.data are already CSV text set by the upstream
//   suggester — no toCsv (Task 2) conversion is needed here.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Channel } from "./channel";
import { assertSafeId } from "./id-safety";
import type { Dispatch } from "./produce-all";
import type { AcceptedProposal, Producer, VisualFormat } from "./producer-spec";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";
import type { ChartSpec } from "../../dw-chart/src/chart-spec";
import type { MapSpec } from "../../map-dw/src/map-spec";
import { produceChart } from "../../dw-chart/src/produce";
import { produceMap } from "../../map-dw/src/produce";

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(here, "../..");

type FileBasedProducer =
  "chart-native" | "map-native" | "scrolly" | "image-native";

function isFileBased(producer: Producer): producer is FileBasedProducer {
  return (
    producer === "chart-native" ||
    producer === "map-native" ||
    producer === "scrolly" ||
    producer === "image-native"
  );
}

// The two NATIVE producers (chart-native, map-native) render at the channel's
// size/aspect (Slice 2); scrolly rides its host engine's own render path and does
// not read a channel today, so it is deliberately excluded here.
const CHANNEL_THREADED_PRODUCERS = new Set<FileBasedProducer>([
  "chart-native",
  "map-native",
]);

const DEFAULT_CHANNEL: Channel = "article-web";

// Builds the extra env for a file-based dispatch: {} for a producer that doesn't
// consume a channel (scrolly, and any future non-native file-based producer);
// otherwise SPLASH_CHANNEL, defaulting an absent proposal.channel to article-web
// (back-compat — legacy proposals with no channel still dispatch fine). The channel
// received here is CANONICAL: produce-all's gate normalizes the journalist's free
// text (aliases, case variants) via normalizeChannel BEFORE dispatch and threads the
// resolved value — required because both native producers' own SPLASH_CHANNEL
// parsing is exact-match and fail-closed (they reject any non-canonical value rather
// than defaulting it to article-web). Exported for unit testing (the "argv/env
// builder").
export function channelEnvFor(
  producer: FileBasedProducer,
  channel: Channel | undefined,
): Record<string, string> {
  if (!CHANNEL_THREADED_PRODUCERS.has(producer)) return {};
  return { SPLASH_CHANNEL: channel ?? DEFAULT_CHANNEL };
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
  // image-native (C5): <image-story.json> <outDir> <format> — same single-format shape;
  // v1 accepts "scrolly" only (its own CLI fails hard on anything else).
  "image-native": join(SKILLS_ROOT, "image-native/scripts/produce.mjs"),
};

const SKILL_DIR: Record<FileBasedProducer, string> = {
  "chart-native": join(SKILLS_ROOT, "chart-native"),
  "map-native": join(SKILLS_ROOT, "map-native"),
  scrolly: join(SKILLS_ROOT, "scrolly"),
  "image-native": join(SKILLS_ROOT, "image-native"),
};

// CHANNEL INJECTION (cloud producers) — the spine's truth flows in MECHANICALLY.
// dw-chart and map-dw size (and render-size-verify) their DW export against their own
// spec.channel, but on the routed path the canonical channel lives on the PROPOSAL
// (CADRAGE Q3, normalized fail-closed by produce-all's gate before dispatch): a spec
// whose emitter forgot the field (suggest-chart's MapSpec template historically had
// none) would silently size against the article-web default and PASS its own floor
// against the wrong channel. So the dispatch injects the proposal's channel into the
// spec handed to the producer. Precedence: the PROPOSAL value WINS over any spec-level
// value — the same proposal-first order resolveGuardChannel (guardrail-parity.ts)
// already applies at the validate gate — chosen over a mismatch-throw because the spec
// field is legacy free text (aliases like "feed") while the proposal is canonical:
// throwing on a raw-string mismatch would reject specs that AGREE after normalization.
// An absent proposal channel leaves the spec untouched (legacy/hand-authored specs and
// their spec-level channel keep working; producers still default absent → article-web).
// Pure — returns a new object, never mutates the accepted proposal's spec. Exported
// for unit testing.
export function withProposalChannel<T extends { channel?: string }>(
  spec: T,
  channel: Channel | undefined,
): T {
  if (channel === undefined) return spec;
  return { ...spec, channel };
}

// The orchestrator's generic VisualFormat now maps 1:1 onto every file-based
// producer's own CLI vocabulary — chart-native, map-native, and scrolly all read the
// exact same static|interactive|video|scrolly set directly off argv (see each script's
// own header comment), since the single-format-produce-export redesign (Tasks 2-3)
// removed the old "all"/style translation this used to need. Kept as a named seam
// (not an inline pass-through at the call site) so a future producer with a genuinely
// different CLI vocabulary has exactly one place to diverge. Cloud producers have no
// CLI flag; the value is never consumed for them.
export function formatFlag(producer: Producer, format: VisualFormat): string {
  return format;
}

interface FileDispatchOutcome {
  status: "produced" | "failed" | "needs-fallback";
  outputs?: string[];
  reason?: string;
  error?: string;
  actualProducer?: Producer; // GUARD 1: the producer this dispatch actually ran
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
  env: Record<string, string> = {},
): ExecOutcome {
  try {
    execFileSync(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 20,
      // Merge onto the parent's own env (never replace it) — empty `env` is a no-op,
      // matching the pre-Slice-2 behavior exactly (execFileSync inherits process.env
      // when no `env` option is given at all).
      env: { ...process.env, ...env },
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

// Wipes `dir` clean (if it exists) and recreates it empty — a WHOLLY FRESH outDir for
// the dispatch about to write into it. Every proposal's `<outDir>/<id>` directory is
// keyed purely by `id` (produce-all.ts), so a re-produce that swaps producer/format for
// the same id (the sanctioned native→dw fallback, a source fix, a retry) would otherwise
// dispatch into the SAME directory the superseded attempt already wrote into — leaving
// its stray artifacts (e.g. a failed interactive map-native attempt's `interactive.html`
// / `a11y.png` / `responsive-*.png`) sitting next to the new delivery. None of the 5
// producers ever read pre-existing outDir contents before writing (no incremental/cached
// build depends on a prior run's files), so clearing first — before EVERY dispatch, not
// only a producer/format switch — is always safe and matches SKILL.md's own "every
// re-produce writes a WHOLLY FRESH ..." invariant (5c), extended from `report.json` to
// the artifact directory itself.
export function freshOutDir(dir: string): string {
  const abs = resolve(dir);
  rmSync(abs, { recursive: true, force: true });
  mkdirSync(abs, { recursive: true });
  return abs;
}

function dispatchFileBased(
  producer: FileBasedProducer,
  spec: NativeSpec | Record<string, unknown>,
  outDir: string,
  format: VisualFormat,
  channel: Channel | undefined,
): FileDispatchOutcome {
  const absOutDir = freshOutDir(outDir);

  const tmpDir = mkdtempSync(join(tmpdir(), "splash-dispatch-"));
  const configPath = join(tmpDir, "config.json");
  writeFileSync(configPath, JSON.stringify(spec, null, 2));

  const outcome = runProducerScript(
    "bun",
    [SCRIPT[producer], configPath, absOutDir, formatFlag(producer, format)],
    SKILL_DIR[producer],
    channelEnvFor(producer, channel),
  );
  if (outcome.status !== "produced") return outcome;

  // Record the producer this dispatch actually ran (GUARD 1) — it IS `producer` here (the
  // file-based branch dispatches strictly by the declared key), which is exactly what
  // makes the report an honest witness: produce-all asserts it against the accepted one.
  return {
    status: "produced",
    outputs: collectOutputs(absOutDir),
    actualProducer: producer,
  };
}

type DispatchResult = Awaited<ReturnType<Dispatch>>;

export const realDispatch: Dispatch = async (
  p: AcceptedProposal,
  outDir: string,
): Promise<DispatchResult> => {
  // Path-safety, belt-and-suspenders (audit gap #1). produce-all gates p.id at the spine
  // BEFORE building this outDir, but realDispatch is an exported entry point and p.id is
  // joined into a filesystem path directly here (the map-dw/map-native PNG below,
  // `${p.id}.png`), and freshOutDir resolve+rmSyncs. Re-assert the slug so no direct
  // caller can drive a traversal id into a delete/write outside outDir. Thrown here, it is
  // caught by produce-all's dispatch try/catch and recorded as a failed result — never a
  // silent delete (skills/splash/src/id-safety.ts).
  assertSafeId(p.id);
  if (isFileBased(p.producer)) {
    const spec =
      p.producer === "chart-native"
        ? (p.spec as NativeSpec)
        : (p.spec as Record<string, unknown>);
    return dispatchFileBased(p.producer, spec, outDir, p.format, p.channel);
  }

  const absOutDir = freshOutDir(outDir);
  const pngPath = join(absOutDir, `${p.id}.png`);

  if (p.producer === "dw-chart") {
    // dw-chart only builds "static" (PNG export) or "interactive" (hosted embed
    // alone — see skills/dw-chart/src/produce.ts's DwChartFormat) — it has no
    // video/scrolly renderer (those require chart-native's D3 core). Fail hard BEFORE
    // any API call rather than silently defaulting to "static" for a pinned format it
    // cannot honor (Task 4: thread `p.format`, don't ignore it).
    if (p.format !== "static" && p.format !== "interactive") {
      return {
        status: "failed",
        error:
          `dw-chart cannot build format "${p.format}" — it supports "static" or ` +
          `"interactive" only (video/scrolly require chart-native)`,
      };
    }
    // `result.pngPath` is typed optional because dw-chart's own single-format contract
    // omits it for "interactive" (no PNG is exported for that format). The proposal's
    // canonical channel is injected so produceChart sizes against the spine's truth
    // (see withProposalChannel above), never against a spec that forgot the field.
    const result = await produceChart(
      withProposalChannel(p.spec as ChartSpec, p.channel),
      pngPath,
      { format: p.format },
    );
    return {
      status: "produced",
      outputs: result.pngPath ? [result.pngPath] : [],
      publicUrl: result.publicUrl,
      actualProducer: "dw-chart",
    };
  }

  // Exhaustive by Producer's 5-member union: chart-native/map-native/scrolly handled
  // above (isFileBased), dw-chart just above — only map-dw remains.
  // Same single-format gate as dw-chart's: map-dw builds "static" (owned PNG at the
  // channel box) or "interactive" (hosted embed alone) — it has no video/scrolly
  // renderer (animated maps are map-native's). Fail hard BEFORE any API call rather
  // than silently over-producing PNG+embed for a pinned format it cannot honor
  // (map-dw floor: the dispatch used to ignore p.format entirely here).
  if (p.format !== "static" && p.format !== "interactive") {
    return {
      status: "failed",
      error:
        `map-dw cannot build format "${p.format}" — it supports "static" or ` +
        `"interactive" only (video/scrolly require map-native)`,
    };
  }
  // `result.pngPath` is typed optional because map-dw's single-format contract omits
  // it for "interactive" (no PNG is exported for that format) — same as dw-chart. The
  // proposal's canonical channel is injected so produceMap sizes AND render-size-
  // verifies against the spine's truth (see withProposalChannel above) — this is the
  // path where suggest-chart's emitted MapSpec historically carried no channel at all.
  const result = await produceMap(
    withProposalChannel(p.spec as MapSpec, p.channel),
    pngPath,
    { format: p.format },
  );
  return {
    status: "produced",
    outputs: result.pngPath ? [result.pngPath] : [],
    publicUrl: result.publicUrl,
    actualProducer: "map-dw",
  };
};
