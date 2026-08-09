// Lazy by design: nothing is built before the journalist has chosen. `offerForms` and
// `materialise` both read `FORMS_BY_GENRE` — one source of truth keyed by genre — so
// "not an offered form" can never drift from what was actually offered FOR THAT GENRE. A form
// id that happens to exist under one genre is not automatically valid for another; the check
// is always on the {form, genre} pair, never on the form id alone.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { deployFile, resolveCloudflareCredentials } from "./deploy-embed.mjs";
import { buildInsertion } from "./cms-insert.mjs";

const REACT_VERSION = "^19.1.0";

// Every genre this skill knows how to deliver, and the forms it can honestly offer for each.
// `medium` is accepted on `offerForms`'s own interface for its future (a map beat's forms will not
// always read identically to a chart beat's), but is not yet branched on — "static", "web" and
// "video" mean the same thing to a chart beat and a map beat today.
//
// A genre only belongs here once a producer actually renders it AND this table can name honest
// forms for it — see `twin-storyboard/scripts/genre-catalog.mjs` for the mirrored fact this table
// is one half of, and `skills/splash-twin/test/genre-shippability.test.ts` for the drift test that
// keeps the two halves from disagreeing. "web" and "video" were added here after the defect they
// exist to fix: twin-chart-web and twin-chart-video both shipped complete, tested producers before
// this table knew what to do with their output, so a chosen "web" or "video" slot could not be
// delivered at all.
export const FORMS_BY_GENRE = {
  static: {
    "owned-file": {
      label: "The file itself",
      gives: "a PNG and an SVG the newsroom owns outright, nothing else to run",
    },
    "source-bundle": {
      label: "Runnable source",
      gives:
        "a folder with this chart's component and data, plus a real build.ts that bun install and bun run build actually execute",
    },
  },
  web: {
    "owned-file": {
      label: "The file itself",
      gives:
        "one self-contained HTML file the newsroom owns outright — hover, keyboard focus and the tooltip all inlined, nothing else to run",
    },
    "source-bundle": {
      label: "Runnable source",
      gives:
        "a folder with this beat's component and data, plus a real build.ts that bun install and bun run build actually execute",
    },
    // The two forms that are NOT an owned file — a beat's single self-contained HTML file is
    // exactly what a hosted embed needs (nothing to bundle, nothing to wrap) and exactly what a
    // CMS insertion embeds — so both are wired to the "web" genre only tonight. "static"/"video"
    // could plausibly host or insert their single owned file too; that is left to a follow-up
    // rather than offered here without having been proven for those genres.
    embed: {
      label: "Hosted embed",
      gives:
        "a live URL on Cloudflare Pages serving this beat's own HTML byte-for-byte, no newsroom hosting required",
    },
    "cms-insertion": {
      label: "CMS insertion",
      gives:
        "a prepared insertion payload for We.Publish or Livingdocs, guarded against ever replacing an article with a partial one — not yet wired to a live CMS, so nothing is inserted automatically (see references/cms-insertion.md)",
    },
  },
  // A scrolly delivers one self-contained HTML page, exactly as "web" does — the scroll scaffold,
  // its steps and its interaction are all inlined in that single file — so its forms are web's
  // four, with the wording saying which kind of page it is. `offerForms` used to THROW on this
  // genre while `twin-scrolly` shipped as a complete skill and `twin/MATRIX.md` recorded a real
  // scrolly beat on disk: the producer existed, the delivery did not, and the journalist met the
  // wall at the last phase.
  scrolly: {
    "owned-file": {
      label: "The file itself",
      gives:
        "one self-contained HTML file the newsroom owns outright — the scroll-driven page, its steps and its sticky graphic all inlined, nothing else to run",
    },
    "source-bundle": {
      label: "Runnable source",
      gives:
        "a folder with this beat's component and data, plus a real build.ts that bun install and bun run build actually execute",
    },
    embed: {
      label: "Hosted embed",
      gives:
        "a live URL on Cloudflare Pages serving this scroll-driven page byte-for-byte, no newsroom hosting required",
    },
    "cms-insertion": {
      label: "CMS insertion",
      gives:
        "a prepared insertion payload for We.Publish or Livingdocs, guarded against ever replacing an article with a partial one — not yet wired to a live CMS, so nothing is inserted automatically (see references/cms-insertion.md)",
    },
  },
  video: {
    "owned-file": {
      label: "The file itself",
      gives: "an mp4 the newsroom owns outright, nothing else to run",
    },
    "source-bundle": {
      label: "Runnable source",
      gives:
        "a folder with this beat's Remotion composition and data, plus a real build.ts that bun install and bun run build actually execute",
    },
  },
};

/**
 * `env` gates the credential-backed "embed" form: `resolveCloudflareCredentials` is a PRESENCE
 * check only (no network call here — `offerForms` stays synchronous and cheap to call on every
 * turn). A missing `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` removes "embed" from the list
 * silently — never throws, never crashes the journey — so a journalist with no Cloudflare account
 * still sees every other form their genre allows. A PRESENT-but-wrong credential still lists the
 * form; `materialise` is where a real network call happens, and a rejected token fails loudly
 * there instead. "cms-insertion" needs no credential (nothing it does calls a network — see
 * `references/cms-insertion.md`), so it is never filtered by `env`.
 */
export function offerForms({ medium, genre, beatDir, env = process.env }) {
  const forms = FORMS_BY_GENRE[genre];
  if (!forms) {
    const known = Object.keys(FORMS_BY_GENRE).join(", ");
    throw new Error(`this skill delivers ${known} only, got ${JSON.stringify(genre)}`);
  }

  // G3 BEFORE G4, mechanically. `beatDir` is required and its `APPROVED.md` must exist, because
  // delivery cannot honestly be discussed before the journalist has seen the thing being
  // delivered. The run talked about delivery twice before it could: once before production began,
  // and once INSIDE the Gate-3 approval question ("hosted embed = closed") — and both were WRONG,
  // and had to be retracted once this function was finally called. That is the point: the forms
  // are this function's output and are not knowable without it, so calling it early has to fail
  // loudly rather than let a guess stand in.
  //
  // `existsSync` keeps this function synchronous, which is what lets it stay cheap to call on
  // every turn (see the `env` note above).
  if (!beatDir) {
    throw new Error("offerForms needs the beat directory — its APPROVED.md is what proves Gate 3 closed");
  }
  if (!existsSync(join(beatDir, "APPROVED.md"))) {
    throw new Error(
      `this beat has not been approved yet — show it first: no APPROVED.md in ${beatDir}. Delivery forms cannot be discussed before the journalist has seen the render.`,
    );
  }

  const hasCloudflare = Boolean(resolveCloudflareCredentials(env));
  return Object.keys(forms)
    .filter((id) => id !== "embed" || hasCloudflare)
    .map((id) => ({ id, ...forms[id] }));
}

// Recursively copies one directory's contents into another, collecting every file path
// written. Directories are walked, never handed to `copyFile` directly — a beat carrying a
// subdirectory anywhere other than "renders" (an "assets" folder, say) must be copied whole,
// not throw EISDIR.
async function copyTree(srcDir, destDir, written, { env = process.env } = {}) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written, { env });
    } else if (entry.name.endsWith(".html")) {
      await writeFile(destPath, substituteKeys(await readFile(srcPath, "utf8"), env));
      written.push(destPath);
    } else {
      await copyFile(srcPath, destPath);
      written.push(destPath);
    }
  }
}

/**
 * RULING R1b — the moment the key enters the file, and the only one.
 *
 * A map × web beat renders with a documented PLACEHOLDER where its MapTiler key belongs, because
 * every beat commits its own HTML and the FJM deliverable is an MIT open-source release: a real key
 * pushed to a public repository is found by scanners within minutes and survives in the history
 * after any later removal. Worse than the usual leak, because MapTiler invalidates ALL of an
 * account's keys at 100% of its spending limit — one abused key blanks the maps in articles that
 * are already published.
 *
 * So the key is substituted HERE, when the file goes to the newsroom, and nowhere earlier.
 * `splash-twin/test/no-key-in-the-repository.test.ts` reddens if one ever reaches a tracked file.
 *
 * `MAPTILER_DELIVERY_KEY` is read BEFORE `MAPTILER_KEY`, and that order is the operational advice
 * rather than a preference. MapTiler's documented mitigation for a client-side key is Allowed HTTP
 * origins, enforced server-side — copied elsewhere, a restricted key does not work — and an
 * account's DEFAULT key cannot be restricted, so a dedicated one has to be created. The delivered
 * key should be that second, origin-restricted key, never the development one.
 *
 * With neither set, the placeholder travels through untouched. That is not a silent failure: the
 * delivered page still renders its complete fallback layer, exactly as it does offline or with
 * JavaScript off. The live layer simply never boots, which is the honest outcome for a delivery
 * nobody gave a key to.
 */
export function substituteKeys(html, env = process.env) {
  const key = env.MAPTILER_DELIVERY_KEY || env.MAPTILER_KEY;
  if (!key) return html;
  const placeholder = "__MAPTILER" + "_KEY__";
  return html.split(placeholder).join(key);
}

// A real, dependency-free build entry point: Bun's own bundler ships inside the Bun runtime,
// so "bun install && bun run build" genuinely executes. It does not reproduce the raster
// pipeline that made the owned PNG/SVG — that pipeline belongs to the chart-beat skill, and
// duplicating it here would be exactly the shared-utility coupling this codebase avoids. It
// bundles the component source it was actually given, which is a claim this file can back.
const BUILD_SCRIPT = `// Bundles this beat's own component source with Bun's native bundler.
// This reproduces the runnable source, not the raster pipeline that made the owned PNG/SVG.
import { readdir } from "node:fs/promises";

const entrypoints = (await readdir(".")).filter((file) => file.endsWith(".tsx"));
if (entrypoints.length === 0) throw new Error("no .tsx component found to build");

const result = await Bun.build({ entrypoints, outdir: "./dist" });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  throw new Error("build failed");
}
console.log(\`built \${entrypoints.join(", ")} -> ./dist\`);
`;

// The one owned file a "web" beat's `renders/` directory holds — both "embed" and
// "cms-insertion" host or embed exactly that file, never a whole tree, so both refuse ambiguity
// rather than guess which entry was meant (a beat with two files in `renders/` has not shipped
// the single self-contained HTML "owned-file"'s own `gives` promises).
async function singleOwnedFile(beatDir) {
  const entries = (await readdir(join(beatDir, "renders"), { withFileTypes: true })).filter((e) =>
    e.isFile(),
  );
  if (entries.length !== 1) {
    throw new Error(
      `expected exactly one file in ${join(beatDir, "renders")}, found ${entries.length} — "embed" and "cms-insertion" host or embed a single owned file, never a tree`,
    );
  }
  return entries[0].name;
}

export async function materialise({
  form,
  genre,
  beatDir,
  exportDir,
  env = process.env,
  fetchFn = fetch,
  projectName,
  cms,
}) {
  // Validate the {form, genre} PAIR, not the form id in isolation — a form id that exists for
  // some other genre must not be accepted here just because it happens to share a name. Reading
  // the same FORMS_BY_GENRE table offerForms reads means a form genre two adds under a
  // different genre is refused automatically, with no separate list to keep in sync.
  const forms = FORMS_BY_GENRE[genre];
  if (!forms || !forms[form]) {
    throw new Error(`${form} is not an offered form for genre ${JSON.stringify(genre)}`);
  }

  // A journalist can change their mind. exportDir may already hold a previous choice's
  // files — clear it first so the chosen form is the ONLY thing delivered, never a mix of
  // this choice and the last one. Validation above runs before this, so a rejected form never
  // destroys whatever was already delivered.
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  const written = [];

  if (form === "owned-file") {
    await copyTree(join(beatDir, "renders"), exportDir, written, { env });
    return written;
  }

  if (form === "embed") {
    // offerForms already hides "embed" when a credential is absent — reaching this branch
    // without one means a caller invoked materialise directly, bypassing offer-then-wait. That is
    // a real error, not a silent skip: unlike offerForms (which must never crash the journey),
    // materialise is the point a chosen form either happens for real or fails loudly.
    const creds = resolveCloudflareCredentials(env);
    if (!creds) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must both be set to materialise the embed form",
      );
    }
    const fileName = await singleOwnedFile(beatDir);
    // The hosted copy carries the key too, or a live map beat would deploy a page whose live layer
    // can never boot. Written into the export directory first so what is deployed is a real file on
    // disk that can be inspected, never a string only this function ever saw.
    const stagedPath = join(exportDir, fileName);
    await writeFile(stagedPath, substituteKeys(await readFile(join(beatDir, "renders", fileName), "utf8"), env));
    const { url } = await deployFile({
      accountId: creds.accountId,
      apiToken: creds.apiToken,
      projectName,
      filePath: stagedPath,
      fileName,
      fetchFn,
    });
    await rm(stagedPath, { force: true });
    // A hosted embed has no local file to keep — the URL IS the delivery. Mirrors the sibling
    // engine's own `EMBED_URL.txt` convention for a hosted-Datawrapper delivery, the same shape
    // for the same reason: nothing to own, only a live address to remember it by.
    const urlPath = join(exportDir, "EMBED_URL.txt");
    await writeFile(urlPath, `${url}\n`);
    written.push(urlPath);
    return written;
  }

  if (form === "cms-insertion") {
    const fileName = await singleOwnedFile(beatDir);
    const insertionHtml = substituteKeys(await readFile(join(beatDir, "renders", fileName), "utf8"), env);

    // Without a live CMS to fetch a real article from, this form demonstrates its own mechanics
    // against a clearly-labelled placeholder rather than pretending to have read a real article —
    // the guard still runs for real, against real data shaped like the CMS's own contract, it is
    // only the article on the other end that is not real. A caller with a genuine article (a real
    // integration, once one exists) passes its own `cms` and this placeholder is never used.
    const insertion = buildInsertion({
      kind: "we-publish",
      articleId: "example-article-id",
      previousBody:
        "<p>Placeholder previous article body — replace with the real article's own body before this form is ever run against a live CMS.</p>",
      ...cms,
      insertionHtml,
    });

    const doc = `# CMS insertion — UNPROVEN, prepared payload only

This form has never inserted into a real CMS from this toolchain — no We.Publish or Livingdocs
endpoint is configured anywhere here. What follows is the mutation this beat's own HTML would send,
built and guarded by \`scripts/cms-insert.mjs\`, exactly as it would be for a real article. See
\`references/cms-insertion.md\` for both mechanics and what remains untested.

## Prepared mutation (kind: ${insertion.kind})

\`\`\`json
${JSON.stringify(insertion, null, 2)}
\`\`\`
`;
    const docPath = join(exportDir, "CMS-INSERTION.md");
    await writeFile(docPath, doc);
    written.push(docPath);
    return written;
  }

  for (const entry of await readdir(beatDir, { withFileTypes: true })) {
    if (entry.name === "renders") continue;
    const srcPath = join(beatDir, entry.name);
    const destPath = join(exportDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written);
    } else {
      await copyFile(srcPath, destPath);
      written.push(destPath);
    }
  }

  const buildPath = join(exportDir, "build.ts");
  await writeFile(buildPath, BUILD_SCRIPT);
  written.push(buildPath);

  const manifestPath = join(exportDir, "package.json");
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        name: "splash-beat",
        private: true,
        type: "module",
        dependencies: { react: REACT_VERSION },
        scripts: { build: "bun run build.ts" },
      },
      null,
      2,
    ),
  );
  written.push(manifestPath);

  return written;
}
