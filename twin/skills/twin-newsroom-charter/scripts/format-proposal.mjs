// Turns a `deriveCharter` result into the thing a journalist actually reads: the NEWSROOM.md
// front matter shape, every value sitting next to the declaration it was read from, every
// unresolved field named as a question instead of a guess. This is the whole of rule 1 (show the
// evidence) and rule 3 (say so, and ask, when nothing was found) rendered as text — it writes
// nothing to disk, the same as `derive-charter.mjs` itself.

const FIELD_ORDER = ["name", "url", "language", "brandColor", "ground", "typefaces"];
const QUOTED_FIELDS = new Set(["brandColor", "ground", "typefaces"]);
const UNRESOLVED_PLACEHOLDER = "# UNRESOLVED — ask the journalist";

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
  const values = { ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v?.value ?? null])), url };

  const lines = [
    `# Charter proposal for ${url}`,
    "",
    "PROPOSED, not written. This is not NEWSROOM.md — copy it there only after the journalist has",
    "confirmed or corrected every line below.",
    "",
    "```yaml",
    "---",
    ...FIELD_ORDER.map((field) => frontMatterLine(field, values[field])),
    "---",
    "```",
    "",
    "## Where each value was read",
  ];

  for (const field of FIELD_ORDER) {
    if (field === "url") continue;
    const evidence = fields[field];
    if (!evidence) {
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
