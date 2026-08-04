// THE WHOLE CHAIN, WALKED ON A SCROLLY — produce → capture → review → preview → approve →
// request-delivery → deliver, on a real artifact, through the real verbs.
//
// The question it answers is the one lib/brain/eligibility.ts's article-branch mark asserts an
// answer to: "a scrolly changes what gets delivered". Every other proof in this roster stops at
// produce (beats-render-proof.test.ts renders a real chart scrolly and reads its steps out of a
// browser, and stops there), so nothing measured what happens to a scrolly.html AFTER it exists.
// This file walks it to a published package and reads the package back.
//
// OPT-IN (SPLASH_SCROLLY_E2E=1): a real Vite single-file build, the producer's own Playwright
// reduced-motion snap, and then three more browser captures at the destination's breakpoints.
// Same discipline as beats-render-proof.test.ts and delivery-genre-e2e.test.ts.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import "../../skills/splash/src/register-producers";
import "../delivery";
import { freezeInput } from "./freeze";
import { draftBeats, applyBeats } from "./beats";
import { produce } from "./produce";
import { captureStep, reviewStep } from "./verify";
import { previewStep } from "./preview";
import { approve } from "./approve";
import { requestDelivery } from "./request-delivery";
import { deliver } from "./deliver";
import { neutralDecor } from "../newsroom/decor";
import { validateSourcePolicy } from "../source/policy";
import { deliveryGenreFor } from "../core/publishers";
import { isDeliverableOf } from "../verify/preview";
import { resolveTargets } from "../verify/viewport";
import { defaultDestinationsFor } from "../delivery/routing";
import { fileArtifact, type RunManifest } from "./manifest";
import type { AuthoredBeat } from "../brain/verify-beats";
import type { ReviewRecord } from "../verify/types";

const RUN_IT = process.env.SPLASH_SCROLLY_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// The same series beats-render-proof.test.ts renders — already proven to compose a chart-track
// scrolly the assembler accepts, so nothing this file measures is about the fixture.
const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

const CLAIMS = [
  "En 1979, la banquise d'été tenait encore sur 7 millions de kilomètres carrés.",
  "Seize ans plus tard, le recul est engagé et personne n'y prête attention.",
  "2007 est l'année où le doute cesse : la surface s'effondre.",
  "Un demi-siècle après, rien n'est revenu — et c'est cela, l'histoire.",
];

function seedRun(runDir: string): RunManifest {
  const src = join(runDir, "sea-ice.csv");
  writeFileSync(src, SEA_ICE);
  return {
    runId: "scrolly-e2e",
    schemaVersion: 7,
    // "embed", deliberately — the run declares itself an embeddable element and the scrolly is
    // walked to delivery on exactly that declaration. `route` is inert (lib/loop/resume.ts:41),
    // so this is a statement about what the fixture claims, not a lever.
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "NSIDC Sea Ice Index",
        url: "https://nsidc.org/data/seaice_index",
      },
    },
    orient: {
      profile: {
        columns: ["year", "extent"],
        numericColumns: ["year", "extent"],
        rowCount: 7,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway:
            "La banquise arctique de septembre ne s'est jamais reconstituée",
          altInsight:
            "L'étendue minimale de septembre est passée de 7 à 4,3 millions de km² entre 1979 et 2025.",
          unit: "million km²",
        },
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "une série dont la forme se raconte au fil du défilement",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
    events: [],
  };
}

// ALWAYS ON — the millisecond half. Every table the chain routes on, asked whether it separates
// a scrolly from an interactive. These are the three facts the whole branch rests on, and none
// of them needs a browser.
test("every routing table treats a scrolly exactly as it treats an interactive", () => {
  // 1. WHERE IT GOES. Same genre ⇒ same publishers, same default destination.
  expect(deliveryGenreFor("scrolly")).toBe(deliveryGenreFor("interactive"));
  expect(defaultDestinationsFor("scrolly", [])).toEqual(
    defaultDestinationsFor("interactive", []),
  );
  // 2. WHAT FILE IS THE DELIVERABLE. Both are the self-contained HTML page.
  expect(isDeliverableOf("scrolly", "/x/scrolly.html")).toBe(true);
  expect(isDeliverableOf("scrolly", "/x/static.png")).toBe(false);
  // 3. HOW IT IS MEASURED. Both are responsive, so both are captured at three breakpoints.
  expect(
    resolveTargets("article-web", "scrolly").map((t) => t.breakpoint),
  ).toEqual(
    resolveTargets("article-web", "interactive").map((t) => t.breakpoint),
  );
  // …and the fixture below declares a source the loop accepts, so a refusal under the gate is
  // never this.
  const seed = seedRun(mkdtempSync(join(tmpdir(), "scrolly-e2e-fixture-")));
  const verdict = validateSourcePolicy(seed.sources?.data, {
    mode: seed.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

proof(
  "a scrolly walks produce → capture → review → preview → approve → deliver, and is handed over as a package",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "scrolly-e2e-"));
    const run = seedRun(runDir);

    // 1. THE WALK IS AUTHORED — the chart track's beats are the journalist's.
    const drafted = draftBeats(run, run.elements[0]!, runDir);
    if (!drafted.ok) throw new Error(`draft-beats: ${drafted.message}`);
    const plan = drafted.value.narrative!.beats;
    const authored: AuthoredBeat[] = plan.map((b, i) => ({
      id: b.id,
      role: b.role,
      text: CLAIMS[i] ?? CLAIMS[CLAIMS.length - 1]!,
    }));
    let current = applyBeats(
      { ...run, elements: [drafted.value] },
      "e1",
      authored,
    );

    // 2. PRODUCE.
    const produced = await produce(current, current.elements[0]!, runDir);
    if (!produced.ok) throw new Error(`produce: ${produced.message}`);
    current = { ...current, elements: [produced.value] };
    const artifactPath = fileArtifact(produced.value.artifact)!.path;
    expect(artifactPath.endsWith("scrolly.html")).toBe(true);

    // 3. CAPTURE — the real page in front of the real publication viewports. `unsupported`
    // being unset is the assertion: a recorded gap is what the chain does for a format
    // lib/verify cannot measure, and a scrolly is not one of them.
    const captured = await captureStep(current, current.elements[0]!, runDir);
    if (!captured.ok) throw new Error(`capture: ${captured.message}`);
    expect(captured.value.capture!.unsupported).toBeUndefined();
    expect(captured.value.capture!.images.length).toBe(3);
    console.log(
      "[scrolly-e2e] capture checks:\n" +
        captured.value
          .capture!.checks.map(
            (c) => `  ${c.id} ${c.outcome} ${JSON.stringify(c.detail ?? {})}`,
          )
          .join("\n"),
    );
    current = { ...current, elements: [captured.value] };

    // 4. REVIEW.
    const reviewed = await reviewStep(current, current.elements[0]!, runDir);
    if (!reviewed.ok) throw new Error(`review: ${reviewed.message}`);
    current = { ...current, elements: [reviewed.value] };

    // 5. PREVIEW.
    const previewed = previewStep(current, current.elements[0]!, runDir, {
      env: { SPLASH_NO_VIEWER: "1" },
    });
    if (!previewed.ok) throw new Error(`preview: ${previewed.message}`);
    current = { ...current, elements: [previewed.value] };

    // 6. APPROVE. Warnings are acknowledged — the gate's own ceremony, used as designed. NO
    // BLOCKING FINDING IS OVERRIDDEN, and that is the assertion rather than a convenience.
    //
    // The first run of this walk (2026-07-28, before the two fixes on this branch) had to
    // override two, and both fired on EVERY scrolly at every breakpoint:
    //   · `component-overflows-viewport` — "the component ends at y 3645 … outside its 1200x675
    //     container". A scrolly is its own scroll; captureHtml simply never read `heightPolicy`.
    //   · `furniture-missing` — "no element carries the alt-text text …". The config carried
    //     `altInsight`; the scrolly scaffold painted title/unit/source/credit and nothing else.
    // Neither was about delivery. Both are fixed, so a scrolly now reaches the gate clean, and an
    // override list that is EMPTY is what proves it.
    const findings = (previewed.value.review as ReviewRecord).findings;
    const blocking = findings.filter(
      (f) => f.status === "open" && f.severity === "blocking",
    );
    expect(blocking.map((f) => `${f.id}: ${f.summary}`)).toEqual([]);
    const decided = approve(
      current,
      current.elements[0]!,
      runDir,
      {
        actorLabel: "scrolly-e2e",
        acknowledged: findings
          .filter((f) => f.status === "open" && f.severity === "warning")
          .map((f) => f.id),
      },
      { signers: [], requiredSigners: [] },
    );
    if (!decided.ok)
      throw new Error(
        `approve: ${decided.message} — findings: ${findings
          .map((f) => `${f.id}(${f.severity}/${f.status})`)
          .join(", ")}`,
      );
    current = { ...current, elements: [decided.value] };

    // 7. REQUEST-DELIVERY — no destination named, so the DEFAULT is what is measured.
    // The portable package, switched on — the one capability that needs no key, so "no host
    // configured" is a working path (lib/delivery/routing.ts).
    const base = neutralDecor();
    const decor = {
      ...base,
      state: { ...base.state, capabilities: { zip: { enabled: true } } },
    };
    const asked = requestDelivery(current, current.elements[0]!, decor, {
      env: {},
    });
    if (!asked.ok) throw new Error(`request-delivery: ${asked.message}`);
    expect(asked.value.delivery!.requested).toEqual(["zip"]);
    current = { ...current, elements: [asked.value] };

    // 8. DELIVER.
    const delivered = await deliver(
      current,
      current.elements[0]!,
      runDir,
      decor,
      {},
      { env: {} },
    );
    if (!delivered.ok) throw new Error(`deliver: ${delivered.message}`);
    const record = delivered.value.delivery!.delivered[0]!;
    expect(record.publisherId).toBe("zip");
    // The embed genre's snippet — the thing an interactive gets and a "page" would not.
    expect(record.snippet).toContain("<iframe");

    // 9. THE DELIVERED ARTIFACT, READ BACK. Not the record, not the producer's report: the
    // bytes inside the package the newsroom is handed.
    const archive = unzipSync(
      new Uint8Array(readFileSync(join(runDir, record.artifact!.path))),
    );
    expect(Object.keys(archive).sort()).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);
    const page = strFromU8(archive["index.html"]!);
    // It is the scrolly that was produced, byte for byte…
    expect(page).toBe(readFileSync(join(runDir, artifactPath), "utf8"));
    // …and it is a scrolly, not a chart in a box: the walk's own step scaffolding is in it.
    expect(page).toContain("data-step-index");

    console.log(
      `[scrolly-e2e] ${runDir}\n  artifact: ${artifactPath}\n  package: ${record.artifact!.path}\n` +
        `  findings: ${findings.map((f) => `${f.id}(${f.severity}/${f.status})`).join(", ") || "none"}\n` +
        `  snippet: ${record.snippet}`,
    );
    rmSync(runDir, { recursive: true, force: true });
  },
  20 * 60 * 1000,
);
