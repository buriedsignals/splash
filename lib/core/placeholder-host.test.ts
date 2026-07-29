import { describe, expect, it } from "bun:test";
import {
  isPlaceholderHost,
  placeholderHostReason,
  PLACEHOLDER_LABELS,
} from "./placeholder-host";

describe("one placeholder list, the strictest of the two", () => {
  it("is the union of what each of the two used to catch", () => {
    expect([...PLACEHOLDER_LABELS].sort()).toEqual(
      ["example", "invalid", "localhost", "placeholder", "test", "todo"].sort(),
    );
  });

  it("closes the two measured cross-leaks", () => {
    // data.test passed the V2 policy and failed the V1 guard; todo.com did the opposite.
    expect(isPlaceholderHost("data.test")).toBe(true);
    expect(isPlaceholderHost("todo.com")).toBe(true);
  });

  it("still lets through the legitimate hosts V1 documented as non-hits", () => {
    // source-guard.ts:38 names these three explicitly — a label-bounded match, never substring.
    expect(isPlaceholderHost("myexample.com")).toBe(false);
    expect(isPlaceholderHost("example-data.fr")).toBe(false);
    expect(isPlaceholderHost("testing.gov.uk")).toBe(false);
  });

  it("says WHY, in one sentence a journalist can act on", () => {
    expect(placeholderHostReason("x.example.com")).toContain("example");
    expect(placeholderHostReason("www.bfs.admin.ch")).toBeNull();
  });
});
