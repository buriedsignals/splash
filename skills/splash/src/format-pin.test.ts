import { test, expect } from "bun:test";
import { assertFormatAllowed } from "./channel.ts";

test("assertFormatAllowed passes a member of the channel's allowed set", () => {
  expect(() => assertFormatAllowed("article-web", "interactive")).not.toThrow();
});
test("assertFormatAllowed throws when the format is not allowed for the channel", () => {
  expect(() => assertFormatAllowed("social-vertical", "interactive")).toThrow(
    /not allowed/i,
  );
});
