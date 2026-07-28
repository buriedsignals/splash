// The hand-over of an ALREADY PUBLISHED embed.
//
// Every other publisher takes bytes somewhere: zip archives them, s3 and cloudflare upload them,
// wepublish posts them into a CMS. A Datawrapper interactive has none — it is live on
// Datawrapper's own CDN and the URL is the whole deliverable. This adapter is what "delivery" means
// for it: prove the address still answers, compose the embed code the newsroom pastes, and record
// the hand-over.
//
// `globalThis.fetch` is replaced here (no real network, the same discipline s3.test.ts follows);
// the live round trip is in the gated Datawrapper proofs.
import { test, expect, afterEach } from "bun:test";
import { hostedEmbedPublisher } from "./hosted-embed";
import type { DeliveryMetadata, PublishRequest } from "../../core/publishers";

const URL_V1 = "https://datawrapper.dwcdn.net/AbCdE/1/";

const METADATA: DeliveryMetadata = {
  title: "Basel recycles more of its waste than any other Swiss city",
  altText: "A ranking of four Swiss cities, Basel highest at 54 percent",
  source: "Federal Statistical Office",
  credit: "Heidi.news",
  lang: "fr",
  width: 700,
  height: 420,
};

function request(over: Partial<PublishRequest> = {}): PublishRequest {
  return {
    id: "e1",
    format: "interactive",
    metadata: METADATA,
    settings: { publisherId: "embed-hosted" },
    credentials: {},
    outDir: "/tmp/splash-hosted-embed",
    artifactUrl: URL_V1,
    ...over,
  } as PublishRequest;
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("it hands over the address and the embed code, once the address has answered", async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (
    u: string | URL,
    _i?: RequestInit,
  ): Promise<Response> => {
    asked.push(String(u));
    return new Response("<html>a chart</html>", { status: 200 });
  }) as typeof fetch;

  const r = await hostedEmbedPublisher.publish(request());
  expect(r.ok ? "published" : `${r.code}: ${r.message}`).toBe("published");
  if (!r.ok) return;
  // The address was actually fetched — a hand-over of a dead embed is not a delivery.
  expect(asked).toEqual([URL_V1]);
  expect(r.value.kind).toBe("hosted");
  expect(r.value.url).toBe(URL_V1);
  // Nothing landed on disk, and the record must not claim otherwise.
  expect(r.value.path).toBeUndefined();
  expect(r.value.snippet).toContain(`src="${URL_V1}"`);
  expect(r.value.snippet).toContain("iframe");
});

test("a newsroom's own embed template is honoured", async () => {
  globalThis.fetch = (async (
    _u: string | URL,
    _i?: RequestInit,
  ): Promise<Response> =>
    new Response("<html>a chart</html>", { status: 200 })) as typeof fetch;
  const r = await hostedEmbedPublisher.publish(
    request({
      settings: {
        publisherId: "embed-hosted",
        snippetTemplate: '<div class="embed" data-src="{url}">{title}</div>',
      },
    }),
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.snippet).toBe(
    `<div class="embed" data-src="${URL_V1}">Basel recycles more of its waste than any other Swiss city</div>`,
  );
});

test("an address that no longer answers is refused, and nothing is recorded", async () => {
  globalThis.fetch = (async (
    _u: string | URL,
    _i?: RequestInit,
  ): Promise<Response> =>
    new Response("gone", { status: 404 })) as typeof fetch;
  const r = await hostedEmbedPublisher.publish(request());
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("engine-failed");
  expect(r.message).toContain("404");
  expect(r.message).toContain(URL_V1);
});

test("a request carrying no address at all is refused before any call goes out", async () => {
  let called = false;
  globalThis.fetch = (async (
    _u: string | URL,
    _i?: RequestInit,
  ): Promise<Response> => {
    called = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;
  const r = await hostedEmbedPublisher.publish(
    request({
      artifactUrl: undefined,
      artifactPath: "/tmp/e1/interactive.html",
    }),
  );
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(called).toBe(false);
});

// The adapter declares what it can take and what it can carry, and lib/loop/deliver.ts reads BOTH
// before the verb runs — so a PNG never reaches a publisher that can only forward a link, and an
// embed never reaches one that can only ship bytes.
test("it declares itself as a hosted-source, embed-genre destination", () => {
  expect(hostedEmbedPublisher.sources).toEqual(["hosted"]);
  expect(hostedEmbedPublisher.serves).toEqual(["interactive", "scrolly"]);
  expect(hostedEmbedPublisher.kind).toBe("hosted");
  expect(hostedEmbedPublisher.implemented).toBe(true);
});
