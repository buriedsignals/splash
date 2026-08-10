// twin/skills/twin-deliver/scripts/format-handover.mjs
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
// `twin-palette/scripts/format-proposal.mjs` and `twin-newsroom-charter/scripts/format-proposal.mjs`
// render the question from structured input, so nothing the function was not given can appear in it.
// **There is no free-text `notes` field, and adding one is the change this file exists to prevent.**

const REQUIRED = ["genre", "placement", "alt", "credit"];

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
const LIVE_TILES = {
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
};

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
  ".svg": "the vector file — this is the one to give the CMS, and it stays sharp at any size",
  ".png": "a raster copy, for a system that cannot take the vector",
  ".html": "the page itself — one self-contained file, nothing else to run",
  ".mp4": "the video file",
  ".txt": "the live address this beat was published to",
  ".md": "a document about the delivery, not the delivery itself",
};

function roleFor(name) {
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot).toLowerCase();
  return ROLE_BY_EXTENSION[extension] ?? "delivered with the beat";
}

function baseName(path) {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}

/**
 * Markdown for `export/HANDOVER.md`. `files` are the paths `materialise` actually wrote — named by
 * basename, because an absolute path on the machine that built it means nothing in a newsroom.
 *
 * Throws when a required field is missing rather than rendering a document with a blank where the
 * credit line should be: a hand-over that silently omits the credit is worse than none, because it
 * looks complete.
 */
export function formatHandover({ files, placement, alt, credit, caveat, genre, liveTiles = "none" }) {
  // A CLOSED vocabulary, checked rather than defaulted: an unrecognised state would silently drop
  // the paragraph that says a development key is shipping, which is the one thing here nobody may
  // fail to be told.
  if (!Object.prototype.hasOwnProperty.call(LIVE_TILES, liveTiles)) {
    throw new Error(
      `liveTiles ${JSON.stringify(liveTiles)} is not a state this hand-over knows — ${Object.keys(LIVE_TILES).join(", ")}`,
    );
  }
  const given = { genre, placement, alt, credit };
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
    "# What you have, and where it goes",
    "",
    `This is the ${genre} form of this beat, delivered. Everything below is what you recorded during`,
    "the exchange, read back — nothing here is new.",
    "",
    "## The files",
    "",
  ];

  for (const file of files) {
    const name = baseName(file);
    lines.push(`- **\`${name}\`** — ${roleFor(name)}`);
  }

  lines.push(
    "",
    "## Where it goes in the article",
    "",
    placement,
    "",
    "## The alt text",
    "",
    "Paste this as the image's alternative text. A reader using a screen reader gets the finding,",
    "not a description of a chart.",
    "",
    `> ${alt}`,
    "",
    "## The credit line",
    "",
    `> ${credit}`,
    "",
  );

  if (LIVE_TILES[liveTiles]) lines.push(...LIVE_TILES[liveTiles], "");

  if (caveat && String(caveat).trim()) {
    lines.push(
      "## The one thing this does not show",
      "",
      "You named this limit yourself, and it belongs beside the visual — in the caption or the",
      "paragraph next to it — not only in your notes.",
      "",
      `> ${caveat}`,
      "",
    );
  }

  return lines.join("\n");
}
