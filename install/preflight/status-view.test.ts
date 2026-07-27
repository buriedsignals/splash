import { describe, expect, it } from "bun:test";
import { statusView } from "./status-view.ts";

describe("how a status is shown", () => {
  it("never carries meaning by colour alone — every state has a glyph and a word", () => {
    for (const status of [
      "ready",
      "missing",
      "unverified",
      "disabled",
    ] as const) {
      const view = statusView(status, "en");
      expect(view.glyph.length).toBeGreaterThan(0);
      expect(view.label.length).toBeGreaterThan(0);
    }
  });

  it("shows an unreachable provider as degraded, never as missing", () => {
    expect(statusView("unverified", "en").tone).toBe("degraded");
    expect(statusView("missing", "en").tone).toBe("missing");
  });

  it("speaks the interface language, and falls back to English for an unknown one", () => {
    expect(statusView("ready", "fr").label).toBe("Prêt");
    expect(statusView("ready", "fr-CH").label).toBe("Prêt");
    expect(statusView("ready", "rm-CH").label).toBe(
      statusView("ready", "en").label,
    );
  });
});
