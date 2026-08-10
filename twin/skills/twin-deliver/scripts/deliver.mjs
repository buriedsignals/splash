// Lazy by design: nothing is built before the journalist has chosen. `offerForms` and
// `materialise` both read `FORMS_BY_GENRE` — one source of truth keyed by genre — so
// "not an offered form" can never drift from what was actually offered FOR THAT GENRE. A form
// id that happens to exist under one genre is not automatically valid for another; the check
// is always on the {form, genre} pair, never on the form id alone.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { deployFile, resolveCloudflareCredentials } from "./deploy-embed.mjs";
import { buildInsertion } from "./cms-insert.mjs";
import { formatHandover } from "./format-handover.mjs";

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
    // The follow-up this file's own comment promised. "static"/"video" were left without
    // cms-insertion because it had not been proven for them; the `gives` below is the web row's
    // wording VERBATIM, because nothing about how proven it is has changed — it is still UNPROVEN
    // against a live CMS, and saying so identically is the honest way to widen it.
    "cms-insertion": {
      label: "CMS insertion",
      gives:
        "a prepared insertion payload for We.Publish or Livingdocs, guarded against ever replacing an article with a partial one — not yet wired to a live CMS, so nothing is inserted automatically (see references/cms-insertion.md)",
    },
    "source-bundle": {
      label: "Runnable source",
      // A DEVELOPER artifact. The owner names it in none of the three per-genre lists they asked
      // for; it is kept, because it works and a newsroom with a developer wants it, and demoted, so
      // the delivery question offers the journalist-facing forms as the real choice and mentions
      // this one in a line below them.
      audience: "developer",
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
      audience: "developer",
      gives:
        "a folder with this beat's component and data, plus a real build.ts that bun install and bun run build actually execute",
    },
    // The two forms that are NOT an owned file — the newsroom gets a URL or a document, never a
    // copy. `embed` stays wired to the two genres that ship a PAGE ("web", "scrolly"), because a
    // PNG and an mp4 are not pages. `cms-insertion` is now offered in every genre: it prepares a
    // payload around ONE file, and `ownedFileForInsertion` says which file that is per genre.
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
      audience: "developer",
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
    "cms-insertion": {
      label: "CMS insertion",
      gives:
        "a prepared insertion payload for We.Publish or Livingdocs, guarded against ever replacing an article with a partial one — not yet wired to a live CMS, so nothing is inserted automatically (see references/cms-insertion.md)",
    },
    "source-bundle": {
      label: "Runnable source",
      audience: "developer",
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
 * THE DELIVERED KEY IS `MAPTILER_DELIVERY_KEY`, AND NOTHING ELSE — clause 4 of the ruling, which
 * used to be advice in this docblock while the code read `MAPTILER_DELIVERY_KEY || MAPTILER_KEY`.
 * The audit measured what that fallback meant in practice: `twin/.env` holds only `MAPTILER_KEY`,
 * so **as configured, every delivery substituted the unrestricted development key**, and nothing
 * refused, warned or recorded it (AUDIT-W5-W6-map.md §2, clause 4).
 *
 * Why the fallback cannot stay. MapTiler's documented mitigation for a client-side key is Allowed
 * HTTP origins, enforced server-side — copied elsewhere, a restricted key simply does not work — and
 * an account's DEFAULT key CANNOT be restricted, so a dedicated one has to be created
 * (docs.maptiler.com/cloud/api/authentication-key/). A development key delivered into a published
 * article is a key any reader can lift and spend, and MapTiler invalidates ALL of an account's keys
 * at 100% of its spending limit — so the blast radius of the convenient fallback is every map in
 * every article the newsroom has ever published.
 *
 * The three states, and there is no fourth:
 *
 *   - `MAPTILER_DELIVERY_KEY` set  → substituted. The delivery is live.
 *   - neither set                  → the placeholder travels through untouched. Not a silent
 *                                    failure: the delivered page renders its complete fallback
 *                                    layer, exactly as it does offline or with JavaScript off.
 *   - only `MAPTILER_KEY` set      → **THROWS**, naming both ways forward. Substituting it would be
 *                                    the defect; falling silently back to the placeholder would
 *                                    ship a dead map to someone who believes they configured one.
 */
export function substituteKeys(html, env = process.env) {
  const key = env.MAPTILER_DELIVERY_KEY;
  if (!key) {
    if (env.MAPTILER_KEY)
      throw new Error(
        "MAPTILER_DELIVERY_KEY is not set, and MAPTILER_KEY is — refusing to deliver the " +
          "development key into a published page (ruling R1b). Create a SECOND MapTiler key " +
          "restricted to the newsroom's own origins (docs.maptiler.com/cloud/api/authentication-key/) " +
          "and set MAPTILER_DELIVERY_KEY, or unset MAPTILER_KEY for this delivery and the page will " +
          "ship its complete fallback layer with no live tiles.",
      );
    return html;
  }
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
      `expected exactly one file in ${join(beatDir, "renders")}, found ${entries.length} — "embed" hosts a single owned file, never a tree`,
    );
  }
  return entries[0].name;
}

// Which of a beat's rendered files is the one to INSERT, per genre, in preference order. A static
// beat legitimately holds two — `still.png` and `still.svg` — and `singleOwnedFile` refused that as
// ambiguity, which is why cms-insertion could not be offered for static at all. It is not
// ambiguity: for an insertion the vector is the answer and the raster is the fallback, and saying
// so in a table is the difference between "two files" and a decision.
//
// `embed` keeps `singleOwnedFile`'s strictness, deliberately: a hosted page IS one file, and a beat
// with two of them has not shipped what "one self-contained HTML file" promises.
const INSERTION_PREFERENCE = {
  static: [".svg", ".png"],
  web: [".html"],
  scrolly: [".html"],
  video: [".mp4"],
};

export async function ownedFileForInsertion(beatDir, genre) {
  const preference = INSERTION_PREFERENCE[genre];
  if (!preference) {
    throw new Error(
      `no insertion preference for genre ${JSON.stringify(genre)} — known: ${Object.keys(INSERTION_PREFERENCE).join(", ")}`,
    );
  }
  const names = (await readdir(join(beatDir, "renders"), { withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => e.name);

  for (const extension of preference) {
    const matches = names.filter((name) => name.toLowerCase().endsWith(extension));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new Error(
        `two ${extension} files in ${join(beatDir, "renders")} (${matches.join(", ")}) — which one goes to the CMS is an editorial choice, not one this function may make`,
      );
    }
  }
  throw new Error(
    `nothing in ${join(beatDir, "renders")} matches what a ${genre} beat inserts (${preference.join(" then ")}) — found ${names.length ? names.join(", ") : "nothing"}`,
  );
}

// A STORY HAS MORE THAN ONE BEAT, AND EACH DELIVERS SEPARATELY.
//
// `materialise` clears its `exportDir` on every call — deliberately, so a journalist changing their
// mind never ends up with a mix of two forms. That is right per BEAT and catastrophic per STORY: with
// one story-level `export/` shared by every beat, delivering beat 2 DESTROYED beat 1's delivered
// files, silently, at the last phase of the journey. Nothing said so, no test put two beats in one
// story, and the second delivery reported success over an export directory that had just lost half
// its contents.
//
// So the export directory is per beat, and this function is where that fact lives — a caller asking
// "where does this beat deliver" gets an answer from code rather than from a convention nobody wrote
// down. `whereIs` reads the same shape: `export/<beat>/` non-empty means that beat is delivered.
export function exportDirFor(storyDir, beatName) {
  if (!storyDir) throw new Error("exportDirFor needs the story directory");
  if (!beatName) throw new Error("exportDirFor needs the beat's own directory name");
  return join(storyDir, "export", beatName);
}

// The receipt every delivery leaves behind, naming the beat it came from. It is the mechanical half
// of the rule above: `exportDirFor` gives a caller the right directory, and this makes the WRONG one
// fail loudly instead of destroying what is already there. A caller that hands two different beats
// the same `exportDir` — the story-level `export/`, say — is refused on the second call rather than
// wiping the first beat's delivery.
//
// A dotfile, because `export/` is a directory the journalist opens: the hand-over and the delivered
// files are what they should see there.
const DELIVERY_RECEIPT = ".delivered-from";

async function refuseToWipeAnotherBeat(exportDir, beatDir) {
  const beatName = basename(beatDir ?? "");
  const previous = await readFile(join(exportDir, DELIVERY_RECEIPT), "utf8").catch(() => null);
  if (previous !== null && previous.trim() && previous.trim() !== beatName) {
    throw new Error(
      `${exportDir} already holds the delivery of beat "${previous.trim()}" — materialising beat "${beatName}" here would destroy it. Each beat delivers into its own export/<beat>/ directory (see exportDirFor).`,
    );
  }
  return beatName;
}

// The delivery phase closes into a file, like every other phase. `HANDOVER.md` is written BESIDE
// whatever form was chosen, naming each delivered file and its role, the placement read back from
// the storyboard, the alt text, the credit line and the one caveat.
//
// IT IS NOT OPTIONAL, AND THAT IS G4. Every other phase of this journey closes into a file that
// must exist; delivery used to close into "any file in export/", and `withHandover` returned early
// whenever the caller passed no payload — so every delivery form worked without one, silently. The
// run that produced A11 ("delivery must be far clearer: name the files, say where they go, give the
// advice") would have produced it again, and `whereIs` would still have called the story done.
//
// The old argument for optional was that `formatHandover` throws rather than render a document with
// a blank where the credit line should be. That argument survives and points the other way: every
// one of its inputs is ALREADY RECORDED (placement and credit are hand fields 4 and 5, the caveat is
// `limits`, the alt is in the component), so a caller with nothing to hand in has not read the
// storyboard back — and that is a refusal, not a delivery.
async function withHandover(written, { exportDir, genre, handover }) {
  if (!handover) {
    throw new Error(
      "a delivery closes into export/<beat>/HANDOVER.md, like every other gate closes into a file — pass the hand-over payload (placement, alt, credit, and the caveat if the beat carries one). Every one of them is already recorded: placement and credit are hand fields 4 and 5, alt is in the component, the caveat is the limits field.",
    );
  }
  const path = join(exportDir, "HANDOVER.md");
  await writeFile(path, formatHandover({ ...handover, genre, files: written }));
  written.push(path);
  return written;
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
  handover,
}) {
  // Validate the {form, genre} PAIR, not the form id in isolation — a form id that exists for
  // some other genre must not be accepted here just because it happens to share a name. Reading
  // the same FORMS_BY_GENRE table offerForms reads means a form genre two adds under a
  // different genre is refused automatically, with no separate list to keep in sync.
  const forms = FORMS_BY_GENRE[genre];
  if (!forms || !forms[form]) {
    throw new Error(`${form} is not an offered form for genre ${JSON.stringify(genre)}`);
  }

  // A journalist can change their mind about THIS BEAT. exportDir may already hold a previous
  // choice's files — clear it first so the chosen form is the ONLY thing delivered, never a mix of
  // this choice and the last one. Validation above runs before this, so a rejected form never
  // destroys whatever was already delivered.
  //
  // A different BEAT's delivery is not a change of mind, and the wipe must never reach it: the
  // receipt check refuses before anything is removed.
  const beatName = await refuseToWipeAnotherBeat(exportDir, beatDir);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(exportDir, DELIVERY_RECEIPT), `${beatName}\n`);
  const written = [];

  if (form === "owned-file") {
    await copyTree(join(beatDir, "renders"), exportDir, written, { env });
    return withHandover(written, { exportDir, genre, handover });
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
    return withHandover(written, { exportDir, genre, handover });
  }

  if (form === "cms-insertion") {
    const fileName = await ownedFileForInsertion(beatDir, genre);
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
    return withHandover(written, { exportDir, genre, handover });
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

  return withHandover(written, { exportDir, genre, handover });
}
