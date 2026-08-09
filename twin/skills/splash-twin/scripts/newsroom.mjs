// NEWSROOM.md: YAML front matter (machine-read) + prose (ignored).

const FIELDS = ["name", "url", "language", "brandColor", "ground", "typefaces"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseNewsroom(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error("NEWSROOM.md has no front matter");
  const profile = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    profile[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  return profile;
}

// A recorded decline (see splash-twin/SKILL.md, "The newsroom's identity") is a DIFFERENT answer
// to "does this newsroom have a house profile", not a malformed one — front matter carrying
// `decision: declined` is checked for BEFORE validateNewsroom ever runs, so a declined stub is
// never scored against the six fields it was never meant to carry, and never mistaken for one
// nobody got around to filling in.
export function isDeclinedProfile(profile) {
  return profile.decision === "declined";
}

export function validateNewsroom(profile) {
  const errors = [];
  for (const field of FIELDS) {
    if (!profile[field]) errors.push(`${field} is missing`);
  }
  for (const field of ["brandColor", "ground"]) {
    const value = profile[field];
    if (value && !HEX.test(value)) errors.push(`${field} must be #rrggbb, got ${JSON.stringify(value)}`);
  }
  return errors;
}
