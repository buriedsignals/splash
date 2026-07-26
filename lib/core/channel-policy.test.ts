import { test, expect } from "bun:test";
import {
  CHANNEL_POLICY,
  allowedFormats,
  isFormatAllowed,
} from "./channel-policy";

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
