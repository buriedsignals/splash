import { beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adapterFor } from "../src/adapters.ts";

let craft: string;
const kit = (...parts: string[]) => {
  mkdirSync(join(craft, ...parts), { recursive: true });
  writeFileSync(join(craft, ...parts, "render-beat.mjs"), "");
};

beforeAll(() => {
  craft = mkdtempSync(join(tmpdir(), "splash-craft-"));
  kit("static", "bar-and-column");
  kit("static", "bar-and-column.gestures");
  kit("video", "bar-and-column");
  kit("video", "bar-and-column.gestures");
  kit("video", "line");
});

describe("adapterFor", () => {
  it("should return the gesture kit for a bar video", () => {
    expect(adapterFor("Bar and column", "video", { craft })).toBe(
      join(craft, "video", "bar-and-column.gestures"),
    );
  });

  it("should keep the per-type static bar kit while the static switch is off", () => {
    expect(
      adapterFor("Bar and column", "static", { craft, staticGestures: false }),
    ).toBe(join(craft, "static", "bar-and-column"));
  });

  it("should return the static gesture kit once the static switch is on", () => {
    expect(
      adapterFor("Bar and column", "static", { craft, staticGestures: true }),
    ).toBe(join(craft, "static", "bar-and-column.gestures"));
  });

  it("should still return the per-type kit for a type with no gesture family", () => {
    expect(adapterFor("Line", "video", { craft })).toBe(
      join(craft, "video", "line"),
    );
  });

  it("should return the per-type kit for a format whose gesture kit does not exist yet", () => {
    kit("web", "bar-and-column");
    expect(adapterFor("Bar and column", "web", { craft })).toBe(
      join(craft, "web", "bar-and-column"),
    );
  });
});
