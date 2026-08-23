// Lazy by design: nothing is built before the journalist has chosen. `offerForms` and
// `materialise` both read `FORMS_BY_FORMAT` — one source of truth keyed by format — so
// "not an offered form" can never drift from what was actually offered FOR THAT FORMAT. A form
// id that happens to exist under one format is not automatically valid for another; the check
// is always on the {form, format} pair, never on the form id alone.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { closeSync, openSync, readdirSync, readSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudflareProjectName,
  cloudflareScrollerProjectName,
  DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
  deployFile,
  resolveSplashInstanceId,
  resolveCloudflareCredentials,
} from "./deploy-embed.mjs";
import { buildInsertion } from "./cms-insert.mjs";
import { resolveEnvKey } from "./env-keys.mjs";
import { ALT_TEXT_FILE, formatHandover } from "./format-handover.mjs";
import {
  FORMAT_OFFER_RECEIPT,
  LEGACY_FORMAT_OFFER_RECEIPT,
  PENDING,
} from "./another-format.mjs";
import { SUBJECT_OFFER_RECEIPT } from "./other-subjects.mjs";
import { requireApprovedOutput } from "./output-review.mjs";
import {
  publishStagedDelivery,
  reconcileDeliveryReplacement,
  replacementArtifacts,
  withDeliveryLock,
} from "./delivery-replacement.mjs";
import { markHostedDeploymentLocalComplete } from "./hosted-deployment.mjs";
import { deliveryDestinations, resolveDeliveryIdentity } from "./delivery-identity.mjs";

const REACT_VERSION = "^19.1.0";

// The article page's companion script for a Splash embed (see its own header comment for what it
// does). It ships once per DELIVERY, not once per beat's own render — `assets/` rather than
// `renders/` — so it is copied here from this skill's own directory, not from the beat's.
const SCROLLER_ASSET_NAME = "splash-iframe-scroller.js";
const SCROLLER_ASSET_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  SCROLLER_ASSET_NAME,
);

// Every format this skill knows how to deliver, and the forms it can honestly offer for each.
// `medium` is accepted on `offerForms`'s own interface for its future (a map beat's forms will not
// always read identically to a chart beat's), but is not yet branched on — "static", "web" and
// "video" mean the same thing to a chart beat and a map beat today.
//
// A format only belongs here once a producer actually renders it AND this table can name honest
// forms for it — see `storyboard/scripts/format-catalog.mjs` for the mirrored fact this table
// is one half of, and `skills/splash/test/format-shippability.test.ts` for the drift test that
// keeps the two halves from disagreeing. "web" and "video" were added here after the defect they
// exist to fix: chart-web and chart-video both shipped complete, tested producers before
// this table knew what to do with their output, so a chosen "web" or "video" slot could not be
// delivered at all.
export const FORMS_BY_FORMAT = {
  static: {
    "owned-file": {
      label: "The file itself",
      gives:
        "the approved static render files the newsroom owns outright — PNG, with SVG when the producer made one — nothing else to run",
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
      // A DEVELOPER artifact. The owner names it in none of the three per-format lists they asked
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
    // copy. `embed` stays wired to the two formats that ship a PAGE ("web", "scrolly"), because a
    // PNG and an mp4 are not pages. `cms-insertion` is now offered in every format: it prepares a
    // payload around ONE file, and `ownedFileForInsertion` says which file that is per format.
    embed: {
      label: "Deploy and receive embed code",
      gives:
        "a stable live URL and iframe snippet; Splash publishes the page to Cloudflare automatically and approved revisions update the same embed address",
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
  // format while `scrolly` shipped as a complete skill and `twin/MATRIX.md` recorded a real
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
      label: "Deploy and receive embed code",
      gives:
        "a stable live URL and iframe snippet; Splash publishes the scroll-driven page to Cloudflare automatically and approved revisions update the same embed address",
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
      gives:
        "the mp4 the newsroom owns outright, with the video's own last frame as the poster image — nothing else to run, and none of the render ladder's working files",
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

function rejectLegacyFormatOption(options, apiName) {
  if (Object.prototype.hasOwnProperty.call(options, "genre")) {
    throw new Error(`${apiName} does not accept genre; use the canonical format field`);
  }
}

/**
 * `env` annotates the credential-backed "embed" form: `resolveCloudflareCredentials` is a PRESENCE
 * check only (no network call here — `offerForms` stays synchronous and cheap to call on every
 * turn). Missing credentials keep the form visible but disabled with the concrete setup reason,
 * while every other form remains available. "cms-insertion" needs no credential (nothing it does
 * calls a network — see `references/cms-insertion.md`).
 *
 * `capabilities` IS THE PROBE, CARRIED IN — round-four finding 10. Presence is not permission, and
 * the sentence that used to stand here said so and then shrugged: "a PRESENT-but-wrong credential
 * leaves the form enabled; `materialise` is where a real network call happens, and a rejected token
 * fails loudly there instead." Measured against a live Cloudflare account, that is preflight
 * reporting `hostedEmbed {available: false, reason: "Cloudflare answered 403"}` in the same session
 * as this menu offering `[embed] Deploy and receive embed code` with no reason at all — one
 * credential, two accounts of it, and the journalist reads both. A row that `materialise` cannot
 * honour is not an offer; it is a choice that fails after they make it.
 *
 * So the probe's verdict is HANDED IN, in the same `capabilities` shape `otherFormatsFor` already
 * takes, by the caller that already ran preflight this session — no network call is added here and
 * this function stays synchronous. With no `capabilities` argument the presence check is exactly
 * what it always was: a caller with no preflight in hand is not told a lie in either direction.
 * The credentials are checked FIRST, because a probe from another environment cannot make a
 * delivery possible in this one.
 */
export function offerForms(options) {
  rejectLegacyFormatOption(options, "offerForms");
  const {
    medium,
    format,
    storiesRoot,
    storyId,
    outputId,
    planVersion,
    findingIds,
    capabilities,
    env = process.env,
  } = options;
  const forms = FORMS_BY_FORMAT[format];
  if (!forms) {
    const known = Object.keys(FORMS_BY_FORMAT).join(", ");
    throw new Error(`this skill delivers ${known} only, got ${JSON.stringify(format)}`);
  }
  if (Object.hasOwn(options, "beatDir") || Object.hasOwn(options, "exportDir")) {
    throw new Error(
      "offerForms accepts storiesRoot, storyId, and outputId; legacy paths require delivery-compat-v1",
    );
  }

  // G3 BEFORE G4, mechanically. A bare approval marker cannot identify what the journalist saw.
  // The versioned review is checked against this output ID, the current render bytes, the caller's
  // current plan version and finding IDs, and a passing QA run. The check stays synchronous so this
  // menu remains cheap to call on every turn (see the `env` note above).
  const identity = resolveDeliveryIdentity({ storiesRoot, storyId, outputId });
  requireApprovedOutput({ beatDir: identity.beatDir, planVersion, findingIds });

  const hasCloudflare = Boolean(resolveCloudflareCredentials(env));
  // The probe's row, when one was handed in. Absent means "nobody measured", which is not the same
  // fact as "measured and refused" and must not be reported as one.
  const hostedEmbed = capabilities?.hostedEmbed;
  const hostedEmbedGap = !hasCloudflare
    ? "Cloudflare hosted delivery is not configured; add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, then retry this form."
    : hostedEmbed && hostedEmbed.available === false
      ? `Cloudflare hosted delivery is configured, and the check Splash ran against it was refused: ${hostedEmbed.reason}. The credentials are present, so this is the account or the token's permissions rather than a missing setting.`
      : null;
  // THE OFFER IS DERIVED FROM THE BEAT, NOT FROM THE FORMAT ALONE — round-five findings Y4 and
  // Y17. `FORMS_BY_FORMAT` says which forms a format CAN have; it cannot say which ones THIS beat
  // can honour, because that depends on what its producer actually rendered and wrote. Two static
  // beats in the same tree differ: one holds an SVG and its own component, the other holds a
  // delegated PNG and nothing else, and both were offered all three forms. A row is kept VISIBLE
  // and disabled with its concrete reason, exactly as `embed` is above — the journalist is told
  // why a form they can see is not for this beat, rather than watching it disappear.
  const insertion = forms["cms-insertion"] ? insertionOffer(identity.beatDir, format) : null;
  const bundle = forms["source-bundle"] ? sourceBundleOffer(identity.beatDir) : null;
  const gaps = {
    embed: hostedEmbedGap,
    "cms-insertion": insertion && !insertion.available ? insertion.reason : null,
    "source-bundle": bundle && !bundle.available ? bundle.reason : null,
  };
  return Object.keys(forms).map((id) =>
    gaps[id]
      ? { id, ...forms[id], available: false, reason: gaps[id] }
      : { id, ...forms[id], available: true },
  );
}

/**
 * WHAT `owned-file` ACTUALLY DELIVERS, per format — the files this beat DELIVERS, never the files
 * it happened to write.
 *
 * ROUND-FIVE T10, V7 AND W9, reported independently by three formats. `owned-file` copied the whole
 * of a beat's `renders/` directory, so a newsroom received the render ladder's own working set:
 * `stories/stress-t-europe-recycling` delivered four intermediate frames and a 247 KB
 * `video-props.json` beside the mp4 it asked for, and the hand-over described each of the four as
 * "a raster copy, for a system that cannot take the vector" — a sentence about a vector that beat
 * never rendered. `stories/stress-w-quay-photographs` worked around it in the other direction, by
 * keeping its own portrait probe OUTSIDE `renders/` and writing down why.
 *
 * THIS IS NOT A NEW PROMISE. Every row of `FORMS_BY_FORMAT` above already says what its owned file
 * is — "one self-contained HTML file", "an mp4 the newsroom owns outright, nothing else to run",
 * "PNG, with SVG when the producer made one". The delivery simply never honoured it. What is
 * written here is that sentence made mechanical, so the two cannot drift apart again.
 *
 * WHY THE POSTER FRAME IS DELIVERED AND THE QA FRAMES ARE NOT, since both are PNGs of one video.
 * The render ladder's rung 2 is the video's LAST FRAME, rendered on its own so the end state can be
 * looked at before the mp4 costs minutes; a newsroom publishing an mp4 needs exactly that image as
 * its poster. The frames at 60, 100, 125 … are samples taken to check the BUILD, and a build is not
 * a deliverable. They are told apart by the name the ladder itself writes — `final-frame.png`, or
 * `<beat>-final-frame.png` — which is the convention every video beat in this tree already follows
 * (measured: stress-ae, stress-m, stress-t, and stress-v twice over, at two sizes).
 *
 * WITHHELD IS NOT DELETED. Everything a producer wrote stays in the beat's own `renders/`, where a
 * maintainer can still look at it. What changes is what crosses into `export/`.
 */
const DELIVERED_BY_FORMAT = {
  // The row's own words: "PNG, with SVG when the producer made one".
  static: (name) => /\.(png|svg)$/i.test(name),
  // "one self-contained HTML file the newsroom owns outright".
  web: (name) => /\.html$/i.test(name),
  scrolly: (name) => /\.html$/i.test(name),
  // "an mp4 the newsroom owns outright" — plus the poster the mp4 is published behind.
  video: (name) => /\.mp4$/i.test(name) || /(^|[-_])final-frame\.png$/i.test(name),
};

/**
 * `{ delivered, withheld }` for one `renders/` listing in one format, both in the order the
 * directory gave them. THROWS on a format with no delivered set rather than falling back to
 * "everything", which is the behaviour this function exists to remove: a format nobody has decided
 * for must not deliver a working directory by default.
 *
 * Pure, and exported, so the decision can be driven over the tree's real beats
 * (`test/owned-file-delivers-what-it-promises.test.ts`) rather than only over what `materialise`
 * happens to stage.
 */
export function ownedFileDelivery(names, format) {
  const delivers = DELIVERED_BY_FORMAT[format];
  if (!delivers) {
    throw new Error(
      `no owned-file delivered set is declared for format ${JSON.stringify(format)} — ` +
        `${Object.keys(DELIVERED_BY_FORMAT).join(", ")} each name what their own file is, and a ` +
        `format that has not decided must not fall back to copying a beat's whole renders/ directory`,
    );
  }
  const delivered = [];
  const withheld = [];
  for (const name of names) (delivers(name) ? delivered : withheld).push(name);
  return { delivered, withheld };
}

// One file into the export, with the HTML path's key substitution and its `mapKeyState` reading.
// Split out of `copyTree` so the owned-file branch can copy a CHOSEN set without re-implementing
// either.
async function copyDeliverable(srcPath, destPath, written, { env = process.env, states = [] } = {}) {
  if (srcPath.endsWith(".html")) {
    const html = await readFile(srcPath, "utf8");
    states.push(mapKeyState(html, env));
    await writeFile(destPath, substituteKeys(html, env));
  } else {
    await copyFile(srcPath, destPath);
  }
  written.push(destPath);
}

/**
 * The owned-file form, materialised: the files this format delivers out of `renders/`, and nothing
 * else. Refuses a beat whose `renders/` holds nothing this format delivers — a video beat with no
 * mp4 used to deliver a folder of QA frames and report success.
 *
 * IT RECURSES, AND IT FILTERS AT EVERY DEPTH. A beat may render into a subdirectory (`renders/
 * social/`), and dropping those wholesale would withhold a real deliverable; copying them wholesale
 * is the same defect one level down. A directory is created in the export only when something
 * inside it is actually delivered, so a working folder leaves no empty shell behind.
 *
 * The symbolic-link refusal is made over EVERY entry, delivered or not, so withholding a file
 * cannot also withhold that refusal.
 */
async function copyOwnedFiles(rendersDir, destDir, written, format, { env = process.env, states = [] } = {}) {
  const found = [];
  const kept = [];
  const withheld = [];

  async function walk(srcDir, outDir, prefix) {
    const entries = await readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const label = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(`delivery refuses to follow a symbolic link in source material: ${srcPath}`);
      } else if (entry.isDirectory()) {
        await walk(srcPath, join(outDir, entry.name), label);
      } else {
        found.push(label);
        const { delivered } = ownedFileDelivery([entry.name], format);
        if (delivered.length === 0) {
          withheld.push(label);
          continue;
        }
        await mkdir(outDir, { recursive: true });
        await copyDeliverable(srcPath, join(outDir, entry.name), written, { env, states });
        kept.push(label);
      }
    }
  }

  await mkdir(destDir, { recursive: true });
  await walk(rendersDir, destDir, "");

  if (kept.length === 0) {
    throw new Error(
      `${rendersDir} holds nothing a ${format} beat delivers — found ${
        found.length ? found.join(", ") : "nothing"
      }. The form is "the file itself", and this beat has not rendered one.`,
    );
  }
  return { delivered: kept, withheld };
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
    } else {
      await copyDeliverable(srcPath, destPath, written, { env, states });
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

  // THROUGH THE ALIAS TABLE, NOT A TWO-NAME `||`. The order is ruling R1b's and is unchanged — the
  // restricted key first, the development key second — but each name is now resolved rather than
  // read. Measured on this machine on 2026-08-23: the root `.env` held the MapTiler key only under
  // the engine's own `REMOTION_MAPTILER_KEY`/`VITE_MAPTILER_KEY`, so the hand-written fallback
  // substituted nothing and every delivered map shipped its placeholder and a dead tile layer
  // against a working, present key.
  const key = resolveEnvKey(env, "MAPTILER_DELIVERY_KEY") || resolveEnvKey(env, "MAPTILER_KEY");
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
  // The same resolution `substituteKeys` uses, and it has to be the same one: a state that said
  // "unkeyed" while the substitution found a key would be a hand-over describing a different file
  // from the one the newsroom receives.
  if (resolveEnvKey(env, "MAPTILER_DELIVERY_KEY")) return "restricted";
  if (resolveEnvKey(env, "MAPTILER_KEY")) return "development";
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
//
// `COMPONENT_EXTENSION` is hoisted out of the script's own text so the OFFER and the BUILD cannot
// disagree about what a component is. They did: `source-bundle` was offered on every static beat,
// and a delegated Datawrapper still has no component at all, so the journalist received a folder
// whose `bun run build` throws on its first line. The offer now runs the build script's own
// predicate over the same files the bundle would carry.
const COMPONENT_EXTENSION = ".tsx";

const BUILD_SCRIPT = `// Bundles this beat's own component source with Bun's native bundler.
// This reproduces the runnable source, not the raster pipeline that made the owned PNG/SVG.
import { readdir } from "node:fs/promises";

const entrypoints = (await readdir(".")).filter((file) => file.endsWith("${COMPONENT_EXTENSION}"));
if (entrypoints.length === 0) throw new Error("no ${COMPONENT_EXTENSION} component found to build");

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

// Which of a beat's rendered files is the one to INSERT, per format, in preference order. A static
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

export function ownedFileForInsertionSync(beatDir, format) {
  const preference = INSERTION_PREFERENCE[format];
  if (!preference) {
    throw new Error(
      `no insertion preference for format ${JSON.stringify(format)} — known: ${Object.keys(INSERTION_PREFERENCE).join(", ")}`,
    );
  }
  const names = readdirSync(join(beatDir, "renders"), { withFileTypes: true })
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
    `nothing in ${join(beatDir, "renders")} matches what a ${format} beat inserts (${preference.join(" then ")}) — found ${names.length ? names.join(", ") : "nothing"}`,
  );
}

// The async face this file's own callers already had. `offerForms` is synchronous and must stay so
// (see its own note), and the menu now has to read the beat, which is why the decision above is
// the synchronous one and this is the wrapper — not the other way round.
export async function ownedFileForInsertion(beatDir, format) {
  return ownedFileForInsertionSync(beatDir, format);
}

// HOW MUCH OF A FILE HAS TO BE READ TO KNOW WHETHER IT IS MARKUP. A window, not the whole file:
// `offerForms` runs on every turn of the delivery exchange and a "video" beat's insertable render
// is an mp4, which can be hundreds of megabytes. Every markup this toolchain delivers declares
// itself in its first bytes — `<?xml`, `<svg`, `<!doctype`, `<html` — so the first window either
// carries an element or the file has none to carry.
const INSERTION_WINDOW_BYTES = 4096;

// A tag opener: `<` followed by a name, a closing slash, a declaration or a processing instruction.
const TAG_OPENER = /<[A-Za-z!?/]/;

/**
 * IS THIS FILE SOMETHING A CMS CAN BE HANDED?
 *
 * ROUND-FIVE FINDING Y4, measured by the controller on `stories/stress-y-rural-broadband`, whose
 * only render is a delegated Datawrapper PNG:
 *
 *     ownedFileForInsertion(beatDir, "static")  -> chart.png
 *     readFile(..., "utf8")                     -> length 73479, U+FFFD 30131
 *
 * `buildInsertion` splices its `insertionHtml` into an article BODY — markup, in a string. Reading
 * a PNG as UTF-8 does not fail; it succeeds, and yields 30,131 Unicode replacement characters, and
 * the delivery then wrote them into a document headed "the mutation this beat's own HTML would
 * send". Nothing anywhere noticed. `offerForms` had listed the form `available: true`.
 *
 * MEASURED ON THE BYTES, NOT INFERRED FROM THE NAME. An extension list would be one more typed
 * population, and it would be wrong in both directions: a `.png` holding text is still not markup,
 * and a producer that one day writes an insertable file under some other extension would be refused
 * for its name rather than for what it is. Two questions, both answered from the file itself:
 *
 *   1. Does it decode as UTF-8 at all? A raster or a video does not — a PNG's second byte is 0x89,
 *      which cannot start a UTF-8 sequence. This is the read that produced the 30,131 above, done
 *      with a decoder that refuses instead of substituting.
 *   2. Having decoded, does it carry an element? Text is not markup. A body with nothing to splice
 *      into it is not an insertion.
 *
 * Returns `{markup, reason}` — never throws, because the menu must not crash the journey, and
 * `reason` is a clause the callers below finish into a sentence naming the file.
 */
export function insertionMarkupVerdict(bytes) {
  let text;
  try {
    // `stream: true` so a window that ends mid-codepoint is not itself the refusal.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: true });
  } catch {
    return {
      markup: false,
      reason:
        "not text: its bytes are not valid UTF-8, so reading it as an article body yields replacement characters rather than markup",
    };
  }
  if (text.includes("\u0000")) {
    return {
      markup: false,
      reason: "not text: it carries NUL bytes, which no article body can hold",
    };
  }
  if (!TAG_OPENER.test(text)) {
    return {
      markup: false,
      reason: "not markup: it decodes as text but carries no element a CMS body could contain",
    };
  }
  return { markup: true, reason: null };
}

function leadingBytes(path, max = INSERTION_WINDOW_BYTES) {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(max);
    const read = readSync(fd, buffer, 0, max, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

// The one sentence both the menu and `materialiseInto` use, so a form disabled with a reason and a
// form refused on the way in cannot say two different things about the same beat.
function insertionOffer(beatDir, format) {
  const ownedFile = FORMS_BY_FORMAT[format]?.["owned-file"]?.label;
  const instead = ownedFile
    ? ` Choose "${ownedFile}" instead and place it through the CMS's own upload field.`
    : "";
  let fileName;
  try {
    fileName = ownedFileForInsertionSync(beatDir, format);
  } catch (error) {
    return { available: false, reason: `${error.message}.${instead}` };
  }
  const verdict = insertionMarkupVerdict(leadingBytes(join(beatDir, "renders", fileName)));
  if (verdict.markup) return { available: true, fileName };
  return {
    available: false,
    fileName,
    reason:
      `A CMS insertion splices markup into the article's own body, and the only render this beat ` +
      `has to insert is ${fileName}, which is ${verdict.reason}.${instead}`,
  };
}

// The same shape, one form over: `source-bundle` promises a folder whose `bun run build` executes,
// and a beat whose picture was produced elsewhere — a delegated chart — has no component for it to
// build. The predicate is the BUILD SCRIPT'S OWN, over the same top-level files the bundle carries
// (`build.ts` runs `readdir(".")`, so a component nested in a subdirectory is not one it would
// find either).
function sourceBundleOffer(beatDir) {
  const components = readdirSync(beatDir, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(COMPONENT_EXTENSION),
  );
  if (components.length > 0) return { available: true };
  const ownedFile = FORMS_BY_FORMAT.static["owned-file"].label;
  return {
    available: false,
    reason:
      `This beat has no component to bundle — nothing in its own directory ends in ` +
      `${COMPONENT_EXTENSION}, so the build.ts this form ships would find nothing to build. A beat ` +
      `whose picture was rendered somewhere else has no runnable source of its own. Choose ` +
      `"${ownedFile}" instead.`,
  };
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
// So the export directory is per output, and this function derives it from the declared trust root
// and stable IDs. A caller never hands that answer back to `materialise`; the canonical API derives
// it again. `whereIs` reads the same shape: `export/<output>/` non-empty means that output delivered.
export function exportDirFor(identity) {
  return deliveryDestinations(identity).exportDir;
}

async function optionalFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// The receipt every delivery leaves behind, naming the stable output it came from. The canonical
// API already derives the only destination; this is a second invariant checked before replacement.
//
// A dotfile, because `export/` is a directory the journalist opens: the hand-over and the delivered
// files are what they should see there.
const DELIVERY_RECEIPT = ".delivered-from";

async function refuseToWipeAnotherBeat(exportDir, outputId) {
  const previous = await optionalFile(join(exportDir, DELIVERY_RECEIPT));
  if (previous !== null && previous.trim() && previous.trim() !== outputId) {
    throw new Error(
      `${exportDir} already holds the delivery of output "${previous.trim()}" — materialising output "${outputId}" here would destroy it. Each output delivers into its own export/<output>/ directory.`,
    );
  }
  return outputId;
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

function validateHandover(handover, format) {
  if (!handover) throw new Error(HANDOVER_REQUIRED);
  // Validate all journalist-facing fields before a build or remote deployment begins. The real
  // document is rendered again with the delivered filenames and live-tile state inside staging.
  formatHandover({ ...handover, format, files: ["pending-delivery"], liveTiles: "none" });
}

/**
 * A BEAT'S ALT TEXT HAS A RECORDED HOME, AND THIS IS WHERE IT IS READ — round-seven D16.
 *
 * It used to have none. The sentence existed inside the rendered artefact and nowhere a later phase
 * could reach it, which cost two things on one real story: the runner read it back out of the
 * delivered page's own `<desc>` and handed over React's escaping, and a CORRECTION to the alt text
 * was invisible to delivery, because nothing outside the render had moved.
 *
 * The home is `beats/<outputId>/ALT.md` — one file, the sentence and nothing else, beside the
 * beat's own `BRIEF.md`, written by whichever producer writes the artefact. A file, like every
 * other thing this journey records, for the same reason: it survives the turn that produced it and
 * a later phase can read it without opening a render.
 *
 * WHAT THIS FUNCTION CAN AND CANNOT DO TODAY, stated rather than implied. No producing skill writes
 * `ALT.md` yet — `chart-web` and `map-web` are owned elsewhere this round — so a beat that records
 * nothing is the ordinary case and delivery proceeds on the caller's own alt. What it can do is
 * make the record AUTHORITATIVE wherever it exists: absent an alt from the caller it supplies one,
 * and a caller handing over a DIFFERENT sentence is refused, because a hand-over disagreeing with
 * the beat's own record is a hand-over that read the sentence somewhere else — which is the defect.
 */
async function resolveRecordedAlt(beatDir, handover) {
  const recorded = await optionalFile(join(beatDir, ALT_TEXT_FILE));
  if (recorded === null) return handover;
  // FLATTENED, because a hand-over prints the alt text as one Markdown blockquote line and a
  // recorded file wraps where it likes. An alt text is one sentence; a second line in the middle of
  // it would leave `> ` on the first line only and drop the rest out of the quote.
  const alt = flattenSentence(recorded);
  if (alt === "") {
    throw new Error(
      `${join(beatDir, ALT_TEXT_FILE)} records no alt text. It is where this beat's alt text lives — one sentence, the one a reader who cannot see the picture is given instead of it — and an empty file is a producer that opened it and wrote nothing, not a beat without alt text.`,
    );
  }
  const given = handover?.alt;
  if (!given || !String(given).trim()) return { ...handover, alt };
  if (sameSentence(given, alt)) return { ...handover, alt };
  throw new Error(
    `this hand-over's alt text is not the one the beat recorded in ${ALT_TEXT_FILE}. Recorded: ${JSON.stringify(alt)}. Handed over: ${JSON.stringify(String(given).trim())}. The recorded sentence is the beat's own, and a hand-over that disagrees with it read the alt text somewhere else. ${join(beatDir, ALT_TEXT_FILE)} is the one place that answer is kept: put the sentence this beat needs there and hand over exactly that.`,
  );
}

// Two sentences are the same sentence when only their line breaks differ: a recorded file is
// written to be read by a person and wraps where it likes.
function flattenSentence(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function sameSentence(left, right) {
  return flattenSentence(left) === flattenSentence(right);
}

async function withHandover(written, { exportDir, format, handover, states = [] }) {
  if (!handover) throw new Error(HANDOVER_REQUIRED);
  const path = join(exportDir, "HANDOVER.md");
  await writeFile(
    path,
    formatHandover({ ...handover, format, files: written, liveTiles: costliestState(states) }),
  );
  written.push(path);
  return written;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Marks the iframe as one of ours, two ways at once (see `splash-iframe-scroller.js`'s own header
// comment for why both): the `data-splash-embed` attribute, and a `?splash`/`&splash` marker
// appended to the `src` itself — the attribute alone does not survive a CMS that only takes a URL
// and builds its own iframe markup around it.
function withSplashMarker(href) {
  return href.includes("?") ? `${href}&splash` : `${href}?splash`;
}

// The env var a newsroom sets once it has hosted its own copy of the scroller — the source of the
// `scrollerUrl` this file's caller (`materialise`, which alone reads `process.env`) may pass in.
// Named here only so `validateScrollerUrl`'s error messages can name it; this module never reads it.
const SCROLLER_URL_ENV_VAR = "SPLASH_SCROLLER_URL";

// A RELATIVE `<script src="splash-iframe-scroller.js">` only ever worked when a newsroom happened
// to host the file at that exact relative path next to the article — everywhere else it resolved
// against the ARTICLE's own URL and 404'd, silently, because a script tag that fails to load makes
// no noise. Five published 20min articles carried this for months before anyone noticed. So: an
// ABSOLUTE URL, when a hosted one is known and validated, or the script's own SOURCE inlined —
// never a bare relative filename again.
export function validateScrollerUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${SCROLLER_URL_ENV_VAR} is not a valid URL: ${JSON.stringify(rawUrl)}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${SCROLLER_URL_ENV_VAR} must use HTTPS, got ${JSON.stringify(rawUrl)}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${SCROLLER_URL_ENV_VAR} must not carry credentials`);
  }
  return parsed.href;
}

/**
 * A pure function of its arguments — it never reads `process.env` or the filesystem itself, so it
 * stays trivially testable. `options` carries exactly one of:
 *
 *   - `scrollerUrl`: the raw, unvalidated value of `SPLASH_SCROLLER_URL` — validated here (HTTPS
 *     only, no credentials, a clear error naming the env var on anything unparseable) and emitted
 *     as an absolute `<script src>`. The "whitelist our script" path a newsroom takes once it has
 *     hosted its own copy.
 *   - `inlineSource`: the scroller's own source text (`materialise` reads the asset file — this
 *     function does not) — emitted verbatim inside a `<script>…</script>` block, so the pasted
 *     embed is entirely self-contained and needs no hosting at all. Guarded against the one thing
 *     that would break it: a source containing `</script` would close the block early and truncate
 *     the page's own HTML after it.
 */
export function embedCodeFor(url, title, options = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("an embed URL must use HTTPS");
  if (!title) throw new Error("an embed iframe needs a non-empty title");
  const markedSrc = withSplashMarker(parsed.href);
  const iframe = `<iframe data-splash-embed src="${escapeHtmlAttribute(markedSrc)}" title="${escapeHtmlAttribute(title)}" loading="lazy" style="width:100%;height:600px;border:0" allowfullscreen></iframe>\n`;

  const { scrollerUrl, inlineSource } = options;
  if (scrollerUrl != null && inlineSource != null) {
    throw new Error("embedCodeFor accepts either options.scrollerUrl or options.inlineSource, not both");
  }
  if (scrollerUrl != null) {
    const resolved = validateScrollerUrl(scrollerUrl);
    return `${iframe}<script src="${escapeHtmlAttribute(resolved)}"></script>\n`;
  }
  if (inlineSource != null) {
    if (inlineSource.includes("</script")) {
      throw new Error(
        'the scroller source cannot be inlined: it contains "</script", which would close the block early and truncate the page',
      );
    }
    return `${iframe}<script>\n${inlineSource}\n</script>\n`;
  }
  throw new Error(
    "embedCodeFor requires either options.scrollerUrl (a hosted copy) or options.inlineSource (the script's own source) — never a bare relative filename",
  );
}

/**
 * THE ANSWERS A JOURNALIST ALREADY GAVE, READ OFF THE DELIVERY ABOUT TO BE REPLACED.
 *
 * A delivery is published by wiping `export/<beat>/` and putting a freshly staged directory in its
 * place, which is what keeps the chosen form internally exact — nothing from a previous form can
 * survive into a new one. The two closing-offer receipts are not part of the form. They are the
 * journalist's own words, and re-materialising the same beat took them with the files: measured on
 * a real story, a re-delivery to correct the hand-over silently dropped `.another-format` and
 * `.other-subjects`, and the story went back to reporting that neither question had ever been
 * asked (D17). Silent data loss in the one place a journalist's answer lives.
 *
 * `pending` is not an answer — it is the mark of a question nobody has put yet — so it is not
 * carried; a beat re-delivered before anyone was asked is still a beat nobody was asked.
 *
 * The legacy `.another-genre` name is carried UNDER ITS OWN NAME. `deliveryClosed` reads either
 * one, and rewriting a legacy receipt as the canonical one here would be a migration this function
 * was not asked to perform — and, if the two ever disagreed, one that quietly picked a winner.
 */
async function carriedOfferAnswers(exportDir) {
  const carried = new Map();
  for (const name of [FORMAT_OFFER_RECEIPT, LEGACY_FORMAT_OFFER_RECEIPT, SUBJECT_OFFER_RECEIPT]) {
    const text = await optionalFile(join(exportDir, name));
    if (text === null || text.trim() === "" || text.trim() === PENDING) continue;
    carried.set(name, text);
  }
  return carried;
}

/**
 * Both halves of the closing offer, written into the staging directory: the carried answer where
 * there is one, `pending` where there is not.
 *
 * The one asymmetry is the legacy format receipt. When it alone carries the answer, no canonical
 * receipt is written at all — a `pending` beside a real legacy answer is exactly the pair
 * `deliveryClosed` refuses as conflicting, so writing one would turn a re-delivery into a throw.
 */
async function writeOfferReceipts(exportDir, carried) {
  const format = carried.get(FORMAT_OFFER_RECEIPT);
  const legacyFormat = carried.get(LEGACY_FORMAT_OFFER_RECEIPT);
  if (legacyFormat !== undefined) await writeFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), legacyFormat);
  if (format !== undefined) {
    await writeFile(join(exportDir, FORMAT_OFFER_RECEIPT), format);
  } else if (legacyFormat === undefined) {
    await writeFile(join(exportDir, FORMAT_OFFER_RECEIPT), `${PENDING}\n`);
  }
  // The other half of the same closing offer: the article's own other subjects. Pending for the
  // same reason and answered the same way — including `none`, when the article carried nothing else.
  await writeFile(
    join(exportDir, SUBJECT_OFFER_RECEIPT),
    carried.get(SUBJECT_OFFER_RECEIPT) ?? `${PENDING}\n`,
  );
}

async function materialiseInto({
  form,
  format,
  beatDir,
  exportDir,
  env = process.env,
  fetchFn = fetch,
  projectName,
  cms,
  handover,
  hostedOperation,
  deploymentNamespace,
  storyId,
  outputId,
  planVersion,
  findingIds,
  carried = new Map(),
}) {
  // Validate the {form, format} PAIR, not the form id in isolation — a form id that exists for
  // some other format must not be accepted here just because it happens to share a name. Reading
  // the same FORMS_BY_FORMAT table offerForms reads means a form format two adds under a
  // different format is refused automatically, with no separate list to keep in sync.
  const forms = FORMS_BY_FORMAT[format];
  if (!forms || !forms[form]) {
    throw new Error(`${form} is not an offered form for format ${JSON.stringify(format)}`);
  }

  // This function writes only into a new private staging directory. Clearing that directory keeps
  // the chosen form internally exact; the public materialise wrapper publishes it only after the
  // complete handover has been written.
  //
  // A different OUTPUT's delivery is not a change of mind, and the wipe must never reach it: the
  // receipt check refuses before anything is removed.
  const receiptOutputId = await refuseToWipeAnotherBeat(exportDir, outputId);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(exportDir, DELIVERY_RECEIPT), `${receiptOutputId}\n`);
  // A DELIVERED BEAT IS NOT A FINISHED ONE until the journalist has been offered the same beat in
  // the other formats and has answered — taken one or declined, both clean. The offer is written
  // `pending` here, at the moment the delivery lands, so "the run never made the offer" is a state
  // on disk rather than a habit that can be forgotten. `deliveryClosed` reads it; `recordFormatAnswer`
  // replaces it with the answer. A dotfile, for the same reason as the receipt above.
  //
  // `pending` ONLY WHEN NOBODY HAS ANSWERED YET — D17. `carried` holds whatever answers the
  // delivery being replaced already had; see `carriedOfferAnswers`.
  await writeOfferReceipts(exportDir, carried);
  const written = [];
  // One `mapKeyState` per HTML file this delivery writes — read for the hand-over, never for a
  // verdict. Nothing in this function refuses over a key.
  const states = [];

  if (form === "owned-file") {
    await copyOwnedFiles(join(beatDir, "renders"), exportDir, written, format, { env, states });
    return withHandover(written, { exportDir, format, handover, states });
  }

  if (form === "embed") {
    // offerForms keeps "embed" visible but disabled when a credential is absent — reaching this branch
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
    const sourcePath = join(beatDir, "renders", fileName);
    const hosted = await readFile(sourcePath, "utf8");
    const confirmedBytes = await readFile(sourcePath, "utf8");
    if (confirmedBytes !== hosted) {
      throw new Error("the hosted render changed while it was being staged; obtain a new bound review");
    }
    const hostedApproval = requireApprovedOutput({ beatDir, planVersion, findingIds });
    if (
      hostedApproval.id !== hostedOperation.reviewId ||
      hostedApproval.draftDigest !== hostedOperation.draftDigest
    ) {
      throw new Error("the hosted render review changed before remote publication");
    }
    states.push(mapKeyState(hosted, env));
    await writeFile(stagedPath, substituteKeys(hosted, env));
    const deployment = await deployFile({
      accountId: creds.accountId,
      apiToken: creds.apiToken,
      projectName,
      filePath: stagedPath,
      fileName,
      recordDir: hostedOperation.recordDir,
      outputId: hostedOperation.outputId,
      reviewId: hostedOperation.reviewId,
      draftDigest: hostedOperation.draftDigest,
      deliveryOperationId: hostedOperation.deliveryOperationId,
      timeoutMs: hostedOperation.timeoutMs,
      fetchFn,
    });
    hostedOperation.result = deployment;
    await rm(stagedPath, { force: true });
    // A hosted embed has no local file to keep — the URL IS the delivery. Mirrors the sibling
    // engine's own `EMBED_URL.txt` convention for a hosted-Datawrapper delivery, the same shape
    // for the same reason: nothing to own, only a live address to remember it by.
    const urlPath = join(exportDir, "EMBED_URL.txt");
    // MARKED, unlike the receipt below. This is the address a journalist pastes into a CMS that
    // accepts nothing but a URL — the CMS then builds the iframe itself, so `data-splash-embed`
    // never survives and the marker is the only thing left for the companion script to recognise.
    // `DEPLOYMENT.json`'s own `publicUrl` stays bare on purpose: `deploy-embed.mjs` checks it is
    // EXACTLY the stable project URL, and a query string there fails that check.
    await writeFile(urlPath, `${withSplashMarker(deployment.url)}\n`);
    written.push(urlPath);
    const scrollerSource = await readFile(SCROLLER_ASSET_PATH);
    const scrollerDigest = `sha256:${createHash("sha256").update(scrollerSource).digest("hex")}`;
    const companionDeployment = await deployFile({
      accountId: creds.accountId,
      apiToken: creds.apiToken,
      projectName: cloudflareScrollerProjectName(creds.accountId),
      filePath: SCROLLER_ASSET_PATH,
      fileName: SCROLLER_ASSET_NAME,
      recordDir: hostedOperation.recordDir,
      outputId: "splash-iframe-scroller",
      reviewId: `asset-${scrollerDigest.slice(7, 27)}`,
      draftDigest: scrollerDigest,
      deliveryOperationId: hostedOperation.deliveryOperationId,
      timeoutMs: hostedOperation.timeoutMs,
      fetchFn,
    });
    hostedOperation.companionResult = companionDeployment;
    const scrollerUrl = env[SCROLLER_URL_ENV_VAR] || companionDeployment.url;
    const codePath = join(exportDir, "EMBED_CODE.html");
    await writeFile(codePath, embedCodeFor(deployment.url, handover.alt, { scrollerUrl }));
    written.push(codePath);
    // A copy is still shipped alongside the block regardless of mode — a newsroom that later hosts
    // its own copy and sets SPLASH_SCROLLER_URL wants this exact file to publish at that URL.
    const scrollerPath = join(exportDir, SCROLLER_ASSET_NAME);
    await copyFile(SCROLLER_ASSET_PATH, scrollerPath);
    written.push(scrollerPath);
    const deploymentPath = join(exportDir, "DEPLOYMENT.json");
    await writeFile(
      deploymentPath,
      `${JSON.stringify(
        {
          schemaVersion: DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
          provider: "cloudflare-pages",
          splashInstanceId: deploymentNamespace,
          storyId,
          outputId,
          projectName,
          publicUrl: deployment.url,
          immutableDeploymentUrl: deployment.deploymentUrl,
          deploymentId: deployment.deploymentId,
          reviewId: hostedOperation.reviewId,
          draftDigest: hostedOperation.draftDigest,
          editableSource: `beats/${outputId}/`,
          renderedArtifact: `beats/${outputId}/renders/${fileName}`,
          currentDelivery: `export/${outputId}/`,
          stableAcrossRevisions: true,
          publishedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
    written.push(deploymentPath);
    return withHandover(written, { exportDir, format, handover, states });
  }

  if (form === "cms-insertion") {
    const fileName = await ownedFileForInsertion(beatDir, format);
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
    return withHandover(written, { exportDir, format, handover, states });
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

  return withHandover(written, { exportDir, format, handover, states });
}

/**
 * Build a complete delivery in a private sibling directory, then publish it as one replacement.
 * The canonical API accepts a declared stories root plus stable story/output IDs. It derives both
 * source and destination; caller-supplied `beatDir`/`exportDir` paths belong only to the named v1
 * compatibility adapter and never select a replacement target.
 */
export async function materialise(options) {
  rejectLegacyFormatOption(options, "materialise");
  if (Object.hasOwn(options, "projectName")) {
    throw new Error(
      "materialise does not accept projectName; Cloudflare project identity is derived from storyId and outputId",
    );
  }
  const { form, format, handover, planVersion, findingIds } = options;
  const forms = FORMS_BY_FORMAT[format];
  if (!forms || !forms[form]) {
    throw new Error(`${form} is not an offered form for format ${JSON.stringify(format)}`);
  }
  if (Object.hasOwn(options, "beatDir") || Object.hasOwn(options, "exportDir")) {
    throw new Error(
      "materialise accepts storiesRoot, storyId, and outputId; legacy paths require delivery-compat-v1",
    );
  }
  if (form === "embed" && !resolveCloudflareCredentials(options.env ?? process.env)) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must both be set to materialise the embed form",
    );
  }

  let paths = resolveDeliveryIdentity(options);
  requireApprovedOutput({ beatDir: paths.beatDir, planVersion, findingIds });
  // The alt text is read out of the beat's own record before anything is validated, so what the
  // hand-over is checked against is what will actually be written.
  const recordedHandover = await resolveRecordedAlt(paths.beatDir, handover);
  validateHandover(recordedHandover, format);
  // A FORM THIS BEAT CANNOT HONOUR IS REFUSED BEFORE ANYTHING IS STAGED, with the same sentence
  // `offerForms` would have shown for it — one function builds both, so a disabled row and a
  // refusal cannot say two different things about the same beat. Reaching this means a caller
  // invoked `materialise` directly rather than offer-then-wait, exactly as the `embed` credential
  // check above assumes. It matters more here than there: an insertion built from a picture does
  // not fail, it succeeds, and writes 30,131 replacement characters into a document a newsroom
  // would paste into its CMS.
  const beatOffer =
    form === "cms-insertion"
      ? insertionOffer(paths.beatDir, format)
      : form === "source-bundle"
        ? sourceBundleOffer(paths.beatDir)
        : null;
  if (beatOffer && !beatOffer.available) throw new Error(beatOffer.reason);

  await mkdir(paths.exportRoot, { recursive: true });
  // The root may not have existed during the first check. Canonicalize it after creation and
  // before the lock or any recursive replacement operation can use it.
  paths = resolveDeliveryIdentity(options);
  const deploymentNamespace = form === "embed"
    ? await resolveSplashInstanceId(paths.storiesRoot)
    : null;
  const hostedProjectName = form === "embed"
    ? cloudflareProjectName(deploymentNamespace, paths.storyId, paths.outputId)
    : null;

  return withDeliveryLock(
    paths.exportDir,
    async () => {
      await reconcileDeliveryReplacement(paths.exportDir);
      await refuseToWipeAnotherBeat(paths.exportDir, paths.outputId);
      const approval = requireApprovedOutput({
        beatDir: paths.beatDir,
        planVersion,
        findingIds,
      });
      const carried = await carriedOfferAnswers(paths.exportDir);
      const operationId = randomUUID();
      const { stagingDir } = replacementArtifacts(paths.exportDir, operationId);
      const hostedOperation =
        form === "embed"
          ? {
              recordDir: paths.exportRoot,
              outputId: paths.outputId,
              reviewId: approval.id,
              draftDigest: approval.draftDigest,
              deliveryOperationId: operationId,
              timeoutMs: options.hostedRequestTimeoutMs,
              result: null,
            }
          : null;
      await mkdir(stagingDir);

      try {
        const stagedWritten = await materialiseInto({
          ...options,
          handover: recordedHandover,
          carried,
          beatDir: paths.beatDir,
          exportDir: stagingDir,
          projectName: hostedProjectName,
          deploymentNamespace,
          outputId: paths.outputId,
          hostedOperation,
        });
        const currentApproval = requireApprovedOutput({
          beatDir: paths.beatDir,
          planVersion,
          findingIds,
        });
        if (currentApproval.id !== approval.id) {
          throw new Error("OutputReview changed while this delivery was being built");
        }
        await publishStagedDelivery({
          stagingDir,
          exportDir: paths.exportDir,
          manifest: {
            operationId,
            reviewId: approval.id,
            planVersion: approval.planVersion,
            draftDigest: approval.draftDigest,
            findingIds: approval.findingIds,
            ...(approval.feedbackDigest ? { feedbackDigest: approval.feedbackDigest } : {}),
            form,
            format,
            ...(hostedOperation?.result
              ? {
                  hostedDeployment: {
                    deploymentKey: hostedOperation.result.deploymentKey,
                    deploymentId: hostedOperation.result.deploymentId,
                    url: hostedOperation.result.url,
                    deploymentUrl: hostedOperation.result.deploymentUrl,
                    projectName: hostedProjectName,
                    record: basename(hostedOperation.result.recordPath),
                  },
                }
              : {}),
            ...(hostedOperation?.companionResult
              ? {
                  companionScript: {
                    deploymentKey: hostedOperation.companionResult.deploymentKey,
                    deploymentId: hostedOperation.companionResult.deploymentId,
                    url: hostedOperation.companionResult.url,
                    deploymentUrl: hostedOperation.companionResult.deploymentUrl,
                    projectName: cloudflareScrollerProjectName(
                      resolveCloudflareCredentials(options.env ?? process.env).accountId,
                    ),
                    record: basename(hostedOperation.companionResult.recordPath),
                  },
                }
              : {}),
            createdAt: new Date().toISOString(),
          },
          hooks: options.replacementHooks,
        });
        if (hostedOperation?.result) {
          await markHostedDeploymentLocalComplete(
            hostedOperation.result.recordPath,
            operationId,
          );
        }
        if (hostedOperation?.companionResult) {
          await markHostedDeploymentLocalComplete(
            hostedOperation.companionResult.recordPath,
            operationId,
          );
        }
        return stagedWritten.map((path) => join(paths.exportDir, relative(stagingDir, path)));
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
    },
    { waitMs: options.deliveryLockWaitMs },
  );
}
