import { test, expect } from "bun:test";
import {
  CHANNEL_POLICY,
  ALL_CHANNELS,
  allowedFormats,
  isFormatAllowed,
  channelFor,
  destinationOf,
  aspectOf,
  aspectsFor,
  needsAspectChoice,
  defaultAspectFor,
} from "./channel-policy";
import { DESTINATIONS } from "./vocabulary";

test("article-web is the only channel that allows an interactive", () => {
  expect(isFormatAllowed("article-web", "interactive")).toBe(true);
  expect(isFormatAllowed("social-vertical", "interactive")).toBe(false);
  expect(isFormatAllowed("social-feed", "interactive")).toBe(false);
});

test("every channel allows static and video", () => {
  for (const c of ["social-vertical", "social-feed", "article-web"] as const) {
    expect(allowedFormats(c)).toContain("static");
    expect(allowedFormats(c)).toContain("video");
  }
});

test("the policy carries a media size for every channel", () => {
  expect(CHANNEL_POLICY["social-vertical"].mediaSize).toEqual({
    width: 1080,
    height: 1920,
  });
});

// --- issue #1: destination × aspect, de-welded from the channel key ---------------------

test("a channel is the resolution of a destination and an aspect, not a choice of its own", () => {
  expect(channelFor("social", "portrait")).toBe("social-vertical");
  expect(channelFor("social", "square")).toBe("social-feed");
  expect(channelFor("article-web", "landscape")).toBe("article-web");
  expect(channelFor("print", "page")).toBe("print-page");
});

test("channelFor refuses an aspect its destination does not carry, rather than defaulting", () => {
  // The refusal names BOTH halves of the illegal pair, and the aspects that would have worked.
  expect(() => channelFor("social", "landscape")).toThrow(
    'no channel carries a "landscape" aspect for the "social" destination (it carries portrait, square)',
  );
  expect(() => channelFor("print", "portrait")).toThrow(
    'no channel carries a "portrait" aspect for the "print" destination (it carries page)',
  );
});

test("every channel decomposes back into the destination and aspect it was resolved from", () => {
  for (const channel of ALL_CHANNELS) {
    expect(channelFor(destinationOf(channel), aspectOf(channel))).toBe(channel);
  }
});

test("every destination carries at least one aspect, and every aspect resolves", () => {
  for (const destination of DESTINATIONS) {
    const aspects = aspectsFor(destination);
    expect(aspects.length).toBeGreaterThan(0);
    for (const aspect of aspects)
      expect(destinationOf(channelFor(destination, aspect))).toBe(destination);
  }
});

test("only social has an aspect worth asking about — web and print have one shape each", () => {
  expect(needsAspectChoice("social")).toBe(true);
  expect(needsAspectChoice("article-web")).toBe(false);
  expect(needsAspectChoice("print")).toBe(false);
  expect(defaultAspectFor("article-web")).toBe("landscape");
  expect(defaultAspectFor("print")).toBe("page");
  // Social has no default ON PURPOSE: 9:16 and 1:1 are different visuals, and guessing one
  // is the silent decision issue #1 exists to stop.
  expect(defaultAspectFor("social")).toBeUndefined();
});

test("print carries a static output only — a page does not hover and does not play", () => {
  expect(allowedFormats("print-page")).toEqual(["static"]);
  expect(isFormatAllowed("print-page", "video")).toBe(false);
  expect(isFormatAllowed("print-page", "interactive")).toBe(false);
  expect(isFormatAllowed("print-page", "scrolly")).toBe(false);
});

test("the print box is 300 dpi and halves to a whole CSS box", () => {
  // A5 landscape (210 x 148 mm) at 300 dpi. The static path renders a CSS box of
  // mediaSize/2 captured at deviceScaleFactor 2 (skills/chart-native/vite.config.ts), so an
  // odd dimension would leave the final pixel size to the browser's sub-pixel rounding.
  const { width, height } = CHANNEL_POLICY["print-page"].mediaSize;
  expect({ width, height }).toEqual({ width: 2480, height: 1748 });
  expect(width % 2).toBe(0);
  expect(height % 2).toBe(0);
});
