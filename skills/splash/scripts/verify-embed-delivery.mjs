// LIVE proof of the embed delivery path — deliberately NOT in `bun run check`: it deploys to a
// real Cloudflare Pages project and a first deploy takes ~100s of edge provisioning. Same
// regime as verify-source-bundle.mjs. Run it by hand:
//   bun skills/splash/scripts/verify-embed-delivery.mjs
//
// No mocking, no fake Cloudflare server: this either reaches the real API and prints a URL
// that actually served the artifact (the adapter's own verifyServed already asserts the
// bytes match — a printed URL IS the proof, nothing here re-checks that), or it fails
// honestly, naming the missing credential.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lookupPublisher } from "../../../lib/core/publishers.ts";
import { decorEnv, installRoot } from "../../../lib/newsroom/decor.ts";
import "../../../lib/delivery/index.ts";

const root = mkdtempSync(join(tmpdir(), "splash-embed-live-"));
const artifact = join(root, "interactive.html");
writeFileSync(
  artifact,
  `<html><body><h1>splash delivery proof ${process.pid}</h1></body></html>`,
);
mkdirSync(join(root, "out"), { recursive: true });

const publisher = lookupPublisher("embed-cloudflare");
if (!publisher) {
  console.error(
    "FAILED: no publisher registered as \"embed-cloudflare\" — the delivery composition root did not load.",
  );
  process.exit(1);
}

// Same environment a real deliver() call judges against (see lib/newsroom/decor.ts's
// decorEnv): the install's own .env, with the process environment winning. Reading raw
// process.env alone would miss credentials that sit in .env but were never exported to
// this shell.
const result = await publisher.publish({
  artifactPath: artifact,
  id: `delivery-proof-${process.pid}`,
  metadata: {
    title: "Delivery proof",
    altText: "A page proving the embed path delivers real bytes",
    source: "Splash",
    credit: "",
    lang: "en",
    width: 700,
    height: 420,
  },
  settings: { publisherId: "embed-cloudflare" },
  credentials: decorEnv(installRoot()),
  outDir: join(root, "out"),
});

if (!result.ok) {
  console.error(`FAILED (${result.code}): ${result.message}`);
  process.exit(1);
}
console.log(`DELIVERED ${result.value.url}`);
console.log(result.value.snippet);
