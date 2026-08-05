// Opt-in LIVE proof of DIRECT INSERTION: a real editorial article, in a real We.Publish, gets
// the visual added to its draft — and keeps everything it had.
//
// The replay-server tests (wepublish-insert.test.ts) hold the branch logic still. They cannot
// answer the question this file exists for: does the TOTAL round-trip survive a real server?
// `updateArticle` demands ten NON_NULL fields, and the whole design rests on the claim that
// what the API hands back can be handed straight in again. That claim is about a server's
// behaviour, so only a server can settle it — the repo's own rule for external APIs is real
// keys, real failures.
//
// ── Standing the instance up (same stack as wepublish-e2e.test.ts, which proves the CARRIER) ──
//
//   colima start --cpu 4 --memory 6
//   cd ~/wepublish-l3 && docker compose up -d database migration api
//   docker compose logs migration | grep "Bootstrapped initial admin user"
//
//   SPLASH_WEPUBLISH_E2E=1 \
//     SPLASH_WEPUBLISH_ENDPOINT=http://localhost:4000/v1 \
//     SPLASH_WEPUBLISH_EMAIL=admin@wepublish.ch \
//     SPLASH_WEPUBLISH_PASSWORD='<the bootstrapped password>' \
//     bun test lib/delivery/adapters/wepublish-insert-e2e.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wepublishPublisher } from "./wepublish";
import { gqlCall } from "./wepublish-gql";
import type { PublishRequest } from "../../core/publishers";

const RUN = process.env.SPLASH_WEPUBLISH_E2E === "1";
const ENDPOINT =
  process.env.SPLASH_WEPUBLISH_ENDPOINT ?? "http://localhost:4000/v1";
const EMAIL = process.env.SPLASH_WEPUBLISH_EMAIL ?? "";
const PASSWORD = process.env.SPLASH_WEPUBLISH_PASSWORD ?? "";

async function token(): Promise<string> {
  const r = await gqlCall({
    endpoint: ENDPOINT,
    query: `mutation L($email: String!, $password: String!) {
      createSession(email: $email, password: $password) { token }
    }`,
    variables: { email: EMAIL, password: PASSWORD },
    timeoutMs: 20000,
  });
  if (!r.ok) throw new Error(`login failed: ${r.message}`);
  return (r.value.data as { createSession: { token: string } }).createSession
    .token;
}

/**
 * A journalist's article, created through the SAME API a newsroom uses — a title block and two
 * paragraphs of prose. Deliberately NOT a Splash carrier: no marker, no `hidden`, real tags.
 */
async function journalistArticle(auth: string, slug: string) {
  const r = await gqlCall({
    endpoint: ENDPOINT,
    query: `mutation Create($title: String, $slug: String, $blocks: [BlockContentInput!]!) {
      createArticle(
        title: $title, slug: $slug, blocks: $blocks,
        hidden: false, shared: false, disableComments: false, breaking: false, hideAuthor: false,
        tagIds: [], authorIds: [], socialMediaAuthorIds: [], properties: []
      ) { id slug url }
    }`,
    variables: {
      title: "Annemasse, capitale du n'importe quoi",
      slug,
      blocks: [
        {
          title: {
            title: "Annemasse, capitale du n'importe quoi",
            lead: "Ce que révèlent les chiffres du budget",
          },
        },
        {
          richText: {
            richText: [
              {
                type: "paragraph",
                children: [{ text: "Les frontaliers de Bonneville…" }],
              },
            ],
          },
        },
        { html: { html: "<p>un encadré maison</p>" } },
      ],
    },
    token: auth,
    timeoutMs: 30000,
  });
  if (!r.ok) throw new Error(`fixture article failed: ${r.message}`);
  return (r.value.data as { createArticle: { id: string; url: string } })
    .createArticle;
}

async function readBack(auth: string, slug: string) {
  const r = await gqlCall({
    endpoint: ENDPOINT,
    query: `query Read($slug: String!) {
      article(slug: $slug) {
        id url hidden shared disableComments publishedAt
        draft {
          title lead hideAuthor breaking
          blocks {
            __typename
            ... on TitleBlock { title lead blockStyleName }
            ... on RichTextBlock { richText blockStyleName }
            ... on HTMLBlock { html blockStyleName }
            ... on YouTubeVideoBlock { videoID blockStyleName }
            ... on QuoteBlock { quote author blockStyleName }
            ... on IFrameBlock { url title width height blockStyleName }
            ... on ImageBlock { imageID caption blockStyleName }
          }
        }
      }
    }`,
    variables: { slug },
    token: auth,
    timeoutMs: 20000,
  });
  if (!r.ok) throw new Error(`read-back failed: ${r.message}`);
  return (r.value.data as { article: Record<string, any> }).article;
}

function request(
  slug: string,
  id: string,
  extra: Record<string, string> = {},
): PublishRequest {
  const dir = mkdtempSync(join(tmpdir(), "splash-insert-e2e-"));
  const artifact = join(dir, "interactive.html");
  writeFileSync(
    artifact,
    "<!doctype html><html><body><p>le visuel</p></body></html>",
  );
  return {
    artifactPath: artifact,
    id,
    format: "interactive",
    metadata: {
      title: "Le budget d'Annemasse",
      altText: "Répartition du budget",
      source: "Ville d'Annemasse",
      credit: "Splash",
      lang: "fr",
    },
    settings: { endpoint: ENDPOINT, targetArticleSlug: slug, ...extra },
    credentials: {
      SPLASH_WEPUBLISH_EMAIL: EMAIL,
      SPLASH_WEPUBLISH_PASSWORD: PASSWORD,
    },
    outDir: dir,
  } as PublishRequest;
}

test.skipIf(!RUN)(
  "LIVE: the visual is inserted into the journalist's article, and nothing else changes",
  async () => {
    const auth = await token();
    const slug = `annemasse-live-${Date.now()}`;
    const created = await journalistArticle(auth, slug);

    const before = await readBack(auth, slug);
    expect(before.draft.blocks).toHaveLength(3);

    const result = await wepublishPublisher.publish(request(slug, "budget"));
    if (!result.ok) throw new Error(`insertion refused: ${result.message}`);
    expect(result.value.url).toBe(created.url);

    const after = await readBack(auth, slug);

    // ① The visual is there, appended, and it is OURS.
    expect(after.draft.blocks).toHaveLength(4);
    expect(after.draft.blocks[3].__typename).toBe("HTMLBlock");
    expect(after.draft.blocks[3].html).toContain("iframe");

    // ② EVERY pre-existing block survived, in order and byte-for-byte. This is the assertion
    //    the whole total-round-trip design exists to make true: a real server, a real article.
    expect(after.draft.blocks[0]).toEqual(before.draft.blocks[0]);
    expect(after.draft.blocks[1]).toEqual(before.draft.blocks[1]);
    expect(after.draft.blocks[2]).toEqual(before.draft.blocks[2]);

    // ③ The article's own state is untouched — in particular `hidden`, which the CARRIER path
    //    sets to true. Applying the carrier's flags here would hide a journalist's piece.
    expect(after.hidden).toBe(false);
    expect(after.shared).toBe(before.shared);
    expect(after.disableComments).toBe(before.disableComments);
    expect(after.draft.title).toBe(before.draft.title);

    // ④ NOT PUBLISHED. Splash edits the draft; going live is the journalist's decision.
    expect(after.publishedAt ?? null).toBeNull();
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: a second delivery replaces our block in place instead of stacking a duplicate",
  async () => {
    const auth = await token();
    const slug = `annemasse-twice-${Date.now()}`;
    await journalistArticle(auth, slug);

    const first = await wepublishPublisher.publish(request(slug, "budget"));
    if (!first.ok) throw new Error(`first insertion refused: ${first.message}`);
    const second = await wepublishPublisher.publish(request(slug, "budget"));
    if (!second.ok)
      throw new Error(`second insertion refused: ${second.message}`);

    const after = await readBack(auth, slug);
    // Four, not five: the journalist's three plus ONE of ours.
    expect(after.draft.blocks).toHaveLength(4);
    const ours = after.draft.blocks.filter(
      (b: { __typename: string; html?: string }) =>
        b.__typename === "HTMLBlock" && (b.html ?? "").includes("iframe"),
    );
    expect(ours).toHaveLength(1);
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: an article holding an unmeasured block type is REFUSED, and left untouched",
  async () => {
    // The safety claim, against a real server: when Splash cannot echo a block, it does not
    // write a degraded article — it writes nothing.
    const auth = await token();
    const slug = `annemasse-quote-${Date.now()}`;
    const r = await gqlCall({
      endpoint: ENDPOINT,
      query: `mutation Create($slug: String!, $blocks: [BlockContentInput!]!) {
        createArticle(
          title: "Avec un sondage", slug: $slug, blocks: $blocks,
          hidden: false, shared: false, disableComments: false, breaking: false, hideAuthor: false,
          tagIds: [], authorIds: [], socialMediaAuthorIds: [], properties: []
        ) { id }
      }`,
      variables: {
        slug,
        blocks: [
          { title: { title: "Avec un sondage" } },
          // `listicle` is a real BlockContentInput key and is deliberately OUTSIDE the measured
          // table in wepublish-article.ts.
          { listicle: { items: [] } },
        ],
      },
      token: auth,
      timeoutMs: 30000,
    });
    if (!r.ok) throw new Error(`fixture failed: ${r.message}`);

    const before = await readBack(auth, slug);
    const result = await wepublishPublisher.publish(request(slug, "budget"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("ListicleBlock");

    // The article is exactly as it was — no partial write, no lost block.
    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toEqual(before.draft.blocks);
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: an article full of embeds, a poll and a styled block round-trips untouched",
  async () => {
    // The proof of the WIDENED table. The first pass covered 7 block types and refused the rest,
    // so a piece with a YouTube embed between two paragraphs — an ordinary piece — could not
    // receive a visual at all. These are the types the schema says round-trip by construction.
    const auth = await token();
    const slug = `annemasse-riche-${Date.now()}`;
    const r = await gqlCall({
      endpoint: ENDPOINT,
      query: `mutation Create($slug: String!, $blocks: [BlockContentInput!]!) {
        createArticle(
          title: "Un article ordinaire", slug: $slug, blocks: $blocks,
          hidden: false, shared: false, disableComments: false, breaking: false, hideAuthor: false,
          tagIds: [], authorIds: [], socialMediaAuthorIds: [], properties: []
        ) { id }
      }`,
      variables: {
        slug,
        blocks: [
          { title: { title: "Un article ordinaire" } },
          // blockStyleName is the field the hand-written table dropped on every block.
          {
            richText: {
              richText: [
                { type: "paragraph", children: [{ text: "Le contexte." }] },
              ],
              blockStyleName: "pull-quote",
            },
          },
          { youTubeVideo: { videoID: "dQw4w9WgXcQ" } },
          { quote: { quote: "On ne comprend rien", author: "Une élue" } },
          { embed: { url: "https://example.org/x", title: "Un embed", width: 640, height: 360 } },
        ],
      },
      token: auth,
      timeoutMs: 30000,
    });
    if (!r.ok) throw new Error(`fixture failed: ${r.message}`);

    const before = await readBack(auth, slug);
    const result = await wepublishPublisher.publish(request(slug, "budget"));
    if (!result.ok) throw new Error(`insertion refused: ${result.message}`);

    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toHaveLength(6);
    // Each of the five survives — including the styled one, whose style is the point.
    // Byte-for-byte, every one of the five — INCLUDING whatever the server chose to store for
    // `blockStyleName`. The fixture asks for "pull-quote" and this instance stores null, because
    // block styles are declared per project and an undeclared name is dropped at creation. That
    // is the server's business; what this asserts is that the round-trip returns exactly what it
    // was given, whatever that is. (The field's presence in the mapping is unit-tested — the
    // hand-written table omitted it entirely, which is the bug this whole table replaced.)
    for (let i = 0; i < 5; i++)
      expect(after.draft.blocks[i]).toEqual(before.draft.blocks[i]);
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: the visual lands where the journalist confirmed, not at the end",
  async () => {
    // Placement stops being advice here. The anchor suggest-article computes is shown to the
    // journalist, they confirm it, and THAT is what the write uses.
    const auth = await token();
    const slug = `annemasse-place-${Date.now()}`;
    await journalistArticle(auth, slug); // title, prose, an in-house HTML aside

    const result = await wepublishPublisher.publish(
      request(slug, "budget", { targetAfterBlock: "0" }),
    );
    if (!result.ok) throw new Error(`insertion refused: ${result.message}`);

    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toHaveLength(4);
    // Second, right after the title — not fourth.
    expect(after.draft.blocks[1].__typename).toBe("HTMLBlock");
    expect(after.draft.blocks[1].html).toContain("iframe");
    expect(after.draft.blocks[2].__typename).toBe("RichTextBlock");
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: a position the article no longer has is REFUSED, not clamped",
  async () => {
    const auth = await token();
    const slug = `annemasse-oob-${Date.now()}`;
    await journalistArticle(auth, slug);
    const before = await readBack(auth, slug);

    const result = await wepublishPublisher.publish(
      request(slug, "budget", { targetAfterBlock: "42" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("42");

    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toEqual(before.draft.blocks);
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: a static PNG is uploaded to the media server and inserted as an image block",
  async () => {
    // The path that did not exist. An image cannot travel as markup — the block that renders a
    // picture takes an `imageID` the media server issues — so this is the ONLY way what Splash
    // produces as a PNG reaches a journalist's article at all.
    const auth = await token();
    const slug = `annemasse-png-${Date.now()}`;
    await journalistArticle(auth, slug);

    // A real 1x1 PNG: bytes that are not valid UTF-8, which is the point.
    const dir = mkdtempSync(join(tmpdir(), "splash-png-e2e-"));
    const png = join(dir, "static.png");
    writeFileSync(
      png,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );

    const result = await wepublishPublisher.publish({
      artifactPath: png,
      id: "budget",
      format: "static",
      metadata: {
        title: "Le budget d'Annemasse",
        altText: "Répartition du budget par poste",
        source: "Ville d'Annemasse",
        credit: "Splash",
        lang: "fr",
      },
      settings: {
        endpoint: ENDPOINT,
        targetArticleSlug: slug,
        targetAfterBlock: "0",
      },
      credentials: {
        SPLASH_WEPUBLISH_EMAIL: EMAIL,
        SPLASH_WEPUBLISH_PASSWORD: PASSWORD,
      },
      outDir: dir,
    } as PublishRequest);
    if (!result.ok) throw new Error(`static insertion refused: ${result.message}`);

    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toHaveLength(4);
    const block = after.draft.blocks[1];
    // An IMAGE block, at the confirmed position, pointing at a real upload.
    expect(block.__typename).toBe("ImageBlock");
    expect(typeof block.imageID).toBe("string");
    expect(block.imageID.length).toBeGreaterThan(0);
    expect(block.caption).toBe("Le budget d'Annemasse");
    // And still a draft edit: nothing published.
    expect(after.publishedAt ?? null).toBeNull();
  },
  120000,
);

test.skipIf(!RUN)(
  "LIVE: a video is inserted as a player pointing at the hosted file",
  async () => {
    // The one format with no native home: no self-hosted mp4 block exists, so the article gets
    // an HTML block carrying a <video> element aimed at wherever the newsroom serves the file.
    const auth = await token();
    const slug = `annemasse-video-${Date.now()}`;
    await journalistArticle(auth, slug);

    const result = await wepublishPublisher.publish({
      artifactUrl: "https://splash.example.pages.dev/budget.mp4",
      id: "budget",
      format: "video",
      metadata: {
        title: "Le budget d'Annemasse",
        altText: "Répartition du budget",
        source: "Ville d'Annemasse",
        credit: "Splash",
        lang: "fr",
      },
      settings: {
        endpoint: ENDPOINT,
        targetArticleSlug: slug,
        targetAfterBlock: "1",
      },
      credentials: {
        SPLASH_WEPUBLISH_EMAIL: EMAIL,
        SPLASH_WEPUBLISH_PASSWORD: PASSWORD,
      },
      outDir: mkdtempSync(join(tmpdir(), "splash-video-e2e-")),
    } as PublishRequest);
    if (!result.ok) throw new Error(`video insertion refused: ${result.message}`);

    const after = await readBack(auth, slug);
    expect(after.draft.blocks).toHaveLength(4);
    const block = after.draft.blocks[2];
    expect(block.__typename).toBe("HTMLBlock");
    expect(block.html).toContain("<video");
    expect(block.html).toContain("budget.mp4");
    expect(after.publishedAt ?? null).toBeNull();
  },
  120000,
);
