import { describe, it, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// NOTE: this file deliberately imports NOTHING from the project — not the CLI, not the
// registry, not the engine registrations. It spawns the façade and reads its JSON. If the
// façade forgets its composition root, the registry is empty in that process and the
// contract answers `unknown-engine`, which is exactly the failure this test exists to
// catch. Importing anything of ours here would hide it.
const CLI = join(import.meta.dir, "cli.ts");

describe("the façade carries its own engine registrations", () => {
  it("reaches a real engine in a process that imports only the CLI", async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), "host-wiring-")), "el1");
    const request = {
      engine: "chart-native",
      spec: {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the three cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n",
      },
      format: "static",
      channel: "article-web",
      outDir,
      id: "el1",
    };
    const p = Bun.spawn(["bun", CLI, "verb", "render"], {
      stdin: new TextEncoder().encode(JSON.stringify(request)),
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(p.stdout).text();
    const code = await p.exited;
    const body = JSON.parse(out);
    // The precise failure this guards against: an empty registry answers unknown-engine.
    expect(body.code).not.toBe("unknown-engine");
    expect(code).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.value.files.some((f: string) => f.endsWith("static.png"))).toBe(
      true,
    );
  }, 300_000);
});
