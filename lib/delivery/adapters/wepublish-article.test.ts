// The TOTAL round-trip that direct insertion rests on.
//
// `updateArticle` is total (measured from upstream source, wepublish@main
// libs/article/api/src/lib/article.model.ts:203-254): `shared`, `hidden`, `disableComments`,
// `blocks`, `tagIds`, `authorIds`, `socialMediaAuthorIds`, `properties`, `hideAuthor` and
// `breaking` are all NON_NULL with no default. So adding one block to a journalist's article
// means re-sending the WHOLE article. Every field this module fails to carry back is a field
// silently RESET on a live editorial document — which is why the refusals below are the point
// of the file, not its edge cases.
import { describe, it, expect } from "bun:test";
import {
  articleUpdateVariables,
  blockInputFor,
  UNSUPPORTED_BLOCK,
  type BlockOut,
  type TargetArticle,
} from "./wepublish-article";

/** A journalist's real article: a title, prose, a photo, and a quote. */
function article(): TargetArticle & { draft: { blocks: BlockOut[] } } {
  return {
    id: "art-1",
    slug: "annemasse-frontaliers",
    shared: false,
    hidden: false,
    disableComments: true,
    // Tags hang off the ARTICLE, not the revision (article.model.ts:151) — and `tagIds` is
    // NON_NULL on the input. Deriving them from the wrong place, or defaulting to [], strips
    // the article's tags on every insertion.
    tags: [{ id: "t-1" }, { id: "t-2" }],
    draft: {
      preTitle: "Enquête",
      title: "Annemasse",
      lead: "Ce que révèlent les chiffres",
      imageID: "img-hero",
      canonicalUrl: "https://heidi.news/annemasse",
      hideAuthor: false,
      breaking: false,
      seoTitle: "Annemasse — enquête",
      socialMediaTitle: "Annemasse",
      socialMediaDescription: "Les chiffres",
      socialMediaImageID: "img-social",
      authors: [{ id: "a-1" }, { id: "a-2" }],
      socialMediaAuthors: [{ id: "a-1" }],
      properties: [{ key: "k", value: "v", public: true }],
      blocks: [
        { __typename: "TitleBlock", title: "Annemasse", lead: "Les chiffres" },
        { __typename: "RichTextBlock", richText: [{ type: "paragraph" }] },
        { __typename: "ImageBlock", imageID: "img-1", caption: "La douane" },
      ],
    },
  };
}

const VISUAL = { html: { html: "<iframe srcdoc='...'></iframe>" } };

describe("blockInputFor", () => {
  it("should map a block to its one-of input key, dropping only __typename", () => {
    expect(
      blockInputFor({ __typename: "HTMLBlock", html: "<p>x</p>" }),
    ).toEqual({ ok: true, input: { html: { html: "<p>x</p>" } } });
  });

  it("should keep the base-block fields every input still carries", () => {
    expect(
      blockInputFor({
        __typename: "TitleBlock",
        title: "T",
        blockStyle: "wide",
        disabled: false,
      }),
    ).toEqual({
      ok: true,
      input: { title: { title: "T", blockStyle: "wide", disabled: false } },
    });
  });

  it("should drop the RESOLVED relation an input replaces with its id", () => {
    // ImageBlockInput omits `image` and keeps `imageID` (image-block.model.ts:24-31).
    // Echoing the resolved object back would be a validation error.
    const r = blockInputFor({
      __typename: "ImageBlock",
      imageID: "img-1",
      image: { id: "img-1", url: "https://cdn/x.jpg" },
      caption: "c",
    });
    expect(r).toEqual({
      ok: true,
      input: { image: { imageID: "img-1", caption: "c" } },
    });
  });

  it("should carry blockStyleName — the field a hand-written table silently dropped", () => {
    // The bug that changed the instrument. `blockStyleName` is on every one of the 20 inputs in
    // the schema, and the first table (read off the TypeScript models) had it on none of them —
    // so every rewritten block lost its style, on a live article, silently.
    const r = blockInputFor({
      __typename: "RichTextBlock",
      richText: [{ type: "paragraph" }],
      blockStyleName: "pull-quote",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.richText!.blockStyleName).toBe("pull-quote");
  });

  it("should echo the embed blocks a real article is full of", () => {
    // 20 scalar-only types round-trip, not the 7 the first pass covered. These are the ones a
    // newsroom piece actually carries between its paragraphs.
    for (const [block, key, field, value] of [
      [{ __typename: "YouTubeVideoBlock", videoID: "abc" }, "youTubeVideo", "videoID", "abc"],
      [{ __typename: "TwitterTweetBlock", tweetID: "1", userID: "u" }, "twitterTweet", "tweetID", "1"],
      [{ __typename: "PollBlock", pollId: "p-1" }, "poll", "pollId", "p-1"],
      [{ __typename: "InstagramPostBlock", postID: "i" }, "instagramPost", "postID", "i"],
    ] as const) {
      const r = blockInputFor(block as BlockOut);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.input[key]![field]).toBe(value);
    }
  });

  it("should REFUSE a block type it cannot faithfully echo, naming it", () => {
    const r = blockInputFor({ __typename: "ListicleBlock", items: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe(UNSUPPORTED_BLOCK);
      expect(r.typename).toBe("ListicleBlock");
    }
  });
});

describe("articleUpdateVariables", () => {
  it("should carry back every field the total mutation demands", () => {
    const r = articleUpdateVariables(article(), VISUAL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.variables;
    // The flags: echoed, never defaulted. Sending `hidden: true` here — the carrier
    // article's own value — would HIDE the journalist's published piece.
    expect(v.hidden).toBe(false);
    expect(v.shared).toBe(false);
    expect(v.disableComments).toBe(true);
    expect(v.breaking).toBe(false);
    expect(v.hideAuthor).toBe(false);
    // The lists: NON_NULL, so an omission is a validation error and an empty array is a
    // silent deletion of the article's authors.
    expect(v.authorIds).toEqual(["a-1", "a-2"]);
    expect(v.socialMediaAuthorIds).toEqual(["a-1"]);
    expect(v.properties).toEqual([{ key: "k", value: "v", public: true }]);
    expect(v.tagIds).toEqual(["t-1", "t-2"]);
    // The editorial scalars.
    expect(v.title).toBe("Annemasse");
    expect(v.preTitle).toBe("Enquête");
    expect(v.lead).toBe("Ce que révèlent les chiffres");
    expect(v.imageID).toBe("img-hero");
    expect(v.canonicalUrl).toBe("https://heidi.news/annemasse");
    expect(v.seoTitle).toBe("Annemasse — enquête");
    expect(v.socialMediaImageID).toBe("img-social");
    expect(v.id).toBe("art-1");
    expect(v.slug).toBe("annemasse-frontaliers");
  });

  it("should APPEND the visual and keep every existing block, in order", () => {
    const r = articleUpdateVariables(article(), VISUAL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.variables.blocks).toEqual([
      { title: { title: "Annemasse", lead: "Les chiffres" } },
      { richText: { richText: [{ type: "paragraph" }] } },
      { image: { imageID: "img-1", caption: "La douane" } },
      VISUAL,
    ]);
  });

  it("should REPLACE its own block in place on a re-delivery, never append a second", () => {
    const a = article();
    a.draft.blocks.splice(1, 0, {
      __typename: "HTMLBlock",
      html: "<iframe srcdoc='OLD'></iframe>",
    });
    const r = articleUpdateVariables(a, VISUAL, {
      isOurs: (html) => html.includes("srcdoc"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const blocks = r.variables.blocks;
    expect(blocks).toHaveLength(4);
    expect(blocks[1]).toEqual(VISUAL);
    expect(JSON.stringify(blocks)).not.toContain("OLD");
  });

  it("should REFUSE the whole write when ONE block cannot be echoed", () => {
    const a = article();
    a.draft.blocks.push({ __typename: "ListicleBlock", items: [] });
    const r = articleUpdateVariables(a, VISUAL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // Names the block AND says what it protects: a partial write would drop the poll.
    expect(r.message).toContain("ListicleBlock");
    expect(r.message).toContain("annemasse-frontaliers");
  });

  it("should REFUSE an article with no revision to read rather than write a blank one", () => {
    const r = articleUpdateVariables(
      {
        id: "art-1",
        slug: "s",
        shared: false,
        hidden: false,
        disableComments: false,
      },
      VISUAL,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("no draft");
  });
});
