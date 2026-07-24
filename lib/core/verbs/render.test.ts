import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { render } from "./render";
import type { RenderPayload } from "./types";

const base: RenderPayload = {
  engine: "chart-native",
  spec: { nativeType: "bar" },
  format: "static",
  channel: "article-web",
  outDir: "/tmp/splash-verb-unused",
  id: "el1",
};

describe("render — request validation happens before any filesystem or engine touch", () => {
  it("refuses an unsafe id as invalid-request, never a throw (invariant I1)", async () => {
    const r = await render({ ...base, id: "../../evil" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
    expect(r.message).toMatch(/not a safe slug/i);
  });

  it("refuses an unregistered engine as unknown-engine", async () => {
    const r = await render({ ...base, engine: "nope" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unknown-engine");
    // Byte-identical to the legacy dispatcher's string (adapters.ts:332).
    expect(r.message).toBe('unknown producer "nope"');
  });
});
