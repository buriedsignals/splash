// twin/skills/intake/scripts/manifest.mjs
//
// N SOURCES, BOUND BY DIGEST — issue #37.
//
// Freezing bought a real guarantee: the record of what was analysed cannot drift underneath it. The
// SHAPE it took did not fit the material journalists arrive with. `freezeSource` accepted exactly
// one article path and exactly one data path, wrote three fixed filenames, and refused a second
// call — so a real investigation with 20 article sections, 9 datasets and 14 photographs had to be
// forced through it: twenty sections concatenated into one 2,746-line file whose own structure
// survived as hand-written HTML comments, one CSV kept and eight discarded, and a SECOND STORY
// created purely to reach the photographs. One piece of reporting became four stories or one
// impoverished one.
//
// The guarantee does not require that shape. What is worth keeping is "the analysis names exactly
// what it read, and that cannot change silently". Immutability-by-copy is one way to get it;
// CONTENT-ADDRESSING is another, and it does not force the one-file-per-kind collapse. `deliver`
// already works this way — `.delivery-manifest.json` binds artifacts by digest and `whereIs`
// reopens phases when a digest stops matching — so this is the twin's own established answer
// applied one phase earlier.
//
// WHAT CHANGES AND WHAT DOES NOT. The refusal on SILENT change stays: a source that moved under an
// artifact still reopens the beats that read it. The refusal on change ITSELF goes. Refusing never
// prevented the edit — it meant the story was abandoned and recreated, and the audit trail of what
// changed was lost rather than preserved.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, isAbsolute, sep } from "node:path";

export const MANIFEST_FILE = "source/MANIFEST.json";
export const MANIFEST_SCHEMA = 1;

/** The kinds a source can be. `table` is profiled; the others are held and referenced. */
export const SOURCE_KINDS = ["prose", "table", "image", "geo", "document"];

export function digestOf(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function storyRelative(storyDir, path) {
  const rel = isAbsolute(path) ? relative(storyDir, path) : path;
  if (rel.startsWith(`..${sep}`) || rel === "..") {
    throw new Error(`a source must live inside the story: ${path}`);
  }
  // Recorded with forward slashes whatever wrote it, so a manifest written on Windows and read on
  // Linux names the same entry — the whole point of binding by path AND digest.
  return rel.split(sep).join("/");
}

/**
 * One entry per source: where it is, what it is, and what it hashed to when it was read.
 *
 * `id` is what a slot names in `STORYBOARD.md` (`source: rents`), so it is the journalist's word
 * rather than a filename — a story with nine datasets needs to say which one a beat draws on, and
 * `source/data.csv` cannot answer that.
 */
export function sourceEntry({ id, path, kind, digest, profile = null, note = null }) {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`a source id is lowercase words joined by hyphens — got ${JSON.stringify(id)}`);
  }
  if (!SOURCE_KINDS.includes(kind)) {
    throw new Error(`unknown source kind ${JSON.stringify(kind)} — one of ${SOURCE_KINDS.join(", ")}`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(digest ?? "")) {
    throw new Error(`source ${id} must carry a sha256 digest of what was read`);
  }
  return { id, path, kind, digest, ...(profile ? { profile } : {}), ...(note ? { note } : {}) };
}

/** Write the manifest. Sorted by id so two runs over the same material produce the same bytes. */
export async function writeManifest(storyDir, sources) {
  const ids = sources.map((source) => source.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new Error(`two sources share the id ${JSON.stringify(duplicate)}`);
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA,
    sources: [...sources].sort((a, b) => a.id.localeCompare(b.id)),
  };
  await writeFile(join(storyDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** `null` when the story has no manifest — a story frozen before #37. */
export async function readManifest(storyDir) {
  let text = null;
  try {
    text = await readFile(join(storyDir, MANIFEST_FILE), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const manifest = JSON.parse(text);
  if (manifest?.schemaVersion !== MANIFEST_SCHEMA) {
    throw new Error(`${MANIFEST_FILE} is schema ${manifest?.schemaVersion}, this reads ${MANIFEST_SCHEMA}`);
  }
  if (!Array.isArray(manifest.sources)) throw new Error(`${MANIFEST_FILE} must hold a sources list`);
  return manifest;
}

/**
 * WHICH SOURCES HAVE MOVED SINCE THEY WERE READ. `[]` when the story still matches its manifest.
 *
 * This is the refusal that stays, in its useful form: it names WHAT changed, so the beats that read
 * that source reopen and the rest of the story does not. The old shape could only say "the frozen
 * pair no longer matches" about a story with one pair in it.
 */
export async function driftedSources(storyDir, manifest, { readFile: read = readFile } = {}) {
  const drifted = [];
  for (const source of manifest.sources) {
    let bytes = null;
    try {
      bytes = await read(join(storyDir, source.path));
    } catch {
      drifted.push({ ...source, reason: "missing" });
      continue;
    }
    const now = digestOf(bytes);
    if (now !== source.digest) drifted.push({ ...source, reason: "changed", now });
  }
  return drifted;
}

/** The source a slot draws on. A story with one table needs no `source:` on its slots; a story with
 *  nine does, and saying so is better than picking one for it. */
export function sourceFor(manifest, slot, { kind = "table" } = {}) {
  const ofKind = manifest.sources.filter((source) => source.kind === kind);
  if (slot?.source) {
    const named = ofKind.find((source) => source.id === slot.source);
    if (!named) {
      throw new Error(
        `slot ${slot.id ?? "?"} names source ${JSON.stringify(slot.source)}, which this story does ` +
          `not hold. It has: ${ofKind.map((source) => source.id).join(", ") || "none"}`,
      );
    }
    return named;
  }
  if (ofKind.length === 1) return ofKind[0];
  if (ofKind.length === 0) return null;
  throw new Error(
    `this story holds ${ofKind.length} ${kind} sources (${ofKind.map((s) => s.id).join(", ")}), so a ` +
      `slot has to name which one it draws on with \`source:\`. Picking one for it is how a beat ` +
      `comes to cite a table it was not built from.`,
  );
}
