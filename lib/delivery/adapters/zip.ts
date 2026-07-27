// The portable package publisher — the universal fallback, and the reason there is only ONE
// delivery path: it "publishes" to disk. It needs no key, so the decor always reports it ready.
//
// The archive wraps the artifact AS THE ENGINES PRODUCE IT (a self-contained index.html). The
// spec records this as a deliberate partial answer to issue #4's "clean separate files": a
// non-inlined build would touch every producer and create a second artifact shape to keep
// green. See the spec §2 decision 8.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8, type Zippable } from "fflate";
import {
  artifactMediaFor,
  deliveryGenreFor,
  type DeliveryMetadata,
  type Publisher,
  type PublishOutcome,
  type PublishRequest,
} from "../../core/publishers";
import { isSafeId, unsafeIdMessage } from "../../core/id-safety";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";
import { VISUAL_FORMATS, type VisualFormat } from "../../core/vocabulary";

// The ZIP epoch floor, as a Date rather than 0: the archive's bytes must not depend on the
// clock, or the golden determinism test becomes a clock test. A Date object also avoids any
// falsy-zero handling inside the encoder.
//
// LOCAL-time constructor, deliberately — NOT `Date.UTC(...)`. fflate's DOS-time encoder reads
// getFullYear()/getMonth()/getDate()/getHours()/getMinutes()/getSeconds(), which are all
// LOCAL-time getters. Building the Date from a fixed UTC INSTANT (`Date.UTC(1980, 0, 1, 12, 0,
// 0)`) means those getters return different local components on machines in different
// timezones — the archive is then reproducible per-machine, not reproducible: measured four
// different byte streams for UTC / Mexico City / Tokyo / Kiritimati (+14) on that instant. The
// local-time constructor `new Date(1980, 0, 1, 12, 0, 0)` instead pins the LOCAL COMPONENTS
// themselves — every timezone's getFullYear()/getMonth()/… returns exactly 1980/0/1/12/0/0,
// which is what the encoder reads, so the encoded bytes are identical everywhere. Do not "fix"
// this back to `Date.UTC` — that reintroduces the cross-machine drift this comment exists to
// prevent. Noon (not midnight) still matters for the reason it always did: fflate rejects a
// year outside 1980-2099 (err code 10), and with the local-time constructor the year is now
// pinned outright (1980 everywhere) — the noon choice is belt-and-braces against any future
// change that reintroduces a UTC-instant-derived Date.
const FIXED_MTIME = new Date(1980, 0, 1, 12, 0, 0);
// Deliberately a literal, not `FIXED_MTIME.toISOString()`: that conversion goes back through
// the instant, which — per the comment above — differs by machine for a local-time Date. This
// string is the one piece of output that is genuinely fixed everywhere, independent of TZ.
const FIXED_PUBLISHED_AT = "1980-01-01T12:00:00.000Z";

export function zipReadme(
  m: DeliveryMetadata,
  id: string,
  snippet: string,
  entryName: string,
): string {
  return [
    `# ${m.title}`,
    "",
    m.altText,
    "",
    "## How to integrate",
    "",
    `1. Upload \`${entryName}\` anywhere your newsroom serves static files.`,
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

// The file genre's README. It never mentions hosting or an embed code: the CMS has a native
// image/video field, with its own alternative-text field next to it. Splash cannot fill that
// field — handing the text over is the whole a11y answer here (spec §2).
export function filePackageReadme(
  m: DeliveryMetadata,
  id: string,
  entryName: string,
  format: VisualFormat,
): string {
  const field = format === "video" ? "video" : "image";
  return [
    `# ${m.title}`,
    "",
    m.altText,
    "",
    "## How to integrate",
    "",
    `1. Upload \`${entryName}\` through your CMS's ${field} field.`,
    "2. Paste the text from `ALT.txt` into the alternative-text field next to it — that is what",
    "   a screen reader announces, and Splash cannot put it there for you.",
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

  const genre = deliveryGenreFor(req.format);
  // The archive entry follows the artifact's REAL format (artifactMediaFor, shared with s3.ts
  // and cloudflare-pages.ts) — an "index.html" entry only makes sense when the artifact is
  // actually HTML; a static PNG or an mp4 archived under that name used to be silently wrong.
  const entryName = `index.${artifactMediaFor(req.format).extension}`;

  // The embed genre keeps its snippet — and the newsroom's own template still applies to it,
  // exactly as before (§3.3 of the delivery-publishers spec). The file genre has no snippet
  // at all, so nothing is rendered and nothing can refuse.
  //
  // The URL is unknown for an owned package — the newsroom decides where it lands — so the
  // snippet carries the documented placeholder the README tells them to replace.
  let snippetValue: string | undefined;
  if (genre === "embed") {
    const snippet = renderSnippet({
      url: "YOUR-URL-HERE",
      id: req.id,
      metadata: req.metadata,
      format: req.format,
      ...(req.settings.snippetTemplate
        ? { template: req.settings.snippetTemplate }
        : {}),
    });
    if (!snippet.ok) return snippet;
    snippetValue = snippet.value;
  }

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

  // Annotated with fflate's own `Zippable` — not a homegrown shape — because without a target
  // type here (the ternary sits in its own statement, not directly inside the zipSync() call)
  // TS widens each `[artifact, opts]` pair to a plain array and rejects it against ZippableFile's
  // tuple member.
  const files: Zippable =
    genre === "embed"
      ? {
          [entryName]: [artifact, opts],
          "EMBED.txt": [strToU8(snippetValue! + "\n"), opts],
          "README.md": [
            strToU8(zipReadme(req.metadata, req.id, snippetValue!, entryName)),
            opts,
          ],
          "metadata.json": [
            strToU8(JSON.stringify(metadata, null, 2) + "\n"),
            opts,
          ],
        }
      : {
          [entryName]: [artifact, opts],
          "ALT.txt": [strToU8(req.metadata.altText + "\n"), opts],
          "README.md": [
            strToU8(
              filePackageReadme(req.metadata, req.id, entryName, req.format),
            ),
            opts,
          ],
          "metadata.json": [
            strToU8(JSON.stringify(metadata, null, 2) + "\n"),
            opts,
          ],
        };

  let archive: Uint8Array;
  try {
    archive = zipSync(files, { level: 6 });
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
    ...(snippetValue !== undefined ? { snippet: snippetValue } : {}),
    publishedAt: FIXED_PUBLISHED_AT,
  });
}

export const zipPublisher: Publisher = {
  id: "zip",
  kind: "package",
  // The universal fallback carries anything: it publishes to disk.
  serves: [...VISUAL_FORMATS],
  implemented: true,
  publish,
};
