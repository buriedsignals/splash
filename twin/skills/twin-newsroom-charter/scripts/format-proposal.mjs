// Turns a `deriveCharter` result into the thing a journalist actually reads: the NEWSROOM.md
// front matter shape, every value sitting next to the declaration it was read from, every
// unresolved field named as a question instead of a guess. This is the whole of rule 1 (show the
// evidence) and rule 3 (say so, and ask, when nothing was found) rendered as text — it writes
// nothing to disk, the same as `derive-charter.mjs` itself.

const FIELD_ORDER = ["name", "url", "languages", "brandColor", "accents", "ground", "typefaces"];
const QUOTED_FIELDS = new Set(["brandColor", "accents", "ground", "typefaces"]);
const UNRESOLVED_PLACEHOLDER = "# UNRESOLVED — ask the journalist";

// A field whose absence is an ANSWER, not a gap. A newsroom with one accent colour has one accent
// colour; printing `accents: # UNRESOLVED` next to it would turn a complete profile into one that
// looks unfinished, and would invite somebody to invent a second house colour to fill it.
const OPTIONAL_FIELDS = new Set(["accents"]);

function frontMatterLine(field, value) {
  if (value === null || value === undefined) return `${field}: ${UNRESOLVED_PLACEHOLDER}`;
  return QUOTED_FIELDS.has(field) ? `${field}: "${value}"` : `${field}: ${value}`;
}

export function formatProposal(proposal) {
  if (!proposal.ok) {
    return [
      `# Charter proposal for ${proposal.url}`,
      "",
      `Could not be read: ${proposal.error}`,
      "",
      "Nothing was measured, so nothing is proposed. Ask the journalist directly:",
      ...proposal.askInstead.slice(1).map((q) => `- ${q}`),
    ].join("\n");
  }

  const { fields, unresolved, url, stylesheetsRead, stylesheetsFailed } = proposal;
  const values = {
    ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v?.value ?? null])),
    url,
    // `languages` is what a profile records; `language` is what a profile written before it
    // records. Either is read back by `newsroomLanguages`, so a proposal derived from a site that
    // declares one language prints the plural with one item and stays exactly as valid.
    languages: fields.languages?.value ?? fields.language?.value ?? null,
  };

  const lines = [
    `# Charter proposal for ${url}`,
    "",
    "PROPOSED, not written. This is not NEWSROOM.md — copy it there only after the journalist has",
    "confirmed or corrected every line below.",
    "",
    "```yaml",
    "---",
    ...FIELD_ORDER.filter((field) => !(OPTIONAL_FIELDS.has(field) && values[field] === null)).map((field) =>
      frontMatterLine(field, values[field]),
    ),
    "---",
    "```",
    "",
    "## Where each value was read",
  ];

  for (const field of FIELD_ORDER) {
    if (field === "url") continue;
    const evidence = field === "languages" ? (fields.languages ?? fields.language) : fields[field];
    if (!evidence && OPTIONAL_FIELDS.has(field)) {
      lines.push(
        `- **${field}** — this site declares one accent colour and no others. That is an answer, not a gap: add more only if the newsroom actually has them.`,
      );
    } else if (!evidence) {
      lines.push(`- **${field}** — not declared anywhere this skill reads. Ask the journalist directly.`);
    } else {
      lines.push(`- **${field}**: \`${evidence.value}\` — ${evidence.source} — \`${evidence.evidence}\``);
    }
  }

  if (stylesheetsRead.length > 0) {
    lines.push("", "## Stylesheets read", ...stylesheetsRead.map((href) => `- ${href}`));
  }
  if (stylesheetsFailed.length > 0) {
    lines.push("", "## Stylesheets that could not be read", ...stylesheetsFailed.map((s) => `- ${s.href} — ${s.error}`));
  }
  if (unresolved.length > 0) {
    lines.push(
      "",
      "## Ask the journalist",
      `${unresolved.length} field(s) had no declaration this skill could find: ${unresolved.join(", ")}.`,
      "Do not fill these with a default — a house colour is the journalist's, and a fabricated one",
      "wearing the authority of a measurement is exactly the failure this skill exists to avoid.",
    );
  }

  return lines.join("\n");
}
