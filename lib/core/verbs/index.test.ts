import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { runVerb, isRenderPayload } from "./index";
import { registerProducer } from "../registry";
import type { VisualFormat } from "../vocabulary";
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
    for (const verb of ["capture", "review"]) {
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
  // toStrictEqual, never toEqual: toEqual treats a key whose value is `undefined` as absent,
  // so a field that DISAPPEARS across the round trip (JSON.stringify drops it) would still
  // compare equal — the invariant would assert nothing about exactly the loss it exists to
  // catch. Anything that fails this must be fixed by omitting the key, never by relaxing
  // the assertion.
  it("survives JSON.parse(JSON.stringify(x)) unchanged — this is what makes the CLI façade free", async () => {
    expect(JSON.parse(JSON.stringify(payload))).toStrictEqual(payload);
    const results: VerbResult<unknown>[] = [
      await runVerb("fetch-data", payload),
      await runVerb("capture", {}),
      await runVerb("render", { ...payload, engine: "nope" }),
    ];
    for (const r of results)
      expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  });
});

describe("runVerb — the never-throw invariant is STRUCTURAL at the boundary (I1)", () => {
  it("turns a residual throw from below into a VerbResult instead of escaping", async () => {
    // A deliberately broken manifest: reading `formats` throws. render() reads it outside
    // any try (it is registry data, not engine code), so this throw travels up through the
    // verb — and must stop at runVerb, the one function a host calls. A host outside
    // JavaScript has no catch, so this cannot depend on every path below being audited.
    registerProducer({
      name: "test-throwing-manifest",
      get formats(): readonly VisualFormat[] {
        throw new Error("boom: manifest exploded");
      },
      validate: () => [],
      execution: "in-process",
      inProcess: async () => {
        throw new Error("unreachable: the manifest read throws first");
      },
    });

    const r = await runVerb("render", {
      ...payload,
      engine: "test-throwing-manifest",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message).toContain("boom: manifest exploded");
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r);
  });
});
