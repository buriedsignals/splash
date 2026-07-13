// F2 — NEWSROOM BRAND PROFILE (house style, first cut: colours only).
//
// A small newsroom won't publish off-brand charts, so on-brand output is close to
// essential for adoption. Atelier's default is auto-colour (subject-fit Okabe-Ito);
// this adds an OPT-IN house palette, set once per project (mirroring the fly.io
// "install 1× puis boucle" model). Colours only in this cut — fonts/logo deferred.
//
// The hard part is brand × a11y: a house colour may not be CVD-safe. Policy (b),
// brand-first + warning (decided): the brand colour is applied AS CHOSEN and marked
// `brandExplicit`, so the produce-time a11y guards downgrade a CVD/contrast failure
// to a render-review concern instead of rewriting the colour or hard-failing. Absent
// or invalid brand.json → null → today's auto path, unchanged.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface BrandProfile {
  /** ordered brand hues (#rrggbb); palette[0] is the primary house colour (may be empty) */
  palette: string[];
  /** optional accent hue (#rrggbb) */
  accent?: string;
  /** default attribution reused across visuals (a per-visual source overrides it) */
  source?: { name: string; url?: string };
  /** default deliverable language (BCP-47) */
  lang?: string;
  /** credit label template ("{name}" placeholder); empty = derived from lang by the producer */
  credit?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Assemble a validated BrandProfile from loosely-typed fields (shared by the JSON and the
 * markdown parsers). Non-hex palette entries are dropped; an accent alone (no palette) is not a
 * brand. Returns null unless at least ONE usable field is present (palette / source / lang /
 * credit) — so a newsroom that only wants a default source but no house colour is still valid.
 */
function buildProfile(fields: {
  palette?: unknown;
  accent?: unknown;
  source?: unknown;
  lang?: unknown;
  credit?: unknown;
}): BrandProfile | null {
  const palette = Array.isArray(fields.palette)
    ? fields.palette.filter(
        (c): c is string => typeof c === "string" && HEX.test(c),
      )
    : [];
  const accent =
    typeof fields.accent === "string" && HEX.test(fields.accent)
      ? fields.accent
      : undefined;
  let source: { name: string; url?: string } | undefined;
  if (fields.source && typeof fields.source === "object") {
    const s = fields.source as Record<string, unknown>;
    if (typeof s.name === "string" && s.name.trim()) {
      source = { name: s.name.trim() };
      if (typeof s.url === "string" && s.url.trim()) source.url = s.url.trim();
    }
  }
  const lang =
    typeof fields.lang === "string" && fields.lang.trim()
      ? fields.lang.trim()
      : undefined;
  const credit =
    typeof fields.credit === "string" && fields.credit.trim()
      ? fields.credit.trim()
      : undefined;
  if (palette.length === 0 && !source && !lang && !credit) return null;
  const p: BrandProfile = { palette };
  if (accent) p.accent = accent;
  if (source) p.source = source;
  if (lang) p.lang = lang;
  if (credit) p.credit = credit;
  return p;
}

/**
 * Parse + validate a brand.json string (the machine cache). Returns null when malformed or with
 * no usable field (so the caller falls back to the auto subject-fit path). Pure.
 */
export function parseBrandProfile(text: string): BrandProfile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return buildProfile({
    palette: o.palette,
    accent: o.accent,
    source: o.source,
    lang: o.lang,
    credit: o.credit,
  });
}

/**
 * Load the per-project brand profile (`<projectDir>/brand.json`). Missing file →
 * null (today's auto behaviour, unchanged). Any read/parse problem → null (never
 * throws — a broken brand file must not break production).
 */
export function loadBrandProfile(projectDir: string): BrandProfile | null {
  const path = join(projectDir, "brand.json");
  if (!existsSync(path)) return null;
  try {
    return parseBrandProfile(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Seed a producer spec's colour from the brand palette and mark it brandExplicit —
 * the thread `brand.json → spec → the produce guards` (policy b). The spec keeps an
 * already-chosen baseColor; otherwise it takes the primary house hue. `brandExplicit`
 * is set ONLY when the resulting colour is a genuine house colour (in the palette or
 * the accent) — so an auto subject-fit colour never gains the a11y bypass. Pure.
 */
export function seedBrandColor<
  T extends { baseColor?: string; brandExplicit?: boolean },
>(spec: T, brand: BrandProfile): T {
  const baseColor = spec.baseColor ?? brand.palette[0];
  const isHouseColour =
    brand.palette.includes(baseColor) || brand.accent === baseColor;
  return { ...spec, baseColor, brandExplicit: isHouseColour };
}

// ── Journalist-facing markdown profile (NEWSROOM-PROFILE.md) ──
// The newsroom edits a friendly markdown file; the tool reads clean JSON. This parses the YAML
// frontmatter of NEWSROOM-PROFILE.md into a BrandProfile with a small dependency-free parser
// over the KNOWN, constrained schema (no general YAML). Comments are stripped quote-aware, so a
// quoted hex `"#0A5C36"` survives while a trailing `# note` is dropped.

function stripComment(line: string): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === "#" && !inQuote) return line.slice(0, i);
  }
  return line;
}

function unquote(v: string): string {
  const t = v.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"')
    ? t.slice(1, -1)
    : t;
}

/**
 * Parse the YAML frontmatter of a NEWSROOM-PROFILE.md into a BrandProfile. Reads only the known
 * fields (palette list, accent, source.name/url, lang, credit); unknown keys are ignored. No
 * frontmatter, or no usable field → null. Pure.
 */
export function parseNewsroomMarkdown(md: string): BrandProfile | null {
  const fm = md.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!fm) return null;
  const lines = fm[1].split(/\r?\n/).map(stripComment);
  const fields: {
    palette?: string[];
    accent?: string;
    source?: { name?: string; url?: string };
    lang?: string;
    credit?: string;
  } = {};
  let i = 0;
  while (i < lines.length) {
    const kv = lines[i].match(/^([A-Za-z_]+):[ \t]*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    const val = kv[2].trim();
    if (key === "palette" && val === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length && /^[ \t]+-[ \t]*/.test(lines[i])) {
        items.push(unquote(lines[i].replace(/^[ \t]*-[ \t]*/, "")));
        i++;
      }
      fields.palette = items;
      continue;
    }
    if (key === "source" && val === "") {
      const src: { name?: string; url?: string } = {};
      i++;
      while (i < lines.length && /^[ \t]+[A-Za-z_]+:/.test(lines[i])) {
        const sm = lines[i].trim().match(/^([A-Za-z_]+):[ \t]*(.*)$/);
        if (sm && (sm[1] === "name" || sm[1] === "url"))
          src[sm[1]] = unquote(sm[2]);
        i++;
      }
      fields.source = src;
      continue;
    }
    if (val !== "" && (key === "accent" || key === "lang" || key === "credit"))
      fields[key] = unquote(val);
    i++;
  }
  return buildProfile(fields);
}

/**
 * Load the per-project newsroom profile. NEWSROOM-PROFILE.md (the journalist's source of truth)
 * wins: it is parsed and its BrandProfile written to `brand.json` (the machine cache, inspectable)
 * before being returned. If only `brand.json` exists, that is read. Neither → null. Never throws
 * (a broken profile must not break production; a failed cache write is ignored).
 */
export function loadNewsroomProfile(projectDir: string): BrandProfile | null {
  const mdPath = join(projectDir, "NEWSROOM-PROFILE.md");
  if (existsSync(mdPath)) {
    let profile: BrandProfile | null;
    try {
      profile = parseNewsroomMarkdown(readFileSync(mdPath, "utf8"));
    } catch {
      return null;
    }
    if (profile) {
      try {
        writeFileSync(
          join(projectDir, "brand.json"),
          JSON.stringify(profile, null, 2) + "\n",
        );
      } catch {
        // best-effort cache; the in-memory profile is authoritative
      }
    }
    return profile;
  }
  return loadBrandProfile(projectDir);
}

// The producers that actually consume a house colour (brandExplicit → policy-b a11y guards).
// Maps / scrolly / image ignore it AND validate their specs strictly (unknown fields fail loud),
// so brand colour is seeded ONLY for these two — source/lang are universal and always merged.
// Extending colour to the other producers is a noted follow-up.
const BRAND_COLOUR_PRODUCERS = new Set(["chart-native", "dw-chart"]);

/**
 * Merge a newsroom profile's fields onto a producer spec as DEFAULTS — the per-element spec value
 * ALWAYS wins. `source` and `lang` fill only the gaps (universal). Colour goes through
 * seedBrandColor (keeping brandExplicit / policy b) but ONLY for producers that consume it
 * (`opts.producer` in BRAND_COLOUR_PRODUCERS; when producer is omitted, colour IS seeded — the
 * direct-use default). `credit` is carried on the profile for the producer to consume (the
 * lang-derived label already gives the right format per language); its custom-template application
 * is a producer-side follow-up. Null profile → spec unchanged. Pure.
 */
export function mergeProfileDefaults<
  T extends {
    baseColor?: string;
    brandExplicit?: boolean;
    source?: { name: string; url?: string };
    lang?: string;
  },
>(spec: T, profile: BrandProfile | null, opts?: { producer?: string }): T {
  if (!profile) return spec;
  let out = spec;
  const colourOk =
    opts?.producer === undefined || BRAND_COLOUR_PRODUCERS.has(opts.producer);
  if (profile.palette.length > 0 && colourOk)
    out = seedBrandColor(out, profile);
  if (out.source === undefined && profile.source)
    out = { ...out, source: profile.source };
  if (out.lang === undefined && profile.lang)
    out = { ...out, lang: profile.lang };
  return out;
}
