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
export function formatHandover({ files, placement, alt, credit, caveat, genre }) {
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
