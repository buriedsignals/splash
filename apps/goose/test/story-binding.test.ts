import { describe, expect, it } from "bun:test";
import { createStoryBinding } from "../story-binding.mjs";

function inspected(path = "/stories/one") {
  return {
    storyId: path.split("/").at(-1),
    canonicalPath: path,
    articlePath: `${path}/source/article.md`,
    hasStoryboard: true,
  };
}

describe("in-memory story binding capability", () => {
  it("keeps nomination non-authorizing and requires the displayed challenge", async () => {
    const values = ["challenge-one-123456789", "capability-one-123456789"];
    const binding = createStoryBinding({
      sessionId: "session-one-123456789",
      random: () => values.shift()!,
      inspect: async (path: string) => inspected(path),
    });
    await binding.nominate("/stories/one");
    expect(binding.current()).toBeNull();
    expect(binding.context()).toBeNull();
    expect(binding.pending()?.descriptor.storyId).toBe("one");
    expect(() => binding.confirm("wrong-challenge-123456789")).toThrow(
      "expired",
    );
    binding.confirm("challenge-one-123456789");
    expect(binding.current()?.storyId).toBe("one");
    expect(binding.context()).toEqual({
      sessionId: "session-one-123456789",
      capability: "capability-one-123456789",
    });
  });

  it("rejects expired and cross-session authority", async () => {
    let clock = 1000;
    const first = createStoryBinding({
      sessionId: "session-one",
      random: () => "first-token-123456789",
      challengeTtlMs: 10,
      now: () => clock,
      inspect: async (path: string) => inspected(path),
    });
    await first.nominate("/stories/one");
    clock += 10;
    expect(first.pending()).toBeNull();
    expect(() => first.confirm("first-token-123456789")).toThrow("expired");

    await first.nominate("/stories/one");
    first.confirm("first-token-123456789");
    const context = first.context();
    const second = createStoryBinding({
      sessionId: "session-two",
      random: () => "second-token-123456789",
      inspect: async (path: string) => inspected(path),
    });
    await second.nominate("/stories/one");
    second.confirm("second-token-123456789");
    await expect(second.revalidate(context)).rejects.toThrow("another session");
    first.clear();
    await expect(first.revalidate(context)).rejects.toThrow("expired");
  });

  it("clears a bound target when Engine revalidation sees it move or change identity", async () => {
    let current = inspected();
    const binding = createStoryBinding({
      sessionId: "session-one",
      random: () => "binding-token-123456789",
      inspect: async () => current,
    });
    await binding.nominate("/stories/one");
    binding.confirm("binding-token-123456789");
    const context = binding.context();
    current = inspected("/stories/substituted");
    await expect(binding.revalidate(context)).rejects.toThrow("changed");
    expect(binding.current()).toBeNull();
    expect(binding.context()).toBeNull();
  });

  it("rejects rather than truncating an overlong Engine path", async () => {
    const binding = createStoryBinding({
      sessionId: "session-one",
      random: () => "binding-token-123456789",
      inspect: async () => inspected(`/stories/${"x".repeat(17 << 10)}`),
    });
    await expect(binding.nominate("/stories/one")).rejects.toThrow("overlong");
    expect(binding.pending()).toBeNull();
    expect(binding.current()).toBeNull();
  });
});
