// The two LAST-MOMENT guards of the source policy, exercised through the real production verb.
//
// `assertProseGrounded` and `assertNoPrivateLeak` were built, tested and left without a caller
// (residual A19): the policy was recorded and never applied. A guard whose refusal no run has
// ever executed is an intention, not a behaviour — so every case below drives `produce()`, the
// verb that assembles the payload the engine turns into pixels, rather than calling the guard
// directly (lib/source/prose.test.ts and lib/source/redact.test.ts already do that).
//
// Both refusals come back as VALUES, never throws: `produce` is a verb, bound by invariant I1.
// The domain code (`prose-figure-ungrounded`, `private-leak`) is preserved inside the message by
// `toVerbResult`, which is what these tests read.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "../loop/produce";
import { freezeInput } from "../loop/freeze";
import { fileArtifact, type RunManifest } from "../loop/manifest";
import type { SourceLedger } from "./kinds";

const CSV =
  "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352";

// The article the figures were quoted in. Every number the CSV plots is stated here, in the
// French digit grouping a real article uses — the case `figuresIn` collapses on purpose.
const ARTICLE =
  "Entre 2015 et 2024, la prime mensuelle adulte est passée de 449 à 583 francs à Genève, " +
  "de 412 à 531 francs dans le canton de Vaud et de 289 à 352 francs en Appenzell " +
  "Rhodes-Intérieures. La hausse touche 8 500 ménages supplémentaires.";

const TAKEAWAY = "Health premiums rose in every canton shown";
const ALT_INSIGHT =
  "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.";

function makeRun(opts: {
  runDir: string;
  sources: SourceLedger;
  csv?: string;
  article?: string;
  takeaway?: string;
  altInsight?: string;
}): RunManifest {
  const src = join(opts.runDir, "src.csv");
  writeFileSync(src, opts.csv ?? CSV);
  let article: { path: string; sha256: string } | undefined;
  if (opts.article !== undefined) {
    const articlePath = join(opts.runDir, "article.txt");
    writeFileSync(articlePath, opts.article);
    article = freezeInput(opts.runDir, articlePath, "article");
  }
  return {
    runId: "guards",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: {
      data: freezeInput(opts.runDir, src, "data"),
      ...(article ? { article } : {}),
    },
    sources: opts.sources,
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: opts.takeaway ?? TAKEAWAY,
          altInsight: opts.altInsight ?? ALT_INSIGHT,
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

function runDirFor(name: string): string {
  return mkdtempSync(join(tmpdir(), `source-guard-${name}-`));
}

// ── assertProseGrounded ──────────────────────────────────────────────────────────────────────

test("produce refuses a prose-sourced run whose DATA holds a figure the article never states", async () => {
  const runDir = runDirFor("prose-data");
  // 4 200 is a plausible-looking total nobody wrote: the exact "computed from prose" move the
  // guard exists to refuse.
  const run = makeRun({
    runDir,
    sources: { mode: "real", data: { kind: "prose", label: "Heidi.news" } },
    csv: "canton,2015,2024\nGenève,449,583\nVaud,412,531\nTotal,4200,4200",
    article: ARTICLE,
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("prose-figure-ungrounded");
  expect(result.message).toContain("4200");
});

test("produce refuses a prose-sourced run whose TITLE claims a figure the article never states", async () => {
  const runDir = runDirFor("prose-title");
  const run = makeRun({
    runDir,
    sources: { mode: "real", data: { kind: "prose", label: "Heidi.news" } },
    article: ARTICLE,
    takeaway: "Premiums rose 30% in every canton shown",
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("prose-figure-ungrounded");
  expect(result.message).toContain("30");
});

test("produce refuses a prose-sourced run that froze no article to check against", async () => {
  const runDir = runDirFor("prose-noarticle");
  const run = makeRun({
    runDir,
    sources: { mode: "real", data: { kind: "prose", label: "Heidi.news" } },
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toMatch(/froze no article|no article/i);
});

test("produce renders a prose-sourced run whose every figure is quoted in the article", async () => {
  // The positive control. Without it, a guard that refuses EVERYTHING would read as working —
  // and the first version of this wiring DID: `figuresIn` reads a comma as a decimal separator
  // (right for the French prose it was written for), so the CSV row "Genève,449,583" handed over
  // whole read as the single number 449.583 and was reported ungrounded against an article that
  // states 449 and 583. The data now goes in cell by cell. This case is that measurement.
  const runDir = runDirFor("prose-ok");
  const run = makeRun({
    runDir,
    sources: { mode: "real", data: { kind: "prose", label: "Heidi.news" } },
    article: ARTICLE,
  });
  const result = await produce(run, run.elements[0]!, runDir);
  if (!result.ok) throw new Error(result.message);
  expect(fileArtifact(result.value.artifact)!.path).toBe(
    join("elements", "e1", "static.png"),
  );
}, 90000);

// ── assertNoPrivateLeak ──────────────────────────────────────────────────────────────────────

const PRIVATE: SourceLedger = {
  mode: "real",
  data: {
    kind: "private",
    label: "Données internes de la rédaction",
    internalRef: "/Volumes/nas-redaction/enquetes/salaires-internes-2024.csv",
  },
};

test("produce refuses when the internal reference reached the payload that becomes the artifact", async () => {
  const runDir = runDirFor("leak-ref");
  const run = makeRun({
    runDir,
    sources: PRIVATE,
    // Alt text is rendered INTO the artifact (WCAG 1.1.1), so a shelf path pasted there leaves
    // the newsroom with the visual.
    altInsight:
      "Premiums rose in all three cantons shown; see /Volumes/nas-redaction/enquetes/salaires-internes-2024.csv for the working file.",
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("private-leak");
  expect(result.message).toContain("salaires-internes-2024.csv");
});

test("produce refuses when only the file name of the internal path survived", async () => {
  const runDir = runDirFor("leak-basename");
  const run = makeRun({
    runDir,
    sources: PRIVATE,
    // A CSV column header carrying the working file's name: it becomes a rendered axis label.
    csv: "salaires-internes-2024.csv,2015,2024\nGenève,449,583\nVaud,412,531",
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("private-leak");
});

test("produce refuses a file:// address on its way into the artifact", async () => {
  const runDir = runDirFor("leak-fileurl");
  const run = makeRun({
    runDir,
    sources: PRIVATE,
    altInsight:
      "Premiums rose in all three cantons shown; working copy at file:///Users/desk/premiums.csv.",
  });
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("private-leak");
  expect(result.message).toContain("file://");
});

test("produce renders a private-sourced run whose internal reference stayed in the ledger", async () => {
  // The second positive control: the guard must cost a correct private run nothing. The
  // internalRef is declared and is NOT in the payload — which is the normal case.
  const runDir = runDirFor("leak-ok");
  const run = makeRun({ runDir, sources: PRIVATE });
  const result = await produce(run, run.elements[0]!, runDir);
  if (!result.ok) throw new Error(result.message);
  expect(fileArtifact(result.value.artifact)!.path).toBe(
    join("elements", "e1", "static.png"),
  );
}, 90000);
