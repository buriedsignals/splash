// The publisher registry — the single source of truth for delivery dispatch, and the twin of
// lib/core/registry.ts (the producer registry the render verb dispatches from).
//
// It lives in core, not in lib/delivery, for one reason: lib/core/verbs/publish.ts must be
// able to look a publisher up, and a core module importing lib/delivery would invert the
// dependency arrow the verb-contract branch exists to fix. The ADAPTERS live in
// lib/delivery/adapters/ and register themselves through lib/delivery/index.ts.
//
// See docs/superpowers/specs/2026-07-25-delivery-publishers-design.md §3.1.
import type { VerbResult } from "./verbs/types";
import type { VisualFormat } from "./vocabulary";

/** What a destination needs to know about the visual. Assembled by lib/delivery/metadata.ts. */
export type DeliveryMetadata = {
  title: string;
  /** WCAG 1.1.1. Required by the type: the engines' alt-text refusal must not be lost at packaging. */
  altText: string;
  source: string;
  credit: string;
  /** BCP-47 — the CONTENT language (NEWSROOM-PROFILE.md), never the interface language. */
  lang: string;
  width?: number;
  height?: number | "responsive";
};

export type PublishRequest = {
  /** I7: a path, never bytes. */
  artifactPath: string;
  /** Slug source; checked before any path resolution. */
  id: string;
  /** What produce.ts rendered `artifactPath` as — an adapter must serve it as THAT (filename +
   * content-type), never assume HTML: before this field existed every publisher served every
   * artifact as `index.html`/`text/html`, silently corrupting a static PNG or an mp4. */
  format: VisualFormat;
  metadata: DeliveryMetadata;
  /** NON-secret provider identifiers, from newsroom.json. */
  settings: Record<string, string>;
  /** Resolved by the CALLER (lib/loop/deliver.ts). The contract never reads ambient state (I5). */
  credentials: Record<string, string>;
  /** Where a "package" publisher drops its file. */
  outDir: string;
};

export type PublishOutcome = {
  publisherId: string;
  kind: "hosted" | "package";
  /** Hosted destinations. */
  url?: string;
  /** Owned packages. */
  path?: string;
  /** The embed code, when there IS one. A file-genre package has none: the CMS takes the file
   * in its image/video field and the alt text in the field next to it (spec §3.8). Writing ""
   * would make the manifest say "delivered with an empty embed code", which is a different
   * and false claim. */
  snippet?: string;
  publishedAt: string;
};

// The served extension + MIME type for a produced artifact, keyed by its pinned format — the
// ONE place this mapping lives. zip.ts, s3.ts and cloudflare-pages.ts all call this instead of
// each keeping its own copy: this codebase has already been bitten twice by two registries of
// the same fact disagreeing (see docs/splash/proposal-brain-followups.md), and a format→media
// mapping is exactly that kind of fact.
export function artifactMediaFor(format: VisualFormat): {
  extension: string;
  contentType: string;
} {
  if (format === "static")
    return { extension: "png", contentType: "image/png" };
  if (format === "video") return { extension: "mp4", contentType: "video/mp4" };
  // interactive | scrolly — both are the self-contained produced HTML file.
  return { extension: "html", contentType: "text/html" };
}

/** Where an artifact of a given format is delivered: handed over as a file, or hosted. */
export type DeliveryGenre = "file" | "embed";

// The genre table — deliberately in the same file and keyed the same way as artifactMediaFor
// above. Two registries of the same fact drifting apart has already bitten this codebase twice
// (docs/splash/proposal-brain-followups.md), and "what a format is delivered as" is exactly
// that kind of fact.
//
// Not to be confused with DELIVERABLE_KIND (lib/core/vocabulary.ts): that one classifies a
// format for the OFFER's diversity (element | motion | page). `static` and `interactive` are
// both "element" there and land in DIFFERENT genres here — the two tables answer different
// questions and must not be merged.
//
// TOTAL over VisualFormat on purpose: a fifth format cannot compile without deciding where it
// is delivered.
const DELIVERY_GENRE: Record<VisualFormat, DeliveryGenre> = {
  static: "file",
  video: "file",
  interactive: "embed",
  scrolly: "embed",
};

export function deliveryGenreFor(format: VisualFormat): DeliveryGenre {
  return DELIVERY_GENRE[format];
}

export interface Publisher {
  /** Matches the decor's capability id ("embed-cloudflare", "zip", …). */
  id: string;
  kind: "hosted" | "package";
  /** The formats this adapter can actually SERVE. `kind` answers where the artifact lands
   * (disk or URL); this answers what it can carry — and the two are not redundant: `zip` is a
   * package and still serves the embed genre (a self-contained HTML inside an archive), which
   * is what makes "no host configured" a working path. Read by lib/loop/deliver.ts BEFORE the
   * verb runs, so an unservable format is refused with nothing staged, uploaded or deployed. */
  serves: VisualFormat[];
  /** false = declared, no body yet. Refused before any I/O. */
  implemented: boolean;
  publish(req: PublishRequest): Promise<VerbResult<PublishOutcome>>;
}

const REGISTRY = new Map<string, Publisher>();

// Throws on a duplicate id — intentional, and the same choice registerProducer made: it catches
// a double-import of the composition root instead of silently shadowing an adapter.
export function registerPublisher(p: Publisher): void {
  if (REGISTRY.has(p.id))
    throw new Error(`publisher already registered: ${p.id}`);
  REGISTRY.set(p.id, p);
}

export function lookupPublisher(id: string): Publisher | undefined {
  return REGISTRY.get(id);
}

export function allPublishers(): Publisher[] {
  return [...REGISTRY.values()];
}

/** Test seam only. The composition root registers once per process; a test needs a clean slate. */
export function resetPublishersForTest(): void {
  REGISTRY.clear();
}

// Bounded time — docs/superpowers/specs/2026-07-26-bounded-time-design.md. The ONE place this
// mechanism lives, for the same reason artifactMediaFor/deliveryGenreFor above are here: every
// adapter that reaches the network (s3.ts, cloudflare-pages.ts) had its own unbounded fetch,
// and "how long do we wait before refusing" is exactly the kind of fact that drifts if it lives
// in two places.

/** Control calls: metadata, verification GETs, a single poll attempt. Not the artifact's bytes. */
export const DEFAULT_NETWORK_TIMEOUT_MS = 20_000;

/** The two call sites that transmit the artifact's own bytes (S3 PUT, Cloudflare asset upload)
 * need a wider budget than a metadata call — a large video over a slow uplink is not a hung
 * endpoint. Kept as a SEPARATE constant rather than one flat number applied everywhere: see the
 * design note §3.2 for why a single timeout would be dishonest here. */
export const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;

/** A bounded fetch's typed failure — never a raw AbortError. Names the endpoint and the bound
 * that was exceeded, so the refusal a journalist eventually sees (each adapter wraps this in its
 * own `fail("engine-failed", …)`) says which endpoint, how long it waited, and what to check. */
export class NetworkTimeoutError extends Error {
  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(
      `no response from ${url} within ${timeoutMs}ms — check the endpoint is reachable, ` +
        `or pass a longer timeoutMs if this call carries a large upload over a slow connection`,
    );
    this.name = "NetworkTimeoutError";
  }
}

/**
 * A per-call/per-newsroom override read straight from the same `settings` bag adapters already
 * read `snippetTemplate` and `prefix` from — e.g. a self-hosted S3 endpoint slower than the
 * default budget, or a test pointing a small bound at a deliberately hung server. Anything that
 * is not a finite positive number is IGNORED (falls back to `fallback`): a tuning knob must
 * never turn into a NEW way to refuse a delivery by being malformed.
 */
export function timeoutFromSettings(
  settings: Record<string, string>,
  key: string,
  fallback: number,
): number {
  const raw = Number(settings[key]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/**
 * `fetch`, wrapped so it cannot hang forever. Every outbound call in the delivery substrate goes
 * through this — never a bare `fetch()` — so the bound lives in one place. On timeout the raw
 * `AbortError` is translated into `NetworkTimeoutError`; any other rejection (a real network
 * error, a non-2xx that the caller inspects on the resolved Response) passes through unchanged.
 */
export async function fetchBounded(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_NETWORK_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError")
      throw new NetworkTimeoutError(url, timeoutMs);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
