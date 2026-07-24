import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { runVerb, isRenderPayload } from "./index";
import type { RenderPayload, VerbResult } from "./types";

const payload: RenderPayload = {
  engine: "chart-native",
  spec: { nativeType: "bar" },
  format: "static",
  channel: "article-web",
  outDir: "/tmp/splash-verb-unused",
  id: "el1",
};

describe("runVerb — the vocabulary is CLOSED (invariant I4)", () => {
  it("refuses an operation outside the enum instead of improvising", async () => {
    const r = await runVerb("fetch-data", payload);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("fetch-data");
  });

  it("answers not-implemented for a DECLARED verb with no body yet", async () => {
    for (const verb of ["capture", "review", "publish"]) {
      const r = await runVerb(verb, {});
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("unreachable");
      expect(r.code).toBe("not-implemented");
    }
  });

  it("refuses a malformed render payload as invalid-request, before any dispatch", async () => {
    const r = await runVerb("render", { engine: "chart-native" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
  });
});

describe("isRenderPayload — shape gate", () => {
  it("accepts a well-formed payload and rejects wrong-typed fields", () => {
    expect(isRenderPayload(payload)).toBe(true);
    expect(isRenderPayload({ ...payload, format: "gif" })).toBe(false);
    expect(isRenderPayload({ ...payload, channel: 7 })).toBe(false);
    expect(isRenderPayload(null)).toBe(false);
  });
});

describe("invariant I6 — every request and result round-trips through JSON", () => {
  it("survives JSON.parse(JSON.stringify(x)) unchanged — this is what makes the CLI façade free", async () => {
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    const results: VerbResult<unknown>[] = [
      await runVerb("fetch-data", payload),
      await runVerb("capture", {}),
      await runVerb("render", { ...payload, engine: "nope" }),
    ];
    for (const r of results) expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
