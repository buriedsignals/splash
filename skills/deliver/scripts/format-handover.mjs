// twin/skills/deliver/scripts/format-handover.mjs
//
// The delivery phase closes into a file, like every other phase. `formatHandover` renders
// `export/HANDOVER.md`: which file goes where in the article, what the alt text is, what the credit
// line reads, and the one caveat the beat's own limits field carries.
//
// WHAT THE JOURNALIST GOT BEFORE THIS. Two filenames and two sizes. `materialise` returns every
// path it wrote, and in the run that array was printed to the terminal as raw absolute-path JSON;
// the closing message named the files and their weights and stopped. Nothing said which one to give
// the CMS, no alt text to paste, no credit line, no restatement of the caveat the beat's own
// subtitle already carried. **Every input below is already recorded somewhere** — `placement` is
// hand field 4, `credit` is hand field 5, `caveat` is `limits`, and `alt` is in the component.
// Nothing here is derived; it is read back.
//
// WHY THE PARAMETER SET IS CLOSED, and why that is the point rather than an inconvenience. This is
// journalist-facing text, and this project's own account is that a prose rule ("keep dev talk out")
// is its softest surface. The pattern that works is already here twice —
// `palette/scripts/format-proposal.mjs` and `newsroom-charter/scripts/format-proposal.mjs`
// render the question from structured input, so nothing the function was not given can appear in it.
// **There is no free-text `notes` field, and adding one is the change this file exists to prevent.**
//
// AND IT IS WRITTEN IN THE STORY'S OWN LANGUAGE (A25, ruling R4). Every scaffold sentence below is
// a table keyed by language, not a literal, because the run that produced this document delivered a
// French story inside an English frame. `language` is READ from `STORYBOARD.md` — never detected,
// never defaulted — and `journalist-language.mjs` holds the one decision about a language we cannot
// write in: fall back to English and SAY SO at the top of the page.

import { resolveScaffoldLanguage, untranslatedNotice } from "./journalist-language.mjs";

// `language` is deliberately not in this list: it has its own refusal, in `resolveScaffoldLanguage`,
// which says where it is recorded and why it is never guessed. One check, in the place that owns it.
const REQUIRED = ["format", "placement", "alt", "credit"];

// WHAT THE DELIVERED PAGE CARRIES, WHEN IT CARRIES A LIVE MAP — rendered from a CLOSED vocabulary,
// which is what lets a paragraph this honest exist here at all without opening a free-text field.
//
// Ruling R1: a web map you cannot move through is a picture, so map × web ships live MapTiler tiles
// and the key travels inside the delivered HTML. The owner accepted that cost explicitly, having
// been shown it. R1b adds that the key ought to be a SECOND, origin-restricted one — and for a while
// that "ought" was a hard block in `substituteKeys`, so a journalist with one key could not deliver
// their own work. It is a recommendation again, which only works if the recommendation is actually
// MADE: this is where it is made, in the file the newsroom keeps, not in a refusal they never see.
//
// Every sentence is about THEIR article and THEIR account. Nothing about our code reaches this page
// — the same rule `refuseMaintainerText` enforces for the fields the caller supplies.
// Exported for ONE reason: so a test can assert that every language carries the same states. The
// runtime refusal below is the defence at the point of use; the parity test is the one that can go
// red the moment a language is added and a state forgotten, which is when it would actually happen.
export const LIVE_TILES = {
  en: {
    none: null,
    restricted: [
      "## The live map in this file",
      "",
      "This page draws its map live, so a reader can pan and zoom it. The key that lets it draw is",
      "inside the file, and it is the one restricted to your own domains — copied out of the page, it",
      "does not work anywhere else.",
    ],
    development: [
      "## The live map in this file, and the key it carries",
      "",
      "This page draws its map live, so a reader can pan and zoom it. The key that lets it draw is",
      "inside the file: anyone who opens the published article can read it, and it is your development",
      "key, which is not restricted to your own domains.",
      "",
      "What that costs you, plainly. The tiles this map draws are billed to your MapTiler account, by",
      "whoever is using the key. And if that account ever reaches 100% of its spending limit, MapTiler",
      "switches off **every** key on it — including the maps in articles you published years ago.",
      "",
      "The way to close that, when you want to: create a second MapTiler key restricted to your own",
      "domains, and record it on the setup page as `MAPTILER_DELIVERY_KEY`. Deliveries after that carry",
      "the restricted key, which is worth nothing to anyone who lifts it out of the page.",
    ],
    unkeyed: [
      "## The live map in this file",
      "",
      "No MapTiler key was recorded, so this page does not draw its map live: it shows the map layer",
      "that is baked into the file. That layer is complete and readable — it simply does not pan or",
      "zoom. Recording a MapTiler key on the setup page is what makes the live version possible.",
    ],
  },
  fr: {
    none: null,
    restricted: [
      "## La carte en direct dans ce fichier",
      "",
      "Cette page dessine sa carte en direct, pour qu'un lecteur puisse la déplacer et zoomer. La clé",
      "qui permet ce dessin est à l'intérieur du fichier, et c'est celle qui est restreinte à vos",
      "propres domaines — sortie de la page, elle ne fonctionne nulle part ailleurs.",
    ],
    development: [
      "## La carte en direct dans ce fichier, et la clé qu'elle emporte",
      "",
      "Cette page dessine sa carte en direct, pour qu'un lecteur puisse la déplacer et zoomer. La clé",
      "qui permet ce dessin est à l'intérieur du fichier : n'importe qui ouvrant l'article publié peut",
      "la lire, et c'est votre clé de développement, qui n'est pas restreinte à vos propres domaines.",
      "",
      "Ce que cela vous coûte, clairement. Les tuiles que dessine cette carte sont facturées à votre",
      "compte MapTiler, quelle que soit la personne qui utilise la clé. Et si ce compte atteint un jour",
      "100 % de son plafond de dépenses, MapTiler coupe **toutes** les clés qui s'y trouvent — y compris",
      "les cartes des articles que vous avez publiés il y a des années.",
      "",
      "Comment fermer cela, quand vous le voudrez : créez une seconde clé MapTiler restreinte à vos",
      "propres domaines, et enregistrez-la sur la page de configuration sous le nom",
      "`MAPTILER_DELIVERY_KEY`. Les livraisons suivantes emporteront la clé restreinte, qui ne vaut rien",
      "pour qui l'extrait de la page.",
    ],
    unkeyed: [
      "## La carte en direct dans ce fichier",
      "",
      "Aucune clé MapTiler n'a été enregistrée : cette page ne dessine donc pas sa carte en direct, elle",
      "affiche la couche cartographique intégrée au fichier. Cette couche est complète et lisible — elle",
      "ne se déplace simplement pas et ne zoome pas. Enregistrer une clé MapTiler sur la page de",
      "configuration est ce qui rend la version en direct possible.",
    ],
  },
};

// The vocabulary a caller is checked against, read from ONE table rather than from whichever
// language was picked: it must not become "the states this language happens to have translated".
// A state present here and missing from another language's table is a paragraph silently dropped —
// which, for `development`, is the one thing here nobody may fail to be told — so that is a second,
// separate refusal below rather than an `undefined` that renders as nothing.
const KNOWN_LIVE_TILES = LIVE_TILES.en;

// A MAINTAINER-FACING SENTENCE PHYSICALLY CANNOT PASS THROUGH THIS FUNCTION.
//
// The run's closing message was four fifths internals: three paragraphs naming `ground-claim.mjs`,
// `where.mjs` and their defects, addressed to a journalist. Earlier turns leaked the same way — one
// narrated reading a source file, one presented a table of gate verdicts, one explained how
// `#shared/*` resolves — and at one point the journalist was asked to arbitrate an internal defect,
// with options naming two of our files by name. All of it was valuable, and none of it was theirs.
//
// The closed parameter set above is the first half of the answer. This is the second: any string
// this function is handed that names one of our paths or modules is REFUSED, loudly, with where it
// belongs instead. The accepted cost, stated rather than discovered: a legitimate caveat that
// happens to name a filename is refused. No real caveat does — a caveat is about the DATA.
const OUR_PATH = /\bskills\//;
const OUR_MODULE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)\b/;

function refuseMaintainerText(field, value) {
  const text = String(value);
  if (!OUR_PATH.test(text) && !OUR_MODULE.test(text)) return;
  throw new Error(
    `${field} names this toolchain's own code, and a hand-over is written for the journalist. ` +
      `A defect in our code goes to stories/<slug>/NOTES-FOR-MAINTAINER.md — never into a delivered ` +
      `document, and never into a question put to the journalist.`,
  );
}

// What each delivered file is FOR, by extension. A journalist holding a PNG and an SVG needs to be
// told which one goes to the CMS; "here are two files" is what the run said and it is not an answer.
const ROLE_BY_EXTENSION = {
  en: {
    ".svg": "the vector file — this is the one to give the CMS, and it stays sharp at any size",
    ".png": "a raster copy, for a system that cannot take the vector",
    ".html": "the page itself — one self-contained file, nothing else to run",
    ".mp4": "the video file",
    ".txt": "the live address this beat was published to",
    ".md": "a document about the delivery, not the delivery itself",
    other: "delivered with the beat",
  },
  fr: {
    ".svg": "le fichier vectoriel — c'est celui à donner au CMS, et il reste net à toutes les tailles",
    ".png": "une copie matricielle, pour un système qui ne prend pas le vectoriel",
    ".html": "la page elle-même — un seul fichier autonome, rien d'autre à faire tourner",
    ".mp4": "le fichier vidéo",
    ".txt": "l'adresse en ligne où ce visuel a été publié",
    ".md": "un document au sujet de la livraison, pas la livraison elle-même",
    other: "livré avec ce visuel",
  },
};

// Some hosted-delivery files share a generic extension with the page itself or with internal
// receipts, but their newsroom role is specific. Match the canonical basename before falling back
// to the extension table so HANDOVER.md tells the editor what to paste and what to keep.
const ROLE_BY_BASENAME = {
  en: {
    "EMBED_CODE.html": "the iframe snippet to paste into the CMS",
    "DEPLOYMENT.json":
      "the deployment receipt linking the live output to its editable source and exact deployed version",
    // Unlike every other delivered file, this one is not part of THIS beat's own delivery — it is
    // the article page's companion script, installed once on the site's template, and every
    // embed on that site shares the same copy. The generic ".js" / "other" role below ("delivered
    // with the beat") would tell the newsroom to install a fresh copy per visual, which is wrong.
    "splash-iframe-scroller.js":
      "the article page's companion script — installed once on the site's template, not once per visual; it centres this embed and carries the reader out at the end of a scrolly",
  },
  fr: {
    "EMBED_CODE.html": "l'extrait iframe à coller dans le CMS",
    "DEPLOYMENT.json":
      "le reçu de déploiement qui relie le visuel en ligne à sa source modifiable et à sa version déployée exacte",
    "splash-iframe-scroller.js":
      "le script compagnon de la page — installé une seule fois sur le gabarit du site, pas une fois par visuel ; il centre cet embed et raccompagne le lecteur à la fin d'un scrolly",
  },
};
const KEYED_ROLE = {
  en: {
    record: "the placeholder record — safe to keep with the story; do not publish this file",
    live: "the live page — publish this file; it contains the configured client-side map key and must not be committed",
  },
  fr: {
    record:
      "le fichier témoin avec son placeholder — à conserver avec l'histoire ; ne publiez pas ce fichier",
    live:
      "la page en direct — publiez ce fichier ; il contient la clé cartographique côté client configurée et ne doit pas être commitée",
  },
};


function roleFor(name, written, keyedNames) {
  if (name.startsWith("keyed/")) return KEYED_ROLE[written].live;
  if (keyedNames.has(`keyed/${name}`)) return KEYED_ROLE[written].record;
  const named = ROLE_BY_BASENAME[written][name];
  if (named) return named;
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot).toLowerCase();
  const roles = ROLE_BY_EXTENSION[written];
  return roles[extension] ?? roles.other;
}

// The scaffold itself, in each language it is written in. Everything a journalist reads that is NOT
// their own recorded words is here, and nowhere else — a literal left in the body below is exactly
// how this document came out half-English the first time.
//
// `formatNoun` renders the format the beat was delivered in as a word rather than as this toolchain's
// own token. An unknown format falls back to the token — it is the value that was chosen, and
// inventing a translation for a format nobody has heard of would be worse than printing it plainly.
const COPY = {
  en: {
    title: "# What you have, and where it goes",
    intro: (format) => [
      `This is the ${format} form of this beat, delivered. Everything below is what you recorded during`,
      "the exchange, read back — nothing here is new.",
    ],
    formatNoun: { static: "still-image", web: "web-page", video: "video", scrolly: "scroll-driven" },
    files: "## The files",
    placement: "## Where it goes in the article",
    alt: "## The alt text",
    altHelp: [
      "Paste this as the image's alternative text. A reader using a screen reader gets the finding,",
      "not a description of a chart.",
    ],
    credit: "## The credit line",
    caveat: "## The one thing this does not show",
    caveatHelp: [
      "You named this limit yourself, and it belongs beside the visual — in the caption or the",
      "paragraph next to it — not only in your notes.",
    ],
  },
  fr: {
    title: "# Ce que vous avez, et où cela va",
    intro: (format) => [
      `Voici ce visuel livré sous sa forme ${format}. Tout ce qui suit est ce que vous avez enregistré`,
      "pendant l'échange, relu — rien ici n'est nouveau.",
    ],
    formatNoun: { static: "image fixe", web: "page web", video: "vidéo", scrolly: "au fil du défilement" },
    files: "## Les fichiers",
    placement: "## Où cela va dans l'article",
    alt: "## Le texte alternatif",
    altHelp: [
      "Collez ceci comme texte alternatif de l'image. Un lecteur qui utilise un lecteur d'écran reçoit",
      "le constat, et non la description d'un graphique.",
    ],
    credit: "## La ligne de crédit",
    caveat: "## La seule chose que cela ne montre pas",
    caveatHelp: [
      "Vous avez nommé cette limite vous-même, et sa place est à côté du visuel — dans la légende ou",
      "dans le paragraphe voisin — pas seulement dans vos notes.",
    ],
  },
};

function baseName(path) {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("keyed/")) return normalized;
  const parts = normalized.split("/");
  return parts[parts.length - 1];
}

/**
 * Markdown for `export/HANDOVER.md`. `files` are the paths `materialise` actually wrote — normally
 * named by basename so an absolute machine path cannot reach the newsroom. A private keyed working
 * copy is named relative to the export root so the journalist can distinguish it from its
 * placeholder record.
 *
 * Throws when a required field is missing rather than rendering a document with a blank where the
 * credit line should be: a hand-over that silently omits the credit is worse than none, because it
 * looks complete.
 */
export function formatHandover({ files, placement, alt, credit, caveat, format, language, liveTiles = "none" }) {
  if (Object.prototype.hasOwnProperty.call(arguments[0], "genre")) {
    throw new Error("formatHandover does not accept genre; use the canonical format field");
  }
  // A CLOSED vocabulary, checked rather than defaulted: an unrecognised state would silently drop
  // the paragraph that says a development key is shipping, which is the one thing here nobody may
  // fail to be told.
  if (!Object.prototype.hasOwnProperty.call(KNOWN_LIVE_TILES, liveTiles)) {
    throw new Error(
      `liveTiles ${JSON.stringify(liveTiles)} is not a state this hand-over knows — ${Object.keys(KNOWN_LIVE_TILES).join(", ")}`,
    );
  }
  // Read, never detected, and never defaulted to English — see `journalist-language.mjs` for the
  // decision this makes and for what happens to a language this document is not written in.
  const scaffold = resolveScaffoldLanguage(language);
  const copy = COPY[scaffold.written];
  if (!Object.prototype.hasOwnProperty.call(LIVE_TILES[scaffold.written], liveTiles)) {
    throw new Error(
      `this hand-over is written in ${scaffold.written} and has no paragraph for the ${JSON.stringify(liveTiles)} live-tile state — a state that exists in one language and not another would drop the paragraph rather than say it`,
    );
  }
  const given = { format, placement, alt, credit };
  const missing = REQUIRED.filter((field) => !given[field] || !String(given[field]).trim());
  if (missing.length > 0) {
    throw new Error(
      `a hand-over cannot be written without ${missing.join(", ")} — each is already recorded (placement and credit are hand fields 4 and 5, alt is in the component)`,
    );
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("a hand-over cannot be written before anything has been delivered");
  }

  // The file paths are exempt: `materialise` hands in the real paths it wrote, which legitimately
  // carry `.html`/`.mjs` extensions and, in a source bundle, our own component filenames. They are
  // never printed whole — only their basenames reach the page — so nothing about where this
  // toolchain lives travels with them.
  for (const [field, value] of Object.entries({ placement, alt, credit, caveat })) {
    if (value) refuseMaintainerText(field, value);
  }

  const lines = [
    copy.title,
    "",
    // The notice comes FIRST, before a word of the document it is about: a journalist who recorded
    // `de` should read why this page is in English before reading the English.
    ...untranslatedNotice(scaffold),
    ...copy.intro(copy.formatNoun[format] ?? format),
    "",
    copy.files,
    "",
  ];

  const names = files.map(baseName);
  const keyedNames = new Set(names.filter((name) => name.startsWith("keyed/")));
  for (const name of names) {
    lines.push(`- **\`${name}\`** — ${roleFor(name, scaffold.written, keyedNames)}`);
  }

  lines.push(
    "",
    copy.placement,
    "",
    placement,
    "",
    copy.alt,
    "",
    ...copy.altHelp,
    "",
    `> ${alt}`,
    "",
    copy.credit,
    "",
    `> ${credit}`,
    "",
  );

  const tiles = LIVE_TILES[scaffold.written][liveTiles];
  if (tiles) lines.push(...tiles, "");

  if (caveat && String(caveat).trim()) {
    lines.push(copy.caveat, "", ...copy.caveatHelp, "", `> ${caveat}`, "");
  }

  return lines.join("\n");
}
