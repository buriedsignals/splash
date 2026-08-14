// NEWSROOM.md: YAML front matter (machine-read) + prose (ignored).

// The five fields every profile must carry by name. `language` is deliberately NOT among them: a
// newsroom publishes in one language or in several, and the requirement is that AT LEAST ONE is
// recorded — under either name (see `newsroomLanguages`). Everything else is unchanged.
export const REQUIRED_FIELDS = ["name", "url", "brandColor", "ground", "typefaces"];

// The OPTIONAL fields. None of them is in FIELDS on purpose — every `NEWSROOM.md` written before
// each of them existed, and every recorded `declined` stub, stays valid. `parseNewsroom` reads any
// front-matter key, so nothing there needs to know about them.
//
//   `credit`    — the newsroom's standing credit convention, read back at preflight and proposed by
//                 the hand's credit question. Its absence is a fact worth stating out loud ("no
//                 house credit convention is recorded, so credit is asked per story"); it is not an
//                 error.
//   `languages` — every language this newsroom publishes in, comma-separated, most-used first. A
//                 newsroom is not monolingual just because the front matter had one slot: this
//                 branch's own pilot is a Swiss newsroom. Ruling R4 already says the language of a
//                 visual follows the ARTICLE and is confirmed with the journalist — with one
//                 recorded language that confirmation had nothing to check against and was a guess;
//                 with the list it is a choice among what the newsroom actually publishes in.
//   `language`  — the singular, kept forever. Every profile written before `languages` existed
//                 carries it, and `newsroomLanguages` reads either.
//   `accents`   — further house accent colours beyond `brandColor`, comma-separated. A newsroom's
//                 identity is rarely one accent on one ground. `brandColor` stays the PRIMARY (it is
//                 what a single-accent profile already means), and these are the others.
//                 palette scores each recorded accent against the ground and never recommends
//                 one that misses the 3:1 floor — a longer list is not a way past the floor.
export const OPTIONAL_FIELDS = ["credit", "languages", "language", "accents"];

// Non-secret service configuration belongs beside the newsroom profile, never in the credential
// broker. These camel-case names are intentionally distinct from their legacy environment names.
// Tokens are absent: a service enters this list only when its value is safe to show in setup/status.
export const SERVICE_FIELDS = ["cloudflareAccountId", "cmsKind", "cmsEndpoint"];

const HEX = /^#[0-9a-fA-F]{6}$/;
// `fr`, `de-CH`, `en-GB`. Deliberately not a full BCP-47 grammar: this rejects the mistakes a
// person actually makes in a text field (a language NAME, a stray semicolon, an empty item) and
// accepts every code any of these tools will be handed.
const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/** A comma-separated front-matter value as a list, empty items dropped. */
function list(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function parseNewsroom(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error("NEWSROOM.md has no front matter");
  const profile = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    const raw = pair[2].trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
      try {
        profile[pair[1]] = JSON.parse(raw);
        continue;
      } catch {
        // Validation reports the resulting value; parsing remains backward compatible with the
        // historical permissive reader instead of silently dropping the field.
      }
    }
    profile[pair[1]] = raw.replace(/^["']|["']$/g, "").trim();
  }
  return profile;
}

/**
 * Every language this newsroom publishes in, primary first — read from `languages`, or from the
 * singular `language` a profile written before it carries, or from both (the singular then names
 * which of the list is primary). Never invents one: a profile that records neither gets `[]`, and
 * `validateNewsroom` is what turns that into an error.
 *
 * The ORDER is load-bearing, which is why this is a function and not a `split` at each call site.
 * Ruling R4 has the journalist confirm the language of a visual against the article; the primary is
 * what is offered first, and it is the newsroom's own answer, not the alphabet's.
 */
export function newsroomLanguages(profile) {
  const many = list(profile?.languages);
  const one = (profile?.language ?? "").trim();
  if (many.length === 0) return one ? [one] : [];
  if (!one) return many;
  return [one, ...many.filter((tag) => tag !== one)];
}

/**
 * Every house accent colour, primary first: `brandColor`, then whatever `accents` adds, de-duped.
 * A profile with no `accents` returns exactly `[brandColor]`, which is what every profile written
 * before this existed already meant.
 *
 * This does NOT check contrast, and that is the boundary rather than an omission: contrast is
 * measured against a ground by `palette`, which scores every option it proposes and never
 * recommends one below the 3:1 floor. Duplicating that maths here would put a second, drifting copy
 * of it in a file whose job is reading front matter.
 */
export function newsroomAccents(profile) {
  const primary = (profile?.brandColor ?? "").trim();
  const rest = list(profile?.accents);
  const all = primary ? [primary, ...rest] : rest;
  return all.filter((hex, index) => all.indexOf(hex) === index);
}

// A recorded decline (see splash/SKILL.md, "The newsroom's identity") is a DIFFERENT answer
// to "does this newsroom have a house profile", not a malformed one — front matter carrying
// `decision: declined` is checked for BEFORE validateNewsroom ever runs, so a declined stub is
// never scored against the fields it was never meant to carry, and never mistaken for one nobody
// got around to filling in.
export function isDeclinedProfile(profile) {
  return profile.decision === "declined";
}

export function validateNewsroom(profile) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!profile[field]) errors.push(`${field} is missing`);
  }

  const languages = newsroomLanguages(profile);
  if (languages.length === 0) {
    errors.push("language is missing — record `language: fr`, or `languages: fr, de` for a newsroom that publishes in several");
  }
  for (const tag of languages) {
    if (!LANGUAGE_TAG.test(tag)) errors.push(`language ${JSON.stringify(tag)} is not a language code (fr, de-CH, en)`);
  }
  // A singular that names a language the list does not hold is a CONTRADICTION, not two facts:
  // one of the two lines is stale, and silently preferring either one would publish in a language
  // the newsroom may not have chosen.
  const one = (profile?.language ?? "").trim();
  const many = list(profile?.languages);
  if (one && many.length > 0 && !many.includes(one)) {
    errors.push(
      `language ${JSON.stringify(one)} is not in languages ${JSON.stringify(profile.languages)} — one of the two is stale`,
    );
  }

  for (const field of ["brandColor", "ground"]) {
    const value = profile[field];
    if (value && !HEX.test(value)) errors.push(`${field} must be #rrggbb, got ${JSON.stringify(value)}`);
  }
  for (const accent of list(profile?.accents)) {
    if (!HEX.test(accent)) errors.push(`accents must each be #rrggbb, got ${JSON.stringify(accent)}`);
  }

  const cloudflareAccountId = (profile?.cloudflareAccountId ?? "").trim();
  if (cloudflareAccountId && !/^[0-9a-f]{32}$/i.test(cloudflareAccountId)) {
    errors.push("cloudflareAccountId must be the 32-character hexadecimal account id");
  }

  const cmsKind = (profile?.cmsKind ?? "").trim();
  const cmsEndpoint = (profile?.cmsEndpoint ?? "").trim();
  if (cmsKind && !["livingdocs", "we-publish"].includes(cmsKind)) {
    errors.push(`cmsKind must be livingdocs or we-publish, got ${JSON.stringify(cmsKind)}`);
  }
  if (Boolean(cmsKind) !== Boolean(cmsEndpoint)) {
    errors.push("cmsKind and cmsEndpoint must be configured together");
  }
  if (cmsEndpoint) {
    try {
      const parsed = new URL(cmsEndpoint);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error("unsupported endpoint");
      }
    } catch {
      errors.push("cmsEndpoint must be a full HTTP or HTTPS URL without embedded credentials");
    }
  }
  return errors;
}
