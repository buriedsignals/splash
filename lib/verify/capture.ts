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
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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

// WHICH text is the title, in order. The same ladder discipline as ROOT_SELECTORS, and for
// the same reason: which candidate answered is RECORDED, so a wrong extraction is readable
// in the evidence instead of quietly standing in for the real headline.
//
// This cannot go through the furniture mechanism. Furniture is declared as expected TEXT
// (types.ts:112) — the only description true of all six engines at once — so looking the
// title up that way can only answer "the commissioned text is there" or "it is not". A
// divergence detector needs the text that IS painted, whatever it turns out to be.
//
// Measured on the engines rather than assumed:
//   - chart-native's 42 components all end on `<svg role="img" aria-label={config.title}>`
//     (e.g. skills/chart-native/src/BarChart.tsx:289-290). That accessible name is the only
//     title this DOM NAMES: ChartFrame paints the visible one in an unclassed, unattributed
//     <div> (ChartFrame.tsx:167-176), and "the biggest text near the top" would just as
//     happily return a value label.
//   - map-native / scrolly declare the same thing PREFIXED ("Interactive map: <title>",
//     ChoroplethMap.tsx:485). Harmless to the metric, which counts the share of the
//     TAKEAWAY's words the title carries — extra words on the title side dilute nothing.
//   - `[data-splash-title]` exists nowhere yet, exactly like `[data-splash-root]` above it.
//     It is the convention of this file: an engine that marks its title one day wins here
//     without a line changing.
//
// It reads the accessible NAME, not the pixels. A title present in the accessible tree but
// visually clipped is a FURNITURE question, and furnitureChecks already measures that.
export const TITLE_SOURCES = [
  { selector: "[data-splash-title]", read: "text" },
  { selector: "svg[role='img'][aria-label]", read: "aria-label" },
  { selector: "h1", read: "text" },
  { selector: "h2", read: "text" },
] as const;

// A candidate whose text is longer than this is not a headline — it is a section, and
// recording it would put a document dump where a title belongs. Real titles in this project
// reach 110+ characters (the "titre trop long" backlog note), so the bound discards a page,
// not a wordy headline. Over it, the ladder continues; if nothing qualifies the record says
// "none" rather than carrying prose.
export const MAX_RENDERED_TITLE_CHARS = 300;

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
    // A png has no DOM, so there is no text to read. Two things this deliberately does NOT
    // do: OCR the pixels (a layer of uncertainty nothing in this record accounts for), and
    // copy the commissioned title in as a stand-in — which would make the divergence
    // detector compare a string with itself, guaranteeing silence while looking like a
    // measurement. The record says WHY there is no title instead.
    titleSource: "static-image",
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

// What one page visit measures. Everything here is a FACT read off the live layout — no
// judgement is formed in the browser, because a verdict computed where it cannot be
// re-derived is a verdict nobody can audit.
type Measured = {
  rootSelector: string;
  rootBox: Box;
  documentScroll: { width: number; height: number };
  marks: number;
  markColours: string[];
  /** The candidate that answered, or "none". Always set — an absent title is a FACT worth
   *  recording, not a missing measurement. */
  titleSource: string;
  /** Absent when titleSource is "none". */
  renderedTitle?: string;
  furniture: {
    role: FurnitureRole;
    text: string;
    found: boolean;
    visible: boolean;
    box: Box | null;
  }[];
};

// Runs INSIDE the page. Written as one self-contained function (no closure over module
// scope) because it is serialized across the browser boundary.
/* c8 ignore start — executed in the page context, not in the test process */
function measureInPage(args: {
  rootSelectors: string[];
  titleSources: { selector: string; read: string }[];
  maxTitleChars: number;
  furniture: { role: string; text: string }[];
}): Measured {
  const round = (n: number) => Math.round(n * 100) / 100;
  const boxOf = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y),
      width: round(r.width),
      height: round(r.height),
    };
  };

  let rootSelector = "body";
  let root: Element = document.body;
  for (const sel of args.rootSelectors) {
    const found = document.querySelector(sel);
    if (found) {
      rootSelector = sel;
      root = found;
      break;
    }
  }

  const MARK_TAGS = ["rect", "circle", "path", "line", "polygon", "polyline"];
  const marks: Element[] = [];
  for (const tag of MARK_TAGS)
    for (const el of Array.from(root.querySelectorAll(tag))) marks.push(el);

  const toHex = (colour: string): string | null => {
    const m = colour.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const parts = m[1]!.split(",").map((s) => Number(s.trim()));
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    if (parts.length > 3 && parts[3] === 0) return null; // fully transparent paints nothing
    return (
      "#" +
      parts
        .slice(0, 3)
        .map((n) =>
          Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  };
  // Which colours a READER has to tell apart — not every colour on the canvas. Measured on
  // a real loop-produced slope: its gridlines are 1px strokes at #e6e6e6 and #cfcfcf, close
  // enough on any adjacency metric to fire on essentially every chart. A risk lane that
  // fires every time is one people learn to click past, so furniture rules are excluded by
  // what they ARE (hairline strokes) rather than by a colour heuristic, which would also
  // throw away a legitimately grey categorical series.
  const NON_FILLING = new Set(["line", "polyline"]);
  const colours: string[] = [];
  for (const el of marks) {
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const candidates: string[] = [];
    // A <line> computes fill as black even though it paints none of it.
    if (!NON_FILLING.has(tag)) candidates.push(cs.fill);
    // Hairlines are rules, not encodings. A series stroke is drawn thicker precisely so a
    // reader can follow it.
    if (parseFloat(cs.strokeWidth || "0") > 1) candidates.push(cs.stroke);
    for (const raw of candidates) {
      if (!raw || raw === "none") continue;
      const hex = toHex(raw);
      // Pure black is the SVG default fill: an outline-only shape that never set `fill`
      // would otherwise contribute a colour nothing on screen is painted with.
      if (hex && hex !== "#000000" && !colours.includes(hex)) colours.push(hex);
    }
  }

  // The title the render DECLARES, walked down the ladder. Same visit, same root — no second
  // traversal, and nothing here decides whether the title is any good.
  let titleSource = "none";
  let renderedTitle: string | undefined;
  for (const candidate of args.titleSources) {
    const el = root.matches(candidate.selector)
      ? root
      : root.querySelector(candidate.selector);
    if (!el) continue;
    const raw =
      candidate.read === "aria-label"
        ? (el.getAttribute("aria-label") ?? "")
        : (el.textContent ?? "");
    const text = raw.replace(/\s+/g, " ").trim();
    // A candidate that answers with a whole section is the WRONG candidate, so the ladder
    // keeps going rather than recording prose as a headline.
    if (!text || text.length > args.maxTitleChars) continue;
    titleSource = candidate.selector;
    renderedTitle = text;
    break;
  }

  const furniture = args.furniture.map((f) => {
    const needle = f.text.trim();
    // The DEEPEST element carrying the text: an ancestor also "contains" it, and measuring
    // the ancestor would answer a question about the wrapper instead of about the label.
    const candidates = Array.from(root.querySelectorAll("*")).filter((el) =>
      (el.textContent ?? "").trim().includes(needle),
    );
    const deepest = candidates.filter(
      (el) => !candidates.some((other) => other !== el && el.contains(other)),
    );
    const el = deepest[0] ?? null;
    if (!el)
      return {
        role: f.role as FurnitureRole,
        text: f.text,
        found: false,
        visible: false,
        box: null,
      };
    const cs = getComputedStyle(el);
    const box = boxOf(el);
    const visible =
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      Number(cs.opacity) > 0 &&
      box.width > 0 &&
      box.height > 0;
    return {
      role: f.role as FurnitureRole,
      text: f.text,
      found: true,
      visible,
      box,
    };
  });

  return {
    rootSelector,
    rootBox: boxOf(root),
    documentScroll: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    marks: marks.length,
    markColours: colours,
    titleSource,
    // Conditional so an absent title is an ABSENT KEY, not `undefined` — the round-trip
    // invariant (I6) the whole payload is held to.
    ...(renderedTitle ? { renderedTitle } : {}),
    furniture,
  };
}
/* c8 ignore stop */

// Alt text is present in the accessible tree by construction and visually hidden by design
// (a 1x1 clipped node). Holding it to a visibility or in-frame rule would fail every
// correctly-implemented WCAG 1.1.1 description in the codebase.
const VISUALLY_EXEMPT: readonly FurnitureRole[] = ["alt-text"];

function furnitureChecks(target: CaptureTarget, m: Measured): CaptureCheck[] {
  const checks: CaptureCheck[] = [];
  for (const f of m.furniture) {
    const exempt = VISUALLY_EXEMPT.includes(f.role);
    const present = exempt ? f.found : f.found && f.visible;
    checks.push({
      id: "capture:furniture-present",
      breakpoint: target.breakpoint,
      role: f.role,
      outcome: present ? "pass" : "fail",
      detail: !f.found
        ? `no element carries the ${f.role} text "${f.text}"`
        : !f.visible && !exempt
          ? `the ${f.role} is in the DOM but not visible`
          : `the ${f.role} is present`,
    });
    // No frame verdict for something absent, or for text that is not meant to be seen:
    // two failures for one defect make the real cause harder to read.
    if (!present || exempt || !f.box) continue;

    const bottom = f.box.y + f.box.height;
    const right = f.box.x + f.box.width;
    const rootBottom = m.rootBox.y + m.rootBox.height;
    const rootRight = m.rootBox.x + m.rootBox.width;
    const inRoot =
      f.box.y >= m.rootBox.y - SIZE_TOLERANCE_PX &&
      f.box.x >= m.rootBox.x - SIZE_TOLERANCE_PX &&
      bottom <= rootBottom + SIZE_TOLERANCE_PX &&
      right <= rootRight + SIZE_TOLERANCE_PX;
    const inViewport =
      bottom <= target.cssViewport.height + SIZE_TOLERANCE_PX &&
      right <= target.cssViewport.width + SIZE_TOLERANCE_PX &&
      f.box.y >= -SIZE_TOLERANCE_PX &&
      f.box.x >= -SIZE_TOLERANCE_PX;
    checks.push({
      id: "capture:furniture-in-frame",
      breakpoint: target.breakpoint,
      role: f.role,
      outcome: inRoot && inViewport ? "pass" : "fail",
      detail:
        inRoot && inViewport
          ? `the ${f.role} sits inside the captured component and inside the ${target.cssViewport.width}x${target.cssViewport.height} container`
          : `the ${f.role} spans y ${f.box.y}→${bottom}, x ${f.box.x}→${right}, against a ${target.cssViewport.width}x${target.cssViewport.height} container and a component root at y ${m.rootBox.y}→${rootBottom}`,
    });
  }
  return checks;
}

async function captureHtml(
  p: CapturePayload,
  targets: CaptureTarget[],
): Promise<VerbResult<CaptureResult>> {
  // Imported lazily so a machine with no browser fails at CAPTURE time, with a message
  // naming what is missing — not at module load, which would take the whole verify layer
  // (severity table, approval decision, redaction) down with it.
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (e) {
    return fail(
      "engine-failed",
      `capture: no browser available — install one with "bunx playwright install chromium" (${(e as Error).message})`,
    );
  }

  const dir = captureDir(p.outDir, p.id);
  const artifactSha256 = hashFile(p.artifactPath);
  const url = fileUrlOf(p.artifactPath);
  const settleMs = p.settleMs ?? DEFAULT_SETTLE_MS;
  const furniture = (p.furniture ?? []).map((f) => ({
    role: f.role as string,
    text: f.text,
  }));

  const browser = await chromium.launch();
  try {
    const images: CaptureRecord[] = [];
    const checks: CaptureCheck[] = [];
    for (const target of targets) {
      const page = await browser.newPage({
        viewport: target.cssViewport,
        deviceScaleFactor: target.deviceScaleFactor,
      });
      try {
        const response = await page.goto(url, { waitUntil: "load" });
        // A file:// navigation returns a null response; anything else must have succeeded,
        // or the "capture" would be of a browser error page.
        if (response && !response.ok())
          return fail(
            "engine-failed",
            `capture: ${url} answered ${response.status()}`,
          );
        for (const sel of ROOT_SELECTORS) {
          if ((await page.locator(sel).count()) > 0) break;
        }
        if (settleMs > 0) await page.waitForTimeout(settleMs);

        const m = (await page.evaluate(measureInPage, {
          rootSelectors: [...ROOT_SELECTORS],
          titleSources: TITLE_SOURCES.map((t) => ({
            selector: t.selector,
            read: t.read,
          })),
          maxTitleChars: MAX_RENDERED_TITLE_CHARS,
          furniture,
        })) as Measured;

        const imagePath = join(dir, `review-${target.breakpoint}.png`);
        // The COMPLETE component root, not a viewport crop: #10 asks that "the complete
        // component root, including title, unit, plot, source, credit" be captured. What a
        // destination can actually SHOW is answered by the checks, not by cropping the
        // evidence — cropping would hide the very defect the checks exist to name.
        await page
          .locator(m.rootSelector)
          .first()
          .screenshot({ path: imagePath });

        images.push({
          breakpoint: target.breakpoint,
          path: imagePath,
          sha256: hashFile(imagePath),
          cssViewport: target.cssViewport,
          deviceScaleFactor: target.deviceScaleFactor,
          rootBox: m.rootBox,
          rootSelector: m.rootSelector,
          documentScroll: m.documentScroll,
          artifactSha256,
          artifactPath: p.artifactPath,
          destinationId: destinationIdFor(p.channel, p.destination),
          channel: p.channel,
          format: p.format,
          capturedAt: new Date().toISOString(),
          marks: m.marks,
          markColours: m.markColours,
          titleSource: m.titleSource,
          ...(m.renderedTitle ? { renderedTitle: m.renderedTitle } : {}),
        });
        checks.push(...furnitureChecks(target, m));
        const rootBottom = m.rootBox.y + m.rootBox.height;
        const rootRight = m.rootBox.x + m.rootBox.width;
        const fits =
          rootBottom <= target.cssViewport.height + SIZE_TOLERANCE_PX &&
          rootRight <= target.cssViewport.width + SIZE_TOLERANCE_PX;
        checks.push({
          id: "capture:fits-viewport",
          breakpoint: target.breakpoint,
          outcome: fits ? "pass" : "fail",
          detail: fits
            ? `the component ends at y ${rootBottom}, x ${rootRight}, inside its ${target.cssViewport.width}x${target.cssViewport.height} container`
            : `the component ends at y ${rootBottom}, x ${rootRight}, outside its ${target.cssViewport.width}x${target.cssViewport.height} container (document scrolls to ${m.documentScroll.width}x${m.documentScroll.height})`,
        });
      } finally {
        await page.close();
      }
    }
    return ok({ images, checks });
  } catch (e) {
    return fail("engine-failed", `capture: ${(e as Error).message}`);
  } finally {
    // Best-effort: a browser that will not close must not turn a completed capture into a
    // throw (I1), and must not leak a process either.
    try {
      await browser.close();
    } catch {
      /* best-effort teardown */
    }
  }
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

    return await captureHtml(p, targets);
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

/**
 * The title these captures show, or none.
 *
 * The `primary` breakpoint wins: that is the container the deliverable actually publishes
 * into, and it is the one a reader sees. The others stand in only when it carries nothing.
 *
 * One resolution, exported, so no caller builds a second subtly different one — the drift
 * class this codebase has already paid for (manifest.ts:251-254 records the same rule for
 * "the chosen option").
 */
export function renderedTitleOf(captures: CaptureRecord[]): string | undefined {
  const primary = captures.find(
    (c) => c.breakpoint === "primary" && c.renderedTitle?.trim(),
  );
  return (
    primary?.renderedTitle ??
    captures.find((c) => c.renderedTitle?.trim())?.renderedTitle
  );
}

export function fileUrlOf(path: string): string {
  return pathToFileURL(resolve(path)).href;
}
