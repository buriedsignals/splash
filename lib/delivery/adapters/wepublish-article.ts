// Direct insertion into the journalist's OWN article — the total round-trip it requires.
//
// The carrier path (wepublish.ts, spec §4) writes an article Splash owns, so it can send
// whatever state it likes. Insertion cannot: the target is a live editorial document, and
// `updateArticle` is TOTAL. Measured from upstream source (wepublish@main,
// libs/article/api/src/lib/article.model.ts:203-254): `CreateArticleInput` — which
// `UpdateArticleInput` extends by adding only `id` — declares `shared`, `hidden`,
// `disableComments`, `blocks`, `tagIds`, `authorIds`, `socialMediaAuthorIds` and `properties`
// NON_NULL with no default, and inherits `hideAuthor` / `breaking` the same way.
//
// So there is no "add a block" mutation. There is only "send the whole article back, plus one
// block". Every field this module fails to carry is a field RESET on the journalist's piece:
// omit `tagIds` and the write is a validation error, send `[]` and the article silently loses
// its tags. That asymmetry — a partial write is indistinguishable from an edit — is why the
// refusals here are the substance of the file: an article carrying anything this module cannot
// echo faithfully is NOT written at all.
//
// The block table below is GENERATED from the CMS's own published schema
// (wepublish@main, apps/api-example/schema-v2.graphql), not hand-written from the TypeScript
// models. That change of instrument is not cosmetic: the hand-written first version silently
// dropped `blockStyleName` from EVERY block it echoed, because that field is declared somewhere
// the model-reading missed. A field dropped on every rewritten block is precisely the silent
// reset this whole module exists to prevent, and only the schema — the thing the server actually
// validates against — could be trusted to enumerate them.
//
// Selection rule, applied to `BlockContentInput`'s one-of keys: a block is echoable when its
// input type is made of SCALARS ONLY. Those 20 round-trip by construction. The other 10
// (teasers, listicle, image gallery, flex, event, comment, subscribe…) take nested input types
// whose shape differs structurally from what the query returns, so they are NOT echoable by
// copying and are refused rather than guessed at.

/** The refusal code a block type outside the measured map produces. */
export const UNSUPPORTED_BLOCK = "unsupported-block" as const;

/**
 * __typename → { key: the one-of field on BlockContentInput, fields: what the input accepts }.
 *
 * The 20 scalar-only block types, from the schema. A type absent here is one of the 10 whose
 * input nests another input type: echoing the query's output into it would not typecheck at the
 * server, and guessing the mapping would corrupt the block. The refusal names it.
 */
const BLOCK_INPUTS: Readonly<
  Record<string, { key: string; fields: readonly string[] }>
> = {
  BildwurfAdBlock: {
    key: "bildwurfAd",
    fields: ["blockStyle", "blockStyleName", "disabled", "zoneID"],
  },
  BreakBlock: {
    key: "linkPageBreak",
    fields: [
      "blockStyle",
      "blockStyleName",
      "disabled",
      "hideButton",
      "imageID",
      "linkTarget",
      "linkText",
      "linkURL",
      "richText",
      "text",
    ],
  },
  CrowdfundingBlock: {
    key: "crowdfunding",
    fields: ["blockStyle", "blockStyleName", "crowdfundingId", "disabled"],
  },
  FacebookPostBlock: {
    key: "facebookPost",
    fields: ["blockStyle", "blockStyleName", "disabled", "postID", "userID"],
  },
  FacebookVideoBlock: {
    key: "facebookVideo",
    fields: ["blockStyle", "blockStyleName", "disabled", "userID", "videoID"],
  },
  HTMLBlock: {
    key: "html",
    fields: ["blockStyle", "blockStyleName", "disabled", "html"],
  },
  IFrameBlock: {
    key: "embed",
    fields: [
      "blockStyle",
      "blockStyleName",
      "disabled",
      "height",
      "sandbox",
      "styleCustom",
      "title",
      "url",
      "width",
    ],
  },
  ImageBlock: {
    key: "image",
    fields: [
      "blockStyle",
      "blockStyleName",
      "caption",
      "disabled",
      "imageID",
      "linkUrl",
    ],
  },
  InstagramPostBlock: {
    key: "instagramPost",
    fields: ["blockStyle", "blockStyleName", "disabled", "postID"],
  },
  PolisConversationBlock: {
    key: "polisConversation",
    fields: ["blockStyle", "blockStyleName", "conversationID", "disabled"],
  },
  PollBlock: {
    key: "poll",
    fields: ["blockStyle", "blockStyleName", "disabled", "pollId"],
  },
  QuoteBlock: {
    key: "quote",
    fields: [
      "author",
      "blockStyle",
      "blockStyleName",
      "disabled",
      "imageID",
      "quote",
    ],
  },
  RichTextBlock: {
    key: "richText",
    fields: ["blockStyle", "blockStyleName", "disabled", "richText"],
  },
  SoundCloudTrackBlock: {
    key: "soundCloudTrack",
    fields: ["blockStyle", "blockStyleName", "disabled", "trackID"],
  },
  StreamableVideoBlock: {
    key: "streamableVideo",
    fields: ["blockStyle", "blockStyleName", "disabled", "videoID"],
  },
  TikTokVideoBlock: {
    key: "tikTokVideo",
    fields: ["blockStyle", "blockStyleName", "disabled", "userID", "videoID"],
  },
  TitleBlock: {
    key: "title",
    fields: [
      "blockStyle",
      "blockStyleName",
      "disabled",
      "lead",
      "preTitle",
      "title",
    ],
  },
  TwitterTweetBlock: {
    key: "twitterTweet",
    fields: ["blockStyle", "blockStyleName", "disabled", "tweetID", "userID"],
  },
  VimeoVideoBlock: {
    key: "vimeoVideo",
    fields: ["blockStyle", "blockStyleName", "disabled", "videoID"],
  },
  YouTubeVideoBlock: {
    key: "youTubeVideo",
    fields: ["blockStyle", "blockStyleName", "disabled", "videoID"],
  },
};

export type BlockOut = { __typename?: string } & Record<string, unknown>;
export type BlockInput = Record<string, Record<string, unknown>>;

export type BlockResult =
  | { ok: true; input: BlockInput }
  | { ok: false; code: typeof UNSUPPORTED_BLOCK; typename: string };

/** The GraphQL selection set that reads back everything the map above can echo. */
export function blockSelectionSet(): string {
  const fragments = Object.entries(BLOCK_INPUTS).map(
    ([typename, { fields }]) => `... on ${typename} { ${fields.join(" ")} }`,
  );
  return `__typename ${fragments.join(" ")}`;
}

/** One block, output shape → input shape. Absent fields stay absent (all are nullable). */
export function blockInputFor(block: BlockOut): BlockResult {
  const typename = block.__typename ?? "";
  const spec = BLOCK_INPUTS[typename];
  if (!spec) return { ok: false, code: UNSUPPORTED_BLOCK, typename };
  const body: Record<string, unknown> = {};
  for (const field of spec.fields)
    if (block[field] !== undefined && block[field] !== null)
      body[field] = block[field];
  return { ok: true, input: { [spec.key]: body } };
}

type Revision = {
  preTitle?: string;
  title?: string;
  lead?: string;
  imageID?: string;
  canonicalUrl?: string;
  hideAuthor?: boolean;
  breaking?: boolean;
  seoTitle?: string;
  socialMediaTitle?: string;
  socialMediaDescription?: string;
  socialMediaImageID?: string;
  authors?: { id?: string }[];
  socialMediaAuthors?: { id?: string }[];
  properties?: { key: string; value: string; public: boolean }[];
  blocks?: BlockOut[];
};

export type TargetArticle = {
  id?: string;
  /** The article's own public address — read from the server, never constructed (W9). */
  url?: string;
  slug?: string;
  shared?: boolean;
  hidden?: boolean;
  disableComments?: boolean;
  likes?: number;
  tags?: { id?: string }[];
  draft?: Revision | null;
  published?: Revision | null;
};

export type UpdateVariables = Record<string, unknown> & {
  id: string;
  blocks: BlockInput[];
  tagIds: string[];
  authorIds: string[];
  socialMediaAuthorIds: string[];
};

export type VariablesResult =
  { ok: true; variables: UpdateVariables } | { ok: false; message: string };

function idsOf(people: { id?: string }[] | undefined): string[] {
  return (people ?? []).map((p) => p.id).filter((id): id is string => !!id);
}

/**
 * The journalist's article + our visual block → the complete `updateArticle` variables.
 *
 * `isOurs` identifies a previously inserted visual by the html of an HTMLBlock, so a second
 * delivery of the same element REPLACES it in place instead of stacking a duplicate — the same
 * update-never-blindly-create discipline the carrier path applies (W10).
 */
export function articleUpdateVariables(
  article: TargetArticle,
  visual: BlockInput,
  opts: { isOurs?: (html: string) => boolean; afterIndex?: number } = {},
): VariablesResult {
  const revision = article.draft ?? article.published ?? null;
  if (!revision)
    return {
      ok: false,
      message:
        `wepublish: the article "${article.slug ?? article.id}" has no draft or published revision to read back — ` +
        `Splash will not write a blank article over it.`,
    };

  const blocks: BlockInput[] = [];
  let replaced = false;
  for (const block of revision.blocks ?? []) {
    const isOurs =
      block.__typename === "HTMLBlock" &&
      typeof block.html === "string" &&
      (opts.isOurs?.(block.html) ?? false);
    if (isOurs) {
      // In place: the journalist chose where this visual sits. A re-delivery that appended
      // instead would move it to the end of the article and leave the stale copy behind.
      blocks.push(visual);
      replaced = true;
      continue;
    }
    const mapped = blockInputFor(block);
    if (!mapped.ok)
      return {
        ok: false,
        message:
          `wepublish: the article "${article.slug ?? article.id}" contains a ${mapped.typename}, whose input shape Splash has not measured. ` +
          `Inserting the visual means re-sending every block of the article, so writing now would replace that block with nothing. ` +
          `Splash refuses rather than damage the piece — deliver the visual as a hosted link instead, and paste it where you want it.`,
      };
    blocks.push(mapped.input);
  }

  if (!replaced) {
    // WHERE it goes. `afterIndex` is the journalist's CONFIRMED answer (SKILL.md §6 form d asks
    // and confirms before anything is written): -1 puts the visual first, n puts it after the
    // n-th existing block, and an absent answer appends. Appending is a fallback, not a default
    // worth defending — a chart usually belongs beside the paragraph that makes its claim, which
    // is why the anchor `suggest-article` already computes finally has somewhere to go.
    const existing = blocks.length;
    const at = opts.afterIndex;
    if (at === undefined) blocks.push(visual);
    else if (at < -1 || at >= existing)
      return {
        ok: false,
        message:
          `wepublish: the confirmed position (after block ${at}) is not a place in "${article.slug ?? article.id}" — it holds ${existing} blocks. ` +
          `The article has probably been edited since you were asked where the visual goes. Re-read it and confirm the position again; ` +
          `Splash will not quietly put the visual somewhere else.`,
      };
    else blocks.splice(at + 1, 0, visual);
  }

  if (!article.id)
    return {
      ok: false,
      message: `wepublish: the article "${article.slug}" came back without an id, so there is nothing to update.`,
    };

  const variables: UpdateVariables = {
    id: article.id,
    // NON_NULL flags — echoed from the article, never defaulted. The carrier path's own
    // `hidden: true` applied here would hide the journalist's published piece.
    shared: article.shared ?? false,
    hidden: article.hidden ?? false,
    disableComments: article.disableComments ?? false,
    hideAuthor: revision.hideAuthor ?? false,
    breaking: revision.breaking ?? false,
    // NON_NULL lists — an empty one is a deletion, not a default.
    blocks,
    tagIds: idsOf(article.tags),
    authorIds: idsOf(revision.authors),
    socialMediaAuthorIds: idsOf(revision.socialMediaAuthors),
    properties: (revision.properties ?? []).map((p) => ({
      key: p.key,
      value: p.value,
      public: p.public,
    })),
  };

  // Nullable scalars: carried when present, absent when absent. Sending `null` for one the
  // article never had is the same edit as clearing one it did.
  const optional: [string, unknown][] = [
    ["slug", article.slug],
    ["likes", article.likes],
    ["preTitle", revision.preTitle],
    ["title", revision.title],
    ["lead", revision.lead],
    ["imageID", revision.imageID],
    ["canonicalUrl", revision.canonicalUrl],
    ["seoTitle", revision.seoTitle],
    ["socialMediaTitle", revision.socialMediaTitle],
    ["socialMediaDescription", revision.socialMediaDescription],
    ["socialMediaImageID", revision.socialMediaImageID],
  ];
  for (const [name, value] of optional)
    if (value !== undefined && value !== null) variables[name] = value;

  return { ok: true, variables };
}
