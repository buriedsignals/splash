import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, render, type VerbResult } from "../core/verbs";
import { IMAGE_EXTENSIONS } from "../core/contract";
import type { VisualFormat } from "../core/vocabulary";
import type { ArcRole } from "../core/claim-arc";
import {
  assertNoPrivateLeak,
  assertProseGrounded,
  sourceFail,
  sourceQuestion,
  toVerbResult,
  validateSourcePolicy,
  type SourceKind,
  type SourceLedger,
  type SourcePolicyCode,
} from "../source";
import {
  chosenOption,
  provenanceHash,
  resolvedChannelForElement,
  unauthoredBeats,
  type RunManifest,
  type RunElement,
} from "./manifest";
// The loop's ONE CSV parser (lib/loop/profile.ts) — the same split `orient` profiled this run's
// input with. The prose guard needs the CELLS, not the CSV text; see its call site below.
import { parseCsvRows } from "./profile";
import {
  isLoopBuildable,
  unbuildableEngineReason,
  resolveBuilder,
  LOOP_BUILDABLE_ENGINES,
} from "./buildable";
// Populates the producer registry the render verb dispatches from — without it every
// render answers `unknown-engine`. The loop's ONE point of knowledge about skills/ lives
// in that file, on purpose; see its header.
import "./engines";

// Where an element's render output lives, and where its delivered packages live — declared
// ONCE, here, rather than re-derived at each call site. Two call sites (this file and
// deliver.ts) used to independently spell out `join(runDir, "elements", el.id)`: freshOutDir
// (lib/core/verbs/exec.ts) wipes THAT directory clean before every render dispatch, which —
// once deliver.ts started writing its package into the identical path — silently deleted an
// already-delivered zip (and its ALT.txt/README.md) the moment the element was re-produced.
// Siblings under the run dir, never nested inside one another, so a re-produce's wipe can
// never reach what deliver.ts already published, and vice versa.
export function elementRenderDir(runDir: string, id: string): string {
  return join(runDir, "elements", id);
}
export function elementDeliveryDir(runDir: string, id: string): string {
  return join(runDir, "deliveries", id);
}

// Which delivered file IS the artifact, for a given format — the same shape
// assertDeliveredContract (lib/core/contract.ts) already validated is present before this
// runs, so this only has to LOCATE it, not re-validate it. Kept in step with
// assertFileMedia's naming (interactive.html / scrolly.html / one image / one .mp4) rather
// than re-deriving its own convention.
function artifactFileFor(
  format: VisualFormat,
  files: string[],
): string | undefined {
  if (format === "static")
    return files.find((f) =>
      IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)),
    );
  if (format === "video")
    return files.find((f) => f.toLowerCase().endsWith(".mp4"));
  const htmlName = format === "scrolly" ? "scrolly.html" : "interactive.html";
  return files.find((f) => f.split("/").pop() === htmlName);
}

/**
 * The manifest element, as the engine's spec. EXPORTED because two callers must render exactly
 * the same thing: produce() below, and the article-beats render proof
 * (lib/loop/beats-render-proof.test.ts), which drives a scrolly through the real render verb
 * while the whole-article branch is still gated out of LOOP_BUILDABLE_ENGINES. A proof that
 * assembled its own spec would be proving a parallel path.
 *
 * `beats` is only present when the element carries a narrative plan. Absent for every embeddable
 * element, so a spec built for one is byte-identical to what it was before this seam existed. An
 * UNAUTHORED plan never reaches an engine: produce() refuses it above, before this runs.
 *
 * The angle's parts fall back to "" rather than refusing, because produce() has already required
 * an angle by the time it calls this and a second refusal here would be a second place to keep
 * in step. A caller reaching it without one gets a spec the engine's own validator rejects
 * (a blank title and a blank altInsight both fail-hard at conformance) — loud, not silent.
 */
export function assembleNativeSpec(
  run: RunManifest,
  el: RunElement,
  dataCsv: string,
  attribution: string,
  sourceUrl?: string,
  format?: VisualFormat,
  sourceKind?: SourceKind,
): Record<string, unknown> & { beats?: NarrativeBeatSpec[] } {
  const chosen = chosenOption(el);
  return {
    nativeType: chosen?.nativeType ?? "",
    title: el.angle?.confirmedTakeaway ?? "",
    altInsight: el.angle?.altInsight ?? "",
    unit: el.angle?.unit ?? "",
    source: { name: attribution, ...(sourceUrl ? { url: sourceUrl } : {}) },
    // WHAT the figures are, alongside WHO to credit. The engine's conformance belt reads it
    // (chart-native's specToNativeConfig threads it onto the config's source object, and
    // conformanceL0 then applies the requirements row instead of the flat "name required, url
    // optional" rule). Omitted when absent, so a caller with no ledger — the two proof callers
    // above — assembles a byte-identical spec.
    ...(sourceKind ? { sourceKind } : {}),
    ...(el.angle?.emphasis ? { highlight: el.angle.emphasis } : {}),
    ...(format ? { format } : {}),
    data: dataCsv,
    ...(el.narrative ? { beats: narrativeBeatsFor(el) } : {}),
  };
}

/**
 * A guard's THROW, turned into the refusal a verb is allowed to return.
 *
 * `assertProseGrounded` and `assertNoPrivateLeak` throw, on purpose — lib/source's own rule is
 * that a caller wanting to be lenient about an invented number or an escaped shelf path has to
 * say so out loud. A verb never throws (invariant I1), so produce says so exactly once, here,
 * rather than at each call site.
 *
 * The thrown sentence IS the refusal a journalist reads; only the guard's own restatement of the
 * code ("private leak: ", "prose source: ") is dropped, because `toVerbResult` already prefixes
 * the domain code and saying it twice reads as two different problems.
 */
function refusalFromGuard(
  code: SourcePolicyCode,
  e: unknown,
): VerbResult<never> {
  const message = (e as Error).message.replace(
    /^(private leak|prose source): /,
    "",
  );
  return toVerbResult(sourceFail(code, `produce: ${message}`));
}

/** The engine's own beat shape (skills/chart-native's NarrativeBeat), built from the manifest's.
 *  The anchor's KIND picks the field — a line beat anchors on `x`, a bar walk on `category` —
 *  so a plan drafted for one chart type can never arrive shaped like the other's. */
type NarrativeBeatSpec = {
  x?: string;
  category?: string;
  role: ArcRole;
  text: string;
};

function narrativeBeatsFor(el: RunElement): NarrativeBeatSpec[] {
  return (el.narrative?.beats ?? []).map((b) => ({
    ...(b.anchor.kind === "x"
      ? { x: b.anchor.value }
      : { category: b.anchor.value }),
    role: b.role,
    text: b.text,
  }));
}

// The ONE craft verb of the loop. Assembles a NativeSpec from the manifest element and
// renders it via the shared render verb (lib/core/verbs) — the same execution path the
// legacy orchestrator uses, never a hand-rolled subprocess call — then records the
// artifact + its provenance so stalenessOf() can track it. Reads the FROZEN input by
// path (relative to the run dir) — never inline content. The artifact is written UNDER
// the run dir (elements/<id>/) and its recorded path is run-dir-relative, so the whole
// run dir can be copied elsewhere and still resolve (see resume.ts). A verb never
// throws (I1), so a refusal comes back as a typed failure; the caller is responsible
// for recording a bounded failure event (appendEvent) without advancing element state.
export async function produce(
  run: RunManifest,
  el: RunElement,
  runDir: string,
): Promise<VerbResult<RunElement>> {
  if (!el.angle || !el.proposal?.chosenId)
    return fail("invalid-request", "produce: need an angle and a chosen form");
  if (!run.input.data)
    return fail("invalid-request", "produce: no frozen data input");
  const chosen = el.proposal.options.find(
    (o) => o.id === el.proposal!.chosenId,
  );
  if (!chosen)
    return fail(
      "invalid-request",
      `produce: no option with id ${el.proposal.chosenId}`,
    );

  // The channel is STATE now (manifest v4), not a stub: the brain offered within it, so produce
  // must render within the same one. Since issue #1 it is the channel of THIS DELIVERABLE —
  // resolved from its own destination and aspect — rather than the run's single channel, because
  // a run can carry a web chart and a social video at once.
  //
  // The RESOLVED form, never the total fallback: a social deliverable whose aspect has not been
  // confirmed has no channel yet, and rendering it at the run's default would silently answer
  // "Stories or feed?" on the journalist's behalf — the exact decision issue #1 moved later.
  const channel = resolvedChannelForElement(run, el);
  if (!channel)
    return fail(
      "invalid-request",
      `produce: the ${el.deliverable?.destination} deliverable has no shape yet — confirm the aspect ratio before producing it`,
    );

  // The brain offers across engines (chart-native, map-native, dw-chart, map-dw…), but this
  // verb only knows how to build through the engines LOOP_BUILDABLE_ENGINES names — wiring the
  // rest is a separate tranche. Without this guard a chosen option naming another engine was
  // handed to chart-native anyway (its nativeType meaningless there), producing a WRONG
  // artifact silently. Refusing loud, naming what was chosen, is what a journalist can act on.
  // The list is NOT re-stated here: lib/loop/buildable.ts is the one source, and the brain
  // marks the offer from that same list, so the journalist is told BEFORE choosing.
  //
  // The producer that would ACTUALLY build this — skills/scrolly hosts a native engine's track,
  // so a chart-native option in the scrolly format is not a chart-native build. Resolved by
  // resolveBuilder (lib/loop/buildable.ts), the same helper lib/brain/eligibility.ts and
  // manifest.ts's nextActionsForElement resolve through, so the refusal a journalist reads
  // here is the sentence the offer already showed them.
  const builder = resolveBuilder(chosen);
  if (!isLoopBuildable(builder))
    return fail(
      "not-implemented",
      `produce: "${chosen.id}" is a ${builder} form (${chosen.format ?? "static"}) — ${unbuildableEngineReason(builder)}`,
    );

  // A NARRATIVE PAGE IS NOT BUILT FROM A PLAN NOBODY WROTE. The delivery guard of the beats
  // seam, for the reason applyPhrasing refuses a blank `why`: the beats ship as the journalist's
  // own claims, and an unwritten one would put the machine's caption under their byline — the
  // exact defect this seam removes (skills/scrolly/src/Scrolly.tsx derived the whole walk).
  //
  // POSITION — AFTER the buildability gate, matching nextActionsForElement line for line. The
  // three readers of buildable.ts must never disagree, and a form nothing can build has a
  // refusal the OFFER already showed the journalist; answering "your beats are unwritten" to
  // someone whose form cannot be built at all would send them to fix the wrong thing.
  //
  // Not gated on the format: whatever created a plan, an unwritten one must not be rendered.
  // The refusal NAMES the beats, so a journalist reads what is owed, not that something is.
  const unauthored = unauthoredBeats(el);
  if (unauthored.length)
    return fail(
      "invalid-request",
      `produce: ${unauthored.join(", ")} of this narrative walk ${unauthored.length === 1 ? "carries" : "carry"} no claim — ` +
        `Splash drafts the beats, the journalist writes them, and an unwritten beat is not published`,
    );

  // The frozen input is read from disk, and a run dir can be incomplete for reasons that
  // have nothing to do with the request being malformed (the file was moved, the copy that
  // travelled to another machine dropped it, the disk refused the read). An unguarded read
  // here would throw ENOENT straight out of the verb, which is exactly what the never-throw
  // invariant forbids: an unreadable input is a BOUNDED failure the caller records, not an
  // exception the caller has to catch.
  let dataCsv: string;
  try {
    dataCsv = readFileSync(join(runDir, run.input.data.path), "utf8");
  } catch (e) {
    return fail(
      "engine-failed",
      `produce: cannot read the frozen input ${run.input.data.path}: ${(e as Error).message}`,
    );
  }
  // The pinned format: what the brain offered and the journalist chose, not a stub — the
  // manifest must not promise "interactive" and receive a static PNG. Options built before
  // the brain existed (fixtures, hand-authored manifests) carry no `format` at all; "static"
  // is the same default produce.ts always rendered before this format threading landed.
  const format: VisualFormat = chosen.format ?? "static";

  // WHO the figures belong to. This used to be `{ name: "Provided by the newsroom" }` — a
  // hard-coded placeholder, identical on every visual the loop ever built: the attribution did
  // not exist, it was simulated. It now comes from the run's DECLARED source ledger, through the
  // one policy every gate reads (lib/source). An undeclared run does not produce: a named default
  // would make "nothing was declared" render identically to "this is where it came from", which
  // is the exact indistinction issue #7 exists to remove (design spec §4).
  //
  // `carriesFactualData: true` unconditionally — a data visual built by this loop asserts facts,
  // so `none` is refused here, which is the abuse that row is written for.
  //
  // No `lang`: the loop carries no language axis yet (the manifest has no locale, and produce
  // sets no `NativeSpec.lang` either, so the engine already renders English furniture).
  // Inventing one here would put a French qualifier under an English "Source:".
  const declared = run.sources?.data;
  const verdict = validateSourcePolicy(declared, {
    mode: run.sources?.mode,
    carriesFactualData: true,
  });
  // THE REFUSAL CARRIES THE QUESTION. `sourceQuestion` is the ONE targeted question the flow owes
  // a journalist whose source cannot be determined (lib/source/policy.ts) — the kind first, then
  // the first required field still missing — and it had no caller at all: the refusal named what
  // was missing without ever asking for it, which is the worst order for those two events.
  //
  // This is not the question's proper PLACE. That is before the run exists: `sources` is written
  // once, by initRun's declaration, and no later step can add it — so the CADRAGE beat composing
  // that declaration is where the question belongs, and it lives in lib/host/**. Until it does,
  // the refusal at least ends with something answerable rather than only with a diagnosis.
  //
  // `null` when nothing it can ask about is wrong (demo data in a real run: the declaration is
  // complete and the fix is a decision, not an answer). A refusal is not padded with a question
  // that does not fit it.
  if (!verdict.ok) {
    const question = sourceQuestion(declared);
    return toVerbResult(
      question
        ? sourceFail(verdict.code, `${verdict.message} — ${question}`)
        : verdict,
    );
  }
  // `attribution`, never `credit`: ChartFrame renders `{sourceLabel(lang)} {source.name}` itself
  // (skills/chart-native/src/core/ChartFrame.tsx), so handing it the prefixed credit would print
  // "Source : Source : OFS". The prose qualifier and the synthetic notice are inside
  // `attribution`, so nothing that must be READ is dropped by taking the shorter field.
  const published = verdict.value.published;

  const nativeSpec = assembleNativeSpec(
    run,
    el,
    dataCsv,
    published.attribution,
    published.url,
    format,
    // The class comes off the VERDICT, never off the raw declaration: `verdict.value.kind` is
    // the one that cleared the policy, so the engine and the policy are reading the same row.
    verdict.value.kind,
  );

  // ── The two LAST-MOMENT guards of the source policy ─────────────────────────────────────────
  //
  // validateSourcePolicy above cleared the DECLARATION. These two check the PAYLOAD that is about
  // to become pixels — and this is the only place in the codebase where that payload exists whole
  // (the CSV read from disk, the journalist's title and alt text, the authored beats, the credit
  // composed from the ledger). Both were built and left dormant; a guard whose refusal no run has
  // ever executed is an intention, not a behaviour.
  //
  // A valid verdict means `run.sources.data` was declared, so the ledger exists. The fallback is
  // unreachable and only spares this line a non-null assertion.
  const ledger: SourceLedger = run.sources ?? { mode: "real" };

  // A PROSE SOURCE IS RE-PRESENTED, NEVER COMPUTED FROM (lib/source/prose.ts). The quoted text is
  // the run's frozen ARTICLE, read HERE at check time: the manifest records inputs as path+sha256
  // and never their content, so produce is the only party holding both halves at once.
  if (ledger.data?.kind === "prose") {
    if (!run.input.article)
      return fail(
        "invalid-request",
        "produce: the data is declared `prose`, but this run froze no article — the figures a prose " +
          "source re-presents can only be checked against the text that states them",
      );
    let quoted: string;
    try {
      quoted = readFileSync(join(runDir, run.input.article.path), "utf8");
    } catch (e) {
      return fail(
        "engine-failed",
        `produce: cannot read the frozen article ${run.input.article.path}: ${(e as Error).message}`,
      );
    }
    // WHAT IS CHECKED: the plotted data, and the claims rendered as text. NOT `unit` and NOT
    // `emphasis` — those are labels the journalist composes at CADRAGE, not figures read out of
    // the article, and a unit written "m2" or "CO2" would be refused for a digit that is not a
    // figure at all. Named here rather than left to be re-derived; widening it is a decision.
    //
    // The data goes in CELL BY CELL, never as the CSV text. `figuresIn` reads a comma as a
    // DECIMAL separator (correct for the French prose it was written for), so a row handed over
    // whole reads "2015,2024" as the single number 2015.2024 and reports it ungrounded against
    // an article that states both years — measured, not hypothetical. One cell is one figure, and
    // splitting through parseCsvRows (the loop's one CSV parser, the same one `orient` profiled
    // this very input with) keeps a French decimal cell like "3,5" intact.
    const { columns, rows } = parseCsvRows(dataCsv);
    try {
      assertProseGrounded(quoted, [
        ...columns,
        ...rows.flatMap((r) => Object.values(r)),
        el.angle.confirmedTakeaway,
        el.angle.altInsight,
        ...(el.narrative?.beats ?? []).map((b) => b.text),
      ]);
    } catch (e) {
      return refusalFromGuard("prose-figure-ungrounded", e);
    }
  }

  // BELT over publicSourceView's braces, and the last thing that happens before the door: produce
  // does NOT build its credit through that allow-list (it takes `published` off the verdict), and
  // everything else in this spec is text the run collected elsewhere — a CSV header, an alt text,
  // a beat. Any of them can have picked up an internal shelf path or a file:// address on the
  // way, and every one of them is rendered into the artifact. This is exactly the payload
  // "composed somewhere ELSE" that lib/source/redact.ts's header writes the guard for.
  try {
    assertNoPrivateLeak(nativeSpec, ledger);
  } catch (e) {
    return refusalFromGuard("private-leak", e);
  }

  const result = await render({
    // Dispatch follows the CHOSEN engine (chosen.engine), never the RESOLVED builder — the
    // guard above checks `builder` (resolveBuilder: the EFFECTIVE producer, which redirects
    // `scrolly` to skills/scrolly regardless of chosen.engine), but this dispatch still reads
    // the raw `chosen.engine`. That is safe ONLY by the narrow coincidence that today
    // LOOP_BUILDABLE_ENGINES is exactly ["chart-native"] and the sole redirecting format is
    // `scrolly`, which is unbuildable — so a candidate that clears the guard above always has
    // builder === chosen.engine already; the two names never actually diverge in a case that
    // reaches this line. (The spec assembled just above is still chart-native-shaped — that is
    // the promise buildable.ts's header records for adding an engine; a premature addition
    // fails at the engine's own validator rather than rendering the wrong thing silently.) An
    // option with no engine at all is a pre-brain manifest, and the default path has always
    // been chart-native.
    //
    // THIS BREAKS the day `scrolly` enters LOOP_BUILDABLE_ENGINES: a chart-native option in
    // the scrolly format would then clear the guard above (builder = "scrolly", buildable),
    // but this line would still dispatch `engine: "chart-native"` — render.ts:58-69 reads
    // chart-native's OWN manifest, which does not declare `scrolly`, and refuses the build as
    // "unsupported-format" for a form the guard just promised was buildable. Fix at that
    // point: dispatch on `builder`, not `chosen.engine`.
    engine: chosen.engine ?? LOOP_BUILDABLE_ENGINES[0]!,
    spec: nativeSpec,
    format,
    channel,
    outDir: elementRenderDir(runDir, el.id),
    id: el.id,
  });
  if (!result.ok) return result;

  const artifactPath = artifactFileFor(format, result.value.files);
  if (!artifactPath)
    return fail(
      "engine-failed",
      `produce: no ${format} artifact in the delivery`,
    );
  // Same discipline for the delivered artifact: reading it back to hash it, and hashing the
  // provenance, are the last unguarded steps before the result — a failure in either is
  // reported, never thrown (the engine DID run, so it is an engine-failed outcome).
  try {
    const artifactBytes = readFileSync(artifactPath);
    return ok({
      ...el,
      artifact: {
        path: relative(runDir, artifactPath),
        sha256: Buffer.from(sha256(artifactBytes)).toString("hex"),
        provenanceHash: provenanceHash(run, el),
        producedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return fail(
      "engine-failed",
      `produce: cannot record the delivered artifact ${artifactPath}: ${(e as Error).message}`,
    );
  }
}
