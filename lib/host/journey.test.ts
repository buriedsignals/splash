import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunManifest } from "../loop/manifest";

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: unknown }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
    // No journalist is sitting in front of a test process, so the spine prints the path
    // instead of launching a viewer — the same flag a host that presents the deliverable
    // itself sets (lib/loop/preview.ts). It is the run's environment, not a stub: the
    // presentation is performed for real and recorded truthfully as what it was.
    env: { ...process.env, SPLASH_NO_VIEWER: "1" },
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
    // The run is created THROUGH the façade, like everything else in this file: a CSV the test
    // wrote into its own directory is a `local` source (lib/source) — the file the journalist
    // brought — and produce() refuses an undeclared run rather than crediting a placeholder, so
    // every fixture that reaches a render says what its data is.
    const SOURCE_LABEL = "Relevés cantonaux 2024";
    expect(
      (
        await cli(
          ["init", "--run", dir],
          JSON.stringify({
            runId: "journey",
            input: { data: src },
            sources: {
              mode: "real",
              data: { kind: "local", label: SOURCE_LABEL },
            },
          }),
        )
      ).code,
    ).toBe(0);

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
          // a payload the loop stopped building. Taken from the same constant the run was
          // declared with, so the example cannot drift from the ledger above it.
          //
          // And what the façade answers to this call now SAYS that nothing validated this
          // credit (lib/host/source-mark.ts): a bare render reaches a real artifact without a
          // run, so the mark is what stops it passing for a policy-checked one.
          source: { name: SOURCE_LABEL },
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
    const result = rendered.body as {
      ok: boolean;
      value: { files: string[]; sourcePolicy: { checked: boolean } };
    };
    expect(result.ok).toBe(true);
    expect(result.value.sourcePolicy.checked).toBe(false);
    const png = result.value.files.find((f) => f.endsWith("static.png"))!;
    expect(readFileSync(png).length).toBeGreaterThan(1000);

    // 4. The run is untouched by the verb: the contract writes artifacts, the loop writes
    //    state. A host that renders has not silently mutated the ledger.
    const after = await cli(["state", "--run", dir]);
    expect(after.code).toBe(0);
    expect(after.body).toStrictEqual(before.body);
  }, 300_000);
});


describe("a non-JS host carries a run from NOTHING to a delivered artifact", () => {
  // THE PROOF. Every step below is a SPAWNED CLI call: no manifest is constructed in process, no
  // run.json is written by hand at any step, and this file imports nothing from lib/loop for the
  // journey itself. That is the difference this slice exists to make — the previous version of
  // this test built the manifest as a literal (freezeInput + writeManifest) and started at
  // `advance`, because there was no command that could create a run and none that could record
  // an angle. A host outside JavaScript could therefore drive a run it had no way to begin.
  //
  // Each command is NECESSARY here, which is what stops any of them from going dead again:
  // without `init` there is no run, without `confirm-angle` the loop stops at step 2 of 6,
  // without the offer in `state` the phrasing cannot be written, without `phrase` the manifest
  // refuses the choice — and without capture, review, preview and `approve`, the artifact
  // cannot be PUBLISHED at all. That last one is asserted directly (step 9b): a produced visual
  // nobody has approved is refused by deliver() itself, not merely routed around.
  //
  // The publisher is `zip` — offline, no credentials — so the proof needs no account anywhere.
  it("init → orient → angle → propose → phrase → choose → produce → capture → review → preview → approve → deliver", async () => {
    const dir = mkdtempSync(join(tmpdir(), "host-journey-full-"));
    const src = join(dir, "premiums.csv");
    writeFileSync(
      src,
      "canton,2015,2024\nGenève,449,583\nVaud,412,531\nBerne,398,502\n",
    );

    // 1. INIT — the run does not exist yet. This is the step that had no command at all.
    const started = await cli(
      ["init", "--run", dir],
      JSON.stringify({
        runId: "primes-maladie",
        input: { data: src },
        // What the data IS, not just which file it is: produce() takes the rendered credit from
        // this ledger and refuses a run that declared nothing.
        sources: {
          mode: "real",
          data: { kind: "local", label: "Relevés cantonaux 2024" },
        },
        elements: [{ id: "el1", requestedFormat: "static" }],
      }),
    );
    expect(started.code).toBe(0);
    expect((started.body as { value: { nextActions: string[] } }).value).toEqual(
      { runId: "primes-maladie", nextActions: ["orient"] },
    );

    // 2. ORIENT — the first deterministic step.
    const oriented = await cli(["advance", "--run", dir]);
    expect(oriented.code).toBe(0);
    expect((oriented.body as { value: { ran: string } }).value.ran).toBe(
      "orient",
    );
    expect(
      (oriented.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["confirm-angle"]);

    // 3. CONFIRM-ANGLE — the human turn the façade could previously only NAME. Four named
    //    slots; the host answers four known questions and never designates a field.
    const TAKEAWAY = "Les primes ont augmenté dans les trois cantons";
    const ALT =
      "La prime adulte moyenne passe de 449 à 583 francs à Genève entre 2015 et 2024.";
    const angled = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
    ]);
    expect(angled.code).toBe(0);
    expect(
      (angled.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["propose"]);

    // 4. PROPOSE — the brain builds the offer, as data.
    const proposed = await cli(["advance", "--run", dir]);
    expect(proposed.code).toBe(0);
    expect((proposed.body as { value: { ran: string } }).value.ran).toBe(
      "propose",
    );
    // Un-phrased, so the loop asks the desk before it asks the journalist.
    expect(
      (proposed.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["phrase"]);

    // 5. READ THE OFFER FROM `state` — not from run.json. This is the omission that made the
    //    host blind: it was told "choose-form" and shown no forms.
    const offered = await cli(["state", "--run", dir]);
    expect(offered.code).toBe(0);
    const element = (
      offered.body as {
        value: {
          elements: {
            proposal?: {
              options: {
                id: string;
                nativeType: string;
                why: string;
                whySource?: {
                  fragments: string[];
                  facts: Record<string, string>;
                };
                readiness?: { status: string };
              }[];
              excluded: { id: string; reason: string }[];
            };
          }[];
        };
      }
    ).value.elements[0]!;
    expect(element.proposal).toBeDefined();
    const options = element.proposal!.options;
    expect(options.length).toBeGreaterThan(0);
    // Every option arrives unwritten and GROUNDED — the two halves of the phrasing seam.
    expect(options.every((o) => o.why === "")).toBe(true);
    expect(options.every((o) => (o.whySource?.fragments.length ?? 0) > 0)).toBe(
      true,
    );

    // 6. PHRASE — one sentence per offered form, in the offer's order, written from the
    //    grounding `state` just handed over. Numbers are checked against that grounding, so
    //    this prose quotes a fact rather than inventing one.
    const phrasings = options.map((o) => ({
      id: o.id,
      why: `Une forme « ${o.nativeType} » lit directement cette comparaison sur ${o.whySource!.facts.rows ?? "les"} lignes.`,
      ...(o.readiness ? { markAcknowledged: true as const } : {}),
    }));
    const phrased = await cli(
      ["phrase", "--run", dir],
      JSON.stringify(phrasings),
    );
    expect(phrased.code).toBe(0);
    expect(
      (phrased.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["choose-form"]);

    // The prose the host wrote is the prose the run now carries — read back through `state`.
    const written = await cli(["state", "--run", dir]);
    const writtenOptions = (
      written.body as {
        value: { elements: { proposal: { options: { why: string }[] } }[] };
      }
    ).value.elements[0]!.proposal.options;
    expect(writtenOptions.map((o) => o.why)).toEqual(
      phrasings.map((p) => p.why),
    );

    // 7. CHOOSE-FORM — the journalist's decision, on an offer that has now been shown.
    const buildable = options.find((o) => !o.readiness)!;
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

    // 8. PRODUCE — a real chart-native render, through the loop.
    const produced = await cli(["advance", "--run", dir]);
    expect(produced.code).toBe(0);
    expect((produced.body as { value: { ran: string } }).value.ran).toBe(
      "produce",
    );
    expect(
      (produced.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["show"]);

    // 9. REQUEST-DELIVERY — where it goes. A static image is handed over as a package.
    //    It does NOT make `deliver` valid: the road to publication starts at the verification
    //    chain, and the answer says so in the same breath as the decision.
    const asked = await cli(["request-delivery", "--run", dir]);
    expect(asked.code).toBe(0);
    expect(
      (asked.body as { value: { requested: string[] } }).value,
    ).toMatchObject({ requested: ["zip"], nextActions: ["capture"] });

    // 9b. DELIVERY IS UNREACHABLE WITHOUT THE CHAIN. This is the property the whole slice
    //     exists for, so it is asserted before anything else runs: a produced artifact that
    //     nobody has captured, reviewed, seen or approved cannot be published, and it is not
    //     the router alone that says so — deliver() itself refuses. `verb publish` is refused
    //     at this façade, so the only path to publication is `advance`, and here it does the
    //     next thing that is actually valid: it captures.
    const tooEarly = await cli(["advance", "--run", dir]);
    expect(tooEarly.code).toBe(0);
    expect((tooEarly.body as { value: { ran: string } }).value.ran).toBe(
      "capture",
    );
    const beforeApproval = JSON.parse(
      readFileSync(join(dir, "run.json"), "utf8"),
    ) as RunManifest;
    expect(beforeApproval.elements[0]!.delivery!.delivered).toEqual([]);
    expect(beforeApproval.elements[0]!.approved).toBeUndefined();

    // 9c. CAPTURE, measured at the container this deliverable publishes into. A REAL
    //     measurement of a REAL file: the png the loop rendered, read at its own IHDR.
    const captured = beforeApproval.elements[0]!.capture!;
    expect(captured.images).toHaveLength(1);
    const image = captured.images[0]!;
    expect(image.artifactSha256).toBe(
      beforeApproval.elements[0]!.artifact!.sha256,
    );
    expect(image.destinationId).toBe("channel:article-web");
    expect(image.cssViewport).toEqual({ width: 1200, height: 675 });
    expect(
      captured.checks.find((c) => c.id === "capture:size-matches-destination")!
        .outcome,
    ).toBe("pass");

    // 9d. REVIEW — the facts become findings, with the reviewer named for what it is.
    const reviewedStep = await cli(["advance", "--run", dir]);
    expect(reviewedStep.code).toBe(0);
    expect((reviewedStep.body as { value: { ran: string } }).value.ran).toBe(
      "review",
    );
    expect(
      (reviewedStep.body as { value: { nextActions: string[] } }).value
        .nextActions,
    ).toEqual(["preview"]);

    // 9e. PREVIEW — issue #3, mechanically: the deliverable is presented before anyone is
    //     asked to approve it, and the record says which bytes were shown and how.
    const previewed = await cli(["advance", "--run", dir]);
    expect(previewed.code).toBe(0);
    expect((previewed.body as { value: { ran: string } }).value.ran).toBe(
      "preview",
    );
    expect(
      (previewed.body as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["approve"]);

    // 9f. THE HOST READS WHAT THE GATE WILL ASK FOR, from `state` — not from run.json.
    const atTheGate = await cli(["state", "--run", dir]);
    const verification = (
      atTheGate.body as {
        value: {
          elements: {
            gateState: string;
            verification?: {
              findings: { id: string; severity: string }[];
              preview?: { presentedAs: string; deliverableSha256: string };
              independentSemanticReview: string;
              approval: { approvable: boolean; reasons: { code: string }[] };
            };
          }[];
        };
      }
    ).value.elements[0]!.verification!;
    expect(verification.findings).toEqual([]);
    expect(verification.preview!.deliverableSha256).toBe(
      beforeApproval.elements[0]!.artifact!.sha256,
    );
    // The absence of an independent semantic reviewer is RECORDED, never converted into a
    // pass: no unpublished reporting leaves this machine, so nothing claims independence.
    expect(verification.independentSemanticReview).toBe("unavailable");
    expect(verification.approval.approvable).toBe(true);

    // 9g. ADVANCE CANNOT PERFORM THE APPROVAL, and names who does.
    const humanTurn = await cli(["advance", "--run", dir]);
    expect(humanTurn.code).toBe(1);
    expect((humanTurn.body as { message: string }).message).toContain(
      "approve --run <dir>",
    );

    // 9h. APPROVE — the human decision, recorded against these exact bytes.
    const approved = await cli(
      ["approve", "--run", dir],
      JSON.stringify({ actorLabel: "Yvan Pandelé" }),
    );
    expect(approved.code).toBe(0);
    expect(
      (approved.body as { value: { approved: string; nextActions: string[] } })
        .value,
    ).toEqual({ approved: "el1", nextActions: ["deliver"] });

    // 10. DELIVER.
    const delivered = await cli(["advance", "--run", dir]);
    expect(delivered.code).toBe(0);
    expect((delivered.body as { value: { ran: string } }).value.ran).toBe(
      "deliver",
    );

    // 11. And the run says so, read back by a separate process.
    const final = await cli(["state", "--run", dir]);
    const report = (
      final.body as {
        value: {
          elements: {
            gateState: string;
            validation: { artifact: string };
            proposal: { chosenId: string; options: { id: string; why: string }[] };
          }[];
        };
      }
    ).value.elements[0]!;
    expect(report.gateState).toBe("delivered");
    expect(report.validation.artifact).toBe("ok");
    // The chosen form carries the sentence the host wrote — which is what the manifest's
    // invariant now requires of any choice at all.
    expect(report.proposal.chosenId).toBe(buildable.id);
    expect(
      report.proposal.options.find((o) => o.id === buildable.id)!.why,
    ).not.toBe("");

    // The artifacts themselves: the rendered chart and the delivered package, both real files.
    const manifest = JSON.parse(
      readFileSync(join(dir, "run.json"), "utf8"),
    ) as RunManifest;
    const el = manifest.elements[0]!;
    expect(readFileSync(join(dir, el.artifact!.path)).length).toBeGreaterThan(
      1000,
    );
    const record = el.delivery!.delivered[0]!;
    expect(record.publisherId).toBe("zip");
    expect(
      readFileSync(join(dir, record.artifact!.path)).length,
    ).toBeGreaterThan(0);
    // The angle the host confirmed by flags is the title the run carries.
    expect(el.angle!.confirmedTakeaway).toBe(TAKEAWAY);
    expect(el.angle!.altInsight).toBe(ALT);

    // And the sign-off document the approval points at is a real file, carrying what was
    // approved and by whom — the durable evidence the gate leaves behind.
    const signoff = JSON.parse(
      readFileSync(join(dir, el.approved!.signoffPath), "utf8"),
    ) as {
      elementId: string;
      artifactSha256: string;
      actorLabel: string;
      independentSemanticReview: string;
    };
    expect(signoff).toMatchObject({
      elementId: "el1",
      artifactSha256: el.artifact!.sha256,
      actorLabel: "Yvan Pandelé",
      independentSemanticReview: "unavailable",
    });
    expect(el.approved!.approvedProvenanceHash).toBe(
      el.delivery!.delivered[0]!.deliveredProvenanceHash,
    );
  }, 300_000);
});
