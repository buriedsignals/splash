import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capabilities } from "./capabilities";
import { RENDER_SOURCE_POLICY_MARK } from "./source-mark";

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: Record<string, any> }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  return { code, body: JSON.parse(out) };
}

// `render` called BARE — outside a run — takes whatever credit the request supplies:
// lib/core/verbs/render.ts does not validate spec.source, and it cannot, because the credit
// lives inside a spec the contract holds OPAQUE. The decision is to MARK rather than close (the
// artifact carries no provenance, so deliver() cannot publish it and `verb publish` is already
// refused — it stays local). The mark is what stops it passing for a policy-checked artifact.
describe("a bare render says it did not go through the source policy", () => {
  it("marks a successful verb render, beside the artifact", async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), "host-mark-")), "el1");
    const r = await cli(
      ["verb", "render"],
      JSON.stringify({
        engine: "chart-native",
        spec: {
          nativeType: "bar",
          title: "Rents rose fastest in Geneva",
          altInsight: "Geneva leads the three cantons on rent growth.",
          unit: "%",
          source: { name: "Anything the host felt like typing" },
          format: "static",
          data: "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n",
        },
        format: "static",
        channel: "article-web",
        outDir,
        id: "el1",
      }),
    );
    expect(r.code).toBe(0);
    expect(r.body.ok).toBe(true);
    expect(r.body.value.sourcePolicy).toEqual(RENDER_SOURCE_POLICY_MARK);
    expect(r.body.value.sourcePolicy.checked).toBe(false);
    // Beside the artifact, never inside `report`: report is the ENGINE's bag, and the engine
    // said nothing about the source policy.
    expect(r.body.value.report).toEqual({});
    expect(
      r.body.value.files.some((f: string) => f.endsWith("static.png")),
    ).toBe(true);
  }, 300_000);

  it("does not mark a REFUSED render — nothing was rendered to mislead anyone about", async () => {
    const r = await cli(
      ["verb", "render"],
      JSON.stringify({
        engine: "nope-engine",
        spec: {},
        format: "static",
        channel: "article-web",
        outDir: join(mkdtempSync(join(tmpdir(), "host-mark-refused-")), "el1"),
        id: "el1",
      }),
    );
    expect(r.code).toBe(1);
    expect(r.body.ok).toBe(false);
    expect("sourcePolicy" in r.body).toBe(false);
  });

  it("does not mark another verb's answer", async () => {
    const r = await cli(["verb", "capture"], JSON.stringify({}));
    expect(JSON.stringify(r.body)).not.toContain("sourcePolicy");
  });

  it("is DECLARED by verbs, so a host reads it rather than discovering it", async () => {
    const declared = capabilities().verbs.find((v) => v.name === "render")!;
    expect(declared.sourcePolicy).toEqual(RENDER_SOURCE_POLICY_MARK);
    // One constant, two readers: the declaration and the answer cannot describe two worlds.
    const fromCli = await cli(["verbs"]);
    expect(
      fromCli.body.value.verbs.find(
        (v: { name: string }) => v.name === "render",
      ).sourcePolicy,
    ).toEqual(RENDER_SOURCE_POLICY_MARK);
  });

  it("says why in words a host can act on", () => {
    expect(RENDER_SOURCE_POLICY_MARK.why).toContain("publish");
    expect(RENDER_SOURCE_POLICY_MARK.why.length).toBeGreaterThan(80);
  });
});

describe("the mark leaves the nine load-bearing render tests alone", () => {
  // Not a re-implementation of them: the point is that a bare render still SUCCEEDS and still
  // answers the artifact shape those suites assert (lib/host/wiring.test.ts reaching a real
  // engine, lib/host/path-safety.test.ts's destructive-outDir refusals, cli.test.ts's
  // never-throw boundary). Marking added a sibling key; it removed nothing.
  it("still answers format, form, files and report", async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), "host-mark-shape-")), "el1");
    writeFileSync(join(mkdtempSync(join(tmpdir(), "unused-")), "x"), "");
    const r = await cli(
      ["verb", "render"],
      JSON.stringify({
        engine: "chart-native",
        spec: {
          nativeType: "bar",
          title: "Rents rose fastest in Geneva",
          altInsight: "Geneva leads the three cantons on rent growth.",
          unit: "%",
          source: { name: "Relevés cantonaux 2024" },
          format: "static",
          data: "canton,growth\nGeneva,4.1\nVaud,2.8\n",
        },
        format: "static",
        channel: "article-web",
        outDir,
        id: "el1",
      }),
    );
    expect(Object.keys(r.body.value).sort()).toEqual(
      ["files", "form", "format", "report", "sourcePolicy"].sort(),
    );
  }, 300_000);
});
