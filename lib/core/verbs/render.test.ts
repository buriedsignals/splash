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

import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outDirFor = (name: string): string =>
  join(mkdtempSync(join(tmpdir(), `render-${name}-`)), "el1");

describe("render — subprocess transport", () => {
  it("reports an engine that DECLINES this spec as engine-declined, with its reason", async () => {
    // chart-native exits 2 + "FALLBACK_TO_DW: …" when the native type is unmapped. The
    // verb reports the refusal; it never decides to route to Datawrapper — that is the
    // caller's policy.
    const r = await render({
      engine: "chart-native",
      spec: {
        nativeType: "definitely-not-a-native-type",
        title: "t",
        altInsight: "a",
        unit: "u",
        source: { name: "s" },
        format: "static",
        data: "a,b\n1,2\n",
      },
      format: "static",
      channel: "article-web",
      outDir: outDirFor("declined"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-declined");
    expect(r.message).toMatch(/FALLBACK_TO_DW|unsupported/i);
  }, 120_000);

  it("reports a failing engine as engine-failed with bounded stderr", async () => {
    const r = await render({
      engine: "chart-native",
      spec: { nativeType: "bar" }, // structurally invalid: no data, no title
      format: "static",
      channel: "article-web",
      outDir: outDirFor("failed"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message.length).toBeGreaterThan(0);
  }, 120_000);

  it("renders a real static artifact and contract-checks it", async () => {
    const outDir = outDirFor("ok");
    const r = await render({
      engine: "chart-native",
      spec: {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the four cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n",
      },
      format: "static",
      channel: "article-web",
      outDir,
      id: "el1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.form).toBe("file");
    expect(r.value.format).toBe("static");
    expect(r.value.files.some((f) => f.endsWith("static.png"))).toBe(true);
    // A real PNG, not a zero-byte placeholder.
    const png = r.value.files.find((f) => f.endsWith("static.png"))!;
    expect(readFileSync(png).length).toBeGreaterThan(1000);
  }, 300_000);
});
