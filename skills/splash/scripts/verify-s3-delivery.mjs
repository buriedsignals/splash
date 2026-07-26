// LIVE proof of the s3 delivery path — deliberately NOT in `bun run check`: it needs a real
// S3-compatible endpoint (e.g. a local MinIO server) and real credentials, neither of which
// exist in the gate's environment. Same regime as verify-embed-delivery.mjs. Run it by hand:
//   SPLASH_S3_ENDPOINT=... SPLASH_S3_REGION=... SPLASH_S3_BUCKET=... \
//   SPLASH_S3_PUBLIC_BASE_URL=... SPLASH_S3_ACCESS_KEY_ID=... SPLASH_S3_SECRET_ACCESS_KEY=... \
//   bun skills/splash/scripts/verify-s3-delivery.mjs
//
// No mocking, no fake S3 server: this either reaches the real endpoint and prints a URL that
// actually served the artifact (the adapter's own anonymous-GET verification already asserts
// the bytes match — a printed URL IS the proof, nothing here re-checks that), or it fails
// honestly, naming the missing setting/credential or the refusal the adapter returned.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lookupPublisher } from "../../../lib/core/publishers.ts";
import "../../../lib/delivery/index.ts";

// Named individually — never a blanket copy of the environment — and missing ones are
// reported by NAME, never by value, matching the discipline the adapter itself follows for
// credentials.
const REQUIRED_VARS = [
  "SPLASH_S3_ENDPOINT",
  "SPLASH_S3_REGION",
  "SPLASH_S3_BUCKET",
  "SPLASH_S3_PUBLIC_BASE_URL",
  "SPLASH_S3_ACCESS_KEY_ID",
  "SPLASH_S3_SECRET_ACCESS_KEY",
];

const missing = REQUIRED_VARS.filter((name) => !(process.env[name] ?? "").trim());
if (missing.length > 0) {
  console.error(`FAILED: missing environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const root = mkdtempSync(join(tmpdir(), "splash-s3-live-"));
const artifact = join(root, "interactive.html");
writeFileSync(
  artifact,
  `<html><body><h1>splash s3 delivery proof ${process.pid}</h1></body></html>`,
);
mkdirSync(join(root, "out"), { recursive: true });

const publisher = lookupPublisher("embed-s3");
if (!publisher) {
  console.error(
    'FAILED: no publisher registered as "embed-s3" — the delivery composition root did not load.',
  );
  process.exit(1);
}

const result = await publisher.publish({
  artifactPath: artifact,
  id: `s3-delivery-proof-${process.pid}`,
  format: "interactive",
  metadata: {
    title: "S3 delivery proof",
    altText: "A page proving the s3 embed path delivers real bytes",
    source: "Splash",
    credit: "",
    lang: "en",
    width: 700,
    height: 420,
  },
  settings: {
    publisherId: "embed-s3",
    endpoint: process.env.SPLASH_S3_ENDPOINT,
    region: process.env.SPLASH_S3_REGION,
    bucket: process.env.SPLASH_S3_BUCKET,
    publicBaseUrl: process.env.SPLASH_S3_PUBLIC_BASE_URL,
    ...(process.env.SPLASH_S3_PREFIX ? { prefix: process.env.SPLASH_S3_PREFIX } : {}),
  },
  credentials: {
    SPLASH_S3_ACCESS_KEY_ID: process.env.SPLASH_S3_ACCESS_KEY_ID,
    SPLASH_S3_SECRET_ACCESS_KEY: process.env.SPLASH_S3_SECRET_ACCESS_KEY,
  },
  outDir: join(root, "out"),
});

if (!result.ok) {
  console.error(`FAILED (${result.code}): ${result.message}`);
  process.exit(1);
}
console.log(`DELIVERED ${result.value.url}`);
console.log(result.value.snippet);
