// Lazy by design: nothing is built before the journalist has chosen. `offerForms` and
// `materialise` both read `FORMS_BY_GENRE` — one source of truth keyed by genre — so
// "not an offered form" can never drift from what was actually offered FOR THAT GENRE. A form
// id that happens to exist under one genre is not automatically valid for another; the check
// is always on the {form, genre} pair, never on the form id alone.

import { copyFile, lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { deployFile, resolveCloudflareCredentials } from "./deploy-embed.mjs";
import { buildInsertion } from "./cms-insert.mjs";
import { formatHandover } from "./format-handover.mjs";
import { GENRE_OFFER_RECEIPT, PENDING } from "./another-genre.mjs";
import { SUBJECT_OFFER_RECEIPT } from "./other-subjects.mjs";

const REACT_VERSION = "^19.1.0";

// Every genre this skill knows how to deliver, and the forms it can honestly offer for each.
// `medium` is accepted on `offerForms`'s own interface for its future (a map beat's forms will not
// always read identically to a chart beat's), but is not yet branched on — "static", "web" and
// "video" mean the same thing to a chart beat and a map beat today.
//
// A genre only belongs here once a producer actually renders it AND this table can name honest
// forms for it — see `storyboard/scripts/genre-catalog.mjs` for the mirrored fact this table
// is one half of, and `skills/splash/test/genre-shippability.test.ts` for the drift test that
// keeps the two halves from disagreeing. "web" and "video" were added here after the defect they
// exist to fix: chart-web and chart-video both shipped complete, tested producers before
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
  // genre while `scrolly` shipped as a complete skill and `twin/MATRIX.md` recorded a real
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
// `states` collects one `mapKeyState` per HTML file copied, so the hand-over can state what the
// delivery actually carries rather than what the environment happens to hold.
async function copyTree(srcDir, destDir, written, { env = process.env, states = [] } = {}) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`delivery refuses to follow a symbolic link in source material: ${srcPath}`);
    } else if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written, { env, states });
    } else if (entry.name.endsWith(".html")) {
      const html = await readFile(srcPath, "utf8");
      states.push(mapKeyState(html, env));
      await writeFile(destPath, substituteKeys(html, env));
      written.push(destPath);
    } else {
      await copyFile(srcPath, destPath);
      written.push(destPath);
    }
  }
}

// The one string that makes an artifact a MAP artifact for this file's purposes: the slot a live
// MapTiler style URL leaves for its key. Split so this module's own source is not itself a hit for
// the value-independent scan in `splash/test/no-key-in-the-repository.test.ts`.
const MAP_KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/**
 * Does this artifact actually carry a MapTiler key slot?
 *
 * THE QUESTION THE KEY RULE HAS TO ASK, and for a long time did not. Everything below protects one
 * thing: a PUBLISHED MAP that carries a key. Whether a beat is that is a fact about the FILE — it
 * either leaves a slot for a key or it does not — and the check used to read the ENVIRONMENT alone,
 * so a `MAPTILER_KEY` sitting in a root's `.env` decided the fate of a bar chart.
 *
 * That is not hypothetical. In the owner's own end-to-end run the delivery step refused an HTML beat
 * that was not a map at all — zero occurrences of `maptiler`, no key slot anywhere in the file — and
 * the run then talked its way around the refusal. A rule that fires on artifacts it cannot possibly
 * be protecting is a rule that teaches the reader to route around it.
 *
 * So: no slot, nothing to substitute, nothing to say, nothing to refuse. The file is delivered
 * exactly as it was rendered.
 */
export function carriesMapKey(html) {
  return String(html).includes(MAP_KEY_PLACEHOLDER);
}

/**
 * RULING R1b — the moment the key enters the file, and the only one.
 *
 * SCOPED TO THE ARTIFACT, NOT TO THE ENVIRONMENT (see `carriesMapKey` above): a file with no key
 * slot returns untouched before any of the states below is even considered.
 *
 * A map × web beat renders with a documented PLACEHOLDER where its MapTiler key belongs, because
 * every beat commits its own HTML and the FJM deliverable is an MIT open-source release: a real key
 * pushed to a public repository is found by scanners within minutes and survives in the history
 * after any later removal. Worse than the usual leak, because MapTiler invalidates ALL of an
 * account's keys at 100% of its spending limit — one abused key blanks the maps in articles that
 * are already published.
 *
 * So the key is substituted HERE, when the file goes to the newsroom, and nowhere earlier.
 * `splash/test/no-key-in-the-repository.test.ts` reddens if one ever reaches a tracked file.
 *
 * THE DELIVERED KEY IS `MAPTILER_DELIVERY_KEY` WHEN THERE IS ONE — and `MAPTILER_KEY` when there is
 * not. Clause 4 of R1b says the delivered key *should* be the second, origin-restricted one, and it
 * is right: MapTiler's documented mitigation for a client-side key is Allowed HTTP origins, enforced
 * server-side, so a restricted key copied elsewhere simply does not work — and an account's DEFAULT
 * key CANNOT be restricted, so a dedicated one has to be created
 * (docs.maptiler.com/cloud/api/authentication-key/).
 *
 * THAT "SHOULD" WAS COMPILED INTO A HARD BLOCK, AND THE BLOCK IS GONE. With only `MAPTILER_KEY` set
 * this function threw, so a journalist whose root held one key could not deliver their own work at
 * all. That is stricter than ruling R1, which is the ruling that governs: *"la carte doit rester
 * interactive tout le temps… On a le droit d'utiliser pleinement MapTiler. Et garder l'export du
 * HTML pas grave pour la clé."* The owner was shown the cost — the key ships inside the delivered
 * HTML, readable by anyone who opens the article — and accepted it explicitly. R1b added where the
 * key may not go (the repository) and which key is preferable (the restricted one). Neither says a
 * delivery stops.
 *
 * So this function RECOMMENDS and never blocks: the best key available is substituted, and
 * `mapKeyState` names which one went in, so the hand-over can say plainly what the newsroom is
 * shipping and what it costs them. **There is no refusal left in this path** — a rule that stops a
 * journalist delivering is a rule they will route around, which is precisely what the run did.
 *
 * The four states, and there is no fifth:
 *
 *   - no key slot in the file      → `"none"`. Not a map delivery; nothing is substituted or said.
 *   - `MAPTILER_DELIVERY_KEY` set  → `"restricted"`. Substituted. The delivery is live, and the key
 *                                    it carries is worthless off the newsroom's own domains.
 *   - only `MAPTILER_KEY` set      → `"development"`. Substituted, and SAID OUT LOUD: the delivery
 *                                    is live and carries an unrestricted key. Ruling R1's own trade.
 *   - neither set                  → `"unkeyed"`. The placeholder travels through untouched. Not a
 *                                    silent failure: the delivered page renders its complete
 *                                    fallback layer, exactly as it does offline, and the hand-over
 *                                    says so.
 */
export function substituteKeys(html, env = process.env) {
  // The artifact decides, not the environment. A beat with no key slot is not a map delivery and
  // has nothing here to protect.
  if (!carriesMapKey(html)) return html;

  const key = env.MAPTILER_DELIVERY_KEY || env.MAPTILER_KEY;
  if (!key) return html;
  return html.split(MAP_KEY_PLACEHOLDER).join(key);
}

/**
 * WHICH KEY THIS ARTIFACT IS ABOUT TO LEAVE WITH — the fact the hand-over states to the journalist.
 *
 * `substituteKeys` used to carry a judgement (deliver / refuse) where it only ever had a FACT. The
 * fact is this enum; what to do about it is the journalist's, and `formatHandover` is where they are
 * told. Separating the two is what let the block become a recommendation without becoming silence.
 */
export const LIVE_TILE_STATES = ["none", "restricted", "development", "unkeyed"];

export function mapKeyState(html, env = process.env) {
  if (!carriesMapKey(html)) return "none";
  if (env.MAPTILER_DELIVERY_KEY) return "restricted";
  if (env.MAPTILER_KEY) return "development";
  return "unkeyed";
}

// A delivery can write more than one file, so the hand-over states the state that COSTS THE MOST.
// An unrestricted key in any delivered file is the thing the newsroom needs told, whatever the file
// beside it carries.
const STATE_COST = { none: 0, restricted: 1, unkeyed: 2, development: 3 };

function costliestState(states) {
  return states.reduce((worst, state) => (STATE_COST[state] > STATE_COST[worst] ? state : worst), "none");
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
  if (
    typeof beatName !== "string" ||
    beatName === "." ||
    beatName === ".." ||
    beatName.includes("/") ||
    beatName.includes("\\") ||
    beatName.includes("\0")
  ) {
    throw new Error(`beat name must be one path segment, got ${JSON.stringify(beatName)}`);
  }
  return join(storyDir, "export", beatName);
}

async function optionalFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function optionalStat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// `beatDir` is not merely a source path: its `stories/<slug>/beats/<beat>` shape is the authority
// from which the only legal export directory is derived. A caller may repeat that answer in
// `exportDir` for compatibility, but cannot choose another recursive-delete target.
async function deliveryPaths(beatDir, exportDir) {
  if (!beatDir) throw new Error("materialise needs the beat directory");
  if (!exportDir) throw new Error("materialise needs the export directory");

  const resolvedBeat = resolve(beatDir);
  const beatsDir = dirname(resolvedBeat);
  if (basename(beatsDir) !== "beats") {
    throw new Error(
      `beat directory must have the stories/<slug>/beats/<beat> shape, got ${beatDir}`,
    );
  }

  const beatStat = await lstat(resolvedBeat);
  const beatsStat = await lstat(beatsDir);
  const storyDir = dirname(beatsDir);
  const storyStat = await lstat(storyDir);
  const rendersDir = join(resolvedBeat, "renders");
  const rendersStat = await lstat(rendersDir);
  if (
    beatStat.isSymbolicLink() ||
    beatsStat.isSymbolicLink() ||
    storyStat.isSymbolicLink() ||
    rendersStat.isSymbolicLink()
  ) {
    throw new Error(`delivery refuses a symlinked beat directory: ${beatDir}`);
  }
  if (!rendersStat.isDirectory()) {
    throw new Error(`delivery requires a real renders directory: ${rendersDir}`);
  }

  const beatName = basename(resolvedBeat);
  const expected = resolve(exportDirFor(storyDir, beatName));
  if (resolve(exportDir) !== expected) {
    throw new Error(
      `export directory must be ${expected} for beat ${JSON.stringify(beatName)}, got ${resolve(exportDir)}`,
    );
  }

  const exportRoot = dirname(expected);
  const exportRootStat = await optionalStat(exportRoot);
  if (exportRootStat?.isSymbolicLink()) {
    throw new Error(`delivery refuses a symlinked export root: ${exportRoot}`);
  }
  const exportStat = await optionalStat(expected);
  if (exportStat?.isSymbolicLink()) {
    throw new Error(`delivery refuses a symlinked export directory: ${expected}`);
  }
  if (exportStat && !exportStat.isDirectory()) {
    throw new Error(`delivery refuses a non-directory export target: ${expected}`);
  }

  return { beatName, exportDir: expected, exportRoot };
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
  const previous = await optionalFile(join(exportDir, DELIVERY_RECEIPT));
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
const HANDOVER_REQUIRED =
  "a delivery closes into export/<beat>/HANDOVER.md, like every other gate closes into a file — pass the hand-over payload (language, placement, alt, credit, and the caveat if the beat carries one). Every one of them is already recorded: language is STORYBOARD.md's `language:` field, placement and credit are hand fields 4 and 5, alt is in the component, the caveat is the limits field.";

function validateHandover(handover, genre) {
  if (!handover) throw new Error(HANDOVER_REQUIRED);
  // Validate all journalist-facing fields before a build or remote deployment begins. The real
  // document is rendered again with the delivered filenames and live-tile state inside staging.
  formatHandover({ ...handover, genre, files: ["pending-delivery"], liveTiles: "none" });
}

async function withHandover(written, { exportDir, genre, handover, states = [] }) {
  if (!handover) throw new Error(HANDOVER_REQUIRED);
  const path = join(exportDir, "HANDOVER.md");
  await writeFile(
    path,
    formatHandover({ ...handover, genre, files: written, liveTiles: costliestState(states) }),
  );
  written.push(path);
  return written;
}

async function materialiseInto({
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

  // This function writes only into a new private staging directory. Clearing that directory keeps
  // the chosen form internally exact; the public materialise wrapper publishes it only after the
  // complete handover has been written.
  //
  // A different BEAT's delivery is not a change of mind, and the wipe must never reach it: the
  // receipt check refuses before anything is removed.
  const beatName = await refuseToWipeAnotherBeat(exportDir, beatDir);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(exportDir, DELIVERY_RECEIPT), `${beatName}\n`);
  // A DELIVERED BEAT IS NOT A FINISHED ONE until the journalist has been offered the same beat in
  // the other genres and has answered — taken one or declined, both clean. The offer is written
  // `pending` here, at the moment the delivery lands, so "the run never made the offer" is a state
  // on disk rather than a habit that can be forgotten. `deliveryClosed` reads it; `recordGenreAnswer`
  // replaces it with the answer. A dotfile, for the same reason as the receipt above.
  await writeFile(join(exportDir, GENRE_OFFER_RECEIPT), `${PENDING}\n`);
  // The other half of the same closing offer: the article's own other subjects. Pending for the
  // same reason and answered the same way — including `none`, when the article carried nothing else.
  await writeFile(join(exportDir, SUBJECT_OFFER_RECEIPT), `${PENDING}\n`);
  const written = [];
  // One `mapKeyState` per HTML file this delivery writes — read for the hand-over, never for a
  // verdict. Nothing in this function refuses over a key.
  const states = [];

  if (form === "owned-file") {
    await copyTree(join(beatDir, "renders"), exportDir, written, { env, states });
    return withHandover(written, { exportDir, genre, handover, states });
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
    const hosted = await readFile(join(beatDir, "renders", fileName), "utf8");
    states.push(mapKeyState(hosted, env));
    await writeFile(stagedPath, substituteKeys(hosted, env));
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
    return withHandover(written, { exportDir, genre, handover, states });
  }

  if (form === "cms-insertion") {
    const fileName = await ownedFileForInsertion(beatDir, genre);
    const inserted = await readFile(join(beatDir, "renders", fileName), "utf8");
    states.push(mapKeyState(inserted, env));
    const insertionHtml = substituteKeys(inserted, env);

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
    return withHandover(written, { exportDir, genre, handover, states });
  }

  for (const entry of await readdir(beatDir, { withFileTypes: true })) {
    if (entry.name === "renders") continue;
    const srcPath = join(beatDir, entry.name);
    const destPath = join(exportDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`delivery refuses to follow a symbolic link in source material: ${srcPath}`);
    } else if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written, { env, states });
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

  return withHandover(written, { exportDir, genre, handover, states });
}

async function publishStagedDelivery(stagingDir, exportDir) {
  const existing = await optionalStat(exportDir);
  if (existing?.isSymbolicLink()) {
    throw new Error(`delivery refuses a symlinked export directory: ${exportDir}`);
  }
  if (existing && !existing.isDirectory()) {
    throw new Error(`delivery refuses a non-directory export target: ${exportDir}`);
  }

  const backupDir = join(dirname(exportDir), `.${basename(exportDir)}-previous-${randomUUID()}`);
  let movedExisting = false;
  try {
    if (existing) {
      await rename(exportDir, backupDir);
      movedExisting = true;
    }
    await rename(stagingDir, exportDir);
  } catch (error) {
    if (movedExisting) {
      try {
        await rename(backupDir, exportDir);
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          `delivery replacement failed and the previous export could not be restored at ${exportDir}`,
        );
      }
    }
    throw error;
  }

  if (movedExisting) {
    try {
      await rm(backupDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // `rm` may already have removed part of the backup. Rolling back to that directory would turn
      // a cleanup problem into data loss. The new export is complete and canonical at this point;
      // retain whatever backup remains and report its exact path for operator cleanup.
      console.warn(
        `delivery published at ${exportDir}, but its previous backup could not be fully removed at ${backupDir}: ${cleanupError.message}`,
      );
    }
  }
}

/**
 * Build a complete delivery in a private sibling directory, then publish it as one replacement.
 * The caller repeats `exportDirFor(storyDir, beatName)` for compatibility, but `beatDir` derives
 * and verifies that exact destination before any existing export is read or changed.
 */
export async function materialise(options) {
  const { form, genre, beatDir, exportDir, handover } = options;
  const forms = FORMS_BY_GENRE[genre];
  if (!forms || !forms[form]) {
    throw new Error(`${form} is not an offered form for genre ${JSON.stringify(genre)}`);
  }

  const paths = await deliveryPaths(beatDir, exportDir);
  const approval = await optionalStat(join(beatDir, "APPROVED.md"));
  if (!approval?.isFile()) {
    throw new Error(
      `this beat has not been approved yet — show it first: no APPROVED.md in ${beatDir}. Delivery cannot begin before the journalist has seen the render.`,
    );
  }
  validateHandover(handover, genre);
  await refuseToWipeAnotherBeat(paths.exportDir, beatDir);

  await mkdir(paths.exportRoot, { recursive: true });
  const exportRoot = await lstat(paths.exportRoot);
  if (exportRoot.isSymbolicLink()) {
    throw new Error(`delivery refuses a symlinked export root: ${paths.exportRoot}`);
  }

  const stagingDir = join(
    paths.exportRoot,
    `.${paths.beatName}-delivery-staging-${randomUUID()}`,
  );
  await mkdir(stagingDir);

  try {
    const stagedWritten = await materialiseInto({ ...options, exportDir: stagingDir });
    await publishStagedDelivery(stagingDir, paths.exportDir);
    return stagedWritten.map((path) => join(exportDir, relative(stagingDir, path)));
  } catch (error) {
    try {
      await rm(stagingDir, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `delivery failed and its staging directory could not be removed at ${stagingDir}`,
      );
    }
    throw error;
  }
}
