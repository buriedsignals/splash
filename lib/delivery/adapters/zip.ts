// The portable package publisher — the universal fallback, and the reason there is only ONE
// delivery path: it "publishes" to disk. It needs no key, so the decor always reports it ready.
//
// The archive wraps the artifact AS THE ENGINES PRODUCE IT (a self-contained index.html). The
// spec records this as a deliberate partial answer to issue #4's "clean separate files": a
// non-inlined build would touch every producer and create a second artifact shape to keep
// green. See the spec §2 decision 8.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import {
  type DeliveryMetadata,
  type Publisher,
  type PublishOutcome,
  type PublishRequest,
} from "../../core/publishers";
import { isSafeId, unsafeIdMessage } from "../../core/id-safety";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";

// The ZIP epoch floor, as a Date rather than 0: the archive's bytes must not depend on the
// clock, or the golden determinism test becomes a clock test. A Date object also avoids any
// falsy-zero handling inside the encoder.
//
// Noon UTC, not midnight: fflate reads the DOS date fields off `Date#getFullYear()`, which is
// LOCAL time, and rejects any year outside 1980-2099 (err code 10). Midnight UTC on the epoch
// floor rolls back to 1979 in every negative-UTC-offset zone — all of the Americas — so a
// journalist running this on a laptop set to e.g. America/Mexico_City would crash inside the
// encoder on every publish. Noon UTC survives the full real-world offset range (UTC-12..+14)
// without crossing into 1979 or 1981.
const FIXED_MTIME = new Date(Date.UTC(1980, 0, 1, 12, 0, 0));
// Same reason the mtime is pinned: the recorded publication instant must not vary between two
// otherwise identical runs, which is what makes an archive reproducible end to end.
const FIXED_PUBLISHED_AT = FIXED_MTIME.toISOString();

export function zipReadme(
  m: DeliveryMetadata,
  id: string,
  snippet: string,
): string {
  return [
    `# ${m.title}`,
    "",
    m.altText,
    "",
    "## How to integrate",
    "",
    "1. Upload `index.html` anywhere your newsroom serves static files.",
    "2. Paste the snippet below into your article, replacing the URL with where you uploaded it.",
    "",
    "```html",
    snippet,
    "```",
    "",
    `Source: ${m.source}`,
    m.credit ? `Credit: ${m.credit}` : "",
    `Identifier: ${id}`,
    "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}

async function publish(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  // Same class as render.ts:42 and image-native's frame-id guard: the archive path below is
  // built directly from req.id (`${req.id}.zip`), and PublishRequest's own comment ("checked
  // before any path resolution") is a promise the publish VERB never actually keeps — probing
  // proved an id of "../../evil" writes the archive two directories above outDir. Refused here,
  // before any I/O, since this adapter is the one that resolves the path.
  if (!isSafeId(req.id))
    return fail("invalid-request", unsafeIdMessage(req.id));

  // The URL is unknown for an owned package — the newsroom decides where it lands — so the
  // snippet carries the documented placeholder the README tells them to replace.
  const snippet = renderSnippet({
    url: "YOUR-URL-HERE",
    id: req.id,
    metadata: req.metadata,
  });
  if (!snippet.ok) return snippet;

  let artifact: Uint8Array;
  try {
    artifact = new Uint8Array(readFileSync(req.artifactPath));
  } catch (e) {
    return fail(
      "engine-failed",
      `zip: cannot read the artifact ${req.artifactPath}: ${(e as Error).message}`,
    );
  }

  const metadata = { ...req.metadata, id: req.id };
  const opts = { mtime: FIXED_MTIME };
  let archive: Uint8Array;
  try {
    archive = zipSync(
      {
        "index.html": [artifact, opts],
        "EMBED.txt": [strToU8(snippet.value + "\n"), opts],
        "README.md": [
          strToU8(zipReadme(req.metadata, req.id, snippet.value)),
          opts,
        ],
        "metadata.json": [
          strToU8(JSON.stringify(metadata, null, 2) + "\n"),
          opts,
        ],
      },
      { level: 6 },
    );
  } catch (e) {
    // A publisher never throws (I1) — the encoder itself is not I/O, but it CAN throw (proven:
    // fflate rejects mtimes outside 1980-2099, which a local-time date conversion can produce),
    // so it gets the same bounded-failure treatment as the filesystem calls around it.
    return fail(
      "engine-failed",
      `zip: cannot encode the archive: ${(e as Error).message}`,
    );
  }

  const path = join(req.outDir, `${req.id}.zip`);
  try {
    writeFileSync(path, archive);
  } catch (e) {
    return fail(
      "engine-failed",
      `zip: cannot write the archive ${path}: ${(e as Error).message}`,
    );
  }
  return ok({
    publisherId: "zip",
    kind: "package",
    url: undefined,
    path,
    snippet: snippet.value,
    publishedAt: FIXED_PUBLISHED_AT,
  });
}

export const zipPublisher: Publisher = {
  id: "zip",
  kind: "package",
  implemented: true,
  publish,
};
