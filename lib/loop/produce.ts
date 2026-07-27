import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, render, type VerbResult } from "../core/verbs";
import { IMAGE_EXTENSIONS } from "../core/contract";
import type { VisualFormat } from "../core/vocabulary";
import { toVerbResult, validateSourcePolicy } from "../source";
import {
  provenanceHash,
  resolvedChannelForElement,
  type RunManifest,
  type RunElement,
} from "./manifest";
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
  const verdict = validateSourcePolicy(run.sources?.data, {
    mode: run.sources?.mode,
    carriesFactualData: true,
  });
  if (!verdict.ok) return toVerbResult(verdict);
  // `attribution`, never `credit`: ChartFrame renders `{sourceLabel(lang)} {source.name}` itself
  // (skills/chart-native/src/core/ChartFrame.tsx), so handing it the prefixed credit would print
  // "Source : Source : OFS". The prose qualifier and the synthetic notice are inside
  // `attribution`, so nothing that must be READ is dropped by taking the shorter field.
  const published = verdict.value.published;

  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: el.angle.confirmedTakeaway,
    altInsight: el.angle.altInsight,
    unit: el.angle.unit,
    source: {
      name: published.attribution,
      ...(published.url ? { url: published.url } : {}),
    },
    ...(el.angle.emphasis ? { highlight: el.angle.emphasis } : {}),
    format,
    data: dataCsv,
  };

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
