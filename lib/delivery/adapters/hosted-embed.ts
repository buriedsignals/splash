// The hand-over of an ALREADY PUBLISHED embed — the delivery a Datawrapper interactive needs, and
// the only one it can have.
//
// Every other adapter in this directory moves bytes: zip archives them, s3 and cloudflare upload
// them, wepublish posts them into a CMS. A Datawrapper interactive chart or map has no bytes at
// all — dw-chart/map-dw publish it on Datawrapper's own CDN and hand back `files: []` and a
// publicUrl (form "hosted", lib/core/contract.ts). Its `deliveryGenreFor` is "embed", and the
// embed IS the deliverable.
//
// So "publishing" it means three things and no more:
//   1. prove the address still answers — a hand-over of a dead embed is not a delivery, and this
//      is the ONE moment the newsroom's own link is checked before it goes into an article;
//   2. compose the code a CMS pastes, through the same renderSnippet every other destination uses
//      (so a newsroom's tested `snippetTemplate` applies here exactly as it does to a hosted PNG);
//   3. record the hand-over as `kind: "hosted"` with the URL, and NO path — the newsroom owns no
//      file of this, and a record claiming one would be false.
//
// What it deliberately does NOT do is re-upload the chart somewhere Splash controls. That would
// turn a live, editable Datawrapper chart into a frozen copy at a second address, and the
// newsroom would then have two embeds that disagree the moment the chart is corrected.
import {
  DEFAULT_NETWORK_TIMEOUT_MS,
  fetchBounded,
  timeoutFromSettings,
  type Publisher,
  type PublishRequest,
  type PublishOutcome,
} from "../../core/publishers";
import { isHostedUrl } from "../../core/contract";
import { isSafeId, unsafeIdMessage } from "../../core/id-safety";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";

export const HOSTED_EMBED_PUBLISHER_ID = "embed-hosted";

async function publishHostedEmbed(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  if (!isSafeId(req.id))
    return fail("invalid-request", unsafeIdMessage(req.id));

  // NOTHING TO HAND OVER. Refused before a single call goes out — the same discipline every
  // other adapter applies to its own missing settings, and the reason lib/loop/deliver.ts checks
  // `sources` first: by the time a request without an address reaches here, something upstream
  // has already routed a file delivery to a link-forwarder.
  if (!isHostedUrl(req.artifactUrl))
    return fail(
      "invalid-request",
      `${HOSTED_EMBED_PUBLISHER_ID}: this destination hands over an embed that is ALREADY published, ` +
        `and the request carries no resolvable https address (${JSON.stringify(req.artifactUrl)}) — ` +
        `a deliverable the run owns as a file is handed over as a file`,
    );
  const url = req.artifactUrl!;

  // The address, checked. A bounded GET through the same wrapper every outbound call in the
  // delivery substrate uses — never a bare fetch, so the one place the bound lives stays one place.
  let res: Response;
  try {
    res = await fetchBounded(
      url,
      { redirect: "follow" },
      timeoutFromSettings(
        req.settings,
        "timeoutMs",
        DEFAULT_NETWORK_TIMEOUT_MS,
      ),
    );
  } catch (e) {
    return fail(
      "engine-failed",
      `${HOSTED_EMBED_PUBLISHER_ID}: ${url} could not be reached — ${(e as Error).message}`,
    );
  }
  if (!res.ok)
    return fail(
      "engine-failed",
      `${HOSTED_EMBED_PUBLISHER_ID}: ${url} answered ${res.status} — the published embed is not live, ` +
        `so there is nothing to hand over; publish it again before delivering it`,
    );

  const snippet = renderSnippet({
    url,
    id: req.id,
    metadata: req.metadata,
    format: req.format,
    ...(req.settings.snippetTemplate
      ? { template: req.settings.snippetTemplate }
      : {}),
  });
  if (!snippet.ok) return snippet;

  return ok({
    publisherId: HOSTED_EMBED_PUBLISHER_ID,
    kind: "hosted",
    url,
    snippet: snippet.value,
    publishedAt: new Date().toISOString(),
  });
}

export const hostedEmbedPublisher: Publisher = {
  id: HOSTED_EMBED_PUBLISHER_ID,
  kind: "hosted",
  // The embed genre, and only it: a static PNG or an mp4 is a FILE the newsroom owns, and there
  // is no such thing as one of those already published at an address this run did not create.
  serves: ["interactive", "scrolly"],
  // The ONLY adapter that takes a published address rather than bytes.
  sources: ["hosted"],
  implemented: true,
  publish: publishHostedEmbed,
};
