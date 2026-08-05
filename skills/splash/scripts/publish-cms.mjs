// EXPORT (form d): insert a produced artifact INTO the journalist's own article, in the
// newsroom's CMS.
//
//   bun publish-cms.mjs <htmlFile> --article <slug> --results <report.json> --id <proposalId>
//
// The other three delivery forms hand the newsroom a file or a link and stop at the edge of
// its systems. This one reaches inside one — so it is the most gated of the four, and the two
// gates that matter are NOT in this file:
//
//   - the editorial gates (produced + render-approved + signed-off state) come from
//     export-guard.ts, exactly as deploy-embed.mjs applies them. A visual nobody has looked at
//     does not get written into an article;
//   - the destruction gates come from the ADAPTER (lib/delivery/adapters/wepublish.ts and its
//     total round-trip): the article must exist, every one of its blocks must round-trip, and
//     the write is a DRAFT edit that never publishes.
//
// What this file owns is the seam: it turns an export folder into a PublishRequest, calls the
// one measured adapter rather than re-implementing the protocol, and records the delivery as
// the file assertDelivered demands. It publishes NOTHING itself.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertEditoriallyCleared,
  assertShippable,
} from "../src/export-guard.ts";
import { wepublishPublisher } from "../../../lib/delivery/adapters/wepublish.ts";
import { readDecorState } from "../../../lib/newsroom/decor.ts";
import { resolveProfile } from "../src/resolve-profile.ts";
import { cmsDeliveryStatus } from "../src/preflight.ts";

const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SELF), "../../..");

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
      a === "--article" ||
      a === "--after" ||
      a === "--url" ||
      a === "--results" ||
      a === "--id"
    )
      flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { positional, flags };
}

function die(message) {
  console.error(message);
  process.exit(1);
}

export function cmsSettings(root = ROOT) {
  const capability = readDecorState(root).capabilities?.["embed-cms"] ?? {};
  return { ...(capability.settings ?? {}) };
}

/**
 * The credentials, read from the environment the newsroom saved them in. Deliberately NOT
 * assembled from ambient state inside the adapter — the publisher contract's rule (I5) is that
 * the CALLER resolves credentials, and the adapter never reads the environment itself.
 */
function credentials(env = process.env) {
  return {
    SPLASH_WEPUBLISH_EMAIL: env.SPLASH_WEPUBLISH_EMAIL ?? "",
    SPLASH_WEPUBLISH_PASSWORD: env.SPLASH_WEPUBLISH_PASSWORD ?? "",
  };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const artifact = positional[0];
  if (!artifact || !flags.article || !flags.results || !flags.id)
    die(
      "usage: publish-cms.mjs <htmlFile> --article <slug> --results <report.json> --id <proposalId>",
    );

  // A placeholder that reached the command line means the orchestrator relayed the proposal's
  // template without ever asking the journalist which article. That is the same class as
  // choosing a delivery form for them, and it would write into an article named "<slug>".
  if (/^<.*>$/.test(flags.article))
    die(
      `publish-cms: --article is still the proposal's placeholder (${flags.article}). ` +
        `Ask the journalist WHICH article the visual belongs in, and pass its slug — never invent one.`,
    );

  // The position, when the journalist gave one. "end" is a real answer (append) and is spelled
  // out rather than expressed as an absent flag, so a forgotten --after cannot pass for a
  // deliberate "at the end". Anything else must be an integer index, -1 meaning "before
  // everything": a non-numeric answer is a misunderstanding, not a position.
  // REQUIRED, like --article. An absent position is not "append": it is nobody having been
  // asked. This door is the load-bearing one — export-code refuses earlier for a better message,
  // but publish-cms is also callable directly, and a direct call must not be able to drop a
  // visual into a journalist's article at a position they never saw.
  if (flags.after === undefined)
    die(
      `publish-cms: --after is required — SHOW the journalist where the visual would go and pass the position they confirmed ` +
        `(a block index, -1 for before everything, or "end"). Appending because nobody said otherwise is deciding for them.`,
    );
  let afterIndex;
  if (flags.after !== "end") {
    if (!/^-?\d+$/.test(flags.after))
      die(
        `publish-cms: --after takes a block index, or "end" — got ${JSON.stringify(flags.after)}. ` +
          `Ask the journalist WHERE the visual goes and pass the position they confirmed.`,
      );
    afterIndex = Number(flags.after);
  }

  const status = cmsDeliveryStatus({ endpoint: cmsSettings().endpoint });
  if (!status.ready)
    die(
      `publish-cms: the CMS route is not configured — ${status.reason}. ` +
        `Collect the missing value(s) (save a credential with save-key.mjs; the endpoint belongs in newsroom.json), or deliver the visual as a hosted link instead.`,
    );

  const report = JSON.parse(readFileSync(resolve(flags.results), "utf8"));
  // The same two editorial gates deploy-embed.mjs applies, in the same order, from the same
  // module — a delivery that reaches into the newsroom's CMS may not be the lenient one. The
  // sign-off is checked against the artifact's CURRENT bytes, so a visual edited after being
  // signed off is unsigned again.
  assertShippable(report, flags.id);
  const artifactPath = resolve(artifact);
  const bytes = readFileSync(artifactPath);
  const { signedBy, unsigned } = assertEditoriallyCleared(
    report,
    flags.id,
    resolveProfile(flags),
    bytes,
  );
  console.log(
    unsigned
      ? "EDITORIAL: unsigned — LLM render-approval only"
      : `EDITORIAL: signed by ${signedBy.join(", ")}`,
  );

  const entry = report.results.find((r) => r.id === flags.id);
  // A VIDEO travels as an ADDRESS, not as bytes: this CMS has no self-hosted mp4 block, so the
  // file is published to the newsroom's own hosting first and the article gets a player aimed at
  // it. Every other format ships its own bytes. `artifactPath` stays the SIGNED artifact either
  // way — the sign-off above is verified against the real file, never against a URL.
  const hosted = flags.url !== undefined;
  const result = await wepublishPublisher.publish({
    ...(hosted ? { artifactUrl: flags.url } : { artifactPath }),
    id: flags.id,
    format: entry?.format ?? "interactive",
    metadata: entry?.metadata ?? { title: flags.id, lang: "fr" },
    settings: {
      ...cmsSettings(),
      targetArticleSlug: flags.article,
      ...(afterIndex === undefined ? {} : { targetAfterBlock: String(afterIndex) }),
    },
    credentials: credentials(),
    outDir: dirname(resolve(artifact)),
  });

  // A refusal is surfaced whole and exits non-zero: §6 forbids working around a ship script's
  // refusal, and the adapter's messages already name the cause and the way out.
  if (!result.ok) die(`publish-cms: ${result.message}`);

  const exportDir = dirname(resolve(artifact));
  mkdirSync(exportDir, { recursive: true });
  writeFileSync(join(exportDir, "CMS_ARTICLE_URL.txt"), `${result.value.url}\n`);
  console.log(`CMS_ARTICLE_URL ${result.value.url}`);
  // Said plainly, because it is the one thing a journalist could otherwise get wrong: the
  // visual is in the DRAFT. Nobody reading the site can see it until they publish.
  console.log(
    `CMS_DRAFT_ONLY the visual was added to the draft of "${flags.article}" — it goes live when you publish that article yourself`,
  );
}

if (import.meta.main) await main();
