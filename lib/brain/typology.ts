// The typology: the KB sheets, read as data. One sheet per type, ONE file — the machine
// facets in the header, the prose the header points at in the body. There is no second
// registry to drift from (spec §5).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { INTENTS } from "./intents";
import { splitFrontmatter } from "./frontmatter";
import { VISUAL_FORMATS } from "../core/vocabulary";
import { isRenderable } from "../core/registry";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const DEFAULT_ROOT = resolve(REPO_ROOT, "knowledge/references");
// The families of sheets, in load order. A family with no directory is skipped, so a KB
// that does not ship maps still loads.
const FAMILIES = ["chart/types", "map/types", "image/types"];

// A moteur can name SEVERAL render keys for one editorial concept — Datawrapper splits
// horizontal `d3-bars` from vertical `column-chart`, both "bar" (spec §5.1). A sheet may
// therefore write a scalar OR a list per engine; the loader normalises both to a list so
// every downstream reader (renderableSheets, the drift tests) sees one shape. The first key
// is the preferred one — offered ahead of its siblings when more than one is renderable.
const EngineKeys = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

const HeaderSchema = z.object({
  id: z.string().min(1),
  engines: z
    .record(z.string(), EngineKeys)
    .refine((e) => Object.keys(e).length > 0, {
      message: "engines: a sheet must name at least one engine",
    })
    .transform((e) =>
      Object.fromEntries(
        Object.entries(e).map(([engine, keys]) => [
          engine,
          Array.isArray(keys) ? keys : [keys],
        ]),
      ),
    ),
  intent: z.array(z.enum(INTENTS)).min(1),
  shape: z.string().min(1),
  limits: z.record(z.string(), z.number()).default({}),
  formats: z.array(z.enum(VISUAL_FORMATS)).min(1),
  bestFor: z.array(z.string().min(1)).min(1),
  notFor: z.array(z.string().min(1)).min(1),
});

export type TypeSheet = z.infer<typeof HeaderSchema> & {
  /** Repo-relative path to the sheet, e.g. "knowledge/references/chart/types/slope.md" —
   *  genuinely resolvable from the repo root, not just from the KB root, because whySource.sheet
   *  hands this to a journalist or reviewer to go read the source. */
  sheetPath: string;
  body: string;
};

// The path a journalist or reviewer follows to go read the source. `relative(REPO_ROOT, path)`
// is right when the loaded root lives inside the repo (production's DEFAULT_ROOT does) — it
// yields a clean "knowledge/references/..." path. It degrades badly for any root OUTSIDE the
// repo (every test fixture uses a tmpdir): `relative` still succeeds, but climbs out with a
// `../../../../var/folders/.../slope.md` chain onto an absolute, machine-specific path — the
// exact failure mode this field exists to remove, just displaced from "KB-root-relative" to
// "climbs onto an absolute machine path." A leading `..` is the tell: it means the repo-root
// path escaped the repo, so fall back to a path relative to the root that was ACTUALLY loaded
// (never an absolute path, never a `../..` escape) instead.
function sheetPathFor(root: string, path: string): string {
  const fromRepoRoot = relative(REPO_ROOT, path);
  return fromRepoRoot.startsWith("..") ? relative(root, path) : fromRepoRoot;
}

export function loadTypology(root: string = DEFAULT_ROOT): TypeSheet[] {
  const sheets: TypeSheet[] = [];
  for (const family of FAMILIES) {
    const dir = join(root, family);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const path = join(dir, file);
      const { data, body } = splitFrontmatter(readFileSync(path, "utf8"));
      const parsed = HeaderSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(
          `typology: ${relative(root, path)} — ${parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      if (parsed.data.id !== file.replace(/\.md$/, ""))
        throw new Error(
          `typology: ${relative(root, path)} — id "${parsed.data.id}" disagrees with its filename`,
        );
      sheets.push({
        ...parsed.data,
        sheetPath: sheetPathFor(root, path),
        body,
      });
    }
  }
  return sheets;
}

export type RenderableSheet = { sheet: TypeSheet; engine: string; key: string };

// A sheet is only offerable through an engine that can render it TODAY. This is the join
// that makes a deferred type structurally unofferable (spec §3): nothing downstream has to
// remember to filter it, because it never enters the candidate set. When a sheet names
// several keys for one engine (spec §5.1), the pair fires on the FIRST one that is
// renderable — the sheet's own order is the preference order — so a deferred preferred key
// (were that ever the case) falls through to a renderable sibling instead of hiding it.
export function renderableSheets(
  sheets: TypeSheet[] = loadTypology(),
): RenderableSheet[] {
  const out: RenderableSheet[] = [];
  for (const sheet of sheets)
    for (const [engine, keys] of Object.entries(sheet.engines)) {
      const key = keys.find((k) => isRenderable(engine, k));
      if (key) out.push({ sheet, engine, key });
    }
  return out;
}
