// The delivery step of the loop — and the ONLY module in the delivery path that touches the
// environment. The verb contract never reads ambient state (I5): resolving credentials is the
// CALLER's policy, exactly as resolving `channel` is.
//
// Every refusal below lands before the verb is called, so a refused delivery leaves nothing
// staged, nothing uploaded, and no record written.
//
// One destination per call, by design — not "deliver everything requested in one go". An
// element's `delivery.requested` can name several destinations, and a naive loop that walks
// all of them inside one call discards an earlier SUCCESS the moment a later one cannot be
// validated: destination #1 publishes for real (a file lands on disk, or a hosted deploy goes
// out), then destination #2 refuses on a readiness check, and the whole call returns a single
// `fail` — the caller only merges an `ok` result, so #1's outcome is never recorded anywhere,
// yet the side effect already happened. A retry would then re-publish #1 too. Processing
// exactly the first not-yet-delivered destination per call — the same "one deterministic step
// per advance()" shape every other loop step already follows — makes each call atomic: either
// nothing happens (refused before any verb, all earlier records untouched) or exactly one new
// record is appended. `gateStateOf`/`needsDelivery` already express "more destinations still
// pending" as another "deliver" next-action, so a caller that calls this repeatedly converges
// on delivering every requested destination with no window for a completed publish to go
// unrecorded.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, runVerb, type VerbResult } from "../core/verbs";
// Populates the publisher registry the publish verb dispatches from — without it every
// publish answers `unknown-publisher`. Same discipline as produce.ts importing ./engines.
import { PUBLISHERS_REGISTERED } from "../delivery";
import type { PublishOutcome } from "../core/publishers";
import { deliveryMetadata, type ProfileFacts } from "../delivery/metadata";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { decorEnv, type Decor } from "../newsroom/decor";
import { capabilityReadiness } from "../newsroom/readiness";
import {
  provenanceHash,
  stalenessOf,
  type DeliveryRecord,
  type RunElement,
  type RunManifest,
} from "./manifest";

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
  profile: ProfileFacts & { requiredSigners?: string[] } = decor.profile,
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

  const delivered: DeliveryRecord[] = el.delivery?.delivered ?? [];
  const publisherId = requested.find(
    (id) =>
      !delivered.some(
        (d) => d.publisherId === id && d.deliveredProvenanceHash === current,
      ),
  );
  // Every requested destination already has a matching record: nothing to do. A no-op
  // returns unchanged, without touching the environment or looking up a single capability —
  // the same idempotent shape a repeat call must have.
  if (!publisherId) return ok(el);

  const env = opts.env ?? decorEnv(decor.root);
  const cap = NEWSROOM_CAPABILITIES[publisherId];
  if (!cap)
    return fail(
      "invalid-request",
      `deliver: "${publisherId}" is not a delivery capability this install knows`,
    );
  const readiness = capabilityReadiness(cap, decor.state, { env });
  if (readiness.status !== "ready")
    return fail("invalid-request", `deliver: ${readiness.reason}`);

  const metadata = deliveryMetadata(el, profile, {
    ...(decor.state.delivery?.maxWidth !== undefined
      ? { width: decor.state.delivery.maxWidth }
      : {}),
    ...(decor.state.delivery?.height !== undefined
      ? { height: decor.state.delivery.height }
      : {}),
  });
  if (!metadata.ok) return metadata;

  // Credentials are collected HERE and handed to the contract explicitly. They are read from
  // the capability's own declared variables — never a blanket copy of the environment.
  const credentials: Record<string, string> = {};
  for (const group of cap.env)
    for (const name of group) {
      const v = env[name];
      if (v !== undefined) credentials[name] = v;
    }

  const result = await runVerb("publish", {
    artifactPath: join(runDir, el.artifact.path),
    id: el.id,
    metadata: metadata.value,
    settings: {
      publisherId,
      ...(decor.state.delivery?.snippetTemplate
        ? { snippetTemplate: decor.state.delivery.snippetTemplate }
        : {}),
    },
    credentials,
    outDir: join(runDir, "elements", el.id),
  });
  if (!result.ok) return result;

  const outcome = result.value as PublishOutcome;
  // The publisher DID run — a failure recording its outcome (reading the package back to hash
  // it) is therefore an engine-failed result, never a throw, exactly the discipline
  // produce.ts already applies to its own "read the delivered artifact back" step. Nothing
  // upstream of this catches a throw here: the driver awaits `deliver()` unguarded, the same
  // way it awaits `produce()` unguarded, trusting the never-throw invariant.
  let record: DeliveryRecord;
  try {
    record = {
      publisherId: outcome.publisherId,
      kind: outcome.kind,
      ...(outcome.url ? { url: outcome.url } : {}),
      ...(outcome.path ? { artifact: hashRef(outcome.path, runDir) } : {}),
      snippet: outcome.snippet,
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
