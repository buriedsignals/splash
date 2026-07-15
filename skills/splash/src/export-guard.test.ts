import { describe, it, expect } from "bun:test";
import { assertDelivered } from "./export-guard";

describe("assertDelivered — code-source now requires a runnable bundle", () => {
  it("accepts a real bundle (package.json + vite.config.ts present)", () => {
    expect(() =>
      assertDelivered(
        [
          "package.json",
          "vite.config.ts",
          "index.html",
          "config.json",
          "skills",
        ],
        {
          format: "interactive",
          form: "code-source",
        },
      ),
    ).not.toThrow();
  });
  it("rejects a lone-html copy masquerading as code-source", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "code-source",
      }),
    ).toThrow(/runnable source bundle/);
  });
  it("still rejects an empty dir", () => {
    expect(() =>
      assertDelivered([], { format: "scrolly", form: "code-source" }),
    ).toThrow();
  });
});
