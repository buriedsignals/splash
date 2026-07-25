// The adapter's CONFIG-only refusals — everything it can answer without a network, and
// therefore everything it must answer BEFORE it uploads anything. The protocol itself is
// proven live (docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md);
// no request is mocked here, none is made.
import { describe, it, expect } from "bun:test";
import { cloudflarePublisher } from "./cloudflare-pages";
import type { PublishRequest } from "../../core/publishers";

function request(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: import.meta.path,
    id: "primes",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "embed-cloudflare" },
    credentials: {},
    outDir: "/nonexistent",
    ...overrides,
  };
}

describe("the cloudflare adapter's pre-flight", () => {
  // The snippet used to be rendered AFTER deployDirectory + verifyServed, yet its refusals
  // (an unfillable placeholder; a responsive sizing rule colliding with a template that still
  // demands {height}) depend only on decor config — knowable before a single byte moves. A
  // misconfigured template therefore deployed for real, verified the served bytes, and THEN
  // answered invalid-request: nothing recorded, nextActions saying "deliver" again, the same
  // irreversible deploy repeating forever. Validated up front now, exactly as zip.ts does.
  it("refuses a template carrying a placeholder it cannot fill, before any I/O", async () => {
    const r = await cloudflarePublisher.publish(
      request({
        settings: {
          publisherId: "embed-cloudflare",
          snippetTemplate: '<iframe src="{url}" data-campaign="{utm_source}">',
        },
      }),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("{utm_source}");
  });

  it("refuses a responsive sizing rule colliding with a fixed-height template, before any I/O", async () => {
    const r = await cloudflarePublisher.publish(
      request({
        metadata: { ...request().metadata, height: "responsive" },
        settings: {
          publisherId: "embed-cloudflare",
          snippetTemplate: '<iframe src="{url}" height="{height}"></iframe>',
        },
      }),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("responsive");
  });

  it("still refuses missing credentials when the template is fine", async () => {
    const r = await cloudflarePublisher.publish(request());
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain(
      "CLOUDFLARE_API_TOKEN",
    );
  });
});
