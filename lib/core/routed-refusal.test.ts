import { test, expect } from "bun:test";
import {
  REFUSAL_CODES,
  REFUSAL_ROUTES,
  journalistSentence,
  refusalSentence,
  routed,
  type RoutedRefusal,
} from "./routed-refusal";

test("every declared code has an entry in the catalogue, and the catalogue holds nothing else", () => {
  expect(Object.keys(REFUSAL_ROUTES).sort()).toEqual([...REFUSAL_CODES].sort());
});

test("a routed refusal names what is missing AND the act that resolves it", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  expect(r.code).toBe("render-not-shown");
  expect(r.route).not.toBeNull();
  const sentence = refusalSentence(r);
  expect(sentence).toContain("nobody has been shown this visual yet");
  expect(sentence).toContain("bun lib/host/cli.ts present");
});

test("the journalist's rendering carries the act but never the command", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  const said = journalistSentence(r);
  expect(said).toContain("nobody has been shown this visual yet");
  expect(said).toContain(REFUSAL_ROUTES["render-not-shown"]!.step);
  expect(said).not.toContain("bun ");
  expect(said).not.toContain("cli.ts");
});

test("a refusal with no way out SAYS it has none, instead of trailing off", () => {
  const dead: RoutedRefusal = {
    code: "no-candidates-menu",
    message: "x",
    route: null,
  };
  expect(refusalSentence(dead)).toContain("nothing here unblocks it");
  expect(journalistSentence(dead)).toContain("nothing here unblocks it");
});

test("a route with a step and no command renders the step alone, never a dangling colon", () => {
  const r = routed("no-candidates-menu", "no ranked menu was written down");
  expect(REFUSAL_ROUTES["no-candidates-menu"]!.command).toBeUndefined();
  expect(refusalSentence(r)).not.toContain(": undefined");
  expect(
    refusalSentence(r).endsWith(REFUSAL_ROUTES["no-candidates-menu"]!.step),
  ).toBe(true);
});

test("no route's command is a shell string — a route is run, not interpolated", () => {
  for (const route of Object.values(REFUSAL_ROUTES)) {
    if (!route?.command) continue;
    expect(route.command.startsWith("bun ")).toBe(true);
    expect(route.command).not.toContain("&&");
    expect(route.command).not.toContain("|");
  }
});
