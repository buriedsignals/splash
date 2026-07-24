import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { render } from "./render";
import { registerProducer } from "../registry";
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

import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
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

  it("returns invalid-request (never throws) for a spec JSON.stringify cannot serialize, and leaves no temp spec dir behind", async () => {
    // `spec` is opaque `unknown` by contract — a caller can hand us a cyclic object.
    // Regression for a Critical finding: this used to escape render() as a rejected
    // promise (I1 violation) AND leaked a `splash-verb-spec-*` dir in $TMPDIR.
    const cyclic: Record<string, unknown> = { nativeType: "bar" };
    cyclic.self = cyclic;

    const before = readdirSync(tmpdir()).filter((n) =>
      n.startsWith("splash-verb-spec-"),
    );

    const r = await render({
      engine: "chart-native",
      spec: cyclic,
      format: "static",
      channel: "article-web",
      outDir: outDirFor("cyclic"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");

    const after = readdirSync(tmpdir()).filter((n) =>
      n.startsWith("splash-verb-spec-"),
    );
    expect(after.length).toBe(before.length);
  });
});

describe("render — in-process transport (hosted Datawrapper engines)", () => {
  // The real ChartSpec shape (skills/dw-chart/src/chart-spec.ts requires type, title,
  // data and altInsight; source is the furniture). Copied from the engine's own test
  // fixtures, never invented.
  const dwSpec = {
    type: "d3-lines",
    title: "Unemployment is at a five-year low",
    data: "year,value\n2018,5.1\n2023,3.7",
    source: { name: "Sample data" },
    altInsight: "The rate falls from 5.1% in 2018 to 3.7% in 2023",
  };

  it('rejects "video" BEFORE any network call, with the byte-exact legacy string', async () => {
    const r = await render({
      engine: "dw-chart",
      spec: dwSpec,
      format: "video",
      channel: "article-web",
      outDir: outDirFor("dw-video"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
    expect(r.message).toBe(
      'dw-chart cannot build format "video" — it supports "static" or ' +
        '"interactive" only (video/scrolly require chart-native)',
    );
  });

  it('map-dw rejects "scrolly" naming map-native as the engine that owns it', async () => {
    const r = await render({
      engine: "map-dw",
      spec: dwSpec,
      format: "scrolly",
      channel: "article-web",
      outDir: outDirFor("mapdw-scrolly"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toBe(
      'map-dw cannot build format "scrolly" — it supports "static" or ' +
        '"interactive" only (video/scrolly require map-native)',
    );
  });

  it("reports a spec the engine's own validator rejects as invalid-spec", async () => {
    const r = await render({
      engine: "dw-chart",
      spec: { type: "d3-lines" }, // no title, no data, no altInsight
      format: "static",
      channel: "article-web",
      outDir: outDirFor("dw-invalid"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-spec");
    expect(r.message.length).toBeGreaterThan(0);
  });
});

describe("render — in-process transport never throws on an unguarded failure (I1)", () => {
  it("returns invalid-spec, never throws, when the engine's own validator itself throws", async () => {
    registerProducer({
      name: "test-throwing-validate",
      formats: ["static"],
      validate: () => {
        throw new Error("boom: validator exploded");
      },
      execution: "in-process",
      inProcess: async () => {
        throw new Error(
          "unreachable: validate should have short-circuited first",
        );
      },
    });

    const r = await render({
      engine: "test-throwing-validate",
      spec: {},
      format: "static",
      channel: "article-web",
      outDir: outDirFor("throwing-validate"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-spec");
    expect(r.message).toMatch(/boom: validator exploded/);
  });

  it("returns engine-failed, never throws, when outDir cannot be created (fs failure)", async () => {
    // A regular FILE sitting where a directory needs to be created: mkdirSync({recursive})
    // throws ENOTDIR trying to descend through it. freshOutDir is called unguarded outside
    // a try in the brief's prescribed code — this is the regression test for that gap
    // (the same class of bug render.ts's subprocess branch already guards against).
    const blockerFile = join(
      mkdtempSync(join(tmpdir(), "render-blocker-")),
      "not-a-dir",
    );
    writeFileSync(blockerFile, "x");

    const r = await render({
      engine: "dw-chart",
      spec: {
        type: "d3-lines",
        title: "Unemployment is at a five-year low",
        data: "year,value\n2018,5.1\n2023,3.7",
        source: { name: "Sample data" },
        altInsight: "The rate falls from 5.1% in 2018 to 3.7% in 2023",
      },
      format: "static",
      channel: "article-web",
      outDir: join(blockerFile, "el1"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message.length).toBeGreaterThan(0);
  });
});

describe("the format gate covers BOTH transports", () => {
  it("refuses a format a subprocess engine does not declare, before spawning anything", async () => {
    // chart-native declares static/interactive/video; scrolly belongs to the scrolly engine.
    const r = await render({
      engine: "chart-native",
      spec: { nativeType: "bar" },
      format: "scrolly",
      channel: "article-web",
      outDir: outDirFor("subprocess-unsupported"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
  });

  it("uses the engine's OWN refusal message when its manifest declares one", async () => {
    // image-native ships "scrolly" only in v1 and says so in its own words. The contract
    // must not replace a message a journalist may already have seen with a generic one.
    const r = await render({
      engine: "image-native",
      spec: { frames: [] },
      format: "static",
      channel: "article-web",
      outDir: outDirFor("image-native-v1"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
    expect(r.message).toContain('image-native builds "scrolly" only in v1');
  });
});

describe("render — the never-throw invariant is structural, not audited (I1)", () => {
  it("returns rather than throws even when a registered manifest is hostile (I1 is structural)", async () => {
    // The hostile member must be one `registerProducer` itself never reads, or the throw
    // fires at registration instead of inside render and the test proves nothing.
    // registerProducer reads name / execution / subprocess / inProcess; it never reads
    // unsupportedFormatMessage, which the format gate reads on the refusal path.
    const { registerProducer } = await import("../registry");
    registerProducer({
      name: "hostile-message-engine",
      formats: ["static"],
      validate: () => [],
      execution: "subprocess",
      subprocess: {
        scriptPath: "/nonexistent",
        skillDir: "/tmp",
        threadsChannel: false,
      },
      get unsupportedFormatMessage(): string {
        throw new Error("hostile manifest");
      },
    });
    // Ask for a format it does not declare → the gate fires → it reads the throwing member.
    const r = await render({
      engine: "hostile-message-engine",
      spec: {},
      format: "video",
      channel: "article-web",
      outDir: outDirFor("hostile"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message).toContain("hostile manifest");
  });
});
