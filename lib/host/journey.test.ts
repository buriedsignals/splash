import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, type RunManifest } from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: unknown }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  const body = JSON.parse(out);
  // I6, on every single response the host sees.
  expect(JSON.parse(JSON.stringify(body))).toStrictEqual(body);
  return { code, body };
}

describe("the whole journey through the façade", () => {
  it("declares itself, reports a run, renders, and the run is still readable", async () => {
    const dir = mkdtempSync(join(tmpdir(), "host-journey-"));
    const src = join(dir, "src.csv");
    writeFileSync(src, "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n");
    const run: RunManifest = {
      runId: "journey",
      schemaVersion: 2,
      input: { data: freezeInput(dir, src, "data") },
      elements: [{ id: "el1" }],
      events: [],
    };
    writeManifest(join(dir, "run.json"), run);

    // 1. The host discovers the contract.
    const verbs = await cli(["verbs"]);
    expect(verbs.code).toBe(0);
    // The shared envelope: `verbs` answers { ok, value } like every other command.
    const capabilities = (
      verbs.body as {
        ok: boolean;
        value: {
          verbs: { name: string; implemented: boolean }[];
          vocabulary: { engines: { name: string; formats: string[] }[] };
        };
      }
    ).value;
    expect((verbs.body as { ok: boolean }).ok).toBe(true);
    expect(
      capabilities.verbs.find((v) => v.name === "render")!.implemented,
    ).toBe(true);
    // The engine the host is about to name, and the format it is about to ask for, are both
    // discoverable from the declaration alone — no reading of our source.
    const chartNative = capabilities.vocabulary.engines.find(
      (e) => e.name === "chart-native",
    )!;
    expect(chartNative.formats).toContain("static");

    // 2. It reads where the run stands — no artifact yet.
    const before = await cli(["state", "--run", dir]);
    expect(before.code).toBe(0);
    const beforeReport = (
      before.body as {
        value: { elements: { validation: { artifact: string } }[] };
      }
    ).value;
    expect(beforeReport.elements[0].validation.artifact).toBe("none");

    // 3. It executes the verb. The payload is the HOST's to build — the contract is
    //    neutral and takes no run directory.
    const outDir = join(dir, "elements", "el1");
    const rendered = await cli(
      ["verb", "render"],
      JSON.stringify({
        engine: "chart-native",
        spec: {
          nativeType: "bar",
          title: "Rents rose fastest in Geneva",
          altInsight: "Geneva leads the three cantons on rent growth.",
          unit: "%",
          source: { name: "Provided by the newsroom" },
          format: "static",
          data: readFileSync(src, "utf8"),
        },
        format: "static",
        channel: "article-web",
        outDir,
        id: "el1",
      }),
    );
    expect(rendered.code).toBe(0);
    const result = rendered.body as { ok: boolean; value: { files: string[] } };
    expect(result.ok).toBe(true);
    const png = result.value.files.find((f) => f.endsWith("static.png"))!;
    expect(readFileSync(png).length).toBeGreaterThan(1000);

    // 4. The run is untouched by the verb: the contract writes artifacts, the loop writes
    //    state. A host that renders has not silently mutated the ledger.
    const after = await cli(["state", "--run", dir]);
    expect(after.code).toBe(0);
    expect(after.body).toStrictEqual(before.body);
  }, 300_000);
});
