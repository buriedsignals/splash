// The delivery step of the loop — and the ONLY module in the delivery path that touches the
// environment. The verb contract never reads ambient state (I5): resolving credentials is the
// CALLER's policy, exactly as resolving `channel` is.
//
// Every refusal below lands before the verb is called, so a refused delivery leaves nothing
// staged, nothing uploaded, and no record written.
//
// One RECORD per call, by design — not "deliver everything requested in one go". An element's
// `delivery.requested` can name several destinations, and a naive loop that publishes all of
// them inside one call discards an earlier SUCCESS the moment a later one cannot be validated:
// destination #1 publishes for real (a file lands on disk, or a hosted deploy goes out), then
// destination #2 refuses on a readiness check, and the whole call returns a single `fail` —
// the caller only merges an `ok` result, so #1's outcome is never recorded anywhere, yet the
// side effect already happened. A retry would then re-publish #1 too. Returning as soon as one
// destination publishes — the same "one deterministic step per advance()" shape every other
// loop step already follows — makes each call atomic: either nothing happens (refused before
// any record is written, all earlier records untouched) or exactly one new record is appended.
// `gateStateOf`/`needsDelivery` already express "more destinations still pending" as another
// "deliver" next-action, so a caller that calls this repeatedly converges on delivering every
// requested destination with no window for a completed publish to go unrecorded.
//
// What the call does NOT do is stop at the first destination that refuses: it skips to the
// next pending one (see the loop below for why that matters, and how the skipped refusal is
// still surfaced).
import { mkdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, runVerb, type VerbResult } from "../core/verbs";
import type { VerbErrorCode } from "../core/verbs/types";
import type { VisualFormat } from "../core/vocabulary";
// Populates the publisher registry the publish verb dispatches from — without it every
// publish answers `unknown-publisher`. Same discipline as produce.ts importing ./engines.
import { PUBLISHERS_REGISTERED } from "../delivery";
import { lookupPublisher, type PublishOutcome } from "../core/publishers";
import { deliveryMetadata, type ProfileFacts } from "../delivery/metadata";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { decorEnv, type Decor } from "../newsroom/decor";
import { capabilityReadiness } from "../newsroom/readiness";
import {
  chosenOption,
  provenanceHash,
  stalenessOf,
  type DeliveryRecord,
  type RunElement,
  type RunManifest,
} from "./manifest";
// The delivery directory is declared ONCE, in produce.ts, alongside the render directory it
// must never collide with — see that module's comment for why (freshOutDir wipes the render
// directory before every re-produce; a package published into the same directory used to be
// collateral damage). dropLegacyElementsDelivery discards a delivery record this module wrote
// before that fix existed — a record still pointing at the old, shared directory cannot be
// trusted to still be on disk (see migrate.ts for the full reasoning).
import { elementDeliveryDir } from "./produce";
import { dropLegacyElementsDelivery } from "./migrate";

export type DeliverOpts = {
  /** The environment credentials are read from. Defaults to the decor's. */
  env?: Record<string, string | undefined>;
};

export async function deliver(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  decor: Decor,
  // Defaulted from the DECOR, never from `{}`: the driver is the only production caller and
  // it passes a decor, so an empty default meant the live loop published packages that said
  // "Provided by the newsroom" in English whatever the newsroom's profile said (spec §3.5),
  // and made the requiredSigners off-ramp below unreachable outside a test (spec §3.10) —
  // strictly weaker than the legacy deploy-embed.mjs it replaces, which auto-discovered
  // NEWSROOM-PROFILE.md. Deriving the default from an argument the function already receives
  // is what keeps a future caller from having to remember.
  // `?? {}`: this module's whole contract is a bounded VerbResult, never a throw — a decor
  // built by hand without `profile` must not turn the requiredSigners read below into a
  // TypeError.
  profile: ProfileFacts & { requiredSigners?: string[] } = decor.profile ?? {},
  opts: DeliverOpts = {},
): Promise<VerbResult<RunElement>> {
  if (!PUBLISHERS_REGISTERED)
    return fail(
      "engine-failed",
      "deliver: the publisher registry did not load",
    );
  if (!el.artifact)
    return fail("invalid-request", "deliver: nothing produced to deliver yet");
  if (stalenessOf(run, el))
    return fail(
      "invalid-request",
      "deliver: the artifact is stale — produce it again before publishing",
    );
  const requested = el.delivery?.requested ?? [];
  if (requested.length === 0)
    return fail(
      "invalid-request",
      "deliver: no destination requested — the journalist chooses where it goes",
    );
  // Opt-in editorial gate (spec §2 decision 6). Without requiredSigners nothing is asked; with
  // them, the element's approval must match the artifact being published, never an older one.
  const current = provenanceHash(run, el);
  if ((profile.requiredSigners ?? []).length > 0) {
    if (!el.approved || el.approved.approvedProvenanceHash !== current)
      return fail(
        "invalid-request",
        `deliver: this newsroom requires an editorial sign-off (${profile.requiredSigners!.join(", ")}) for the exact artifact being published`,
      );
  }

  const delivered: DeliveryRecord[] = dropLegacyElementsDelivery(
    el.delivery?.delivered ?? [],
  );
  const pending = requested.filter(
    (id) =>
      !delivered.some(
        (d) => d.publisherId === id && d.deliveredProvenanceHash === current,
      ),
  );
  // Every requested destination already has a matching record: nothing to do. A no-op
  // returns unchanged, without touching the environment or looking up a single capability —
  // the same idempotent shape a repeat call must have.
  if (pending.length === 0) return ok(el);

  // The format produce.ts rendered `el.artifact` as — resolved from the SAME proposal.chosenId
  // produce.ts reads (chosenOption, lib/loop/manifest.ts), never a second guess: every
  // publisher must serve the artifact as what it actually is, not assume HTML (the defect this
  // resolution exists to close). produce.ts cannot have built el.artifact without a resolvable
  // chosen option, so a missing one here means the manifest is corrupt — refused rather than
  // silently guessed at.
  const chosen = chosenOption(el);
  if (!chosen)
    return fail(
      "invalid-request",
      `deliver: element ${el.id} has an artifact but no resolvable chosen option to read its format from`,
    );
  // An option carrying no `format` at all (fixtures, hand-authored manifests predating the
  // brain) defaults to "static" — the same default produce.ts has always rendered for them.
  const format: VisualFormat = chosen.format ?? "static";

  const env = opts.env ?? decorEnv(decor.root);
  // Element-wide, not per-destination: every publisher describes the SAME visual, so a
  // refusal here (no angle, blank alt text) applies to all of them and stops the whole call.
  const metadata = deliveryMetadata(el, profile, {
    ...(decor.state.delivery?.maxWidth !== undefined
      ? { width: decor.state.delivery.maxWidth }
      : {}),
    ...(decor.state.delivery?.height !== undefined
      ? { height: decor.state.delivery.height }
      : {}),
  });
  if (!metadata.ok) return metadata;

  // The dedicated delivery directory (see the import comment above). Created here, not left
  // to the adapter: zip.ts (the only adapter that writes into outDir) has always assumed the
  // directory already exists — true by accident when outDir was produce.ts's own render
  // directory, which freshOutDir always creates first. A verb never throws (I1): an unguarded
  // mkdirSync failure (a read-only run dir, a name collision with a plain file) is reported as
  // engine-failed rather than escaping.
  const deliveryDir = elementDeliveryDir(runDir, el.id);
  try {
    mkdirSync(deliveryDir, { recursive: true });
  } catch (e) {
    return fail(
      "engine-failed",
      `deliver: cannot create the delivery directory: ${(e as Error).message}`,
    );
  }

  // Walk the pending destinations in the order the journalist asked for them, and SKIP one
  // that refuses rather than refusing the whole call. Retrying only the first unsatisfied
  // destination starved the universal fallback: with `["embed-cloudflare", "zip"]` and no
  // Cloudflare credentials every call refused identically, `nextActions` kept answering
  // ["deliver"], and the zip archive — the thing that exists so "no host configured" is a
  // working path — was never written.
  //
  // Two properties are held at once, and they are the reason this is a loop with an early
  // return rather than "publish everything that can be published":
  //   · A SUCCESS is never discarded. The first destination that publishes ends the call with
  //     `ok`, so exactly one new record is appended and no completed publish can be lost by a
  //     later refusal (the defect this module already fixed once).
  //   · A REFUSAL is never swallowed. A refused destination stays unsatisfied, so
  //     `needsDelivery` keeps it pending and `nextActions` keeps answering ["deliver"] — the
  //     immediately following call has nothing left to publish and therefore returns exactly
  //     that refusal, which the driver records as a bounded failure event naming the missing
  //     variable. The journalist learns Cloudflare is unconfigured AND keeps the archive.
  // When NOTHING could be published, every refusal is reported at once rather than only the
  // first: a journalist fixing two unconfigured destinations should see both.
  const refusals: { code: VerbErrorCode; message: string }[] = [];
  for (const publisherId of pending) {
    const cap = NEWSROOM_CAPABILITIES[publisherId];
    if (!cap) {
      refusals.push({
        code: "invalid-request",
        message: `"${publisherId}" is not a delivery capability this install knows`,
      });
      continue;
    }
    const readiness = capabilityReadiness(cap, decor.state, { env });
    if (readiness.status !== "ready") {
      refusals.push({
        code: "invalid-request",
        // Named by id, because a message listing several refusals must say WHICH destination
        // each one is about — and a capability disabled by choice carries an empty reason.
        message: `${publisherId}: ${readiness.reason || `${cap.label} is not enabled for this newsroom`}`,
      });
      continue;
    }

    // The hard-legality half of the genre routing (spec §3.5). The default never picks a
    // hosted destination for a file genre — but a journalist may name one explicitly, and this
    // is where "explicitly named" stops being enough. Refused BEFORE the verb runs, so nothing
    // is staged, uploaded or deployed: embed-cloudflare used to discover a PNG only at
    // verifyServed, after a real deployment had already gone out.
    //
    // An unregistered id is NOT refused here — that answer belongs to the publish verb
    // (`unknown-publisher`), and duplicating it would give the same situation two different
    // messages depending on which check ran first.
    const publisher = lookupPublisher(publisherId);
    if (publisher && !publisher.serves.includes(format)) {
      refusals.push({
        code: "invalid-request",
        message:
          `${publisherId}: ${cap.label} only serves ${publisher.serves.join(", ")} — ` +
          `a ${format} is handed over as a file (the portable package), or hosted through a destination that serves it`,
      });
      continue;
    }

    // Credentials are collected HERE and handed to the contract explicitly. They are read from
    // the capability's own declared variables — never a blanket copy of the environment.
    const credentials: Record<string, string> = {};
    for (const group of cap.env)
      for (const name of group) {
        const v = env[name];
        if (v !== undefined) credentials[name] = v;
      }

    // Non-secret provider settings (an S3 endpoint, a bucket name…) are the newsroom's own
    // persisted decor — never the environment. A capability that declares settingsFields but
    // has nothing wired to carry their values would read "ready" (its secrets are present) and
    // still refuse at the adapter ("settings.endpoint is required"): the gap this closes.
    //
    // Precedence, spelled out because two layers can in principle name the same key:
    // `publisherId` is fixed LAST among the capability-owned spread so nothing in a
    // newsroom-configured settings bag can shadow it; the transverse `decor.state.delivery`
    // preferences (spec 2026-07-25 §3.6 — snippetTemplate, applied across every destination by
    // design) are spread LAST of all, so a newsroom-wide override the journalist deliberately
    // set is never silently shadowed by a capability's own, narrower settings.
    const result = await runVerb("publish", {
      artifactPath: join(runDir, el.artifact.path),
      id: el.id,
      format,
      metadata: metadata.value,
      settings: {
        ...(decor.state.capabilities[publisherId]?.settings ?? {}),
        publisherId,
        ...(decor.state.delivery?.snippetTemplate
          ? { snippetTemplate: decor.state.delivery.snippetTemplate }
          : {}),
      },
      credentials,
      outDir: deliveryDir,
    });
    if (!result.ok) {
      refusals.push({
        code: result.code,
        message: `${publisherId}: ${result.message}`,
      });
      continue;
    }

    const outcome = result.value as PublishOutcome;
    // The publisher DID run — a failure recording its outcome (reading the package back to
    // hash it) is therefore an engine-failed result, never a throw, exactly the discipline
    // produce.ts already applies to its own "read the delivered artifact back" step. Nothing
    // upstream of this catches a throw here: the driver awaits `deliver()` unguarded, the same
    // way it awaits `produce()` unguarded, trusting the never-throw invariant. It ends the
    // call rather than moving on: the artifact is already published, and the honest answer is
    // the failure to record it, not a different destination's success on top of it.
    let record: DeliveryRecord;
    try {
      record = {
        publisherId: outcome.publisherId,
        kind: outcome.kind,
        ...(outcome.url ? { url: outcome.url } : {}),
        ...(outcome.path ? { artifact: hashRef(outcome.path, runDir) } : {}),
        ...(outcome.snippet !== undefined ? { snippet: outcome.snippet } : {}),
        publishedAt: outcome.publishedAt,
        deliveredProvenanceHash: current,
      };
    } catch (e) {
      return fail(
        "engine-failed",
        `deliver: "${publisherId}" published but its outcome could not be recorded: ${(e as Error).message}`,
      );
    }

    return ok({
      ...el,
      delivery: { requested, delivered: [...delivered, record] },
    });
  }

  // Nothing landed. The code of the FIRST refusal is kept — the destinations are in the
  // journalist's own order of preference, so that is the answer about the one they asked for
  // first — while the message carries every refusal.
  return fail(
    refusals[0]!.code,
    `deliver: ${refusals.map((r) => r.message).join("; ")}`,
  );
}

// A run dir must stay portable, so a delivered package is recorded run-dir-relative — the same
// rule produce.ts follows for the artifact it records.
function hashRef(
  path: string,
  runDir: string,
): { path: string; sha256: string } {
  return {
    path: relative(runDir, path),
    sha256: Buffer.from(sha256(readFileSync(path))).toString("hex"),
  };
}
