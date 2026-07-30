// lib/loop/init.ts
// The step that CREATES a run — the one the loop never had.
//
// Until this file existed, `freezeInput` had exactly one production caller (lib/loop/migrate.ts,
// converting an OLD manifest), every test built its manifest as a literal, and a host outside
// JavaScript had no way at all to start. Meanwhile skills/splash/SKILL.md graved
// "★ THE DECISIONS ARE MECHANICAL — never hand-edit run.json" — a rule that was right and that
// the codebase could not honour, because hand-editing was the only path to a run. This is that
// path, and the rule becomes true with it.
//
// The discipline is chooseForm's and requestDelivery's: a refusal is a VALUE, never a throw, and
// NOTHING is written until every refusal has passed. That second half is not free here — freezing
// writes files — so the order of operations below is load-bearing, and its reasoning is recorded
// where it happens.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import {
  CHANNELS,
  VISUAL_FORMATS,
  DESTINATIONS,
  MEDIA_ASPECTS,
} from "../core/vocabulary";
import { SourceLedgerSchema } from "../source/kinds";
import { assertSourceLedger, EN_SOURCE_QUESTIONS } from "../source/policy";
import { freezeInput } from "./freeze";
import { ImageInputSchema, writeManifest, type RunManifest } from "./manifest";
import { DEFAULT_UI_LANG, resolveLanguage } from "../newsroom/language";

// WHAT A RUN MAY BE CREATED WITH — and, far more importantly, what it may NOT.
//
// STRICT on purpose (the discipline SourceLedgerSchema's own header records: "a permissive object
// would let a `name: "OFS"` parse as a declaration carrying no label at all"). Every field a run
// EARNS through a command with its own refusals — `angle` (confirm-angle), `proposal` (propose),
// `artifact` (produce), `review`, `delivery`, `approved`, `orient`, `cadrage`, `events` — is
// absent from this schema, so naming one is refused BY NAME rather than dropped silently. A
// declaration that could carry an offer or an artifact would be the hand-edited run.json under
// another name: init creates a run at gate state `empty`, and nothing else.
const ElementDeclarationSchema = z.strictObject({
  id: z.string().trim().min(1),
  requestedFormat: z.enum(VISUAL_FORMATS).optional(),
  deliverable: z
    .strictObject({
      destination: z.enum(DESTINATIONS),
      aspect: z.enum(MEDIA_ASPECTS).optional(),
    })
    .optional(),
  deliverableOf: z.string().optional(),
});

export const RunDeclarationSchema = z.strictObject({
  runId: z.string().trim().min(1),
  route: z.enum(["embed", "article"]).default("embed"),
  channel: z.enum(CHANNELS).default("article-web"),
  /** Paths to the files this run is BUILT FROM. Copied into the run (freezeInput) so the run is
   *  self-contained and the manifest references them by path+hash only. */
  input: z.strictObject({
    data: z.string().min(1).optional(),
    article: z.string().min(1).optional(),
    /** The language the ARTICLE is written in, DECLARED by whoever read it. NEVER detected:
     *  no detection dependency exists in this repo and none is added — a wrong guess would
     *  produce a wrong deliverable that nobody decided, which is the exact defect shape this
     *  tranche removes. The step that reads the article states what it read. */
    articleLang: z.string().trim().min(2).optional(),
    /** The journalist's own photographs — declared here verbatim (dir + per-frame alt and
     *  credit), never generated and never defaulted. See ImageInputSchema's own header. */
    images: ImageInputSchema.optional(),
  }),
  sources: SourceLedgerSchema.optional(),
  elements: z
    .array(ElementDeclarationSchema)
    .min(1)
    .default([{ id: "el1" }]),
});

export type RunDeclaration = z.input<typeof RunDeclarationSchema>;

// The exact three shapes skills/image-native/src/image-story.ts's checkImageConformance
// refuses at build time (an absolute path, a Windows drive, a ".." segment): a frameRef
// becomes a path resolved under `imageDir`, so any of the three is a traversal out of the one
// folder Splash is allowed to read images from. Refused one layer earlier here, at
// declaration, so the bad value never lands in a manifest on disk in the first place — and
// the message is QUOTED from the engine's own check (the shared clause after the frame label),
// never reworded, so the two rules can never disagree about the same thing.
function imageFrameRefViolation(frameRef: string): string | undefined {
  if (
    frameRef.startsWith("/") ||
    frameRef.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(frameRef) ||
    frameRef.split(/[\\/]/).includes("..")
  )
    return (
      `frameRef ${JSON.stringify(frameRef)} must be a plain path INSIDE the image folder — ` +
      `no absolute paths, no ".." (the raw images live under imageDir, nothing else is readable)`
    );
  return undefined;
}

/**
 * Create a run in `runDir` from a declaration. Returns the manifest it wrote.
 *
 * Never throws: a refusal is a VerbResult, like every other decision in this loop. A refused
 * init leaves the directory byte-identical — including the case where the declaration is legal
 * but its ledger is not, which is what fixes the order of the steps below.
 */
export function initRun(
  runDir: string,
  raw: unknown,
  opts: { profileLang?: string } = {},
): VerbResult<RunManifest> {
  // 1. The declaration itself. zod's message names the offending field, which is the whole
  //    point of the strict schema: a host that mistypes `chanel` learns which word was wrong.
  const parsed = RunDeclarationSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      "invalid-request",
      `init: the run declaration is not valid — ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  const decl = parsed.data;

  if (!decl.input.data && !decl.input.article)
    return fail(
      "invalid-request",
      "init: a run is built from something — declare input.data, input.article, or both",
    );

  // 1b. Every declared image's frameRef, checked BEFORE anything else about images: a
  //     traversal is a filesystem hazard, not an editorial one, so it is refused ahead of the
  //     alt/credit questions the schema above already asked (min(1) on both — an empty one
  //     fails at the parse in step 1, naming the field, exactly like every other declared
  //     shape). One violation is enough to refuse the whole declaration and write nothing.
  if (decl.input.images) {
    for (const frame of decl.input.images.frames) {
      const violation = imageFrameRefViolation(frame.frameRef);
      if (violation) return fail("invalid-request", `init: ${violation}`);
    }
  }

  // 2. An existing run is NEVER overwritten. The manifest is the ledger: it carries the events,
  //    the produced artifacts and the deliveries that already landed. Destroying that on a
  //    command whose name says "begin" would erase finished work nobody asked to erase — the
  //    same reasoning lib/host/path-safety.ts applies to outDir ("refuses rather than delete
  //    content it did not create").
  const manifestPath = join(runDir, "run.json");
  if (existsSync(manifestPath))
    return fail(
      "invalid-request",
      `init: ${manifestPath} already holds a run — a run is never overwritten, because the manifest is the ledger of everything this run produced and delivered. Point --run at a new directory`,
    );

  // 3. A DECLARED DATA INPUT SAYS WHAT IT IS. `sources` is written exactly ONCE — here — and no
  //    later step of the loop can add it: `produce` reads `run.sources.data` and refuses an
  //    undeclared source rather than crediting a placeholder, and nothing between init and
  //    produce can fill the slot. A run begun without a data ledger is therefore stuck at
  //    produce for good, with no gate to pass. So the rule lives where the declaration is
  //    composed, and the refusal carries the question it owes (lib/source/policy.ts) instead of
  //    only naming the absence. In English, like every other refusal of this layer — the façade
  //    that knows the newsroom's language asks it in that language (lib/host/drive.ts).
  //
  //    The schema keeps `sources` optional because an ARTICLE-only run legitimately declares no
  //    data ledger; what is required is the pairing, and a pairing is not a field.
  if (decl.input.data && !decl.sources?.data)
    return fail(
      "invalid-request",
      `init: the run declares a data input, so it declares where that data comes from — ` +
        `add sources.data with its kind and the fields that kind requires. ` +
        EN_SOURCE_QUESTIONS.kind,
    );

  // 4. The source ledger, judged BEFORE a single byte is written. assertSourceLedger takes the
  //    frozen-input flags STRUCTURALLY (never the manifest — that is what keeps lib/source free
  //    of any dependency on lib/loop), and the declaration already knows which slots it fills.
  //    Doing this after the freeze would leave an orphaned input/data-<hash>.csv in a directory
  //    with no run.json every time a ledger is illegal — `synthetic` in a run that calls itself
  //    reporting is exactly such a case, and it is the one this ordering exists for.
  if (decl.sources) {
    try {
      assertSourceLedger(decl.sources, {
        data: decl.input.data != null,
        article: decl.input.article != null,
      });
    } catch (e) {
      return fail("invalid-request", `init: ${(e as Error).message}`);
    }
  }

  // 5. Every declared input must exist and be a file. freezeInput throws on a missing source;
  //    checking here means the FIRST missing path is refused before the SECOND one is copied.
  for (const [slot, path] of [
    ["data", decl.input.data],
    ["article", decl.input.article],
  ] as const) {
    if (!path) continue;
    if (!existsSync(path))
      return fail(
        "invalid-request",
        `init: the ${slot} input ${JSON.stringify(path)} does not exist`,
      );
    if (!statSync(path).isFile())
      return fail(
        "invalid-request",
        `init: the ${slot} input ${JSON.stringify(path)} is not a file`,
      );
  }

  // 6. Freeze, then write. Both can still fail for reasons of the disk's own, and a verb never
  //    throws — so the pair is guarded together rather than left to escape.
  try {
    const input: RunManifest["input"] = {
      ...(decl.input.data
        ? { data: freezeInput(runDir, decl.input.data, "data") }
        : {}),
      ...(decl.input.article
        ? { article: freezeInput(runDir, decl.input.article, "article") }
        : {}),
      // NOT frozen — see ImageInputSchema's own header (manifest.ts): an image folder stays
      // where the journalist keeps it, declared verbatim, never copied or hashed.
      ...(decl.input.images ? { images: decl.input.images } : {}),
    };
    // Resolved HERE and nowhere else. produce() gets a manifest, not ambient state — the
    // discipline lib/core/production-brief.ts:7 states — so resolving per-produce would give the
    // same run two languages depending on when it ran.
    const language = resolveLanguage({
      ...(decl.input.articleLang
        ? { articleLang: decl.input.articleLang }
        : {}),
      ...(opts.profileLang ? { profileLang: opts.profileLang } : {}),
    }).content;
    const run: RunManifest = {
      runId: decl.runId.trim(),
      schemaVersion: 5,
      route: decl.route,
      channel: decl.channel,
      // Written only once a language was actually ESTABLISHED by someone — an article language
      // or a non-empty house profile — so a run started with neither stays byte-identical to
      // a manifest written before this field existed, rather than growing a `"lang": "en"`
      // nobody declared.
      ...(language !== DEFAULT_UI_LANG || decl.input.articleLang
        ? { lang: language }
        : {}),
      input,
      ...(decl.sources ? { sources: decl.sources } : {}),
      elements: decl.elements.map((el) => ({
        id: el.id.trim(),
        ...(el.requestedFormat ? { requestedFormat: el.requestedFormat } : {}),
        ...(el.deliverable ? { deliverable: el.deliverable } : {}),
        ...(el.deliverableOf ? { deliverableOf: el.deliverableOf } : {}),
      })),
      events: [],
    };
    // writeManifest asserts the manifest's own invariants before it touches the disk — including
    // the source policy a second time, at the run level. A declaration that clears step 4 and
    // fails here is one whose ELEMENTS are contradictory (a printable interactive, a sibling
    // naming a master that is not in the run), and that refusal is worth reporting in its words.
    writeManifest(manifestPath, run);
    return ok(run);
  } catch (e) {
    return fail(
      "invalid-request",
      `init: ${(e as Error)?.message ?? String(e)}`,
    );
  }
}
