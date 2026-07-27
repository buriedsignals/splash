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
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(dir, src, "data") },
      // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
      // journalist brought. produce() refuses an undeclared run rather than crediting a
      // placeholder, so every fixture that reaches a render says what its data is.
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
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
          // What a real host sends: the credit taken from the run's OWN declared ledger,
          // never a placeholder. This is the same line the loop renders — produce() reads
          // `published.attribution` out of validateSourcePolicy and refuses a run that
          // declared nothing — so an example showing "Provided by the newsroom" documented
          // a payload the loop stopped building. Derived rather than retyped, so the
          // example cannot drift from the ledger above it.
          source: { name: run.sources!.data!.label },
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

describe("a non-JS host carries a run all the way to delivery", () => {
  // The thesis of the decision surface, exercised end to end: after the run directory exists,
  // EVERY step below is a façade command. Nothing writes into run.json by hand — which was the
  // only way to record a choice before these commands existed.
  //
  // What the fixture still carries: the angle. `confirm-angle` is a free-text editorial act
  // (takeaway, alt text, unit), deliberately left out of this slice — a command that wrote
  // arbitrary prose into the manifest would be the disease, not the cure. So the run arrives
  // angled, and the loop is driven from there.
  it("advances, chooses, produces, decides where it goes, and publishes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "host-delivery-"));
    const src = join(dir, "src.csv");
    writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
    const run: RunManifest = {
      runId: "delivered",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(dir, src, "data") },
      // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
      // journalist brought. produce() refuses an undeclared run rather than crediting a
      // placeholder, so every fixture that reaches a render says what its data is.
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
      elements: [
        {
          id: "el1",
          requestedFormat: "static",
          angle: {
            confirmedTakeaway: "Premiums rose in both cantons",
            altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
            unit: "CHF",
          },
        },
      ],
      events: [],
    };
    writeManifest(join(dir, "run.json"), run);

    // 1. orient, then 2. propose — two deterministic steps, one call each.
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const proposed = await cli(["advance", "--run", dir]);
    expect(proposed.code).toBe(0);
    expect((proposed.body as { value: { ran: string } }).value.ran).toBe(
      "propose",
    );

    // 3. The journalist chooses — read the offer from `state`, name an id, and that id is
    //    persisted by CODE. The choice is taken from the run itself, never guessed.
    const offer = JSON.parse(
      readFileSync(join(dir, "run.json"), "utf8"),
    ) as RunManifest;
    const buildable = offer.elements[0]!.proposal!.options.find(
      (o) => !o.readiness,
    )!;
    const chosen = await cli([
      "choose-form",
      "--run",
      dir,
      "--option",
      buildable.id,
    ]);
    expect(chosen.code).toBe(0);
    expect(
      (chosen.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["produce"]);

    // 4. produce — a real chart-native render, through the loop rather than through `verb`.
    const produced = await cli(["advance", "--run", dir]);
    expect(produced.code).toBe(0);
    expect((produced.body as { value: { ran: string } }).value.ran).toBe(
      "produce",
    );
    // A fresh artifact nobody asked to publish stays on show: `deliver` is not automatic.
    expect(
      (produced.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["show"]);

    // 5. The second decision: where it goes. No --to, so the destination is derived from the
    //    format's genre — a static image is handed over as a portable package.
    const asked = await cli(["request-delivery", "--run", dir]);
    expect(asked.code).toBe(0);
    expect(
      (asked.body as { value: { requested: string[] } }).value,
    ).toMatchObject({ requested: ["zip"], nextActions: ["deliver"] });
    // The decision alone made the step valid — this is the answer that used to be unreachable:
    // `next` could say "deliver" and nothing in the façade could carry it out.
    const next = await cli(["next", "--run", dir]);
    expect((next.body as { value: { nextActions: string[] } }).value).toEqual({
      nextActions: ["deliver"],
    });

    // 6. deliver — the same `advance`, now carrying out what `next` says.
    const delivered = await cli(["advance", "--run", dir]);
    expect(delivered.code).toBe(0);
    expect((delivered.body as { value: { ran: string } }).value.ran).toBe(
      "deliver",
    );

    // 7. And the run says so, read back by a separate process.
    const state = await cli(["state", "--run", dir]);
    const report = (
      state.body as { value: { elements: { gateState: string }[] } }
    ).value;
    expect(report.elements[0]!.gateState).toBe("delivered");
    const record = (
      JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as RunManifest
    ).elements[0]!.delivery!.delivered[0]!;
    expect(record.publisherId).toBe("zip");
    expect(
      readFileSync(join(dir, record.artifact!.path)).length,
    ).toBeGreaterThan(0);
  }, 300_000);
});
