// `capture` — put the REAL deliverable in front of the REAL publication container and
// measure what is actually there (issue #10).
//
// The failure this replaces is not hypothetical. Measured on a loop-produced interactive:
// reviewed at 900x560, the component root ends at y=581 and the document is 605 tall, so
// the "Source: …" footer sits below the fold and never reaches the still — and the review
// proceeded anyway. A clean screenshot at an arbitrary size proves nothing.
//
// This module produces FACTS (boxes, hashes, pixel sizes), never verdicts. Turning a fact
// into a severity-bearing finding happens once, in lib/verify/review.ts, so the same defect
// cannot be blocking in one caller and advisory in another (issue #11).
//
// Contract discipline: no path throws (I1), nothing reads process.env (I5), the payload is
// neutral — it knows nothing of RunManifest or AcceptedProposal (I2) — and everything it
// returns is JSON-round-trippable (I6), paths never bytes (I7).
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { isSafeId, unsafeIdMessage } from "../core/id-safety";
import type { Channel, VisualFormat } from "../core/vocabulary";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import { pngSize } from "./png";
import { destinationIdFor, resolveTargets } from "./viewport";
import type {
  Box,
  CaptureCheck,
  CaptureRecord,
  CaptureResult,
  CaptureTarget,
  DestinationProfile,
  FurnitureExpectation,
  FurnitureRole,
} from "./types";

// The rounding the engines really ship: a loop-produced article-web static.png measures
// 1200x676 against a 1200x675 channel size. skills/splash/src/channel.ts:66 has allowed
// exactly 2px for this since the channel work; a stricter gate here would fail a correct
// artifact and teach everyone to ignore the check.
export const SIZE_TOLERANCE_PX = 2;

// How long the reveal is given to settle before the still is taken. The number the engines'
// own snap scripts already use (skills/chart-native/scripts/snap-responsive.mjs:29) —
// inherited rather than re-guessed, so a capture here sees the same finished chart their
// proofs do.
export const DEFAULT_SETTLE_MS = 2200;

// Root candidates, in order. `#root > div` is the real convention of the produced builds
// (verified against a loop-rendered interactive.html); the rest are degradations, ending at
// `body`, which always exists. Which candidate matched is RECORDED on every image, so a
// wrong root is readable in the evidence instead of silently reframing the proof.
export const ROOT_SELECTORS = [
  "[data-splash-root]",
  "#root > div",
  "#root",
  "body",
] as const;

export type CapturePayload = {
  artifactPath: string;
  format: VisualFormat;
  channel: Channel;
  outDir: string;
  id: string;
  destination?: DestinationProfile;
  furniture?: FurnitureExpectation[];
  settleMs?: number;
};

export function isCapturePayload(p: unknown): p is CapturePayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.artifactPath === "string" &&
    typeof r.outDir === "string" &&
    typeof r.id === "string" &&
    typeof r.format === "string" &&
    typeof r.channel === "string"
  );
}

function hashFile(path: string): string {
  return Buffer.from(sha256(readFileSync(path))).toString("hex");
}

function sizeCheck(
  target: CaptureTarget,
  actual: { width: number; height: number },
  scale: number,
): CaptureCheck {
  const expectedW = target.cssViewport.width * scale;
  const expectedH = target.cssViewport.height * scale;
  const matches =
    Math.abs(actual.width - expectedW) <= SIZE_TOLERANCE_PX &&
    Math.abs(actual.height - expectedH) <= SIZE_TOLERANCE_PX;
  return {
    id: "capture:size-matches-destination",
    breakpoint: target.breakpoint,
    outcome: matches ? "pass" : "fail",
    detail: matches
      ? `image ${actual.width}x${actual.height} matches the destination ${target.cssViewport.width}x${target.cssViewport.height} at scale ${scale}`
      : `image ${actual.width}x${actual.height} is not the destination ${target.cssViewport.width}x${target.cssViewport.height} (any integer device scale)`,
  };
}

// The integer device scale an image was rendered at, or 1 when no integer explains it. Both
// axes must agree: a non-uniform ratio is a differently-shaped image, not a scaled one.
function integerScaleOf(
  actual: { width: number; height: number },
  css: { width: number; height: number },
): number {
  for (const k of [1, 2, 3, 4]) {
    if (
      Math.abs(actual.width - css.width * k) <= SIZE_TOLERANCE_PX &&
      Math.abs(actual.height - css.height * k) <= SIZE_TOLERANCE_PX
    )
      return k;
  }
  return 1;
}

async function captureStatic(
  p: CapturePayload,
  target: CaptureTarget,
): Promise<VerbResult<CaptureResult>> {
  const size = pngSize(p.artifactPath);
  if (!size)
    return fail(
      "engine-failed",
      `capture: ${p.artifactPath} is not a readable png — a static deliverable's size cannot be measured`,
    );
  const scale = integerScaleOf(size, target.cssViewport);
  const rootBox: Box = {
    x: 0,
    y: 0,
    width: Math.round(size.width / scale),
    height: Math.round(size.height / scale),
  };
  const digest = hashFile(p.artifactPath);
  const record: CaptureRecord = {
    breakpoint: target.breakpoint,
    // A static deliverable IS its own review image: re-screenshotting it would introduce a
    // second artifact to keep honest, and every hash below would then describe the copy.
    path: p.artifactPath,
    sha256: digest,
    cssViewport: target.cssViewport,
    deviceScaleFactor: scale,
    rootBox,
    rootSelector: "image",
    documentScroll: { width: rootBox.width, height: rootBox.height },
    artifactSha256: digest,
    artifactPath: p.artifactPath,
    destinationId: destinationIdFor(p.channel, p.destination),
    channel: p.channel,
    format: p.format,
    capturedAt: new Date().toISOString(),
    marks: 0,
    markColours: [],
  };
  const checks: CaptureCheck[] = [
    sizeCheck(target, size, scale),
    {
      id: "capture:fits-viewport",
      breakpoint: target.breakpoint,
      outcome:
        rootBox.width <= target.cssViewport.width + SIZE_TOLERANCE_PX &&
        rootBox.height <= target.cssViewport.height + SIZE_TOLERANCE_PX
          ? "pass"
          : "fail",
      detail: `image ${rootBox.width}x${rootBox.height} against a ${target.cssViewport.width}x${target.cssViewport.height} container`,
    },
  ];
  return ok({ images: [record], checks });
}

/**
 * Capture the deliverable at every viewport its destination actually publishes at.
 *
 * Never throws: a missing file, an unreadable image, a browser that will not start all come
 * back as typed failures, because the caller is a verb and a host outside JavaScript has no
 * catch.
 */
export async function capture(
  p: CapturePayload,
): Promise<VerbResult<CaptureResult>> {
  try {
    // Path safety BEFORE any resolve/mkdir — `id` becomes a directory name under outDir.
    if (!isSafeId(p.id)) return fail("invalid-request", unsafeIdMessage(p.id));
    if (!existsSync(p.artifactPath))
      return fail(
        "engine-failed",
        `capture: no deliverable at ${p.artifactPath}`,
      );

    // Deferred, and deferred LOUDLY. Extracting a frame needs ffmpeg, which lives in the
    // engines' snap scripts; lib/core/video-verify.ts deliberately does no IO. Rehosting
    // that mechanism in lib/ is its own slice — see the spec's "hors scope".
    if (p.format === "video")
      return fail(
        "not-implemented",
        "capture: video frame extraction is not wired into lib/verify yet — the mp4's own still is produced by the engine's snap script",
      );

    let targets: CaptureTarget[];
    try {
      targets = resolveTargets(p.channel, p.format, p.destination);
    } catch (e) {
      return fail("invalid-request", (e as Error).message);
    }

    if (p.format === "static") return await captureStatic(p, targets[0]!);

    return fail(
      "not-implemented",
      `capture: format "${p.format}" is not captured yet`,
    );
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}

// Re-exported so callers assembling an outDir do not re-derive the layout.
export function captureDir(outDir: string, id: string): string {
  const dir = resolve(join(outDir, id));
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function fileUrlOf(path: string): string {
  return pathToFileURL(resolve(path)).href;
}

export function isReadableFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export type { FurnitureRole };
