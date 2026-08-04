// The We.Publish publisher — the CMS destination of the FJM grant deliverable, and the one
// adapter whose newsroom (Heidi.news) is already named.
//
// Every behaviour here was MEASURED against a real We.Publish instance stood up locally
// (docker-compose under colima) before this file was written — spec
// docs/superpowers/specs/2026-07-27-l3-wepublish-design.md §3, facts W1-W16, all binding.
// The four that shape the whole file:
//   W6  — the CMS's embed block carries a URL and nothing else, while a PublishRequest carries
//         a file PATH and no URL. So the artifact travels in an HTML block, wrapped in an
//         `<iframe srcdoc>` that gives it the same isolation an iframe to S3 would.
//   W4  — an authentication failure is HTTP 200 with `errors`. A 2xx is not a success; every
//         call goes through gqlCall, which reads `errors` before `data`.
//   W7  — selecting `blocks` on a mutation's result crashes the server on an unpublished
//         article, AND W8: the write still happened. So mutations select scalars only, and the
//         verification is a separate read.
//   W10 — duplicate slugs are accepted, producing two articles fighting over one URL. So the
//         adapter looks up its deterministic carrier slug and UPDATES, never blindly creates.
import { readFileSync } from "node:fs";
import {
  artifactFileOf,
  DEFAULT_NETWORK_TIMEOUT_MS,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  timeoutFromSettings,
  type Publisher,
  type PublishOutcome,
  type PublishRequest,
} from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { isSafeId, unsafeIdMessage } from "../../core/id-safety";
import {
  buildBlockHtml,
  buildVideoBlockHtml,
  carriesMarker,
  carrierSlug,
} from "./wepublish-block";
import {
  articleUpdateVariables,
  blockSelectionSet,
  type BlockInput,
  type BlockOut,
  type TargetArticle,
} from "./wepublish-article";
import {
  gqlCall,
  gqlUpload,
  isNotFound,
  MAX_REQUEST_BODY_BYTES,
} from "./wepublish-gql";

/** W1: the GraphQL URL is `.../v1`, and it is configured rather than derived from a host. */
const REQUIRED_SETTINGS = ["endpoint"] as const;

/** The namespace the carrier articles live in, so they never collide with editorial slugs. */
const DEFAULT_SLUG_PREFIX = "splash-";

/** Same default the snippet module uses, so the two never disagree about a frame's height. */
const DEFAULT_FRAME_HEIGHT = 420;

// W5: `createArticle` takes FLAT args, ten of them NON_NULL with no default. They are written
// out in full, once. Only scalars come back (W7).
const CREATE_ARTICLE = `mutation SplashCreate($title: String, $slug: String, $blocks: [BlockContentInput!]!) {
  createArticle(
    title: $title, slug: $slug, blocks: $blocks,
    hidden: true, shared: false, disableComments: true, breaking: false, hideAuthor: false,
    tagIds: [], authorIds: [], socialMediaAuthorIds: [], properties: []
  ) { id slug url }
}`;

const UPDATE_ARTICLE = `mutation SplashUpdate($id: String!, $title: String, $slug: String, $blocks: [BlockContentInput!]!) {
  updateArticle(
    id: $id, title: $title, slug: $slug, blocks: $blocks,
    hidden: true, shared: false, disableComments: true, breaking: false, hideAuthor: false,
    tagIds: [], authorIds: [], socialMediaAuthorIds: [], properties: []
  ) { id slug url }
}`;

// The lookup reads `draft { blocks }`, never `latest { blocks }`: W7 measured that `latest`
// crashes the server on an article that has never been published, and the carrier may well be
// in exactly that state.
const FIND_ARTICLE = `query SplashFind($slug: String!) {
  article(slug: $slug) {
    id url
    draft { blocks { __typename ... on HTMLBlock { html } } }
    published { blocks { __typename ... on HTMLBlock { html } } }
  }
}`;

// The media server's way in. `tags` is NON_NULL with no default, so it is written out; the
// caption and alt live on the BLOCK, not on the image record, which is why nothing here tries
// to carry them.
const UPLOAD_IMAGE = `mutation SplashUpload($file: Upload!, $filename: String, $title: String, $description: String) {
  uploadImage(file: $file, filename: $filename, title: $title, description: $description, tags: []) { id }
}`;

const PUBLISH_ARTICLE = `mutation SplashPublish($id: String!, $at: DateTime!) {
  publishArticle(id: $id, publishedAt: $at) { id url publishedAt }
}`;

// W13: the verification is ANONYMOUS — no token — and reads the PUBLISHED revision, which is
// what the CMS actually serves to a reader.
const VERIFY_ARTICLE = `query SplashVerify($slug: String!) {
  article(slug: $slug) {
    id url publishedAt
    published { blocks { __typename ... on HTMLBlock { html } } }
  }
}`;

type BlockShape = { __typename?: string; html?: string };
type RevisionShape = { blocks?: BlockShape[] } | null;
type ArticleShape = {
  id?: string;
  url?: string;
  publishedAt?: string;
  draft?: RevisionShape;
  published?: RevisionShape;
} | null;

/** The html of the first HTML block of a revision, or undefined. */
function htmlOf(revision: RevisionShape | undefined): string | undefined {
  return revision?.blocks?.find((b) => b.__typename === "HTMLBlock")?.html;
}

// The target article's own state, read back in full so the total mutation can echo it
// (wepublish-article.ts explains why nothing less is safe). `draft` is selected rather than
// `latest` for the same reason the carrier lookup does — W7.
const FIND_TARGET = `query SplashFindTarget($slug: String!) {
  article(slug: $slug) {
    id url slug likes shared hidden disableComments
    tags { id }
    draft {
      preTitle title lead imageID canonicalUrl hideAuthor breaking
      seoTitle socialMediaTitle socialMediaDescription socialMediaImageID
      authors { id } socialMediaAuthors { id } properties { key value public }
      blocks { ${blockSelectionSet()} }
    }
    published {
      preTitle title lead imageID canonicalUrl hideAuthor breaking
      seoTitle socialMediaTitle socialMediaDescription socialMediaImageID
      authors { id } socialMediaAuthors { id } properties { key value public }
      blocks { ${blockSelectionSet()} }
    }
  }
}`;

// Scalars only in the selection (W7/W8), exactly as the carrier's mutations do. The variables
// are built by articleUpdateVariables and passed through whole — writing them out field by
// field here would be a second place for the total input to drift.
const UPDATE_TARGET = `mutation SplashInsert(
  $id: String!, $slug: String, $likes: Int, $title: String, $preTitle: String, $lead: String,
  $imageID: String, $canonicalUrl: String, $seoTitle: String, $socialMediaTitle: String,
  $socialMediaDescription: String, $socialMediaImageID: String,
  $shared: Boolean!, $hidden: Boolean!, $disableComments: Boolean!,
  $hideAuthor: Boolean!, $breaking: Boolean!,
  $blocks: [BlockContentInput!]!, $tagIds: [String!]!, $authorIds: [String!]!,
  $socialMediaAuthorIds: [String!]!, $properties: [PropertyInput!]!
) {
  updateArticle(
    id: $id, slug: $slug, likes: $likes, title: $title, preTitle: $preTitle, lead: $lead,
    imageID: $imageID, canonicalUrl: $canonicalUrl, seoTitle: $seoTitle,
    socialMediaTitle: $socialMediaTitle, socialMediaDescription: $socialMediaDescription,
    socialMediaImageID: $socialMediaImageID,
    shared: $shared, hidden: $hidden, disableComments: $disableComments,
    hideAuthor: $hideAuthor, breaking: $breaking,
    blocks: $blocks, tagIds: $tagIds, authorIds: $authorIds,
    socialMediaAuthorIds: $socialMediaAuthorIds, properties: $properties
  ) { id slug url }
}`;

/**
 * Insert the visual into the journalist's existing article, as a DRAFT edit.
 *
 * Two refusals carry the whole safety of this path, and both are absolute:
 *   - the article must EXIST. A typo'd slug creates nothing; the carrier path's
 *     "not found means create" is exactly wrong here.
 *   - every block must round-trip. `updateArticle` is total, so a block Splash cannot echo
 *     would be written back as nothing (wepublish-article.ts).
 *
 * And one thing it deliberately does NOT do: publish. The carrier article is Splash's, so
 * publishing it is part of delivering it. This article is the newsroom's, and pushing an
 * editorial document live is the journalist's decision, never a side effect of adding a chart.
 * The visual lands in the draft; the outcome says so.
 */
async function insertIntoArticle(args: {
  endpoint: string;
  token: string;
  slug: string;
  /** The visual, already in the shape the CMS takes — markup, or a block pointing at an upload. */
  visual: BlockInput;
  /** Recognises a previous delivery of THIS element, so a re-run replaces rather than stacks. */
  isOurs: (block: BlockOut) => boolean;
  afterIndex?: number;
  timeoutMs: number;
  uploadTimeoutMs: number;
}): Promise<VerbResult<PublishOutcome>> {
  const { endpoint, token, slug, visual, isOurs, afterIndex, timeoutMs } = args;

  const found = await gqlCall({
    endpoint,
    query: FIND_TARGET,
    variables: { slug },
    token,
    timeoutMs,
  });
  if (!found.ok)
    return fail(
      isNotFound(found.message) ? "invalid-request" : "engine-failed",
      isNotFound(found.message)
        ? `wepublish: no article "${slug}" in the CMS. Splash inserts into an article that already exists and never creates one under a name it was given — check the slug in the CMS address bar.`
        : `wepublish: could not look up the article "${slug}": ${found.message}`,
    );
  const target = (found.value.data as { article?: TargetArticle | null })
    .article;
  if (!target)
    return fail(
      "invalid-request",
      `wepublish: no article "${slug}" in the CMS. Splash inserts into an article that already exists and never creates one under a name it was given — check the slug in the CMS address bar.`,
    );

  const built = articleUpdateVariables(target, visual, { isOurs, afterIndex });
  if (!built.ok) return fail("invalid-request", built.message);

  const write = await gqlCall({
    endpoint,
    query: UPDATE_TARGET,
    variables: built.variables,
    token,
    timeoutMs: args.uploadTimeoutMs,
  });
  if (!write.ok)
    return fail(
      "engine-failed",
      `wepublish: could not insert the visual into "${slug}": ${write.message}`,
    );

  // Read back — authenticated and on the DRAFT, because that is where the edit landed. The
  // carrier path verifies anonymously against `published`; doing that here would report a
  // failure for the one thing this path is careful NOT to do.
  const verify = await gqlCall({
    endpoint,
    query: FIND_TARGET,
    variables: { slug },
    token,
    timeoutMs,
  });
  if (!verify.ok)
    return fail(
      "engine-failed",
      `wepublish: inserted the visual into "${slug}" but reading the article back failed: ${verify.message}`,
    );
  const after = (verify.value.data as { article?: TargetArticle | null })
    .article;
  const present = (after?.draft?.blocks ?? []).some((b) => isOurs(b));
  if (!present)
    return fail(
      "engine-failed",
      `wepublish: the write to "${slug}" reported success, but the article's draft does not carry the visual — nothing was inserted.`,
    );

  return ok({
    publisherId: "embed-cms",
    kind: "hosted",
    // The article's own address. Unlike the carrier, this URL existed before Splash and will
    // serve the visual once the journalist publishes their draft.
    url: after?.url ?? target.url!,
    publishedAt: new Date().toISOString(),
  });
}

async function publish(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  // Step 1: settings. Refuse naming the missing one and WHERE it belongs — a newsroom that has
  // only put the two credentials in .env otherwise has an enabled destination that refuses
  // every delivery with nowhere to go.
  for (const name of REQUIRED_SETTINGS) {
    if (!(req.settings[name] ?? "").trim())
      return fail(
        "invalid-request",
        `wepublish: settings.${name} is required — the newsroom's We.Publish destination must be fully configured before Splash publishes anything. ` +
          `It is set in newsroom.json under capabilities["embed-cms"].settings.${name} (credentials stay in .env).`,
      );
  }
  try {
    new URL(req.settings.endpoint!);
  } catch (e) {
    return fail(
      "invalid-request",
      `wepublish: settings.endpoint "${req.settings.endpoint}" is not a valid URL: ${(e as Error).message}. ` +
        `It is the full GraphQL address, which on We.Publish ends in /v1 (for example https://cms.example.org/v1).`,
    );
  }

  // Step 2: credentials, one at a time, returning on the FIRST miss — so the refusal about the
  // email never carries the word PASSWORD.
  //
  // W3: this is email + password rather than a scoped API token because the measurement showed
  // a `createToken` API token is FORBIDDEN for createArticle — editorial mutations require a
  // user session. The newsroom is told (envHelp) to make a dedicated Splash user for this.
  const email = req.credentials.SPLASH_WEPUBLISH_EMAIL;
  if (!(email ?? "").trim())
    return fail(
      "invalid-request",
      "wepublish: missing credential SPLASH_WEPUBLISH_EMAIL",
    );
  const password = req.credentials.SPLASH_WEPUBLISH_PASSWORD;
  if (!(password ?? "").trim())
    return fail(
      "invalid-request",
      "wepublish: missing credential SPLASH_WEPUBLISH_PASSWORD",
    );

  // Defence in depth, as zip.ts and s3.ts do: req.id is slug-checked at the verb, but this
  // adapter is the one that turns it into a CMS slug, so it re-asserts the guard itself.
  if (!isSafeId(req.id))
    return fail("invalid-request", unsafeIdMessage(req.id));

  // Step 3: read the artifact — unless it is a video, which arrives as an ADDRESS. There is no
  // self-hosted mp4 block in this CMS, so the bytes live wherever the newsroom publishes its
  // files and the article points at them; demanding a local file here would refuse the only
  // shape a video can legitimately have.
  const isVideo = req.format === "video";
  const file = isVideo
    ? ok("")
    : artifactFileOf(req, "wepublish");
  if (!file.ok) return file;
  // BYTES, not text. An interactive is markup and becomes a string a line below; a static PNG
  // is not valid UTF-8, and reading it as text corrupts it before anything else can go wrong.
  let bytes: Buffer;
  try {
    bytes = isVideo ? Buffer.alloc(0) : readFileSync(file.value);
  } catch (e) {
    return fail(
      "engine-failed",
      `wepublish: cannot read the artifact ${file.value}: ${(e as Error).message}`,
    );
  }

  const isStatic = req.format === "static";
  // A video's deliverable is the address the newsroom already serves it from. Refused loudly
  // rather than turned into a player with an empty src — a broken video in a live piece is
  // worse than a refusal that says what to do.
  if (isVideo && !(req.artifactUrl ?? "").trim())
    return fail(
      "invalid-request",
      "wepublish: a video reaches a CMS article as a player pointing at a hosted file — this CMS has no self-hosted mp4 block. " +
        "Publish the mp4 to the newsroom's own hosting first, then hand its URL over for insertion.",
    );
  const height =
    typeof req.metadata.height === "number"
      ? req.metadata.height
      : DEFAULT_FRAME_HEIGHT;
  // An image does not become markup: it becomes an upload plus a block that points at it, which
  // needs a session and therefore happens after the login, in the insertion branch below.
  const blockHtml = isStatic
    ? ""
    : isVideo
      ? buildVideoBlockHtml({
          url: req.artifactUrl!,
          id: req.id,
          title: req.metadata.title,
        })
      : buildBlockHtml({
        document: bytes.toString("utf8"),
        id: req.id,
        title: req.metadata.title,
        height,
      });

  // Step 4: the size ceiling, checked on the ESCAPED block rather than on the file (W14/W16).
  // A document full of quotes inflates on the way into the srcdoc attribute, so measuring the
  // raw file would let a payload through and earn the opaque 413 this check exists to prevent.
  // gqlCall enforces the same ceiling on the real body; this earlier check is what makes the
  // message name the ARTIFACT rather than an anonymous request.
  if (!isStatic && Buffer.byteLength(blockHtml) > MAX_REQUEST_BODY_BYTES)
    return fail(
      "invalid-request",
      `wepublish: this visual is too large to travel inside a CMS block — ${Buffer.byteLength(blockHtml)} bytes once wrapped for the article, ` +
        `against the server's ${MAX_REQUEST_BODY_BYTES}-byte request limit. Publish it to the newsroom's object storage instead, or make the visual lighter.`,
    );

  const endpoint = req.settings.endpoint!;
  const timeoutMs = timeoutFromSettings(
    req.settings,
    "timeoutMs",
    DEFAULT_NETWORK_TIMEOUT_MS,
  );
  // The write carries the artifact's own bytes, so it gets the wider budget — the same
  // distinction s3.ts draws between a control call and one that transmits the payload.
  const uploadTimeoutMs = timeoutFromSettings(
    req.settings,
    "uploadTimeoutMs",
    DEFAULT_UPLOAD_TIMEOUT_MS,
  );

  // Step 5: open a session. W2 — the token lasts 7 days, and is deliberately NOT cached: a
  // cached one would expire silently between two deliveries.
  const session = await gqlCall({
    endpoint,
    query: `mutation SplashLogin($email: String!, $password: String!) {
      createSession(email: $email, password: $password) { token }
    }`,
    variables: { email, password },
    timeoutMs,
  });
  if (!session.ok)
    return fail(
      "engine-failed",
      `wepublish: could not sign in as ${email} — ${session.message}. ` +
        `Check SPLASH_WEPUBLISH_EMAIL and SPLASH_WEPUBLISH_PASSWORD, and that this user may create and publish articles.`,
    );
  const token = (session.value.data as { createSession?: { token?: string } })
    .createSession?.token;
  if (!token)
    return fail(
      "engine-failed",
      `wepublish: signing in as ${email} returned no session token`,
    );

  // Step 5b: DIRECT INSERTION — the journalist's own article, named per delivery.
  //
  // The two modes are deliberately exclusive rather than layered. The carrier article is a
  // hosting surface Splash OWNS: it may set `hidden`, replace every block, and publish at will.
  // The target article is the newsroom's editorial document, where none of those are Splash's
  // to decide — so the branch is taken before any carrier logic runs, and shares only the
  // session and the block it just built.
  if ((req.settings.targetArticleSlug ?? "").trim()) {
    // WHAT the visual becomes inside the article, decided by its pinned format.
    //
    // interactive / scrolly → an HTML block carrying the markup, with our ownership marker in it.
    // static               → an UPLOAD to the media server, then an image block pointing at the
    //                        id it issued. That indirection is the CMS's, not ours: the image
    //                        block takes an `imageID` and has nowhere to put bytes.
    let visual: BlockInput;
    let isOurs: (block: BlockOut) => boolean;
    if (isStatic) {
      const uploaded = await gqlUpload({
        endpoint,
        query: UPLOAD_IMAGE,
        variables: {
          file: null,
          filename: `${req.id}.png`,
          title: req.metadata.title,
          // The alt text, on the record the CMS will reuse everywhere this image appears. It is
          // required upstream of here (WCAG 1.1.1 is fail-hard at produce), so it is never blank.
          description: req.metadata.altText,
        },
        file: bytes,
        filename: `${req.id}.png`,
        contentType: "image/png",
        token,
        timeoutMs: uploadTimeoutMs,
      });
      if (!uploaded.ok)
        return fail(
          "engine-failed",
          `wepublish: could not upload the image to the CMS's media server: ${uploaded.message}`,
        );
      const imageID = (uploaded.value.data as { uploadImage?: { id?: string } })
        .uploadImage?.id;
      if (!imageID)
        return fail(
          "engine-failed",
          "wepublish: the media server accepted the image but returned no id, so no block can point at it",
        );
      visual = {
        image: {
          imageID,
          // The caption a reader sees. The title carries the takeaway; the alt lives on the
          // image record above, where the CMS expects it.
          caption: req.metadata.title,
        },
      };
      // Recognising a previous delivery: the image block Splash inserted is the one pointing at
      // THIS upload. A re-run uploads a fresh image, so the match is on the caption we wrote —
      // the only field of ours that survives on the block.
      isOurs = (block) =>
        block.__typename === "ImageBlock" &&
        typeof block.caption === "string" &&
        block.caption === req.metadata.title;
    } else {
      visual = { html: { html: blockHtml } };
      isOurs = (block) =>
        block.__typename === "HTMLBlock" &&
        typeof block.html === "string" &&
        carriesMarker(block.html, req.id);
    }
    return insertIntoArticle({
      endpoint,
      token,
      slug: req.settings.targetArticleSlug!.trim(),
      visual,
      isOurs,
      // The journalist's confirmed position, carried as a setting like the target itself. An
      // absent one appends; a malformed one is NOT silently dropped into "append".
      ...(req.settings.targetAfterBlock !== undefined
        ? { afterIndex: Number(req.settings.targetAfterBlock) }
        : {}),
      timeoutMs,
      uploadTimeoutMs,
    });
  }

  // Step 6: find the carrier article. The slug is deterministic, which is what makes a
  // re-publication land on the SAME article and therefore the same URL (W12).
  const prefix = req.settings.slugPrefix ?? DEFAULT_SLUG_PREFIX;
  const slug = carrierSlug(prefix, req.id);

  const found = await gqlCall({
    endpoint,
    query: FIND_ARTICLE,
    variables: { slug },
    token,
    timeoutMs,
  });

  let existing: ArticleShape = null;
  if (found.ok) {
    existing = (found.value.data as { article?: ArticleShape }).article ?? null;
  } else if (!isNotFound(found.message)) {
    // W11: "was not found" is the signal to create. Anything else is a real failure and must
    // not be swallowed into "so let's create one".
    return fail(
      "engine-failed",
      `wepublish: could not look up the carrier article "${slug}": ${found.message}`,
    );
  }

  // Step 7: the ownership refusal (spec §4.2). An article already sitting at this slug that
  // does NOT carry this element's marker belongs to the newsroom, and overwriting its blocks
  // would destroy editorial content. This is the direct analogue of the S3 adapter's refusal to
  // rewrite a bucket policy: Splash names the conflict and stops rather than reaching further
  // into someone else's system than the delivery requires.
  if (existing) {
    const current = htmlOf(existing.draft) ?? htmlOf(existing.published);
    if (!carriesMarker(current, req.id))
      return fail(
        "engine-failed",
        `wepublish: an article already exists at "${slug}" and it was not created by Splash for this visual — ` +
          `publishing would overwrite its content. Splash will not rewrite an article it does not own. ` +
          `Rename that article, or set a different capabilities["embed-cms"].settings.slugPrefix, then retry.`,
      );
  }

  // Step 8: write. Scalars only in the selection (W7), so the mutation cannot be reported as a
  // failure by a crash in a field the adapter does not even need (W8).
  const write = existing?.id
    ? await gqlCall({
        endpoint,
        query: UPDATE_ARTICLE,
        variables: {
          id: existing.id,
          title: req.metadata.title,
          slug,
          blocks: [{ html: { html: blockHtml } }],
        },
        token,
        timeoutMs: uploadTimeoutMs,
      })
    : await gqlCall({
        endpoint,
        query: CREATE_ARTICLE,
        variables: {
          title: req.metadata.title,
          slug,
          blocks: [{ html: { html: blockHtml } }],
        },
        token,
        timeoutMs: uploadTimeoutMs,
      });
  if (!write.ok)
    return fail(
      "engine-failed",
      `wepublish: could not ${existing?.id ? "update" : "create"} the carrier article "${slug}": ${write.message}`,
    );

  const written = write.value.data as {
    createArticle?: ArticleShape;
    updateArticle?: ArticleShape;
  };
  const article = written.createArticle ?? written.updateArticle ?? null;
  if (!article?.id)
    return fail(
      "engine-failed",
      `wepublish: writing the carrier article "${slug}" returned no article id`,
    );

  // Step 9: publish. A separate, REQUIRED step — W12 measured that `published` stays stale
  // until this runs, so skipping it would leave the delivered URL serving the previous version
  // (or nothing at all, on a first publication).
  const publishedAt = new Date().toISOString();
  const pub = await gqlCall({
    endpoint,
    query: PUBLISH_ARTICLE,
    variables: { id: article.id, at: publishedAt },
    token,
    timeoutMs,
  });
  if (!pub.ok)
    return fail(
      "engine-failed",
      `wepublish: the carrier article "${slug}" was written but could not be published: ${pub.message}`,
    );

  // W9: the URL is READ from the server, never constructed. It is built by the API's own
  // URLAdapter from the deployment's WEBSITE_URL, which this adapter has no way to know.
  const publishedArticle = (pub.value.data as { publishArticle?: ArticleShape })
    .publishArticle;
  const url = publishedArticle?.url ?? article.url;
  if (!url)
    return fail(
      "engine-failed",
      `wepublish: the carrier article "${slug}" was published but the server returned no URL for it`,
    );

  // Step 10: verify what is actually SERVED, anonymously — the discipline both other hosted
  // adapters keep. "The mutation returned data" is not "a reader can see the visual": this read
  // carries no token at all, so it sees exactly what the public sees (W13).
  const verify = await gqlCall({
    endpoint,
    query: VERIFY_ARTICLE,
    variables: { slug },
    timeoutMs,
  });
  if (!verify.ok)
    return fail(
      "engine-failed",
      `wepublish: published "${slug}" but reading it back anonymously failed: ${verify.message}`,
    );
  const servedArticle = (verify.value.data as { article?: ArticleShape })
    .article;
  const served = htmlOf(servedArticle?.published ?? null);
  if (served === undefined)
    return fail(
      "engine-failed",
      `wepublish: published "${slug}" but its published revision serves no HTML block — ` +
        `the article exists and a reader would see nothing.`,
    );
  if (served !== blockHtml)
    return fail(
      "engine-failed",
      `wepublish: published "${slug}" but the CMS serves different content than the visual that was sent ` +
        `(${served.length} bytes served against ${blockHtml.length} sent) — check for a sanitising layer on the HTML block.`,
    );

  return ok({
    publisherId: "embed-cms",
    kind: "hosted",
    url,
    // No `snippet`, deliberately (spec §4.4). The visual IS in the CMS — there is nothing to
    // paste. The URL is an article PAGE, so an iframe to it would wrap the newsroom's own header
    // and footer around the visual: worse than what the CMS already renders. Writing "" here
    // would claim "delivered with an empty embed code", which is a different and false claim.
    publishedAt,
  });
}

export const wepublishPublisher: Publisher = {
  id: "embed-cms",
  kind: "hosted",
  // The embed genre only (spec §4.1). Measured, not preferred: the sole block that can carry
  // the artifact carries MARKUP (W6). A PNG's CMS-native home is the image block, which needs
  // an imageID from the media server — a different upload mechanism entirely — and every video
  // block in BlockContentInput takes an EXTERNAL platform id (YouTube, Vimeo, TikTok,
  // Streamable), so there is no self-hosted mp4 block to target at all. Base64-inlining either
  // one would blow the 1 MiB ceiling and produce a worse result than the file the CMS wants.
  // lib/loop/deliver.ts turns a `static`/`video` request here into a refusal that names the
  // portable package instead, which is where the genre routing already sends them.
  // `static` joined the list once the media-server path existed: an image reaches an article
  // through an upload plus a block that points at it, which is the CMS's own mechanism for
  // pictures. `video` did NOT: measured, every video block in BlockContentInput takes an id from
  // an external platform (YouTube, Vimeo, TikTok, Streamable…), `uploadDocument` stores a file
  // that no block renders, and there is no self-hosted mp4 block at all. An mp4 therefore
  // reaches a CMS article only as an embed of a URL somebody else hosts.
  serves: ["interactive", "scrolly", "static", "video"],
  // BYTES for the three formats that have a home here, and an ADDRESS for the one that does
  // not: a video is inserted as a player pointing at a file the newsroom already serves, so its
  // deliverable is legitimately a URL this run owns no bytes of.
  sources: ["file", "hosted"],
  implemented: true,
  publish,
};
