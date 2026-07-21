import { describe, it, expect } from "bun:test";
import { CORE_MARKER } from "./index";

describe("core barrel", () => {
  it("exposes the marker so the package resolves", () => {
    expect(CORE_MARKER).toBe("splash-core");
  });
});
