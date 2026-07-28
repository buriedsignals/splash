// The HOSTED half of the verification layer: what a capture of a published embed measures, and
// what an approval of one can bind to.
//
// Everything here is pure or shape-level. Putting a real published URL in front of a real browser
// is the gated proof's job (lib/loop/dw-chart-e2e.test.ts, lib/loop/map-dw-e2e.test.ts) — it costs
// a network round trip and a published chart, and this file must stay runnable offline.
import { test, expect } from "bun:test";
import { hostedBindingDigest, hostedBindingOf } from "./hosted";
import { capture } from "./capture";
import { isCapturePayload } from "../core/verbs/capture";
import { isDeliverableOf } from "./preview";
import type { CaptureRecord } from "./types";

const URL_V1 = "https://datawrapper.dwcdn.net/AbCdE/1/";
const URL_V2 = "https://datawrapper.dwcdn.net/AbCdE/2/";
const PIXELS = "a".repeat(64);

test("the hosted binding is a sha256 of the published address AND the pixels served at it", () => {
  const d = hostedBindingDigest(URL_V1, PIXELS);
  expect(d).toMatch(/^[0-9a-f]{64}$/);
  // Deterministic — the same embed, measured twice, binds to the same thing.
  expect(hostedBindingDigest(URL_V1, PIXELS)).toBe(d);
  // A RE-PUBLISHED chart is a different published version, so the address moves and the binding
  // moves with it. Measured on Datawrapper: publishing again returns .../2/ and the .../1/ URL
  // keeps serving what it served (see this module's header).
  expect(hostedBindingDigest(URL_V2, PIXELS)).not.toBe(d);
  // ...and so does a chart that renders differently at the same address.
  expect(hostedBindingDigest(URL_V1, "b".repeat(64))).not.toBe(d);
});

function hostedRecord(over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    breakpoint: "primary",
    path: "/tmp/verify/e1/review-primary.png",
    sha256: PIXELS,
    cssViewport: { width: 900, height: 560 },
    deviceScaleFactor: 2,
    rootBox: { x: 0, y: 0, width: 900, height: 436 },
    rootSelector: "body",
    documentScroll: { width: 900, height: 560 },
    artifactSha256: hostedBindingDigest(URL_V1, PIXELS),
    artifactUrl: URL_V1,
    destinationId: "article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-01-01T00:00:00.000Z",
    marks: 5,
    markColours: ["#18a1cd"],
    titleSource: "h3",
    ...over,
  };
}

// The URL and the digest must come from the SAME record — the primary, the one capture computes
// the digest over. The narrow record below names a DIFFERENT address on purpose: a hosted engine
// may legitimately serve a per-breakpoint variant, and reading "the first record with an address"
// then reported narrow's URL beside primary's digest. With one URL on every fixture record that
// mismatch is invisible, which is why this test now uses two.
test("the binding is read back off the capture that measured the embed", () => {
  const NARROW_URL = `${URL_V1}?mobile=1`;
  const b = hostedBindingOf([
    hostedRecord({
      breakpoint: "narrow",
      artifactUrl: NARROW_URL,
      sha256: "e".repeat(64),
    }),
    hostedRecord(),
  ]);
  expect(b).toEqual({
    digest: hostedBindingDigest(URL_V1, PIXELS),
    url: URL_V1,
  });
  // The pair REPRODUCES: re-deriving the digest from the reported URL and the primary still's own
  // pixels gives back the reported digest. That is exactly the property a mismatched pair breaks,
  // and it is what makes the sign-off document's `artifactUrl` mean something.
  expect(hostedBindingDigest(b!.url, PIXELS)).toBe(b!.digest);
  // ...and with no primary record at all, the fallback is the same one capture uses.
  expect(
    hostedBindingOf([
      hostedRecord({ breakpoint: "narrow", artifactUrl: NARROW_URL }),
    ])?.url,
  ).toBe(NARROW_URL);
  // A capture of a FILE carries no hosted binding — the artifact's own bytes are the subject.
  expect(
    hostedBindingOf([
      {
        ...hostedRecord(),
        artifactUrl: undefined,
        artifactPath: "/tmp/e1/interactive.html",
      },
    ]),
  ).toBeUndefined();
  expect(hostedBindingOf([])).toBeUndefined();
});

test("a capture payload names a file OR a published address, never both and never neither", () => {
  const base = {
    format: "interactive",
    channel: "article-web",
    outDir: "/tmp/out",
    id: "e1",
  };
  expect(
    isCapturePayload({ ...base, artifactPath: "/tmp/e1/interactive.html" }),
  ).toBe(true);
  expect(isCapturePayload({ ...base, artifactUrl: URL_V1 })).toBe(true);
  expect(isCapturePayload({ ...base })).toBe(false);
  expect(
    isCapturePayload({
      ...base,
      artifactPath: "/tmp/e1/interactive.html",
      artifactUrl: URL_V1,
    }),
  ).toBe(false);
});

test("capture refuses an address that is not a published https embed, before opening a browser", async () => {
  for (const artifactUrl of [
    "",
    "http://datawrapper.dwcdn.net/AbCdE/1/",
    "https://localhost/x/",
  ]) {
    const r = await capture({
      artifactUrl,
      format: "interactive",
      channel: "article-web",
      outDir: "/tmp/splash-hosted-capture-refusal",
      id: "e1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
  }
});

test("capture refuses a published address for a STATIC element — a png is measured off its own bytes", async () => {
  const r = await capture({
    artifactUrl: URL_V1,
    format: "static",
    channel: "article-web",
    outDir: "/tmp/splash-hosted-capture-refusal",
    id: "e1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("static");
});

// A HOSTED deliverable IS a URL, so the genre gate has to be able to say so — otherwise the
// preview record of an embed reads as "not the deliverable of an interactive element" and the
// approval gate refuses a preview that showed exactly the right thing.
test("a published address is the deliverable of an embed-genre element, and of nothing else", () => {
  expect(isDeliverableOf("interactive", URL_V1)).toBe(true);
  expect(isDeliverableOf("scrolly", URL_V1)).toBe(true);
  expect(isDeliverableOf("static", URL_V1)).toBe(false);
  expect(isDeliverableOf("video", URL_V1)).toBe(false);
  // The file forms are unmoved.
  expect(
    isDeliverableOf("interactive", "/runs/r1/elements/e1/interactive.html"),
  ).toBe(true);
  expect(
    isDeliverableOf("interactive", "/runs/r1/elements/e1/static.png"),
  ).toBe(false);
});
