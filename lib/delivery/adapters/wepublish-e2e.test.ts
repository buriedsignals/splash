// Opt-in LIVE proof: a real interactive artifact, produced by the loop, published to a real
// We.Publish instance, then READ BACK ANONYMOUSLY.
//
// The fixture is forbidden here and that is the point. This project's own lesson: the
// Cloudflare and S3 live proofs used a `.html` fixture, so "every artifact served as
// text/html" survived a live check. A proof that does not start at produce() proves nothing
// about the real path.
//
// ── Standing the instance up ───────────────────────────────────────────────────────────────
// Three real obstacles, all measured on 2026-07-27 (spec §2 has the detail):
//
//   git clone --depth 1 https://github.com/wepublish/wepublish.git ~/wepublish-l3
//
//   1. The clone must live under a path the container runtime's VM actually mounts. Colima
//      mounts only $HOME: from /private/tmp, Docker silently substitutes an empty DIRECTORY
//      for the config bind-mount and the API dies on `EISDIR ... read /config.yaml`.
//   2. docker/migrate_start.js rewrites the DB port 5432 -> 5433 because production fronts
//      Postgres with PgBouncer. The compose stack has none, so migrations fail until
//      DIRECT_DATABASE_URL is set explicitly, e.g. in a docker-compose.override.yml:
//        services: { migration: { environment: {
//          DIRECT_DATABASE_URL: postgresql://postgres@database:5432/wepublish?schema=public } } }
//   3. The seed does NOT create the README's dev@wepublish.ch / 123. It creates
//      admin@wepublish.ch with a RANDOM password printed once:
//        docker compose logs migration | grep "Bootstrapped initial admin user"
//
//   docker compose up -d database migration api    # images are amd64; emulated, ~90s to ready
//
// Then run this file — the endpoint is /v1, never /graphql:
//
//   SPLASH_WEPUBLISH_E2E=1 \
//     SPLASH_WEPUBLISH_ENDPOINT=http://localhost:4000/v1 \
//     SPLASH_WEPUBLISH_EMAIL=admin@wepublish.ch \
//     SPLASH_WEPUBLISH_PASSWORD='<the bootstrapped password>' \
//     bun test lib/delivery/adapters/wepublish-e2e.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../index";
import "../../loop/engines";
import { propose } from "../../loop/propose";
import { produce } from "../../loop/produce";
import { deliver } from "../../loop/deliver";
import { requestDelivery } from "../../loop/request-delivery";
import {
  provenanceHash,
  type RunManifest,
  type RunElement,
  fileArtifact,
} from "../../loop/manifest";
import { freezeInput } from "../../loop/freeze";
import { neutralDecor, type Decor } from "../../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../../newsroom/state";
import { carrierSlug, carriesMarker } from "./wepublish-block";
import { gqlCall } from "./wepublish-gql";

const RUN = process.env.SPLASH_WEPUBLISH_E2E === "1";
const ENDPOINT =
  process.env.SPLASH_WEPUBLISH_ENDPOINT ?? "http://localhost:4000/v1";

// A run built through the SAME seam every other loop test uses (freezeInput -> propose ->
// choose -> produce). `channel: "article-web"` is what makes this an INTERACTIVE proof: it is
// the only channel whose allowedFormats include interactive (lib/core/channel-policy.ts), and
// interactive is the genre embed-cms actually serves.
async function producedInteractiveRun(): Promise<{
  run: RunManifest;
  el: RunElement;
  runDir: string;
  decor: Decor;
}> {
  const runDir = mkdtempSync(join(tmpdir(), "loop-wp-e2e-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "wp-e2e",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "primes",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
        requestedFormat: "interactive",
      },
    ],
    events: [],
  };
  const el = run.elements[0]!;

  const { options } = propose(run, el);
  const interactive = options.find((o) => o.format === "interactive");
  if (!interactive)
    throw new Error(
      "producedInteractiveRun: the offer for article-web + requestedFormat:interactive must contain an interactive row",
    );
  el.proposal = { options, excluded: [], chosenId: interactive.id };

  const produced = await produce(run, el, runDir);
  if (!produced.ok)
    throw new Error(
      `producedInteractiveRun: produce() refused: ${produced.message}`,
    );

  // Publishing is gated on an approval covering these exact bytes (lib/loop/deliver.ts), and
  // a real approval needs a review whose PREVIEW was captured from a browser — the verify
  // layer. This file's subject is the We.Publish adapter, not the sign-off ceremony, so the
  // record is set the way lib/loop/acceptance-deliver.test.ts sets it for the same reason: the
  // ceremony that WRITES it is driven for real in lib/loop/approve.test.ts and, end to end
  // through spawned CLI calls, in lib/host/journey.test.ts.
  //
  // The hash is COMPUTED, never invented: a fabricated one would be rejected by deliver() and
  // would prove nothing about the adapter behind it.
  const runAfterProduce: RunManifest = { ...run, elements: [produced.value] };
  const approvedEl: RunElement = {
    ...produced.value,
    approved: {
      signoffPath: `signoffs/${produced.value.id}.json`,
      approvedProvenanceHash: provenanceHash(runAfterProduce, produced.value),
    },
  };

  const decor: Decor = {
    ...neutralDecor(),
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: {
        "embed-cms": { enabled: true, settings: { endpoint: ENDPOINT } },
      },
    },
  };

  return {
    run: { ...run, elements: [approvedEl] },
    el: approvedEl,
    runDir,
    decor,
  };
}

test.skipIf(!RUN)(
  "a produced interactive visual is published into a real We.Publish article and served back",
  async () => {
    const { run, el, runDir, decor } = await producedInteractiveRun();

    const asked = requestDelivery(run, el, decor, {
      destinations: ["embed-cms"],
      env: process.env,
    });
    expect(asked.ok).toBe(true);

    const delivered = await deliver(
      run,
      (asked as { value: RunElement }).value,
      runDir,
      decor,
      {},
      { env: process.env },
    );
    if (!delivered.ok)
      throw new Error(
        `deliver() refused: ${(delivered as { message: string }).message}`,
      );

    const record = (delivered as { value: RunElement }).value.delivery!
      .delivered[0]!;
    expect(record.publisherId).toBe("embed-cms");
    expect(record.kind).toBe("hosted");
    expect(record.url).toBeDefined();
    // §4.4 — the visual IS in the CMS; there is nothing to paste, and an empty string would
    // have been a false claim rather than an absent one.
    expect(record.snippet).toBeUndefined();

    // Now prove it independently of the adapter's own verification: read the published
    // revision back ANONYMOUSLY, exactly as a reader's site would.
    const slug = carrierSlug("splash-", el.id);
    const back = await gqlCall({
      endpoint: ENDPOINT,
      query: `query ($slug: String!) {
        article(slug: $slug) {
          id url publishedAt
          published { blocks { __typename ... on HTMLBlock { html } } }
        }
      }`,
      variables: { slug },
    });
    expect(back.ok).toBe(true);

    const article = (back as { value: { data: Record<string, unknown> } }).value
      .data.article as {
      url?: string;
      publishedAt?: string;
      published?: { blocks?: { __typename?: string; html?: string }[] };
    };
    expect(article.publishedAt).toBeTruthy();
    expect(article.url).toBe(record.url);

    const block = article.published?.blocks?.find(
      (b) => b.__typename === "HTMLBlock",
    );
    expect(block).toBeDefined();
    const html = block!.html!;

    // It is Splash's carrier, and it carries THIS element.
    expect(carriesMarker(html, el.id)).toBe(true);

    // The artifact itself round-tripped: the produced bytes are recoverable from what the CMS
    // serves. This is the check with real value — "an article exists" is not "the visual is
    // there", the same way "upload succeeded" was never "the embed works".
    const artifact = readFileSync(
      join(runDir, fileArtifact(el.artifact)!.path),
      "utf8",
    );
    const srcdocStart = html.indexOf('srcdoc="') + 'srcdoc="'.length;
    const srcdocEnd = html.indexOf('"', srcdocStart);
    const recovered = html
      .slice(srcdocStart, srcdocEnd)
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    expect(recovered).toBe(artifact);
  },
  900_000,
);
